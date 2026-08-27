import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendAppointmentReminder } from "@/lib/appointments/notify"

export const runtime = "nodejs"

function authorize(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  const auth = request.headers.get("authorization")
  return auth === `Bearer ${secret}`
}

/** Envía recordatorios a citas en las próximas 12–36 h (compatible con cron diario de Hobby). */
export async function GET(request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = Date.now()
  const windowStart = new Date(now + 12 * 60 * 60 * 1000).toISOString()
  const windowEnd = new Date(now + 36 * 60 * 60 * 1000).toISOString()

  const supabase = createAdminClient()
  const { data: rows, error } = await supabase
    .from("appointments")
    .select("*")
    .in("status", ["confirmed", "rescheduled"])
    .is("reminder_sent_at", null)
    .gte("starts_at", windowStart)
    .lte("starts_at", windowEnd)
    .not("client_telegram_id", "is", null)

  if (error) {
    console.error("[cron reminders]", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  for (const appt of rows || []) {
    const result = await sendAppointmentReminder(appt)
    if (result?.ok) {
      await supabase
        .from("appointments")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", appt.id)
      sent += 1
    }
  }

  return NextResponse.json({ ok: true, candidates: rows?.length || 0, sent })
}
