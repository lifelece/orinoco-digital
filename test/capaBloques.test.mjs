// Leyenda, filtros y contador de la capa Bloques (spec 004, T12; RF-138, RF-146 a RF-149).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { htmlLeyendaBloques, htmlFiltrosBloques, montarFiltrosBloques } from "../src/ui/capaBloques.js";
import { opcionesFiltro, filtrarBloques, conteoPorCapa } from "../src/bloques/nucleo.js";
import { interpolar } from "../src/i18n/interpolar.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const es = JSON.parse(readFileSync(join(RAIZ, "src", "i18n", "es.json"), "utf8"));
const features = JSON.parse(readFileSync(join(RAIZ, "test", "fixtures", "bloques", "bloques-sinteticos.geojson"), "utf8")).features;
const t = (k, p) => interpolar(es[k] ?? k, p);
const todos = new Set(features.map((f) => f.properties.id));
const sinFiltro = () => ({ empresas: new Set(), estatus: new Set(), licencias: new Set(), convenio: null });
const texto = (html) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

test("RF-138: la leyenda nombra en texto las 9 entradas, con el n.o de bloques visibles por capa", () => {
  const conteos = conteoPorCapa(features, todos);
  const h = htmlLeyendaBloques(conteos, t);
  assert.equal((h.match(/data-leyenda=/g) ?? []).length, 9);
  for (const c of ["nabep", "chevron", "acuerdo_2026", "sin_registro"]) {
    assert.ok(h.includes(es[`bloques.capa.${c}`]), c);
    assert.ok(texto(h).includes(`${es[`bloques.capa.${c}`]} · ${conteos[c]} bloques visibles`), `conteo de ${c}`);
  }
  for (const g of ["operando", "detenido", "sin_operacion_registrada"]) assert.ok(h.includes(es[`bloques.grupo.${g}`]));
  assert.ok(h.includes(es["bloques.leyenda.bordeDiscontinuo"]) && h.includes(es["bloques.leyenda.bordeContinuo"]));
  assert.ok(h.includes(es["bloques.leyenda.bordeNota"]));
});

test("RNF-5: cada entrada de leyenda trae texto propio (el color no es el unico canal)", () => {
  const h = htmlLeyendaBloques({ nabep: 0, chevron: 0, acuerdo_2026: 0, sin_registro: 0 }, t);
  const entradas = h.match(/<li [^>]*data-leyenda[\s\S]*?<\/li>/g);
  assert.equal(entradas.length, 9);
  for (const e of entradas) assert.ok(texto(e).trim().length > 5, `entrada sin texto: ${e}`);
  assert.equal(new Set(entradas.map((e) => texto(e))).size, 9, "textos distintos");
});

test("RF-146: las opciones salen de los datos cargados (empresas, estatus, licencias con 'sin licencia', acuerdo)", () => {
  const op = opcionesFiltro(features);
  const h = htmlFiltrosBloques(op, sinFiltro(), todos.size, features.length, t);
  for (const e of op.empresas) assert.ok(h.includes(`>${e}<`), `empresa ${e}`);
  for (const e of op.estatus) assert.ok(h.includes(es[`bloques.estatus.${e}`]), `estatus ${e}`);
  for (const l of op.licencias.filter((x) => x !== null)) assert.ok(h.includes(`>${l}<`), `licencia ${l}`);
  assert.ok(h.includes(es["bloques.ficha.sinLicencia"]) && h.includes('data-nulo="1"'));
  for (const k of ["Todos", "Sí", "No"]) assert.ok(h.includes(`<span>${k}</span>`));
  assert.ok(!h.includes("Operadora Ficticia Z"), "ninguna opcion inventada");
});

test("RF-147: contador 'n de N bloques' con N el total cargado", () => {
  const op = opcionesFiltro(features);
  const ids = filtrarBloques(features, { ...sinFiltro(), convenio: true });
  const h = htmlFiltrosBloques(op, { ...sinFiltro(), convenio: true }, ids.size, features.length, t);
  assert.ok(texto(h).includes(`${ids.size} de ${features.length} bloques`));
  assert.match(h, /role="status"[^>]*aria-live="polite"/);
});

test("RF-148: sin resultados muestra el mensaje y el boton 'Quitar filtros'; con resultados no", () => {
  const op = opcionesFiltro(features);
  const vacio = htmlFiltrosBloques(op, sinFiltro(), 0, features.length, t);
  assert.ok(vacio.includes("Ningún bloque cumple los filtros"));
  assert.match(vacio, /<button type="button"[^>]*data-accion="quitar-filtros">Quitar filtros<\/button>/);
  const hay = htmlFiltrosBloques(op, sinFiltro(), 3, features.length, t);
  assert.ok(!hay.includes("Ningún bloque cumple") && !hay.includes("quitar-filtros"));
});

