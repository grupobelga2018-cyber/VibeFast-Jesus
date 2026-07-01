"use client"

import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"

const LIGHT = "vibefast"
const DARK = "vibefast-dark"

// Alterna el tema claro/oscuro escribiendo data-theme en <html> y
// guardando la preferencia en localStorage (la lee el script del layout).
export default function ThemeToggle() {
  const [theme, setTheme] = useState(LIGHT)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTheme(document.documentElement.getAttribute("data-theme") || LIGHT)
  }, [])

  function toggle() {
    const next = theme === DARK ? LIGHT : DARK
    document.documentElement.setAttribute("data-theme", next)
    try {
      localStorage.setItem("theme", next)
    } catch {}
    setTheme(next)
  }

  const isDark = theme === DARK

  return (
    <button
      onClick={toggle}
      className="btn btn-ghost btn-sm btn-square"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title="Cambiar tema"
    >
      {/* Evita mismatch de hidratación: hasta montar, muestra un ícono estable */}
      {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
