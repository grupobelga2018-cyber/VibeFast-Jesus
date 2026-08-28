import { createAdminClient } from "@/lib/supabase/admin"
import { formatAppointmentWhen, getService } from "@/lib/appointments/helpers"

const OPEN_STATUSES = ["pending", "confirmed", "rescheduled"]

function foldName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

function namesMatch(haystack, needle) {
  const hay = foldName(haystack)
  const want = foldName(needle)
  if (!hay || !want) return false
  if (hay.includes(want) || want.includes(hay)) return true
  const hayParts = hay.split(/\s+/).filter(Boolean)
  const wantParts = want.split(/\s+/).filter(Boolean)
  return wantParts.every((part) => hayParts.some((h) => h.startsWith(part) || part.startsWith(h)))
}

function summarize(row) {
  const service = getService(row.service_slug)
  return {
    appointment_id: row.id,
    client_name: row.client_name,
    service_slug: row.service_slug,
    service_name: service?.name || row.service_slug,
    status: row.status,
    channel: row.channel,
    starts_at: row.starts_at,
    when: formatAppointmentWhen(row.starts_at),
    proposed_starts_at: row.proposed_starts_at,
    proposed_when: row.proposed_starts_at
      ? formatAppointmentWhen(row.proposed_starts_at)
      : null,
  }
}

export async function findUpcomingAppointments({
  appointment_id = null,
  client_name = null,
} = {}) {
  const supabase = createAdminClient()

  if (appointment_id) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointment_id)
      .in("status", OPEN_STATUSES)
      .maybeSingle()
    if (error) return { ok: false, error: error.message, appointments: [] }
    return {
      ok: true,
      appointments: data ? [summarize(data)] : [],
    }
  }

  const name = String(client_name || "").trim()
  if (name.length < 2) {
    return {
      ok: false,
      error: "falta_nombre",
      message: "Pregunta el nombre de la clienta antes de buscar la cita.",
      appointments: [],
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .in("status", OPEN_STATUSES)
    .gte("starts_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(40)

  if (error) return { ok: false, error: error.message, appointments: [] }

  return {
    ok: true,
    appointments: (data || [])
      .filter((row) => namesMatch(row.client_name, name))
      .slice(0, 10)
      .map(summarize),
  }
}

export async function resolveOpenAppointment({
  appointment_id = null,
  client_name = null,
}) {
  const found = await findUpcomingAppointments({ appointment_id, client_name })
  if (!found.ok) return found

  if (!found.appointments.length) {
    return {
      ok: false,
      error: "no_encontrada",
      message: `No encontré una cita a nombre de ${client_name}. Confirma el nombre.`,
      appointments: [],
    }
  }

  if (found.appointments.length > 1 && !appointment_id) {
    return {
      ok: false,
      error: "varias_citas",
      message: "Hay varias citas con ese nombre. Pregunta cuál quieren cambiar.",
      appointments: found.appointments,
    }
  }

  return { ok: true, appointment: found.appointments[0] }
}
