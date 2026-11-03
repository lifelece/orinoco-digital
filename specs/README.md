# specs/

Una carpeta por feature, numerada: `NNN-nombre/` con `spec.md` (que y para
que, requisitos EARS), `plan.md` (como) y `tasks.md` (tareas en orden).

La spec manda sobre el codigo: si el comportamiento cambia, primero cambia la
spec (`/sdd-cambio`). Los numeros de RF no se reutilizan.

| Spec | Estado |
|---|---|
| [001-modo-ciudad-bolivar](001-modo-ciudad-bolivar/spec.md) | Cerrada: en produccion (PR #6) y gate en telefono superado el 2026-10-13; RF-22/23 (PR #18) superados el 2026-10-14 |
| [002-micrositio-expofaja](002-micrositio-expofaja/spec.md) | Cerrada: en produccion (PR #7; memoria del evento en #9), telefono y QR superados el 2026-10-13; `.ics` y RF-78 (PR #17) superados el 2026-10-14; pendiente Lighthouse movil |
| [003-ruta-de-aprendizaje](003-ruta-de-aprendizaje/spec.md) | P0 cerrada (spec en main, PR #23; ADR-023 aceptado). P1 (piloto R5) implementada en la rama `ruta-r5`, esperando el gate de Luis en telefono real; D3b pendiente de Chrome. Siguiente: P2 |

Flujo: `/sdd-spec` -> `/sdd-aclarar` -> `/sdd-plan` -> `/sdd-tareas` ->
`/sdd-implementar` (una tarea cada vez) -> `/sdd-validar`. Estado de todo:
`/sdd-estado`.

Los mandatos de `docs/fases/` y `docs/expofaja/` son documentos de origen:
una spec los cita, no los copia.
