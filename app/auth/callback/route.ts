import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') ?? 'magiclink'

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore errors
          }
        },
      },
    }
  )

  let error = null

  // Handle OAuth-style code (fallback)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    error = exchangeError
  }
  // Handle magiclink token_hash (this is what your flow actually uses)
  else if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    error = verifyError
  }

  if (error) {
    console.error('Auth callback error:', error)
    // Graceful fallback to login with error message
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('error', error.message)
    return NextResponse.redirect(loginUrl)
  }

  // Success! Redirect to the home page
  return NextResponse.redirect(new URL('/', request.url))
}