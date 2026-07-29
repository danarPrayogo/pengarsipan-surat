// app/actions/JenisSurat.ts
'use server'

import { prisma } from '@/app/lib/db'

export async function getAllJenisSurat() {
  try {
    const list = await prisma.jenisSurat.findMany({
      orderBy: { nama: 'asc' },
      include: {
        _count: {
          select: {
            suratMasuk: true,
            suratKeluar: true
          }
        }
      }
    })
    return list
  } catch (error) {
    console.error("Gagal mengambil data jenis surat:", error)
    throw new Error("Gagal mengambil data jenis surat")
  }
}

export async function createJenisSurat(data: {
  kode: string;
  nama: string;
}) {
  try {
    const newJenis = await prisma.jenisSurat.create({
      data: {
        kode: data.kode.toUpperCase(),
        nama: data.nama,
      }
    })
    return newJenis
  } catch (error: any) {
    console.error("Gagal menyimpan jenis surat:", error)
    if (error.code === 'P2002') {
      throw new Error("Kode jenis surat sudah digunakan")
    }
    throw new Error("Gagal menyimpan jenis surat")
  }
}

export async function updateJenisSurat(id: number, data: {
  kode: string;
  nama: string;
}) {
  try {
    const updatedJenis = await prisma.jenisSurat.update({
      where: { id },
      data: {
        kode: data.kode.toUpperCase(),
        nama: data.nama,
      }
    })
    return updatedJenis
  } catch (error: any) {
    console.error("Gagal memperbarui jenis surat:", error)
    if (error.code === 'P2002') {
      throw new Error("Kode jenis surat sudah digunakan")
    }
    throw new Error("Gagal memperbarui jenis surat")
  }
}

export async function deleteJenisSurat(id: number) {
  try {
    // Check if there are associated letters
    const countMasuk = await prisma.suratMasuk.count({ where: { jenisSuratId: id } })
    const countKeluar = await prisma.suratKeluar.count({ where: { jenisSuratId: id } })
    
    if (countMasuk > 0 || countKeluar > 0) {
      throw new Error("Jenis surat tidak bisa dihapus karena masih digunakan oleh surat masuk/keluar")
    }

    await prisma.jenisSurat.delete({
      where: { id }
    })
    return { success: true }
  } catch (error: any) {
    console.error("Gagal menghapus jenis surat:", error)
    throw new Error(error.message || "Gagal menghapus jenis surat")
  }
}
