import config from "@/config"
import {
  salonLocalToUtc,
  salonTodayIso,
  zonedParts,
} from "@/lib/appointments/helpers"

const MONTHS = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
}

const WEEKDAYS = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
}

function fold(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

function pad(n) {
  return String(n).padStart(2, "0")
}

function nextWeekdayIso(targetDow, skipToday) {
  const [y, m, d] = salonTodayIso().split("-").map(Number)
  const current = salonLocalToUtc(y, m, d, 12, 0).getUTCDay()
  let delta = (targetDow - current + 7) % 7
  if (delta === 0 && skipToday) delta = 7
  const parts = zonedParts(salonLocalToUtc(y, m, d + delta, 12, 0))
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function extractBookingDraft(text, previous = {}) {
  const draft = { ...previous }
  const t = fold(text)
  if (!t) return draft

  const wantsChange =
    t.includes("reprogram") ||
    t.includes("cambiar una cita") ||
    t.includes("cambiar la cita") ||
    t.includes("cambiar cita") ||
    t.includes("mover la cita") ||
    t.includes("mover una cita") ||
    (t.includes("cambiar") && t.includes("cita"))
  const wantsCancel =
    t.includes("cancelar") || t.includes("cancelo") || t.includes("anular")

  if (wantsChange || wantsCancel) {
    draft.intent = wantsCancel ? "cancel" : "reschedule"
    delete draft.requested_date
    delete draft.requested_hour
    delete draft.offered_slots
    delete draft.appointment_id
    delete draft.client_name
  }

  const namedClient = t.match(
    /\b(?:a nombre de|nombre de(?: la clienta)?)\s+([a-záéíóúüñ]{2,}(?:\s+[a-záéíóúüñ]{2,})?)\b/
  )
  if (namedClient) {
    draft.client_name = namedClient[1].replace(/\b\w/g, (c) => c.toUpperCase())
  } else if (
    (draft.intent === "reschedule" || draft.intent === "cancel") &&
    !wantsChange &&
    !wantsCancel
  ) {
    const tokens = String(text || "").trim().split(/\s+/)
    const reserved = new Set([
      ...Object.keys(WEEKDAYS),
      ...config.services.flatMap((s) => [fold(s.slug), fold(s.name)]),
      "si",
      "no",
      "ok",
      "hola",
      "cita",
      "corte",
      "gracias",
    ])
    if (
      tokens.length >= 1 &&
      tokens.length <= 3 &&
      !hourMatchSafe(t) &&
      !tokens.some((tok) => reserved.has(fold(tok)))
    ) {
      draft.client_name = tokens.join(" ")
    }
  }

  for (const service of config.services) {
    if (t.includes(fold(service.slug)) || t.includes(fold(service.name))) {
      draft.service_slug = service.slug
      draft.service_name = service.name
    }
  }

  const skipToday = t.includes("proximo") || t.includes("siguiente")
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (t.includes(name)) {
      draft.requested_date = nextWeekdayIso(dow, skipToday)
      break
    }
  }

  const named = t.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/
  )
  if (named) {
    const day = Number(named[1])
    const month = MONTHS[named[2]]
    const yearMatch = t.match(/\b(20\d{2})\b/)
    const year = yearMatch ? Number(yearMatch[1]) : Number(salonTodayIso().slice(0, 4))
    draft.requested_date = `${year}-${pad(month)}-${pad(day)}`
  }

  const iso = t.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (iso) draft.requested_date = iso[1]

  const hourMatch =
    t.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/) ||
    t.match(/\b(?:a las|las)\s+(\d{1,2})(?::(\d{2}))?\b/) ||
    t.match(/\b(\d{1,2}):(\d{2})\b/) ||
    t.match(/\b(\d{1,2})\s*(am|pm|hrs?|horas?|de la manana|de la tarde|de la noche)\b/)
  if (hourMatch) {
    let hour = Number(hourMatch[1])
    const suffix = fold(hourMatch[3] || hourMatch[0] || "")
    if (Number.isFinite(hour) && hour >= 0 && hour <= 23) {
      if (suffix.includes("pm") && hour < 12) hour += 12
      if (suffix.includes("am") && hour === 12) hour = 0
      if (suffix.includes("tarde") && hour < 12) hour += 12
      if (suffix.includes("noche") && hour < 12) hour += 12
      if (hour >= 8 && hour <= 18) draft.requested_hour = hour
    }
  }

  return draft
}

function hourMatchSafe(t) {
  return Boolean(
    t.match(/^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/) ||
      t.match(/\b(?:a las|las)\s+(\d{1,2})(?::(\d{2}))?\b/) ||
      t.match(/\b(\d{1,2}):(\d{2})\b/)
  )
}

export function describeDraft(draft = {}) {
  const lines = ["Borrador de la cita (ya lo dijo la clienta; NO lo vuelvas a pedir):"]
  if (draft.intent === "reschedule" || draft.intent === "cancel") {
    lines.push(
      draft.intent === "cancel"
        ? "Intención: CANCELAR. Pregunta el nombre de la clienta si falta. No agendes una cita nueva."
        : "Intención: REPROGRAMAR. Pregunta el nombre de la clienta si falta. No uses una cita ni un horario de un agendado anterior."
    )
    lines.push(
      draft.client_name
        ? `- nombre: ${draft.client_name}`
        : "- nombre: aún no lo dijo. PREGÚNTALO ahora. No llames reprogramar_cita ni cancelar_cita todavía."
    )
  }
  lines.push(
    draft.service_slug
      ? `- servicio: ${draft.service_name || draft.service_slug} (${draft.service_slug})`
      : "- servicio: aún no lo dijo"
  )
  lines.push(
    draft.requested_date
      ? `- fecha: ${draft.requested_date}`
      : "- fecha: aún no la dijo"
  )
  lines.push(
    draft.requested_hour != null
      ? `- hora: ${draft.requested_hour}:00`
      : "- hora: aún no la dijo"
  )
  if (
    draft.intent !== "reschedule" &&
    draft.intent !== "cancel" &&
    draft.service_slug &&
    draft.requested_date
  ) {
    lines.push(
      "Ya hay servicio y fecha. Llama listar_disponibilidad AHORA con esos valores y ofrece horarios. No preguntes otra vez el servicio ni la fecha."
    )
  }
  return lines.join("\n")
}
