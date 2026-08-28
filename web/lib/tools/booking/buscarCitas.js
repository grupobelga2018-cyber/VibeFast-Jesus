import { findUpcomingAppointments } from "@/lib/appointments/find"

export const buscarCitas = {
  name: "buscar_citas",
  description:
    "Busca citas próximas por el nombre de la clienta, incluidas las de Calendly y el dashboard. Úsala al reprogramar o cancelar, después de preguntar el nombre. No adivines el nombre.",
  parameters: {
    type: "object",
    properties: {
      client_name: {
        type: "string",
        description: "Nombre de la clienta, tal como lo dijo.",
      },
    },
    required: ["client_name"],
    additionalProperties: false,
  },
  async execute({ client_name }) {
    return findUpcomingAppointments({ client_name })
  },
}
