/**
 * entorno.mjs — Prepara Node para importar modulos de src/ sin Vite.
 *
 * src/config.js lee `import.meta.env`, que solo existe dentro de Vite. En Node
 * vale undefined y el import revienta. En vez de tocar el codigo de produccion
 * para que un test cargue, este hook sustituye `import.meta.env` por un objeto
 * vacio al leer config.js. El bundle no cambia ni en un byte.
 *
 * Se carga con `node --import ./test/entorno.mjs --test` (ver `npm test`).
 */

import { registerHooks } from "node:module";

registerHooks({
  load(url, context, nextLoad) {
    const resultado = nextLoad(url, context);
    if (!url.endsWith("/src/config.js")) return resultado;
    const fuente = String(resultado.source).replaceAll("import.meta.env", "({})");
    return { ...resultado, source: fuente };
  },
});
