// Ficha del bloque, HTML puro (spec 004, T11; RF-139 a RF-142, RF-144, RF-145).
// Solo fixtures sinteticos. Las utilidades se simulan como las de ui.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { htmlFichaBloque, claseFrescura } from "../src/ui/fichaBloque.js";
import { interpolar } from "../src/i18n/interpolar.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const es = JSON.parse(readFileSync(join(RAIZ, "src", "i18n", "es.json"), "utf8"));
const bloques = JSON.parse(readFileSync(join(RAIZ, "test", "fixtures", "bloques", "bloques-sinteticos.geojson"), "utf8")).features;

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const util = {
  esc,
  t: (k, p) => interpolar(es[k] ?? k, p),
  enlaceSeguro: (u) => (typeof u === "string" && /^https?:\/\//i.test(u) ? u : null),
  numero: (n, o) => new Intl.NumberFormat("es", o).format(n),
};
const ficha = (b, ctx = {}) => htmlFichaBloque(b, { campos: [], frescura: { fecha: "2026-10-31", dias: 12 }, ...ctx }, util);
const clon = (f, mut) => { const c = structuredClone(f); mut(c.properties); return c; };
const base = bloques.find((f) => f.properties.operadores_2026.length >= 2 && f.properties.operadores_antes_2026.length >= 1);

test("RF-139: nombre, id y todos los renglones en el orden operador 2026 -> operador antes de 2026", () => {
  const h = ficha(base);
  assert.ok(h.includes(esc(base.properties.nombre)) && h.includes(base.properties.id));
  const orden = ["operador2026", "operadorAntes", "tipoAlianza", "estatusFuente", "estatusNorm", "licencia", "convenio", "zona", "entidad", "municipios", "area", "registros", "campos"];
  const pos = orden.map((k) => h.indexOf(es[`bloques.ficha.${k}`]));
  assert.ok(pos.every((n) => n >= 0), `rotulos ausentes: ${JSON.stringify(pos)}`);
  assert.deepEqual([...pos].sort((a, b) => a - b), pos, "orden de renglones");
  assert.ok(h.indexOf(base.properties.operadores_2026[0]) < h.indexOf(base.properties.operadores_antes_2026[0]));
});

test("RF-139: estatus normalizado traducido, licencia, acuerdo, area y registros en texto", () => {
  const f = clon(base, (p) => { Object.assign(p, { estatus_norm: "paralizado", tiene_licencia_ofac: true, licencia_ofac: "Licencia ficticia L9", convenio_eeuu_vzla: true, area_km2: 1234.56, registros_vinculados: 7 }); });
  const h = ficha(f);
  assert.ok(h.includes(es["bloques.estatus.paralizado"]));
  assert.ok(h.includes("Licencia ficticia L9"));
  assert.ok(h.includes("1234,6 km²") || h.includes("1.234,6 km²"));
  assert.match(h, /<dd[^>]*>7<\/dd>/);
  assert.ok(h.includes(es["bloques.ficha.convenioSi"]));
});

test("RF-140: dato vacio o nulo muestra el renglon con 'Sin dato en la fuente' (o 'Sin registro' en operador)", () => {
  const vacio = clon(base, (p) => {
    Object.assign(p, { operadores_2026: [], operadores_antes_2026: [], tipo_alianza: null, estatus_fuente: null, zona: null, entidad_federal: null, municipios: [], area_km2: null, licencia_ofac: null });
  });
  const h = ficha(vacio);
  assert.equal(h.split(es["bloques.ficha.sinDato"]).length - 1, 6, "tipo, estatus fuente, zona, entidad, municipios y area");
  assert.equal(h.split(es["bloques.ficha.sinRegistro"]).length - 1, 2, "ambos operadores");
  assert.ok(h.includes(es["bloques.ficha.sinLicencia"]));
  for (const k of ["operador2026", "operadorAntes", "tipoAlianza", "zona", "entidad", "municipios", "area"]) {
    assert.ok(h.includes(es[`bloques.ficha.${k}`]), `el renglon ${k} no se oculta`);
  }
});

test("RF-141: varios operadores se muestran como lista, uno por renglon", () => {
  const h = ficha(base);
  const n = base.properties.operadores_2026.length;
  const bloque2026 = h.slice(h.indexOf(es["bloques.ficha.operador2026"]), h.indexOf(es["bloques.ficha.operadorAntes"]));
  assert.equal((bloque2026.match(/<li>/g) ?? []).length, n);
  for (const o of base.properties.operadores_2026) assert.ok(bloque2026.includes(`<li>${esc(o)}</li>`));
});

test("RF-142: lista los campos dentro del bloque con su nombre, o el texto de ninguno", () => {
  const con = ficha(base, { campos: [{ id: "C1", nombre: "Campo Ficticio Uno" }, { id: "C2", nombre: null }] });
  assert.ok(con.includes("<li>Campo Ficticio Uno</li>") && con.includes("<li>C2</li>"));
  assert.ok(!con.includes(es["bloques.ficha.ningunCampo"]));
  const sin = ficha(base, { campos: [] });
  assert.ok(sin.includes(es["bloques.ficha.ningunCampo"]));
});

test("RF-144: atribucion con fuente y poligonos del dato, y enlace seguro a la fuente", () => {
  const h = ficha(base);
  assert.ok(h.includes(esc(base.properties.fuente)));
  assert.ok(h.includes(esc(base.properties.fuente_poligonos)));
  assert.match(h, new RegExp(`<a [^>]*href="${base.properties.fuente_url.replace(/[.]/g, "\\.")}"[^>]*rel="noopener noreferrer"`));
  assert.ok(h.includes(es["bloques.ficha.verFuente"]));
});

test("RF-145: chip 'Corte de datos: fecha' con color por antiguedad (umbrales del chip del mapa)", () => {
  const h = ficha(base, { frescura: { fecha: "2026-10-31", dias: 12 } });
  assert.ok(h.includes("Corte de datos: 2026-10-31"));
  assert.ok(h.includes("bg-activo"));
  assert.equal(claseFrescura(91), "bg-crudo");
  assert.equal(claseFrescura(181), "bg-alerta");
  assert.equal(claseFrescura(null), "bg-lo");
  assert.ok(ficha(base, { frescura: { fecha: "2026-01-01", dias: 300 } }).includes("bg-alerta"));
});

test("escapado: nombre, operadores, municipios, campos y atribucion con HTML no producen etiquetas", () => {
  const ataque = '<img src=x onerror=alert(1)>"\'&';
  const f = clon(base, (p) => {
    Object.assign(p, { nombre: ataque, operadores_2026: [ataque], operadores_antes_2026: [ataque], municipios: [ataque], tipo_alianza: ataque, estatus_fuente: ataque, licencia_ofac: ataque, fuente: ataque, fuente_poligonos: ataque });
  });
  const h = ficha(f, { campos: [{ id: "C1", nombre: ataque }] });
  assert.ok(!/<img/i.test(h), "etiqueta inyectada");
  assert.ok(!/onerror=alert\(1\)>/.test(h.replace(/&lt;img src=x onerror=alert\(1\)&gt;/g, "")));
  assert.ok(h.includes("&lt;img"));
});

test("escapado: una URL javascript: no llega al href y no hay enlace", () => {
  const h = ficha(clon(base, (p) => { p.fuente_url = "javascript:alert(1)"; }));
  assert.ok(!/href=/.test(h));
  assert.ok(!h.includes(es["bloques.ficha.verFuente"]));
});

test("escapado: comillas en la URL no rompen el atributo", () => {
  const h = ficha(clon(base, (p) => { p.fuente_url = 'https://example.org/a"onmouseover="x'; }));
  assert.ok(!/href="[^"]*"onmouseover/.test(h));
});

test("funcion pura: no usa DOM, red ni innerHTML", () => {
  const src = readFileSync(join(RAIZ, "src", "ui", "fichaBloque.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/\b(document|window|fetch|innerHTML)\b/.test(src));
});
