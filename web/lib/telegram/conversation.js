import { createAdminClient } from "@/lib/supabase/admin"

const memory = new Map()

function emptyConversation(chatId) {
  return {
    chat_id: chatId,
    state: "active",
    messages: [],
    draft: {},
  }
}

export async function loadTelegramConversation(chatId) {
  if (memory.has(chatId)) return memory.get(chatId)

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("telegram_conversations")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle()

    if (error) {
      console.warn("[telegram] load conv:", error.message)
    } else if (data) {
      memory.set(chatId, data)
      return data
    }
  } catch (err) {
    console.warn("[telegram] load conv:", err.message)
  }

  const local = emptyConversation(chatId)
  memory.set(chatId, local)
  return local
}

export async function saveTelegramConversation(row) {
  const next = {
    chat_id: String(row.chat_id),
    state: row.state || "active",
    messages: Array.isArray(row.messages) ? row.messages : [],
    draft: row.draft && typeof row.draft === "object" ? row.draft : {},
    updated_at: new Date().toISOString(),
  }
  memory.set(next.chat_id, next)

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("telegram_conversations").upsert(next)
    if (error) console.warn("[telegram] save conv:", error.message)
  } catch (err) {
    console.warn("[telegram] save conv:", err.message)
  }

  return next
}

export async function resetTelegramConversation(chatId) {
  return saveTelegramConversation(emptyConversation(chatId))
}
