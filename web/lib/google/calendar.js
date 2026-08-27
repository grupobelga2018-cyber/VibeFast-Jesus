import fs from "node:fs"
import path from "node:path"
import config from "@/config"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  endsAtFromStart,
  getService,
  zonedParts,
} from "@/lib/appointments/helpers"
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/google/scopes"

export { GOOGLE_CALENDAR_SCOPES }

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
const CALENDAR_API = "https://www.googleapis.com/calendar/v3"
const SCOPES = GOOGLE_CALENDAR_SCOPES

const TOKEN_FILE = path.join(process.cwd(), ".google-calendar-token.json")

let memoryAuth = null
let memoryAccess = null

export function googleOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
  )
}

export function googleCalendarRedirectUri(origin) {
  const envBase = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")
  const vercelBase = process.env.VERCEL_URL
    ? `https://${String(process.env.VERCEL_URL).replace(/^https?:\/\//, "")}`
    : ""
  const reqOrigin = origin ? String(origin).replace(/\/$/, "") : ""
  const base =
    (reqOrigin && !reqOrigin.includes("localhost") ? reqOrigin : "") ||
    (envBase && !envBase.includes("localhost") ? envBase : "") ||
    vercelBase ||
    envBase ||
    "http://localhost:3000"
  return `${base}/api/google/calendar/callback`
}

export function googleCalendarAuthUrl(state, origin) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: googleCalendarRedirectUri(origin),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${GOOGLE_AUTH}?${params}`
}

function pad(n) {
  return String(n).padStart(2, "0")
}

function salonDateTimeLocal(date) {
  const p = zonedParts(date)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:00`
}

function calendarId() {
  return process.env.GOOGLE_CALENDAR_ID || "primary"
}

function readTokenFile() {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8"))
  } catch {
    return null
  }
}

function writeTokenFile(auth) {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(auth, null, 2), "utf8")
  } catch (err) {
    console.warn("[gcal] no pude guardar el token local:", err.message)
  }
}

export async function saveGoogleCalendarAuth(auth) {
  memoryAuth = {
    refresh_token: auth.refresh_token,
    email: auth.email || null,
    calendar_id: auth.calendar_id || calendarId(),
  }
  writeTokenFile(memoryAuth)

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("google_calendar_auth").upsert({
      id: "gaby",
      refresh_token: memoryAuth.refresh_token,
      email: memoryAuth.email,
      calendar_id: memoryAuth.calendar_id,
      updated_at: new Date().toISOString(),
    })
    if (error) console.warn("[gcal] save db:", error.message)
  } catch (err) {
    console.warn("[gcal] save db:", err.message)
  }
}

export async function loadGoogleCalendarAuth() {
  if (memoryAuth?.refresh_token) return memoryAuth

  const fromFile = readTokenFile()
  if (fromFile?.refresh_token) {
    memoryAuth = fromFile
    return memoryAuth
  }

  if (process.env.GOOGLE_CALENDAR_REFRESH_TOKEN) {
    memoryAuth = {
      refresh_token: process.env.GOOGLE_CALENDAR_REFRESH_TOKEN,
      email: process.env.GOOGLE_CALENDAR_EMAIL || null,
      calendar_id: calendarId(),
    }
    return memoryAuth
  }

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("google_calendar_auth")
      .select("*")
      .eq("id", "gaby")
      .maybeSingle()
    if (error) console.warn("[gcal] load db:", error.message)
    else if (data?.refresh_token) {
      memoryAuth = data
      return memoryAuth
    }
  } catch (err) {
    console.warn("[gcal] load db:", err.message)
  }

  return null
}

export async function isGoogleCalendarConnected() {
  const health = await getGoogleCalendarHealth()
  return health.connected
}

export async function getGoogleCalendarHealth() {
  const auth = await loadGoogleCalendarAuth()
  if (!auth?.refresh_token) {
    return { connected: false, stale: false, needsEnv: false, email: auth?.email || null }
  }
  if (!googleOAuthConfigured()) {
    return {
      connected: false,
      stale: false,
      needsEnv: true,
      email: auth.email || null,
      error: "missing_oauth",
    }
  }
  const access = await getAccessToken()
  if (access.ok) {
    return { connected: true, stale: false, needsEnv: false, email: auth.email || null }
  }
  const stale = /invalid_grant|invalid_rapt|unauthorized|expired|missing_oauth/i.test(
    String(access.error || "")
  )
  return {
    connected: false,
    stale,
    email: auth.email || null,
    error: access.error || null,
  }
}

export async function exchangeGoogleCode(code, origin) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirect_uri: googleCalendarRedirectUri(origin),
    grant_type: "authorization_code",
  })
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: json.error_description || json.error || res.statusText }
  }
  return { ok: true, ...json }
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    grant_type: "refresh_token",
  })
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, error: json.error_description || json.error || res.statusText }
  }
  return { ok: true, ...json }
}

