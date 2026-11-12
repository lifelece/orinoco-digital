// Textos de la capa Bloques en ES y EN (spec 004, T09, RF-152, RF-153, RNF-7).
// La paridad general de claves y marcadores ya la prueba test/i18n.test.mjs; aqui se
// prueba lo propio de la capa: que existen las claves que usan T11-T15, los rotulos
// neutrales y que ningun texto trae una raiz prohibida ni un adjetivo valorativo.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const dic = (l) => JSON.parse(readFileSync(join(RAIZ, "src", "i18n", `${l}.json`), "utf8"));
const es = dic("es");
const en = dic("en");
const claves = (d) => Object.keys(d).filter((k) => k.startsWith("bloques."));
const marcadores = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const CAPAS = ["nabep", "chevron", "acuerdo_2026", "sin_registro"];
const ESTATUS = ["activo", "intermitente", "paralizado", "en_proyecto", "en_evaluacion", "sin_info", "sin_registro"];
const GRUPOS = ["operando", "detenido", "sin_operacion_registrada"];

/** Claves que consumen T11 (ficha), T12 (leyenda y filtros) y T15 (interruptor, tabla, buscador, fuentes). */
const REQUERIDAS = [
  "bloques.interruptor", "bloques.errorCarga",
  ...CAPAS.map((c) => `bloques.capa.${c}`),
  ...ESTATUS.map((e) => `bloques.estatus.${e}`),
  ...GRUPOS.map((g) => `bloques.grupo.${g}`),
  "bloques.leyenda.titulo", "bloques.leyenda.rellenoTitulo", "bloques.leyenda.bordeTitulo",
  "bloques.leyenda.bordeDiscontinuo", "bloques.leyenda.bordeContinuo", "bloques.leyenda.visibles", "bloques.leyenda.bordeNota",
  "bloques.filtros.titulo", "bloques.filtros.empresa", "bloques.filtros.estatus", "bloques.filtros.licencia",
  "bloques.filtros.convenio", "bloques.filtros.convenioTodos", "bloques.filtros.convenioSi", "bloques.filtros.convenioNo",
  "bloques.filtros.contador", "bloques.filtros.vacio", "bloques.filtros.quitar",
  "bloques.ficha.operador2026", "bloques.ficha.operadorAntes", "bloques.ficha.tipoAlianza", "bloques.ficha.estatusFuente",
  "bloques.ficha.estatusNorm", "bloques.ficha.licencia", "bloques.ficha.sinLicencia", "bloques.ficha.convenio",
  "bloques.ficha.convenioSi", "bloques.ficha.convenioNo", "bloques.ficha.zona", "bloques.ficha.entidad",
  "bloques.ficha.municipios", "bloques.ficha.area", "bloques.ficha.registros", "bloques.ficha.campos",
  "bloques.ficha.ningunCampo", "bloques.ficha.sinDato", "bloques.ficha.sinRegistro", "bloques.ficha.corte",
  "bloques.ficha.verFuente", "bloques.ficha.atribucion", "bloques.ficha.bloqueEnCampo",
  "bloques.tabla.titulo", "bloques.tabla.nombre", "bloques.tabla.capa", "bloques.tabla.operador",
  "bloques.tabla.estatus", "bloques.tabla.licencia", "bloques.tabla.convenio",
  "bloques.buscar.tipo", "bloques.fuente",
];

test("RF-152: todas las claves de la capa existen en ES y EN, con los mismos marcadores", () => {
  for (const k of REQUERIDAS) {
    assert.ok(k in es, `falta ${k} en es.json`);
    assert.ok(k in en, `falta ${k} en en.json`);
    assert.deepEqual(marcadores(es[k]), marcadores(en[k]), `marcadores distintos en ${k}`);
  }
  assert.deepEqual(claves(es).sort(), claves(en).sort(), "claves bloques.* distintas entre ES y EN");
  assert.deepEqual(claves(es).filter((k) => !REQUERIDAS.includes(k)), [], "claves bloques.* que ninguna prueba exige");
});

test("RF-152: ningun texto de la capa esta vacio y los marcadores esperados estan", () => {
  for (const d of [es, en]) {
    for (const k of claves(d)) assert.ok(d[k].trim() !== "", `${k} vacio`);
  }
  assert.deepEqual(marcadores(es["bloques.filtros.contador"]), ["N", "n"]);
  assert.deepEqual(marcadores(es["bloques.leyenda.visibles"]), ["n"]);
  assert.deepEqual(marcadores(es["bloques.ficha.corte"]), ["fecha"]);
  assert.deepEqual(marcadores(es["bloques.ficha.bloqueEnCampo"]), ["nombre", "operador"]);
});

