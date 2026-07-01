import { Check, RotateCcw, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { createItem, toggleItem, deleteItem } from "./actions"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: items, error } = await supabase
    .from("core_items")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tu dashboard</h1>
        <p className="mt-1 text-sm text-base-content/70">
          CRUD genérico sobre <code>core_items</code>. En Sem 2 lo renombras a
          tu dominio (leads, recetas, proyectos…).
        </p>
      </div>

      {/* Crear */}
      <form
        action={createItem}
        className="rounded-box border border-base-200 bg-base-100 p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Título del item"
            aria-label="Título del item"
            className="input input-bordered flex-1"
          />
          <input
            name="description"
            maxLength={280}
            placeholder="Descripción (opcional)"
            aria-label="Descripción del item"
            className="input input-bordered flex-1"
          />
          <button type="submit" className="btn btn-primary">
            Agregar
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          No pudimos cargar tus items: {error.message}
        </div>
      )}

      {/* Lista */}
      {!items?.length ? (
        <div className="rounded-box border border-dashed border-base-300 bg-base-100 px-4 py-12 text-center text-base-content/60">
          Aún no tienes items. Crea el primero arriba.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-box border border-base-200 bg-base-100 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p
                  className={
                    item.status === "done"
                      ? "truncate font-medium text-base-content/40 line-through"
                      : "truncate font-medium"
                  }
                >
                  {item.title}
                </p>
                {item.description && (
                  <p className="truncate text-sm text-base-content/60">
                    {item.description}
                  </p>
                )}
              </div>

              <span
                className={`badge badge-sm ${
                  item.status === "done" ? "badge-success" : "badge-ghost"
                }`}
              >
                {item.status}
              </span>

              <form action={toggleItem}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="status" value={item.status} />
                <button
                  type="submit"
                  className="btn btn-ghost btn-sm btn-square"
                  title={item.status === "done" ? "Reabrir" : "Marcar como hecho"}
                  aria-label={item.status === "done" ? "Reabrir item" : "Marcar como hecho"}
                >
                  {item.status === "done" ? (
                    <RotateCcw className="size-4" />
                  ) : (
                    <Check className="size-4" />
                  )}
                </button>
              </form>

              <form action={deleteItem}>
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  className="btn btn-ghost btn-sm btn-square text-error"
                  title="Borrar"
                  aria-label={`Borrar ${item.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
