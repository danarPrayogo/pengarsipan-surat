// app/actions/Dashboard.ts
'use server'

import { prisma } from '@/app/lib/db'

export async function getDashboardStats() {
  try {
    const totalMasuk = await prisma.suratMasuk.count()
    const totalKeluar = await prisma.suratKeluar.count()
    const totalJenis = await prisma.jenisSurat.count()

    const recentMasuk = await prisma.suratMasuk.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        jenisSurat: true,
      },
    })

    const recentKeluar = await prisma.suratKeluar.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        jenisSurat: true,
      },
    })

    // Get statistics for types breakdown
    const jenisBreakdown = await prisma.jenisSurat.findMany({
      include: {
        _count: {
          select: {
            suratMasuk: true,
            suratKeluar: true,
          },
        },
      },
    })

    const breakdownData = jenisBreakdown.map((item) => ({
      nama: item.nama,
      kode: item.kode,
      masuk: item._count.suratMasuk,
      keluar: item._count.suratKeluar,
      total: item._count.suratMasuk + item._count.suratKeluar,
    }))

    return {
      totalMasuk,
      totalKeluar,
      totalJenis,
      recentMasuk,
      recentKeluar,
      breakdownData,
    }
  } catch (error) {
    console.error("Gagal mengambil data dashboard:", error)
    throw new Error("Gagal mengambil data statistik dashboard")
  }
}

export async function getLaporanStats(tahun?: number) {
  try {
    const currentYear = tahun || new Date().getFullYear()

    // Fetch all mail records for the year
    const suratMasuk = await prisma.suratMasuk.findMany({
      where: {
        tanggalDiterima: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
        },
      },
      select: {
        tanggalDiterima: true,
        jenisSuratId: true,
      },
    })

    const suratKeluar = await prisma.suratKeluar.findMany({
      where: {
        tanggalDikirim: {
          gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
        },
      },
      select: {
        tanggalDikirim: true,
        jenisSuratId: true,
      },
    })

    // Group by month
    const monthlyStats = Array.from({ length: 12 }, (_, i) => ({
      bulanNum: i,
      bulanName: [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
      ][i],
      masuk: 0,
      keluar: 0,
    }))

    suratMasuk.forEach((s) => {
      const month = new Date(s.tanggalDiterima).getMonth()
      if (month >= 0 && month < 12) {
        monthlyStats[month].masuk++
      }
    })

    suratKeluar.forEach((s) => {
      const month = new Date(s.tanggalDikirim).getMonth()
      if (month >= 0 && month < 12) {
        monthlyStats[month].keluar++
      }
    })

    return {
      monthlyStats,
      totalMasukYear: suratMasuk.length,
      totalKeluarYear: suratKeluar.length,
    }
  } catch (error) {
    console.error("Gagal mengambil data laporan:", error)
    throw new Error("Gagal mengambil data statistik laporan")
  }
}
