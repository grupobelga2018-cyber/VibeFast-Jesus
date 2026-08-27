// ============================================================
// Color Hair by Gabby · config.js
// ------------------------------------------------------------
// Branding, copy, features y booking. Cambiar este archivo
// cambia el producto sin abrir JSX.
// ============================================================

const config = {
  app: {
    name: "Color Hair by Gabby",
    description:
      "Color, corte, peinados, faciales y maquillaje con Gaby Carmona: conoce el salón, los servicios y reserva con confianza antes de tu primera visita.",
    domain: "colorhairbygabby.com",
    locale: "es",
    defaultUrl: "http://localhost:3000",
  },

  brand: {
    primary: "#C45B7A",
    logoText: "Color Hair by Gabby",
    logoSrc: "/logo.png",
    radius: "1rem",
  },

  features: {
    waitlist: false,
    booking: true,
    calendly: true,
    telegramBot: true,
    googleAuth: true,
    googleCalendar: true,
    emailLogin: false,
    aiChat: true,
    toolUse: true,
    agents: true,
    mcp: false,
    rag: false,
    posthog: false,
    resend: true,
    pricing: true, // muestra catálogo de servicios en landing
    payments: false,
    hardware: false,
  },

  // Catálogo de servicios (landing + bot Telegram)
  services: [
    {
      slug: "corte",
      name: "Corte",
      durationMin: 60,
      priceFrom: 350,
      currency: "MXN",
      description: "Corte personalizado según tu tipo de cabello y estilo.",
    },
    {
      slug: "color",
      name: "Color",
      durationMin: 120,
      priceFrom: 800,
      currency: "MXN",
      description: "Coloración profesional con diagnóstico previo.",
    },
    {
      slug: "peinado",
      name: "Peinado",
      durationMin: 90,
      priceFrom: 450,
      currency: "MXN",
      description: "Peinados para eventos, bodas o el día a día.",
    },
    {
      slug: "facial",
      name: "Facial",
      durationMin: 75,
      priceFrom: 500,
      currency: "MXN",
      description: "Limpieza y cuidado facial adaptado a tu piel.",
    },
    {
      slug: "maquillaje",
      name: "Maquillaje",
      durationMin: 60,
      priceFrom: 600,
      currency: "MXN",
      description: "Maquillaje profesional para ocasiones especiales.",
    },
  ],

  booking: {
    calendlyUrl:
      process.env.NEXT_PUBLIC_CALENDLY_URL ||
      "https://calendly.com/colorhairbygabby",
    telegramBotUsername:
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "ColorHairGabbyBot",
    telegramDeepLink:
      process.env.NEXT_PUBLIC_TELEGRAM_DEEP_LINK ||
      "https://t.me/ColorHairGabbyBot",
    timezone: "America/Mexico_City",
  },

  contact: {
    phone: "+52 614 286 0158",
    tel: "tel:+526142860158",
    whatsapp: "https://wa.me/526142860158",
  },

  ai: {
    chatModel: "gpt-4o-mini",
    structuredModel: "gpt-4o-mini",
    agentModel: "gpt-4o",
    embeddingModel: "text-embedding-3-small",
    maxTokens: 1500,
    temperature: 0.4,
  },

  email: {
    from: "Color Hair by Gabby <onboarding@resend.dev>",
    replyTo: "hola@colorhairbygabby.com",
    supportEmail: "hola@colorhairbygabby.com",
  },

  auth: {
    loginUrl: "/login",
    afterLoginUrl: "/dashboard",
    afterLogoutUrl: "/",
    providers: ["google"],
  },

  landing: {
    nav: [
      { label: "Servicios", href: "#pricing" },
      { label: "Reservar", href: "#reservar" },
      { label: "Preguntas", href: "#faq" },
    ],
    hero: {
      eyebrow: "Salón de belleza · Primera visita clara",
      title: "Llega a tu primera cita sin dudas.",
      subtitle:
        "Conoce el ambiente, los servicios y lo que esperar. Reserva en línea o por Telegram con Gaby.",
      cta: { label: "Reservar cita", href: "#reservar" },
      ctaSecondary: { label: "Ver servicios", href: "#pricing" },
      image: "/services/peinado.png",
    },
    problem: {
      eyebrow: "Antes de llegar",
      title: "Las dudas que frenan la primera visita.",
      subtitle:
        "Sin información clara de servicios, tiempos y cómo agendar, muchas clientas posponen su cita.",
      items: [
        {
          icon: "HelpCircle",
          title: "No sé qué servicio necesito",
          body: "Entre color, corte y tratamientos es fácil confundirse sin una guía sencilla.",
        },
        {
          icon: "Clock",
          title: "No sé cuánto tiempo tomará",
          body: "Reservar a ciegas genera ansiedad. Aquí ves duración orientativa de cada servicio.",
        },
        {
          icon: "MessageCircle",
          title: "Prefiero preguntar por chat",
          body: "También puedes agendar por Telegram con Gaby, a tu ritmo y con confirmación clara.",
        },
      ],
    },
    features: {
      eyebrow: "Tu experiencia",
      title: "Todo listo para tu primera visita.",
      subtitle: "Transparencia, agenda fácil y acompañamiento hasta el día de tu cita.",
      items: [
        {
          icon: "Images",
          title: "Resultados reales",
          body: "Mira trabajos de clientas reales para saber qué esperar en tu primera visita.",
        },
        {
          icon: "Scissors",
          title: "Servicios transparentes",
          body: "Cada tratamiento con duración y descripción clara, sin sorpresas al llegar.",
        },
        {
          icon: "CalendarCheck",
          title: "Agenda en un clic",
          body: "Reserva en Calendly o por Telegram. Confirmación y recordatorio incluidos.",
        },
      ],
    },
    faq: {
      eyebrow: "Preguntas frecuentes",
      title: "Lo que toda clienta pregunta antes de hacer una cita.",
      items: [
        {
          q: "¿Necesito cita previa?",
          a: "Sí. Así te dedicamos el tiempo completo y evitas esperas. Puedes reservar en línea o por Telegram.",
        },
        {
          q: "¿Cuánto dura la primera visita?",
          a: "Depende del servicio. Un corte suele tomar 45–60 min; color o tratamientos, entre 90 y 150 min.",
        },
        {
          q: "¿Qué pasa si es mi primera vez?",
          a: "Empezamos con una consulta breve para entender lo que buscas. Sin presión: tú decides el servicio.",
        },
        {
          q: "¿Puedo reprogramar?",
          a: "Sí. Escríbele al bot de Telegram o a Gaby y actualizamos tu cita con confirmación nueva.",
        },
        {
          q: "¿Cómo llego y dónde me estaciono?",
          a: "Al confirmar tu cita te enviamos la dirección exacta, referencias y opciones de estacionamiento.",
        },
      ],
    },
    socialProof: {
      text: "Clientas que ya eligieron nuestros servicios",
      logos: ["Color", "Corte", "Peinado", "Facial", "Maquillaje"],
    },
    testimonials: {
      eyebrow: "Prueba social",
      title: "Clientas que han disfrutado de nuestros servicios.",
      subtitle: "Experiencias reales en el salón.",
      items: [
        {
          quote:
            "Agendé por la web en minutos y me llegó el recordatorio un día antes. Llegué tranquila y sin dudas.",
          author: "Mariana R.",
          role: "Color + corte",
        },
        {
          quote:
            "Preferí Telegram. Gaby me ayudó a elegir el servicio y confirmamos el horario al instante.",
          author: "Sofía L.",
          role: "Primera visita",
        },
        {
          quote:
            "Reprogramé por el chat sin drama. La cita quedó clara y el resultado del peinado fue hermoso.",
          author: "Andrea V.",
          role: "Peinado de evento",
        },
      ],
    },
    booking: {
      eyebrow: "Reservar",
      title: "Elige cómo agendar tu cita.",
      subtitle:
        "Reserva en línea con Calendly o escribe por Telegram. En ambos casos recibes confirmación y recordatorio.",
      onlineTitle: "En línea",
      onlineBody: "Escoge día y hora en la agenda. Ideal si ya sabes qué servicio quieres.",
      onlineCta: "Abrir agenda",
      telegramTitle: "Por Telegram",
      telegramBody:
        "Coordina servicio, día y hora con el asistente. Gaby confirma el cupo y te llega la confirmación por Telegram, con recordatorio 24 h antes.",
      telegramCta: "INICIA CONVERSACIÓN",
    },
    finalCta: {
      eyebrow: "Tu turno",
      title: "Agenda tu cita con Gaby hoy.",
      subtitle:
        "Elige horario en línea o escribe por Telegram. Te confirmamos y te recordamos un día antes.",
      cta: { label: "Reservar cita", href: "#reservar" },
      ctaSecondary: { label: "Ver servicios", href: "#pricing" },
    },
    waitlist: {
      eyebrow: "Únete primero",
      title: "Sé de los primeros en saber.",
      subtitle: "Te avisamos cuando haya cupos nuevos.",
      successMessage: "¡Listo! Te avisamos en cuanto haya novedades.",
      buttonLabel: "Quiero entrar",
      placeholder: "tu@email.com",
    },
    footer: {
      tagline: "Color Hair by Gabby · belleza con claridad desde la primera cita.",
      columns: [
        {
          title: "Salón",
          links: [
            { label: "Servicios", href: "#pricing" },
            { label: "Reservar", href: "#reservar" },
            { label: "Preguntas", href: "#faq" },
          ],
        },
        {
          title: "Contacto",
          links: [
            { label: "+52 614 286 0158", href: "tel:+526142860158" },
            { label: "Telegram", href: "https://t.me/ColorHairGabbyBot", external: true },
            { label: "Agenda en línea", href: "#reservar" },
          ],
        },
      ],
      links: [
        { label: "Reservar", href: "#reservar" },
        { label: "Telegram", href: "https://t.me/ColorHairGabbyBot", external: true },
      ],
    },
  },

  // Usa la sección pricing de la landing como vitrina de servicios
  pricing: {
    eyebrow: "Servicios",
    title: "Elige lo que necesitas.",
    subtitle: "Precios desde (orientativos). Al agendar te confirmamos el detalle.",
    plans: [
      {
        id: "corte",
        name: "Corte",
        price: 350,
        currency: "MXN",
        interval: "",
        description: "60 min · personalizado a tu estilo.",
        features: ["Consulta breve", "Lavado incluido", "Acabado"],
        cta: "Reservar",
        image: "/services/corte.png",
      },
      {
        id: "color",
        name: "Color",
        price: 800,
        currency: "MXN",
        interval: "",
        description: "120 min · diagnóstico + coloración.",
        features: ["Diagnóstico de cabello", "Color profesional", "Cuidado post"],
        cta: "Reservar",
        highlighted: true,
        image: "/services/color.png",
      },
      {
        id: "peinado",
        name: "Peinado",
        price: 450,
        currency: "MXN",
        interval: "",
        description: "90 min · eventos, bodas o día a día.",
        features: ["Estilo a tu ocasión", "Fijación duradera", "Acabado"],
        cta: "Reservar",
        image: "/services/peinado.png",
      },
      {
        id: "facial",
        name: "Facial",
        price: 500,
        currency: "MXN",
        interval: "",
        description: "75 min · limpieza y cuidado de piel.",
        features: ["Diagnóstico de piel", "Limpieza profunda", "Hidratación"],
        cta: "Reservar",
        image: "/services/facial.png",
      },
      {
        id: "maquillaje",
        name: "Maquillaje",
        price: 600,
        currency: "MXN",
        interval: "",
        description: "60 min · profesional para ocasiones especiales.",
        features: ["Maquillaje de evento", "Productos profesionales", "Retoque incluido"],
        cta: "Reservar",
        image: "/services/maquillaje.png",
      },
    ],
  },
}

export default config
