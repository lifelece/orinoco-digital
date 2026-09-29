/**
 * scripts/osm-to-geojson.mjs decide, activo por activo, si algo entra al mapa
 * como parte de la cadena de hidrocarburos. Esta prueba nacio de un error en
 * produccion: "Velas 3N, CA", una fabrica de velas de Ciudad Bolivar, se
 * mostraba como "Instalación petrolera" porque el filtro anterior solo
 * excluia centrales electricas y zonas francas — cualquier otra cosa con
 * nombre pasaba. Ver docs/DATA_SOURCES.md seccion 11 (limpieza 2026-09-29).
 *
 * Importar el modulo no debe leer data/raw ni escribir public/data: la
 * ejecucion real queda detras de un chequeo de "soy el punto de entrada" al
 * final de osm-to-geojson.mjs.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { esRelevante, esSustanciaHidrocarburo } from "../scripts/osm-to-geojson.mjs";

test("una fabrica de velas queda fuera (el caso que motivo esta regla)", () => {
  assert.equal(
    esRelevante({ man_made: "works", name: "Velas 3N, CA", product: "candles;cleaners" }),
    false
  );
});

test("una refineria real entra por su etiqueta industrial=refinery", () => {
  assert.equal(
    esRelevante({
      industrial: "refinery",
      name: "Refinería El Palito",
      operator: "PDVSA",
      refinery: "oil",
    }),
    true
  );
});

test("una embotelladora de refrescos queda fuera: 'gas' de 'gaseosa' no cuenta", () => {
  assert.equal(
    esRelevante({ man_made: "works", name: "Gaseosas X", product: "beverage" }),
    false
  );
});

test("una planta de gas entra por el nombre, aunque no declare product/industrial", () => {
  assert.equal(esRelevante({ landuse: "industrial", name: "Planta de Gas X" }), true);
});

test("un ducto de agua queda fuera: substance=water no es hidrocarburo", () => {
  assert.equal(esSustanciaHidrocarburo("water"), false);
});

test("un ducto de gas entra: substance=gas si es hidrocarburo", () => {
  assert.equal(esSustanciaHidrocarburo("gas"), true);
});

test("una central electrica queda fuera aunque el nombre no la delate", () => {
  // Caso real: "Cardon Genevapca Power Plant" solo tiene power=plant, sin
  // ninguna palabra de hidrocarburos en el nombre.
  assert.equal(
    esRelevante({ power: "plant", name: "Cardon Genevapca Power Plant" }),
    false
  );
});

test("una zona franca queda fuera aunque sea 'industrial'", () => {
  assert.equal(
    esRelevante({ landuse: "industrial", name: "Zona Franca Industrial de Paraguaná" }),
    false
  );
});

test("un activo con operador PDVSA entra aunque no declare product", () => {
  // Caso real: las estaciones de bombeo de gas de PDVSA no tienen `product`,
  // solo `operator=PDVSA` y `substance=gas`.
  assert.equal(
    esRelevante({ name: "Sistema de Inyección SIAE", operator: "PDVSA" }),
    true
  );
});

test("un producto ambiguo como 'Asphalt' NO basta por si solo (caso dudoso)", () => {
  // "Construcciones y Asfaltos Orientales C.A.": el asfalto es un derivado
  // del petroleo, pero la etiqueta la usan igual las pavimentadoras viales.
  // Regla del proyecto: sin poder distinguir, se deja fuera por defecto.
  assert.equal(
    esRelevante({
      man_made: "works",
      industrial: "factory",
      name: "Construcciones y Asfaltos Orientales C.A.",
      product: "Asphalt",
    }),
    false
  );
});

test("un puerto generico sin evidencia de hidrocarburos NO basta por si solo (caso dudoso)", () => {
  // Caso real: "Puerto de Palua" declara `cargo=dry_bulk` (mineral, no
  // petroleo). `industrial=port` por si solo no distingue un puerto
  // petrolero de uno que mueve otra carga.
  assert.equal(
    esRelevante({ industrial: "port", name: "Puerto de Palua", cargo: "dry_bulk" }),
    false
  );
});
