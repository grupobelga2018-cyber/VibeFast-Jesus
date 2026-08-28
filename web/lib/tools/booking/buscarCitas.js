import { findUpcomingAppointments } from "@/lib/appointments/find"

export const buscarCitas = {
  name: "buscar_citas",
  description:
    "Busca citas próximas por el nombre de la clienta en el salón y en Calendly. Úsala al reprogramar o cancelar. No digas que no existe una cita de Calendly sin haber llamado esta herramienta.",
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
