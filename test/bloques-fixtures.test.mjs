// Fixtures sinteticos de la capa Bloques (spec 004, RF-159). Ningun dato real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "bloques");
const leer = (n) => readFileSync(join(DIR, n), "utf8");
const bloques = JSON.parse(leer("bloques-sinteticos.geojson")).features;
const divisiones = JSON.parse(leer("divisiones-sinteticas.geojson")).features;
const props = bloques.map((f) => f.properties);

test("RF-159: todo bloque y division declara que su fuente es sintetica", () => {
  for (const f of [...bloques, ...divisiones]) {
    assert.match(f.properties.fuente, /sintético/, `${f.properties.id} sin marca de sintetico`);
  }
});

test("RF-159: nombres y empresas son inventados", () => {
  for (const p of props) {
    assert.match(p.nombre, /^Bloque Prueba \d+$/);
    for (const o of [...p.operadores_2026, ...p.operadores_antes_2026]) {
      assert.match(o, /^Operadora Ficticia [A-Z]$/);
    }
  }
});

test("cobertura: al menos 8 bloques, ids unicos, feature.id igual a properties.id", () => {
  assert.ok(bloques.length >= 8);
  assert.equal(new Set(props.map((p) => p.id)).size, props.length);
  for (const f of bloques) assert.equal(f.id, f.properties.id);
});

test("cobertura: las 4 capas y los 7 estatus aparecen", () => {
  assert.deepEqual([...new Set(props.map((p) => p.capa))].sort(), ["acuerdo_2026", "chevron", "nabep", "sin_registro"]);
  assert.deepEqual(
    [...new Set(props.map((p) => p.estatus_norm))].sort(),
    ["activo", "en_evaluacion", "en_proyecto", "intermitente", "paralizado", "sin_info", "sin_registro"],
  );
});

test("cobertura: licencia si/no, convenio si/no, operador multiple, vacios", () => {
  assert.ok(props.some((p) => p.tiene_licencia_ofac) && props.some((p) => !p.tiene_licencia_ofac));
  assert.ok(props.some((p) => p.convenio_eeuu_vzla) && props.some((p) => !p.convenio_eeuu_vzla));
  assert.ok(props.some((p) => p.operadores_2026.length >= 2));
  assert.ok(props.some((p) => p.operadores_2026.length === 0));
  assert.ok(props.some((p) => p.estatus_fuente === null));
  assert.ok(props.some((p) => p.licencia_ofac === null));
});

test("cobertura: MultiPolygon con agujero y bloques solapados", () => {
  const multi = bloques.find((f) => f.geometry.type === "MultiPolygon");
  assert.ok(multi);
  assert.ok(multi.geometry.coordinates.some((poligono) => poligono.length >= 2), "sin agujero");
  assert.ok(bloques.some((f) => f.geometry.type === "Polygon"));
  // B901 (-63.0..-62.8 x 8.0..8.2) y B907 (-62.9..-62.7 x 8.1..8.3) se solapan por construccion.
  const [a, b] = ["B901", "B907"].map((id) => bloques.find((f) => f.id === id).geometry.coordinates[0]);
  assert.ok(a[1][0] > b[0][0] && b[0][0] > a[0][0] && b[0][1] < a[2][1]);
});

test("cobertura: 2 divisiones", () => {
  assert.equal(divisiones.length, 2);
});

test("registros: CSV sintetico con un registro sin bloque y conteos coherentes", () => {
  const filas = leer("registros-sinteticos.csv").trim().split("\n").slice(1).map((l) => l.split(","));
  assert.ok(filas.some((f) => f[1] === ""), "falta un registro sin bloque");
  for (const p of props) {
    const n = filas.filter((f) => f[1] === p.id).length;
    assert.equal(p.registros_vinculados, n, `${p.id}: registros_vinculados`);
  }
});

test("neutralidad de los fixtures: sin datos reales (ids B9xx, fuente de ejemplo)", () => {
  for (const p of props) assert.match(p.id, /^B9\d\d$/);
  for (const f of [...bloques, ...divisiones]) assert.match(f.properties.fuente_url, /^https:\/\/example\.org\//);
});
