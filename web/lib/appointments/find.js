import { createAdminClient } from "@/lib/supabase/admin"
import {
  formatAppointmentWhen,
  getService,
  namesMatch,
  guessServiceSlugFromText,
  endsAtFromStart,
  cleanClientName,
} from "@/lib/appointments/helpers"
import { findCalendlyBookingsByName } from "@/lib/calendly/client"
import { searchGoogleCalendarByName } from "@/lib/google/calendar"

const OPEN_STATUSES = ["pending", "confirmed", "rescheduled"]

function summarize(row) {
  const service = getService(row.service_slug)
  return {
    appointment_id: row.id,
    client_name: row.client_name,
    service_slug: row.service_slug,
    service_name: service?.name || row.service_slug,
    status: row.status,
    channel: row.channel,
    starts_at: row.starts_at,
    when: formatAppointmentWhen(row.starts_at),
    proposed_starts_at: row.proposed_starts_at,
    proposed_when: row.proposed_starts_at
      ? formatAppointmentWhen(row.proposed_starts_at)
      : null,
  }
}

function sqlNeedle(name) {
  return String(name || "")
    .replace(/[%_,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function importCalendlyByName(name) {
  const found = await findCalendlyBookingsByName(name)
  if (!found.bookings?.length) {
    return { rows: [], error: found.skipped ? found.error : found.error || null }
  }

  const supabase = createAdminClient()
  const imported = []
  for (const booking of found.bookings) {
    const serviceSlug = guessServiceSlugFromText(booking.event_name)
    const { data, error } = await supabase
      .from("appointments")
      .upsert(
        {
          client_name: cleanClientName(booking.client_name) || name,
          client_email: booking.client_email,
          service_slug: serviceSlug,
          starts_at: booking.starts_at,
          ends_at:
            booking.ends_at ||
            endsAtFromStart(booking.starts_at, serviceSlug).toISOString(),
          channel: "calendly",
          status: "confirmed",
          calendly_event_uri: booking.calendly_event_uri,
        },
        { onConflict: "calendly_event_uri" }
      )
      .select()
      .single()
    if (error) console.warn("[calendly] import:", error.message)
    else if (data) imported.push(data)
  }
  return { rows: imported, error: null }
}

async function importGoogleByName(name) {
  const hits = await searchGoogleCalendarByName(name).catch(() => [])
  if (!hits.length) return []
  const supabase = createAdminClient()
  const imported = []
  for (const hit of hits) {
    const serviceSlug = guessServiceSlugFromText(hit.event_name)
    const existing = await supabase
      .from("appointments")
      .select("*")
      .eq("google_event_id", hit.google_event_id)
      .maybeSingle()
    if (existing.data) {
      imported.push(existing.data)
      continue
    }
    const { data, error } = await supabase
      .from("appointments")
      .insert({
        client_name: cleanClientName(hit.client_name) || name,
        service_slug: serviceSlug,
        starts_at: hit.starts_at,
        ends_at:
          hit.ends_at ||
          endsAtFromStart(hit.starts_at, serviceSlug).toISOString(),
        channel: "calendly",
        status: "confirmed",
        google_event_id: hit.google_event_id,
      })
      .select()
      .single()
    if (error) console.warn("[gcal] import search:", error.message)
    else if (data) imported.push(data)
  }
  return imported
}

export async function findUpcomingAppointments({
  appointment_id = null,
  client_name = null,
} = {}) {
  const supabase = createAdminClient()

  if (appointment_id) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .in("status", OPEN_STATUSES)
      .maybeSingle()
    if (error) return { ok: false, error: error.message, appointments: [] }
    return {
      ok: true,
      appointments: data ? [summarize(data)] : [],
    }
  }

  const name = String(client_name || "").trim()
  if (name.length < 2) {
    return {
      ok: false,
      error: "falta_nombre",
      message: "Pregunta el nombre de la clienta antes de buscar la cita.",
      appointments: [],
    }
  }

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  const needle = sqlNeedle(name)
  let localQuery = supabase
    .from("appointments")
    .select("*")
    .in("status", OPEN_STATUSES)
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(50)
  if (needle) {
    localQuery = localQuery.or(
      `client_name.ilike.%${needle}%,notes.ilike.%${needle}%,client_email.ilike.%${needle}%`
    )
  }

  const [{ data, error }, calendly] = await Promise.all([
    localQuery,
    importCalendlyByName(name),
  ])

  if (error) console.warn("[citas] local search:", error.message)

  const fromLocal = (data || []).filter(
    (row) =>
      namesMatch(row.client_name, name) ||
      namesMatch(row.notes, name) ||
      namesMatch(row.client_email, name)
  )
  let matched = [...fromLocal, ...(calendly.rows || [])]
  const seen = new Set()
  matched = matched.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })

  if (!matched.length) {
    const fromGoogle = await importGoogleByName(name)
    matched = fromGoogle
  }

  if (!matched.length) {
    const reason = calendly.error === "missing_token"
      ? " Falta CALENDLY_API_TOKEN en Vercel para leer Calendly."
      : calendly.error
        ? ` Calendly respondió: ${calendly.error}.`
        : ""
    return {
      ok: true,
      appointments: [],
      message: `No encontré una cita a nombre de ${name}.${reason}`,
    }
  }

  return {
    ok: true,
    appointments: matched.slice(0, 10).map(summarize),
  }
}

export async function resolveOpenAppointment({
  appointment_id = null,
  client_name = null,
}) {
  const found = await findUpcomingAppointments({ appointment_id, client_name })
  if (!found.ok) return found

  if (!found.appointments.length) {
    return {
      ok: false,
      error: "no_encontrada",
      message:
        found.message ||
        `No encontré una cita a nombre de ${client_name} (tampoco en Calendly). Confirma el nombre.`,
      appointments: [],
    }
  }

  if (found.appointments.length > 1 && !appointment_id) {
    return {
      ok: false,
      error: "varias_citas",
      message: "Hay varias citas con ese nombre. Pregunta cuál quieren cambiar.",
      appointments: found.appointments,
    }
  }

  return { ok: true, appointment: found.appointments[0] }
}
