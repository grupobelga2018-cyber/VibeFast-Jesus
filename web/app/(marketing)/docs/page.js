import Link from "next/link"
import { getDocsTree } from "@/lib/docs"

export const metadata = {
  title: "Documentación",
  description: "Guía completa del boilerplate VibeFast — mapeada al curso semana a semana.",
}

export default function DocsIndexPage() {
  const tree = getDocsTree()

  return (
    <article className="prose-vf min-w-0">
      <h1>Documentación</h1>
      <p>
        Bienvenido. Esta documentación cubre todo lo que necesitas para construir tu producto con
        VibeFast durante las 11 semanas del Curso de Vibecoding Remotto.
      </p>

      <p>
        <strong>¿Por dónde empezar?</strong> Si es tu primera vez, ve directo a{" "}
        <Link href="/docs/setup/quick-start">Setup → Quick start</Link>. Si ya tienes el proyecto
        corriendo, abre <Link href="/docs/tutoriales/semana-1-landing">el tutorial de la semana que
        toca</Link>.
      </p>

      <div className="not-prose mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {tree.map((section) => (
          <div
            key={section.slug}
            className="rounded-xl border border-base-200 bg-base-100 p-5"
          >
            <h3 className="text-base font-semibold">{section.label}</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {section.pages.slice(0, 5).map((page) => (
                <li key={page.href}>
                  <Link href={page.href} className="text-base-content/70 hover:text-primary">
                    {page.label}
                  </Link>
                </li>
              ))}
              {section.pages.length > 5 && (
                <li className="text-xs text-base-content/50">
                  +{section.pages.length - 5} más…
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </article>
  )
}