test("RF-153: los rotulos neutrales obligatorios estan literales en ES", () => {
  assert.equal(es["bloques.ficha.operador2026"], "Operador 2026");
  assert.equal(es["bloques.ficha.operadorAntes"], "Operador antes de 2026");
  assert.equal(es["bloques.ficha.sinLicencia"], "Sin licencia registrada en la fuente");
  assert.equal(es["bloques.ficha.convenio"], "Parte del acuerdo EE. UU.–Venezuela (según la fuente)");
  assert.equal(es["bloques.ficha.sinDato"], "Sin dato en la fuente");
  assert.equal(es["bloques.ficha.sinRegistro"], "Sin registro en la fuente");
  assert.equal(es["bloques.interruptor"], "Bloques y contratos 2026");
  assert.equal(es["bloques.filtros.vacio"], "Ningún bloque cumple los filtros");
  assert.equal(es["bloques.filtros.quitar"], "Quitar filtros");
  assert.equal(es["bloques.ficha.ningunCampo"], "Ningún campo del mapa dentro de este bloque");
});

test("RF-152: el EN trae el equivalente de cada rotulo neutral (no el texto en espanol)", () => {
  for (const k of ["operador2026", "operadorAntes", "sinLicencia", "convenio", "sinDato", "sinRegistro"]) {
    assert.notEqual(en[`bloques.ficha.${k}`], es[`bloques.ficha.${k}`], `bloques.ficha.${k} sin traducir`);
  }
  assert.match(en["bloques.ficha.sinDato"], /source/i);
  assert.match(en["bloques.ficha.operador2026"], /2026/);
});

// Raices prohibidas (spec §3; RF-153), en minuscula y sin tildes para no depender de la ortografia.
const sinTildes = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const PROHIBIDAS_ES = ["desplazad", "ilegal", "saque", "regimen", "entreg", "regal"];
// Equivalentes en ingles [ASI: la spec fija solo la lista en espanol].
const PROHIBIDAS_EN = ["displace", "illegal", "plunder", "looting", "regime", "hand over", "handed over", "giveaway"];
// Adjetivos valorativos sobre empresas, sanciones o gobiernos (RNF-7) [ASI: lista cerrada y ampliable].
const VALORATIVAS_ES = ["corrupt", "ilicit", "injust", "abusiv", "polemic", "controvertid", "opac", "arbitrari", "fraud", "escandal", "oscur", "turbio"];
const VALORATIVAS_EN = ["corrupt", "illicit", "unjust", "unfair", "abusive", "controvers", "opaque", "arbitrary", "fraud", "scandal", "shady", "murky"];

function sinRaices(d, lista, etiqueta) {
  for (const k of claves(d)) {
    const v = sinTildes(d[k]);
    for (const raiz of lista) assert.ok(!v.includes(raiz), `${k} contiene la raiz ${etiqueta} "${raiz}": ${d[k]}`);
  }
}

test("RF-153: ningun texto de la capa contiene una raiz prohibida (ES y EN)", () => {
  sinRaices(es, PROHIBIDAS_ES, "prohibida");
  sinRaices(en, PROHIBIDAS_EN, "prohibida");
});

test("RNF-7: ningun texto de la capa trae adjetivos valorativos (ES y EN)", () => {
  sinRaices(es, VALORATIVAS_ES, "valorativa");
  sinRaices(en, VALORATIVAS_EN, "valorativa");
});

test("el test de raices detecta una palabra prohibida (control del propio test)", () => {
  assert.throws(() => sinRaices({ "bloques.x": "Empresa desplazada" }, PROHIBIDAS_ES, "prohibida"));
  assert.throws(() => sinRaices({ "bloques.x": "Régimen anterior" }, PROHIBIDAS_ES, "prohibida"));
  assert.throws(() => sinRaices({ "bloques.x": "Corrupt deal" }, VALORATIVAS_EN, "valorativa"));
});

test("RF-135/RNF-5: cada tratamiento de relleno y cada borde se nombra en texto, distinto entre si", () => {
  const trat = GRUPOS.map((g) => es[`bloques.grupo.${g}`]);
  assert.equal(new Set(trat).size, 3);
  assert.notEqual(es["bloques.leyenda.bordeDiscontinuo"], es["bloques.leyenda.bordeContinuo"]);
  assert.match(es["bloques.leyenda.bordeNota"], /acercar/i);
});
