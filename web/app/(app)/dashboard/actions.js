"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { endsAtFromStart, parseSalonDateTime } from "@/lib/appointments/helpers"
import {
  confirmAppointment,
  rejectAppointment,
  cancelAppointment,
  pushAppointmentToCalendly,
  pushAppointmentToGoogle,
} from "@/lib/appointments/lifecycle"
import { notifyGabyAppointment } from "@/lib/telegram/notify"
import { sendAppointmentConfirmation } from "@/lib/appointments/notify"
import { bookCalendlyIfPossible } from "@/lib/appointments/availability"
import {
  createGoogleCalendarEvent,
  persistGoogleEventId,
  upsertGoogleCalendarEvent,
} from "@/lib/google/calendar"
import {
  isTelegramConfigured,
  sendTelegramMessage,
  telegramApi,
  TELEGRAM_ALLOWED_UPDATES,
} from "@/lib/telegram/client"
import { handleTelegramUpdate } from "@/lib/telegram/handleUpdate"

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("No autenticado")
  return { supabase, user }
}

export async function createManualAppointment(formData) {
  const clientName = formData.get("client_name")?.toString().trim()
  const clientPhone = formData.get("client_phone")?.toString().trim() || null
  const serviceSlug = formData.get("service_slug")?.toString().trim() || "corte"
  const startsRaw = formData.get("starts_at")?.toString()
  const notes = formData.get("notes")?.toString().trim() || null
  if (!clientName || !startsRaw) return

  const startsAt = parseSalonDateTime(startsRaw)
  if (!startsAt) return

  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      client_name: clientName,
      client_phone: clientPhone,
      service_slug: serviceSlug,
      starts_at: startsAt.toISOString(),
      ends_at: endsAtFromStart(startsAt, serviceSlug).toISOString(),
      channel: "manual",
      status: "confirmed",
      notes,
    })
    .select()
    .single()

  if (error) {
    console.error("[appointments] create:", error.message)
    return
  }

  const booked = await bookCalendlyIfPossible({
    service_slug: serviceSlug,
    starts_at: startsAt.toISOString(),
    client_name: clientName,
  })
  if (booked.ok && booked.eventUri) {
    await supabase
      .from("appointments")
      .update({
        calendly_event_uri: booked.eventUri,
        client_email: booked.email || null,
      })
      .eq("id", data.id)
    data.calendly_event_uri = booked.eventUri
  }

  const gcal = await createGoogleCalendarEvent(data)
  if (gcal.ok) {
    await persistGoogleEventId(data.id, gcal.eventId)
    data.google_event_id = gcal.eventId
  }

  await notifyGabyAppointment(data).catch(() => {})
  revalidatePath("/dashboard")
}

export async function updateAppointmentStatus(formData) {
  const id = formData.get("id")?.toString()
  const status = formData.get("status")?.toString()
  if (!id || !status) return

  const { supabase } = await requireUser()

  if (status === "confirmed") {
    const result = await confirmAppointment(id)
    if (!result.ok) console.error("[appointments] confirm:", result.error)
    revalidatePath("/dashboard")
    return
  }

  if (status === "reject_slot") {
    const result = await rejectAppointment(id)
    if (!result.ok) console.error("[appointments] reject:", result.error)
    revalidatePath("/dashboard")
    return
  }

  if (status === "cancelled") {
    const result = await cancelAppointment(id, { notifyClient: true })
    if (!result.ok) console.error("[appointments] cancel:", result.error)
    revalidatePath("/dashboard")
    return
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[appointments] status:", error.message)
    return
  }

  revalidatePath("/dashboard")
}

