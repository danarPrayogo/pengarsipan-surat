// app/actions/SuratMasuk.ts
'use server'

import { prisma } from '@/app/lib/db'

export async function getSuratMasukDisortir(
  kategoriId?: number,
  kataKunci?: string,
  tanggalMulai?: string,
  tanggalSelesai?: string
) {
  try {
    const suratMasuk = await prisma.suratMasuk.findMany({
      where: {
        // Filter berdasarkan ID jenis surat jika ada
        ...(kategoriId && { jenisSuratId: kategoriId }),
        // Pencarian teks pada perihal atau pengirim jika ada kata kunci
        ...(kataKunci && {
          OR: [
            { perihal: { contains: kataKunci, mode: 'insensitive' } },
            { pengirim: { contains: kataKunci, mode: 'insensitive' } },
            { nomorSurat: { contains: kataKunci, mode: 'insensitive' } },
          ],
        }),
        // Filter berdasarkan rentang tanggal jika ada
        ...((tanggalMulai || tanggalSelesai) && {
          tanggalDiterima: {
            ...(tanggalMulai && { gte: new Date(tanggalMulai) }),
            ...(tanggalSelesai && { lte: new Date(tanggalSelesai) }),
          },
        }),
      },
      // Urutkan berdasarkan tanggal diterima dari yang paling baru
      orderBy: {
        tanggalDiterima: 'desc',
      },
      // Sertakan data jenis surat dalam hasil (JOIN)
      include: {
        jenisSurat: true, 
      },
    })
    
    return suratMasuk
  } catch (error) {
    console.error("Gagal mengambil data surat masuk:", error)
    throw new Error("Gagal mengambil data")
  }
}

export async function getJenisSurat() {
  try {
    const categories = await prisma.jenisSurat.findMany({
      orderBy: { nama: 'asc' }
    })
    return categories
  } catch (error) {
    console.error("Gagal mengambil data jenis surat:", error)
    throw new Error("Gagal mengambil data jenis surat")
  }
}

export async function createSuratMasuk(data: {
  nomorSurat: string;
  pengirim: string;
  perihal: string;
  tanggalDiterima: string; // format YYYY-MM-DD
  jenisSuratId: number;
  fileUrl?: string;
}) {
  try {
    const newSurat = await prisma.suratMasuk.create({
      data: {
        nomorSurat: data.nomorSurat,
        pengirim: data.pengirim,
        perihal: data.perihal,
        tanggalDiterima: new Date(data.tanggalDiterima),
        jenisSuratId: Number(data.jenisSuratId),
        fileUrl: data.fileUrl || null,
      },
      include: {
        jenisSurat: true,
      }
    })
    return newSurat
  } catch (error: any) {
    console.error("Gagal menyimpan data surat masuk:", error)
    if (error.code === 'P2002') {
      throw new Error("Nomor surat sudah terdaftar")
    }
    throw new Error("Gagal menyimpan data surat masuk")
  }
}

export async function updateSuratMasuk(id: number, data: {
  nomorSurat: string;
  pengirim: string;
  perihal: string;
  tanggalDiterima: string; // format YYYY-MM-DD
  jenisSuratId: number;
  fileUrl?: string;
}) {
  try {
    const updatedSurat = await prisma.suratMasuk.update({
      where: { id },
      data: {
        nomorSurat: data.nomorSurat,
        pengirim: data.pengirim,
        perihal: data.perihal,
        tanggalDiterima: new Date(data.tanggalDiterima),
        jenisSuratId: Number(data.jenisSuratId),
        fileUrl: data.fileUrl || null,
      },
      include: {
        jenisSurat: true,
      }
    })
    return updatedSurat
  } catch (error: any) {
    console.error("Gagal memperbarui data surat masuk:", error)
    if (error.code === 'P2002') {
      throw new Error("Nomor surat sudah terdaftar")
    }
    throw new Error("Gagal memperbarui data surat masuk")
  }
}

export async function deleteSuratMasuk(id: number) {
  try {
    await prisma.suratMasuk.delete({
      where: { id }
    })
    return { success: true }
  } catch (error) {
    console.error("Gagal menghapus data surat masuk:", error)
    throw new Error("Gagal menghapus data surat masuk")
  }
}