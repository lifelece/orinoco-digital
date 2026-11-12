// Gate de licencia de la capa Bloques y contratos 2026 (spec 004, RF-129, RF-160, ADR-024).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { CAPA_BLOQUES, RUTAS_BLOQUES, COLOR_CAPA_BLOQUE, GRUPO_ESTATUS_BLOQUE } from "../src/config.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARCHIVOS = ["public/data/bloques-2026.geojson", "public/data/faja-divisiones-2026.geojson"];
const lineasIgnore = () =>
  readFileSync(join(RAIZ, ".gitignore"), "utf8").split(/\r?\n/).map((l) => l.trim());
const LINEA_PERMISO = /^Permiso de redistribucion: \d{4}-\d{2}-\d{2}/m;

test("RF-160: la configuracion declara el permiso como booleano y los dos archivos", () => {
  assert.equal(typeof CAPA_BLOQUES.permisoRedistribucion, "boolean");
  assert.deepEqual(
    [...CAPA_BLOQUES.archivos].sort(),
    ["bloques-2026.geojson", "faja-divisiones-2026.geojson"],
  );
  assert.equal(RUTAS_BLOQUES.bloques2026, "/data/bloques-2026.geojson");
  assert.equal(RUTAS_BLOQUES.divisionesFaja, "/data/faja-divisiones-2026.geojson");
});

test("RF-160: sin permiso, .gitignore lista ambos archivos publicados", () => {
  if (CAPA_BLOQUES.permisoRedistribucion) return; // otra rama del gate
  const lineas = lineasIgnore();
  for (const a of ARCHIVOS) assert.ok(lineas.includes(a), `.gitignore no excluye ${a}`);
});

test("RF-129: sin permiso, la capa no esta activa fuera de desarrollo", () => {
  if (CAPA_BLOQUES.permisoRedistribucion) return;
  // En Node (sin Vite) MODO_DESARROLLO es false y VITE_CAPA_BLOQUES_LOCAL no existe.
  assert.equal(CAPA_BLOQUES.activa, false);
});

test("RF-160: con permiso, exige archivos validos y la linea de permiso con fecha", async () => {
  if (!CAPA_BLOQUES.permisoRedistribucion) return;
  const { validarBloques, validarDivisiones } = await import("../src/bloques/validar.js");
  for (const a of ARCHIVOS) assert.ok(existsSync(join(RAIZ, a)), `falta ${a}`);
  const leer = (a) => JSON.parse(readFileSync(join(RAIZ, a), "utf8"));
  assert.deepEqual(validarBloques(leer(ARCHIVOS[0])).errores, []);
  assert.deepEqual(validarDivisiones(leer(ARCHIVOS[1])).errores, []);
  const fuentes = readFileSync(join(RAIZ, "docs/DATA_SOURCES.md"), "utf8");
  assert.match(fuentes, LINEA_PERMISO, "DATA_SOURCES.md sin linea de permiso con fecha");
  const lineas = lineasIgnore();
  for (const a of ARCHIVOS) assert.ok(!lineas.includes(a), `${a} sigue en .gitignore con permiso`);
});

test("config: 4 capas, 7 estatus en 3 grupos sin solapes, paleta marcada SIN VERIFICAR", () => {
  assert.deepEqual(Object.keys(COLOR_CAPA_BLOQUE).sort(), ["acuerdo_2026", "chevron", "nabep", "sin_registro"]);
  const todos = Object.values(GRUPO_ESTATUS_BLOQUE).flat();
  assert.equal(todos.length, 7);
  assert.equal(new Set(todos).size, 7);
  assert.deepEqual(Object.keys(GRUPO_ESTATUS_BLOQUE).sort(), ["detenido", "operando", "sin_operacion_registrada"]);
  const cfg = readFileSync(join(RAIZ, "src/config.js"), "utf8");
  assert.match(cfg, /SIN VERIFICAR[^]{0,400}COLOR_CAPA_BLOQUE|COLOR_CAPA_BLOQUE[^]{0,200}SIN VERIFICAR/);
});
