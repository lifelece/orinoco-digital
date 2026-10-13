# specs/

Una carpeta por feature, numerada: `NNN-nombre/` con `spec.md` (que y para
que, requisitos EARS), `plan.md` (como) y `tasks.md` (tareas en orden).

La spec manda sobre el codigo: si el comportamiento cambia, primero cambia la
spec (`/sdd-cambio`). Los numeros de RF no se reutilizan.

| Spec | Estado |
|---|---|
| [001-modo-ciudad-bolivar](001-modo-ciudad-bolivar/spec.md) | Cerrada: en produccion (PR #6) y gate en telefono superado el 2026-10-13 |
| [002-micrositio-expofaja](002-micrositio-expofaja/spec.md) | Cerrada: en produccion (PR #7; memoria del evento en #9), telefono y QR superados el 2026-10-13; pendientes Lighthouse movil y `.ics` en telefono |

Flujo: `/sdd-spec` -> `/sdd-aclarar` -> `/sdd-plan` -> `/sdd-tareas` ->
`/sdd-implementar` (una tarea cada vez) -> `/sdd-validar`. Estado de todo:
`/sdd-estado`.

Los mandatos de `docs/fases/` y `docs/expofaja/` son documentos de origen:
una spec los cita, no los copia.
