import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isPartnerRoute = request.nextUrl.pathname.startsWith('/parceiro')

  if ((isAdminRoute || isPartnerRoute) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  if (isAdminRoute && user) {
    const { data: roles } = await supabase
      .from('users_roles')
      .select('roles(name)')
      .eq('user_id', user.id)

    const isAdmin = roles?.some(
      (r: any) => r.roles?.name === 'admin'
    )
    if (!isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  if (isPartnerRoute && user) {
    const { data: roles } = await supabase
      .from('users_roles')
      .select('roles(name)')
      .eq('user_id', user.id)

    const isPartnerOrAdmin = roles?.some(
      (r: any) => r.roles?.name === 'partner' || r.roles?.name === 'admin'
    )
    if (!isPartnerOrAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
