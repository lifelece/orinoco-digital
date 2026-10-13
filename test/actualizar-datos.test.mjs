/**
 * scripts/actualizar-datos.mjs: comparacion antes/despues, alerta de caida e
 * informe. Sin red: importar el modulo no descarga nada (solo corre como script).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  indexarFeatures,
  compararIndices,
  capasConCaida,
  redactarInforme,
  UMBRAL_CAIDA,
} from "../scripts/actualizar-datos.mjs";

const coleccion = (...ids) => ({
  type: "FeatureCollection",
  features: ids.map(([id, nombre]) => ({ type: "Feature", properties: { id, nombre }, geometry: null })),
});

test("compararIndices lista ids anadidos y quitados", () => {
  const antes = indexarFeatures(coleccion(["OSM-W1", "A"], ["OSM-W2", "B"]));
  const despues = indexarFeatures(coleccion(["OSM-W2", "B"], ["OSM-W3", null]));
  const c = compararIndices(antes, despues);
  assert.deepEqual([c.antes, c.despues], [2, 2]);
  assert.deepEqual(c.anadidos, [["OSM-W3", null]]);
  assert.deepEqual(c.quitados, [["OSM-W1", "A"]]);
});

test("capasConCaida marca una caida mayor al umbral y no una menor", () => {
  const comp = {
    "grande.geojson": { antes: 100, despues: 60 },
    "pequena.geojson": { antes: 100, despues: 85 },
    "vacia.geojson": { antes: 0, despues: 0 },
  };
  assert.equal(UMBRAL_CAIDA, 0.3);
  assert.deepEqual(capasConCaida(comp), ["grande.geojson"]);
});

test("el informe lleva conteos, primeros 20 ids, alerta y checklist", () => {
  const anadidos = Array.from({ length: 25 }, (_, i) => [`OSM-N${i}`, `Nombre ${i}`]);
  const informe = redactarInforme({
    fecha: "2026-10-13",
    comparacion: { "downstream-osm.geojson": { antes: 64, despues: 89, anadidos, quitados: [] } },
    clasesAntes: { salud: 3 },
    clasesDespues: { salud: 4 },
    alertas: ["downstream-osm.geojson"],
    mirrors: "overpass.kumi.systems",
  });
  assert.match(informe, /\| `downstream-osm.geojson` \| 64 \| 89 \| \+25 \|/);
  assert.match(informe, /OSM-N19/);
  assert.doesNotMatch(informe, /OSM-N20/);
  assert.match(informe, /y 5 mas/);
  assert.match(informe, /ALERTA/);
  assert.match(informe, /salud 3->4/);
  assert.match(informe, /- \[ \] Merge = deploy/);
});

test("sin cambios de entidades el informe lo dice", () => {
  const informe = redactarInforme({
    fecha: "2026-10-13",
    comparacion: { "x.geojson": { antes: 1, despues: 1, anadidos: [], quitados: [] } },
    clasesAntes: {},
    clasesDespues: {},
    alertas: [],
    mirrors: "m",
  });
  assert.match(informe, /Sin entidades nuevas ni quitadas/);
  assert.doesNotMatch(informe, /ALERTA/);
});
