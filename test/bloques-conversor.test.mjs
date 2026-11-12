// Conversor crudo -> esquema publicado (spec 004, T07, RF-154, RF-155).
// Solo usa la forma cruda INVENTADA de test/fixtures/bloques/crudo/. Ningun dato real.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, cpSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { parsearCsv, convertirBloques, convertirDivisiones, convertir } from "../scripts/bloques-tv-a-geojson.mjs";
import { validarBloques, validarDivisiones } from "../src/bloques/validar.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CRUDO = join(RAIZ, "test", "fixtures", "bloques", "crudo");
const SCRIPT = join(RAIZ, "scripts", "bloques-tv-a-geojson.mjs");
const leerJson = (n) => JSON.parse(readFileSync(join(CRUDO, n), "utf8"));
const crudoBloques = () => leerJson("orinoco_bloques_2026.geojson");
const crudoDivisiones = () => leerJson("orinoco_fpo_divisiones.geojson");
const porId = (fc, id) => fc.features.find((f) => f.id === id).properties;

test("parser CSV: comillas, comas internas, comillas dobles, saltos de linea y BOM", () => {
  const filas = parsearCsv('﻿a,b,c\r\n1,"x, y","dice ""hola"""\r\n2,"l1\nl2",\r\n');
  assert.deepEqual(filas, [
    { a: "1", b: "x, y", c: 'dice "hola"' },
    { a: "2", b: "l1\nl2", c: "" },
  ]);
  assert.deepEqual(parsearCsv(""), []);
});

test("RF-154: el esquema publicado sale del crudo segun el plan 3.1", () => {
  const fc = convertirBloques(crudoBloques());
  assert.equal(fc.features.length, 3);
  const a = porId(fc, "B901");
  assert.deepEqual(a.operadores_2026, ["Operadora Ficticia A", "Operadora Ficticia B"]);
  assert.deepEqual(a.operadores_antes_2026, ["Operadora Ficticia C"]);
  assert.deepEqual(a.municipios, ["Municipio Ficticio 1", "Municipio Ficticio 2"]);
  assert.equal(a.licencia_ofac, "Licencia ficticia L1");
  assert.equal(a.entidad_federal, "Estado Ficticio 1");
  assert.equal(a.confianza, "alta");
  assert.equal(a.fecha_corte, "2026-10-31");
  assert.equal(a.ultima_verificacion, "2026-11-11");
  assert.equal(a.fuente_url, "https://example.org/sintetico");
  assert.match(a.fuente, /Transparencia Venezuela/);
  assert.match(a.fuente, /31\/10\/2026/);
  assert.ok(!("estado" in a), "el conversor no emite `estado`");
  for (const k of ["campo_pdvsa", "etiqueta_pdvsa", "empresa_mixta_pdvsa", "pais_socio_pdvsa", "caracteristica"]) {
    assert.ok(!(k in a), `${k} debe descartarse`);
  }
  assert.equal(fc.features[0].id, a.id);
});

test("RF-154: vacios y centinelas de la fuente se normalizan", () => {
  const fc = convertirBloques(crudoBloques());
  const b = porId(fc, "B902");
  assert.deepEqual(b.operadores_2026, []);
  assert.deepEqual(b.operadores_antes_2026, []);
  assert.equal(b.estatus_fuente, null);
  assert.equal(b.licencia_ofac, null);
  assert.equal(b.tipo_alianza, null);
  assert.equal(b.entidad_federal, null);
  assert.deepEqual(b.municipios, []);
  assert.equal(b.confianza, "media");
  assert.equal(porId(fc, "B903").confianza, "baja");
  assert.equal(porId(fc, "B903").area_km2, 0);
});

test("operador con coma interna: solo se separa por punto y coma", () => {
  const c = porId(convertirBloques(crudoBloques()), "B903");
  assert.deepEqual(c.operadores_2026, ["Operadora Ficticia D, subsidiaria de Operadora Ficticia E"]);
});

test("geometria: 5 decimales, sin vertices repetidos, anillos cerrados, MultiPolygon intacto", () => {
  const fc = convertirBloques(crudoBloques());
  const g = fc.features.find((f) => f.id === "B901").geometry;
  const anillo = g.coordinates[0];
  assert.deepEqual(anillo[1], [-62.87654, 8]);
  assert.equal(anillo.length, 5, "el vertice repetido se elimina");
  assert.deepEqual(anillo[0], anillo[anillo.length - 1]);
  assert.equal(fc.features.find((f) => f.id === "B903").geometry.type, "MultiPolygon");
  for (const f of fc.features) {
    for (const n of JSON.stringify(f.geometry).match(/-?\d+\.\d+/g)) {
      assert.ok(n.split(".")[1].length <= 5, `demasiados decimales: ${n}`);
    }
  }
});

