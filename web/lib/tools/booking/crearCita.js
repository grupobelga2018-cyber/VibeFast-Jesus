import {
  endsAtFromStart,
  formatAppointmentWhen,
  zonedParts,
} from "@/lib/appointments/helpers"
import { snapToAvailableSlot } from "@/lib/appointments/availability"
import { requestTelegramBooking } from "@/lib/appointments/lifecycle"
import config from "@/config"

export const crearCita = {
  name: "crear_cita",
  description:
    "Agenda la cita si el horario está libre. Revisa Calendly (o la agenda local) y, si hay cupo, la registra en el calendario. No la uses si solo preguntaron precios o saludaron.",
  parameters: {
    type: "object",
    properties: {
      client_name: { type: "string", description: "Nombre de la clienta." },
      client_phone: { type: "string", description: "Teléfono opcional." },
      client_email: {
        type: "string",
        description: "Correo para Calendly. Si no lo da, se usa uno de Telegram.",
      },
      service_slug: {
        type: "string",
        description: "Slug del servicio (corte, color, peinado, facial, maquillaje).",
      },
      starts_at: {
        type: "string",
        description:
          "Copia EXACTA de slots_that_day[].starts_at o requested.starts_at (ISO con Z). No conviertas a hora local ni inventes la fecha.",
      },
      local_hour: {
        type: "number",
        description:
          "Hora 0-23 en México que eligió la clienta (ej. 10 para las 10:00 a.m.).",
      },
      requested_date: {
        type: "string",
        description: "Fecha YYYY-MM-DD en México.",
      },
      telegram_chat_id: {
        type: "string",
        description: "chat_id de Telegram de la clienta.",
      },
      notes: { type: "string", description: "Notas opcionales." },
    },
    required: ["client_name", "service_slug", "starts_at", "telegram_chat_id"],
    additionalProperties: false,
  },
  async execute({
    client_name,
    client_phone = null,
    client_email = null,
    service_slug,
    starts_at,
    local_hour = null,
    requested_date = null,
    offered_slots = null,
    telegram_chat_id,
    notes = null,
  }) {
    const service = config.services.find((s) => s.slug === service_slug)
    if (!service) return { ok: false, error: `Servicio desconocido: ${service_slug}` }

    const start = await snapToAvailableSlot({
      starts_at,
      service_slug,
      local_hour,
      requested_date,
      offered_slots,
    })
    if (!start) {
      return { ok: false, error: "starts_at inválido" }
    }
    console.log(
      "[crear_cita] raw",
      starts_at,
      "local_hour",
      local_hour,
      "→",
      start.toISOString(),
      formatAppointmentWhen(start)
    )

    const result = await requestTelegramBooking({
      client_name,
      client_phone,
      client_email,
      client_telegram_id: String(telegram_chat_id),
      service_slug,
      starts_at: start.toISOString(),
      ends_at: endsAtFromStart(start, service_slug).toISOString(),
      notes,
    })

    return {
      ...result,
      starts_at: start.toISOString(),
      when: formatAppointmentWhen(start),
      local_hour: zonedParts(start).hour,
    }
  },
}
