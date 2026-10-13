# specs/

Una carpeta por feature, numerada: `NNN-nombre/` con `spec.md` (que y para
que, requisitos EARS), `plan.md` (como) y `tasks.md` (tareas en orden).

La spec manda sobre el codigo: si el comportamiento cambia, primero cambia la
spec (`/sdd-cambio`). Los numeros de RF no se reutilizan.

| Spec | Estado |
|---|---|
| [001-modo-ciudad-bolivar](001-modo-ciudad-bolivar/spec.md) | En produccion (PR #6, 2026-10-13); falta el gate en telefono |
| [002-micrositio-expofaja](002-micrositio-expofaja/spec.md) | En produccion (PR #7, 2026-10-13; memoria del evento en #9); falta el gate en telefono y el QR impreso |

Flujo: `/sdd-spec` -> `/sdd-aclarar` -> `/sdd-plan` -> `/sdd-tareas` ->
`/sdd-implementar` (una tarea cada vez) -> `/sdd-validar`. Estado de todo:
`/sdd-estado`.

Los mandatos de `docs/fases/` y `docs/expofaja/` son documentos de origen:
una spec los cita, no los copia.
