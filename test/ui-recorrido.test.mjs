/**
 * HTML del panel del recorrido (spec 003, T10). htmlPanel es pura: sin DOM.
 * RF-81, 84, 85, 92-95, 100, 101, 106, 108-111, 126, 127.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

import { htmlPanel } from "../src/ui/recorrido.js";
import { datosDeEscena, textoDeEscena } from "../src/ruta/motor.js";

const es = JSON.parse(await readFile(new URL("../src/i18n/es.json", import.meta.url), "utf8"));
const interp = (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (p[k] ?? m)) : s);
const util = { t: (clave, p) => interp(es[clave] ?? clave, p) };

const dato = (extra = {}) => ({
  id: "D5", tipoDato: "cuantitativo", etiqueta: "Gravedad del Merey 16", valor: 16, unidad: "°API", aproximado: false,
  fuente: "https://example.org/fuente", fuenteNombre: "Fuente de prueba", confianza: "alta",
  fechaDato: "2024-05", ultimaVerificacion: "2026-10-26", fechaNorma: null, nota: null, ...extra,
});
const vm = (extra = {}) => ({
  titulo: "Del pozo al tanquero", n: 2, total: 5, nivel: "divulgacion", texto: "Texto de <b>divulgación</b>.",
  datos: [dato()], referencia: "ubicacion", terminado: false, primera: false, plegado: false, ...extra,
});

test("solo el texto del nivel activo llega al panel (RF-92)", () => {
  const escena = { texto: { divulgacion: { es: "Texto simple" }, tecnico: { es: "Texto tecnico" } } };
  const divulg = htmlPanel(vm({ texto: textoDeEscena(escena, "divulgacion", "es") }), util);
  const tecnico = htmlPanel(vm({ nivel: "tecnico", texto: textoDeEscena(escena, "tecnico", "es") }), util);
  assert.ok(divulg.includes("Texto simple") && !divulg.includes("Texto tecnico"));
  assert.ok(tecnico.includes("Texto tecnico") && !tecnico.includes("Texto simple"));
});

test("el selector de nivel marca el activo con aria-pressed", () => {
  const html = htmlPanel(vm({ nivel: "tecnico" }), util);
  assert.match(html, /data-nivel="tecnico"[^>]*aria-pressed="true"/);
  assert.match(html, /data-nivel="divulgacion"[^>]*aria-pressed="false"/);
});

test("'Anterior' deshabilitado en la escena 1 y habilitado en las demas", () => {
  const primera = htmlPanel(vm({ n: 1, primera: true }), util);
  assert.match(primera.match(/<button[^>]*data-accion="anterior"[^>]*>/)[0], /\sdisabled(?=[\s>])/);
  const otra = htmlPanel(vm(), util);
  assert.doesNotMatch(otra.match(/<button[^>]*data-accion="anterior"[^>]*>/)[0], /\sdisabled(?=[\s>])/);
});

test("'Siguiente' en las intermedias y 'Terminar' en la ultima (RF-85)", () => {
  const media = htmlPanel(vm(), util);
  assert.match(media, /Siguiente/);
  assert.doesNotMatch(media, /Terminar/);
  const ultima = htmlPanel(vm({ n: 5, terminado: true }), util);
  assert.match(ultima, /Terminar/);
  assert.doesNotMatch(ultima, />\s*Siguiente\s*</);
});

test("sin control 'Fuentes' cuando datos es [] (RF-100)", () => {
  const html = htmlPanel(vm({ datos: [] }), util);
  assert.doesNotMatch(html, /Fuentes/);
  assert.doesNotMatch(html, /<details/);
  assert.match(htmlPanel(vm(), util), /Fuentes/);
});

test("escapa HTML del texto, de los datos y del titulo", () => {
  const html = htmlPanel(
    vm({ titulo: '<img src=x onerror="a()">', datos: [dato({ etiqueta: "<script>x</script>", fuenteNombre: "A&B", nota: '"><i>' })] }),
    util
  );
  assert.ok(!html.includes("<script>") && !html.includes("<b>divulgación") && !html.includes("<img"));
  assert.ok(html.includes("&lt;b&gt;divulgación&lt;/b&gt;") && html.includes("A&amp;B"));
});

test("enlace de fuente: target=_blank y rel='noopener noreferrer' (RF-93)", () => {
  const enlace = htmlPanel(vm(), util).match(/<a [^>]*>/)[0];
  assert.match(enlace, /href="https:\/\/example\.org\/fuente"/);
  assert.match(enlace, /target="_blank"/);
  assert.match(enlace, /rel="noopener noreferrer"/);
});

test("una fuente que no es https no se vuelve enlace", () => {
  const html = htmlPanel(vm({ datos: [dato({ fuente: "javascript:alert(1)" })] }), util);
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /javascript:/);
});

test("rotulo 'esquemático' o 'ubicación de referencia' segun la escena (RF-101)", () => {
  assert.match(htmlPanel(vm({ referencia: "esquematico" }), util), /esquemático/);
  const ubic = htmlPanel(vm({ referencia: "ubicacion" }), util);
  assert.match(ubic, /ubicación de referencia/);
  assert.doesNotMatch(ubic, /esquemático/);
  const sin = htmlPanel(vm({ referencia: null }), util);
  assert.doesNotMatch(sin, /esquemático|ubicación de referencia/);
});

test("muestra fecha del dato, confianza y ultima verificacion (RF-94)", () => {
  const html = htmlPanel(vm(), util);
  assert.match(html, /Fecha del dato/);
  assert.match(html, /2024-05/);
  assert.match(html, /Confianza/);
  assert.match(html, /Verificado/);
  assert.match(html, /2026-10-26/);
});

test("nota de instalacion y fecha de norma se muestran cuando existen (RF-111)", () => {
  const html = htmlPanel(
    vm({ datos: [dato({ tipoDato: "instalacion", nota: "Capacidad de diseño, no operativa", fechaNorma: "2021-03-01" })] }),
    util
  );
  assert.match(html, /Capacidad de diseño, no operativa/);
  assert.match(html, /Norma del 2021-03-01/);
});

test("aviso de aproximado solo si el dato lo es (RF-95)", () => {
  assert.match(htmlPanel(vm({ datos: [dato({ aproximado: true })] }), util), /varía con el diluente y el lote/);
  assert.doesNotMatch(htmlPanel(vm(), util), /varía con el diluente/);
});

test("dato cualitativo sin unidad no pinta 'null' ni 'undefined'", () => {
  const html = htmlPanel(vm({ datos: [dato({ tipoDato: "cualitativo", valor: "Primer cargamento", unidad: null, fechaDato: null })] }), util);
  assert.doesNotMatch(html, /null|undefined/);
  assert.match(html, /Primer cargamento/);
});

test("sin [placeholders] ni marcadores {sin resolver} en la salida", () => {
  for (const v of [vm(), vm({ n: 1, primera: true, datos: [] }), vm({ n: 5, terminado: true, plegado: true })]) {
    const html = htmlPanel(v, util);
    assert.doesNotMatch(html, /\[[a-z_]+\]/i);
    assert.doesNotMatch(html, /\{\w+\}/);
  }
});

test("con datos reales de motor (camelCase) renderiza sin huecos", () => {
  const esc = { datos: [{ id: "D", tipo_dato: "cuantitativo", etiqueta: { es: "X" }, valor: 3, unidad: "u", fuente: "https://a.org", fuente_nombre: { es: "N" }, confianza: "alta", fecha_dato: "2020", ultima_verificacion: "2026-10-26" }] };
  const html = htmlPanel(vm({ datos: datosDeEscena(esc, "es") }), util);
  assert.doesNotMatch(html, /null|undefined/);
  assert.match(html, />N</);
});

test("botones con tamaño tactil minimo de 44 px (min-h-11) y escena X de Y", () => {
  const html = htmlPanel(vm(), util);
  for (const b of html.match(/<button[^>]*>/g)) assert.match(b, /min-h-11/, b);
  assert.match(html, /Escena 2 de 5/);
});

test("plegado oculta el cuerpo pero conserva navegacion; aria-expanded refleja el estado", () => {
  const plegado = htmlPanel(vm({ plegado: true }), util);
  assert.match(plegado, /aria-expanded="false"/);
  assert.match(plegado, /Desplegar panel/);
  assert.doesNotMatch(plegado, /Texto de/);
  assert.match(plegado, /data-accion="siguiente"/);
  const abierto = htmlPanel(vm(), util);
  assert.match(abierto, /aria-expanded="true"/);
  assert.match(abierto, /Plegar panel/);
});

test("el panel no usa colores literales (RNF-4)", () => {
  assert.doesNotMatch(htmlPanel(vm(), util), /#[0-9a-f]{3,8}\b|rgb\(/i);
});

test("compacto (alto < 500 px): nivel y Plegar en la fila de cabecera; el cuerpo es la region con scroll (RF-109)", () => {
  const html = htmlPanel(vm({ nivel: "tecnico" }), util);
  const iCuerpo = html.indexOf('class="ruta-cuerpo');
  const cabecera = html.slice(html.indexOf('class="ruta-cabecera'), iCuerpo);
  assert.match(cabecera, /ruta-titulo/);
  assert.match(cabecera, /data-nivel="divulgacion"/);
  assert.match(cabecera, /data-nivel="tecnico"/);
  assert.match(cabecera, /data-accion="plegar"/);
  const cuerpo = html.slice(iCuerpo, html.indexOf("ruta-nav"));
  assert.doesNotMatch(cuerpo, /data-nivel/);
  assert.match(cuerpo, /ruta-texto/);
  assert.match(cuerpo, /overflow-y-auto/);
  const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-height: 499px\) \{[\s\S]*\.ruta-niveles \{\s*order: 0/);
  assert.match(css, /max-height: 45vh/);
});

test("plegado no pinta el selector de nivel pero conserva Plegar y la navegacion", () => {
  const html = htmlPanel(vm({ plegado: true }), util);
  assert.doesNotMatch(html, /data-nivel/);
  assert.match(html, /data-accion="plegar"/);
  assert.match(html, /ruta-nav/);
});
