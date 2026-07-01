import Link from "next/link"
import { Menu } from "lucide-react"
import config from "@/config"
import Logo from "@/components/Logo"

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-base-200 bg-base-100/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Menú móvil */}
          <div className="dropdown md:hidden">
            <label tabIndex={0} className="btn btn-ghost btn-sm px-2" aria-label="Abrir menú">
              <Menu className="size-5" />
            </label>
            <ul
              tabIndex={0}
              className="menu dropdown-content z-50 mt-2 w-52 rounded-box border border-base-200 bg-base-100 p-2 shadow"
            >
              {config.landing.nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Logo className="size-7" />
            {config.brand.logoText}
          </Link>
        </div>

        <ul className="hidden items-center gap-6 md:flex">
          {config.landing.nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm text-base-content/70 transition hover:text-base-content"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {config.features.googleAuth && (
            <Link href={config.auth.loginUrl} className="btn btn-sm btn-ghost">
              Entrar
            </Link>
          )}
          <Link href="#waitlist" className="btn btn-sm btn-accent">
            {config.landing.hero.cta.label}
          </Link>
        </div>
      </nav>
    </header>
  )
}
