import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/google/scopes"

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

  const next = encodeURIComponent("/dashboard?google=connected")
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${next}`,
      scopes: GOOGLE_CALENDAR_SCOPES,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      },
      skipBrowserRedirect: true,
    },
  })

  if (error || !data?.url) {
    console.error("[gcal] connect oauth:", error?.message || "sin url")
    return NextResponse.redirect(
      new URL("/dashboard?google=oauth_error", request.url)
    )
  }

  return NextResponse.redirect(data.url)
}
