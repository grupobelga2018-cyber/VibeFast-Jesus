import { resolveOpenAppointment } from "@/lib/appointments/find"
import { notifyGabyAppointment } from "@/lib/telegram/notify"
import { cancelAppointment } from "@/lib/appointments/lifecycle"

export const cancelarCita = {
  name: "cancelar_cita",
  description:
    "Cancela una cita por nombre de la clienta o por id. Si no tienes el nombre, pregúntalo y usa buscar_citas.",
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
    return {
      ok: true,
      appointment: result.appointment,
      message: result.calendarRemoved
        ? "Cita cancelada y eliminada de Google Calendar."
        : "Cita cancelada.",
    }
  },
}
