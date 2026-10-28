import { NextRequest, NextResponse } from 'next/server'
import { APIError, getPayload } from 'payload'
import config from '@/payload.config'
import { resetPasswordSchema } from '@/lib/password-reset'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'A reset token and a password between 8 and 128 characters are required',
      },
      { status: 400 },
    )
  }
  try {
    const payload = await getPayload({ config })
    await payload.resetPassword({
      collection: 'users',
      data: parsed.data,
      overrideAccess: false,
    })

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successful',
    })

    response.cookies.delete('payload-token')
    response.cookies.delete('user')

    return response
  } catch (error) {
    if (error instanceof APIError && [400, 401, 403].includes(error.status)) {
      return NextResponse.json(
        { success: false, error: 'This reset link is invalid or has expired. Request a new link.' },
        { status: 400 },
      )
    }
    console.error('Password reset failed.')
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset password',
      },
      { status: 500 },
    )
  }
}
