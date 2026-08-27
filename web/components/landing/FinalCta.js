import Link from "next/link"
import { ArrowRight, MessageCircle } from "lucide-react"
import config from "@/config"

export default function FinalCta() {
  const { eyebrow, title, subtitle, cta, ctaSecondary } = config.landing.finalCta
  const whatsapp = config.contact?.whatsapp

  return (
    <section className="bg-primary text-primary-content">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center md:py-20">
        {eyebrow && (
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-content/80">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-3 text-balance text-3xl font-semibold md:text-5xl">{title}</h2>
        {subtitle && (
          <p className="mt-5 text-balance text-lg text-primary-content/85">{subtitle}</p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={cta.href}
            className="btn btn-lg border-white bg-white text-primary hover:border-white hover:bg-white/90"
          >
            {cta.label}
            <ArrowRight className="size-4" />
          </Link>
          {ctaSecondary && (
            <Link
              href={ctaSecondary.href}
              className="btn btn-lg btn-outline border-white text-white hover:border-white hover:bg-white/10"
            >
              {ctaSecondary.label}
            </Link>
          )}
          {whatsapp && (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-lg btn-outline border-white text-white hover:border-white hover:bg-white/10"
            >
              <MessageCircle className="size-4" />
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
