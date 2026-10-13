---
paths:
  - "src/ui.js"
  - "src/ui/**"
  - "src/i18n/**"
  - "src/style.css"
  - "index.html"
  - "src/expofaja/**"
  - "expofaja/**"
---

# Reglas de interfaz

- Sin `cesium` y sin `fetch` en la interfaz (lo comprueba `verificar:modulos`). Los datos llegan desde `main.js`.
- Todo texto visible por `t(clave)`; la clave existe en `es.json` y `en.json` (test `i18n.test.mjs`). `t(clave, params)` interpola `{nombre}` (`src/i18n/interpolar.js`); los mismos marcadores en ES y EN.
- Nombres propios, titulos de terceros y nombres de fuentes no se traducen.
- Errores visibles con `mostrarError`; lo que debe sobrevivir a un redibujado no cuelga de `#ui-root` (ADR-014).
- Tokens de `@theme` en `style.css`; sin fuentes web; `amber` reservado para la capa DEMO y avisos de cautela.
- Movil primero: comprobar a 390x844; la interfaz no tapa el mapa ni los creditos de Cesium.
- Marcas de terceros solo desde `public/expofaja/marcas/` (autorizadas, ver su `AVISO.md`), en cabeceras DOM, nunca sobre el terreno.
- Antes del gate de Luis: revisar con Chrome DevTools MCP (consola sin errores, rendimiento, tamano movil). No sustituye el telefono real.
