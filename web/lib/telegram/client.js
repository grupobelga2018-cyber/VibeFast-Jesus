// Telegram Bot API helpers (server-only)

import { telegramWelcomePlainText } from "@/lib/telegram/welcome"

const TELEGRAM_API = "https://api.telegram.org"

export function getTelegramToken() {
  return process.env.TELEGRAM_BOT_TOKEN || ""
}

export function getTelegramWebhookSecret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET || ""
}

export function isTelegramConfigured() {
  return Boolean(getTelegramToken())
}

export function getAdminChatId() {
  return process.env.TELEGRAM_ADMIN_CHAT_ID || ""
}

export const TELEGRAM_START_LABEL = "INICIAR"

export const TELEGRAM_START_KEYBOARD = {
  keyboard: [[{ text: TELEGRAM_START_LABEL }]],
  resize_keyboard: true,
  is_persistent: true,
}

export function isTelegramStartText(text) {
  const raw = String(text || "").trim()
  if (raw.startsWith("/start") || raw.startsWith("/help")) return true
  const folded = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
  return (
    folded === "INICIAR" ||
    folded === "INICIA CONVERSACION" ||
    folded === "REINICIAR"
  )
}

let commandsSynced = false
let descriptionSynced = false

export async function syncTelegramCommands() {
  if (!getTelegramToken()) return
  if (!commandsSynced) {
    commandsSynced = true
    await telegramApi("setMyCommands", {
      commands: [
        { command: "start", description: "Inicia conversación" },
        { command: "help", description: "Ver servicios" },
        { command: "id", description: "Ver tu chat ID" },
      ],
    })
  }
  if (!descriptionSynced) {
    descriptionSynced = true
    await telegramApi("setMyDescription", {
      description: telegramWelcomePlainText().slice(0, 512),
    })
  }
}

export const TELEGRAM_ALLOWED_UPDATES = [
  "message",
  "edited_message",
  "callback_query",
]

export function isGabyTelegramUser(fromId, chatId) {
  const admin = getAdminChatId()
  if (!admin) return false
  return String(fromId) === admin || String(chatId) === admin
}

export async function telegramApi(method, payload) {
  const token = getTelegramToken()
  if (!token) return { ok: false, error: "missing_token" }

  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: payload === undefined ? "GET" : "POST",
    headers: payload === undefined ? undefined : { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.ok === false) {
    console.error(`[telegram] ${method}:`, body.description || res.statusText)
    return { ok: false, error: body.description || res.statusText, result: body.result }
  }
  return { ok: true, result: body.result }
}

export async function sendTelegramMessage(chatId, text, extra = {}) {
  if (!chatId || !getTelegramToken()) {
    return { ok: false, skipped: true, reason: "missing_token_or_chat" }
  }

  const { parse_mode = "HTML", ...rest } = extra
  const payload = {
    chat_id: chatId,
    text: String(text || "").slice(0, 4096),
    ...rest,
  }
  if (parse_mode) payload.parse_mode = parse_mode

  const result = await telegramApi("sendMessage", payload)
  if (!result.ok && payload.parse_mode) {
    delete payload.parse_mode
    return telegramApi("sendMessage", payload)
  }
  return result
}

export function verifyTelegramSecret(request) {
  const expected = getTelegramWebhookSecret()
  if (!expected) return true // allow in local if unset
  const header = request.headers.get("x-telegram-bot-api-secret-token")
  return header === expected
}

export function verifyTelegramSetupKey(request) {
  const expected = getTelegramWebhookSecret()
  if (!expected) return process.env.NODE_ENV !== "production"
  const url = new URL(request.url)
  const key = url.searchParams.get("key") || request.headers.get("x-telegram-setup-key")
  return key === expected
}
