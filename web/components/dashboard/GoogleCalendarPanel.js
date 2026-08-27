import { Calendar } from "lucide-react"

const STATUS = {
  connected: {
    className: "text-success",
    text: "Listo. Las citas nuevas y las que faltaban ya se suben al calendario.",
  },
  missing_oauth: {
    className: "text-warning",
    text: "El botón de conectar no basta: Vercel no tiene las claves de Google, así que el bot no puede crear eventos.",
  },
  denied: {
    className: "text-error",
    text: "Google negó el permiso (403). Agrega tu Gmail en Test users y vuelve a conectar.",
  },
  expired: {
    className: "text-warning",
    text: "El permiso de Testing caduca a los 7 días. Vuelve a pulsar Conectar Google Calendar.",
  },
  access_denied: {
    className: "text-error",
    text: "Google negó el permiso (403). Agrega tu Gmail en Test users y vuelve a conectar.",
  },
  no_refresh: {
    className: "text-warning",
    text: "Google no mandó un refresh token. Conecta otra vez y acepta todos los permisos.",
  },
  invalid: {
    className: "text-error",
    text: "El permiso de Google expiró. Conecta de nuevo.",
  },
  oauth_error: {
    className: "text-error",
    text: "Google rechazó el permiso. Revisa que Calendar API esté habilitada en Google Cloud.",
  },
}

const VERCEL_ENV_URL =
  "https://vercel.com/grupobelga2018-8056s-projects/vibe-fast-jesus-web/settings/environment-variables"

export default function GoogleCalendarPanel({
  oauthReady,
  connected,
  stale,
  needsEnv,
  email,
  googleStatus,
}) {
  const status = STATUS[googleStatus]
  const blockedByEnv = Boolean(needsEnv || !oauthReady)

  return (
    <section className="rounded-box border border-base-200 bg-base-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="size-4" />
            Google Calendar
          </p>
          <p className="mt-1 text-sm text-base-content/70">
            Las citas del bot y del dashboard se crean en el calendario de Gaby.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {connected ? (
            <span className="badge badge-success">
              Conectado{email ? ` · ${email}` : ""}
            </span>
          ) : blockedByEnv ? (
            <span className="badge badge-warning">Faltan claves en Vercel</span>
          ) : stale ? (
            <span className="badge badge-warning">Permiso caducado</span>
          ) : null}
          {!blockedByEnv && (
            <a href="/api/google/calendar/connect" className="btn btn-sm btn-primary">
              {connected ? "Volver a conectar" : "Conectar Google Calendar"}
            </a>
          )}
        </div>
      </div>
      {status && <p className={`mt-3 text-sm ${status.className}`}>{status.text}</p>}
      {blockedByEnv && (
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-sm text-base-content/80">
          <li>
            Abre{" "}
            <a className="link" href={VERCEL_ENV_URL} target="_blank" rel="noreferrer">
              Vercel → Environment Variables
            </a>{" "}
            (Production).
          </li>
          <li>
            Agrega estas dos, copiadas de <code>web/.env.local</code>:
            <ul className="mt-1 list-disc pl-5 font-mono text-xs">
              <li>GOOGLE_OAUTH_CLIENT_ID</li>
              <li>GOOGLE_OAUTH_CLIENT_SECRET</li>
            </ul>
          </li>
          <li>
            Deployments → el último deploy → <b>Redeploy</b> (sin usar caché).
          </li>
          <li>Vuelve a esta página: el botón Conectar Google Calendar aparece cuando las claves ya están.</li>
        </ol>
      )}
      {!blockedByEnv && !connected && (
        <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-base-content/70">
          <li>Pulsa Conectar y acepta el permiso con la cuenta de Gaby.</li>
        </ol>
      )}
    </section>
  )
}
