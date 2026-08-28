import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import {
  exchangeGoogleCode,
  fetchGoogleEmail,
  saveGoogleCalendarAuth,
  syncOpenAppointmentsToGoogle,
  hideHostCalendarNames,
} from "@/lib/google/calendar"

export const runtime = "nodejs"

export async function GET(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  const dash = new URL("/dashboard", request.url)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard", request.url))
  }

  if (error) {
    dash.searchParams.set("google", "denied")
    return NextResponse.redirect(dash)
  }

  const jar = await cookies()
  const expected = jar.get("gcal_oauth_state")?.value
  jar.delete("gcal_oauth_state")
  if (!code || !state || state !== expected) {
    dash.searchParams.set("google", "invalid")
    return NextResponse.redirect(dash)
  }

  const tokens = await exchangeGoogleCode(code, url.origin)
  if (!tokens.ok || !tokens.refresh_token) {
    dash.searchParams.set("google", "no_refresh")
    return NextResponse.redirect(dash)
  }

  const email = tokens.access_token
    ? await fetchGoogleEmail(tokens.access_token)
    : null
  await saveGoogleCalendarAuth({
    refresh_token: tokens.refresh_token,
    email,
  })

  await hideHostCalendarNames().catch((err) => {
    console.warn("[gcal] rename calendars:", err.message)
  })
  await syncOpenAppointmentsToGoogle().catch((err) => {
    console.warn("[gcal] backfill:", err.message)
  })

  dash.searchParams.set("google", "connected")
  return NextResponse.redirect(dash)
}
