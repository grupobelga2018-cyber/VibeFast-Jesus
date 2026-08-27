import { Check, CalendarClock, XCircle, CircleCheck, CalendarPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import config from "@/config"
import {
  formatAppointmentWhen,
  STATUS_BADGE,
  STATUS_LABELS,
  getService,
} from "@/lib/appointments/helpers"
import { needsGabyConfirm } from "@/lib/appointments/lifecycle"
import { isTelegramConfigured } from "@/lib/telegram/client"
import { isCalendlyApiConfigured } from "@/lib/calendly/client"
import {
  captureGoogleCalendarFromSession,
  googleOAuthConfigured,
  isGoogleCalendarConnected,
  loadGoogleCalendarAuth,
} from "@/lib/google/calendar"
import TelegramBotPanel from "@/components/dashboard/TelegramBotPanel"
import GoogleCalendarPanel from "@/components/dashboard/GoogleCalendarPanel"
import {
  createManualAppointment,
  updateAppointmentStatus,
  rescheduleAppointment,
  syncAppointmentToCalendly,
  syncAppointmentToGoogle,
} from "./actions"

export const metadata = { title: "Agenda" }

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const today = startOfTodayIso()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.provider_refresh_token || session?.provider_token) {
    await captureGoogleCalendarFromSession(session).catch(() => {})
  }

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("*")
    .gte("starts_at", today)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true })
    .limit(50)

  const awaitingGaby = (appointments || []).filter(needsGabyConfirm)
  const rest = (appointments || []).filter((a) => !needsGabyConfirm(a))
  const todayKey = new Date().toDateString()
  const todays = rest.filter(
    (a) => new Date(a.starts_at).toDateString() === todayKey
  )
  const upcoming = rest.filter(
    (a) => new Date(a.starts_at).toDateString() !== todayKey
  )
  const googleAuth = await loadGoogleCalendarAuth()
  const googleConnected = await isGoogleCalendarConnected()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Citas de {config.app.name}. Confirma, reprograma o marca como completada.
        </p>
      </div>

      {config.features.telegramBot && (
        <TelegramBotPanel
          configured={isTelegramConfigured()}
          adminChatId={process.env.TELEGRAM_ADMIN_CHAT_ID || ""}
          openaiReady={Boolean(process.env.OPENAI_API_KEY)}
          botUsername={config.booking.telegramBotUsername}
          deepLink={config.booking.telegramDeepLink}
          tablesReady={!error || !/does not exist|schema cache/i.test(error.message)}
          calendlyReady={isCalendlyApiConfigured()}
          allowLocalPoller={process.env.NODE_ENV !== "production"}
        />
      )}

      <GoogleCalendarPanel
        oauthReady={googleOAuthConfigured()}
        connected={googleConnected}
        email={googleAuth?.email || ""}
        googleStatus={params.google || ""}
      />

      <form
        action={createManualAppointment}
        className="rounded-box border border-base-200 bg-base-100 p-4"
      >
        <p className="mb-3 text-sm font-medium">Nueva cita manual</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <input
            name="client_name"
            required
            placeholder="Nombre de la clienta"
            aria-label="Nombre de la clienta"
            className="input input-bordered"
          />
          <input
            name="client_phone"
            placeholder="Teléfono / WhatsApp"
            aria-label="Teléfono"
            className="input input-bordered"
          />
          <select
            name="service_slug"
            className="select select-bordered"
            aria-label="Servicio"
            defaultValue={config.services[0]?.slug}
          >
            {config.services.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name} ({s.durationMin} min)
              </option>
            ))}
          </select>
          <input
            name="starts_at"
            type="datetime-local"
            required
            aria-label="Fecha y hora"
            className="input input-bordered"
          />
          <input
            name="notes"
            placeholder="Notas (opcional)"
            aria-label="Notas"
            className="input input-bordered sm:col-span-2"
          />
        </div>
        <button type="submit" className="btn btn-primary mt-3">
          Agregar cita
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          No pudimos cargar la agenda: {error.message}
        </div>
      )}

      <AppointmentSection
        title="Por confirmar (Telegram)"
        items={awaitingGaby}
        empty="No hay horarios esperando a Gaby."
      />
      <AppointmentSection title="Hoy" items={todays} empty="No hay citas para hoy." />
      <AppointmentSection
        title="Próximas"
        items={upcoming}
        empty="No hay citas próximas."
      />
    </div>
  )
}

