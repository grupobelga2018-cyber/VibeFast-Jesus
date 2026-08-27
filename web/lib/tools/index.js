// ============================================================
// Tools · registry central
// ------------------------------------------------------------
// Booking tools (citas) + ejemplo crear_item.
// ============================================================

import { crearItem } from "./examples/crearItem.js"
import { listarServicios } from "./booking/listarServicios.js"
import { listarDisponibilidad } from "./booking/listarDisponibilidad.js"
import { buscarCitas } from "./booking/buscarCitas.js"
import { crearCita } from "./booking/crearCita.js"
import { reprogramarCita } from "./booking/reprogramarCita.js"
import { cancelarCita } from "./booking/cancelarCita.js"

const registry = new Map()

export function registerTool({ name, description, parameters, execute }) {
  registry.set(name, { name, description, parameters, execute })
}

export function getOpenAITools(names) {
  const all = [...registry.values()]
  const filtered = names?.length
    ? all.filter((t) => names.includes(t.name))
    : all
  return filtered.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))
}

export async function executeTool(name, args) {
  const tool = registry.get(name)
  if (!tool) throw new Error(`Tool ${name} no registrada`)
  return tool.execute(args)
}

;[
  crearItem,
  listarServicios,
  listarDisponibilidad,
  buscarCitas,
  crearCita,
  reprogramarCita,
  cancelarCita,
].forEach(registerTool)

export const BOOKING_TOOL_NAMES = [
  "listar_servicios",
  "listar_disponibilidad",
  "buscar_citas",
  "crear_cita",
  "reprogramar_cita",
  "cancelar_cita",
]
