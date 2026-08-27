import config from "@/config"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  extractWallClock,
  formatAppointmentWhen,
  formatWeekday,
  getService,
  parseRequestedWhen,
  parseSalonDateTime,
  salonDateIso,
  salonLocalToUtc,
  salonSlotKey,
  zonedParts,
} from "@/lib/appointments/helpers"
import {
  createCalendlyInvitee,
  isCalendlyApiConfigured,
  listCalendlyAvailableTimes,
  resolveCalendlyEventType,
} from "@/lib/calendly/client"

const OPEN_HOUR = 10
const CLOSE_HOUR = 18

function toSlot(date, serviceSlug) {
  const p = zonedParts(date)
  return {
    starts_at: date.toISOString(),
    label: formatAppointmentWhen(date),
    local_date: `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`,
    local_hour: p.hour,
    weekday: formatWeekday(date),
    service_slug: serviceSlug,
  }
}

async function loadLocalBusy(from, to) {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("appointments")
      .select("starts_at, proposed_starts_at, status")
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString())
      .in("status", ["pending", "confirmed", "rescheduled"])

    if (error) {
      console.warn("[availability] supabase:", error.message)
      return new Set()
    }

    const busy = new Set()
    for (const row of data || []) {
      busy.add(salonSlotKey(row.starts_at))
      if (row.proposed_starts_at) busy.add(salonSlotKey(row.proposed_starts_at))
    }
    return busy
  } catch (err) {
    console.warn("[availability] local busy skipped:", err.message)
    return new Set()
  }
}

function buildLocalSlots({ from, to, service, busy, limit = 24 }) {
  const startParts = zonedParts(from)
  const origin = salonLocalToUtc(startParts.year, startParts.month, startParts.day, 12, 0)
  const slots = []

  for (let dayOffset = 0; dayOffset < 14 && slots.length < limit; dayOffset += 1) {
    const probe = new Date(origin.getTime() + dayOffset * 24 * 60 * 60 * 1000)
    const day = zonedParts(probe)
    if (day.weekday === "Sun") continue

    for (let hour = OPEN_HOUR; hour < CLOSE_HOUR; hour += 1) {
      const start = salonLocalToUtc(day.year, day.month, day.day, hour, 0)
      if (start <= from || start >= to) continue
      if (busy.has(salonSlotKey(start))) continue
      slots.push(toSlot(start, service.slug))
      if (slots.length >= limit) break
    }
  }
  return slots
}

export async function getAvailableSlots({
  service_slug = "corte",
  days = 7,
  requested_at = null,
  requested_date = null,
  requested_hour = null,
} = {}) {
  const service = getService(service_slug) || getService("corte")
  const from = new Date()
  const to = new Date()
  to.setDate(to.getDate() + Number(days || 7))

  const requested = parseRequestedWhen({
    requested_at,
    requested_date,
    requested_hour,
  })

  let source = "local"
  let slots = []

  if (isCalendlyApiConfigured()) {
    const eventType = await resolveCalendlyEventType(service)
    if (eventType.ok) {
      const cal = await listCalendlyAvailableTimes({
        eventTypeUri: eventType.uri,
        start: from,
        end: to,
      })
      if (cal.ok) {
        source = "calendly"
        slots = cal.times.slice(0, 24).map((d) => toSlot(d, service.slug))
      }
    }
  }

  if (source === "local") {
    const busy = await loadLocalBusy(from, to)
    slots = buildLocalSlots({ from, to, service, busy, limit: 40 })
  }

  const requestedParts = requested ? zonedParts(requested) : null
  const requestedDate =
    requested_date ||
    (requestedParts
      ? `${requestedParts.year}-${String(requestedParts.month).padStart(2, "0")}-${String(requestedParts.day).padStart(2, "0")}`
      : null)
  const slotsThatDay = requestedDate
    ? slots.filter((s) => s.local_date === requestedDate)
    : []

  let requestedInfo = null
  if (requested) {
    const match = slots.find(
      (s) => Math.abs(new Date(s.starts_at).getTime() - requested.getTime()) <= 30 * 60_000
    )
    const sameHour = slots.find(
      (s) => salonSlotKey(s.starts_at) === salonSlotKey(requested)
    )
    const hit = match || sameHour
    const probe = hit ? new Date(hit.starts_at) : requested
    requestedInfo = {
      available: Boolean(hit),
      starts_at: (hit || toSlot(requested, service.slug)).starts_at,
      label: formatAppointmentWhen(hit?.starts_at || requested),
      local_date: requestedDate,
      weekday: formatWeekday(probe),
    }
  } else if (requestedDate) {
    const weekdayProbe = slotsThatDay[0]?.starts_at
    requestedInfo = {
      available: slotsThatDay.length > 0,
      local_date: requestedDate,
      weekday: weekdayProbe ? formatWeekday(weekdayProbe) : null,
    }
  }

  return {
    ok: true,
    source,
    timezone: config.booking.timezone,
    service_slug: service.slug,
    requested: requestedInfo,
    slots_that_day: slotsThatDay,
    slots,
    note:
      source === "calendly"
        ? "Horarios tomados de Calendly. Si elige uno, se agenda en ese calendario."
        : "Horarios del salón (10:00–18:00, lunes a sábado, hora Ciudad de México).",
  }
}

