---
paths:
  - "src/map.js"
  - "src/controladorRender.js"
  - "src/iconos.js"
  - "vite.config.js"
---

# Reglas del mapa (CesiumJS)

- Solo `map.js` importa `cesium`. `controladorRender.js` opera por duck-typing sobre el viewer (ADR-019).
- API de Cesium 1.145: verifica cada clase o metodo con Context7 o en `node_modules/cesium` antes de usarlo. No escribas APIs de memoria.
- `requestRenderMode: true` siempre. Animaciones y vuelos: `pedirRenderContinuo(id)` y `liberarRenderContinuo(id)` con un id propio; cambios puntuales: `pedirRenderPuntual(motivo)`.
- Capas apagadas fuera del viewer, no ocultas dentro (ADR-019).
- Calidad del terreno: un valor con la camara en movimiento y otro en reposo (error 5 de PROCESO).
- Colores: campos por hidrocarburo (ADR-012); colores de mapa en `config.js`, no en los tokens del chrome (ADR-014). Colores de marcas de terceros prohibidos en marcadores.
- Vuelos: respetar `prefers-reduced-motion` (ADR-018).
- Setup: `vite-plugin-static-copy` + `CESIUM_BASE_URL` (ADR-002). Nunca `vite-plugin-cesium`.
- Tras tocar este codigo: `npm run build` y comprobar que el bundle trae Cesium.
