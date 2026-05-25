import { createMiddlewareClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that anyone can access
  const publicPaths = ['/pricing', '/why-amplify', '/auth/login', '/auth/callback']
  const isPublicPath = publicPaths.some(path => req.nextUrl.pathname.startsWith(path))

  if (isPublicPath) {
    return res
  }

  // Require login for everything else
  if (!user) {
    const redirectUrl = new URL('/auth/login', req.url)
    redirectUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check subscription/trial status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_ends_at')
    .eq('user_id', user.id)
    .single()

  const hasActiveAccess = 
    subscription?.status === 'active' ||
    (subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > new Date()) ||
    (subscription?.current_period_ends_at && new Date(subscription.current_period_ends_at) > new Date())

  if (!hasActiveAccess) {
    // Redirect to pricing with message
    const redirectUrl = new URL('/pricing', req.url)
    redirectUrl.searchParams.set('message', 'trial_expired')
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}