import { getOpenAITools, executeTool } from "@/lib/tools/index.js"
import { runAgent } from "@/lib/agents/graph.js"

const SYSTEM_PROMPT = `Eres el asistente de Color Hair by Gabby. Puedes listar servicios, ver disponibilidad, crear/reprogramar/cancelar citas y crear items de prueba.

Antes de usar una herramienta, explica brevemente tu razonamiento. Responde en español, clara y concisa.`

async function logToolCall(entry) {
  try {
    const mod = await import("@/lib/audit.js")
    await mod.logToolCall?.(entry)
  } catch {
    // best-effort
  }
}

export function runRecoverDecideAct({ messages, conversationId }) {
  return runAgent({
    messages,
    conversationId,
    systemPrompt: SYSTEM_PROMPT,
    tools: getOpenAITools(),
    executeTool,
    onToolCall: logToolCall,
  })
}
