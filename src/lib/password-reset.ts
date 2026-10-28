import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1).max(256),
  password: z.string().min(8).max(128),
})

export const getPasswordResetConfig = () => {
  const { APP_URL, RESEND_API_KEY, RESEND_FROM_ADDRESS } = process.env

  if (!APP_URL || !RESEND_API_KEY || !RESEND_FROM_ADDRESS) {
    return null
  }

  try {
    const url = new URL(APP_URL)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) ||
      url.username ||
      url.password ||
      !z.email().safeParse(RESEND_FROM_ADDRESS).success
    ) {
      return null
    }

    return {
      appURL: url.origin,
      apiKey: RESEND_API_KEY,
      defaultFromAddress: RESEND_FROM_ADDRESS,
      defaultFromName: process.env.RESEND_FROM_NAME || 'Reception Aid',
    }
  } catch {
    return null
  }
}

export const generateResetEmail = (token?: string) => {
  const config = getPasswordResetConfig()
  if (!config || !token) throw new Error('Password reset email is not configured')

  const url = new URL('/reset-password', config.appURL)
  url.searchParams.set('token', token)
  const link = url.toString().replaceAll('&', '&amp;').replaceAll('"', '&quot;')

  return `<p>A password reset was requested for your Reception Aid account.</p>
<p><a href="${link}">Reset your password</a></p>
<p>This link expires in one hour and can only be used once.</p>
<p>If you did not request this, you can ignore this email. Your password has not changed.</p>`
}