function hourCandidates({ starts_at, local_hour }) {
  const hours = []
  if (local_hour != null && local_hour !== "") {
    const spoken = Number(local_hour)
    if (Number.isFinite(spoken) && spoken >= 0 && spoken <= 23) hours.push(spoken)
  }

  const raw = String(starts_at || "").trim()
  const wall = extractWallClock(raw)
  if (!wall) return hours

  const zulu = /Z$/i.test(raw)
  const instant = new Date(raw)
  if (zulu && !Number.isNaN(instant.getTime())) {
    hours.push(zonedParts(instant).hour)
  }
  if (wall.hour >= OPEN_HOUR && wall.hour < CLOSE_HOUR) {
    hours.push(wall.hour)
  }
  return hours
}

function dateIsoFromInput(starts_at, requested_date) {
  if (requested_date) return String(requested_date)
  const parsed = parseSalonDateTime(starts_at)
  if (parsed) {
    const p = zonedParts(parsed)
    return salonDateIso(p.year, p.month, p.day)
  }
  const wall = extractWallClock(starts_at)
  if (wall) return salonDateIso(wall.year, wall.month, wall.day)
  return null
}

function matchSlotByHour(slots, hours, dateIso = null) {
  const pool = dateIso
    ? (slots || []).filter((s) => s.local_date === dateIso)
    : slots || []
  const seen = new Set()
  for (const hour of hours) {
    if (!Number.isFinite(hour) || seen.has(hour)) continue
    seen.add(hour)
    const hit = pool.find((s) => s.local_hour === hour)
    if (hit) return hit
  }
  return null
}

/** El modelo a menudo convierte 10:00 México a 15:00Z. Ancla al cupo local real. */
export async function snapToAvailableSlot({
  starts_at,
  service_slug = "corte",
  local_hour = null,
  requested_date = null,
  offered_slots = null,
} = {}) {
  const hours = hourCandidates({ starts_at, local_hour })
  const dayIso = dateIsoFromInput(starts_at, requested_date)
  const offered = Array.isArray(offered_slots) ? offered_slots : []
  const offeredHit = matchSlotByHour(offered, hours, dayIso)
  if (offeredHit) return new Date(offeredHit.starts_at)

  if (dayIso) {
    const avail = await getAvailableSlots({
      service_slug,
      requested_date: dayIso,
      days: 21,
    })
    const pool = avail.slots_that_day?.length
      ? avail.slots_that_day
      : (avail.slots || []).filter((s) => s.local_date === dayIso)
    const hit = matchSlotByHour(pool, hours, dayIso)
    if (hit) return new Date(hit.starts_at)

    if (
      local_hour != null &&
      local_hour !== "" &&
      Number.isFinite(Number(local_hour))
    ) {
      const [y, m, d] = dayIso.split("-").map(Number)
      return salonLocalToUtc(y, m, d, Number(local_hour), 0)
    }
  }

  return parseSalonDateTime(starts_at)
}

export async function bookCalendlyIfPossible({
  service_slug,
  starts_at,
  client_name,
  client_email,
  telegram_chat_id,
}) {
  if (!isCalendlyApiConfigured()) {
    return { ok: false, skipped: true, reason: "no_calendly_token" }
  }

  const service = getService(service_slug)
  const eventType = await resolveCalendlyEventType(service)
  if (!eventType.ok) return eventType

  const email =
    client_email ||
    `telegram+${telegram_chat_id || "cita"}@${config.app.domain}`.replace(
      /[^\w.@+-]/g,
      ""
    )

  const created = await createCalendlyInvitee({
    eventTypeUri: eventType.uri,
    startTime: starts_at,
    name: client_name || "Clienta Telegram",
    email,
    timezone: config.booking.timezone,
  })

  if (!created.ok) return created

  const resource = created.resource || {}
  return {
    ok: true,
    eventUri: resource.event || resource.uri || null,
    inviteeUri: resource.uri || null,
    email,
  }
}
