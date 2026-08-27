import * as LucideIcons from "lucide-react"
import config from "@/config"

function Icon({ name, className }) {
  const Cmp = LucideIcons[name] || LucideIcons.Square
  return <Cmp className={className} />
}

export default function Problem() {
  const { eyebrow, title, subtitle, items } = config.landing.problem

  return (
    <section className="border-t border-primary/10 bg-base-200 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">{title}</h2>
          {subtitle && <p className="mt-4 text-base-content/70">{subtitle}</p>}
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.title}
              className="rounded-2xl border border-primary/20 bg-base-100 p-6 transition hover:border-primary/40 hover:shadow-md"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
