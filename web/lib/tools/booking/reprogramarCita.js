import { requestTelegramReschedule } from "@/lib/appointments/lifecycle"
import { snapToAvailableSlot } from "@/lib/appointments/availability"

export const reprogramarCita = {
  name: "reprogramar_cita",
  description:
    "Cambia el horario de una cita ya identificada por nombre o id. Si aún no tienes el nombre, no la uses: pregunta el nombre y llama buscar_citas.",
  parameters: {
    type: "object",
    properties: {
      appointment_id: { type: "string", description: "UUID de la cita, si ya la buscaste." },
      client_name: {
        type: "string",
        description: "Nombre de la clienta. Obligatorio si no hay appointment_id.",
      },
      starts_at: {
        type: "string",
        description: "Nueva fecha/hora ISO 8601 del cupo elegido.",
      },
      local_hour: {
        type: "number",
        description: "Hora 0-23 en México que eligió.",
      },
      requested_date: {
        type: "string",
        description: "Fecha YYYY-MM-DD en México.",
      },
      service_slug: {
        type: "string",
        description: "Slug del servicio, si se conoce.",
      },
    },
    required: ["starts_at"],
    additionalProperties: false,
  },
  async execute({
    appointment_id = null,
    client_name = null,
    starts_at,
    local_hour = null,
    requested_date = null,
    offered_slots = null,
    service_slug = "corte",
  }) {
    if (!appointment_id && !String(client_name || "").trim()) {
      return {
        ok: false,
        error: "falta_nombre",
        message: "Pregunta el nombre de la clienta antes de reprogramar.",
      }
    }

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

    return requestTelegramReschedule({
      appointment_id,
      client_name,
      starts_at: start.toISOString(),
    })
  },
}
