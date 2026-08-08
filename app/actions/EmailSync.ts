// app/actions/EmailSync.ts
'use server'

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { prisma } from '@/app/lib/db';

/**
 * Mengelompokkan email ke dalam kategori JenisSurat yang sesuai berdasarkan subjek dan isi.
 * Jika tidak cocok dengan salah satu kategori target, mengembalikan null.
 */
function classifyEmail(
  subject: string,
  bodyText: string,
  jenisSuratList: { id: number; kode: string; nama: string }[]
): { id: number; kode: string; nama: string } | null {
  const cleanSubject = subject.toLowerCase().trim();
  const cleanBody = bodyText.replace(/<[^>]*>/g, ' ').toLowerCase().trim();

  // Helper to check if text contains any of the queries
  const containsAny = (queries: string[]) => {
    return queries.some(q => cleanSubject.includes(q) || cleanBody.includes(q));
  };

  // 1. Periksa frase lengkap yang spesifik terlebih dahulu
  if (containsAny(['surat tugas'])) {
    const js = jenisSuratList.find(j => j.kode === 'ST');
    if (js) return js;
  }
  if (containsAny(['surat permintaan'])) {
    const js = jenisSuratList.find(j => j.kode === 'SP');
    if (js) return js;
  }
  if (containsAny(['surat keputusan'])) {
    const js = jenisSuratList.find(j => j.kode === 'SK');
    if (js) return js;
  }
  if (containsAny(['laporan teknis'])) {
    const js = jenisSuratList.find(j => j.kode === 'LT');
    if (js) return js;
  }
  if (containsAny(['surat elektronik'])) {
    const js = jenisSuratList.find(j => j.kode === 'EML');
    if (js) return js;
  }

  // 2. Gunakan kata kunci tunggal jika frase lengkap tidak ditemukan
  if (containsAny(['tugas'])) {
    const js = jenisSuratList.find(j => j.kode === 'ST');
    if (js) return js;
  }
  if (containsAny(['permintaan'])) {
    const js = jenisSuratList.find(j => j.kode === 'SP');
    if (js) return js;
  }
  if (containsAny(['keputusan']) || /\b(sk)\b/i.test(cleanSubject) || /\b(sk)\b/i.test(cleanBody)) {
    const js = jenisSuratList.find(j => j.kode === 'SK');
    if (js) return js;
  }
  if (containsAny(['laporan'])) {
    const js = jenisSuratList.find(j => j.kode === 'LT');
    if (js) return js;
  }
  if (containsAny(['email', 'e-mail', 'elektronik'])) {
    const js = jenisSuratList.find(j => j.kode === 'EML');
    if (js) return js;
  }

  return null;
}

/**
 * Mengekstrak nomor surat langsung dari subjek atau isi email.
 * Mengembalikan string nomor surat jika ditemukan, atau null jika tidak.
 */
function extractNomorSurat(subject: string, bodyText: string): string | null {
  const cleanSubject = subject.trim();
  const cleanBody = bodyText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const patterns = [
    // Pola dengan awalan Nomor / No
    /\b(?:nomor|no\.|no)\s*[:\.-]?\s*([a-z0-9\.\-\/]{4,50})\b/i,
    // Pola umum format penomoran surat Indonesia (slash, romawi, tahun)
    /\b([a-z0-9\.\-\/]+\/[ivxlcdm]+\/\d{4})\b/i,
    // Pola umum slash dan tahun
    /\b([a-z0-9\.\-\/]+\/\d{4})\b/i
  ];

  // Cari di subjek dahulu
  for (const pattern of patterns) {
    const match = cleanSubject.match(pattern);
    if (match && match[1]) {
      const num = match[1].replace(/[.,;]$/, '').trim();
      if ((num.includes('/') || num.includes('-')) && !/^\d+$/.test(num)) {
        return num;
      }
    }
  }

  // Cari di isi surat
  for (const pattern of patterns) {
    const match = cleanBody.match(pattern);
    if (match && match[1]) {
      const num = match[1].replace(/[.,;]$/, '').trim();
      if ((num.includes('/') || num.includes('-')) && !/^\d+$/.test(num)) {
        return num;
      }
    }
  }

  return null;
}