async function getAccessToken() {
  if (memoryAccess?.token && memoryAccess.expiresAt > Date.now() + 30_000) {
    return { ok: true, token: memoryAccess.token }
  }
  const auth = await loadGoogleCalendarAuth()
  if (!auth?.refresh_token) {
    console.warn("[gcal] skip: no hay refresh token. Conecta Google Calendar en el dashboard.")
    return { ok: false, skipped: true, error: "Google Calendar no está conectado" }
  }
  if (!googleOAuthConfigured()) {
    return { ok: false, error: "Faltan GOOGLE_OAUTH_CLIENT_ID / SECRET" }
  }
  const refreshed = await refreshAccessToken(auth.refresh_token)
  if (!refreshed.ok) {
    console.error("[gcal] refresh token:", refreshed.error)
    return refreshed
  }
  memoryAccess = {
    token: refreshed.access_token,
    expiresAt: Date.now() + (Number(refreshed.expires_in) || 3600) * 1000,
  }
  return { ok: true, token: refreshed.access_token }
}

export async function captureGoogleCalendarFromSession(session) {
  const access = session?.provider_token
  const refresh = session?.provider_refresh_token
  if (access) {
    memoryAccess = {
      token: access,
      expiresAt: Date.now() + 50 * 60 * 1000,
    }
  }
  if (!refresh) {
    if (access) {
      console.warn("[gcal] sesión con access token pero sin refresh_token")
      return { ok: true, temporary: true }
    }
    return { ok: false, skipped: true }
  }
  const email =
    session.user?.email || (access ? await fetchGoogleEmail(access) : null)
  await saveGoogleCalendarAuth({
    refresh_token: refresh,
    email,
  })
  return { ok: true }
}

export async function fetchGoogleEmail(accessToken) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json().catch(() => ({}))
  return json.email || null
}

function eventPayload(appointment) {
  const service = getService(appointment.service_slug)
  const start = new Date(appointment.starts_at)
  const end = appointment.ends_at
    ? new Date(appointment.ends_at)
    : endsAtFromStart(start, appointment.service_slug)
  const tz = config.booking.timezone
  return {
    summary: `${service?.name || appointment.service_slug} · ${appointment.client_name || "Clienta"}`,
    description: [
      `Cita de ${config.app.name}`,
      appointment.client_phone ? `Tel: ${appointment.client_phone}` : null,
      appointment.notes ? `Notas: ${appointment.notes}` : null,
      `Canal: ${appointment.channel || "telegram"}`,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: salonDateTimeLocal(start), timeZone: tz },
    end: { dateTime: salonDateTimeLocal(end), timeZone: tz },
  }
}

async function calendarRequest(method, pathname, body) {
  const access = await getAccessToken()
  if (!access.ok) return access
  const auth = await loadGoogleCalendarAuth()
  const calId = encodeURIComponent(auth?.calendar_id || calendarId())
  const res = await fetch(`${CALENDAR_API}/calendars/${calId}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${access.token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = json.error?.message || res.statusText
    console.error(`[gcal] ${method} ${pathname}:`, message)
    return { ok: false, error: message, status: res.status }
  }
  return { ok: true, eventId: json.id, htmlLink: json.htmlLink }
}

export async function createGoogleCalendarEvent(appointment) {
  return calendarRequest("POST", "/events", eventPayload(appointment))
}

export async function updateGoogleCalendarEvent(appointment) {
  if (!appointment?.google_event_id) {
    return createGoogleCalendarEvent(appointment)
  }
  const path = `/events/${encodeURIComponent(appointment.google_event_id)}`
  const existing = await calendarRequest("GET", path)
  if (!existing.ok) {
    return createGoogleCalendarEvent(appointment)
  }
  const updated = await calendarRequest("PATCH", path, eventPayload(appointment))
  if (updated.ok) return updated
  return createGoogleCalendarEvent(appointment)
}

export async function upsertGoogleCalendarEvent(appointment) {
  return appointment?.google_event_id
    ? updateGoogleCalendarEvent(appointment)
    : createGoogleCalendarEvent(appointment)
}

export async function deleteGoogleCalendarEvent(appointment) {
  if (!appointment?.google_event_id) {
    return { ok: true, skipped: true }
  }
  const path = `/events/${encodeURIComponent(appointment.google_event_id)}`
  const result = await calendarRequest("DELETE", path)
  if (result.ok || result.status === 404 || result.status === 410) {
    return { ok: true, eventId: appointment.google_event_id }
  }
  return result
}

export async function syncOpenAppointmentsToGoogle() {
  const access = await getAccessToken()
  if (!access.ok) return access

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .is("google_event_id", null)
      .in("status", ["pending", "confirmed", "rescheduled"])
      .gte("starts_at", new Date().toISOString())
      .limit(25)
    if (error) {
      console.warn("[gcal] backfill list:", error.message)
      return { ok: false, error: error.message }
    }

    let synced = 0
    for (const row of data || []) {
      const created = await createGoogleCalendarEvent(row)
      if (created.ok) {
        await persistGoogleEventId(row.id, created.eventId)
        synced += 1
      }
    }
    return { ok: true, synced }
  } catch (err) {
    console.warn("[gcal] backfill:", err.message)
    return { ok: false, error: err.message }
  }
}

export async function persistGoogleEventId(appointmentId, eventId) {
  if (!appointmentId || !eventId) return
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("appointments")
      .update({ google_event_id: eventId })
      .eq("id", appointmentId)
    if (error) console.warn("[gcal] persist id:", error.message)
  } catch (err) {
    console.warn("[gcal] persist id:", err.message)
  }
}
