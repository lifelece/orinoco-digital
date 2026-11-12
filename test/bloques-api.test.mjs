// api.js: origen de datos de la capa Bloques (spec 004, T10, RF-131 fuente de datos).
// `fetch` simulado: ningun test toca la red.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { registerHooks } from "node:module";
import { RUTAS_BLOQUES } from "../src/config.js";

// api.js importa una semilla JSON sin atributo (lo resuelve Vite). Node lo exige:
// este hook, local a este test, lo anade solo para ese import. No toca el codigo de src/.
registerHooks({
  resolve(especificador, contexto, siguiente) {
    const r = siguiente(especificador, contexto);
    return r.url.endsWith(".json") ? { ...r, importAttributes: { type: "json" } } : r;
  },
});
const { getBloques2026, getDivisionesFaja } = await import("../src/api.js");

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "bloques");
const leer = (n) => JSON.parse(readFileSync(join(DIR, n), "utf8"));

/** Sustituye fetch por un simulador y devuelve las URLs pedidas. */
function simular(respuestas) {
  const pedidas = [];
  globalThis.fetch = async (url) => {
    pedidas.push(url);
    const r = respuestas[url];
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.json };
  };
  return pedidas;
}

test("getBloques2026 pide solo el archivo de bloques y devuelve una FeatureCollection", async () => {
  const fc = leer("bloques-sinteticos.geojson");
  const pedidas = simular({ [RUTAS_BLOQUES.bloques2026]: { json: fc } });
  const r = await getBloques2026();
  assert.deepEqual(pedidas, [RUTAS_BLOQUES.bloques2026]);
  assert.equal(r.type, "FeatureCollection");
  assert.equal(r.features.length, fc.features.length);
});

test("getDivisionesFaja pide solo el archivo de divisiones y devuelve una FeatureCollection", async () => {
  const fc = leer("divisiones-sinteticas.geojson");
  const pedidas = simular({ [RUTAS_BLOQUES.divisionesFaja]: { json: fc } });
  const r = await getDivisionesFaja();
  assert.deepEqual(pedidas, [RUTAS_BLOQUES.divisionesFaja]);
  assert.equal(r.type, "FeatureCollection");
  assert.equal(r.features.length, fc.features.length);
});

test("RF-133: un HTTP 404 hace fallar la promesa (main.js lo convierte en estado de error)", async () => {
  simular({ [RUTAS_BLOQUES.bloques2026]: { ok: false, status: 404, json: {} } });
  await assert.rejects(getBloques2026(), /404/);
});

test("un archivo que no es FeatureCollection hace fallar la promesa", async () => {
  simular({ [RUTAS_BLOQUES.divisionesFaja]: { json: { type: "Feature" } } });
  await assert.rejects(getDivisionesFaja(), /FeatureCollection/);
});
