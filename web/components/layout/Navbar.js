import Link from "next/link"
import { Menu } from "lucide-react"
import config from "@/config"
import Logo from "@/components/Logo"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-primary/15 bg-base-100/90 backdrop-blur">
      <nav className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <div className="dropdown md:hidden">
            <label tabIndex={0} className="btn btn-ghost btn-sm px-2" aria-label="Abrir menú">
              <Menu className="size-5" />
            </label>
            <ul
              tabIndex={0}
              className="menu dropdown-content z-50 mt-2 w-52 rounded-box border border-primary/20 bg-base-100 p-2 shadow"
            >
              {config.landing.nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label={config.app.name}
          >
            <Logo />
            {!config.brand.logoSrc && (
              <span className="text-lg font-bold tracking-tight">{config.brand.logoText}</span>
            )}
          </Link>
        </div>

        <ul className="hidden items-center justify-center gap-8 md:flex">
          {config.landing.nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm font-medium tracking-wide text-base-content/70 transition hover:text-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-2">
          {config.features.googleAuth && (
            <Link href={config.auth.loginUrl} className="btn btn-sm btn-ghost hidden sm:inline-flex">
              Entrar
            </Link>
          )}
          <Link href={config.landing.hero.cta.href} className="btn btn-sm btn-accent">
            {config.landing.hero.cta.label}
          </Link>
        </div>
      </nav>
    </header>
  )
}
