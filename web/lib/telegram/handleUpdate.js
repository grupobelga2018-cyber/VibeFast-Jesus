import config from "@/config"
import { runBookingAgent } from "@/lib/agents/bookingAgent"
import {
  confirmAppointment,
  rejectAppointment,
} from "@/lib/appointments/lifecycle"
import {
  formatAppointmentWhen,
  displayServiceName,
} from "@/lib/appointments/helpers"
import {
  isGabyTelegramUser,
  sendTelegramMessage,
  telegramApi,
  isTelegramStartText,
  syncTelegramCommands,
  TELEGRAM_START_KEYBOARD,
} from "@/lib/telegram/client"
import {
  loadTelegramConversation,
  resetTelegramConversation,
  saveTelegramConversation,
} from "@/lib/telegram/conversation"
import { extractBookingDraft } from "@/lib/telegram/draft"
import { telegramWelcomeText } from "@/lib/telegram/welcome"

const MAX_HISTORY = 12
const CALLBACK_RE = /^(a|r):(ok|no):([0-9a-f-]{36})$/i

function offlineReply() {
  const services = config.services
    .map((s) => `• ${s.name} (${s.durationMin} min, desde $${s.priceFrom})`)
    .join("\n")
  return [
    `Gracias por escribir a <b>${config.app.name}</b>.`,
    "",
    "Servicios:",
    services,
    "",
    `Mientras conectamos el asistente, reserva en línea: ${config.booking.calendlyUrl}`,
    "Cuando esté listo, coordinamos por este chat y Gaby confirma el cupo.",
  ].join("\n")
}

export async function handleTelegramUpdate(update) {
  if (update?.callback_query) {
    return handleCallbackQuery(update.callback_query)
  }

  const message = update?.message || update?.edited_message
  if (!message?.chat?.id) {
    return { ok: true, ignored: true }
  }

  const chatId = String(message.chat.id)
  const text = (message.text || "").trim()
  if (!text) return { ok: true, ignored: true }

  try {
    await syncTelegramCommands()
    const reply = await handleChatMessage({
      chatId,
      text,
      from: message.from,
    })
    await sendTelegramMessage(chatId, reply, {
      reply_markup: TELEGRAM_START_KEYBOARD,
    })
    return { ok: true, chatId }
  } catch (err) {
    console.error("[telegram] handler:", err)
    await sendTelegramMessage(
      chatId,
      "Lo siento, tuve un problema. Intenta de nuevo en un momento."
    ).catch(() => {})
    return { ok: false, error: err.message }
  }
}

async function handleCallbackQuery(query) {
  const chatId = query.message?.chat?.id
  const messageId = query.message?.message_id
  const fromId = query.from?.id
  const parsed = String(query.data || "").match(CALLBACK_RE)

  if (!isGabyTelegramUser(fromId, chatId)) {
    await telegramApi("answerCallbackQuery", {
      callback_query_id: query.id,
      text: "Solo Gaby puede confirmar la disponibilidad.",
      show_alert: true,
    })
    return { ok: false, error: "not_admin" }
  }

  if (!parsed) {
    await telegramApi("answerCallbackQuery", {
      callback_query_id: query.id,
      text: "Acción no válida",
    })
    return { ok: true, ignored: true }
  }

  const reschedule = parsed[1] === "r"
  const accept = parsed[2] === "ok"
  const appointmentId = parsed[3]
  const result = accept
    ? await confirmAppointment(appointmentId, { reschedule })
    : await rejectAppointment(appointmentId, { reschedule })

  const toast = result.ok
    ? accept
      ? "Disponibilidad confirmada. Cita registrada."
      : "Marcaste sin cupo."
    : result.error || "No se pudo actualizar"

  await telegramApi("answerCallbackQuery", {
    callback_query_id: query.id,
    text: toast,
    show_alert: !result.ok,
  })

  if (chatId && messageId) {
    const appt = result.appointment
    const serviceName = appt ? displayServiceName(appt) : ""
    const when = appt ? formatAppointmentWhen(appt.starts_at) : ""
    const body = result.ok
      ? accept
        ? [
            `<b>Cita registrada</b>`,
            `Clienta: ${appt.client_name || "—"}`,
            `Servicio: ${serviceName}`,
            `Cuándo: ${when}`,
            "Ya le enviamos la confirmación por Telegram.",
          ].join("\n")
        : [
            `<b>Sin cupo</b>`,
            `Clienta: ${appt?.client_name || "—"}`,
            "Le avisamos para que elija otro horario.",
          ].join("\n")
      : `<b>No se pudo actualizar</b>\n${toast}`

    await telegramApi("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: body,
      parse_mode: "HTML",
    })
  }

  return { ok: Boolean(result.ok), appointmentId }
}

async function handleChatMessage({ chatId, text, from }) {
  if (text.startsWith("/id")) {
    return `Tu chat ID de Telegram es <code>${chatId}</code>`
  }

  if (isTelegramStartText(text) && !text.startsWith("/id")) {
    await resetTelegramConversation(chatId).catch(() => {})
    return telegramWelcomeText()
  }

  if (!process.env.OPENAI_API_KEY) {
    return offlineReply()
  }

  const conv = await loadTelegramConversation(chatId)
  const draft = extractBookingDraft(text, conv.draft || {})
  const history = Array.isArray(conv.messages) ? conv.messages : []
  const messages = [
    ...history.slice(-MAX_HISTORY),
    { role: "user", content: text },
  ]

  const agentMessages =
    !history.length && from?.first_name
      ? [
          {
            role: "user",
            content: `(Mi nombre en Telegram es ${from.first_name}${from.last_name ? ` ${from.last_name}` : ""}. Úsalo como client_name por defecto si no digo otro.)`,
          },
          ...messages,
        ]
      : messages

  const reply = await runBookingAgent({
    messages: agentMessages,
    chatId,
    draft,
  })

  const nextMessages = [
    ...history,
    { role: "user", content: text },
    { role: "assistant", content: reply },
  ].slice(-MAX_HISTORY)

  await saveTelegramConversation({
    chat_id: chatId,
    state: "active",
    messages: nextMessages,
    draft,
  })

  return reply
}
