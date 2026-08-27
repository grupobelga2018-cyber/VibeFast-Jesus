import { NextResponse } from "next/server"
import { verifyTelegramSetupKey } from "@/lib/telegram/client"
import { probeGoogleCalendar } from "@/lib/google/calendar"

export const runtime = "nodejs"

export async function GET(request) {
  if (!verifyTelegramSetupKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const probe = await probeGoogleCalendar()
  return NextResponse.json(probe)
}
