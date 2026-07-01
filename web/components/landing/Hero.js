import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import config from "@/config"

export default function Hero() {
  const { eyebrow, title, subtitle, cta, ctaSecondary } = config.landing.hero

  return (
    <section className="relative overflow-hidden">
      {/* Glow de fondo */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(60%_50%_at_50%_0%,#000,transparent)]"
        aria-hidden
      >
        <div className="absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-20 pb-16 text-center md:pt-28 md:pb-24">
        {eyebrow && (
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 py-1 text-xs font-medium text-base-content/70">
            <Sparkles className="size-3.5 text-primary" />
            {eyebrow}
          </div>
        )}

        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-6xl">{title}</h1>

        <p className="mt-6 text-balance text-lg leading-relaxed text-base-content/70 md:text-xl">
          {subtitle}
        </p>

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
