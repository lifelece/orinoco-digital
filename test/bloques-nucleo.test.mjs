// Nucleo puro de la capa Bloques (spec 004: RF-134..136, 145, 146..148 en su logica).
// Los conteos de abajo se contaron a mano sobre test/fixtures/bloques/bloques-sinteticos.geojson:
//   capa: nabep = B901,B905,B908 (3) · chevron = B902,B906 (2) · acuerdo_2026 = B903,B907,B909 (3) · sin_registro = B904 (1)
//   operadores 2026: A = B901,B902,B908 · C = B902 · D = B903,B909 · E = B905 · F = B907 · B904 y B906 sin operador
//   licencia: L1 = B901 · L2 = B903 · L3 = B908 · sin licencia = B902,B904,B905,B906,B907,B909 (6)
//   convenio true = B901,B905,B908 · false = los otros 6
//   estatus activo = B901,B908,B909
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import {
  grupoEstatus, estiloBloque, opcionesFiltro, filtrarBloques, conteoPorCapa, corteDeDatos,
} from "../src/bloques/nucleo.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const features = JSON.parse(
  readFileSync(join(RAIZ, "test/fixtures/bloques/bloques-sinteticos.geojson"), "utf8"),
).features;
const P = "Operadora Ficticia ";
const porId = (id) => features.find((f) => f.id === id).properties;
const ids = (set) => [...set].sort();
const sinFiltros = () => ({ empresas: new Set(), estatus: new Set(), licencias: new Set(), convenio: null });
const conFiltro = (c) => ({ ...sinFiltros(), ...c });

test("grupoEstatus: los 7 valores caen en 3 grupos; lo desconocido, en sin operacion registrada", () => {
  assert.equal(grupoEstatus("activo"), "operando");
  assert.equal(grupoEstatus("intermitente"), "operando");
  assert.equal(grupoEstatus("paralizado"), "detenido");
  for (const e of ["en_proyecto", "en_evaluacion", "sin_info", "sin_registro"]) {
    assert.equal(grupoEstatus(e), "sin_operacion_registrada", e);
  }
  assert.equal(grupoEstatus("inventado"), "sin_operacion_registrada");
});

test("RF-134/135/136: estilo = capa, relleno por grupo de estatus, borde por licencia", () => {
  assert.deepEqual(estiloBloque(porId("B901")), { colorClave: "nabep", relleno: "solido", borde: "discontinuo" });
  assert.deepEqual(estiloBloque(porId("B903")), { colorClave: "acuerdo_2026", relleno: "rayado", borde: "discontinuo" });
  assert.deepEqual(estiloBloque(porId("B904")), { colorClave: "sin_registro", relleno: "tenue", borde: "continuo" });
  assert.deepEqual(estiloBloque(porId("B909")), { colorClave: "acuerdo_2026", relleno: "solido", borde: "continuo" });
});

test("RF-146: opciones de filtro salen de los datos, ordenadas", () => {
  const o = opcionesFiltro(features);
  assert.deepEqual(o.empresas, ["A", "C", "D", "E", "F"].map((x) => P + x));
  assert.deepEqual(o.estatus, ["activo", "en_evaluacion", "en_proyecto", "intermitente", "paralizado", "sin_info", "sin_registro"]);
  assert.deepEqual(o.licencias, ["Licencia ficticia L1", "Licencia ficticia L2", "Licencia ficticia L3", null]);
  assert.deepEqual(o.convenio, [true, false]);
});

test("RF-146: las empresas de bloques compartidos aparecen una por una", () => {
  assert.ok(opcionesFiltro(features).empresas.includes(P + "C"), "C solo opera junto con A en B902");
});

test("RF-147: sin filtros, todos los bloques son visibles", () => {
  assert.equal(filtrarBloques(features, sinFiltros()).size, 9);
});

test("RF-147: una empresa filtra tambien los bloques compartidos", () => {
  assert.deepEqual(ids(filtrarBloques(features, conFiltro({ empresas: new Set([P + "A"]) }))), ["B901", "B902", "B908"]);
  assert.deepEqual(ids(filtrarBloques(features, conFiltro({ empresas: new Set([P + "C"]) }))), ["B902"]);
});

