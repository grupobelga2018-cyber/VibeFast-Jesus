import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import config from "@/config"

export default function Hero() {
  const { eyebrow, title, subtitle, cta, ctaSecondary, image } = config.landing.hero

  return (
    <section className="relative overflow-hidden bg-base-200">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
      >
        <div className="absolute left-[-8rem] top-[-6rem] size-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-[-4rem] bottom-[-8rem] size-[360px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:gap-14 md:py-24">
        <div>
          {eyebrow && (
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
          )}

          <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
            {title}
          </h1>

          <p className="mt-6 max-w-xl text-balance text-lg leading-relaxed text-base-content/70 md:text-xl">
            {subtitle}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href={cta.href} className="btn btn-accent btn-lg">
              {cta.label}
              <ArrowRight className="size-4" />
            </Link>
            {ctaSecondary && (
              <Link href={ctaSecondary.href} className="btn btn-outline btn-primary btn-lg">
                {ctaSecondary.label}
              </Link>
            )}
          </div>

          <p className="mt-4 text-sm text-base-content/50">
            En línea o por Telegram · confirmación incluida
          </p>
        </div>

        {image && (
          <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-3xl border border-primary/20 shadow-xl shadow-primary/15 md:max-w-none">
            <Image
              src={image}
              alt={config.app.name}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 768px) 40vw, 90vw"
            />
          </div>
        )}
      </div>
    </section>
  )
}
