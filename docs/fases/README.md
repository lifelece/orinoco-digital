# Fases

Cada archivo es el guion operativo de una fase: objetivo, gate de entrada,
implementacion, prompt de arranque, verificacion y STOP gate.

**Una sesion de trabajo empieza leyendo el archivo de la fase activa.**

## v1.0

| Fase | Archivo | Estado |
|---|---|---|
| 0 — Setup del entorno | [FASE-0-SETUP.md](FASE-0-SETUP.md) | Cerrada (2026-09-09) |
| 1 — Mapa base 3D | [FASE-1-MAPA-BASE.md](FASE-1-MAPA-BASE.md) | Cerrada (2026-09-09) |
| 2 — Capa Upstream | [FASE-2-UPSTREAM.md](FASE-2-UPSTREAM.md) | Cerrada (2026-09-09) |
| 3 — Midstream + Downstream | [FASE-3-MID-DOWNSTREAM.md](FASE-3-MID-DOWNSTREAM.md) | Cerrada (2026-09-09) |
| 4 — Backend Supabase | [FASE-4-BACKEND.md](FASE-4-BACKEND.md) | **Saltada** — ver ADR-010 |
| 5 — IA predictiva DEMO | [FASE-5-IA-DEMO.md](FASE-5-IA-DEMO.md) | Cerrada (2026-09-09) |
| 6-7 — Deploy + divulgacion | [FASE-6-7-DEPLOY.md](FASE-6-7-DEPLOY.md) | **En curso** — falta token restringido, Lighthouse, material y tag v1.0 |

## v2 — planificada en Notion

Paginas de Notion del 2026-09-14: *Mejora v2 — Experiencia de usuario* (M1 a
M7, prioridad 1), *Sistema de Modos* (N1 a N5) y *Funcionalidad v2 — De mapa a
monitor* (M8 a M15, prioridad 2), mas *Activos 3D*, *Skillstack* y *Prompt
maestro*. Cada hito tiene su STOP gate. **Antes de seguir el Prompt maestro, leer
[../NOTION.md](../NOTION.md)**: varias de sus reglas chocan con decisiones del
repo.

| Hito | Archivo | Estado |
|---|---|---|
| M1 — Shell de UI | [M1-SHELL-UI.md](M1-SHELL-UI.md) | **Implementado, pendiente del gate** en telefono real |
| M2 — Navegacion (jerarquia, deep-links, teclado) | — | Pendiente |
| M3 — Animacion | — | Pendiente |
| M4 — Render (iluminacion, base oscura, LOD) | — | Pendiente |
| M5 — Activos 3D glTF | — | Pendiente |
| M6 — Recorridos guiados | — | Pendiente |
| M7 — Subsuelo | — | Pendiente |
| M8 — Contrato de datos | — | **Parcial**: validador en CI (ADR-015). Falta el contrato ampliado |
| M12 — Gobernanza OSS | — | **Parcial**: `CITATION.cff` y plantilla de dato incorrecto (ADR-015). Falta Zenodo tras `v1.0` |
| M9 a M11, M13 a M15 — Pipeline vivo, pulso satelital... | — | Pendientes |
| N1 a N5 — Sistema de modos | — | Pendientes |

El diagnostico completo y lo que conviene hacer despues esta en
[../AUDITORIA-2026-09.md](../AUDITORIA-2026-09.md).

## La regla del STOP gate

Al terminar una fase, **para**. No encadenes la siguiente por inercia.

El gate existe para forzar la verificacion en dispositivo real y para que las
decisiones se tomen con la cabeza fria, no en medio del impulso de seguir
codeando.
