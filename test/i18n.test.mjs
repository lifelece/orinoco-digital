/**
 * Regla 9 de CLAUDE.md: todo texto visible pasa por t(clave).
 *
 * Estos tests no cargan i18n/index.js (necesita localStorage y navigator);
 * comprueban los diccionarios y el uso de claves leyendo el codigo.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const leerJSON = async (ruta) =>
  JSON.parse(await readFile(new URL(ruta, import.meta.url), "utf8"));

const es = await leerJSON("../src/i18n/es.json");
const en = await leerJSON("../src/i18n/en.json");

test("es.json y en.json tienen exactamente las mismas claves", () => {
  const soloEs = Object.keys(es).filter((k) => !(k in en));
  const soloEn = Object.keys(en).filter((k) => !(k in es));
  assert.deepEqual(soloEs, [], "claves sin traducir al ingles");
  assert.deepEqual(soloEn, [], "claves sin version en espanol");
});

test("ninguna traduccion esta vacia", () => {
  for (const [nombre, dic] of [["es", es], ["en", en]]) {
    const vacias = Object.entries(dic)
      .filter(([, v]) => typeof v !== "string" || v.trim() === "")
      .map(([k]) => k);
    assert.deepEqual(vacias, [], `${nombre}.json tiene valores vacios`);
  }
});

/**
 * Todos los .js bajo un directorio, recursivo (incluye src/ui/, por ejemplo).
 * @param {URL} dir
 * @returns {Promise<Array<URL>>}
 */
async function archivosJs(dir) {
  const entradas = await readdir(dir, { withFileTypes: true });
  const listas = await Promise.all(
    entradas.map(async (entrada) => {
      if (entrada.name === "node_modules") return [];
      const ruta = new URL(entrada.isDirectory() ? `${entrada.name}/` : entrada.name, dir);
      if (entrada.isDirectory()) return archivosJs(ruta);
      return entrada.name.endsWith(".js") ? [ruta] : [];
    })
  );
  return listas.flat();
}

test("toda clave literal usada con t() existe en el diccionario", async () => {
  // Un hueco no rompe la app —t() devuelve la clave— pero la deja a la vista
  // del usuario con un texto como "panel.fuente". Aqui se ve antes.
  // Recursivo: cubre src/ui/ (ver ADR-018), no solo el nivel superior de src/.
  const dir = new URL("../src/", import.meta.url);
  const rutas = await archivosJs(dir);
  const codigo = (await Promise.all(rutas.map((r) => readFile(r, "utf8")))).join("\n");
  const usadas = new Set(
    [...codigo.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]\s*\)/g)].map((m) => m[1])
  );
  assert.ok(usadas.size > 0, "no se encontro ningun t('...'): cambio el patron?");
  const faltan = [...usadas].filter((k) => !(k in es));
  assert.deepEqual(faltan, []);
});
