import { NextResponse } from "next/server"
import {
  getTelegramWebhookSecret,
  telegramApi,
  TELEGRAM_ALLOWED_UPDATES,
  verifyTelegramSetupKey,
} from "@/lib/telegram/client"

export const runtime = "nodejs"

function webhookUrl(request, override) {
  if (override) return override
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
  if (appUrl) return `${appUrl}/api/telegram/webhook`
  const { origin } = new URL(request.url)
  return `${origin}/api/telegram/webhook`
}

export async function GET(request) {
  if (!verifyTelegramSetupKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const me = await telegramApi("getMe")
  const webhook = await telegramApi("getWebhookInfo")
  return NextResponse.json({
    ok: Boolean(me.ok),
    bot: me.result || null,
    webhook: webhook.result || null,
    error: me.error || webhook.error || null,
  })
}

export async function POST(request) {
  if (!verifyTelegramSetupKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const url = webhookUrl(request, body.url)
  if (!url.startsWith("https://")) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Telegram solo acepta HTTPS. En local usa /api/telegram/poll?key=... o un túnel (ngrok). En producción: NEXT_PUBLIC_APP_URL=https://tudominio.com",
        url,
      },
      { status: 400 }
    )
  }

  const secret = getTelegramWebhookSecret()
  const webhook = await telegramApi("setWebhook", {
    url,
    secret_token: secret || undefined,
    allowed_updates: TELEGRAM_ALLOWED_UPDATES,
    drop_pending_updates: true,
  })

  await telegramApi("setMyCommands", {
    commands: [
      { command: "start", description: "Inicia conversación" },
      { command: "help", description: "Ver servicios" },
      { command: "id", description: "Ver tu chat ID" },
    ],
  })

  const info = await telegramApi("getWebhookInfo")
  return NextResponse.json({
    ok: Boolean(webhook.ok),
    url,
    webhook: info.result || null,
    error: webhook.error || null,
  })
}

export async function DELETE(request) {
  if (!verifyTelegramSetupKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await telegramApi("deleteWebhook", { drop_pending_updates: true })
  return NextResponse.json(result)
}