test("divisiones: nombre con mayuscula inicial, id_fpo como id y procedencia del corte", () => {
  const fc = convertirDivisiones(crudoDivisiones(), crudoBloques().metadata);
  const p = fc.features[0].properties;
  assert.equal(p.id, "FPO1");
  assert.equal(p.nombre, "División uno");
  assert.equal(p.bloques_que_toca, 1);
  assert.equal(p.confianza, "media");
  assert.equal(p.fecha_corte, "2026-10-31");
  assert.equal(fc.features[0].id, "FPO1");
});

test("la salida del conversor pasa el validador", () => {
  const r = convertir({ bloques: crudoBloques(), divisiones: crudoDivisiones() });
  assert.deepEqual(r.errores, []);
  assert.deepEqual(validarBloques(r.bloquesFc).errores, []);
  assert.deepEqual(validarDivisiones(r.divisionesFc).errores, []);
});

test("registros: se validan contra los bloques y se cuentan los sin bloque", () => {
  const filas = parsearCsv(readFileSync(join(CRUDO, "orinoco_contratos_2026.csv"), "utf8"));
  const r = convertir({ bloques: crudoBloques(), divisiones: crudoDivisiones(), registros: filas });
  assert.deepEqual(r.errores, []);
  assert.equal(r.sinBloque, 1);
  assert.equal(r.registros, 4);
  const mal = convertir({
    bloques: crudoBloques(),
    divisiones: crudoDivisiones(),
    registros: [{ id_registro: "R1", id_bloque: "B999", referencia: "r" }],
  });
  assert.ok(mal.errores.some((e) => /B999/.test(e)));
});

const correr = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: "utf8" });
const carpeta = () => mkdtempSync(join(tmpdir(), "bloques-conv-"));

test("RF-154: el CLI escribe en la carpeta de salida e imprime tamanos crudo y gzip", () => {
  const out = carpeta();
  try {
    const r = correr("--entrada", CRUDO, "--salida", out);
    assert.equal(r.status, 0, r.stderr);
    assert.ok(existsSync(join(out, "bloques-2026.geojson")));
    assert.ok(existsSync(join(out, "faja-divisiones-2026.geojson")));
    assert.match(r.stdout, /gzip/);
    assert.match(r.stdout, /3 bloques/);
    const publicado = JSON.parse(readFileSync(join(out, "bloques-2026.geojson"), "utf8"));
    assert.deepEqual(validarBloques(publicado).errores, []);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test("RF-155: si el validador falla no se escribe nada y el codigo es 1, listando cada error", () => {
  const ent = carpeta();
  const base = carpeta();
  const out = join(base, "salida");
  try {
    cpSync(CRUDO, ent, { recursive: true });
    const malo = crudoBloques();
    malo.features[0].properties.capa = "inventada";
    malo.features[1].properties.estatus_norm = "raro";
    writeFileSync(join(ent, "orinoco_bloques_2026.geojson"), JSON.stringify(malo));
    const r = correr("--entrada", ent, "--salida", out);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /capa fuera de vocabulario/);
    assert.match(r.stderr, /estatus_norm fuera de vocabulario/);
    assert.ok(!existsSync(out), "no debe crear la carpeta de salida");
  } finally {
    rmSync(ent, { recursive: true, force: true });
    rmSync(base, { recursive: true, force: true });
  }
});

test("el destino por defecto es data/raw/tv-2026/publicado/ y public/data/ solo con --publicar", () => {
  const src = readFileSync(SCRIPT, "utf8");
  assert.match(src, /"data", "raw", "tv-2026", "publicado"/);
  assert.match(src, /"--publicar"/);
  const r = correr("--entrada", join(tmpdir(), "no-existe-xyz"));
  assert.equal(r.status, 1);
});

test("anillos degenerados de la fuente se descartan con aviso (agujero o parte), sin romper el resto", () => {
  const crudo = crudoBloques();
  const bueno = [[-63, 8], [-62.9, 8], [-62.9, 8.1], [-63, 8]];
  const plano = [[-63.5, 8], [-63.4, 8], [-63.4, 8], [-63.5, 8]];
  crudo.features[0].geometry = { type: "Polygon", coordinates: [bueno, plano] };
  crudo.features[2].geometry = { type: "MultiPolygon", coordinates: [[bueno], [plano]] };
  const avisos = [];
  const fc = convertirBloques(crudo, avisos);
  assert.equal(fc.features[0].geometry.coordinates.length, 1);
  assert.equal(fc.features[2].geometry.type, "Polygon");
  assert.equal(avisos.length, 2);
  assert.deepEqual(validarBloques(fc).errores, []);
});