/**
 * Helper to sync a single mailbox folder (e.g. INBOX or Sent)
 */
async function syncMailbox(
  client: ImapFlow,
  folderPath: string,
  forceOutgoing: boolean,
  userEmail: string,
  jenisSuratList: { id: number; kode: string; nama: string }[]
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

      const perihal = parsed.subject || '(Tanpa Perihal)';
      const emailBody = parsed.html || parsed.text || '';

      // Terapkan klasifikasi kategori surat
      const matchedJenis = classifyEmail(perihal, emailBody, jenisSuratList);
      if (!matchedJenis) {
        // Lewati email ini karena tidak cocok dengan kategori target
        continue;
      }

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
        if (emailBody) {
          const base64Content = Buffer.from(emailBody).toString('base64');
          const mimeType = parsed.html ? 'text/html' : 'text/plain';
          fileUrl = `data:${mimeType};charset=utf-8;base64,${base64Content}`;
        }
      }

      const cleanSender = (parsed.from as any)?.text || msg.envelope?.from?.map((f: any) => `${f.name || ''} <${f.address}>`).join(', ') || 'Unknown Sender';
      const cleanRecipient = (parsed.to as any)?.text || msg.envelope?.to?.map((t: any) => `${t.name || ''} <${t.address}>`).join(', ') || 'Unknown Recipient';
      const tanggal = parsed.date || msg.envelope?.date || new Date();

      // Separate into incoming or outgoing mail
      const isOutgoing = forceOutgoing || cleanSender.toLowerCase().includes(userEmail.toLowerCase());

      // Ekstrak nomor surat langsung dari email
      let extractedNoSurat = extractNomorSurat(perihal, emailBody);

      // Pastikan nomor surat unik di database sebelum digunakan
      if (extractedNoSurat) {
        const dupMasuk = await prisma.suratMasuk.findUnique({
          where: { nomorSurat: extractedNoSurat }
        });
        const dupKeluar = await prisma.suratKeluar.findUnique({
          where: { nomorSurat: extractedNoSurat }
        });

        if (dupMasuk || dupKeluar) {
          extractedNoSurat = null;
        }
      }

      const nomorSurat = extractedNoSurat || (isOutgoing 
        ? `SK/AUTO/${msg.uid}/${tanggal.getTime()}` 
        : `SM/AUTO/${msg.uid}/${tanggal.getTime()}`);

      if (isOutgoing) {
        await prisma.suratKeluar.create({
          data: {
            nomorSurat: nomorSurat,
            tujuan: cleanRecipient,
            perihal: perihal,
            tanggalDikirim: tanggal,
            fileUrl: fileUrl,
            jenisSuratId: matchedJenis.id,
            messageId: messageId
          }
        });
      } else {
        await prisma.suratMasuk.create({
          data: {
            nomorSurat: nomorSurat,
            pengirim: cleanSender,
            perihal: perihal,
            tanggalDiterima: tanggal,
            fileUrl: fileUrl,
            jenisSuratId: matchedJenis.id,
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

    // Pastikan semua jenis surat kategori target sudah ada di database
    const categoriesToEnsure = [
      { kode: 'ST', nama: 'Surat Tugas' },
      { kode: 'SP', nama: 'Surat Permintaan' },
      { kode: 'SK', nama: 'Surat Keputusan' },
      { kode: 'LT', nama: 'Laporan Teknis' },
      { kode: 'EML', nama: 'Email / Surat Elektronik' }
    ];

    const jenisSuratList = [];
    for (const item of categoriesToEnsure) {
      let js = await prisma.jenisSurat.findUnique({
        where: { kode: item.kode }
      });
      if (!js) {
        js = await prisma.jenisSurat.create({
          data: item
        });
      }
      jenisSuratList.push(js);
    }

    // 1. Sync INBOX (Surat Masuk)
    const newInboxCount = await syncMailbox(client, 'INBOX', false, user, jenisSuratList);

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
        newSentCount = await syncMailbox(client, sentMailbox.path, true, user, jenisSuratList);
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
