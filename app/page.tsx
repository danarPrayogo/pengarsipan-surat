'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [emailOrUsername, setEmailOrUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Simulating authentication
    setTimeout(() => {
      if (emailOrUsername === 'admin' && password === 'password123') {
        router.push('/dashboard')
      } else if (!emailOrUsername || !password) {
        setError('Email/Username dan Password harus diisi.')
        setLoading(false)
      } else {
        setError('Kredensial salah. Gunakan admin / password123')
        setLoading(false)
      }
    }, 800)
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
                <a href="#" className="text-xs font-semibold text-blue-100 underline hover:text-white transition-colors">
                  Lupa Kata Kunci?
                </a>
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
    </div>
  )
}
