// app/actions/EmailSync.ts
'use server'

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/app/lib/db';

/**
 * Menyinkronkan email dari mail server IMAP ke database SuratMasuk / SuratKeluar secara otomatis.
 * Hanya mengambil 5 email terbaru setiap kali eksekusi untuk mencegah timeout di Vercel.
 */
/**
 * Helper to sync a single mailbox folder (e.g. INBOX or Sent)
 */
async function syncMailbox(
  client: ImapFlow,
  folderPath: string,
  forceOutgoing: boolean,
  userEmail: string,
  defaultJenisId: number
): Promise<number> {
  const mailbox = await client.mailboxOpen(folderPath, { readOnly: true });
  const totalMessages = mailbox.exists;

  if (totalMessages === 0) {
    return 0;
  }

  // Fetch up to 5 latest messages to prevent timeout
  const fetchLimit = 5;
  const startSeq = Math.max(1, totalMessages - fetchLimit + 1);
  const seqRange = `${startSeq}:${totalMessages}`;

  let newEmailsCount = 0;

  for await (let msg of client.fetch(seqRange, { envelope: true, source: true })) {
    const messageId = msg.envelope?.messageId || `${msg.uid}-${msg.envelope?.date?.getTime()}`;

    // Check if email already exists in DB
    const existsInMasuk = await prisma.suratMasuk.findUnique({
      where: { messageId }
    });
    const existsInKeluar = await prisma.suratKeluar.findUnique({
      where: { messageId }
    });

    if (!existsInMasuk && !existsInKeluar && msg.source) {
      // Parse email content
      const parsed = await simpleParser(msg.source);

      let fileUrl: string | null = null;

      // Handle attachments
      if (parsed.attachments && parsed.attachments.length > 0) {
        const validAttachment = parsed.attachments.find(att => {
          const isInline = att.headers?.get('content-id') || att.contentDisposition === 'inline';
          const isDoc = att.contentType === 'application/pdf' || 
                        att.contentType.startsWith('image/') || 
                        att.contentType.startsWith('application/msword') || 
                        att.contentType.startsWith('application/vnd.openxmlformats-officedocument');
          return isDoc && !isInline;
        }) || parsed.attachments[0];

        if (validAttachment) {
          const base64Data = validAttachment.content.toString('base64');
          fileUrl = `data:${validAttachment.contentType};base64,${base64Data}`;
        }
      }

      // Fallback: If no document attachment is present, use email body (HTML or text) as the letter content
      if (!fileUrl) {
        const emailBody = parsed.html || parsed.text || '';
        if (emailBody) {
          const base64Content = Buffer.from(emailBody).toString('base64');
          const mimeType = parsed.html ? 'text/html' : 'text/plain';
          fileUrl = `data:${mimeType};charset=utf-8;base64,${base64Content}`;
        }
      }

      const cleanSender = (parsed.from as any)?.text || msg.envelope?.from?.map((f: any) => `${f.name || ''} <${f.address}>`).join(', ') || 'Unknown Sender';
      const cleanRecipient = (parsed.to as any)?.text || msg.envelope?.to?.map((t: any) => `${t.name || ''} <${t.address}>`).join(', ') || 'Unknown Recipient';
      const perihal = parsed.subject || '(Tanpa Perihal)';
      const tanggal = parsed.date || msg.envelope?.date || new Date();

      // Separate into incoming or outgoing mail
      const isOutgoing = forceOutgoing || cleanSender.toLowerCase().includes(userEmail.toLowerCase());

      if (isOutgoing) {
        await prisma.suratKeluar.create({
          data: {
            nomorSurat: `SK/AUTO/${msg.uid}/${tanggal.getTime()}`,
            tujuan: cleanRecipient,
            perihal: perihal,
            tanggalDikirim: tanggal,
            fileUrl: fileUrl,
            jenisSuratId: defaultJenisId,
            messageId: messageId
          }
        });
      } else {
        await prisma.suratMasuk.create({
          data: {
            nomorSurat: `SM/AUTO/${msg.uid}/${tanggal.getTime()}`,
            pengirim: cleanSender,
            perihal: perihal,
            tanggalDiterima: tanggal,
            fileUrl: fileUrl,
            jenisSuratId: defaultJenisId,
            messageId: messageId
          }
        });
      }

      newEmailsCount++;
    }
  }

  return newEmailsCount;
}

