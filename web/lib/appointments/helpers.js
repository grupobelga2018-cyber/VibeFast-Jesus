import config from "@/config"

export function getService(slug) {
  return config.services.find((s) => s.slug === slug) || null
}

export function serviceDurationMin(slug) {
  return getService(slug)?.durationMin ?? 60
}

export function endsAtFromStart(startsAt, serviceSlug) {
  const start = new Date(startsAt)
  const mins = serviceDurationMin(serviceSlug)
  return new Date(start.getTime() + mins * 60_000)
}

export const SALON_TZ = config.booking.timezone || "America/Mexico_City"

const HOST_NAME_ALIASES = [
  "Jesus Beltran",
  "Jesús Beltrán",
  "Jesus Beltrán",
  "Jesús Beltran",
  "Color Hair by Gabby",
]

export function foldName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

export function namesMatch(haystack, needle) {
  const hay = foldName(haystack)
  const want = foldName(needle)
  if (!hay || !want) return false
  if (hay.includes(want) || want.includes(hay)) return true
  const hayParts = hay.split(/\s+/).filter(Boolean)
  const wantParts = want.split(/\s+/).filter(Boolean)
  return wantParts.every((part) =>
    hayParts.some((h) => h.startsWith(part) || part.startsWith(h))
  )
}

export function guessServiceSlugFromText(eventName = "") {
  const lower = foldName(eventName)
  const match = config.services.find(
    (s) => lower.includes(foldName(s.slug)) || lower.includes(foldName(s.name))
  )
  return match?.slug || "corte"
}

export function mentionsCalendarHost(text) {
  return /jes[uú]s\s+beltr[aá]n/i.test(String(text || ""))
}

export function cleanClientName(name) {
  let cleaned = String(name || "").replace(/\s+/g, " ").trim()
  if (!cleaned) return ""
  cleaned = cleaned.replace(
    /\s*(?:,|-)?\s*(?:and|y|&|with|con)\s+jes[uú]s\s+beltr[aá]n\s*/gi,
    " "
  )
  cleaned = cleaned.replace(/\s*jes[uú]s\s+beltr[aá]n\s*/gi, " ")
  for (const host of HOST_NAME_ALIASES) {
    const escaped = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
    cleaned = cleaned.replace(new RegExp(escaped, "ig"), " ")
  }
  return cleaned.replace(/\s+/g, " ").trim()
}

export function zonedParts(date, timeZone = SALON_TZ) {
  const map = {}
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(date))) {
    if (part.type !== "literal") map[part.type] = part.value
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: map.weekday,
  }
}

/** Clave de cupo por hora local del salón (ignora minutos). */
export function salonSlotKey(date) {
  const p = zonedParts(date)
  const mm = String(p.month).padStart(2, "0")
  const dd = String(p.day).padStart(2, "0")
  const hh = String(p.hour).padStart(2, "0")
  return `${p.year}-${mm}-${dd}T${hh}:00`
}

/** Convierte reloj del salón (America/Mexico_City) a un instante UTC real. */
export function salonLocalToUtc(year, month, day, hour, minute = 0) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0)
  const shown = zonedParts(new Date(utcGuess))
  const shownAsUtc = Date.UTC(
    shown.year,
    shown.month - 1,
    shown.day,
    shown.hour,
    shown.minute,
    0
  )
  return new Date(utcGuess + (utcGuess - shownAsUtc))
}

export function extractWallClock(raw) {
  const m = String(raw).match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?/
  )
  if (!m) return null
  return {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5] || 0),
  }
}

export function salonDateIso(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function mexicoOffsetMinutes(wall) {
  const instant = salonLocalToUtc(
    wall.year,
    wall.month,
    wall.day,
    wall.hour,
    wall.minute
  )
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    0
  )
  return Math.round((asUtc - instant.getTime()) / 60_000)
}

/**
 * Naive = reloj de México.
 * Z = instante UTC real (los cupos de listar_disponibilidad vienen así).
 * Offset distinto al de México = la hora escrita es la del salón (el modelo a menudo pone -05:00).
 */
export function parseSalonDateTime(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (value == null || value === "") return null
  const raw = String(value).trim()
  const wall = extractWallClock(raw)
  const zulu = /Z$/i.test(raw)
  const off = raw.match(/([+-])(\d{2}):?(\d{2})$/)

  if (wall && zulu) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  if (wall && off) {
    const sign = off[1] === "-" ? -1 : 1
    const offsetMin = sign * (Number(off[2]) * 60 + Number(off[3]))
    if (offsetMin !== mexicoOffsetMinutes(wall)) {
      return salonLocalToUtc(
        wall.year,
        wall.month,
        wall.day,
        wall.hour,
        wall.minute
      )
    }
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  if (wall) {
    return salonLocalToUtc(wall.year, wall.month, wall.day, wall.hour, wall.minute)
  }

  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function parseRequestedWhen({ requested_at, requested_date, requested_hour }) {
  if (requested_at) {
    const d = parseSalonDateTime(requested_at)
    if (d) return d
  }
  if (requested_date && requested_hour != null && requested_hour !== "") {
    const [y, m, d] = String(requested_date).split("-").map(Number)
    const hour = Number(requested_hour)
    if (y && m && d && Number.isFinite(hour)) return salonLocalToUtc(y, m, d, hour, 0)
  }
  return null
}

export function formatWeekday(date, timeZone = SALON_TZ) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    weekday: "long",
  }).format(new Date(date))
}

export function formatAppointmentWhen(startsAt, timezone = config.booking.timezone) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(startsAt))
  } catch {
    return new Date(startsAt).toLocaleString("es-MX")
  }
}

export function salonTodayIso(timeZone = SALON_TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

/** Texto de calendario para el agente: hoy + próximos días reales. */
export function calendarContextForPrompt(days = 14, timeZone = SALON_TZ) {
  const nowLabel = new Intl.DateTimeFormat("es-MX", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date())

  const lines = []
  const origin = new Date()
  for (let i = 0; i < days; i += 1) {
    const probe = new Date(origin.getTime() + i * 24 * 60 * 60 * 1000)
    const iso = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(probe)
    const weekday = new Intl.DateTimeFormat("es-MX", {
      timeZone,
      weekday: "long",
    }).format(probe)
    const closed = zonedParts(probe, timeZone).weekday === "Sun"
    lines.push(`- ${iso} ${weekday}${closed ? " (cerrado)" : ""}`)
  }

  return {
    todayIso: salonTodayIso(timeZone),
    nowLabel,
    upcoming: lines.join("\n"),
  }
}

export const STATUS_LABELS = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rescheduled: "Reprogramada",
  cancelled: "Cancelada",
  completed: "Completada",
}

export const STATUS_BADGE = {
  pending: "badge-warning",
  confirmed: "badge-success",
  rescheduled: "badge-info",
  cancelled: "badge-ghost",
  completed: "badge-ghost",
}
