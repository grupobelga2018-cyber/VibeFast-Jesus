import * as LucideIcons from "lucide-react"
import config from "@/config"

function Icon({ name, className }) {
  const Cmp = LucideIcons[name] || LucideIcons.Square
  return <Cmp className={className} />
}

const CHIP_COLORS = [
  "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-content",
  "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-content",
  "bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-secondary-content",
]

export default function Features() {
  const { eyebrow, title, subtitle, items } = config.landing.features

  return (
    <section id="features" className="border-t border-primary/10 bg-base-100 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">{title}</h2>
          {subtitle && <p className="mt-4 text-base-content/70">{subtitle}</p>}
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <li
              key={item.title}
              className="group rounded-2xl border border-primary/20 bg-base-100 p-6 transition hover:border-primary/50 hover:shadow-md"
            >
              <div
                className={
                  "mb-4 inline-flex size-10 items-center justify-center rounded-xl transition " +
                  CHIP_COLORS[i % CHIP_COLORS.length]
                }
              >
                <Icon name={item.icon} className="size-5" />
              </div>
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-base-content/70">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
