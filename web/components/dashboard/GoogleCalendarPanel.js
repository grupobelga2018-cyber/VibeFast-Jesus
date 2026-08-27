import { Calendar } from "lucide-react"

const STATUS = {
  connected: {
    className: "text-success",
    text: "Listo. Las citas nuevas y las que faltaban ya se suben al calendario.",
  },
  missing_oauth: {
    className: "text-warning",
    text: "Faltan GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en .env.local.",
  },
  denied: {
    className: "text-error",
    text: "Google negó el permiso (403). Agrega tu Gmail en Test users y vuelve a conectar.",
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

export default function GoogleCalendarPanel({
  oauthReady,
  connected,
  email,
  googleStatus,
}) {
  const status = STATUS[googleStatus]

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
        {connected ? (
          <span className="badge badge-success">
            Conectado{email ? ` · ${email}` : ""}
          </span>
        ) : (
          <a
            href="/api/google/calendar/connect"
            className={`btn btn-sm ${oauthReady ? "btn-primary" : "btn-disabled"}`}
          >
            Conectar Google Calendar
          </a>
        )}
      </div>
      {status && <p className={`mt-3 text-sm ${status.className}`}>{status.text}</p>}
      {!oauthReady && (
        <p className="mt-3 text-sm text-warning">
          Faltan GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET en .env.local.
        </p>
      )}
      {oauthReady && !connected && (
        <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-base-content/70">
          <li>
            Habilita{" "}
            <a
              className="link"
              href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
              target="_blank"
              rel="noreferrer"
            >
              Google Calendar API
            </a>
            .
          </li>
          <li>
            En{" "}
            <a
              className="link"
              href="https://console.cloud.google.com/auth/audience"
              target="_blank"
              rel="noreferrer"
            >
              Audience
            </a>{" "}
            deja el estado en <b>Testing</b> y agrega el Gmail de Gaby en{" "}
            <b>Test users</b>. Sin eso Google responde 403 access_denied.
          </li>
          <li>
            En Data Access agrega el scope{" "}
            <code>https://www.googleapis.com/auth/calendar.events</code>.
          </li>
          <li>Pulsa Conectar y acepta el permiso con esa misma cuenta.</li>
        </ol>
      )}
    </section>
  )
}
