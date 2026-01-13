import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check for student session
  const studentSessionToken = request.cookies.get('student_session')?.value
  let validStudentSession = false

  if (studentSessionToken) {
    // Validate student session
    const { data: session } = await supabase
      .from('student_sessions')
      .select('*')
      .eq('session_token', studentSessionToken)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (session) {
      validStudentSession = true

      // Update last active timestamp (fire and forget)
      supabase
        .from('student_sessions')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', session.id)
        .then()
    } else {
      // Invalid/expired session - clear cookie
      supabaseResponse.cookies.delete('student_session')
    }
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/auth']
  const isPublicRoute =
    publicRoutes.some(
      (route) =>
        request.nextUrl.pathname === route ||
        request.nextUrl.pathname.startsWith('/auth/')
    ) || request.nextUrl.pathname.startsWith('/join/')

  // Block /signup route (no longer available)
  if (request.nextUrl.pathname.startsWith('/signup')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Admin route protection
  if (request.nextUrl.pathname.startsWith('/admin/')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      // Not admin - redirect to home
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Student route protection - requires either auth user or valid student session
  if (request.nextUrl.pathname.startsWith('/student/')) {
    if (!user && !validStudentSession) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Teacher route protection - requires auth user with teacher/ta/admin role
  if (request.nextUrl.pathname.startsWith('/teacher/')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (
      profile?.role !== 'teacher' &&
      profile?.role !== 'ta' &&
      profile?.role !== 'admin'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  // Protect other routes (except public) - requires some form of auth
  if (!user && !validStudentSession && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
