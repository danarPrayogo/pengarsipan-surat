// app/actions/SuratKeluar.ts
'use server'

import { prisma } from '@/app/lib/db'

export async function getSuratKeluarDisortir(
  kategoriId?: number,
  kataKunci?: string,
  tanggalMulai?: string,
  tanggalSelesai?: string
) {
  try {
    const suratKeluar = await prisma.suratKeluar.findMany({
      where: {
        ...(kategoriId && { jenisSuratId: kategoriId }),
        ...(kataKunci && {
          OR: [
            { perihal: { contains: kataKunci, mode: 'insensitive' } },
            { tujuan: { contains: kataKunci, mode: 'insensitive' } },
            { nomorSurat: { contains: kataKunci, mode: 'insensitive' } },
          ],
        }),
        ...((tanggalMulai || tanggalSelesai) && {
          tanggalDikirim: {
            ...(tanggalMulai && { gte: new Date(tanggalMulai) }),
            ...(tanggalSelesai && { lte: new Date(tanggalSelesai) }),
          },
        }),
      },
      orderBy: {
        tanggalDikirim: 'desc',
      },
      include: {
        jenisSurat: true,
      },
    })
    
    return suratKeluar
  } catch (error) {
    console.error("Gagal mengambil data surat keluar:", error)
    throw new Error("Gagal mengambil data")
  }
}

export async function createSuratKeluar(data: {
  nomorSurat: string;
  tujuan: string;
  perihal: string;
  tanggalDikirim: string; // format YYYY-MM-DD
  jenisSuratId: number;
  fileUrl?: string;
}) {
  try {
    const newSurat = await prisma.suratKeluar.create({
      data: {
        nomorSurat: data.nomorSurat,
        tujuan: data.tujuan,
        perihal: data.perihal,
        tanggalDikirim: new Date(data.tanggalDikirim),
        jenisSuratId: Number(data.jenisSuratId),
        fileUrl: data.fileUrl || null,
      },
      include: {
        jenisSurat: true,
      }
    })
    return newSurat
  } catch (error: any) {
    console.error("Gagal menyimpan data surat keluar:", error)
    if (error.code === 'P2002') {
      throw new Error("Nomor surat sudah terdaftar")
    }
    throw new Error("Gagal menyimpan data surat keluar")
  }
}

export async function updateSuratKeluar(id: number, data: {
  nomorSurat: string;
  tujuan: string;
  perihal: string;
  tanggalDikirim: string; // format YYYY-MM-DD
  jenisSuratId: number;
  fileUrl?: string;
}) {
  try {
    const updatedSurat = await prisma.suratKeluar.update({
      where: { id },
      data: {
        nomorSurat: data.nomorSurat,
        tujuan: data.tujuan,
        perihal: data.perihal,
        tanggalDikirim: new Date(data.tanggalDikirim),
        jenisSuratId: Number(data.jenisSuratId),
        fileUrl: data.fileUrl || null,
      },
      include: {
        jenisSurat: true,
      }
    })
    return updatedSurat
  } catch (error: any) {
    console.error("Gagal memperbarui data surat keluar:", error)
    if (error.code === 'P2002') {
      throw new Error("Nomor surat sudah terdaftar")
    }
    throw new Error("Gagal memperbarui data surat keluar")
  }
}

export async function deleteSuratKeluar(id: number) {
  try {
    await prisma.suratKeluar.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error("Gagal menghapus data surat keluar:", error)
    throw new Error("Gagal menghapus data surat keluar")
  }
}
