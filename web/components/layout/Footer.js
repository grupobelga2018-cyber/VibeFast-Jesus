import Link from "next/link"
import config from "@/config"
import Logo from "@/components/Logo"

function FooterLink({ link, className }) {
  const isHttp = link.href.startsWith("http")

  return (
    <Link
      href={link.href}
      target={isHttp ? "_blank" : undefined}
      rel={isHttp ? "noopener noreferrer" : undefined}
      className={className}
    >
      {link.label}
    </Link>
  )
}

export default function Footer() {
  const { tagline, columns = [] } = config.landing.footer

  return (
    <footer className="border-t border-primary/10 bg-base-100">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              {!config.brand.logoSrc && (
                <span className="font-heading text-lg font-semibold">{config.brand.logoText}</span>
              )}
            </div>
            <p className="mt-3 max-w-xs text-sm text-base-content/60">{tagline}</p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-heading text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink
                      link={link}
                      className="text-sm text-base-content/60 transition hover:text-base-content"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-primary/10 pt-6 text-sm text-base-content/50 md:flex-row md:items-center md:justify-between">
          <span>
            © {new Date().getFullYear()} {config.brand.logoText}
          </span>
          <span>Hecho con VibeFast · Remotto × Startup Chihuahua</span>
        </div>
      </div>
    </footer>
  )
}