/**
 * Menyinkronkan email dari mail server IMAP ke database SuratMasuk / SuratKeluar secara otomatis.
 * Mengambil email dari INBOX (Surat Masuk) dan Sent Mail (Surat Keluar).
 */
export async function syncEmailsAction() {
  const host = process.env.IMAP_HOST;
  const port = Number(process.env.IMAP_PORT) || 993;
  const secure = process.env.IMAP_SECURE === 'true' || port === 993;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Konfigurasi IMAP belum lengkap di file .env (IMAP_HOST, IMAP_USER, IMAP_PASS)');
  }

  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();

    // Pastikan jenis surat default ("EML" / "Surat Elektronik") sudah ada
    let defaultJenis = await prisma.jenisSurat.findFirst({
      where: { kode: 'EML' }
    });

    if (!defaultJenis) {
      defaultJenis = await prisma.jenisSurat.create({
        data: {
          kode: 'EML',
          nama: 'Email / Surat Elektronik'
        }
      });
    }

    // 1. Sync INBOX (Surat Masuk)
    const newInboxCount = await syncMailbox(client, 'INBOX', false, user, defaultJenis.id);

    // 2. Sync Sent Folder (Surat Keluar)
    let newSentCount = 0;
    try {
      const mailboxes = await client.list();
      const sentMailbox = mailboxes.find(box => 
        box.specialUse === '\\Sent' || 
        box.name.toLowerCase() === 'sent' || 
        box.name.toLowerCase() === 'sent mail' || 
        box.path.toLowerCase().includes('sent')
      );

      if (sentMailbox) {
        newSentCount = await syncMailbox(client, sentMailbox.path, true, user, defaultJenis.id);
      } else {
        console.warn('Folder Sent tidak ditemukan secara otomatis.');
      }
    } catch (sentError) {
      console.error('Gagal menyinkronkan folder Sent (Surat Keluar):', sentError);
      // Jangan gagalkan keseluruhan sinkronisasi jika hanya folder Sent yang error
    }

    const newEmailsCount = newInboxCount + newSentCount;

    return { 
      success: true, 
      count: newEmailsCount, 
      message: newEmailsCount > 0 
        ? `${newEmailsCount} surat baru berhasil disinkronkan & dipilah secara otomatis` 
        : 'Semua email terbaru sudah disinkronkan' 
    };

  } catch (error: any) {
    console.error('Error saat sinkronisasi email otomatis:', error);
    throw new Error(error.message || 'Gagal melakukan sinkronisasi email');
  } finally {
    try {
      await client.logout();
    } catch (logoutError) {
      // Abaikan error logout agar error asli dari blok catch/try tidak tertutupi
    }
  }
}

/**
 * Mengambil statistik penggunaan penyimpanan surat (batas kuota 10 surat)
 */
export async function getSuratUsageStats() {
  try {
    const totalMasuk = await prisma.suratMasuk.count();
    const totalKeluar = await prisma.suratKeluar.count();
    const totalCount = totalMasuk + totalKeluar;
    
    return {
      totalMasuk,
      totalKeluar,
      totalCount,
      isExceeded: totalCount >= 10
    };
  } catch (error) {
    console.error('Gagal mengambil statistik surat:', error);
    throw new Error('Gagal mengambil statistik surat');
  }
}

/**
 * Mengambil semua data Surat Masuk & Keluar secara lengkap (termasuk file Base64) untuk proses download ZIP di client
 */
export async function archiveAllLettersAction() {
  try {
    const suratMasuk = await prisma.suratMasuk.findMany({
      include: { jenisSurat: true },
      orderBy: { tanggalDiterima: 'desc' }
    });

    const suratKeluar = await prisma.suratKeluar.findMany({
      include: { jenisSurat: true },
      orderBy: { tanggalDikirim: 'desc' }
    });

    return {
      suratMasuk,
      suratKeluar
    };
  } catch (error) {
    console.error('Gagal memproses arsip surat:', error);
    throw new Error('Gagal memproses arsip surat');
  }
}

/**
 * Menghapus seluruh data Surat Masuk & Surat Keluar untuk mengosongkan kapasitas database Neon
 */
export async function clearAllLettersAction() {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.suratMasuk.deleteMany();
      await tx.suratKeluar.deleteMany();
      return { success: true };
    });
  } catch (error) {
    console.error('Gagal mengosongkan database surat:', error);
    throw new Error('Gagal mengosongkan database surat');
  }
}
