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

test("toda clave literal usada con t() existe en el diccionario", async () => {
  // Un hueco no rompe la app —t() devuelve la clave— pero la deja a la vista
  // del usuario con un texto como "panel.fuente". Aqui se ve antes.
  const dir = new URL("../src/", import.meta.url);
  const archivos = (await readdir(dir)).filter((f) => f.endsWith(".js"));
  const codigo = (
    await Promise.all(archivos.map((f) => readFile(new URL(f, dir), "utf8")))
  ).join("\n");
  const usadas = new Set(
    [...codigo.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]\s*\)/g)].map((m) => m[1])
  );
  assert.ok(usadas.size > 0, "no se encontro ningun t('...'): cambio el patron?");
  const faltan = [...usadas].filter((k) => !(k in es));
  assert.deepEqual(faltan, []);
});
