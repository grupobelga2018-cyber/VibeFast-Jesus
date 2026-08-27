import Link from "next/link"
import { redirect } from "next/navigation"
import config from "@/config"
import { getUser } from "@/lib/supabase/server"
import GoogleButton from "@/components/auth/GoogleButton"
import Logo from "@/components/Logo"

export const metadata = { title: "Entrar" }

export default async function LoginPage({ searchParams }) {
  const user = await getUser()
  if (user) redirect(config.auth.afterLoginUrl)

  const params = await searchParams
  const next =
    typeof params?.next === "string" ? params.next : config.auth.afterLoginUrl
  const errorCode = typeof params?.error === "string" ? params.error : ""

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-base-200 bg-base-100 p-8 shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold"
          aria-label={config.app.name}
        >
          <Logo />
          {!config.brand.logoSrc && config.brand.logoText}
        </Link>

        <h1 className="mt-6 text-2xl font-bold tracking-tight">Entra a tu cuenta</h1>
        <p className="mt-2 text-sm text-base-content/70">
          Usa tu cuenta de Google para empezar.
        </p>

        {errorCode === "access_denied" && (
          <div
            role="alert"
            className="mt-4 space-y-2 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
          >
            <p>
              Google bloqueó el acceso: la app de OAuth está en modo prueba
              (Error 403).
            </p>
            <p className="text-base-content/80">
              En{" "}
              <a
                className="link"
                href="https://console.cloud.google.com/auth/audience"
                target="_blank"
                rel="noreferrer"
              >
                Google Cloud → Audience
              </a>{" "}
              agrega tu Gmail en <b>Test users</b>. Luego vuelve a entrar.
            </p>
          </div>
        )}
        {errorCode && errorCode !== "access_denied" && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-error/40 bg-error/10 px-3 py-2 text-sm text-error"
          >
            No pudimos iniciar sesión. Intenta de nuevo.
          </div>
        )}

        <div className="mt-6">
          {config.features.googleAuth ? (
            <GoogleButton next={next} />
          ) : (
            <p className="text-sm text-base-content/60">
              El login con Google está desactivado en{" "}
              <code>config.features.googleAuth</code>.
            </p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-base-content/50">
          Al continuar aceptas los términos del curso VibeFast.
        </p>
      </div>
    </main>
  )
}
