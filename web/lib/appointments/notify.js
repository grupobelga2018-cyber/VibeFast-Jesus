import {
  formatAppointmentWhen,
  getService,
} from "@/lib/appointments/helpers"
import { sendTelegramMessage, isTelegramConfigured } from "@/lib/telegram/client"
import { loadGoogleCalendarAuth } from "@/lib/google/calendar"
import config from "@/config"

function serviceWhen(appointment, startsAt = appointment.starts_at) {
  const service = getService(appointment.service_slug)
  const when = formatAppointmentWhen(startsAt)
  return { service, when }
}

export async function sendAppointmentConfirmation(
  appointment,
  { reminder = false, rescheduled = false, calendarSynced = null } = {}
) {
  if (!appointment?.client_telegram_id || !isTelegramConfigured()) {
    return { ok: false, skipped: true }
  }

  const { service, when } = serviceWhen(appointment)
  const title = reminder
    ? "Recordatorio: tu cita es mañana"
    : rescheduled
      ? "Cita reprogramada"
      : "Cita confirmada"

  const calendarEmail = (await loadGoogleCalendarAuth())?.email || ""
  const onCalendar =
    calendarSynced == null
      ? Boolean(appointment.google_event_id || appointment.calendly_event_uri)
      : Boolean(calendarSynced)

  const text = [
    `<b>${title}</b>`,
    `Salón: ${config.app.name}`,
    `Servicio: ${service?.name || appointment.service_slug}`,
    `Cuándo: ${when}`,
    appointment.client_name ? `A nombre de: ${appointment.client_name}` : null,
    onCalendar && appointment.google_event_id
      ? `Quedó en Google Calendar${calendarEmail ? ` (${calendarEmail})` : ""}. Ábrelo con esa cuenta.`
      : onCalendar && appointment.calendly_event_uri
        ? "Quedó en Calendly; eso no es Google Calendar."
        : null,
    "",
    reminder
      ? "Si necesitas reprogramar, responde a este chat."
      : "Si necesitas reprogramar, escríbenos por este chat.",
  ]
    .filter((line) => line !== null)
    .join("\n")

  return sendTelegramMessage(appointment.client_telegram_id, text)
}

export async function sendAppointmentReminder(appointment) {
  return sendAppointmentConfirmation(appointment, { reminder: true })
}

export async function sendWaitingForGaby(appointment, { rescheduled = false } = {}) {
  if (!appointment?.client_telegram_id || !isTelegramConfigured()) {
    return { ok: false, skipped: true }
  }

  const starts = appointment.proposed_starts_at || appointment.starts_at
  const { service, when } = serviceWhen(appointment, starts)
  const text = [
    rescheduled
      ? "<b>Pedimos el cambio a Gaby</b>"
      : "<b>Pedimos el horario a Gaby</b>",
    `Servicio: ${service?.name || appointment.service_slug}`,
    `Cuándo: ${when}`,
    "",
    "Gaby confirmará la disponibilidad. Te aviso por este chat cuando la cita quede registrada.",
  ].join("\n")

  return sendTelegramMessage(appointment.client_telegram_id, text)
}

export async function sendSlotUnavailable(appointment) {
  if (!appointment?.client_telegram_id || !isTelegramConfigured()) {
    return { ok: false, skipped: true }
  }
  return sendTelegramMessage(
    appointment.client_telegram_id,
    [
      "<b>Ese horario no está disponible</b>",
      "Gaby no pudo confirmar el cupo.",
      "Escríbeme otra fecha y hora y lo coordinamos de nuevo.",
    ].join("\n")
  )
}

export async function sendRescheduleRejected(appointment) {
  if (!appointment?.client_telegram_id || !isTelegramConfigured()) {
    return { ok: false, skipped: true }
  }
  const { service, when } = serviceWhen(appointment)
  return sendTelegramMessage(
    appointment.client_telegram_id,
    [
      "<b>No se pudo cambiar ese horario</b>",
      `Tu cita sigue: ${service?.name || appointment.service_slug} · ${when}`,
      "Si quieres, proponme otra fecha.",
    ].join("\n")
  )
}
