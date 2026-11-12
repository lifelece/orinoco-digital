// Cruce punto en poligono de la capa Bloques (spec 004: RF-142, RF-143 en su logica).
// Geometrias medidas sobre los fixtures sinteticos (cuadrados de 0,2 grados):
//   B901 -63.0..-62.8 x 8.0..8.2 · B907 -62.9..-62.7 x 8.1..8.3 (se solapan en -62.9..-62.8 x 8.1..8.2)
//   B905 MultiPolygon: parte 1 -62.7..-62.5 x 8.3..8.5 con agujero -62.64..-62.56 x 8.34..8.42;
//                      parte 2 -62.4..-62.3 x 8.3..8.4
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { puntoEnPoligono, cruzarCamposConBloques } from "../src/bloques/cruce.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const bloques = JSON.parse(
  readFileSync(join(RAIZ, "test/fixtures/bloques/bloques-sinteticos.geojson"), "utf8"),
).features;
const geom = (id) => bloques.find((f) => f.id === id).geometry;

test("RF-142: punto dentro de un poligono simple", () => {
  assert.equal(puntoEnPoligono([-62.9, 8.1], geom("B901")), true);
});

test("RF-142: punto fuera de un poligono simple (en cada direccion)", () => {
  for (const p of [[-63.1, 8.1], [-62.7, 8.1], [-62.9, 7.9], [-62.9, 8.3]]) {
    assert.equal(puntoEnPoligono(p, geom("B901")), false, JSON.stringify(p));
  }
});

test("RF-142: un punto dentro del agujero esta fuera del poligono", () => {
  assert.equal(puntoEnPoligono([-62.6, 8.38], geom("B905")), false);
});

test("RF-142: un punto en el anillo exterior pero fuera del agujero esta dentro", () => {
  assert.equal(puntoEnPoligono([-62.68, 8.32], geom("B905")), true);
  assert.equal(puntoEnPoligono([-62.52, 8.45], geom("B905")), true);
});

test("RF-142: MultiPolygon, cada parte cuenta y el hueco entre partes no", () => {
  assert.equal(puntoEnPoligono([-62.35, 8.35], geom("B905")), true);
  assert.equal(puntoEnPoligono([-62.45, 8.35], geom("B905")), false);
});

test("geometrias que no son poligonales o sin coordenadas devuelven false", () => {
  assert.equal(puntoEnPoligono([-62.9, 8.1], { type: "Point", coordinates: [-62.9, 8.1] }), false);
  assert.equal(puntoEnPoligono([-62.9, 8.1], null), false);
  assert.equal(puntoEnPoligono([-62.9, 8.1], { type: "Polygon", coordinates: [] }), false);
});

const campo = (id, lng, lat) => ({ type: "Feature", properties: { id }, geometry: { type: "Point", coordinates: [lng, lat] } });
const campos = [
  campo("C1", -62.85, 8.15),   // en el solape B901 y B907
  campo("C2", -62.6, 8.38),    // en el agujero de B905
  campo("C3", -62.95, 8.05),   // solo B901
  campo("C4", -62.35, 8.35),   // parte 2 de B905
  campo("C5", -60.0, 5.0),     // fuera de todo
  { type: "Feature", properties: { id: "C6" }, geometry: null }, // sin posicion
];
const posicionDe = (f) => {
  const c = f.geometry?.coordinates;
  return c ? { lng: c[0], lat: c[1] } : null;
};

test("RF-143: un campo en dos bloques solapados aparece en ambos", () => {
  const { porCampo, porBloque } = cruzarCamposConBloques(campos, bloques, posicionDe);
  assert.deepEqual(porCampo.get("C1"), ["B901", "B907"]);
  assert.deepEqual(porBloque.get("B901"), ["C1", "C3"]);
  assert.deepEqual(porBloque.get("B907"), ["C1"]);
});

test("RF-143: campos en el agujero, fuera de todo o sin posicion no entran en el cruce", () => {
  const { porCampo } = cruzarCamposConBloques(campos, bloques, posicionDe);
  for (const id of ["C2", "C5", "C6"]) assert.equal(porCampo.has(id), false, id);
  assert.deepEqual([...porCampo.keys()].sort(), ["C1", "C3", "C4"]);
});

test("RF-142: bloque sin campos no tiene entrada; el MultiPolygon cruza por su segunda parte", () => {
  const { porBloque } = cruzarCamposConBloques(campos, bloques, posicionDe);
  assert.equal(porBloque.has("B904"), false);
  assert.deepEqual(porBloque.get("B905"), ["C4"]);
});

test("posicionDe puede devolver [lng, lat] en vez de {lng, lat}", () => {
  const r = cruzarCamposConBloques([campos[2]], bloques, (f) => f.geometry.coordinates);
  assert.deepEqual(r.porCampo.get("C3"), ["B901"]);
});

test("sin campos o sin bloques los mapas salen vacios", () => {
  assert.equal(cruzarCamposConBloques([], bloques, posicionDe).porCampo.size, 0);
  assert.equal(cruzarCamposConBloques(campos, [], posicionDe).porBloque.size, 0);
});
