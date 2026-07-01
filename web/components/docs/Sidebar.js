"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar({ tree, onNavigate }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-6 text-sm">
      {tree.map((section) => (
        <div key={section.slug}>
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-base-content/50">
            {section.label}
          </p>
          <ul className="space-y-0.5">
            {section.pages.map((page) => {
              const isActive = page.href === pathname
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    onClick={onNavigate}
                    aria-current={isActive ? "page" : undefined}
                    className={
                      "block rounded-md px-2 py-1.5 transition " +
                      (isActive
                        ? "bg-primary/10 font-medium text-primary"
                        : "text-base-content/70 hover:bg-base-200 hover:text-base-content")
                    }
                  >
                    {page.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
