// app/actions/Auth.ts
'use server'

import { prisma } from '@/app/lib/db'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

// Helper to hash password using built-in crypto SHA256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// Helper to generate a random 6-digit code
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function loginUser(emailOrUsername: string, password: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: emailOrUsername },
          { email: emailOrUsername }
        ]
      }
    })

    if (!user) {
      throw new Error("Email/Username tidak terdaftar")
    }

    const hashedPassword = hashPassword(password)
    if (user.password !== hashedPassword) {
      throw new Error("Password salah")
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    }
  } catch (error: any) {
    console.error("Gagal login:", error)
    throw new Error(error.message || "Gagal melakukan login")
  }
}

export async function sendVerificationCode(email: string) {
  try {
    // 1. Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      throw new Error("Email tidak terdaftar sebagai administrator")
    }

    // 2. Generate code and expiration (10 minutes)
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // 3. Save to database (clear previous codes first)
    await prisma.verificationCode.deleteMany({
      where: { email }
    })

    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt
      }
    })

    // 4. Check SMTP environment variables
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT) || 587
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM || smtpUser

    const isSmtpConfigured = !!(smtpHost && smtpUser && smtpPass)

    console.log(`[VERIFICATION] Email: ${email}, Code: ${code}`)

    if (isSmtpConfigured) {
      // Send real email
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      })

      const mailOptions = {
        from: `"E-Persuratan BMKG" <${smtpFrom}>`,
        to: email,
        subject: 'Kode Verifikasi Reset Kredensial E-Persuratan BMKG',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #1d56a5; color: white; padding: 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 20px; letter-spacing: 0.5px;">E-PERSURATAN BMKG</h2>
            </div>
            <div style="padding: 24px; color: #1a202c; line-height: 1.6;">
              <p>Halo Administrator,</p>
              <p>Kami menerima permintaan untuk mereset kredensial masuk (username/password) E-Persuratan BMKG Anda. Silakan gunakan kode verifikasi di bawah ini untuk melanjutkan:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1d56a5; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #bfdbfe; display: inline-block;">
                  ${code}
                </span>
              </div>

              <p style="font-size: 13px; color: #718096; margin-top: 20px;">
                * Kode ini berlaku selama <strong>10 menit</strong>. Jika Anda tidak meminta reset ini, silakan abaikan email ini dengan aman.
              </p>
            </div>
            <div style="background-color: #f7fafc; padding: 15px; border-top: 1px solid #edf2f7; text-align: center; font-size: 11px; color: #a0aec0;">
              Sistem Pengarsipan Surat Terpadu BMKG
            </div>
          </div>
        `
      }

      await transporter.sendMail(mailOptions)
      return { success: true, isMocked: false }
    } else {
      // Simulated sending
      return { 
        success: true, 
        isMocked: true, 
        code // Send the code to development client so they can enter it easily
      }
    }
  } catch (error: any) {
    console.error("Gagal mengirim kode verifikasi:", error)
    throw new Error(error.message || "Gagal mengirim kode verifikasi ke email")
  }
}

export async function resetCredentials(email: string, code: string, newUsername: string, newPassword: string) {
  try {
    // 1. Find verification record
    const record = await prisma.verificationCode.findFirst({
      where: { email, code }
    })

    if (!record) {
      throw new Error("Kode verifikasi salah")
    }

    // 2. Check expiration
    if (new Date() > record.expiresAt) {
      throw new Error("Kode verifikasi sudah kedaluwarsa (berlaku 10 menit)")
    }

    // 3. Update User credentials
    const hashedPassword = hashPassword(newPassword)
    await prisma.user.update({
      where: { email },
      data: {
        username: newUsername,
        password: hashedPassword
      }
    })

    // 4. Clean verification codes
    await prisma.verificationCode.deleteMany({
      where: { email }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Gagal mereset kredensial:", error)
    throw new Error(error.message || "Gagal mereset kredensial admin")
  }
}
