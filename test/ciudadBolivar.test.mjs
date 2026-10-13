/**
 * Proximidad y capa Ciudad Bolivar (E1, spec 001-modo-ciudad-bolivar).
 *
 * Los fixtures de GEM (anillos, 5 mas cercanos) vienen de la medicion de
 * ADR-020 y llevan tolerancia. Los conteos de OSM NO se fijan: cambian entre
 * consultas (33/31/10 y luego 36/32/11 el mismo dia). Solo se fijan los
 * elementos pedidos por id, la procedencia y los tamanos.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  haversineKm,
  distanciaMinimaKm,
  camposMasCercanos,
  contarPorAnillo,
  circuloGeodesico,
} from "../src/data.js";
import {
  CENTRO_CIUDAD_BOLIVAR,
  ANILLOS_KM,
  CLASES_CIUDAD,
  ID_SEDE_EXPOFAJA,
} from "../src/config.js";

const leer = async (ruta) => JSON.parse(await readFile(new URL(ruta, import.meta.url), "utf8"));
const campos = await leer("../public/data/campos.geojson");

const cerca = (real, esperado, tolerancia, que) =>
  assert.ok(Math.abs(real - esperado) <= tolerancia, `${que}: ${real} vs ${esperado} (±${tolerancia})`);

// --- Distancia ---------------------------------------------------------------

test("haversineKm: Caracas a Ciudad Bolivar con coordenadas del repo (toponimia y OSM)", () => {
  // Control calculado una vez y fijado: Caracas de toponimia.geojson (Natural Earth).
  cerca(haversineKm([-66.919, 10.5029], [CENTRO_CIUDAD_BOLIVAR.lng, CENTRO_CIUDAD_BOLIVAR.lat]), 456.2, 0.1, "Caracas");
});

test("distanciaMinimaKm: Point es la distancia al punto", () => {
  const f = { geometry: { type: "Point", coordinates: [-63.5469562, 9.0028532] } };
  cerca(distanciaMinimaKm(CENTRO_CIUDAD_BOLIVAR, f), 100, 0.5, "0,9 grados de latitud ~ 100 km");
});

test("distanciaMinimaKm: Polygon mide al vertice mas cercano", () => {
  const f = {
    geometry: {
      type: "Polygon",
      coordinates: [[[-63.5, 9.0], [-63.5, 9.5], [-63.0, 9.5], [-63.0, 9.0], [-63.5, 9.0]]],
    },
  };
  const esperado = haversineKm([CENTRO_CIUDAD_BOLIVAR.lng, CENTRO_CIUDAD_BOLIVAR.lat], [-63.5, 9.0]);
  cerca(distanciaMinimaKm(CENTRO_CIUDAD_BOLIVAR, f), esperado, 0.001, "vertice (-63.5, 9.0)");
});

test("distanciaMinimaKm: MultiPolygon elige la parte mas cercana", () => {
  const lejos = [[[-60, 12], [-60, 12.5], [-59.5, 12.5], [-60, 12]]];
  const cercana = [[[-63.5, 8.6], [-63.4, 8.6], [-63.4, 8.7], [-63.5, 8.6]]];
  const f = { geometry: { type: "MultiPolygon", coordinates: [lejos, cercana] } };
  const solo = { geometry: { type: "Polygon", coordinates: cercana } };
  assert.equal(distanciaMinimaKm(CENTRO_CIUDAD_BOLIVAR, f), distanciaMinimaKm(CENTRO_CIUDAD_BOLIVAR, solo));
});

test("distanciaMinimaKm: sin geometria devuelve Infinity", () => {
  assert.equal(distanciaMinimaKm(CENTRO_CIUDAD_BOLIVAR, { geometry: null }), Infinity);
});

// --- Anillos y cercanos (GEM, fixtures de ADR-020) ----------------------------

test("RF-8: contarPorAnillo con campos.geojson real da 0 / 10 / 45 / 63 (±1)", () => {
  const r = contarPorAnillo(CENTRO_CIUDAD_BOLIVAR, campos, ANILLOS_KM);
  assert.deepEqual(r.map((a) => a.km), [50, 100, 150, 200]);
  [0, 10, 45, 63].forEach((esperado, i) => cerca(r[i].campos, esperado, 1, `anillo ${r[i].km} km`));
});

// Las capas generadas se leen antes de los tests que las usan.
const archivos = {
  "ciudad-bolivar-osm.geojson": await leer("../public/data/ciudad-bolivar-osm.geojson"),
  "iniciativas-ccieb.geojson": await leer("../public/data/iniciativas-ccieb.geojson"),
};
const sedeGenerada = archivos["ciudad-bolivar-osm.geojson"].features.find(
  (f) => f.properties.id === ID_SEDE_EXPOFAJA
);

test("RF-9: los 5 campos mas cercanos a la sede, sin deduplicar (±1 km)", () => {
  const r = camposMasCercanos(sedeGenerada.geometry.coordinates, campos, 5);
  const esperado = [
    ["Dobokubi", 57.2],
    ["Melones", 73.8],
    ["Cerro Negro (Anzoátegui)", 74.4],
    ["Cerro Negro (Monagas)", 74.4],
    ["Hamaca", 76.8],
  ];
  assert.equal(r.length, 5);
  esperado.forEach(([nombre, km], i) => {
    assert.ok(r[i].nombre.includes(nombre), `${r[i].nombre} contiene ${nombre}`);
    cerca(r[i].km, km, 1, nombre);
    assert.ok(r[i].id && r[i].confianza, "trae id y confianza");
  });
  assert.notEqual(r[2].id, r[3].id, "los dos Cerro Negro son registros distintos");
});

test("circuloGeodesico: cada vertice a km del centro (±0,5 %), cerrado", () => {
  const anillo = circuloGeodesico(CENTRO_CIUDAD_BOLIVAR, 100);
  assert.equal(anillo.length, 129);
  assert.deepEqual(anillo[0], anillo.at(-1));
  for (const v of anillo) cerca(haversineKm(CENTRO_CIUDAD_BOLIVAR, v), 100, 0.5, "radio");
});

// --- Capa generada -----------------------------------------------------------

test("RF-12: toda feature nueva lleva fuente, confianza y ultima_verificacion", () => {
  for (const [nombre, fc] of Object.entries(archivos)) {
    assert.ok(fc.features.length > 0, nombre);
    for (const f of fc.features) {
      const p = f.properties;
      assert.ok(p.fuente, `${nombre} ${p.id}: fuente`);
      assert.ok(["alta", "media", "baja"].includes(p.confianza), `${nombre} ${p.id}: confianza`);
      assert.match(p.ultima_verificacion, /^\d{4}-\d{2}-\d{2}$/, `${nombre} ${p.id}`);
    }
  }
});

test("RF-12 y RF-13: servicios con clase valida, nombre string o null, y osm_url", () => {
  for (const f of archivos["ciudad-bolivar-osm.geojson"].features) {
    const p = f.properties;
    assert.ok(CLASES_CIUDAD.includes(p.clase), `${p.id}: clase ${p.clase}`);
    assert.ok(p.nombre === null || (typeof p.nombre === "string" && p.nombre.length > 0), p.id);
    assert.match(p.id, /^OSM-[NWR]\d+$/);
    assert.ok(p.osm_url.startsWith("https://www.openstreetmap.org/"), p.id);
    assert.ok(["exacta", "centro_aproximado"].includes(p.geom_precision), p.id);
  }
});

test("la sede (relation 7948635) y el puente (way 1485676372) salen por id", () => {
  const { features } = archivos["ciudad-bolivar-osm.geojson"];
  const puente = features.find((f) => f.properties.id === "OSM-W1485676372");
  assert.equal(sedeGenerada.properties.clase, "sede_evento");
  assert.equal(sedeGenerada.geometry.type, "Point");
  assert.equal(puente.properties.clase, "puente");
  assert.equal(puente.geometry.type, "LineString");
});

test("la sede esta a menos de 300 m de la semilla de verificacion", async () => {
  const semilla = await leer("../docs/expofaja/semillas/ciudad-bolivar-verificacion.geojson");
  const esperado = semilla.features.find((f) => f.properties.id === "OSM-R7948635");
  assert.ok(haversineKm(esperado.geometry.coordinates, sedeGenerada.geometry.coordinates) < 0.3);
});

test("RF-14: las iniciativas dibujadas tienen ubicacion OSM y su punto sale de OSM", () => {
  for (const f of archivos["iniciativas-ccieb.geojson"].features) {
    assert.ok(f.properties.ubicacion_osm, f.properties.id);
    assert.ok(f.properties.fuente.startsWith("http"), f.properties.id);
    if (f.properties.ubicacion_osm === "relation/7948635") {
      assert.deepEqual(f.geometry.coordinates, sedeGenerada.geometry.coordinates);
    }
  }
});

test("RNF-1: cada GeoJSON nuevo pesa <= 200 KB y tiene <= 300 features", async () => {
  for (const [nombre, fc] of Object.entries(archivos)) {
    const bytes = (await readFile(new URL(`../public/data/${nombre}`, import.meta.url))).length;
    assert.ok(bytes <= 200 * 1024, `${nombre}: ${bytes} bytes`);
    assert.ok(fc.features.length <= 300, `${nombre}: ${fc.features.length} features`);
  }
});

test("el resumen cuadra con el calculo y pesa poco", async () => {
  const resumen = await leer("../public/data/ciudad-bolivar-resumen.json");
  const bytes = (await readFile(new URL("../public/data/ciudad-bolivar-resumen.json", import.meta.url))).length;
  assert.ok(bytes <= 4096, `${bytes} bytes`);
  assert.deepEqual(resumen.anillos, contarPorAnillo(CENTRO_CIUDAD_BOLIVAR, campos, ANILLOS_KM));
  assert.equal(resumen.total_campos, campos.features.length);
  assert.equal(resumen.cercanos_a.id, ID_SEDE_EXPOFAJA);
  assert.equal(resumen.campos_mas_cercanos.length, 5);
});
