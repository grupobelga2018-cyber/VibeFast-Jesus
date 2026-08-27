import config from "@/config"

function welcomeLines() {
  const services = config.services.map((s) => `• ${s.name}`).join("\n")
  return [
    `Hola 👋 Soy el asistente de ${config.app.name}.`,
    "",
    "Servicios:",
    services,
    "",
    "Coordina conmigo el servicio, el día y la hora. Si el cupo está libre, la dejo en el calendario y te confirmo aquí. 24 h antes te mando un recordatorio.",
    "Si más adelante necesitas cambiar la cita, escríbeme aquí.",
  ]
}

export function telegramWelcomePlainText() {
  return welcomeLines().join("\n")
}

export function telegramWelcomeText() {
  const rest = welcomeLines().slice(1)
  return [`Hola 👋 Soy el asistente de <b>${config.app.name}</b>.`, ...rest].join(
    "\n"
  )
}
