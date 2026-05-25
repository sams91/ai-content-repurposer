import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // === Existing logic from your proxy.ts ===
  if (pathname.startsWith('/auth/login') && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Public pages — no login required
  const publicPaths = [
    '/why-amplify',
    '/pricing',
    '/auth',
    '/api/webhooks/lemon',
  ]

  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return supabaseResponse
  }

  // Require login for everything else
  if (!session) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // === NEW: Subscription / Trial check + AUTO-GRANT 14-DAY TRIAL ===
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_ends_at')
    .eq('user_id', session.user.id)
    .single()

  const now = new Date()
  let hasActiveAccess = 
    subscription?.status === 'active' ||
    (subscription?.trial_ends_at && new Date(subscription.trial_ends_at) > now) ||
    (subscription?.current_period_ends_at && new Date(subscription.current_period_ends_at) > now)

  // Auto-grant 14-day trial for brand-new users
  if (!subscription || !hasActiveAccess) {
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 14)

    await supabase
      .from('subscriptions')
      .upsert({
        user_id: session.user.id,
        status: 'trialing',
        trial_ends_at: trialEndsAt.toISOString(),
        current_period_ends_at: trialEndsAt.toISOString(),
      }, { onConflict: 'user_id' })

    hasActiveAccess = true
  }

  if (!hasActiveAccess) {
    const redirectUrl = new URL('/pricing', request.url)
    redirectUrl.searchParams.set('message', 'trial_expired')
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}