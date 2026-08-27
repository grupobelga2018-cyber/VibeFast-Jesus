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

export async function listCalendlyAvailableTimes({
  eventTypeUri,
  start,
  end,
}) {
  const params = new URLSearchParams({
    event_type: eventTypeUri,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
  })
  const res = await calendlyApi(`/event_type_available_times?${params}`)
  if (!res.ok) return res
  const collection = Array.isArray(res.collection) ? res.collection : []
  return {
    ok: true,
    times: collection
      .filter((slot) => slot.status === "available" && slot.start_time)
      .map((slot) => new Date(slot.start_time)),
  }
}
