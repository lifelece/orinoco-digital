---
paths:
  - "test/**"
  - "scripts/verificar-modulos.mjs"
---

# Reglas de tests

- `node:test` y `node:assert/strict`, sin dependencias (ADR-016). Entorno comun en `test/entorno.mjs`.
- Un archivo por modulo: `test/<modulo>.test.mjs`. Nombres de test en espanol, describiendo el comportamiento.
- Cada RF de la spec con su test, citado en el nombre o en un comentario (`// RF-8`).
- Fixtures medidos con tolerancia explicita (p. ej. conteos +-1, distancias +-1 km), nunca valores copiados del codigo bajo prueba.
- Probar la propiedad que importa, no una cadena que se le parece.
- Primero el test que falla; despues el codigo. `npm test` completo antes de cerrar.
