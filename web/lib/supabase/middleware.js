// ============================================================
// Supabase · refresh de sesión en el middleware
// ------------------------------------------------------------
// Se llama desde web/middleware.js en cada request. Hace dos cosas:
//   1. Refresca el token de sesión (cookies) si está por expirar.
//   2. Protege rutas: si la ruta requiere auth y no hay usuario,
//      redirige a /login.
//
// Patrón oficial de Supabase SSR. No reordenes: getUser() debe
// correr entre crear la response y devolverla, o las cookies
// quedan desincronizadas.
// ============================================================

import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import config from "@/config"
import { isStaffUser } from "@/lib/auth/staff"

// Rutas que requieren sesión. Todo lo que cuelga de /(app) en realidad,
// pero el middleware no ve grupos de rutas, así que listamos prefijos.
const PROTECTED_PREFIXES = ["/dashboard", "/account", "/chat", "/agent"]

export async function updateSession(request) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Antes de Sem 2 el alumno aún no configuró Supabase. Sin claves,
  // dejamos pasar todo para que la landing (Sem 1) funcione igual.
  if (!url || !anonKey) return response

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no metas lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const staff = user?.email ? await isStaffUser(supabase, user.email) : false

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = config.auth.loginUrl
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isProtected && user && !staff) {
    await supabase.auth.signOut()
    const denied = request.nextUrl.clone()
    denied.pathname = config.auth.loginUrl
    denied.search = ""
    denied.searchParams.set("error", "unauthorized")
    return NextResponse.redirect(denied)
  }

  if (user && pathname === config.auth.loginUrl) {
    if (!staff) {
      await supabase.auth.signOut()
      const denied = request.nextUrl.clone()
      denied.pathname = config.auth.loginUrl
      denied.search = ""
      denied.searchParams.set("error", "unauthorized")
      return NextResponse.redirect(denied)
    }
    const dest = request.nextUrl.clone()
    dest.pathname = config.auth.afterLoginUrl
    dest.search = ""
    return NextResponse.redirect(dest)
  }

  return response
}