test("RF-149: el HTML refleja los filtros elegidos (se conservan al reencender)", () => {
  const op = opcionesFiltro(features);
  const filtros = { empresas: new Set([op.empresas[0]]), estatus: new Set([op.estatus[0]]), licencias: new Set([null]), convenio: false };
  const h = htmlFiltrosBloques(op, filtros, 1, features.length, t);
  assert.equal((h.match(/type="checkbox"[^>]* checked/g) ?? []).length, 3);
  assert.match(h, /data-valor="no" checked/);
  assert.ok(!/data-valor="todos" checked/.test(h));
  assert.match(htmlFiltrosBloques(op, sinFiltro(), 1, 5, t), /data-valor="todos" checked/);
});

test("controles con etiqueta accesible: todo input dentro de un label con texto, grupos con legend", () => {
  const h = htmlFiltrosBloques(opcionesFiltro(features), sinFiltro(), 5, 5, t);
  const inputs = h.match(/<input /g).length;
  const labels = h.match(/<label[^>]*><input [^>]*><span>[^<]+<\/span><\/label>/g) ?? [];
  assert.equal(labels.length, inputs);
  assert.equal((h.match(/<fieldset/g) ?? []).length, (h.match(/<legend/g) ?? []).length);
  assert.equal((h.match(/<fieldset/g) ?? []).length, 4);
  assert.ok(/min-h-11/.test(h), "objetivo tactil >= 44 px");
});

test("escapado: valores de empresa y licencia con HTML no producen etiquetas", () => {
  const ataque = '<img src=x onerror=alert(1)>"';
  const op = { empresas: [ataque], estatus: [], licencias: [ataque, null], convenio: [true, false] };
  const h = htmlFiltrosBloques(op, sinFiltro(), 1, 1, t);
  assert.ok(!/<img/i.test(h));
  assert.ok(!/data-valor="[^"]*"[^>]*onerror/.test(h));
  assert.ok(h.includes("&lt;img"));
});

/** Nodo simulado: casillas con `checked` y `dataset`, y registro de oyentes. */
function nodoSimulado(inputs) {
  const oyentes = {};
  return {
    oyentes,
    addEventListener: (tipo, fn) => { oyentes[tipo] = fn; },
    removeEventListener: (tipo) => { delete oyentes[tipo]; },
    querySelectorAll: () => inputs,
  };
}

test("montarFiltrosBloques: un cambio entrega los filtros leidos de los controles marcados", () => {
  const inputs = [
    { checked: true, dataset: { filtro: "empresas", valor: "A" } },
    { checked: false, dataset: { filtro: "empresas", valor: "B" } },
    { checked: true, dataset: { filtro: "estatus", valor: "activo" } },
    { checked: true, dataset: { filtro: "licencias", valor: "", nulo: "1" } },
    { checked: true, dataset: { filtro: "convenio", valor: "si" } },
  ];
  const nodo = nodoSimulado(inputs);
  const recibidos = [];
  montarFiltrosBloques(nodo, (f) => recibidos.push(f));
  nodo.oyentes.change();
  assert.deepEqual([...recibidos[0].empresas], ["A"]);
  assert.deepEqual([...recibidos[0].estatus], ["activo"]);
  assert.deepEqual([...recibidos[0].licencias], [null]);
  assert.equal(recibidos[0].convenio, true);
});

test("montarFiltrosBloques: 'Quitar filtros' entrega filtros vacios y desmontar retira los oyentes", () => {
  const nodo = nodoSimulado([]);
  const recibidos = [];
  const desmontar = montarFiltrosBloques(nodo, (f) => recibidos.push(f));
  nodo.oyentes.click({ target: { closest: (s) => (s.includes("quitar-filtros") ? {} : null) } });
  nodo.oyentes.click({ target: { closest: () => null } });
  assert.equal(recibidos.length, 1);
  assert.deepEqual(recibidos[0].empresas.size + recibidos[0].estatus.size + recibidos[0].licencias.size, 0);
  assert.equal(recibidos[0].convenio, null);
  desmontar();
  assert.deepEqual(Object.keys(nodo.oyentes), []);
});

test("el modulo no usa document, window, fetch ni innerHTML", () => {
  const src = readFileSync(join(RAIZ, "src", "ui", "capaBloques.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/\b(document|window|fetch|innerHTML)\b/.test(src));
});
