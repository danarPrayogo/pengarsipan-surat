// app/dashboard/page.tsx
'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  LayoutDashboard, 
  Mail, 
  Inbox, 
  FileText, 
  BarChart3, 
  LogOut, 
  Search, 
  Calendar, 
  Plus, 
  ChevronDown, 
  X, 
  Check, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Edit,
  Trash2,
  Download,
  Upload,
  TrendingUp,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  MailCheck,
  RefreshCw,
  Eye
} from 'lucide-react'
import { 
  getSuratMasukDisortir, 
  getJenisSurat, 
  createSuratMasuk,
  updateSuratMasuk,
  deleteSuratMasuk
} from '@/app/actions/SuratMasuk'
import {
  getSuratKeluarDisortir,
  createSuratKeluar,
  updateSuratKeluar,
  deleteSuratKeluar
} from '@/app/actions/SuratKeluar'
import {
  getAllJenisSurat,
  createJenisSurat,
  updateJenisSurat,
  deleteJenisSurat
} from '@/app/actions/JenisSurat'
import {
  getDashboardStats,
  getLaporanStats
} from '@/app/actions/Dashboard'
import {
  syncEmailsAction,
  getSuratUsageStats,
  archiveAllLettersAction,
  clearAllLettersAction
} from '@/app/actions/EmailSync'
import JSZip from 'jszip'

// Type definitions matching prisma
interface JenisSurat {
  id: number
  kode: string
  nama: string
  _count?: {
    suratMasuk: number
    suratKeluar: number
  }
}

interface SuratMasuk {
  id: number
  nomorSurat: string
  pengirim: string
  perihal: string
  tanggalDiterima: Date
  jenisSuratId: number
  jenisSurat: JenisSurat
  fileUrl?: string | null
}

interface SuratKeluar {
  id: number
  nomorSurat: string
  tujuan: string
  perihal: string
  tanggalDikirim: Date
  jenisSuratId: number
  jenisSurat: JenisSurat
  fileUrl?: string | null
}

interface DashboardData {
  totalMasuk: number
  totalKeluar: number
  totalJenis: number
  recentMasuk: any[]
  recentKeluar: any[]
  breakdownData: Array<{
    nama: string
    kode: string
    masuk: number
    keluar: number
    total: number
  }>
}

interface LaporanData {
  monthlyStats: Array<{
    bulanNum: number
    bulanName: string
    masuk: number
    keluar: number
  }>
  totalMasukYear: number
  totalKeluarYear: number
}

