# Flujo — Agendar cita

## Diagrama

```mermaid
flowchart TD
    n1(Cliente visita la página web)
    n2[Cliente elige un servicio]
    n3[Cliente decide realizar una cita]
    n4{¿Cómo prefiere agendar?}
    n5[Accede a la agenda y escoge día y hora - CALENDLY APP]
    n6{¿Hay disponibilidad?}
    n8[Agenda la cita en la web]
    n9[Abre el chat de TELEGRAM]
    n10[Coordina día y hora con Gaby]
    n11[Gaby confirma la disponibilidad]
    n12[Cita registrada]
    n13[Confirmación por TELEGRAM]
    n14[Recordatorio 24 h antes por TELEGRAM]
    n16{¿Necesita reprogramar?}
    n15(Cliente asiste a la cita)
    n17[Solicita el cambio por TELEGRAM]
    n18[Elige nueva fecha y hora]
    n19[Gaby confirma y actualiza la cita]

    n1 --> n2
    n2 --> n3
    n3 --> n4
    n4 -->|En línea| n5
    n4 -->|Por TELEGRAM| n9
    n5 --> n6
    n6 -->|Sí| n8
    n6 -->|No · elegir otra fecha| n5
    n8 --> n12
    n9 --> n10
    n10 --> n11
    n11 --> n12
    n12 --> n13
    n13 --> n14
    n14 --> n16
    n16 -->|No| n15
    n16 -->|Sí| n17
    n17 --> n18
    n18 --> n19
    n19 -->|Cita reprogramada| n12
```

## Descripción del flujo

1. **Cliente visita la página web** → elige un servicio → decide realizar una cita.
2. **Decisión — ¿Cómo prefiere agendar?**
   - **En línea:** accede a la agenda (Calendly) y escoge día y hora.
     - **¿Hay disponibilidad?**
       - **Sí:** agenda la cita en la web → *Cita registrada*.
       - **No:** regresa a elegir otra fecha.
   - **Por Telegram:** abre el chat → coordina día y hora con Gaby → Gaby confirma disponibilidad → *Cita registrada*.
3. **Cita registrada** → confirmación por Telegram → recordatorio 24 h antes por Telegram.
4. **Decisión — ¿Necesita reprogramar?**
   - **No:** el cliente asiste a la cita (fin del flujo).
   - **Sí:** solicita el cambio por Telegram → elige nueva fecha y hora → Gaby confirma y actualiza → regresa a *Cita registrada* (cita reprogramada).
