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

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. /api/trpc (leave this to tRPC)
     * 2. /_next/static (static files)
     * 3. /_next/image (image optimization files)
     * 4. /favicon.ico (favicon file)
     * 5. /public (public files)
     */
    '/((?!api/trpc|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
