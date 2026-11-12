// Validador puro de la capa Bloques (spec 004, RF-156, RF-157, plan §3.4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { validarBloques, validarDivisiones, validarRegistros, CAPAS, ESTATUS_NORM } from "../src/bloques/validar.js";
import { GRUPO_ESTATUS_BLOQUE, COLOR_CAPA_BLOQUE } from "../src/config.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(RAIZ, "test", "fixtures", "bloques");
const json = (n) => JSON.parse(readFileSync(join(DIR, n), "utf8"));
const bloques = () => json("bloques-sinteticos.geojson");
const divisiones = () => json("divisiones-sinteticas.geojson");

/** Aplica `mut` al primer bloque (o al que diga `i`) y devuelve el FeatureCollection. */
const conCambio = (mut, i = 0) => {
  const fc = bloques();
  mut(fc.features[i], fc);
  return fc;
};
const falla = (fc, patron) => {
  const { errores } = validarBloques(fc);
  assert.ok(errores.some((e) => patron.test(e)), `esperaba error ${patron}; hubo: ${JSON.stringify(errores)}`);
};

test("RF-156: los fixtures buenos pasan sin errores ni avisos", () => {
  const r = validarBloques(bloques());
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
  assert.deepEqual(validarDivisiones(divisiones()).errores, []);
});

test("vocabularios del validador coinciden con la configuracion", () => {
  assert.deepEqual([...CAPAS].sort(), Object.keys(COLOR_CAPA_BLOQUE).sort());
  assert.deepEqual([...ESTATUS_NORM].sort(), Object.values(GRUPO_ESTATUS_BLOQUE).flat().sort());
});

test("RF-156: falla sin fuente", () => falla(conCambio((f) => delete f.properties.fuente), /fuente/));
test("RF-156: falla con id fuera del patron", () => falla(conCambio((f) => { f.properties.id = "X1"; }), /id/));
test("RF-156: falla con id duplicado", () =>
  falla(conCambio((f, fc) => { fc.features[1].properties.id = f.properties.id; fc.features[1].id = f.properties.id; }), /duplicad/));
test("RF-156: falla con capa fuera de vocabulario", () => falla(conCambio((f) => { f.properties.capa = "otra"; }), /capa/));
test("RF-156: falla con estatus_norm fuera de vocabulario", () =>
  falla(conCambio((f) => { f.properties.estatus_norm = "raro"; }), /estatus_norm/));
test("RF-156: falla con geometria que no es Polygon ni MultiPolygon", () =>
  falla(conCambio((f) => { f.geometry = { type: "Point", coordinates: [-63, 8] }; }), /geometr/));
test("RF-156: falla con anillo de menos de 4 posiciones", () =>
  falla(conCambio((f) => { f.geometry.coordinates[0] = f.geometry.coordinates[0].slice(0, 3); }), /anillo/));
test("RF-156: falla con anillo sin cerrar", () =>
  falla(conCambio((f) => { f.geometry.coordinates[0][4] = [-62.5, 8.5]; }), /sin cerrar/));
test("RF-156: falla con una posicion fuera de la ventana de Venezuela, no solo la primera", () => {
  const fc = conCambio((f) => { f.geometry.coordinates[0][2] = [-30, 8.2]; f.geometry.coordinates[0][3] = [-63, 40]; });
  const { errores } = validarBloques(fc);
  assert.ok(errores.filter((e) => /ventana|fuera/.test(e)).length >= 2, JSON.stringify(errores));
});
test("RF-156: falla con fecha_corte que no es AAAA-MM-DD", () =>
  falla(conCambio((f) => { f.properties.fecha_corte = "31/10/2026"; }), /fecha_corte/));
test("RF-156: falla con ultima_verificacion que no es AAAA-MM-DD", () =>
  falla(conCambio((f) => { f.properties.ultima_verificacion = "ayer"; }), /ultima_verificacion/));
test("tipos: operadores_2026 debe ser arreglo de texto", () =>
  falla(conCambio((f) => { f.properties.operadores_2026 = "Operadora Ficticia A"; }), /operadores_2026/));
