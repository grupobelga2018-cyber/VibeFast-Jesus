import { resolveOpenAppointment } from "@/lib/appointments/find"
import { notifyGabyAppointment } from "@/lib/telegram/notify"
import { cancelAppointment } from "@/lib/appointments/lifecycle"

export const cancelarCita = {
  name: "cancelar_cita",
  description:
    "Cancela una cita por nombre o id, incluidas las hechas en Calendly o en el dashboard. Si no tienes el nombre, pregúntalo y usa buscar_citas. No digas que hay que cancelarla a mano en Calendly: esta herramienta también la cancela ahí.",
  parameters: {
    type: "object",
    properties: {
      appointment_id: { type: "string" },
      client_name: {
        type: "string",
        description: "Nombre de la clienta. Obligatorio si no hay appointment_id.",
      },
    },
    additionalProperties: false,
  },
  async execute({ appointment_id = null, client_name = null }) {
    if (!appointment_id && !String(client_name || "").trim()) {
      return {
        ok: false,
        error: "falta_nombre",
        message: "Pregunta el nombre de la clienta antes de cancelar.",
      }
    }

    const found = await resolveOpenAppointment({ appointment_id, client_name })
    if (!found.ok) return found

    const result = await cancelAppointment(found.appointment.appointment_id, {
      notifyClient: true,
    })
    if (!result.ok) return result

    await notifyGabyAppointment(result.appointment).catch(() => {})
    const parts = ["Cita cancelada."]
    if (result.calendlyRemoved) parts.push("También se canceló en Calendly.")
    else if (result.calendlyError) {
      parts.push(
        `Calendly no se pudo cancelar (${result.calendlyError}). Hay que cancelarla también en Calendly para liberar el cupo.`
      )
    }
    if (result.calendarRemoved) parts.push("Se eliminó de Google Calendar.")
    return {
      ok: true,
      appointment: result.appointment,
      message: parts.join(" "),
    }
  },
}
