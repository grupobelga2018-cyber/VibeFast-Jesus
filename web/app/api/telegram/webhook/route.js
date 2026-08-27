import { NextResponse } from "next/server"
import { verifyTelegramSecret } from "@/lib/telegram/client"
import { handleTelegramUpdate } from "@/lib/telegram/handleUpdate"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request) {
  if (!verifyTelegramSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let update
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  await handleTelegramUpdate(update)
  return NextResponse.json({ ok: true })
}
