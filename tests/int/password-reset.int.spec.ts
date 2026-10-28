// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { APIError } from 'payload'
import { resendAdapter } from '@payloadcms/email-resend'
import type { Payload } from 'payload'
import { POST as forgotPassword } from '@/app/api/auth/forgot-password/route'
import { POST as resetPassword } from '@/app/api/auth/reset-password/route'
import { generateResetEmail, getPasswordResetConfig } from '@/lib/password-reset'
import { Users } from '@/collections/Users'

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  getPayload: mocks.getPayload,
}))
vi.mock('@/payload.config', () => ({ default: {} }))

const request = (path: string, body: unknown) =>
  new NextRequest(`https://untrusted-request.example.com/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  vi.stubEnv('APP_URL', 'https://reception.example.com')
  vi.stubEnv('RESEND_API_KEY', 'test-api-key')
  vi.stubEnv('RESEND_FROM_ADDRESS', 'noreply@example.com')
  vi.stubEnv('RESEND_FROM_NAME', 'Reception Aid')
  mocks.getPayload.mockResolvedValue({
    forgotPassword: mocks.forgotPassword,
    resetPassword: mocks.resetPassword,
  })
  mocks.forgotPassword.mockResolvedValue('test-reset-token')
  mocks.resetPassword.mockResolvedValue({ token: 'test-session-token', user: { id: 1 } })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

describe('Resend recovery configuration', () => {
  it('requires an API key and sender', () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect(getPasswordResetConfig()).toBeNull()
    expect(() => generateResetEmail('test-token')).toThrow('not configured')
  })

  it.each([
    'http://reception.example.com',
    'javascript:alert(1)',
    'https://user:password@reception.example.com',
    'not-a-url',
  ])('rejects unsafe app URL %s', (url) => {
    vi.stubEnv('APP_URL', url)
    expect(getPasswordResetConfig()).toBeNull()
  })

  it('allows localhost HTTP during development', () => {
    vi.stubEnv('APP_URL', 'http://localhost:3000')
    expect(getPasswordResetConfig()?.appURL).toBe('http://localhost:3000')
  })

  it('rejects a malformed sender address', () => {
    vi.stubEnv('RESEND_FROM_ADDRESS', 'not-an-email')
    expect(getPasswordResetConfig()).toBeNull()
  })

  it('generates the trusted custom reset link and encodes the token', () => {
    const html = generateResetEmail('test-token&other=value')
    expect(html).toContain(
      'href="https://reception.example.com/reset-password?token=test-token%26other%3Dvalue"',
    )
    expect(html).toContain('expires in one hour')
    expect(html).not.toContain('/admin')
    expect(html).not.toContain('untrusted-request')
  })

  it('configures one-hour recovery emails on the users collection', () => {
    expect(Users.auth).toMatchObject({ forgotPassword: { expiration: 3600000 } })
  })
})

describe('forgot-password API', () => {
  it('sends through Payload without exposing the reset token', async () => {
    const response = await forgotPassword(
      request('forgot-password', { email: '  PERSON@EXAMPLE.COM  ' }),
    )
    expect(response.status).toBe(200)
    expect(mocks.forgotPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'users',
        data: { email: 'person@example.com' },
        disableEmail: false,
      }),
    )
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data).not.toHaveProperty('token')
    expect(JSON.stringify(data)).not.toContain('test-reset-token')
  })

  it('returns identical success messages for known and unknown addresses', async () => {
    const known = await forgotPassword(request('forgot-password', { email: 'known@example.com' }))
    mocks.forgotPassword.mockResolvedValueOnce(null)
    const unknown = await forgotPassword(
      request('forgot-password', { email: 'unknown@example.com' }),
    )
    expect(unknown.status).toBe(known.status)
    expect(await unknown.json()).toEqual(await known.json())
  })

  it.each([null, {}, { email: 'invalid' }, { email: 123 }])(
    'rejects invalid input %j without invoking Payload',
    async (body) => {
      const response = await forgotPassword(request('forgot-password', body))
      expect(response.status).toBe(400)
      expect(mocks.getPayload).not.toHaveBeenCalled()
    },
  )

  it('rejects malformed JSON', async () => {
    const response = await forgotPassword(
      new NextRequest('https://example.com/api/auth/forgot-password', {
        method: 'POST',
        body: '{',
      }),
    )
    expect(response.status).toBe(400)
  })

  it('reports missing email configuration without issuing tokens', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const response = await forgotPassword(
      request('forgot-password', { email: 'person@example.com' }),
    )
    expect(response.status).toBe(503)
    expect(mocks.getPayload).not.toHaveBeenCalled()
  })

  it('handles delivery failures without leaking provider details', async () => {
    mocks.forgotPassword.mockRejectedValueOnce(new Error('private-provider-detail'))
    const response = await forgotPassword(
      request('forgot-password', { email: 'person@example.com' }),
    )
    expect(response.status).toBe(500)
    expect(JSON.stringify(await response.json())).not.toContain('private-provider-detail')
  })
})

describe('reset-password API', () => {
  it('uses Payload token validation and clears stale cookies without exposing a session', async () => {
    const response = await resetPassword(
      request('reset-password', { token: ' test-reset-token ', password: 'test-password-123' }),
    )
    expect(response.status).toBe(200)
    expect(mocks.resetPassword).toHaveBeenCalledWith({
      collection: 'users',
      data: { token: 'test-reset-token', password: 'test-password-123' },
      overrideAccess: false,
    })
    expect(await response.json()).toEqual({
      success: true,
      message: 'Password reset successful',
    })
    expect(response.cookies.get('payload-token')?.value).toBe('')
    expect(response.cookies.get('user')?.value).toBe('')
  })

  it.each([
    null,
    {},
    { token: '', password: 'test-password' },
    { token: 'test-token', password: 'short' },
    { token: 'test-token', password: 'a'.repeat(129) },
    { token: 123, password: 'test-password' },
  ])('rejects invalid input %j', async (body) => {
    const response = await resetPassword(request('reset-password', body))
    expect(response.status).toBe(400)
    expect(mocks.resetPassword).not.toHaveBeenCalled()
  })

  it('explains invalid or expired tokens', async () => {
    mocks.resetPassword.mockRejectedValueOnce(new APIError('Token is invalid or expired', 403))
    const response = await resetPassword(
      request('reset-password', { token: 'test-token', password: 'test-password' }),
    )
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain('invalid or has expired')
  })
})

describe('Resend adapter', () => {
  it('delivers the reset email using Resend REST with a server-side API key', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 'test-email-id' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const adapter = resendAdapter({
      apiKey: 'test-api-key',
      defaultFromAddress: 'noreply@example.com',
      defaultFromName: 'Reception Aid',
    })({ payload: {} as Payload })
    const html = generateResetEmail('test-token')
    await adapter.sendEmail({ to: 'person@example.com', subject: 'Reset password', html })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer test-api-key',
          'Content-Type': 'application/json',
        },
      }),
    )
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(sent).toMatchObject({
      from: 'Reception Aid <noreply@example.com>',
      to: 'person@example.com',
      html,
    })
  })

  it('rejects Resend errors rather than reporting a successful delivery', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              statusCode: 403,
              name: 'validation_error',
              message: 'Sender not verified',
            }),
            { status: 403 },
          ),
        ),
    )
    const adapter = resendAdapter({
      apiKey: 'test-api-key',
      defaultFromAddress: 'noreply@example.com',
      defaultFromName: 'Reception Aid',
    })({ payload: {} as Payload })
    await expect(
      adapter.sendEmail({
        to: 'person@example.com',
        subject: 'Reset password',
        html: '<p>Reset</p>',
      }),
    ).rejects.toThrow('Sender not verified')
  })
})