export default function Dashboard() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Sidebar navigation active state
  const [activeTab, setActiveTab] = useState('dashboard')

  // Global Categories
  const [categories, setCategories] = useState<JenisSurat[]>([])

  // Dashboard Stats States
  const [dbStats, setDbStats] = useState<DashboardData | null>(null)
  const [isDbLoading, setIsDbLoading] = useState(true)

  // Surat Masuk States
  const [suratMasukList, setSuratMasukList] = useState<SuratMasuk[]>([])
  const [isSmLoading, setIsSmLoading] = useState(true)
  const [smSearchQuery, setSmSearchQuery] = useState('')
  const [smSelectedCategory, setSmSelectedCategory] = useState<number | undefined>(undefined)
  const [smDateStart, setSmDateStart] = useState('')
  const [smDateEnd, setSmDateEnd] = useState('')
  const [smCurrentPage, setSmCurrentPage] = useState(1)
  const itemsPerPage = 5

  // Surat Masuk Modal / Edit
  const [isSmModalOpen, setIsSmModalOpen] = useState(false)
  const [smEditingId, setSmEditingId] = useState<number | null>(null)
  const [smFormData, setSmFormData] = useState({
    nomorSurat: '',
    pengirim: '',
    perihal: '',
    tanggalDiterima: '',
    jenisSuratId: '',
    fileUrl: '',
  })

  // Surat Keluar States
  const [suratKeluarList, setSuratKeluarList] = useState<SuratKeluar[]>([])
  const [isSkLoading, setIsSkLoading] = useState(true)
  const [skSearchQuery, setSkSearchQuery] = useState('')
  const [skSelectedCategory, setSkSelectedCategory] = useState<number | undefined>(undefined)
  const [skDateStart, setSkDateStart] = useState('')
  const [skDateEnd, setSkDateEnd] = useState('')
  const [skCurrentPage, setSkCurrentPage] = useState(1)

  // Surat Keluar Modal / Edit
  const [isSkModalOpen, setIsSkModalOpen] = useState(false)
  const [skEditingId, setSkEditingId] = useState<number | null>(null)
  const [skFormData, setSkFormData] = useState({
    nomorSurat: '',
    tujuan: '',
    perihal: '',
    tanggalDikirim: '',
    jenisSuratId: '',
    fileUrl: '',
  })

  // Jenis Surat States
  const [jenisSuratList, setJenisSuratList] = useState<JenisSurat[]>([])
  const [isJsLoading, setIsJsLoading] = useState(true)
  const [isJsModalOpen, setIsJsModalOpen] = useState(false)
  const [jsEditingId, setJsEditingId] = useState<number | null>(null)
  const [jsFormData, setJsFormData] = useState({
    kode: '',
    nama: '',
  })

  // Laporan States
  const [laporanStats, setLaporanStats] = useState<LaporanData | null>(null)
  const [isLaporanLoading, setIsLaporanLoading] = useState(true)
  const [laporanYear, setLaporanYear] = useState(2026)

  // Common Dialog & Notifications
  const [successToast, setSuccessToast] = useState('')
  const [modalError, setModalError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Delete Dialog states
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'masuk' | 'keluar' | 'jenis'
    id: number
    name: string
  }>({
    isOpen: false,
    type: 'masuk',
    id: 0,
    name: ''
  })

  // Logout Dialog state
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)

  // Email Sync & Archive States
  const [isSyncing, setIsSyncing] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [usageStats, setUsageStats] = useState({
    totalMasuk: 0,
    totalKeluar: 0,
    totalCount: 0,
    isExceeded: false
  })
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // File Viewer Modal States
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerFileUrl, setViewerFileUrl] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')

  // Form input modes ('upload' berkas vs 'write' manual)
  const [smContentMode, setSmContentMode] = useState<'upload' | 'write'>('upload')
  const [skContentMode, setSkContentMode] = useState<'upload' | 'write'>('upload')

  const openFileViewer = (fileUrl: string | null | undefined, title: string) => {
    if (!fileUrl) return
    setViewerFileUrl(fileUrl)
    setViewerTitle(title)
    setViewerOpen(true)
  }

  const loadUsageStats = async () => {
    try {
      const stats = await getSuratUsageStats()
      setUsageStats(stats)
    } catch (err) {
      console.error("Gagal memuat statistik kapasitas", err)
    }
  }

  const handleSyncEmails = async () => {
    setIsSyncing(true)
    try {
      const res = await syncEmailsAction()
      if (res.success) {
        showSuccess(res.message)
        // Reload active tab data
        if (activeTab === 'dashboard') {
          loadDashboardData()
        } else if (activeTab === 'surat-masuk') {
          loadSuratMasuk()
        } else if (activeTab === 'surat-keluar') {
          loadSuratKeluar()
        }
        loadUsageStats()
      }
    } catch (err: any) {
      alert(err.message || 'Gagal melakukan sinkronisasi email')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleArchiveAndClear = async () => {
    if (!confirm("Apakah Anda yakin ingin mengarsipkan seluruh surat? Aksi ini akan mengunduh semua berkas surat dan datanya dalam bentuk ZIP, kemudian MENGHAPUS seluruh data dari database agar ruang penyimpanan kosong kembali.")) {
      return
    }
    
    setIsArchiving(true)
    try {
      const { suratMasuk, suratKeluar } = await archiveAllLettersAction()
      
      if (suratMasuk.length === 0 && suratKeluar.length === 0) {
        alert("Tidak ada surat yang dapat diarsipkan.")
        setIsArchiving(false)
        return
      }

      const zip = new JSZip()

      let summaryText = `LAPORAN ARSIP SURAT DINAS\n`
      summaryText += `Tanggal Pengarsipan: ${new Date().toLocaleString('id-ID')}\n`
      summaryText += `Total Surat Masuk: ${suratMasuk.length}\n`
      summaryText += `Total Surat Keluar: ${suratKeluar.length}\n`
      summaryText += `==========================================\n\n`

      const folderMasuk = zip.folder("Surat_Masuk")
      summaryText += `--- DAFTAR SURAT MASUK ---\n`
      suratMasuk.forEach((s, index) => {
        summaryText += `${index + 1}. Nomor: ${s.nomorSurat} | Pengirim: ${s.pengirim} | Perihal: ${s.perihal} | Tanggal Diterima: ${new Date(s.tanggalDiterima).toLocaleDateString('id-ID')}\n`
        
        if (s.fileUrl && s.fileUrl.startsWith('data:')) {
          const base64Parts = s.fileUrl.split(';base64,')
          if (base64Parts.length === 2) {
            const base64Data = base64Parts[1]
            const mimeType = base64Parts[0].split('data:')[1]
            let ext = 'pdf'
            if (mimeType.includes('image/png')) ext = 'png'
            else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) ext = 'jpg'
            else if (mimeType.includes('word')) ext = 'docx'

            const fileName = `${s.nomorSurat.replace(/[\/\\:\*\?"<>\|]/g, '_')}.${ext}`
            folderMasuk?.file(fileName, base64Data, { base64: true })
          }
        }
      })

      summaryText += `\n`

      const folderKeluar = zip.folder("Surat_Keluar")
      summaryText += `--- DAFTAR SURAT KELUAR ---\n`
      suratKeluar.forEach((s, index) => {
        summaryText += `${index + 1}. Nomor: ${s.nomorSurat} | Tujuan: ${s.tujuan} | Perihal: ${s.perihal} | Tanggal Dikirim: ${new Date(s.tanggalDikirim).toLocaleDateString('id-ID')}\n`
        
        if (s.fileUrl && s.fileUrl.startsWith('data:')) {
          const base64Parts = s.fileUrl.split(';base64,')
          if (base64Parts.length === 2) {
            const base64Data = base64Parts[1]
            const mimeType = base64Parts[0].split('data:')[1]
            let ext = 'pdf'
            if (mimeType.includes('image/png')) ext = 'png'
            else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) ext = 'jpg'
            else if (mimeType.includes('word')) ext = 'docx'

            const fileName = `${s.nomorSurat.replace(/[\/\\:\*\?"<>\|]/g, '_')}.${ext}`
            folderKeluar?.file(fileName, base64Data, { base64: true })
          }
        }
      })

      zip.file("laporan_arsip.txt", summaryText)

      const content = await zip.generateAsync({ type: "blob" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(content)
      link.download = `arsip_surat_${new Date().toISOString().split('T')[0]}_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      await clearAllLettersAction()
      showSuccess("Database berhasil diarsipkan ke format ZIP & dikosongkan!")
      
      if (activeTab === 'dashboard') {
        loadDashboardData()
      } else if (activeTab === 'surat-masuk') {
        loadSuratMasuk()
      } else if (activeTab === 'surat-keluar') {
        loadSuratKeluar()
      }
      loadUsageStats()
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Gagal mengarsipkan surat")
    } finally {
      setIsArchiving(false)
    }
  }

  // Load initial global categories and usage stats + Trigger auto-sync in background
  useEffect(() => {
    loadGlobalCategories()
    loadUsageStats()

    const autoSync = async () => {
      try {
        const res = await syncEmailsAction()
        if (res.success && res.count > 0) {
          showSuccess(res.message)
          loadUsageStats()
          setRefreshTrigger(prev => prev + 1)
        }
      } catch (err) {
        console.error("Auto-sync background error:", err)
      }
    }

    // Run once after 2 seconds (non-blocking)
    const timer = setTimeout(autoSync, 2000)

    // Run every 5 minutes (300,000 ms)
    const interval = setInterval(autoSync, 300000)

    return () => {
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [])

  const loadGlobalCategories = async () => {
    try {
      const cats = await getJenisSurat()
      setCategories(cats)
    } catch (err) {
      console.error("Gagal memuat jenis surat", err)
    }
  }

  // Route tab changes to fetch specific tab data
  useEffect(() => {
    loadUsageStats()
    if (activeTab === 'dashboard') {
      loadDashboardData()
    } else if (activeTab === 'surat-masuk') {
      loadSuratMasuk()
    } else if (activeTab === 'surat-keluar') {
      loadSuratKeluar()
    } else if (activeTab === 'jenis-surat') {
      loadJenisSurat()
    } else if (activeTab === 'laporan') {
      loadLaporanData()
    }
  }, [activeTab, refreshTrigger])

  // Refetch lists when filters change
  useEffect(() => {
    if (activeTab === 'surat-masuk') {
      loadSuratMasuk()
    }
  }, [smSearchQuery, smSelectedCategory, smDateStart, smDateEnd])

  useEffect(() => {
    if (activeTab === 'surat-keluar') {
      loadSuratKeluar()
    }
  }, [skSearchQuery, skSelectedCategory, skDateStart, skDateEnd])

  useEffect(() => {
    if (activeTab === 'laporan') {
      loadLaporanData()
    }
  }, [laporanYear])

  // --- DATA LOADING FUNCTIONS ---
  const loadDashboardData = async () => {
    setIsDbLoading(true)
    try {
      const stats = await getDashboardStats()
      setDbStats(stats)
    } catch (err) {
      console.error("Gagal memuat statistik dashboard", err)
    } finally {
      setIsDbLoading(false)
    }
  }

  const loadSuratMasuk = async () => {
    setIsSmLoading(true)
    try {
      const data = await getSuratMasukDisortir(
        smSelectedCategory,
        smSearchQuery || undefined,
        smDateStart || undefined,
        smDateEnd || undefined
      )
      setSuratMasukList(data as unknown as SuratMasuk[])
      setSmCurrentPage(1)
    } catch (err) {
      console.error("Gagal memuat surat masuk", err)
    } finally {
      setIsSmLoading(false)
    }
  }

  const loadSuratKeluar = async () => {
    setIsSkLoading(true)
    try {
      const data = await getSuratKeluarDisortir(
        skSelectedCategory,
        skSearchQuery || undefined,
        skDateStart || undefined,
        skDateEnd || undefined
      )
      setSuratKeluarList(data as unknown as SuratKeluar[])
      setSkCurrentPage(1)
    } catch (err) {
      console.error("Gagal memuat surat keluar", err)
    } finally {
      setIsSkLoading(false)
    }
  }

  const loadJenisSurat = async () => {
    setIsJsLoading(true)
    try {
      const data = await getAllJenisSurat()
      setJenisSuratList(data as unknown as JenisSurat[])
    } catch (err) {
      console.error("Gagal memuat jenis surat", err)
    } finally {
      setIsJsLoading(false)
    }
  }

  const loadLaporanData = async () => {
    setIsLaporanLoading(true)
    try {
      const data = await getLaporanStats(laporanYear)
      setLaporanStats(data)
    } catch (err) {
      console.error("Gagal memuat data laporan", err)
    } finally {
      setIsLaporanLoading(false)
    }
  }

  // --- CRUD SUBMISSIONS ---
  
  // 1. SURAT MASUK CRUD
  const handleSmOpenAddModal = () => {
    setSmEditingId(null)
    setSmFormData({
      nomorSurat: '',
      pengirim: '',
      perihal: '',
      tanggalDiterima: new Date().toISOString().split('T')[0],
      jenisSuratId: categories[0]?.id.toString() || '',
      fileUrl: '',
    })
    setSmContentMode('upload')
    setModalError('')
    setIsSmModalOpen(true)
  }

  const handleSmOpenEditModal = (item: SuratMasuk) => {
    setSmEditingId(item.id)
    setSmFormData({
      nomorSurat: item.nomorSurat,
      pengirim: item.pengirim,
      perihal: item.perihal,
      tanggalDiterima: new Date(item.tanggalDiterima).toISOString().split('T')[0],
      jenisSuratId: item.jenisSuratId.toString(),
      fileUrl: item.fileUrl || '',
    })
    const isManualText = item.fileUrl ? (item.fileUrl.startsWith('data:text/html') || item.fileUrl.startsWith('data:text/plain')) : false
    setSmContentMode(isManualText ? 'write' : 'upload')
    setModalError('')
    setIsSmModalOpen(true)
  }

  const handleSmSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setIsSubmitting(true)

    try {
      if (smEditingId) {
        await updateSuratMasuk(smEditingId, {
          nomorSurat: smFormData.nomorSurat,
          pengirim: smFormData.pengirim,
          perihal: smFormData.perihal,
          tanggalDiterima: smFormData.tanggalDiterima,
          jenisSuratId: Number(smFormData.jenisSuratId),
          fileUrl: smFormData.fileUrl || undefined,
        })
        showSuccess('Surat masuk berhasil diperbarui!')
      } else {
        await createSuratMasuk({
          nomorSurat: smFormData.nomorSurat,
          pengirim: smFormData.pengirim,
          perihal: smFormData.perihal,
          tanggalDiterima: smFormData.tanggalDiterima,
          jenisSuratId: Number(smFormData.jenisSuratId),
          fileUrl: smFormData.fileUrl || undefined,
        })
        showSuccess('Surat masuk berhasil ditambahkan!')
      }
      setIsSmModalOpen(false)
      loadSuratMasuk()
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan data')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 2. SURAT KELUAR CRUD
  const handleSkOpenAddModal = () => {
    setSkEditingId(null)
    setSkFormData({
      nomorSurat: '',
      tujuan: '',
      perihal: '',
      tanggalDikirim: new Date().toISOString().split('T')[0],
      jenisSuratId: categories[0]?.id.toString() || '',
      fileUrl: '',
    })
    setSkContentMode('upload')
    setModalError('')
    setIsSkModalOpen(true)
  }

  const handleSkOpenEditModal = (item: SuratKeluar) => {
    setSkEditingId(item.id)
    setSkFormData({
      nomorSurat: item.nomorSurat,
      tujuan: item.tujuan,
      perihal: item.perihal,
      tanggalDikirim: new Date(item.tanggalDikirim).toISOString().split('T')[0],
      jenisSuratId: item.jenisSuratId.toString(),
      fileUrl: item.fileUrl || '',
    })
    const isManualText = item.fileUrl ? (item.fileUrl.startsWith('data:text/html') || item.fileUrl.startsWith('data:text/plain')) : false
    setSkContentMode(isManualText ? 'write' : 'upload')
    setModalError('')
    setIsSkModalOpen(true)
  }

  const handleSkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setIsSubmitting(true)

    try {
      if (skEditingId) {
        await updateSuratKeluar(skEditingId, {
          nomorSurat: skFormData.nomorSurat,
          tujuan: skFormData.tujuan,
          perihal: skFormData.perihal,
          tanggalDikirim: skFormData.tanggalDikirim,
          jenisSuratId: Number(skFormData.jenisSuratId),
          fileUrl: skFormData.fileUrl || undefined,
        })
        showSuccess('Surat keluar berhasil diperbarui!')
      } else {
        await createSuratKeluar({
          nomorSurat: skFormData.nomorSurat,
          tujuan: skFormData.tujuan,
          perihal: skFormData.perihal,
          tanggalDikirim: skFormData.tanggalDikirim,
          jenisSuratId: Number(skFormData.jenisSuratId),
          fileUrl: skFormData.fileUrl || undefined,
        })
        showSuccess('Surat keluar berhasil ditambahkan!')
      }
      setIsSkModalOpen(false)
      loadSuratKeluar()
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan data')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. JENIS SURAT CRUD
  const handleJsOpenAddModal = () => {
    setJsEditingId(null)
    setJsFormData({ kode: '', nama: '' })
    setModalError('')
    setIsJsModalOpen(true)
  }

  const handleJsOpenEditModal = (item: JenisSurat) => {
    setJsEditingId(item.id)
    setJsFormData({ kode: item.kode, nama: item.nama })
    setModalError('')
    setIsJsModalOpen(true)
  }

  const handleJsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError('')
    setIsSubmitting(true)

    try {
      if (jsEditingId) {
        await updateJenisSurat(jsEditingId, jsFormData)
        showSuccess('Jenis surat berhasil diperbarui!')
      } else {
        await createJenisSurat(jsFormData)
        showSuccess('Jenis surat berhasil ditambahkan!')
      }
      setIsJsModalOpen(false)
      loadJenisSurat()
      loadGlobalCategories()
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan jenis surat')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- DELETE CONFIRMATION ---
  const triggerDelete = (type: 'masuk' | 'keluar' | 'jenis', id: number, name: string) => {
    setDeleteConfirm({
      isOpen: true,
      type,
      id,
      name
    })
  }

  const executeDelete = async () => {
    try {
      if (deleteConfirm.type === 'masuk') {
        await deleteSuratMasuk(deleteConfirm.id)
        showSuccess('Surat masuk berhasil dihapus!')
        loadSuratMasuk()
      } else if (deleteConfirm.type === 'keluar') {
        await deleteSuratKeluar(deleteConfirm.id)
        showSuccess('Surat keluar berhasil dihapus!')
        loadSuratKeluar()
      } else if (deleteConfirm.type === 'jenis') {
        await deleteJenisSurat(deleteConfirm.id)
        showSuccess('Jenis surat berhasil dihapus!')
        loadJenisSurat()
        loadGlobalCategories()
      }
      setDeleteConfirm({ isOpen: false, type: 'masuk', id: 0, name: '' })
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus data')
    }
  }

  // Helper Toast Alert
  const showSuccess = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(''), 4500)
  }

  // Formatting date to Indonesian locale: "15 Juli 2026"
  const formatDateIndo = (dateValue: Date | string) => {
    const d = new Date(dateValue)
    if (isNaN(d.getTime())) return '-'
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
    
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  }

  // Extract raw text content from base64 data URLs for editing
  const getRawTextFromFileUrl = (fileUrl: string | null | undefined) => {
    if (!fileUrl) return ''
    if (!fileUrl.startsWith('data:text/html') && !fileUrl.startsWith('data:text/plain')) return ''
    try {
      const base64 = fileUrl.split(';base64,')[1]
      if (!base64) return ''
      const decoded = Buffer.from(base64, 'base64').toString('utf-8')
      if (fileUrl.startsWith('data:text/html')) {
        const match = decoded.match(/<body[^>]*>([\s\S]*)<\/body>/)
        return match ? match[1] : decoded
      }
      return decoded
    } catch (e) {
      return ''
    }
  }

  // Handle Logout
  const handleLogout = () => {
    setIsLogoutModalOpen(true)
  }

  const executeLogout = () => {
    router.push('/')
  }

  // Color mapper for letter type badges
  const getBadgeStyle = (kode: string) => {
    switch (kode) {
      case 'LT': // Laporan Teknis
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'ST': // Surat Tugas
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'SP': // Surat Permintaan
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'SK': // Surat Keputusan
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-zinc-50 text-zinc-700 border-zinc-200'
    }
  }

  // --- PAGINATION COMPONENT GENERATOR ---
  const paginate = (totalItems: number, currentPage: number, setCurrentPage: (p: number) => void) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer text-zinc-600"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>

        {Array.from({ length: totalPages }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentPage(idx + 1)}
            className={`h-7.5 w-7.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center ${
              currentPage === idx + 1
                ? 'bg-[#1d56a5] text-white border-[#1d56a5] shadow-sm shadow-blue-800/10'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800'
            }`}
          >
            {idx + 1}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer text-zinc-600"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] text-zinc-800 overflow-hidden font-sans">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col justify-between flex-shrink-0 h-full">
        
        <div>
          {/* Header Identity */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-100 bg-[#fafafa]">
            <div className="relative h-10 w-10 flex-shrink-0">
              <Image
                src="/logo-bmkg.png"
                alt="Logo BMKG"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-[#1e53a4] tracking-wider leading-none">E-PERSURATAN</span>
              <span className="font-bold text-xs text-zinc-500 leading-normal tracking-wide">BMKG KELAS I</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-5 px-3 flex flex-col gap-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-50 text-[#1d56a5]' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
              Dashboard
            </button>

            <button 
              onClick={() => setActiveTab('surat-masuk')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'surat-masuk' 
                  ? 'bg-blue-50 text-[#1d56a5]' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Inbox className="h-5 w-5 flex-shrink-0" />
              Surat Masuk
            </button>

            <button 
              onClick={() => setActiveTab('surat-keluar')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'surat-keluar' 
                  ? 'bg-blue-50 text-[#1d56a5]' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <Mail className="h-5 w-5 flex-shrink-0" />
              Surat Keluar
            </button>

            <button 
              onClick={() => setActiveTab('jenis-surat')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'jenis-surat' 
                  ? 'bg-blue-50 text-[#1d56a5]' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <FileText className="h-5 w-5 flex-shrink-0" />
              Jenis Surat
            </button>

            <button 
              onClick={() => setActiveTab('laporan')}
              className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'laporan' 
                  ? 'bg-blue-50 text-[#1d56a5]' 
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="h-5 w-5 flex-shrink-0" />
              Laporan
            </button>


          </nav>
        </div>

        {/* Footer Area */}
        <div className="p-4 border-t border-zinc-100 flex flex-col gap-3">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2.5 w-full bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-blue-800/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>

          <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
            <div className="h-9 w-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[#1d56a5] font-extrabold text-sm select-none">
              SB
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-zinc-700 truncate">Profil Staf BMKG</span>
              <span className="text-[10px] font-semibold text-zinc-400">Administrator</span>
            </div>
          </div>
        </div>

      </aside>

      {/* 2. MAIN PANELS CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Toast Alert Message Banner */}
        {successToast && (
          <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-bold flex items-center gap-2.5 shadow-xl animate-fade-in-down">
            <div className="h-5 w-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
              <Check className="h-3.5 w-3.5 stroke-[3px]" />
            </div>
            {successToast}
          </div>
        )}

        {/* Peringatan Kapasitas Database Neon (10 Surat Limit) */}
        {usageStats.isExceeded && (
          <div className="mx-6 md:mx-8 mt-6 p-4.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in-down select-none font-sans">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-full bg-amber-500 text-white flex items-center justify-center flex-shrink-0 border border-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[14px]">Kapasitas Database Penuh ({usageStats.totalCount}/10 Surat)</span>
                <span className="text-xs font-semibold text-amber-700/80 mt-0.5">Database gratis Neon Anda telah mencapai batas maksimal 10 surat. Harap arsipkan data ke komputer lokal untuk mengosongkan ruang.</span>
              </div>
            </div>
            <button
              onClick={handleArchiveAndClear}
              disabled={isArchiving}
              className="bg-amber-600 hover:bg-amber-700 active:scale-95 disabled:opacity-75 transition-all text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-amber-800/10 cursor-pointer whitespace-nowrap self-end sm:self-center"
            >
              {isArchiving ? 'Mengarsipkan...' : 'Arsipkan & Kosongkan Data'}
            </button>
          </div>
        )}

        {/* --- TAB PANEL: OVERVIEW DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="flex-1 flex flex-col overflow-auto p-6 md:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold tracking-tight text-zinc-800">Dashboard Ringkasan</h1>
              <p className="text-sm font-semibold text-zinc-500 mt-0.5">Analisis ringkas dan rekam aktivitas persuratan BMKG terpadu.</p>
            </div>

            {isDbLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1d56a5]" /></div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* 3 Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Surat Masuk */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-[#1e53a4] p-6 text-white shadow-lg hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15">
                      <Inbox className="h-32 w-32" />
                    </div>
                    <span className="text-xs font-bold text-blue-100 uppercase tracking-wider">Total Surat Masuk</span>
                    <h2 className="mt-2 text-4xl font-extrabold">{dbStats?.totalMasuk}</h2>
                    <p className="mt-4 text-xs font-semibold text-blue-200 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      Arsip surat masuk terdaftar
                    </p>
                  </div>

                  {/* Card 2: Surat Keluar */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-6 text-white shadow-lg hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15">
                      <Mail className="h-32 w-32" />
                    </div>
                    <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Total Surat Keluar</span>
                    <h2 className="mt-2 text-4xl font-extrabold">{dbStats?.totalKeluar}</h2>
                    <p className="mt-4 text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      Arsip surat keluar terdaftar
                    </p>
                  </div>

                  {/* Card 3: Jenis Surat */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-700 p-6 text-white shadow-lg hover:scale-[1.02] transition-transform duration-300">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15">
                      <FileText className="h-32 w-32" />
                    </div>
                    <span className="text-xs font-bold text-purple-100 uppercase tracking-wider">Kategori Surat</span>
                    <h2 className="mt-2 text-4xl font-extrabold">{dbStats?.totalJenis}</h2>
                    <p className="mt-4 text-xs font-semibold text-purple-200 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4" />
                      Jenis format persuratan
                    </p>
                  </div>
                </div>

                {/* Split layout: Category breakdown & Recent activities */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Category Ratio Breakdown */}
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-zinc-700 tracking-wide mb-4">Rasio Kategori Persuratan</h3>
                      <div className="flex flex-col gap-4">
                        {dbStats?.breakdownData.map((item, idx) => {
                          const totalAll = (dbStats.totalMasuk + dbStats.totalKeluar) || 1
                          const percent = Math.round((item.total / totalAll) * 100)
                          return (
                            <div key={idx} className="flex flex-col gap-1 text-xs">
                              <div className="flex items-center justify-between font-bold text-zinc-600">
                                <span>{item.nama} ({item.kode})</span>
                                <span>{item.total} Surat ({percent}%)</span>
                              </div>
                              <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-600 rounded-full" 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-semibold mt-0.5">
                                <span>Masuk: {item.masuk}</span>
                                <span>Keluar: {item.keluar}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity List */}
                  <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
                    <h3 className="font-extrabold text-sm text-zinc-700 tracking-wide mb-4">Aktivitas Surat Terbaru</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Recent Incoming */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-bold text-[#1d56a5] tracking-wider uppercase border-b border-blue-50 pb-1.5 flex items-center gap-1">
                          <Inbox className="h-4.5 w-4.5" /> Surat Masuk Baru
                        </span>
                        {dbStats?.recentMasuk.length === 0 ? (
                          <span className="text-xs text-zinc-400">Tidak ada surat masuk baru.</span>
                        ) : (
                          dbStats?.recentMasuk.map((s, idx) => (
                            <div key={idx} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#1d56a5] truncate max-w-[120px]">{s.nomorSurat}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getBadgeStyle(s.jenisSurat?.kode)}`}>
                                  {s.jenisSurat?.kode}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-500">Dari: {s.pengirim}</span>
                              <span className="text-xs font-bold text-zinc-700 truncate">{s.perihal}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Recent Outgoing */}
                      <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-bold text-emerald-700 tracking-wider uppercase border-b border-emerald-50 pb-1.5 flex items-center gap-1">
                          <Mail className="h-4.5 w-4.5" /> Surat Keluar Baru
                        </span>
                        {dbStats?.recentKeluar.length === 0 ? (
                          <span className="text-xs text-zinc-400">Tidak ada surat keluar baru.</span>
                        ) : (
                          dbStats?.recentKeluar.map((s, idx) => (
                            <div key={idx} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex flex-col gap-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-700 truncate max-w-[120px]">{s.nomorSurat}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getBadgeStyle(s.jenisSurat?.kode)}`}>
                                  {s.jenisSurat?.kode}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-zinc-500">Ke: {s.tujuan}</span>
                              <span className="text-xs font-bold text-zinc-700 truncate">{s.perihal}</span>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* --- TAB PANEL: SURAT MASUK CRUD --- */}
        {activeTab === 'surat-masuk' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-800">Daftar Surat Masuk</h1>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">Kelola dan arsipkan semua surat masuk dengan mudah.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSyncEmails}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 bg-white text-zinc-700 border border-zinc-200 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-zinc-50 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4.5 w-4.5 text-zinc-500 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi Email'}
                </button>
                <button 
                  onClick={handleSmOpenAddModal}
                  className="flex items-center justify-center gap-2 bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#1a4d94] active:scale-[0.98] transition-all shadow-md shadow-blue-800/10 cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[3px]" />
                  Tambah Surat Masuk
                </button>
              </div>
            </div>

            {/* Filters Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 tracking-wider">Tanggal Diterima</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                    <input 
                      type="date"
                      value={smDateStart}
                      onChange={(e) => setSmDateStart(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg pl-10 pr-2.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <span className="text-zinc-400 text-xs font-bold">s/d</span>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                    <input 
                      type="date"
                      value={smDateEnd}
                      onChange={(e) => setSmDateEnd(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg pl-10 pr-2.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 tracking-wider">Jenis Surat</label>
                <div className="relative">
                  <select 
                    value={smSelectedCategory === undefined ? 'all' : smSelectedCategory}
                    onChange={(e) => {
                      const val = e.target.value
                      setSmSelectedCategory(val === 'all' ? undefined : Number(val))
                    }}
                    className="w-full appearance-none bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer transition-all"
                  >
                    <option value="all">Semua Jenis Surat</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 tracking-wider">Cari / keyword</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Cari nomor surat, pengirim, perihal..." 
                    value={smSearchQuery}
                    onChange={(e) => setSmSearchQuery(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg pl-10 pr-9 py-2 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                  {smSearchQuery && (
                    <button 
                      onClick={() => setSmSearchQuery('')}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider select-none">
                      <th className="py-4 px-4 w-48">No. Surat</th>
                      <th className="py-4 px-4 w-36">Tanggal Diterima</th>
                      <th className="py-4 px-4 w-52">Pengirim</th>
                      <th className="py-4 px-4">Perihal</th>
                      <th className="py-4 px-4 w-36">Jenis</th>
                      <th className="py-4 px-4 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                    {isSmLoading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-5/6" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-3/4" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-2/3" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-11/12" /></td>
                          <td className="py-4 px-4"><div className="h-6 bg-zinc-200 rounded-full w-24" /></td>
                          <td className="py-4 px-4"><div className="h-6 bg-zinc-200 rounded w-12 mx-auto" /></td>
                        </tr>
                      ))
                    ) : suratMasukList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-zinc-400 font-bold">
                          <Inbox className="h-10 w-10 mx-auto text-zinc-300 mb-2" />
                          Tidak ada surat masuk yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      suratMasukList
                        .slice((smCurrentPage - 1) * itemsPerPage, smCurrentPage * itemsPerPage)
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#1d56a5] truncate max-w-[180px]" title={item.nomorSurat}>
                              {item.nomorSurat}
                            </td>
                            <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                              {formatDateIndo(item.tanggalDiterima)}
                            </td>
                            <td className="py-3 px-4 font-bold truncate max-w-[200px]" title={item.pengirim}>
                              {item.pengirim}
                            </td>
                            <td className="py-3 px-4 text-zinc-600 font-semibold line-clamp-1 py-3" title={item.perihal}>
                              {item.perihal}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBadgeStyle(item.jenisSurat?.kode)}`}>
                                {item.jenisSurat?.nama}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {item.fileUrl && (
                                  <button 
                                    onClick={() => openFileViewer(item.fileUrl, item.nomorSurat)}
                                    className="p-1 text-zinc-400 hover:text-[#1d56a5] transition-colors cursor-pointer"
                                    title="Lihat Berkas"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleSmOpenEditModal(item)}
                                  className="p-1 text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => triggerDelete('masuk', item.id, item.nomorSurat)}
                                  className="p-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination */}
              <div className="bg-[#f8fafc] border-t border-zinc-200 px-6 py-4 flex items-center justify-between text-xs font-semibold text-zinc-500 select-none">
                <span>
                  Menampilkan {suratMasukList.length > 0 ? (smCurrentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(smCurrentPage * itemsPerPage, suratMasukList.length)} dari {suratMasukList.length} surat
                </span>
                {paginate(suratMasukList.length, smCurrentPage, setSmCurrentPage)}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB PANEL: SURAT KELUAR CRUD --- */}
        {activeTab === 'surat-keluar' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-800">Daftar Surat Keluar</h1>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">Kelola dan arsipkan seluruh surat keluar dengan mudah.</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSyncEmails}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 bg-white text-zinc-700 border border-zinc-200 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-zinc-50 active:scale-[0.98] transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4.5 w-4.5 text-zinc-500 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sinkronisasi...' : 'Sinkronisasi Email'}
                </button>
                <button 
                  onClick={handleSkOpenAddModal}
                  className="flex items-center justify-center gap-2 bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#1a4d94] active:scale-[0.98] transition-all shadow-md shadow-blue-800/10 cursor-pointer"
                >
                  <Plus className="h-4 w-4 stroke-[3px]" />
                  Tambah Surat Keluar
                </button>
              </div>
            </div>

            {/* Filters Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 tracking-wider">Tanggal Dikirim</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                    <input 
                      type="date"
                      value={skDateStart}
                      onChange={(e) => setSkDateStart(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg pl-10 pr-2.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <span className="text-zinc-400 text-xs font-bold">s/d</span>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                    <input 
                      type="date"
                      value={skDateEnd}
                      onChange={(e) => setSkDateEnd(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg pl-10 pr-2.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 tracking-wider">Jenis Surat</label>
                <div className="relative">
                  <select 
                    value={skSelectedCategory === undefined ? 'all' : skSelectedCategory}
                    onChange={(e) => {
                      const val = e.target.value
                      setSkSelectedCategory(val === 'all' ? undefined : Number(val))
                    }}
                    className="w-full appearance-none bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer transition-all"
                  >
                    <option value="all">Semua Jenis Surat</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.nama}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-zinc-500 tracking-wider">Cari / keyword</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Cari nomor surat, tujuan, perihal..." 
                    value={skSearchQuery}
                    onChange={(e) => setSkSearchQuery(e.target.value)}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg pl-10 pr-9 py-2 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                  {skSearchQuery && (
                    <button 
                      onClick={() => setSkSearchQuery('')}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider select-none">
                      <th className="py-4 px-4 w-48">No. Surat</th>
                      <th className="py-4 px-4 w-36">Tanggal Dikirim</th>
                      <th className="py-4 px-4 w-52">Tujuan</th>
                      <th className="py-4 px-4">Perihal</th>
                      <th className="py-4 px-4 w-36">Jenis</th>
                      <th className="py-4 px-4 w-24 text-center">Aksi</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                    {isSkLoading ? (
                      Array.from({ length: 4 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-5/6" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-3/4" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-2/3" /></td>
                          <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-11/12" /></td>
                          <td className="py-4 px-4"><div className="h-6 bg-zinc-200 rounded-full w-24" /></td>
                          <td className="py-4 px-4"><div className="h-6 bg-zinc-200 rounded w-12 mx-auto" /></td>
                        </tr>
                      ))
                    ) : suratKeluarList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-zinc-400 font-bold">
                          <Mail className="h-10 w-10 mx-auto text-zinc-300 mb-2" />
                          Tidak ada surat keluar yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      suratKeluarList
                        .slice((skCurrentPage - 1) * itemsPerPage, skCurrentPage * itemsPerPage)
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                            <td className="py-3 px-4 font-bold text-emerald-700 truncate max-w-[180px]" title={item.nomorSurat}>
                              {item.nomorSurat}
                            </td>
                            <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                              {formatDateIndo(item.tanggalDikirim)}
                            </td>
                            <td className="py-3 px-4 font-bold truncate max-w-[200px]" title={item.tujuan}>
                              {item.tujuan}
                            </td>
                            <td className="py-3 px-4 text-zinc-600 font-semibold line-clamp-1 py-3" title={item.perihal}>
                              {item.perihal}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${getBadgeStyle(item.jenisSurat?.kode)}`}>
                                {item.jenisSurat?.nama}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                {item.fileUrl && (
                                  <button 
                                    onClick={() => openFileViewer(item.fileUrl, item.nomorSurat)}
                                    className="p-1 text-zinc-400 hover:text-[#1d56a5] transition-colors cursor-pointer"
                                    title="Lihat Berkas"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleSkOpenEditModal(item)}
                                  className="p-1 text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => triggerDelete('keluar', item.id, item.nomorSurat)}
                                  className="p-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer / Pagination */}
              <div className="bg-[#f8fafc] border-t border-zinc-200 px-6 py-4 flex items-center justify-between text-xs font-semibold text-zinc-500 select-none">
                <span>
                  Menampilkan {suratKeluarList.length > 0 ? (skCurrentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(skCurrentPage * itemsPerPage, suratKeluarList.length)} dari {suratKeluarList.length} surat
                </span>
                {paginate(suratKeluarList.length, skCurrentPage, setSkCurrentPage)}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB PANEL: JENIS SURAT CRUD --- */}
        {activeTab === 'jenis-surat' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-800">Daftar Jenis Surat</h1>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">Kelola tipe persuratan resmi yang dipergunakan di BMKG.</p>
              </div>
              <button 
                onClick={handleJsOpenAddModal}
                className="flex items-center justify-center gap-2 bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-[#1a4d94] active:scale-[0.98] transition-all shadow-md shadow-blue-800/10 cursor-pointer"
              >
                <Plus className="h-4 w-4 stroke-[3px]" />
                Tambah Jenis Surat
              </button>
            </div>

            {/* Table Area */}
            <div className="flex-1 flex flex-col bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider select-none">
                      <th className="py-4 px-6 w-36">Kode</th>
                      <th className="py-4 px-6">Nama Jenis Surat</th>
                      <th className="py-4 px-6 w-44 text-center">Jumlah Surat Masuk</th>
                      <th className="py-4 px-6 w-44 text-center">Jumlah Surat Keluar</th>
                      <th className="py-4 px-6 w-28 text-center">Aksi</th>
                    </tr>
                  </thead>
                  
                  <tbody className="divide-y divide-zinc-100 text-xs font-semibold text-zinc-700">
                    {isJsLoading ? (
                      Array.from({ length: 3 }).map((_, idx) => (
                        <tr key={idx} className="animate-pulse">
                          <td className="py-4 px-6"><div className="h-4 bg-zinc-200 rounded w-16" /></td>
                          <td className="py-4 px-6"><div className="h-4 bg-zinc-200 rounded w-2/3" /></td>
                          <td className="py-4 px-6"><div className="h-4 bg-zinc-200 rounded w-10 mx-auto" /></td>
                          <td className="py-4 px-6"><div className="h-4 bg-zinc-200 rounded w-10 mx-auto" /></td>
                          <td className="py-4 px-6"><div className="h-6 bg-zinc-200 rounded w-12 mx-auto" /></td>
                        </tr>
                      ))
                    ) : jenisSuratList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-zinc-400 font-bold">
                          <FileText className="h-10 w-10 mx-auto text-zinc-300 mb-2" />
                          Tidak ada jenis surat yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      jenisSuratList.map((item) => (
                        <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="py-3.5 px-6">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border ${getBadgeStyle(item.kode)}`}>
                              {item.kode}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 font-bold text-zinc-800">
                            {item.nama}
                          </td>
                          <td className="py-3.5 px-6 text-center text-zinc-500 font-bold">
                            {item._count?.suratMasuk || 0}
                          </td>
                          <td className="py-3.5 px-6 text-center text-zinc-500 font-bold">
                            {item._count?.suratKeluar || 0}
                          </td>
                          <td className="py-3.5 px-6 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleJsOpenEditModal(item)}
                                className="p-1 text-zinc-400 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit className="h-4.5 w-4.5" />
                              </button>
                              <button 
                                onClick={() => triggerDelete('jenis', item.id, item.nama)}
                                className="p-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Hapus"
                              >
                                <Trash2 className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB PANEL: LAPORAN ANALYTICS PANEL --- */}
        {activeTab === 'laporan' && (
          <div className="flex-1 flex flex-col overflow-auto p-6 md:p-8 bg-[#f8fafc] print:bg-white print:p-0">
            
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 print:hidden">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-800">Laporan Statistik Persuratan</h1>
                <p className="text-sm font-semibold text-zinc-500 mt-0.5">Pantau jumlah volume surat masuk dan keluar terintegrasi secara grafik.</p>
              </div>
              <div className="flex items-center gap-3">
                {/* Year filter selector */}
                <div className="relative">
                  <select 
                    value={laporanYear}
                    onChange={(e) => setLaporanYear(Number(e.target.value))}
                    className="appearance-none bg-white border border-zinc-200 rounded-lg px-4 py-2.5 text-xs font-bold text-zinc-700 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
                  >
                    <option value={2026}>Tahun 2026</option>
                    <option value={2025}>Tahun 2025</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-zinc-400 pointer-events-none" />
                </div>
                
                {/* Print button */}
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-[0.98] transition-all shadow-md shadow-blue-800/10 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Laporan
                </button>
              </div>
            </div>

            {/* Print Header (Visible only when printing) */}
            <div className="hidden print:flex flex-col items-center text-center gap-3 border-b-2 border-zinc-800 pb-5 mb-8">
              <div className="relative h-16 w-16">
                <Image src="/logo-bmkg.png" alt="Logo BMKG" fill className="object-contain" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-zinc-800">Badan Meteorologi Klimatologi dan Geofisika</h2>
                <h3 className="text-base font-bold uppercase tracking-wider text-zinc-600">Laporan Volume Persuratan Tahunan ({laporanYear})</h3>
                <span className="text-xs text-zinc-400 font-semibold">Dokumen Resmi E-Persuratan BMKG Kelas I</span>
              </div>
            </div>

            {isLaporanLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1d56a5]" /></div>
            ) : (
              <div className="flex flex-col gap-6">
                
                {/* Laporan Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Volume Surat Masuk Setahun</span>
                      <h2 className="mt-2 text-3xl font-extrabold text-blue-600">{laporanStats?.totalMasukYear} Surat</h2>
                    </div>
                    <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-500">
                      <span>Rata-rata per bulan</span>
                      <span className="font-bold">{(laporanStats?.totalMasukYear ? (laporanStats.totalMasukYear / 12).toFixed(1) : 0)} Surat</span>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Volume Surat Keluar Setahun</span>
                      <h2 className="mt-2 text-3xl font-extrabold text-emerald-600">{laporanStats?.totalKeluarYear} Surat</h2>
                    </div>
                    <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs font-semibold text-zinc-500">
                      <span>Rata-rata per bulan</span>
                      <span className="font-bold">{(laporanStats?.totalKeluarYear ? (laporanStats.totalKeluarYear / 12).toFixed(1) : 0)} Surat</span>
                    </div>
                  </div>
                </div>

                {/* SVG Visual Graphic Chart */}
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col items-center">
                  <h3 className="font-extrabold text-sm text-zinc-700 tracking-wide mb-6 self-start">Grafik Volume Bulanan Surat Masuk vs Surat Keluar ({laporanYear})</h3>
                  
                  {/* Visual SVG Chart */}
                  <div className="w-full max-w-[800px] h-[300px]">
                    <svg viewBox="0 0 800 300" className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      <line x1="50" y1="50" x2="750" y2="50" stroke="#f1f5f9" strokeWidth="1.5" />
                      <line x1="50" y1="110" x2="750" y2="110" stroke="#f1f5f9" strokeWidth="1.5" />
                      <line x1="50" y1="170" x2="750" y2="170" stroke="#f1f5f9" strokeWidth="1.5" />
                      <line x1="50" y1="230" x2="750" y2="230" stroke="#cbd5e1" strokeWidth="1.5" />

                      {/* Y-Axis Labels (Assume max count in seeds/mock is around 10) */}
                      <text x="35" y="54" className="text-[10px] font-bold fill-zinc-400 text-right">10</text>
                      <text x="35" y="114" className="text-[10px] font-bold fill-zinc-400 text-right">6</text>
                      <text x="35" y="174" className="text-[10px] font-bold fill-zinc-400 text-right">3</text>
                      <text x="35" y="234" className="text-[10px] font-bold fill-zinc-400 text-right">0</text>

                      {/* Months loop & drawing bars */}
                      {laporanStats?.monthlyStats.map((item, index) => {
                        const x = 50 + index * 58 + 15
                        
                        // Height scaling (0 count = 230 y-coordinate, 10 count = 50 y-coordinate)
                        const scaleHeight = (count: number) => {
                          const maxVal = 10
                          const calculated = 230 - (count / maxVal) * 180
                          return Math.max(Math.min(calculated, 230), 50)
                        }

                        const masukY = scaleHeight(item.masuk)
                        const keluarY = scaleHeight(item.keluar)

                        return (
                          <g key={index} className="group">
                            {/* Surat Masuk Bar (Blue) */}
                            <rect 
                              x={x} 
                              y={masukY} 
                              width="18" 
                              height={230 - masukY} 
                              rx="3" 
                              fill="#3b82f6" 
                              className="transition-all duration-300 hover:fill-blue-700" 
                            />
                            {/* Hover tooltip values for Masuk */}
                            {item.masuk > 0 && (
                              <text x={x + 9} y={masukY - 5} className="text-[9px] font-extrabold fill-blue-700 text-center" textAnchor="middle">
                                {item.masuk}
                              </text>
                            )}

                            {/* Surat Keluar Bar (Emerald) */}
                            <rect 
                              x={x + 22} 
                              y={keluarY} 
                              width="18" 
                              height={230 - keluarY} 
                              rx="3" 
                              fill="#10b981" 
                              className="transition-all duration-300 hover:fill-emerald-600" 
                            />
                            {/* Hover tooltip values for Keluar */}
                            {item.keluar > 0 && (
                              <text x={x + 31} y={keluarY - 5} className="text-[9px] font-extrabold fill-emerald-600 text-center" textAnchor="middle">
                                {item.keluar}
                              </text>
                            )}

                            {/* Month Label */}
                            <text x={x + 20} y="250" className="text-[10px] font-bold fill-zinc-500" textAnchor="middle">
                              {item.bulanName}
                            </text>
                          </g>
                        )
                      })}
                    </svg>
                  </div>

                  {/* Legends */}
                  <div className="flex items-center gap-6 mt-6 select-none text-xs font-bold">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-[#3b82f6] rounded-md" />
                      <span className="text-zinc-600">Surat Masuk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 bg-[#10b981] rounded-md" />
                      <span className="text-zinc-600">Surat Keluar</span>
                    </div>
                  </div>

                </div>

                {/* Table Breakdown of Laporan */}
                <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                  <h3 className="font-extrabold text-sm text-zinc-700 tracking-wide mb-4">Rincian Volume Persuratan Bulanan</h3>
                  <table className="w-full border-collapse text-left text-xs font-medium text-zinc-700">
                    <thead>
                      <tr className="bg-[#f8fafc] border-b border-zinc-200 text-zinc-500 font-bold uppercase select-none">
                        <th className="py-3 px-4">Bulan</th>
                        <th className="py-3 px-4 text-center">Surat Masuk</th>
                        <th className="py-3 px-4 text-center">Surat Keluar</th>
                        <th className="py-3 px-4 text-center">Total Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {laporanStats?.monthlyStats.map((item, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50/50">
                          <td className="py-2.5 px-4 font-bold text-zinc-800">{item.bulanName}</td>
                          <td className="py-2.5 px-4 text-center text-blue-600 font-bold">{item.masuk}</td>
                          <td className="py-2.5 px-4 text-center text-emerald-600 font-bold">{item.keluar}</td>
                          <td className="py-2.5 px-4 text-center font-extrabold text-zinc-700 bg-zinc-50/40">{item.masuk + item.keluar}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        )}



      </main>

      {/* --- MODAL: CRUD SURAT MASUK (ADD/EDIT) --- */}
      {isSmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden animate-zoom-in">
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#f8fafc] border-b border-zinc-200">
              <h3 className="text-base font-extrabold text-zinc-800">
                {smEditingId ? 'Edit Surat Masuk' : 'Tambah Surat Masuk'}
              </h3>
              <button 
                onClick={() => setIsSmModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSmSubmit}>
              <div className="p-6 flex flex-col gap-4.5">
                {modalError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                    {modalError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Nomor Surat</label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: 008/ME.01/VII/2026"
                    value={smFormData.nomorSurat}
                    onChange={(e) => setSmFormData({ ...smFormData, nomorSurat: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Tanggal Diterima</label>
                  <input 
                    type="date"
                    required
                    value={smFormData.tanggalDiterima}
                    onChange={(e) => setSmFormData({ ...smFormData, tanggalDiterima: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Pengirim</label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: Pusat Meteorologi BMKG"
                    value={smFormData.pengirim}
                    onChange={(e) => setSmFormData({ ...smFormData, pengirim: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Perihal</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="Isi perihal atau deskripsi surat..."
                    value={smFormData.perihal}
                    onChange={(e) => setSmFormData({ ...smFormData, perihal: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Jenis Surat</label>
                  <div className="relative">
                    <select 
                      required
                      value={smFormData.jenisSuratId}
                      onChange={(e) => setSmFormData({ ...smFormData, jenisSuratId: e.target.value })}
                      className="w-full appearance-none bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer transition-all"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.nama}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4.5">
                  <span className="text-xs font-bold text-zinc-500">Isi Surat / Berkas</span>
                  
                  {/* Mode Selector Tab */}
                  <div className="flex bg-zinc-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSmContentMode('upload')}
                      className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        smContentMode === 'upload'
                          ? 'bg-white text-zinc-800 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      Unggah Berkas (PDF/Gambar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmContentMode('write')}
                      className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        smContentMode === 'write'
                          ? 'bg-white text-zinc-800 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      Tulis Isi Surat
                    </button>
                  </div>

                  {/* Mode Content */}
                  {smContentMode === 'upload' ? (
                    <div className="flex flex-col gap-2">
                      {smFormData.fileUrl && !smFormData.fileUrl.startsWith('data:text/html') && !smFormData.fileUrl.startsWith('data:text/plain') ? (
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2 text-zinc-700 truncate">
                            <FileText className="h-5 w-5 text-[#1d56a5] flex-shrink-0" />
                            <span className="truncate">
                              {smFormData.fileUrl.startsWith('data:application/pdf') 
                                ? 'Berkas PDF Terlampir' 
                                : smFormData.fileUrl.startsWith('data:image/')
                                ? 'Berkas Gambar Terlampir'
                                : 'Berkas Terlampir'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSmFormData({ ...smFormData, fileUrl: '' })}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-white rounded-md transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-zinc-200 hover:border-[#1d56a5] transition-colors rounded-xl p-4.5 text-center flex flex-col items-center justify-center bg-[#f8fafc]">
                          <input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/jpg"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              
                              if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                                alert('Format berkas tidak didukung. Harap unggah PDF atau Gambar (PNG/JPG).')
                                e.target.value = ''
                                return
                              }
                              
                              if (file.size > 5 * 1024 * 1024) {
                                alert('Ukuran berkas terlalu besar. Maksimal 5MB.')
                                e.target.value = ''
                                return
                              }

                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setSmFormData(prev => ({ ...prev, fileUrl: reader.result as string }))
                              }
                              reader.readAsDataURL(file)
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="h-7 w-7 text-zinc-400 mb-1.5" />
                          <span className="text-[11px] font-bold text-zinc-600">Klik atau seret file PDF / Gambar</span>
                          <span className="text-[9px] text-zinc-400 mt-0.5">Maksimal ukuran berkas 5MB</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <textarea
                        rows={5}
                        placeholder="Ketik isi atau pesan surat masuk di sini..."
                        value={getRawTextFromFileUrl(smFormData.fileUrl)}
                        onChange={(e) => {
                          const text = e.target.value
                          if (!text) {
                            setSmFormData(prev => ({ ...prev, fileUrl: '' }))
                          } else {
                            const html = `<html><body style="font-family: sans-serif; line-height: 1.6; padding: 20px; color: #27272a; white-space: pre-wrap;">${text}</body></html>`
                            const base64 = Buffer.from(html).toString('base64')
                            setSmFormData(prev => ({ ...prev, fileUrl: `data:text/html;charset=utf-8;base64,${base64}` }))
                          }
                        }}
                        className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#f8fafc] px-6 py-4.5 border-t border-zinc-200 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsSmModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 bg-[#1d56a5] text-white px-4.5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer shadow-md shadow-blue-800/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CRUD SURAT KELUAR (ADD/EDIT) --- */}
      {isSkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-lg overflow-hidden animate-zoom-in">
            <div className="flex items-center justify-between px-6 py-4.5 bg-[#f8fafc] border-b border-zinc-200">
              <h3 className="text-base font-extrabold text-zinc-800">
                {skEditingId ? 'Edit Surat Keluar' : 'Tambah Surat Keluar'}
              </h3>
              <button 
                onClick={() => setIsSkModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSkSubmit}>
              <div className="p-6 flex flex-col gap-4.5">
                {modalError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                    {modalError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Nomor Surat</label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: 008/OUT/VII/2026"
                    value={skFormData.nomorSurat}
                    onChange={(e) => setSkFormData({ ...skFormData, nomorSurat: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Tanggal Dikirim</label>
                  <input 
                    type="date"
                    required
                    value={skFormData.tanggalDikirim}
                    onChange={(e) => setSkFormData({ ...skFormData, tanggalDikirim: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Tujuan</label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: Balai Besar Wilayah II BMKG"
                    value={skFormData.tujuan}
                    onChange={(e) => setSkFormData({ ...skFormData, tujuan: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Perihal</label>
                  <textarea 
                    required
                    rows={2}
                    placeholder="Isi perihal atau deskripsi surat..."
                    value={skFormData.perihal}
                    onChange={(e) => setSkFormData({ ...skFormData, perihal: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Jenis Surat</label>
                  <div className="relative">
                    <select 
                      required
                      value={skFormData.jenisSuratId}
                      onChange={(e) => setSkFormData({ ...skFormData, jenisSuratId: e.target.value })}
                      className="w-full appearance-none bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 cursor-pointer transition-all"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.nama}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-3 h-4.5 w-4.5 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t border-zinc-100 pt-4.5">
                  <span className="text-xs font-bold text-zinc-500">Isi Surat / Berkas</span>
                  
                  {/* Mode Selector Tab */}
                  <div className="flex bg-zinc-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSkContentMode('upload')}
                      className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        skContentMode === 'upload'
                          ? 'bg-white text-zinc-800 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      Unggah Berkas (PDF/Gambar)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSkContentMode('write')}
                      className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        skContentMode === 'write'
                          ? 'bg-white text-zinc-800 shadow-sm'
                          : 'text-zinc-400 hover:text-zinc-600'
                      }`}
                    >
                      Tulis Isi Surat
                    </button>
                  </div>

                  {/* Mode Content */}
                  {skContentMode === 'upload' ? (
                    <div className="flex flex-col gap-2">
                      {skFormData.fileUrl && !skFormData.fileUrl.startsWith('data:text/html') && !skFormData.fileUrl.startsWith('data:text/plain') ? (
                        <div className="p-3 bg-[#e6f4ea] border border-[#c3ebb8] rounded-lg flex items-center justify-between text-xs font-semibold">
                          <div className="flex items-center gap-2 text-zinc-700 truncate">
                            <FileText className="h-5 w-5 text-emerald-700 flex-shrink-0" />
                            <span className="truncate">
                              {skFormData.fileUrl.startsWith('data:application/pdf') 
                                ? 'Berkas PDF Terlampir' 
                                : skFormData.fileUrl.startsWith('data:image/')
                                ? 'Berkas Gambar Terlampir'
                                : 'Berkas Terlampir'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSkFormData({ ...skFormData, fileUrl: '' })}
                            className="p-1 text-zinc-400 hover:text-red-600 hover:bg-white rounded-md transition-all cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-zinc-200 hover:border-emerald-700 transition-colors rounded-xl p-4.5 text-center flex flex-col items-center justify-center bg-[#f8fafc]">
                          <input
                            type="file"
                            accept="application/pdf,image/png,image/jpeg,image/jpg"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              
                              if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                                alert('Format berkas tidak didukung. Harap unggah PDF atau Gambar (PNG/JPG).')
                                e.target.value = ''
                                return
                              }
                              
                              if (file.size > 5 * 1024 * 1024) {
                                alert('Ukuran berkas terlalu besar. Maksimal 5MB.')
                                e.target.value = ''
                                return
                              }

                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setSkFormData(prev => ({ ...prev, fileUrl: reader.result as string }))
                              }
                              reader.readAsDataURL(file)
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <Upload className="h-7 w-7 text-zinc-400 mb-1.5" />
                          <span className="text-[11px] font-bold text-zinc-600">Klik atau seret file PDF / Gambar</span>
                          <span className="text-[9px] text-zinc-400 mt-0.5">Maksimal ukuran berkas 5MB</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <textarea
                        rows={5}
                        placeholder="Ketik isi atau pesan surat keluar di sini..."
                        value={getRawTextFromFileUrl(skFormData.fileUrl)}
                        onChange={(e) => {
                          const text = e.target.value
                          if (!text) {
                            setSkFormData(prev => ({ ...prev, fileUrl: '' }))
                          } else {
                            const html = `<html><body style="font-family: sans-serif; line-height: 1.6; padding: 20px; color: #27272a; white-space: pre-wrap;">${text}</body></html>`
                            const base64 = Buffer.from(html).toString('base64')
                            setSkFormData(prev => ({ ...prev, fileUrl: `data:text/html;charset=utf-8;base64,${base64}` }))
                          }
                        }}
                        className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-[#f8fafc] px-6 py-4.5 border-t border-zinc-200 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsSkModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 bg-[#1d56a5] text-white px-4.5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer shadow-md shadow-blue-800/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CRUD JENIS SURAT (ADD/EDIT) --- */}
      {isJsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-sm overflow-hidden animate-zoom-in">
            <div className="flex items-center justify-between px-6 py-4 bg-[#f8fafc] border-b border-zinc-200">
              <h3 className="text-sm font-extrabold text-zinc-800">
                {jsEditingId ? 'Edit Jenis Surat' : 'Tambah Jenis Surat'}
              </h3>
              <button 
                onClick={() => setIsJsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleJsSubmit}>
              <div className="p-5 flex flex-col gap-4">
                {modalError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-lg">
                    {modalError}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Kode Kategori</label>
                  <input 
                    type="text"
                    required
                    maxLength={5}
                    placeholder="Contoh: UND"
                    value={jsFormData.kode}
                    onChange={(e) => setJsFormData({ ...jsFormData, kode: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-zinc-500">Nama Jenis Surat</label>
                  <input 
                    type="text"
                    required
                    placeholder="Contoh: Surat Undangan Resmi"
                    value={jsFormData.nama}
                    onChange={(e) => setJsFormData({ ...jsFormData, nama: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              <div className="bg-[#f8fafc] px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setIsJsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 bg-[#1d56a5] text-white px-4.5 py-2 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer shadow-md shadow-blue-800/10"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    'Simpan'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* --- CONFIRM DELETE DIALOG --- */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-sm overflow-hidden animate-zoom-in">
            <div className="p-5 flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-red-50 text-red-500 rounded-full border border-red-100">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-800">Konfirmasi Hapus Data</h3>
                <p className="mt-1 text-xs font-semibold text-zinc-500 px-3">
                  Apakah Anda yakin ingin menghapus data <strong className="text-zinc-800">"{deleteConfirm.name}"</strong>? Aksi ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-5 py-4 border-t border-zinc-200 flex items-center justify-center gap-3 select-none">
              <button
                type="button"
                onClick={() => setDeleteConfirm({ isOpen: false, type: 'masuk', id: 0, name: '' })}
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 bg-red-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-red-700 active:scale-95 transition-all cursor-pointer shadow-md shadow-red-800/10"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM LOGOUT DIALOG --- */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-sm overflow-hidden animate-zoom-in">
            <div className="p-5 flex flex-col items-center gap-4 text-center">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-full border border-amber-100">
                <LogOut className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-zinc-800">Yakin Ingin Keluar?</h3>
                <p className="mt-1 text-xs font-semibold text-zinc-500 px-3">
                  Anda akan keluar dari sesi ini dan kembali ke halaman login E-Persuratan BMKG.
                </p>
              </div>
            </div>

            <div className="bg-[#f8fafc] px-5 py-4 border-t border-zinc-200 flex items-center justify-center gap-3 select-none">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 active:scale-95 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeLogout}
                className="flex-1 bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 transition-all cursor-pointer shadow-md shadow-blue-800/10"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FILE VIEWER DIALOG --- */}
      {viewerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-white text-zinc-800 rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-4xl h-[85vh] overflow-hidden flex flex-col animate-zoom-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-[#f8fafc]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-[#1d56a5] rounded-lg border border-blue-100">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-extrabold text-zinc-800">Pratinjau Dokumen Surat</h3>
                  <p className="text-[10px] font-semibold text-zinc-500 truncate max-w-[400px]">
                    No. Surat: {viewerTitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Download button */}
                <a
                  href={viewerFileUrl}
                  download={`surat_${viewerTitle.replace(/[\/\\:\*\?"<>\|]/g, '_')}`}
                  className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-[#1d56a5] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3 bg-white"
                >
                  <Download className="h-4 w-4" />
                  Unduh
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setViewerOpen(false)
                    setViewerFileUrl('')
                  }}
                  className="p-1.5 rounded-lg border border-zinc-100 hover:bg-zinc-100 text-zinc-400 hover:text-[#1d56a5] transition-all cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer Content */}
            <div className="flex-1 bg-zinc-100 p-4 overflow-auto flex items-center justify-center min-h-0">
              {viewerFileUrl.startsWith('data:application/pdf') ? (
                <object
                  data={viewerFileUrl}
                  type="application/pdf"
                  className="w-full h-full rounded-lg shadow-sm border border-zinc-200"
                >
                  <div className="text-center p-6 bg-white rounded-xl border border-zinc-200 shadow-xs max-w-md">
                    <p className="text-sm font-bold text-zinc-700 mb-4">Browser Anda tidak mendukung peninjauan PDF secara langsung.</p>
                    <a
                      href={viewerFileUrl}
                      download={`surat_${viewerTitle.replace(/[\/\\:\*\?"<>\|]/g, '_')}`}
                      className="inline-flex items-center gap-2 bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 transition-all shadow-md shadow-blue-800/10"
                    >
                      <Download className="h-4.5 w-4.5" />
                      Unduh Berkas PDF
                    </a>
                  </div>
                </object>
              ) : viewerFileUrl.startsWith('data:image/') ? (
                <img
                  src={viewerFileUrl}
                  alt={`Dokumen ${viewerTitle}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-md"
                />
              ) : (viewerFileUrl.startsWith('data:text/html') || viewerFileUrl.startsWith('data:text/plain')) ? (
                <iframe
                  src={viewerFileUrl}
                  title={`Isi Surat ${viewerTitle}`}
                  className="w-full h-full rounded-lg shadow-sm border border-zinc-200 bg-white"
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="text-center p-8 bg-white rounded-xl border border-zinc-200 shadow-sm max-w-md">
                  <FileText className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
                  <p className="text-sm font-bold text-zinc-700 mb-2">Pratinjau tidak tersedia untuk format berkas ini.</p>
                  <p className="text-xs text-zinc-500 mb-4">Format berkas atau dokumen ini harus diunduh untuk dapat dibuka di komputer Anda.</p>
                  <a
                    href={viewerFileUrl}
                    download={`surat_${viewerTitle.replace(/[\/\\:\*\?"<>\|]/g, '_')}`}
                    className="inline-flex items-center gap-2 bg-[#1d56a5] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 transition-all shadow-md shadow-blue-800/10"
                  >
                    <Download className="h-4.5 w-4.5" />
                    Unduh Berkas
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
