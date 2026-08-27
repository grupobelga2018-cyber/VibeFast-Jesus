import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

function loadEnv(file) {
  if (!fs.existsSync(file)) return {}
  const out = {}
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue
    const i = line.indexOf("=")
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const fileEnv = loadEnv(path.join(webRoot, ".env.local"))
const token = fileEnv.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || ""
const secret = fileEnv.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET || ""
const port = process.env.PORT || "3000"
const botName = fileEnv.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "el bot"
const localPoller =
  (fileEnv.TELEGRAM_LOCAL_POLLER || process.env.TELEGRAM_LOCAL_POLLER || "") === "1"

const child = spawn("next", ["dev"], {
  cwd: webRoot,
  stdio: "inherit",
  shell: true,
  env: process.env,
})

function shutdown() {
  if (child.exitCode == null) child.kill()
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
child.on("exit", (code) => process.exit(code ?? 0))

async function telegramApi(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return res.json()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForApp() {
    for (let i = 0; i < 180; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`)
      if (res.ok || res.status < 500) return true
    } catch {
      // still booting
    }
    await sleep(1000)
  }
  return false
}

async function pollTelegram() {
  if (!localPoller) {
    console.log(
      "[telegram] poller local desactivado (el webhook de Vercel sigue activo). Para probar el bot en esta PC: TELEGRAM_LOCAL_POLLER=1 en .env.local"
    )
    return
  }

  if (!token) {
    console.log("[telegram] sin TELEGRAM_BOT_TOKEN; el poller local no arranca")
    return
  }

  const ready = await waitForApp()
  if (!ready) {
    console.error("[telegram] la app no respondió en localhost; poller no arranca")
    return
  }

  await telegramApi("deleteWebhook", { drop_pending_updates: false })
  console.log(`[telegram] poller local activo. Escribe a @${botName}`)

  let offset = 0
  while (child.exitCode == null) {
    try {
      const updates = await telegramApi("getUpdates", {
        offset,
        timeout: 25,
        allowed_updates: ["message", "edited_message", "callback_query"],
      })
      if (!updates.ok) {
        console.error("[telegram] getUpdates:", updates.description)
        await sleep(3000)
        continue
      }

      for (const update of updates.result || []) {
        offset = Number(update.update_id) + 1
        const res = await fetch(`http://127.0.0.1:${port}/api/telegram/webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(secret ? { "x-telegram-bot-api-secret-token": secret } : {}),
          },
          body: JSON.stringify(update),
        })
        if (!res.ok) {
          console.error("[telegram] webhook local:", res.status, await res.text().catch(() => ""))
        }
      }
    } catch (err) {
      console.error("[telegram] poller:", err.message)
      await sleep(3000)
    }
  }
}

pollTelegram()
