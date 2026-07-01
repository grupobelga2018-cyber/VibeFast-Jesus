import Link from "next/link"
import { ArrowRight } from "lucide-react"
import config from "@/config"

export default function FinalCta() {
  const { eyebrow, title, subtitle, cta, ctaSecondary } = config.landing.finalCta

  return (
    <section className="relative overflow-hidden border-t border-base-200 bg-base-100">
      <div
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_60%_at_50%_100%,#000,transparent)]"
        aria-hidden
      >
        <div className="absolute bottom-0 left-1/2 size-[500px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-20 text-center md:py-28">
        {eyebrow && (
          <p className="text-sm font-medium uppercase tracking-wider text-primary">{eyebrow}</p>
        )}
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
        {subtitle && (
          <p className="mt-5 text-balance text-lg text-base-content/70">{subtitle}</p>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={cta.href} className="btn btn-accent btn-lg">
            {cta.label}
            <ArrowRight className="size-4" />
          </Link>
          {ctaSecondary && (
            <Link href={ctaSecondary.href} className="btn btn-ghost btn-lg">
              {ctaSecondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
