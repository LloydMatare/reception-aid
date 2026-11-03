// middleware.ts - UPDATED WITH CLERK
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/signin(.*)',
  '/register(.*)',
  '/forgot-password(.*)',
  '/reset-password(.*)',
  '/api/users/login(.*)',
  '/api/auth/register(.*)',
  '/api/auth/forgot-password(.*)',
  '/api/auth/reset-password(.*)',
  '/api/visitors(.*)',
  '/api/debug(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  // Allow Payload admin routes
  if (pathname.startsWith('/admin')) {
    return
  }

  // Allow Payload API routes
  if (pathname.startsWith('/api/payload')) {
    return
  }

  if (isPublicRoute(req)) {
    return
  }

  await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
