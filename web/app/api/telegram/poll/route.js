import { NextResponse } from "next/server"
import { telegramApi, TELEGRAM_ALLOWED_UPDATES, verifyTelegramSetupKey } from "@/lib/telegram/client"
import { handleTelegramUpdate } from "@/lib/telegram/handleUpdate"

export const runtime = "nodejs"
export const maxDuration = 60

// Modo local: Telegram no puede llamar a localhost.
// Abre /api/telegram/poll?key=TELEGRAM_WEBHOOK_SECRET para leer mensajes.
export async function GET(request) {
  if (!verifyTelegramSetupKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const offset = Number(url.searchParams.get("offset") || 0)

  if (!Number.isFinite(offset) || offset <= 0) {
    await telegramApi("deleteWebhook", { drop_pending_updates: false })
  }

  const updates = await telegramApi("getUpdates", {
    offset: Number.isFinite(offset) ? offset : 0,
    timeout: 0,
    allowed_updates: TELEGRAM_ALLOWED_UPDATES,
  })

  if (!updates.ok) {
    return NextResponse.json(updates, { status: 502 })
  }

  const items = Array.isArray(updates.result) ? updates.result : []
  const processed = []
  for (const update of items) {
    processed.push(await handleTelegramUpdate(update))
  }

  const lastId = items.length ? items[items.length - 1].update_id : null
  return NextResponse.json({
    ok: true,
    count: items.length,
    next_offset: lastId == null ? offset : lastId + 1,
    processed,
  })
}
