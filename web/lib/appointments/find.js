import { createAdminClient } from "@/lib/supabase/admin"
import {
  formatAppointmentWhen,
  displayServiceName,
  namesMatch,
  guessServiceSlugFromText,
  endsAtFromStart,
  cleanClientName,
  foldName,
} from "@/lib/appointments/helpers"
import { findCalendlyBookingsByName, getCalendlyEventType } from "@/lib/calendly/client"
import { searchGoogleCalendarByName } from "@/lib/google/calendar"

const OPEN_STATUSES = ["pending", "confirmed", "rescheduled"]

function summarize(row) {
  return {
    appointment_id: row.id,
    client_name: row.client_name,
    service_slug: row.service_slug,
    service_name: displayServiceName(row),
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

function appointmentScore(row) {
  return (
    (row?.calendly_event_uri ? 8 : 0) +
    (row?.google_event_id ? 4 : 0) +
    (row?.service_slug === "color" ? 2 : 0) +
    (row?.service_slug && row.service_slug !== "corte" ? 1 : 0)
  )
}

function dedupeAppointments(rows) {
  const byId = new Map()
  for (const row of rows || []) {
    if (!row?.id || byId.has(row.id)) continue
    byId.set(row.id, row)
  }
  const groups = new Map()
  for (const row of byId.values()) {
    const t = new Date(row.starts_at).getTime()
    const slot = Number.isNaN(t) ? row.starts_at : Math.round(t / (15 * 60 * 1000))
    const key = `${foldName(cleanClientName(row.client_name))}|${slot}`
    const prev = groups.get(key)
    if (!prev || appointmentScore(row) > appointmentScore(prev)) {
      groups.set(key, row)
    }
  }
  return [...groups.values()]
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

  const typeCache = new Map()
  const supabase = createAdminClient()
  const imported = []
  for (const booking of found.bookings) {
    let typeName = booking.event_name || ""
    if (booking.event_type_uri) {
      if (!typeCache.has(booking.event_type_uri)) {
        const details = await getCalendlyEventType(booking.event_type_uri)
        typeCache.set(
          booking.event_type_uri,
          details.ok ? details.resource?.name || "" : ""
        )
      }
      typeName = `${typeCache.get(booking.event_type_uri) || ""} ${typeName}`
    }
    const serviceSlug = guessServiceSlugFromText(typeName)
    const typeLabel = typeCache.get(booking.event_type_uri) || null
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
          notes: typeLabel || booking.event_name || null,
        },
        { onConflict: "calendly_event_uri" }
      )
      .select()
      .single()
    if (error) {
      console.warn("[calendly] import:", error.message)
      continue
    }
    if (!data) continue

    const startMs = new Date(booking.starts_at).getTime()
    if (!Number.isNaN(startMs)) {
      const { data: nearby } = await supabase
        .from("appointments")
        .select("*")
        .in("status", OPEN_STATUSES)
        .gte("starts_at", new Date(startMs - 30 * 60 * 1000).toISOString())
        .lte("starts_at", new Date(startMs + 30 * 60 * 1000).toISOString())
      for (const sib of nearby || []) {
        if (sib.id === data.id) continue
        if (
          !namesMatch(sib.client_name, data.client_name) &&
          !namesMatch(sib.client_name, name)
        ) {
          continue
        }
        if (
          sib.calendly_event_uri &&
          sib.calendly_event_uri !== data.calendly_event_uri
        ) {
          continue
        }
        if (sib.google_event_id && !data.google_event_id) {
          await supabase
            .from("appointments")
            .update({ google_event_id: sib.google_event_id })
            .eq("id", data.id)
          data.google_event_id = sib.google_event_id
        }
        await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", sib.id)
      }
    }
    imported.push(data)
  }
  return { rows: imported, error: null }
}

async function importGoogleByName(name) {
  const hits = await searchGoogleCalendarByName(name).catch(() => [])
  if (!hits.length) return []
  const supabase = createAdminClient()
  const imported = []
  for (const hit of hits) {
    const serviceSlug = guessServiceSlugFromText(
      `${hit.event_name || ""} ${hit.description || ""}`
    )
    const existing = await supabase
      .from("appointments")
      .select("*")
      .eq("google_event_id", hit.google_event_id)
      .maybeSingle()
    if (existing.data) {
      imported.push(existing.data)
      continue
    }
    const startMs = new Date(hit.starts_at).getTime()
    let sibling = null
    if (!Number.isNaN(startMs)) {
      const { data: nearby } = await supabase
        .from("appointments")
        .select("*")
        .in("status", OPEN_STATUSES)
        .gte("starts_at", new Date(startMs - 30 * 60 * 1000).toISOString())
        .lte("starts_at", new Date(startMs + 30 * 60 * 1000).toISOString())
      sibling = (nearby || []).find(
        (row) =>
          namesMatch(row.client_name, name) ||
          namesMatch(row.client_name, hit.client_name)
      )
    }
    if (sibling) {
      const patch = { google_event_id: hit.google_event_id }
      if (sibling.service_slug === "corte" && serviceSlug !== "corte") {
        patch.service_slug = serviceSlug
      }
      const { data } = await supabase
        .from("appointments")
        .update(patch)
        .eq("id", sibling.id)
        .select()
        .single()
      imported.push(data || sibling)
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
        notes: hit.event_name || null,
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
  let matched = dedupeAppointments([...(calendly.rows || []), ...fromLocal])

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
