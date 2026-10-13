/**
 * Calculo y datos nuevos del modo Ciudad Bolivar (C1, spec 001).
 * Los de proximidad ya probados (distanciaMinimaKm, etc.) viven en
 * test/ciudadBolivar.test.mjs; aqui solo lo que anade C1.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  hidrocarburoDe,
  validarFeatureCollection,
  normalizarActivo,
  tieneProcedencia,
  distanciaMinimaKm,
  verticeMasCercano,
  posicionDe,
  contarPorClase,
  iniciativasSinGeometria,
} from "../src/data.js";
import { CLASES_CIUDAD } from "../src/config.js";

console.warn = () => {};

const punto = (lng, lat, props = {}) => ({
  type: "Feature",
  properties: props,
  geometry: { type: "Point", coordinates: [lng, lat] },
});

const PUNTO = [-63.55, 8.12];

const puntoF = { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [-63.5, 8.1] } };
const poligonoF = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [[[-62, 8], [-61, 8], [-61, 9], [-62, 9], [-62, 8]]],
  },
};
const multiF = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [[[-60, 7], [-59, 7], [-59, 8], [-60, 7]]],
      [[[-63.4, 8.0], [-63.3, 8.0], [-63.3, 8.1], [-63.4, 8.0]]],
    ],
  },
};

// RF-9
test("verticeMasCercano devuelve un vertice real y su km coincide con distanciaMinimaKm", () => {
  for (const feature of [puntoF, poligonoF, multiF]) {
    const r = verticeMasCercano(PUNTO, feature);
    const reales = JSON.stringify(feature.geometry.coordinates);
    assert.ok(reales.includes(JSON.stringify(r.posicion)), "la posicion es un vertice de la geometria");
    assert.ok(Math.abs(r.km - distanciaMinimaKm(PUNTO, feature)) < 1e-9);
  }
});

test("verticeMasCercano elige el vertice de menor distancia en un MultiPolygon", () => {
  assert.deepEqual(verticeMasCercano(PUNTO, multiF).posicion, [-63.4, 8.0]);
});

test("verticeMasCercano acepta {lng, lat} y devuelve null sin geometria", () => {
  assert.ok(verticeMasCercano({ lng: PUNTO[0], lat: PUNTO[1] }, puntoF));
  assert.equal(verticeMasCercano(PUNTO, { type: "Feature", properties: {}, geometry: null }), null);
  assert.equal(verticeMasCercano(PUNTO, {}), null);
});

// RF-15
test("contarPorClase cuenta por properties.clase y deja 0 en las clases vacias", () => {
  const features = [
    { properties: { clase: "hotel" } },
    { properties: { clase: "hotel" } },
    { properties: { clase: "salud" } },
    { properties: { clase: "desconocida" } },
    { properties: {} },
  ];
  const r = contarPorClase(features, CLASES_CIUDAD);
  assert.deepEqual(Object.keys(r), CLASES_CIUDAD);
  assert.equal(r.hotel, 2);
  assert.equal(r.salud, 1);
  assert.equal(r.aeropuerto, 0);
  assert.equal(r.banca, 0);
});

test("contarPorClase acepta una lista vacia", () => {
  assert.equal(contarPorClase([], ["a"]).a, 0);
});

// RF-12, RF-14, RF-20
test("iniciativasSinGeometria sobre la semilla real: 6 con fuente, 2 en el mapa, sin geometria", async () => {
  const semilla = JSON.parse(
    await readFile(new URL("../docs/expofaja/semillas/iniciativas-ccieb.json", import.meta.url), "utf8")
  );
  const fc = iniciativasSinGeometria(semilla);
  assert.equal(fc.type, "FeatureCollection");
  assert.equal(fc.features.length, 6);
  for (const f of fc.features) {
    assert.equal(f.type, "Feature");
    assert.equal(f.geometry, null);
    assert.ok(f.properties.fuente, `${f.properties.id} lleva fuente`);
    assert.ok(f.properties.id && f.properties.nombre && f.properties.fecha);
    assert.equal(typeof f.properties.en_mapa, "boolean");
  }
  assert.equal(fc.features.filter((f) => f.properties.en_mapa === true).length, 2);
});

test("iniciativasSinGeometria usa fechas si existe y si no fecha_fuente; textos tal cual", () => {
  const fc = iniciativasSinGeometria({
    iniciativas: [
      { id: "A", nombre: "Uno  ñ", fechas: "2026-10-15/2026-10-17", fuente: "u", fecha_fuente: "2026-10-09", ubicacion: { osm: "relation/1" } },
      { id: "B", nombre: "Dos", fuente: "u", fecha_fuente: "2026-10-12", ubicacion: { nombre: "x" } },
    ],
    ultima_verificacion: "2026-10-12",
  });
  assert.equal(fc.features[0].properties.fecha, "2026-10-15/2026-10-17");
  assert.equal(fc.features[0].properties.nombre, "Uno  ñ");
  assert.equal(fc.features[0].properties.en_mapa, true);
  assert.equal(fc.features[1].properties.fecha, "2026-10-12");
  assert.equal(fc.features[1].properties.en_mapa, false);
  assert.equal(fc.features[1].properties.ultima_verificacion, "2026-10-12");
});

test("iniciativasSinGeometria con semilla vacia o invalida devuelve FeatureCollection vacia", () => {
  assert.deepEqual(iniciativasSinGeometria(null).features, []);
  assert.deepEqual(iniciativasSinGeometria({}).features, []);
});

test("hidrocarburoDe: 'oil and gas' es mixto, no petroleo", () => {
  assert.equal(hidrocarburoDe("oil and gas"), "mixto");
  assert.equal(hidrocarburoDe("Oil and Gas"), "mixto");
});

test("hidrocarburoDe: valores simples de GOGET", () => {
  assert.equal(hidrocarburoDe("oil"), "petroleo");
  assert.equal(hidrocarburoDe("gas"), "gas");
  assert.equal(hidrocarburoDe("petroleo"), "petroleo");
});

test("hidrocarburoDe: lo que no se reconoce es desconocido, no se adivina", () => {
  assert.equal(hidrocarburoDe(null), "desconocido");
  assert.equal(hidrocarburoDe(undefined), "desconocido");
  assert.equal(hidrocarburoDe(""), "desconocido");
  assert.equal(hidrocarburoDe("condensado"), "desconocido");
});

test("validarFeatureCollection: rechaza lo que no es FeatureCollection", () => {
  assert.throws(() => validarFeatureCollection(null, "x"), /no es un objeto/);
  assert.throws(() => validarFeatureCollection("{}", "x"), /no es un objeto/);
  assert.throws(() => validarFeatureCollection({ type: "Feature" }, "x"), /se esperaba FeatureCollection/);
  assert.throws(
    () => validarFeatureCollection({ type: "FeatureCollection", features: {} }, "x"),
    /no es un array/
  );
});

test("validarFeatureCollection: descarta geometria ausente o imposible", () => {
  const fc = {
    type: "FeatureCollection",
    features: [
      punto(-64, 8, { id: "valida" }),
      { type: "Feature", properties: { id: "sin-geometria" }, geometry: null },
      punto(Number.NaN, 8, { id: "nan" }),
      punto("-64", 8, { id: "texto" }),
      punto(-200, 8, { id: "fuera-lng" }),
      punto(-64, 95, { id: "fuera-lat" }),
      { type: "Feature", properties: { id: "vacia" }, geometry: { type: "Point", coordinates: [] } },
    ],
  };
  const resultado = validarFeatureCollection(fc, "prueba");
  assert.deepEqual(resultado.features.map((f) => f.properties.id), ["valida"]);
});

test("validarFeatureCollection: acepta geometrias anidadas (Multi*)", () => {
  const fc = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "rio" },
        geometry: { type: "MultiLineString", coordinates: [[[-66, 7.5], [-65, 7.8]], [[-64, 8], [-63, 8.2]]] },
      },
      {
        type: "Feature",
        properties: { id: "campo" },
        geometry: { type: "MultiPolygon", coordinates: [[[[-64, 8], [-63, 8], [-63, 9], [-64, 8]]]] },
      },
    ],
  };
  assert.equal(validarFeatureCollection(fc, "prueba").features.length, 2);
});

test("validarFeatureCollection: siempre devuelve una FeatureCollection nueva", () => {
  const fc = { type: "FeatureCollection", features: [], extra: "no se propaga" };
  const resultado = validarFeatureCollection(fc, "prueba");
  assert.deepEqual(resultado, { type: "FeatureCollection", features: [] });
  assert.notEqual(resultado, fc);
});

test("normalizarActivo: lo ausente queda null explicito, nunca inventado", () => {
  const activo = normalizarActivo({});
  assert.equal(activo.id, null);
  assert.equal(activo.tipo, null);
  assert.equal(activo.operadora, null);
  assert.equal(activo.fuente, null);
  assert.equal(activo.confianza, null);
  assert.equal(activo.ultima_verificacion, null);
  assert.equal(activo.estado, "desconocido");
});

test("normalizarActivo: tipo y estado fuera de catalogo no pasan", () => {
  const activo = normalizarActivo({ tipo: "pozo_magico", estado: "boyante" });
  assert.equal(activo.tipo, null);
  assert.equal(activo.estado, "desconocido");
});

test("normalizarActivo: conserva los valores validos", () => {
  const activo = normalizarActivo({
    id: "gem-1",
    tipo: "campo",
    estado: "activo",
    fuente: "GEM GOGET",
    confianza: "media",
    ultima_verificacion: "2026-09-08",
  });
  assert.equal(activo.tipo, "campo");
  assert.equal(activo.estado, "activo");
  assert.equal(activo.fuente, "GEM GOGET");
});

test("tieneProcedencia: sin fuente no entra al mapa", () => {
  assert.equal(tieneProcedencia(normalizarActivo({})), false);
  assert.equal(tieneProcedencia(normalizarActivo({ fuente: "" })), false);
  assert.equal(tieneProcedencia(normalizarActivo({ fuente: "OSM" })), true);
});

test("posicionDe devuelve {lng, lat} de un punto y null sin geometria utilizable", () => {
  assert.deepEqual(posicionDe(punto(-63.5, 8.1)), { lng: -63.5, lat: 8.1 });
  assert.equal(posicionDe({ type: "Feature", geometry: null, properties: {} }), null);
  assert.equal(posicionDe(null), null);
});
