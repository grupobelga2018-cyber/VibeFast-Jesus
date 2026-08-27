import Image from "next/image"
import Link from "next/link"
import { Check } from "lucide-react"
import config from "@/config"

export default function Pricing() {
  const { eyebrow, title, subtitle, plans } = config.pricing

  return (
    <section id="pricing" className="border-t border-primary/10 bg-base-200 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">{title}</h2>
          {subtitle && <p className="mt-4 text-base-content/70">{subtitle}</p>}
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col overflow-hidden rounded-2xl border bg-base-100 transition ${
                plan.highlighted
                  ? "border-primary shadow-lg shadow-primary/15"
                  : "border-primary/20 hover:border-primary/50 hover:shadow-md"
              }`}
            >
              {plan.image && (
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={plan.image}
                    alt={plan.name}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                  {plan.highlighted && (
                    <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-content">
                      Más popular
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 text-sm text-base-content/60">{plan.description}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight">
                    {plan.price === 0
                      ? "Gratis"
                      : `Desde $${plan.price}${plan.currency ? ` ${plan.currency}` : ""}`}
                  </span>
                  {plan.price !== 0 && plan.interval && (
                    <span className="text-sm text-base-content/60">
                      {plan.currency}/{plan.interval}
                    </span>
                  )}
                </div>

                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-base-content/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="#reservar"
                  className={`btn mt-6 ${plan.highlighted ? "btn-accent" : "btn-outline btn-primary"}`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
