import { Star } from "lucide-react"
import config from "@/config"

export default function Testimonials() {
  const { eyebrow, title, subtitle, items } = config.landing.testimonials
  const socialProof = config.landing.socialProof

  return (
    <section className="border-t border-base-200 bg-base-200/40 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
          {subtitle && <p className="mt-4 text-base-content/70">{subtitle}</p>}
        </div>

        <ul className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.author}
              className="flex flex-col rounded-2xl border border-base-200 bg-base-100 p-6"
            >
              <div className="flex gap-0.5 text-primary">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-6 text-base-content/80">
                “{item.quote}”
              </blockquote>
              <div className="mt-5 flex items-center gap-3">
                <span
                  className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                  aria-hidden
                >
                  {item.author.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold">{item.author}</p>
                  <p className="text-xs text-base-content/60">{item.role}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {socialProof && (
          <div className="mt-14 text-center">
            <p className="text-sm text-base-content/60">{socialProof.text}</p>
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {socialProof.logos.map((logo) => (
                <li key={logo} className="text-sm font-semibold text-base-content/40">
                  {logo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
