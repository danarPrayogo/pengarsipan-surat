'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff, Shield, Key, X, Check, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { loginUser, sendVerificationCode, resetCredentials } from '@/app/actions/Auth'

export default function Login() {
  const router = useRouter()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Success message state
  const [successMessage, setSuccessMessage] = useState('')

  // Reset Modal states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request')
  const [resetEmail, setResetEmail] = useState('')
  const [resetSecurityCode, setResetSecurityCode] = useState('')
  const [resetUsername, setResetUsername] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [mockedCodeInfo, setMockedCodeInfo] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      const res = await loginUser(emailOrUsername.trim(), password)
      if (res.success) {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Kredensial salah atau terjadi kesalahan.')
      setLoading(false)
    }
  }

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)
    setMockedCodeInfo('')

    try {
      const res = await sendVerificationCode(resetEmail.trim())
      if (res.success) {
        setResetStep('verify')
        if (res.isMocked && res.code) {
          setMockedCodeInfo(res.code)
        }
      }
    } catch (err: any) {
      setResetError(err.message || 'Gagal mengirim kode verifikasi.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)

    if (resetUsername.trim().length < 3) {
      setResetError('Username baru minimal harus 3 karakter')
      setResetLoading(false)
      return
    }

    if (resetPassword.trim().length < 6) {
      setResetError('Password baru minimal harus 6 karakter')
      setResetLoading(false)
      return
    }

    if (resetPassword !== resetConfirmPassword) {
      setResetError('Password baru dan Konfirmasi Password tidak cocok')
      setResetLoading(false)
      return
    }

    try {
      const res = await resetCredentials(
        resetEmail.trim(),
        resetSecurityCode.trim(),
        resetUsername.trim(),
        resetPassword
      )
      if (res.success) {
        setSuccessMessage('Username dan Password berhasil diperbarui! Silakan login dengan kredensial baru.')
        setIsResetModalOpen(false)
        
        // Reset states
        setResetEmail('')
        setResetSecurityCode('')
        setResetUsername('')
        setResetPassword('')
        setResetConfirmPassword('')
        setResetStep('request')
        setMockedCodeInfo('')
      }
    } catch (err: any) {
      setResetError(err.message || 'Gagal mereset kredensial.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4 md:p-8">
      {/* Login Card Wrapper */}
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 hover:shadow-blue-900/10 md:flex-row flex-col min-h-[550px]">
        
        {/* Left Side: Brand and Illustration (White background) */}
        <div className="flex flex-1 flex-col items-center justify-between p-8 md:p-12 text-center bg-white">
          
          {/* Logo & Identity */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-16 w-16 md:h-20 md:w-20 transition-transform duration-500 hover:rotate-6">
              <Image
                src="/logo-bmkg.png"
                alt="Logo BMKG"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-wider text-[#1e53a4] font-sans">BMKG</span>
          </div>

          {/* Premium Dynamic SVG Mail Illustration */}
          <div className="my-4 w-full flex justify-center items-center">
            <svg viewBox="0 0 400 300" className="w-full max-w-[300px] drop-shadow-md overflow-visible">
              <defs>
                {/* Arrowhead Marker */}
                <marker 
                  id="arrow" 
                  viewBox="0 0 10 10" 
                  refX="6" 
                  refY="5" 
                  markerWidth="5" 
                  markerHeight="5" 
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 7 5 L 0 8.5 z" fill="#3b82f6" />
                </marker>
                
                {/* Envelope Shadow */}
                <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                </filter>
              </defs>

              {/* Cloud in Background (Floating softly) */}
              <g className="animate-float-slow">
                <path 
                  d="M 120 170 A 30 30 0 0 1 150 110 A 50 50 0 0 1 250 110 A 30 30 0 0 1 280 170 Z" 
                  fill="#e0f2fe" 
                  opacity="0.6"
                />
                <path 
                  d="M 100 190 A 25 25 0 0 1 125 140 A 40 40 0 0 1 205 140 A 25 25 0 0 1 230 190 Z" 
                  fill="#f1f5f9" 
                  opacity="0.9"
                />
              </g>
              
              {/* Dashed Connecting Lines / Arrow Paths */}
              {/* Left Path */}
              <path 
                d="M 85 140 Q 115 150, 145 168" 
                stroke="#60a5fa" 
                strokeWidth="2" 
                strokeDasharray="5 5" 
                fill="none" 
                markerEnd="url(#arrow)"
                opacity="0.8"
              />
              
              {/* Right Path */}
              <path 
                d="M 315 130 Q 280 145, 245 165" 
                stroke="#60a5fa" 
                strokeWidth="2" 
                strokeDasharray="5 5" 
                fill="none" 
                markerEnd="url(#arrow)"
                opacity="0.8"
              />

              {/* 1. Left Flying Envelope (Animated Float Slow) */}
              <g transform="translate(35, 115) rotate(-12)" className="animate-float-slow" filter="url(#shadow)">
                <rect x="0" y="0" width="55" height="35" rx="4" fill="#3b82f6" />
                {/* Envelope lines */}
                <path d="M 0 0 L 27.5 18 L 55 0" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                <path d="M 0 35 L 20 20" stroke="#1d4ed8" strokeWidth="1.5" />
                <path d="M 55 35 L 35 20" stroke="#1d4ed8" strokeWidth="1.5" />
              </g>

              {/* 2. Right Flying Envelope (Animated Float Delayed) */}
              <g transform="translate(310, 105) rotate(12)" className="animate-float-delayed" filter="url(#shadow)">
                <rect x="0" y="0" width="55" height="35" rx="4" fill="#3b82f6" />
                {/* Envelope lines */}
                <path d="M 0 0 L 27.5 18 L 55 0" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
                <path d="M 0 35 L 20 20" stroke="#1d4ed8" strokeWidth="1.5" />
                <path d="M 55 35 L 35 20" stroke="#1d4ed8" strokeWidth="1.5" />
              </g>

              {/* 4. Central Main Open Envelope */}
              <g transform="translate(142, 160)">
                {/* Back flap and body backdrop */}
                <rect x="0" y="20" width="110" height="70" rx="8" fill="#1e40af" filter="url(#shadow)" />
                <path d="M 0 20 L 55 -15 L 110 20" fill="#1d4ed8" />
                
                {/* Documents flying out from the pocket (Animated Float Fast) */}
                <g className="animate-float-fast">
                  {/* Back Paper */}
                  <rect x="25" y="-20" width="60" height="45" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                  <line x1="33" y1="-10" x2="77" y2="-10" stroke="#e2e8f0" strokeWidth="2" />
                  <line x1="33" y1="-2" x2="65" y2="-2" stroke="#e2e8f0" strokeWidth="2" />
                  
                  {/* Front Main Paper */}
                  <rect x="15" y="-10" width="80" height="50" rx="4" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" filter="url(#shadow)" />
                  <line x1="25" y1="2" x2="85" y2="2" stroke="#cbd5e1" strokeWidth="2" />
                  <line x1="25" y1="10" x2="75" y2="10" stroke="#94a3b8" strokeWidth="2" />
                  <line x1="25" y1="18" x2="65" y2="18" stroke="#cbd5e1" strokeWidth="2" />
                  <line x1="25" y1="26" x2="50" y2="26" stroke="#cbd5e1" strokeWidth="2" />
                </g>
                
                {/* Envelope Front Flaps (covering papers partially) */}
                <path d="M 0 90 L 55 50 L 110 90" fill="#3b82f6" opacity="0.9" />
                <path d="M 0 20 L 50 55 L 0 90" fill="#2563eb" opacity="0.95" />
                <path d="M 110 20 L 60 55 L 110 90" fill="#2563eb" opacity="0.95" />
              </g>
            </svg>
          </div>

          {/* System Title */}
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-800">
              E-Persuratan BMKG
            </h1>
            <p className="mt-2 text-sm text-zinc-500 font-medium">
              Sistem Arsip Persuratan BMKG Terpadu
            </p>
          </div>

        </div>

        {/* Right Side: Login Form (Royal Blue background) */}
        <div className="flex flex-1 flex-col justify-center p-8 md:p-12 bg-[#1d56a5] text-white">
          <div className="w-full max-w-md mx-auto">
            
            <h2 className="text-2xl font-bold text-white tracking-wide">
              Masuk ke Akun Anda
            </h2>
            <p className="mt-1 text-sm text-blue-100/80">
              Gunakan akun terdaftar Anda untuk mengelola surat masuk & keluar.
            </p>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-100 animate-shake">
                {error}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm text-emerald-100 animate-fade-in flex items-center gap-2">
                <Check className="h-5 w-5 text-emerald-400 flex-shrink-0" strokeWidth={3} />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {/* Username Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide text-blue-100">
                  Email atau Username
                </label>
                <div className="flex items-center bg-white rounded-lg border border-blue-300/20 px-3 py-2.5 text-zinc-800 focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-offset-2 transition-all">
                  <Mail className="h-5 w-5 text-zinc-400 mr-2.5 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Email atau Username"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm placeholder-zinc-400 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-wide text-blue-100">
                  Password
                </label>
                <div className="flex items-center bg-white rounded-lg border border-blue-300/20 px-3 py-2.5 text-zinc-800 focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-offset-2 transition-all">
                  <Lock className="h-5 w-5 text-zinc-400 mr-2.5 flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm placeholder-zinc-400 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Checkbox and Forgot Password */}
              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-blue-300 bg-transparent text-blue-600 focus:ring-blue-400 focus:ring-offset-[#1d56a5]"
                  />
                  <span className="text-xs font-medium text-blue-100">Tetap Masuk</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetError('')
                    setIsResetModalOpen(true)
                    setResetStep('request')
                  }}
                  className="text-xs font-semibold text-blue-100 underline hover:text-white hover:cursor-pointer transition-colors bg-transparent border-none outline-none"
                >
                  Lupa Username / Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-bold text-[#1d56a5] shadow-lg shadow-black/10 hover:bg-zinc-50 active:scale-[0.98] disabled:opacity-75 disabled:pointer-events-none transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1d56a5] border-t-transparent" />
                ) : (
                  'Masuk'
                )}
              </button>

              {/* Admin contact info */}
              <div className="mt-8 text-center text-xs text-blue-100/70">
                Belum punya akun?{' '}
                <a href="#" className="font-semibold text-white hover:underline transition-all">
                  Hubungi Admin
                </a>
              </div>
            </form>

          </div>
        </div>

      </div>

      {/* --- RESET CREDENTIALS DIALOG --- */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white text-zinc-800 rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-md overflow-hidden animate-zoom-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-[#f8fafc]">
              <div className="flex items-center gap-2.5">
                {resetStep === 'verify' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep('request')
                      setResetError('')
                    }}
                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-zinc-700 transition-all cursor-pointer mr-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="p-2 bg-blue-50 text-[#1d56a5] rounded-lg border border-blue-100">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-800">Reset Kredensial</h3>
                  <p className="text-[10px] font-semibold text-zinc-500">
                    {resetStep === 'request' ? 'Kirim kode verifikasi ke email' : 'Verifikasi kode & ubah akun'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 rounded-lg border border-zinc-100 hover:bg-zinc-100 text-zinc-400 hover:text-[#1d56a5] transition-all cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Form Step 1: Request Code */}
            {resetStep === 'request' && (
              <form onSubmit={handleRequestCode}>
                <div className="p-6 flex flex-col gap-4">
                  {/* Info alert */}
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-[#1e53a4] flex items-start gap-2.5">
                    <Mail className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      Masukkan email Administrator yang terdaftar. Sistem akan mengirimkan kode verifikasi 6 digit ke email Anda.
                      <span className="block mt-1 font-bold text-[#1d56a5]">*Email default: danarprayoogo@gmail.com</span>
                    </div>
                  </div>

                  {/* Error Alert */}
                  {resetError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                      {resetError}
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">
                      Email Terdaftar
                    </label>
                    <input
                      type="email"
                      placeholder="Masukkan email Anda (misal: danarprayoogo@gmail.com)"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-[#f8fafc] px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex items-center justify-center gap-1.5 bg-[#1d56a5] text-white px-4.5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 disabled:opacity-70 disabled:pointer-events-none transition-all cursor-pointer shadow-md shadow-blue-800/10"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      'Kirim Kode Verifikasi'
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Modal Form Step 2: Verify and Reset */}
            {resetStep === 'verify' && (
              <form onSubmit={handleResetSubmit}>
                <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                  
                  {/* Verification Notice */}
                  <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-800 flex items-start gap-2.5">
                    <Shield className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      Kode verifikasi 6 digit telah dikirim ke <strong>{resetEmail}</strong>. Silakan periksa kotak masuk atau spam email Anda.
                    </div>
                  </div>

                  {/* Mock code tip when SMTP isn't set */}
                  {mockedCodeInfo && (
                    <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs font-semibold text-amber-800 flex items-start gap-2.5">
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Simulasi Pengiriman:</strong> SMTP email tidak terdeteksi di server. Gunakan kode simulasi di bawah ini untuk mencoba:
                        <span className="block mt-1 font-extrabold text-sm text-[#1d56a5] tracking-widest">{mockedCodeInfo}</span>
                      </div>
                    </div>
                  )}

                  {/* Error Alert */}
                  {resetError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4.5 w-4.5 text-red-500 flex-shrink-0" />
                      {resetError}
                    </div>
                  )}

                  {/* Code Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">
                      Kode Verifikasi (6 Digit)
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan 6-digit kode verifikasi"
                      value={resetSecurityCode}
                      onChange={(e) => setResetSecurityCode(e.target.value)}
                      maxLength={6}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all font-mono"
                      required
                    />
                  </div>

                  {/* New Username Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">
                      Username Baru
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan Username baru (min. 3 karakter)"
                      value={resetUsername}
                      onChange={(e) => setResetUsername(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                      required
                    />
                  </div>

                  {/* New Password Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">
                      Password Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        placeholder="Masukkan Password baru (min. 6 karakter)"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg pl-3.5 pr-10 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 focus:outline-none transition-colors"
                      >
                        {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-zinc-500 tracking-wider">
                      Konfirmasi Password Baru
                    </label>
                    <input
                      type="password"
                      placeholder="Ulangi Password baru"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-zinc-200 rounded-lg px-3.5 py-2.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                      required
                    />
                  </div>

                </div>

                {/* Footer */}
                <div className="bg-[#f8fafc] px-6 py-4 border-t border-zinc-200 flex items-center justify-end gap-3 select-none">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-xs font-bold hover:bg-zinc-50 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex items-center justify-center gap-1.5 bg-[#1d56a5] text-white px-4.5 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1a4d94] active:scale-95 disabled:opacity-70 disabled:pointer-events-none transition-all cursor-pointer shadow-md shadow-blue-800/10"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      'Simpan Perubahan'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
