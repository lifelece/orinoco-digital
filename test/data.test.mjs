/**
 * Tests de data.js, la aduana: nada entra al mapa sin pasar por aqui.
 * Sin dependencias: node:test y node:assert.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  hidrocarburoDe,
  validarFeatureCollection,
  normalizarActivo,
  tieneProcedencia,
} from "../src/data.js";

// validarFeatureCollection avisa por consola de cada descarte. En los tests
// los descartes son el caso esperado: se silencian para que la salida se lea.
console.warn = () => {};

const punto = (lng, lat, props = {}) => ({
  type: "Feature",
  properties: props,
  geometry: { type: "Point", coordinates: [lng, lat] },
});

test("hidrocarburoDe: 'oil and gas' es mixto, no petroleo", () => {
  // El orden ingenuo de comprobacion perdia 35 de los 105 campos.
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
  assert.throws(
    () => validarFeatureCollection({ type: "Feature" }, "x"),
    /se esperaba FeatureCollection/
  );
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
      {
        type: "Feature",
        properties: { id: "vacia" },
        geometry: { type: "Point", coordinates: [] },
      },
    ],
  };
  const resultado = validarFeatureCollection(fc, "prueba");
  assert.deepEqual(
    resultado.features.map((f) => f.properties.id),
    ["valida"]
  );
});

test("validarFeatureCollection: acepta geometrias anidadas (Multi*)", () => {
  // Los rios de Natural Earth son MultiLineString: tratarlos como LineString
  // tumbaba la capa entera (auditoria C2).
  const fc = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "rio" },
        geometry: {
          type: "MultiLineString",
          coordinates: [[[-66, 7.5], [-65, 7.8]], [[-64, 8], [-63, 8.2]]],
        },
      },
      {
        type: "Feature",
        properties: { id: "campo" },
        geometry: {
          type: "MultiPolygon",
          coordinates: [[[[-64, 8], [-63, 8], [-63, 9], [-64, 8]]]],
        },
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
