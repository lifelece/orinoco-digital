/**
 * Toda ruta de RUTAS_DATOS tiene que existir en public/data.
 *
 * La capa de centrales llego a produccion con el codigo cableado y el GeoJSON
 * sin commitear: 404 en vivo (auditoria I1). Esto lo detecta sin navegador.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";

import { RUTAS_DATOS } from "../src/config.js";

test("cada capa declarada en config.js tiene su archivo publicado", async () => {
  const faltan = [];
  for (const [capa, ruta] of Object.entries(RUTAS_DATOS)) {
    try {
      await access(new URL(`../public${ruta}`, import.meta.url));
    } catch {
      faltan.push(`${capa}: public${ruta}`);
    }
  }
  assert.deepEqual(faltan, []);
});
