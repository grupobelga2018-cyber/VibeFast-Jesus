import config from "@/config"

export default function FAQ() {
  const { eyebrow, title, items } = config.landing.faq

  return (
    <section id="faq" className="border-t border-primary/10 bg-base-200 py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-4">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">{title}</h2>
        </div>

        <div className="mt-12 space-y-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-primary/20 bg-base-100 p-5 transition open:border-primary/40 open:shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.q}
                <span className="text-base-content/40 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-base-content/70">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
