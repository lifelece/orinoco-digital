# specs/

Una carpeta por feature, numerada: `NNN-nombre/` con `spec.md` (que y para
que, requisitos EARS), `plan.md` (como) y `tasks.md` (tareas en orden).

La spec manda sobre el codigo: si el comportamiento cambia, primero cambia la
spec (`/sdd-cambio`). Los numeros de RF no se reutilizan.

| Spec | Estado |
|---|---|
| [001-modo-ciudad-bolivar](001-modo-ciudad-bolivar/spec.md) | Implementada (2026-10-13), PR abierto; falta el gate en telefono |

Flujo: `/sdd-spec` -> `/sdd-aclarar` -> `/sdd-plan` -> `/sdd-tareas` ->
`/sdd-implementar` (una tarea cada vez) -> `/sdd-validar`. Estado de todo:
`/sdd-estado`.

Los mandatos de `docs/fases/` y `docs/expofaja/` son documentos de origen:
una spec los cita, no los copia.
