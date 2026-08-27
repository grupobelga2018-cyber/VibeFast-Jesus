import config from "@/config"

export const listarServicios = {
  name: "listar_servicios",
  description: "Lista los servicios del salón con duración y precio orientativo.",
  parameters: {
    type: "object",
    properties: {},
    additionalProperties: false,
  },
  async execute() {
    return {
      ok: true,
      services: config.services.map((s) => ({
        slug: s.slug,
        name: s.name,
        durationMin: s.durationMin,
        priceFrom: s.priceFrom,
        currency: s.currency,
        description: s.description,
      })),
    }
  },
}
