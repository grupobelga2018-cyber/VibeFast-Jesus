import config from "@/config"
import {
  formatAppointmentWhen,
  getService,
  cleanClientName,
} from "@/lib/appointments/helpers"
import { loadGoogleCalendarAuth } from "@/lib/google/calendar"
import {
  getAdminChatId,
  isTelegramConfigured,
  sendTelegramMessage,
} from "@/lib/telegram/client"

function gabyKeyboard(appointmentId, rescheduled) {
  const prefix = rescheduled ? "r" : "a"
  return {
    inline_keyboard: [
      [
        {
          text: "Confirmar disponibilidad",
          callback_data: `${prefix}:ok:${appointmentId}`,
        },
        {
          text: "Sin cupo",
          callback_data: `${prefix}:no:${appointmentId}`,
        },
      ],
    ],
  }
}

export async function notifyGabyAppointment(
  appointment,
  { rescheduled = false, googleError = null } = {}
) {
  if (!isTelegramConfigured()) return { ok: false, skipped: true }
  const adminChatId = getAdminChatId()
  if (!adminChatId) return { ok: false, skipped: true, reason: "no_admin_chat" }

  const service = getService(appointment.service_slug)
  const proposed = appointment.proposed_starts_at
  const when = formatAppointmentWhen(appointment.starts_at)
  const proposedWhen = proposed ? formatAppointmentWhen(proposed) : null
  const waiting =
    appointment.channel === "telegram" &&
    (appointment.status === "pending" || Boolean(proposed))
  const calendarEmail = (await loadGoogleCalendarAuth())?.email || ""
  const googleLine = appointment.google_event_id
    ? `Google Calendar: ya está en calendar.google.com${calendarEmail ? ` (${calendarEmail})` : ""}.`
    : googleError
      ? `Google Calendar: no se grabó (${googleError}).`
      : "Google Calendar: aún no se grabó."

  const lines = waiting
    ? [
        rescheduled
          ? "<b>Reprogramar · confirma el nuevo horario</b>"
          : "<b>Nueva cita por Telegram · confirma disponibilidad</b>",
        `Clienta: ${cleanClientName(appointment.client_name) || "—"}`,
        `Servicio: ${service?.name || appointment.service_slug}`,
        rescheduled && proposedWhen
          ? `Ahora: ${when}`
          : `Cuándo: ${proposedWhen || when}`,
        rescheduled && proposedWhen ? `Quiere cambiar a: ${proposedWhen}` : null,
        appointment.client_phone ? `Tel: ${appointment.client_phone}` : null,
        appointment.notes ? `Notas: ${appointment.notes}` : null,
        "",
        `Salón: ${config.app.name}`,
      ]
    : [
        `<b>Cita ${rescheduled ? "reprogramada" : "nueva"}</b> (${appointment.channel})`,
        `Estado: ${appointment.status}`,
        `Clienta: ${cleanClientName(appointment.client_name) || "—"}`,
        `Servicio: ${service?.name || appointment.service_slug}`,
        `Cuándo: ${when}`,
        appointment.client_phone ? `Tel: ${appointment.client_phone}` : null,
        appointment.notes ? `Notas: ${appointment.notes}` : null,
        appointment.calendly_event_uri
          ? "Calendly: ya está en el calendario."
          : null,
        googleLine,
      ]

  return sendTelegramMessage(adminChatId, lines.filter(Boolean).join("\n"), {
    reply_markup: waiting
      ? gabyKeyboard(appointment.id, rescheduled)
      : undefined,
  })
}
