import { createHmac, timingSafeEqual } from "crypto"
import { NextResponse, after } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { endsAtFromStart } from "@/lib/appointments/helpers"
import { sendAppointmentConfirmation } from "@/lib/appointments/notify"
import { notifyGabyAppointment } from "@/lib/telegram/notify"
import { cancelAppointment } from "@/lib/appointments/lifecycle"
import { calendlyScheduledEventUuid } from "@/lib/calendly/client"
import {
  createGoogleCalendarEvent,
  persistGoogleEventId,
} from "@/lib/google/calendar"
import config from "@/config"

export const runtime = "nodejs"

function verifyCalendlySignature(rawBody, signatureHeader) {
  const secret = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  if (!secret) return true // local / unset
  if (!signatureHeader) return false

  // Header format: t=timestamp,v1=signature
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.split("=")
      return [k.trim(), v]
    })
  )
  const t = parts.t
  const v1 = parts.v1
  if (!t || !v1) return false

  const signed = `${t}.${rawBody}`
  const expected = createHmac("sha256", secret).update(signed).digest("hex")
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1))
  } catch {
    return false
  }
}

function inviteeDisplayName(invitee = {}) {
  return (
    invitee.name ||
    [invitee.first_name, invitee.last_name].filter(Boolean).join(" ") ||
    invitee.invitee?.name ||
    [invitee.invitee?.first_name, invitee.invitee?.last_name]
      .filter(Boolean)
      .join(" ") ||
    null
  )
}

function scheduledEventUri(invitee = {}, scheduled = {}) {
  const uuid =
    calendlyScheduledEventUuid(scheduled.uri) ||
    calendlyScheduledEventUuid(invitee.uri) ||
    calendlyScheduledEventUuid(invitee.event)
  return uuid ? `https://api.calendly.com/scheduled_events/${uuid}` : null
}

function guessServiceSlug(eventName = "") {
  const lower = eventName.toLowerCase()
  const match = config.services.find(
    (s) => lower.includes(s.slug) || lower.includes(s.name.toLowerCase())
  )
  return match?.slug || "corte"
}

export async function POST(request) {
  const rawBody = await request.text()
  const signature = request.headers.get("calendly-webhook-signature")

  if (!verifyCalendlySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const event = payload.event
  const invitee = payload.payload || {}
  const scheduled = invitee.scheduled_event || {}
  const eventUri = scheduledEventUri(invitee, scheduled)

  const supabase = createAdminClient()

  if (event === "invitee.created") {
    const startsAt = scheduled.start_time || invitee.start_time
    if (!startsAt) {
      return NextResponse.json({ error: "Missing start_time" }, { status: 400 })
    }

    const serviceSlug = guessServiceSlug(scheduled.name || invitee.event_type?.name || "")
    const row = {
      client_name: inviteeDisplayName(invitee),
      client_email: invitee.email || invitee.invitee?.email || null,
      client_phone:
        invitee.text_reminder_number ||
        invitee.questions_and_answers?.find?.((q) =>
          /tel|phone|whats/i.test(q.question || "")
        )?.answer ||
        null,
      service_slug: serviceSlug,
      starts_at: startsAt,
      ends_at: scheduled.end_time || endsAtFromStart(startsAt, serviceSlug).toISOString(),
      channel: "calendly",
      status: "confirmed",
      calendly_event_uri: eventUri,
      notes: scheduled.name || null,
    }

    const { data, error } = await supabase
      .from("appointments")
      .upsert(row, { onConflict: "calendly_event_uri" })
      .select()
      .single()

    if (error) {
      console.error("[calendly] upsert:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await notifyGabyAppointment(data).catch(() => {})
    await sendAppointmentConfirmation(data).catch(() => {})
    after(() => {
      createGoogleCalendarEvent(data)
        .then(async (gcal) => {
          if (gcal.ok && gcal.eventId) {
            await persistGoogleEventId(data.id, gcal.eventId)
          }
        })
        .catch((err) => {
          console.warn("[calendly] google sync:", err.message)
        })
    })
    return NextResponse.json({ ok: true, id: data.id })
  }

  if (event === "invitee.canceled") {
    if (!eventUri) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    const { data: row, error: findErr } = await supabase
      .from("appointments")
      .select("id")
      .eq("calendly_event_uri", eventUri)
      .maybeSingle()
    if (findErr) {
      console.error("[calendly] cancel find:", findErr.message)
      return NextResponse.json({ error: findErr.message }, { status: 500 })
    }
    let appointmentId = row?.id
    if (!appointmentId) {
      const uuid = calendlyScheduledEventUuid(eventUri)
      if (uuid) {
        const { data: fuzzy } = await supabase
          .from("appointments")
          .select("id")
          .ilike("calendly_event_uri", `%${uuid}%`)
          .maybeSingle()
        appointmentId = fuzzy?.id
      }
    }
    if (appointmentId) {
      const result = await cancelAppointment(appointmentId, {
        notifyClient: true,
        fromCalendly: true,
      })
      if (!result.ok) {
        console.error("[calendly] cancel:", result.error)
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true, ignored: event })
}
