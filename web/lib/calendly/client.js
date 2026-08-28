const CALENDLY_API = "https://api.calendly.com"

let cachedMe = null
let cachedEventTypes = null

export function getCalendlyToken() {
  return process.env.CALENDLY_API_TOKEN || process.env.CALENDLY_ACCESS_TOKEN || ""
}

export function isCalendlyApiConfigured() {
  return Boolean(getCalendlyToken())
}

export async function calendlyApi(path, { method = "GET", body } = {}) {
  const token = getCalendlyToken()
  if (!token) return { ok: false, error: "missing_token" }

  const res = await fetch(`${CALENDLY_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      json?.message ||
      json?.title ||
      json?.details?.[0]?.message ||
      res.statusText
    console.error(`[calendly] ${method} ${path}:`, message)
    return { ok: false, error: message, status: res.status, body: json }
  }
  return { ok: true, ...json }
}

export async function getCalendlyMe() {
  if (cachedMe) return { ok: true, resource: cachedMe }
  const res = await calendlyApi("/users/me")
  if (!res.ok) return res
  cachedMe = res.resource
  return res
}

export async function listCalendlyEventTypes() {
  if (cachedEventTypes) return { ok: true, collection: cachedEventTypes }
  const me = await getCalendlyMe()
  if (!me.ok) return me
  const userUri = me.resource?.uri
  if (!userUri) return { ok: false, error: "no_calendly_user" }

  const res = await calendlyApi(
    `/event_types?user=${encodeURIComponent(userUri)}&active=true`
  )
  if (!res.ok) return res
  cachedEventTypes = Array.isArray(res.collection) ? res.collection : []
  return { ok: true, collection: cachedEventTypes }
}

export async function resolveCalendlyEventType(service) {
  const fromEnv = process.env.CALENDLY_EVENT_TYPE_URI
  if (fromEnv) return { ok: true, uri: fromEnv, source: "env" }

  const listed = await listCalendlyEventTypes()
  if (!listed.ok) return listed

  const types = listed.collection || []
  const needle = [service?.slug, service?.name]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase())

  const match = types.find((t) => {
    const hay = `${t.name || ""} ${t.slug || ""}`.toLowerCase()
    return needle.some((n) => hay.includes(n))
  })

  const picked = match || types.find((t) => t.active !== false) || types[0]
  if (!picked?.uri) return { ok: false, error: "no_event_type" }
  return {
    ok: true,
    uri: picked.uri,
    name: picked.name,
    locations: picked.locations || [],
    source: "api",
  }
}

export async function getCalendlyEventType(uri) {
  const uuid = String(uri || "").split("/").pop()
  if (!uuid) return { ok: false, error: "no_event_type_uri" }
  const res = await calendlyApi(`/event_types/${uuid}`)
  if (!res.ok) return res
  return { ok: true, resource: res.resource }
}

function locationForInvitee(eventType) {
  const locs = eventType?.locations || []
  if (!locs.length) return undefined
  const loc =
    locs.find((item) => item.kind === "physical" || item.kind === "custom") ||
    locs[0]
  const kind = loc.kind
  if (!kind) return undefined
  const needsPlace = [
    "physical",
    "custom",
    "ask_invitee",
    "outbound_call",
    "inbound_call",
  ].includes(kind)
  if (needsPlace) {
    return {
      kind,
      location: loc.location || loc.phone_number || "Color Hair by Gabby",
    }
  }
  return { kind }
}

export async function createCalendlyInvitee({
  eventTypeUri,
  startTime,
  name,
  email,
  timezone,
  questions = [],
}) {
  const details = await getCalendlyEventType(eventTypeUri)
  const eventType = details.ok ? details.resource : { uri: eventTypeUri }
  const location = locationForInvitee(eventType)
  const parts = String(name || "Clienta").trim().split(/\s+/)
  const invitee = {
    name: name || "Clienta Telegram",
    first_name: parts[0] || "Clienta",
    last_name: parts.slice(1).join(" ") || parts[0] || "Telegram",
    email,
    timezone,
  }

  const body = {
    event_type: eventTypeUri,
    start_time: new Date(startTime).toISOString(),
    invitee,
    tracking: { utm_source: "telegram", utm_campaign: "colorhair-bot" },
  }
  if (location) body.location = location
  if (questions.length) body.questions_and_answers = questions

  const created = await calendlyApi("/invitees", { method: "POST", body })
  if (
    created.ok === false &&
    location &&
    /location/i.test(created.error || "")
  ) {
    delete body.location
    return calendlyApi("/invitees", { method: "POST", body })
  }
  return created
}

function foldName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}

export function calendlyScheduledEventUuid(uri) {
  const match = String(uri || "").match(/scheduled_events\/([^/?#]+)/i)
  return match?.[1] || null
}

async function postCalendlyCancellation(eventUuid) {
  const canceled = await calendlyApi(
    `/scheduled_events/${encodeURIComponent(eventUuid)}/cancellation`,
    {
      method: "POST",
      body: { reason: "Cancelada por Color Hair (Telegram)" },
    }
  )
  if (canceled.ok || canceled.status === 404) {
    return { ok: true, notFound: canceled.status === 404 }
  }
  if (
    canceled.status === 400 &&
    /already|cancel/i.test(`${canceled.error || ""} ${JSON.stringify(canceled.body || {})}`)
  ) {
    return { ok: true }
  }
  return canceled
}

export async function cancelCalendlyScheduledEvent(appointment) {
  if (!appointment?.calendly_event_uri && appointment?.channel !== "calendly") {
    return { ok: true, skipped: true }
  }
  if (!isCalendlyApiConfigured()) {
    return { ok: false, skipped: true, error: "missing_token" }
  }

  const uuid = calendlyScheduledEventUuid(appointment.calendly_event_uri)
  if (uuid) {
    const canceled = await postCalendlyCancellation(uuid)
    if (canceled.ok && !canceled.notFound) return canceled
  }

  const start = new Date(appointment.starts_at)
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: "No se pudo cancelar en Calendly" }
  }

  const me = await getCalendlyMe()
  if (!me.ok) return me
  const userUri = me.resource?.uri
  if (!userUri) return { ok: false, error: "no_calendly_user" }

  const params = new URLSearchParams({
    user: userUri,
    min_start_time: new Date(start.getTime() - 15 * 60 * 1000).toISOString(),
    max_start_time: new Date(start.getTime() + 15 * 60 * 1000).toISOString(),
    status: "active",
  })
  const listed = await calendlyApi(`/scheduled_events?${params}`)
  if (!listed.ok) return listed

  const name = foldName(appointment.client_name)
  let removed = 0
  for (const event of listed.collection || []) {
    const eventUuid = calendlyScheduledEventUuid(event.uri)
    if (!eventUuid) continue
    let matches = !name
    if (name) {
      const invitees = await calendlyApi(
        `/scheduled_events/${encodeURIComponent(eventUuid)}/invitees`
      )
      matches = (invitees.collection || []).some((person) => {
        const hay = foldName(person.name)
        return hay.includes(name) || name.includes(hay)
      })
    }
    if (!matches) continue
    const canceled = await postCalendlyCancellation(eventUuid)
    if (canceled.ok) removed += 1
  }

  return removed
    ? { ok: true }
    : { ok: false, error: "No se encontró la cita en Calendly" }
}

export async function listCalendlyAvailableTimes({
  eventTypeUri,
  start,
  end,
}) {
  const times = []
  let cursor = new Date(start)
  const endMs = new Date(end).getTime()
  let anyOk = false

  while (cursor.getTime() < endMs) {
    const chunkEnd = new Date(
      Math.min(cursor.getTime() + 6 * 24 * 60 * 60 * 1000, endMs)
    )
    if (chunkEnd.getTime() <= cursor.getTime()) break
    const params = new URLSearchParams({
      event_type: eventTypeUri,
      start_time: cursor.toISOString(),
      end_time: chunkEnd.toISOString(),
    })
    const res = await calendlyApi(`/event_type_available_times?${params}`)
    if (res.ok) {
      anyOk = true
      const collection = Array.isArray(res.collection) ? res.collection : []
      times.push(
        ...collection
          .filter((slot) => slot.status === "available" && slot.start_time)
          .map((slot) => new Date(slot.start_time))
      )
    }
    cursor = chunkEnd
  }

  if (!anyOk) return { ok: false, error: "No se pudieron leer horarios de Calendly" }
  return { ok: true, times }
}
