"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, Radio, Send } from "lucide-react"
import { pollTelegramUpdates, prepareTelegramLocal, sendTelegramTest } from "@/app/(app)/dashboard/actions"

export default function TelegramBotPanel({
  configured,
  adminChatId,
  openaiReady,
  botUsername,
  deepLink,
  tablesReady,
  calendlyReady,
  allowLocalPoller = false,
}) {
  const [listening, setListening] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")
  const offsetRef = useRef(0)

  useEffect(() => {
    if (!listening) return undefined

    let cancelled = false
    async function tick() {
      const result = await pollTelegramUpdates(offsetRef.current)
      if (cancelled) return
      if (result?.next_offset != null) offsetRef.current = result.next_offset
      if (result?.ok) {
        const n = result.count || 0
        setStatus(
          n
            ? `Escuchando… ${n} mensaje${n === 1 ? "" : "s"} nuevo${n === 1 ? "" : "s"}.`
            : "Escuchando Telegram… escribe al bot y verás la respuesta en el chat."
        )
      } else {
        setStatus(result?.error || "No pude leer Telegram. ¿El token está bien?")
      }
    }

    prepareTelegramLocal().then(() => {
      if (!cancelled) tick()
    })
    const id = setInterval(tick, 2500)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [listening])

  async function onTest() {
    setBusy(true)
    const result = await sendTelegramTest()
    setBusy(false)
    setStatus(
      result?.ok
        ? "Te envié un mensaje de prueba. Revisa Telegram."
        : result?.error || "No pude enviar el mensaje de prueba."
    )
  }

  return (
    <section className="rounded-box border border-base-200 bg-base-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="size-4" />
            Bot de Telegram
          </p>
          <p className="mt-1 text-sm text-base-content/70">
            El agente coordina el horario en{" "}
            <a href={deepLink} className="link" target="_blank" rel="noreferrer">
              @{botUsername}
            </a>
            . En Vercel responde por webhook, sin tu PC. En local no se escucha el bot salvo TELEGRAM_LOCAL_POLLER=1 (pausa producción).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1"
            onClick={onTest}
            disabled={!configured || !adminChatId || busy}
          >
            <Send className="size-4" />
            Mensaje de prueba
          </button>
          {allowLocalPoller && (
            <button
              type="button"
              className={`btn btn-sm gap-1 ${listening ? "btn-error" : "btn-primary"}`}
              onClick={() => setListening((v) => !v)}
              disabled={!configured}
            >
              <Radio className="size-4" />
              {listening ? "Dejar de escuchar" : "Escuchar Telegram"}
            </button>
          )}
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2 text-xs">
        <li className={`badge ${configured ? "badge-success" : "badge-warning"}`}>
          {configured ? "Token listo" : "Falta TELEGRAM_BOT_TOKEN"}
        </li>
        <li className={`badge ${adminChatId ? "badge-success" : "badge-warning"}`}>
          {adminChatId ? `Gaby: ${adminChatId}` : "Falta TELEGRAM_ADMIN_CHAT_ID"}
        </li>
        <li className={`badge ${openaiReady ? "badge-success" : "badge-warning"}`}>
          {openaiReady ? "Agente OpenAI" : "Sin OPENAI_API_KEY (solo menú)"}
        </li>
        <li className={`badge ${calendlyReady ? "badge-success" : "badge-warning"}`}>
          {calendlyReady ? "Calendly API" : "Falta CALENDLY_API_TOKEN"}
        </li>
        <li className={`badge ${tablesReady ? "badge-success" : "badge-error"}`}>
          {tablesReady ? "Tablas de citas" : "Corre supabase/migrations/008_appointments.sql"}
        </li>
      </ul>

      {status && <p className="mt-3 text-sm text-base-content/80">{status}</p>}
    </section>
  )
}
