import { getSearchIndex } from "@/lib/docs"

// Índice estático generado en build; se sirve como JSON al modal cmd-K.
export const dynamic = "force-static"

export function GET() {
  return Response.json(getSearchIndex())
}
