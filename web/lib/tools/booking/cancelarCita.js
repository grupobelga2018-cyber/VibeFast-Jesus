import { createAdminClient } from "@/lib/supabase/admin"
import { resolveOpenAppointment } from "@/lib/appointments/find"
import { notifyGabyAppointment } from "@/lib/telegram/notify"
import { sendTelegramMessage } from "@/lib/telegram/client"
import { deleteGoogleCalendarEvent } from "@/lib/google/calendar"

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

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", proposed_starts_at: null })
      .eq("id", found.appointment.appointment_id)
      .select()
      .single()

    if (error) return { ok: false, error: error.message }

    await deleteGoogleCalendarEvent(data).catch(() => {})
    await notifyGabyAppointment(data).catch(() => {})
    if (data.client_telegram_id) {
      await sendTelegramMessage(
        data.client_telegram_id,
        "Tu cita fue cancelada. Cuando quieras, coordinamos otra por este chat."
      ).catch(() => {})
    }

    return { ok: true, appointment: data }
  },
}
