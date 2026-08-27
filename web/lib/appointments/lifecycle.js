import { createAdminClient } from "@/lib/supabase/admin"
import { endsAtFromStart, parseSalonDateTime } from "@/lib/appointments/helpers"
import { resolveOpenAppointment } from "@/lib/appointments/find"
import { notifyGabyAppointment } from "@/lib/telegram/notify"
import {
  sendAppointmentConfirmation,
  sendRescheduleRejected,
  sendSlotUnavailable,
  sendWaitingForGaby,
} from "@/lib/appointments/notify"
import {
  bookCalendlyIfPossible,
  getAvailableSlots,
} from "@/lib/appointments/availability"
import {
  createGoogleCalendarEvent,
  persistGoogleEventId,
  upsertGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "@/lib/google/calendar"

export function needsGabyConfirm(appointment) {
  if (!appointment) return false
  if (appointment.proposed_starts_at) return true
  return appointment.status === "pending"
}

export async function confirmAppointment(id, { reschedule = false } = {}) {
  const supabase = createAdminClient()
  const { data: current, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !current) return { ok: false, error: "Cita no encontrada" }
  if (current.status === "cancelled") {
    return { ok: false, error: "La cita ya estaba cancelada" }
  }

  const applyingReschedule = Boolean(
    reschedule || current.proposed_starts_at
  )
  const nextStart = applyingReschedule
    ? new Date(current.proposed_starts_at || current.starts_at)
    : new Date(current.starts_at)

  if (Number.isNaN(nextStart.getTime())) {
    return { ok: false, error: "Fecha inválida" }
  }

  const { data, error: updErr } = await supabase
    .from("appointments")
    .update({
      starts_at: nextStart.toISOString(),
      ends_at: endsAtFromStart(nextStart, current.service_slug).toISOString(),
      proposed_starts_at: null,
      status: applyingReschedule ? "rescheduled" : "confirmed",
      reminder_sent_at: null,
    })
    .eq("id", id)
    .select()
    .single()

  if (updErr) return { ok: false, error: updErr.message }

  const gcal = await upsertGoogleCalendarEvent(data)
  if (gcal.ok) {
    data.google_event_id = gcal.eventId
    await persistGoogleEventId(data.id, gcal.eventId)
  } else if (!gcal.skipped) {
    console.error("[gcal] confirm:", gcal.error)
  }

  await sendAppointmentConfirmation(data, {
    rescheduled: applyingReschedule,
    calendarSynced: Boolean(data.google_event_id),
  }).catch(() => {})

  return { ok: true, appointment: data, rescheduled: applyingReschedule }
}

export async function rejectAppointment(id, { reschedule = false } = {}) {
  const supabase = createAdminClient()
  const { data: current, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !current) return { ok: false, error: "Cita no encontrada" }

  const rejectingReschedule = Boolean(
    reschedule || current.proposed_starts_at
  )

  if (rejectingReschedule && current.status !== "pending") {
    const { data, error: updErr } = await supabase
      .from("appointments")
      .update({ proposed_starts_at: null })
      .eq("id", id)
      .select()
      .single()
    if (updErr) return { ok: false, error: updErr.message }
    await sendRescheduleRejected(data).catch(() => {})
    return { ok: true, appointment: data, rescheduled: true }
  }

  const { data, error: updErr } = await supabase
    .from("appointments")
    .update({ status: "cancelled", proposed_starts_at: null })
    .eq("id", id)
    .select()
    .single()

  if (updErr) return { ok: false, error: updErr.message }
  await deleteGoogleCalendarEvent(data).catch(() => {})
  await sendSlotUnavailable(data).catch(() => {})
  return { ok: true, appointment: data, rescheduled: false }
}

export async function requestTelegramBooking(payload) {
  const availability = await getAvailableSlots({
    service_slug: payload.service_slug,
    days: 14,
    requested_at: payload.starts_at,
  })

  if (availability.requested && availability.requested.available === false) {
    const alts = (availability.slots || []).slice(0, 6).map((s) => s.label)
    return {
      ok: false,
      error: "horario_ocupado",
      message: alts.length
        ? `Ese horario no está libre. Alternativas: ${alts.join("; ")}`
        : "Ese horario no está libre. Pide otro día u hora.",
      alternatives: availability.slots.slice(0, 8),
    }
  }

  const booked = await bookCalendlyIfPossible({
    service_slug: payload.service_slug,
    starts_at: availability.requested?.starts_at || payload.starts_at,
    client_name: payload.client_name,
    client_email: payload.client_email,
    telegram_chat_id: payload.client_telegram_id,
  })

  const startIso = availability.requested?.starts_at || payload.starts_at
  const row = {
    client_name: payload.client_name,
    client_phone: payload.client_phone || null,
    client_email: payload.client_email || booked.email || null,
    client_telegram_id: payload.client_telegram_id,
    service_slug: payload.service_slug,
    starts_at: startIso,
    ends_at: endsAtFromStart(startIso, payload.service_slug).toISOString(),
    notes: payload.notes || null,
    channel: "telegram",
    status: "confirmed",
    proposed_starts_at: null,
    calendly_event_uri: booked.eventUri || null,
  }

  let data = null
  let persistError = null
  try {
    const supabase = createAdminClient()
    const inserted = await supabase.from("appointments").insert(row).select().single()
    data = inserted.data
    persistError = inserted.error
  } catch (err) {
    persistError = { message: err.message }
  }

  const appointment = data || {
    id: crypto.randomUUID(),
    ...row,
  }

  if (persistError) {
    console.error("[appointments] persist:", persistError.message)
  }

  const gcal = await createGoogleCalendarEvent(appointment)
  if (gcal.ok) {
    appointment.google_event_id = gcal.eventId
    await persistGoogleEventId(appointment.id, gcal.eventId)
  } else if (!gcal.skipped) {
    console.error("[gcal] telegram booking:", gcal.error)
  }

  await notifyGabyAppointment(appointment, {
    rescheduled: false,
    googleError: gcal.ok ? null : gcal.error || "no se pudo crear el evento",
  }).catch(() => {})
  await sendAppointmentConfirmation(appointment, {
    calendarSynced: Boolean(appointment.google_event_id),
  }).catch(() => {})

  const calendlyNote = booked.ok
    ? " También quedó en el calendario de Calendly."
    : booked.skipped
      ? ""
      : ` Calendly no pudo bloquear el cupo (${booked.error || "error"}).`

  const googleNote = gcal.ok
    ? " También quedó en Google Calendar."
    : gcal.skipped
      ? ""
      : ` Google Calendar: ${gcal.error || "no se pudo crear el evento"}.`

  const persistNote = persistError
    ? " Gaby ya recibió el aviso por Telegram."
    : ""

  return {
    ok: true,
    appointment,
    calendly: booked.ok,
    persisted: !persistError,
    message: `Cita registrada.${calendlyNote}${googleNote}${persistNote}`,
  }
}

export async function requestTelegramReschedule({
  appointment_id,
  client_name,
  starts_at,
}) {
  const start = parseSalonDateTime(starts_at)
  if (!start) {
    return { ok: false, error: "starts_at inválido" }
  }

  const found = await resolveOpenAppointment({
    appointment_id,
    client_name,
  })
  if (!found.ok) return found
  const id = found.appointment.appointment_id
  const supabase = createAdminClient()

  const { data: current, error: findErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .single()

  if (findErr || !current) {
    return { ok: false, error: findErr?.message || "Cita no encontrada" }
  }

  const stillWaitingFirstConfirm = current.status === "pending"
  const patch = stillWaitingFirstConfirm
    ? {
        starts_at: start.toISOString(),
        ends_at: endsAtFromStart(start, current.service_slug).toISOString(),
        proposed_starts_at: null,
        reminder_sent_at: null,
      }
    : {
        proposed_starts_at: start.toISOString(),
        reminder_sent_at: null,
      }

  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }

  await notifyGabyAppointment(data, {
    rescheduled: !stillWaitingFirstConfirm,
  }).catch(() => {})
  await sendWaitingForGaby(data, {
    rescheduled: !stillWaitingFirstConfirm,
  }).catch(() => {})

  return {
    ok: true,
    appointment: data,
    message: stillWaitingFirstConfirm
      ? "Nuevo horario pedido. Gaby confirmará disponibilidad."
      : "Cambio pedido. Gaby confirmará y actualizará la cita.",
  }
}

export async function pushAppointmentToCalendly(appointment) {
  if (!appointment?.id) return { ok: false, error: "Cita no encontrada" }
  if (appointment.calendly_event_uri) {
    return { ok: true, skipped: true, reason: "already_synced" }
  }

  const booked = await bookCalendlyIfPossible({
    service_slug: appointment.service_slug,
    starts_at: appointment.starts_at,
    client_name: appointment.client_name,
    client_email: appointment.client_email,
    telegram_chat_id: appointment.client_telegram_id,
  })

  if (!booked.ok) {
    return {
      ok: false,
      error: booked.skipped
        ? "Falta CALENDLY_API_TOKEN en .env.local"
        : booked.error || "Calendly rechazó la cita",
    }
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("appointments")
      .update({
        calendly_event_uri: booked.eventUri,
        client_email: appointment.client_email || booked.email || null,
      })
      .eq("id", appointment.id)
      .select()
      .single()
    if (error) return { ok: false, error: error.message }
    return { ok: true, appointment: data, calendly: true }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

export async function pushAppointmentToGoogle(appointment) {
  if (!appointment?.id) return { ok: false, error: "Cita no encontrada" }
  if (appointment.google_event_id) {
    return { ok: true, skipped: true, reason: "already_synced" }
  }
  const gcal = await createGoogleCalendarEvent(appointment)
  if (!gcal.ok) {
    return {
      ok: false,
      error: gcal.skipped
        ? "Conecta Google Calendar en el dashboard"
        : gcal.error || "Google Calendar rechazó el evento",
    }
  }
  await persistGoogleEventId(appointment.id, gcal.eventId)
  return { ok: true, eventId: gcal.eventId, htmlLink: gcal.htmlLink }
}