export async function rescheduleAppointment(formData) {
  const id = formData.get("id")?.toString()
  const startsRaw = formData.get("starts_at")?.toString()
  if (!id || !startsRaw) return

  const startsAt = parseSalonDateTime(startsRaw)
  if (!startsAt) return

  const { supabase } = await requireUser()
  const { data: current } = await supabase
    .from("appointments")
    .select("service_slug")
    .eq("id", id)
    .single()

  const serviceSlug = current?.service_slug || "corte"
  const { data, error } = await supabase
    .from("appointments")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAtFromStart(startsAt, serviceSlug).toISOString(),
      status: "rescheduled",
      proposed_starts_at: null,
      reminder_sent_at: null,
    })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[appointments] reschedule:", error.message)
    return
  }

  const gcal = await upsertGoogleCalendarEvent(data)
  if (gcal.ok) {
    data.google_event_id = gcal.eventId
    await persistGoogleEventId(data.id, gcal.eventId)
  } else if (!gcal.skipped) {
    console.error("[gcal] reschedule:", gcal.error)
  }

  await sendAppointmentConfirmation(data, { rescheduled: true }).catch(() => {})
  await notifyGabyAppointment(data, { rescheduled: true }).catch(() => {})
  revalidatePath("/dashboard")
}

export async function sendTelegramTest() {
  await requireUser()
  if (!isTelegramConfigured()) {
    return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN en .env.local" }
  }
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID
  if (!chatId) {
    return { ok: false, error: "Falta TELEGRAM_ADMIN_CHAT_ID en .env.local" }
  }

  const result = await sendTelegramMessage(
    chatId,
    [
      "<b>Color Hair by Gabby</b>",
      "Este chat quedó como canal de Gaby.",
      "Las clientas escriben al bot; tú recibes avisos de citas nuevas aquí.",
      "Producción: POST /api/telegram/setup?key=TELEGRAM_WEBHOOK_SECRET una vez.",
      "Local (opcional): TELEGRAM_LOCAL_POLLER=1 en .env.local; eso pausa el webhook de Vercel.",
    ].join("\n")
  )

  return result?.ok
    ? { ok: true }
    : { ok: false, error: result?.error || "Telegram rechazó el mensaje" }
}

export async function prepareTelegramLocal() {
  await requireUser()
  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      error:
        "En producción el bot usa el webhook de Vercel. No actives el poller: quitaría el webhook.",
    }
  }
  if (!isTelegramConfigured()) {
    return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN en .env.local" }
  }
  return telegramApi("deleteWebhook", { drop_pending_updates: false })
}

export async function pollTelegramUpdates(offset = 0) {
  await requireUser()
  if (!isTelegramConfigured()) {
    return { ok: false, error: "Falta TELEGRAM_BOT_TOKEN en .env.local" }
  }

  const updates = await telegramApi("getUpdates", {
    offset: Number.isFinite(Number(offset)) ? Number(offset) : 0,
    timeout: 0,
    allowed_updates: TELEGRAM_ALLOWED_UPDATES,
  })

  if (!updates.ok) {
    return { ok: false, error: updates.error || "getUpdates falló" }
  }

  const items = Array.isArray(updates.result) ? updates.result : []
  const processed = []
  for (const update of items) {
    processed.push(await handleTelegramUpdate(update))
  }

  const lastId = items.length ? items[items.length - 1].update_id : null
  return {
    ok: true,
    count: items.length,
    next_offset: lastId == null ? offset : lastId + 1,
    processed,
  }
}

export async function syncAppointmentToCalendly(formData) {
  const id = formData.get("id")?.toString()
  if (!id) return { ok: false, error: "Falta la cita" }

  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message || "Cita no encontrada" }
  }

  const result = await pushAppointmentToCalendly(data)
  if (!result.ok) console.error("[calendly] sync:", result.error)
  revalidatePath("/dashboard")
  return result
}

export async function syncAppointmentToGoogle(formData) {
  const id = formData.get("id")?.toString()
  if (!id) return { ok: false, error: "Falta la cita" }

  const { supabase } = await requireUser()
  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message || "Cita no encontrada" }
  }

  const result = await pushAppointmentToGoogle(data)
  if (!result.ok) console.error("[gcal] sync:", result.error)
  revalidatePath("/dashboard")
  return result
}
