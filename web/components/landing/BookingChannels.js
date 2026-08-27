"use client"

import { CalendarDays, MessageCircle } from "lucide-react"
import config from "@/config"

export default function BookingChannels() {
  const copy = config.landing.booking
  const { calendlyUrl, telegramDeepLink } = config.booking
  const showCalendly = config.features.calendly
  const showTelegram = config.features.telegramBot

  return (
    <section id="reservar" className="border-t border-primary/10 bg-base-100 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">{copy.title}</h2>
          <p className="mt-4 text-base-content/70">{copy.subtitle}</p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {showCalendly && (
            <div className="flex flex-col rounded-2xl border border-primary/20 bg-base-100 p-6 shadow-sm transition hover:border-primary/40">
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="size-5" />
              </div>
              <h3 className="text-xl font-semibold">{copy.onlineTitle}</h3>
              <p className="mt-2 text-sm text-base-content/70">{copy.onlineBody}</p>

              <ul className="mt-6 space-y-3 text-sm text-base-content/80">
                <li>1. Elige el servicio y el horario.</li>
                <li>2. Deja tu nombre y correo.</li>
                <li>3. Recibe confirmación y recordatorio.</li>
              </ul>

              <a
                href={calendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary mt-auto w-full sm:w-auto"
              >
                <CalendarDays className="size-4" />
                {copy.onlineCta}
              </a>
            </div>
          )}

          {showTelegram && (
            <div className="flex flex-col rounded-2xl border border-primary/20 bg-base-100 p-6 shadow-sm transition hover:border-primary/40">
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <MessageCircle className="size-5" />
              </div>
              <h3 className="text-xl font-semibold">{copy.telegramTitle}</h3>
              <p className="mt-2 text-sm text-base-content/70">{copy.telegramBody}</p>

              <ul className="mt-6 space-y-3 text-sm text-base-content/80">
                <li>1. Abre el chat del asistente.</li>
                <li>2. Coordina servicio, día y hora.</li>
                <li>3. Gaby confirma la disponibilidad.</li>
                <li>4. Recibes confirmación y recordatorio 24 h antes.</li>
                <li>5. Si necesitas cambiar, escríbele al bot.</li>
              </ul>

              <a
                href={telegramDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-accent mt-auto w-full sm:w-auto"
              >
                <MessageCircle className="size-4" />
                {copy.telegramCta}
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
