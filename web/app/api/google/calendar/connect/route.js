import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  googleCalendarAuthUrl,
  googleOAuthConfigured,
} from "@/lib/google/calendar"

export const runtime = "nodejs"

export async function GET(request) {
  const origin = new URL(request.url).origin
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?next=/api/google/calendar/connect", request.url)
    )
  }
  if (!googleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL("/dashboard?google=missing_oauth", request.url)
    )
  }

  const state = crypto.randomUUID()
  const jar = await cookies()
  jar.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })

  return NextResponse.redirect(googleCalendarAuthUrl(state, origin))
}