test("tipos: tiene_licencia_ofac debe ser booleano", () =>
  falla(conCambio((f) => { f.properties.tiene_licencia_ofac = "si"; }), /tiene_licencia_ofac/));
test("tipos: area_km2 numero o null", () =>
  falla(conCambio((f) => { f.properties.area_km2 = "400"; }), /area_km2/));
test("tipos: registros_vinculados entero", () =>
  falla(conCambio((f) => { f.properties.registros_vinculados = 1.5; }), /registros_vinculados/));
test("tipos: confianza dentro de alta|media|baja", () =>
  falla(conCambio((f) => { f.properties.confianza = "muy alta"; }), /confianza/));
test("tipos: fuente_url https", () =>
  falla(conCambio((f) => { f.properties.fuente_url = "http://example.org/x"; }), /fuente_url/));
test("tipos: feature.id igual a properties.id", () =>
  falla(conCambio((f) => { f.id = "B999"; }), /feature\.id|id/));
test("falla si no es FeatureCollection", () => {
  assert.ok(validarBloques({ type: "Feature" }).errores.length > 0);
});

test("aviso: mas de 2.000 entidades", () => {
  const fc = bloques();
  const molde = fc.features[0];
  fc.features = Array.from({ length: 2001 }, (_, i) => {
    const f = structuredClone(molde);
    const id = "B" + String(i % 1000).padStart(3, "0");
    f.id = f.properties.id = id;
    return f;
  });
  const r = validarBloques(fc);
  assert.ok(r.avisos.some((a) => /2\.?000/.test(a)), JSON.stringify(r.avisos));
});

test("divisiones: fallan sin fuente, con id repetido y con confianza invalida", () => {
  const sinFuente = divisiones(); delete sinFuente.features[0].properties.fuente;
  assert.ok(validarDivisiones(sinFuente).errores.some((e) => /fuente/.test(e)));
  const repetido = divisiones(); repetido.features[1].properties.id = repetido.features[0].properties.id;
  assert.ok(validarDivisiones(repetido).errores.some((e) => /duplicad/.test(e)));
  const mala = divisiones(); mala.features[0].properties.confianza = "x";
  assert.ok(validarDivisiones(mala).errores.some((e) => /confianza/.test(e)));
});

const filas = () => [
  { id_registro: "R1", id_bloque: "B901", referencia: "Ref 1" },
  { id_registro: "R2", id_bloque: "B901", referencia: "Ref 2" },
  { id_registro: "R3", id_bloque: "", referencia: "Ref 3" },
];

test("RF-157: registros validos pasan y los sin bloque se cuentan aparte", () => {
  const r = validarRegistros(filas(), new Set(["B901"]));
  assert.deepEqual(r.errores, []);
  assert.equal(r.sinBloque, 1);
});
test("RF-157: falla con id_bloque inexistente", () => {
  const f = filas(); f[0].id_bloque = "B777";
  assert.ok(validarRegistros(f, new Set(["B901"])).errores.some((e) => /B777/.test(e)));
});
test("RF-157: falla sin referencia", () => {
  const f = filas(); f[1].referencia = "  ";
  assert.ok(validarRegistros(f, new Set(["B901"])).errores.some((e) => /referencia/.test(e)));
});
test("aviso: registros_vinculados distinto del numero de filas (si se pasa el mapa de conteos)", () => {
  const r = validarRegistros(filas(), new Map([["B901", 5]]));
  assert.deepEqual(r.errores, []);
  assert.ok(r.avisos.some((a) => /B901/.test(a)));
  assert.deepEqual(validarRegistros(filas(), new Map([["B901", 2]])).avisos, []);
});

test("fixtures completos: bloques, registros del CSV y conteos cuadran", () => {
  const fc = bloques();
  const conteos = new Map(fc.features.map((f) => [f.properties.id, f.properties.registros_vinculados]));
  const lineas = readFileSync(join(DIR, "registros-sinteticos.csv"), "utf8").trim().split("\n");
  const cab = lineas[0].split(",");
  const rows = lineas.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [cab[i], v])));
  const r = validarRegistros(rows, conteos);
  assert.deepEqual(r.errores, []);
  assert.deepEqual(r.avisos, []);
  assert.equal(r.sinBloque, 1);
});
