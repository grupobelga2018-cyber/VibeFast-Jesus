import { runRecoverDecideAct } from "@/lib/agents/examples/recoverDecideAct"

export const runtime = "nodejs"
export const maxDuration = 60

// POST /api/ai/agent — SSE stream of agent events
export async function POST(request) {
  try {
    const { messages, conversationId } = await request.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json(
        { error: "messages debe ser un array no vacío." },
        { status: 400 }
      )
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        }
        try {
          for await (const event of runRecoverDecideAct({
            messages,
            conversationId,
          })) {
            send(event)
          }
        } catch (err) {
          send({
            type: "error",
            message: err?.message || "fallo del agente",
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch {
    return Response.json(
      { error: "Error procesando la solicitud." },
      { status: 500 }
    )
  }
}
