# Fases

Cada archivo es el guion operativo de una fase: objetivo, gate de entrada,
implementacion, prompt de arranque, verificacion y STOP gate.

**Una sesion de trabajo empieza leyendo el archivo de la fase activa.**

| Fase | Archivo | Estado |
|---|---|---|
| 0 — Setup del entorno | [FASE-0-SETUP.md](FASE-0-SETUP.md) | Falta solo el token de Cesium |
| 1 — Mapa base 3D | [FASE-1-MAPA-BASE.md](FASE-1-MAPA-BASE.md) | Siguiente |
| 2 — Capa Upstream | [FASE-2-UPSTREAM.md](FASE-2-UPSTREAM.md) | Pendiente |
| 3 — Midstream + Downstream | [FASE-3-MID-DOWNSTREAM.md](FASE-3-MID-DOWNSTREAM.md) | Pendiente — **cierra el MVP** |
| 4 — Backend Supabase | [FASE-4-BACKEND.md](FASE-4-BACKEND.md) | **Opcional** — ver ADR-003 |
| 5 — IA predictiva DEMO | [FASE-5-IA-DEMO.md](FASE-5-IA-DEMO.md) | Pendiente |
| 6-7 — Deploy + divulgacion | [FASE-6-7-DEPLOY.md](FASE-6-7-DEPLOY.md) | Pendiente |

## La regla del STOP gate

Al terminar una fase, **para**. No encadenes la siguiente por inercia.

El gate existe para forzar la verificacion en dispositivo real y para que las
decisiones se tomen con la cabeza fria, no en medio del impulso de seguir
codeando.