test("RF-147: varios valores dentro de una dimension son una union", () => {
  const r = filtrarBloques(features, conFiltro({ empresas: new Set([P + "D", P + "E"]) }));
  assert.deepEqual(ids(r), ["B903", "B905", "B909"]);
});

test("RF-147: dimensiones distintas se combinan con Y", () => {
  assert.deepEqual(
    ids(filtrarBloques(features, conFiltro({ empresas: new Set([P + "A"]), convenio: true }))),
    ["B901", "B908"],
  );
  assert.deepEqual(
    ids(filtrarBloques(features, conFiltro({ empresas: new Set([P + "A"]), licencias: new Set([null]) }))),
    ["B902"],
  );
  assert.deepEqual(ids(filtrarBloques(features, conFiltro({ estatus: new Set(["activo"]) }))), ["B901", "B908", "B909"]);
});

test("RF-146: licencia null es el valor Sin licencia registrada", () => {
  assert.deepEqual(
    ids(filtrarBloques(features, conFiltro({ licencias: new Set([null]) }))),
    ["B902", "B904", "B905", "B906", "B907", "B909"],
  );
  assert.deepEqual(ids(filtrarBloques(features, conFiltro({ licencias: new Set(["Licencia ficticia L1"]) }))), ["B901"]);
});

test("RF-146: convenio true, false y todos (null)", () => {
  assert.deepEqual(ids(filtrarBloques(features, conFiltro({ convenio: true }))), ["B901", "B905", "B908"]);
  assert.equal(filtrarBloques(features, conFiltro({ convenio: false })).size, 6);
  assert.equal(filtrarBloques(features, conFiltro({ convenio: null })).size, 9);
});

test("RF-148: filtros sin coincidencias devuelven un conjunto vacio", () => {
  const r = filtrarBloques(features, conFiltro({ empresas: new Set([P + "C"]), convenio: true }));
  assert.equal(r.size, 0);
});

test("RF-138/147: conteo por capa con todos visibles y con filtro", () => {
  const todos = filtrarBloques(features, sinFiltros());
  assert.deepEqual(conteoPorCapa(features, todos), { nabep: 3, chevron: 2, acuerdo_2026: 3, sin_registro: 1 });
  const a = filtrarBloques(features, conFiltro({ empresas: new Set([P + "A"]) }));
  assert.deepEqual(conteoPorCapa(features, a), { nabep: 2, chevron: 1, acuerdo_2026: 0, sin_registro: 0 });
  assert.deepEqual(conteoPorCapa(features, new Set()), { nabep: 0, chevron: 0, acuerdo_2026: 0, sin_registro: 0 });
});

test("RF-145: el corte de datos es la fecha mas antigua", () => {
  assert.equal(corteDeDatos(features), "2026-09-30");
  assert.equal(corteDeDatos(features.filter((f) => f.id !== "B906")), "2026-10-31");
});

test("RF-145: sin fechas validas, el corte es null", () => {
  assert.equal(corteDeDatos([]), null);
  assert.equal(corteDeDatos([{ properties: { fecha_corte: "ayer" } }, { properties: {} }]), null);
});

test("las funciones no modifican sus entradas", () => {
  const copia = structuredClone(features);
  opcionesFiltro(features);
  filtrarBloques(features, conFiltro({ empresas: new Set([P + "A"]) }));
  conteoPorCapa(features, new Set(["B901"]));
  corteDeDatos(features);
  assert.deepEqual(features, copia);
});

// --- T15: buscador (RF-151) ---
import { buscarBloques } from "../src/bloques/nucleo.js";

test("buscarBloques: por nombre, por id y sin distinguir mayusculas", () => {
  assert.equal(buscarBloques(features, "prueba 3")[0].id, "B903");
  assert.deepEqual(buscarBloques(features, "b907").map((b) => b.id), ["B907"]);
  assert.equal(buscarBloques(features, "BLOQUE PRUEBA", 20).length, 9);
});

test("buscarBloques: id exacto primero, limite y consulta corta o sin resultados", () => {
  assert.equal(buscarBloques(features, "B905", 3)[0].id, "B905");
  assert.equal(buscarBloques(features, "bloque", 3).length, 3);
  assert.deepEqual(buscarBloques(features, "b"), []);
  assert.deepEqual(buscarBloques(features, "zzz"), []);
});
