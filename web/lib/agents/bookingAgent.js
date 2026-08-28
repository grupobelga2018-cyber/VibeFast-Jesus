import config from "@/config"
import { calendarContextForPrompt } from "@/lib/appointments/helpers"
import { describeDraft } from "@/lib/telegram/draft"
import {
  getOpenAITools,
  executeTool,
  BOOKING_TOOL_NAMES,
} from "@/lib/tools/index.js"
import { runAgent } from "@/lib/agents/graph.js"

const SERVICE_LINES = config.services
  .map(
    (s) =>
      `- ${s.slug}: ${s.name} (${s.durationMin} min, desde $${s.priceFrom} ${s.currency})`
  )
  .join("\n")

function buildSystemPrompt(chatId, draft = {}) {
  const cal = calendarContextForPrompt(16)
  return `Eres el asistente de ${config.app.name}. Hablas en español, cálida y clara.

Hoy es ${cal.nowLabel}. Fecha ISO de hoy: ${cal.todayIso}. Zona: ${config.booking.timezone}.
El salón abre lunes a sábado de 10:00 a 18:00. Domingo cerrado. Si piden sábado, llama listar_disponibilidad; no digas que no hay sábado.

Calendario real (no lo contradigas):
${cal.upcoming}

${describeDraft(draft)}

Usa TODO el hilo. No vuelvas a pedir un dato que ya está en el borrador o en mensajes previos.

NO uses herramientas de calendario si la clienta solo saluda, pregunta precios, servicios, duración o cómo llegar.

Si pide agendar (no reprogramar ni cancelar) o el borrador de una cita NUEVA ya tiene fecha, llama listar_disponibilidad en ese mismo turno. No corrijas el día de la semana.

Flujo para AGENDAR:
1. Solo pregunta el servicio si el borrador no lo tiene.
2. Solo pregunta fecha/hora si el borrador no tiene fecha.
3. Con servicio y fecha, llama listar_disponibilidad (requested_date YYYY-MM-DD, requested_hour si hay hora, service_slug del borrador) y ofrece slots_that_day.label. El día es slots_that_day[].local_date / weekday; no lo cambies.
4. Si eligió un horario (o requested.available y hay hora) y ya tienes su nombre, llama crear_cita. Pasa local_hour (0-23 en México, ej. 10 si dijo las 10) y requested_date del borrador. Copia starts_at del slot de ESE mismo local_date. No pases el cupo de otro día.
5. Si crear_cita ok=true, confirma con el campo when de la herramienta. No inventes otra hora.

Flujo para REPROGRAMAR o CANCELAR:
1. Pregunta el nombre de la clienta. No adivines. No uses la primera cita del chat.
2. Con el nombre, llama buscar_citas. Si hay varias, pregunta cuál (día y hora).
3. Reprogramar: pregunta el horario nuevo, llama listar_disponibilidad con requested_date y luego reprogramar_cita con client_name, appointment_id, local_hour y requested_date. Confirma con el when de la herramienta.
4. Cancelar: cancelar_cita con client_name (y appointment_id si lo tienes). Sirve igual si la cita se hizo en Calendly.
5. No llames reprogramar_cita ni cancelar_cita sin el nombre. No digas que una cita de Calendly no se puede cancelar por Telegram.

Servicios:
${SERVICE_LINES}

Reglas:
- telegram_chat_id="${chatId}" en crear_cita.
- Habla en hora local de México, no en UTC. Nunca restes ni sumes horas al starts_at.
- No inventes que un horario está ocupado.
- Respuestas cortas, amables, sin markdown excesivo.`
}


async function logToolCall(entry) {
  try {
    const mod = await import("@/lib/audit.js")
    await mod.logToolCall?.(entry)
  } catch {
    // best-effort
  }
}

/** Consume el agente y devuelve el texto final para Telegram. */
export async function runBookingAgent({ messages, chatId, draft = {} }) {
  const execute = async (name, args = {}) => {
    const merged = { ...args }
    if (
      name === "listar_disponibilidad" ||
      name === "crear_cita" ||
      name === "reprogramar_cita"
    ) {
      if (draft.requested_date) merged.requested_date = draft.requested_date
      if (merged.local_hour == null && draft.requested_hour != null) {
        merged.local_hour = draft.requested_hour
      }
      if (
        name === "listar_disponibilidad" &&
        merged.requested_hour == null &&
        draft.requested_hour != null
      ) {
        merged.requested_hour = draft.requested_hour
      }
      if (name !== "listar_disponibilidad") {
        if (!merged.service_slug && draft.service_slug) {
          merged.service_slug = draft.service_slug
        }
        if (draft.offered_slots) merged.offered_slots = draft.offered_slots
      }
    }
    if (
      (name === "reprogramar_cita" ||
        name === "cancelar_cita" ||
        name === "buscar_citas") &&
      !merged.client_name &&
      draft.client_name
    ) {
      merged.client_name = draft.client_name
    }
    if (name === "reprogramar_cita" && !merged.appointment_id && draft.appointment_id) {
      merged.appointment_id = draft.appointment_id
    }

    const result = await executeTool(name, merged)

    if (name === "buscar_citas" && result?.ok && result.appointments?.length === 1) {
      draft.appointment_id = result.appointments[0].appointment_id
      draft.client_name = result.appointments[0].client_name
      draft.service_slug = result.appointments[0].service_slug
    }

    if (name === "listar_disponibilidad" && result?.ok) {
      const dateIso = draft.requested_date
      const offered = result.slots_that_day?.length
        ? result.slots_that_day
        : result.slots || []
      draft.offered_slots = offered
        .filter((s) => !dateIso || s.local_date === dateIso)
        .map((s) => ({
          starts_at: s.starts_at,
          local_hour: s.local_hour,
          local_date: s.local_date,
          label: s.label,
        }))
      if (!draft.requested_date && result.requested?.local_date) {
        draft.requested_date = result.requested.local_date
      }
    }

    return result
  }

  const tokens = []
  for await (const event of runAgent({
    messages,
    systemPrompt: buildSystemPrompt(String(chatId), draft),
    tools: getOpenAITools(BOOKING_TOOL_NAMES),
    executeTool: execute,
    onToolCall: logToolCall,
    maxSteps: 8,
  })) {
    if (event.type === "tool_call") tokens.length = 0
    if (event.type === "token") tokens.push(event.text)
    if (event.type === "error") {
      return "Hubo un problema al procesar tu mensaje. Intenta de nuevo en un momento."
    }
  }

  const text = tokens.join("").trim()
  return (
    text ||
    "Listo. Si necesitas algo más (agendar, reprogramar o cancelar), dímelo."
  )
}
