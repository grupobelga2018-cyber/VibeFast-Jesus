"use client"

import { useState } from "react"
import config from "@/config"

export default function Waitlist() {
  const { eyebrow, title, subtitle, buttonLabel, placeholder, successMessage } =
    config.landing.waitlist

  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | loading | success | error
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setStatus("loading")
    setError(null)
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "No pudimos guardar tu correo.")
      }
      setStatus("success")
      setEmail("")
    } catch (err) {
      setError(err.message)
      setStatus("error")
    }
  }

  return (
    <section id="waitlist" className="border-t border-base-200 bg-base-100 py-20 md:py-28">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wider text-primary">{eyebrow}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
        <p className="mt-4 text-base-content/70">{subtitle}</p>

        {status === "success" ? (
          <div
            role="status"
            className="mx-auto mt-10 max-w-md rounded-xl border border-success/40 bg-success/10 px-4 py-6 text-success"
          >
            {successMessage}
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mx-auto mt-10 flex max-w-md flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="waitlist-email" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="waitlist-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              className="input input-bordered flex-1"
              disabled={status === "loading"}
            />
            <button
              type="submit"
              className="btn btn-accent"
              disabled={status === "loading"}
            >
              {status === "loading" && <span className="loading loading-spinner loading-sm" />}
              {status === "loading" ? "Enviando…" : buttonLabel}
            </button>
          </form>
        )}

        {status === "error" && (
          <p role="alert" className="mt-3 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