function AppointmentSection({ title, items, empty }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {!items?.length ? (
        <div className="rounded-box border border-dashed border-base-300 bg-base-100 px-4 py-8 text-center text-base-content/60">
          {empty}
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((appt) => (
            <AppointmentRow key={appt.id} appt={appt} />
          ))}
        </ul>
      )}
    </section>
  )
}

function AppointmentRow({ appt }) {
  const service = getService(appt.service_slug)
  const when = formatAppointmentWhen(appt.starts_at)

  return (
    <li className="rounded-box border border-base-200 bg-base-100 px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{appt.client_name || "Sin nombre"}</p>
            <span className={`badge badge-sm ${STATUS_BADGE[appt.status] || "badge-ghost"}`}>
              {STATUS_LABELS[appt.status] || appt.status}
            </span>
            <span className="badge badge-sm badge-outline">{appt.channel}</span>
          </div>
          <p className="text-sm text-base-content/80">
            {service?.name || appt.service_slug} · {when}
          </p>
          {appt.proposed_starts_at && (
            <p className="text-sm text-warning">
              Quiere cambiar a {formatAppointmentWhen(appt.proposed_starts_at)}
            </p>
          )}
          {(appt.client_phone || appt.client_email) && (
            <p className="text-sm text-base-content/60">
              {[appt.client_phone, appt.client_email].filter(Boolean).join(" · ")}
            </p>
          )}
          {appt.notes && (
            <p className="text-sm text-base-content/60">{appt.notes}</p>
          )}
          {appt.google_event_id ? (
            <p className="text-sm text-success">En Google Calendar</p>
          ) : (
            <p className="text-sm text-warning">Aún no está en Google Calendar</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(appt.status === "pending" || appt.proposed_starts_at) && (
            <>
              <form action={updateAppointmentStatus}>
                <input type="hidden" name="id" value={appt.id} />
                <input type="hidden" name="status" value="confirmed" />
                <button type="submit" className="btn btn-success btn-sm gap-1">
                  <Check className="size-4" />
                  {appt.proposed_starts_at ? "Confirmar cambio" : "Confirmar disponibilidad"}
                </button>
              </form>
              <form action={updateAppointmentStatus}>
                <input type="hidden" name="id" value={appt.id} />
                <input type="hidden" name="status" value="reject_slot" />
                <button type="submit" className="btn btn-ghost btn-sm gap-1 text-error">
                  <XCircle className="size-4" />
                  Sin cupo
                </button>
              </form>
            </>
          )}

          {["confirmed", "rescheduled"].includes(appt.status) && (
            <>
              {!appt.google_event_id && (
                <form action={syncAppointmentToGoogle}>
                  <input type="hidden" name="id" value={appt.id} />
                  <button type="submit" className="btn btn-outline btn-sm gap-1">
                    <CalendarPlus className="size-4" />
                    Subir a Google
                  </button>
                </form>
              )}
              {!appt.calendly_event_uri && (
                <form action={syncAppointmentToCalendly}>
                  <input type="hidden" name="id" value={appt.id} />
                  <button type="submit" className="btn btn-ghost btn-sm gap-1">
                    Subir a Calendly
                  </button>
                </form>
              )}
              <form action={rescheduleAppointment} className="flex items-center gap-1">
                <input type="hidden" name="id" value={appt.id} />
                <input
                  type="datetime-local"
                  name="starts_at"
                  required
                  className="input input-bordered input-sm"
                  aria-label="Nueva fecha"
                />
                <button type="submit" className="btn btn-ghost btn-sm gap-1" title="Reprogramar">
                  <CalendarClock className="size-4" />
                  Reprogramar
                </button>
              </form>

              <form action={updateAppointmentStatus}>
                <input type="hidden" name="id" value={appt.id} />
                <input type="hidden" name="status" value="completed" />
                <button type="submit" className="btn btn-ghost btn-sm gap-1" title="Completar">
                  <CircleCheck className="size-4" />
                  Completar
                </button>
              </form>

              <form action={updateAppointmentStatus}>
                <input type="hidden" name="id" value={appt.id} />
                <input type="hidden" name="status" value="cancelled" />
                <button
                  type="submit"
                  className="btn btn-ghost btn-sm gap-1 text-error"
                  title="Cancelar"
                >
                  <XCircle className="size-4" />
                  Cancelar
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </li>
  )
}
