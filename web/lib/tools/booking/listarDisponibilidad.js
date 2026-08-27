import { getAvailableSlots } from "@/lib/appointments/availability"
import { salonLocalToUtc, salonTodayIso } from "@/lib/appointments/helpers"

function daysUntil(requestedDate) {
  const [y, m, d] = String(requestedDate || "").split("-").map(Number)
  if (!y || !m || !d) return 14
  const target = salonLocalToUtc(y, m, d, 18, 0)
  const [ty, tm, td] = salonTodayIso().split("-").map(Number)
  const start = salonLocalToUtc(ty, tm, td, 0, 0)
  const diff = Math.ceil((target.getTime() - start.getTime()) / 86_400_000)
  return Math.min(21, Math.max(14, diff + 2))
}

export const listarDisponibilidad = {
  name: "listar_disponibilidad",
  description:
    "Consulta horarios libres. Úsala SIEMPRE que la clienta quiera agendar o nombre un día/fecha/hora. Devuelve el weekday real; no corrijas el calendario de memoria.",
  parameters: {
    type: "object",
    properties: {
      service_slug: {
        type: "string",
        description: "Slug del servicio (corte, color, peinado, facial, maquillaje).",
      },
      days: {
        type: "number",
        description: "Días hacia adelante (default 14, máximo 21).",
      },
      requested_date: {
        type: "string",
        description:
          "Fecha pedida YYYY-MM-DD en hora de México. Ej. miércoles 19 de agosto 2026 → 2026-08-19.",
      },
      requested_hour: {
        type: "number",
        description:
          "Hora pedida 0-23 en hora de México (ej. 15 para las 3 pm). Omítela si aún no la dijo.",
      },
      requested_at: {
        type: "string",
        description: "Fecha/hora ISO si ya la tienes.",
      },
    },
    additionalProperties: false,
  },
  async execute(args = {}) {
    const days =
      args.days || (args.requested_date ? daysUntil(args.requested_date) : 14)
    return getAvailableSlots({
      service_slug: args.service_slug || "corte",
      days,
      requested_date: args.requested_date,
      requested_hour: args.requested_hour,
      requested_at: args.requested_at,
    })
  },
}
