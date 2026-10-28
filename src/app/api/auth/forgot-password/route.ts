import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { forgotPasswordSchema, getPasswordResetConfig } from '@/lib/password-reset'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Enter a valid email address' },
      { status: 400 },
    )
  }

  if (!getPasswordResetConfig()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Password reset email is not configured. Please contact your administrator.',
      },
      { status: 503 },
    )
  }
  try {
    const payload = await getPayload({ config })
    await payload.forgotPassword({
      collection: 'users',
      data: parsed.data,
      disableEmail: false,
      req: { headers: request.headers, url: request.url },
    })

    return NextResponse.json({
      success: true,
      message:
        'If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.',
    })
  } catch {
    console.error('Password reset email could not be sent. Check the Resend configuration.')
    return NextResponse.json(
      {
        success: false,
        error:
          'Unable to send a password reset email. Please try again later or contact your administrator.',
      },
      { status: 500 },
    )
  }
}
