/**
 * Validador de recorridos (spec 003, T05): parte de fixtures.
 * La parte del archivo real (public/data/ruta/recorridos.json) la anade T06.
 * RF-112 a RF-121 + reglas generales de plan 3.3.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { validarRecorridos } from "../src/ruta/validar.js";
import { RECORRIDO, RUTAS_PUBLICADAS, SECTORES } from "../src/config.js";

const CTX = {
  idsActivos: new Set(["ID-A", "ID-B", "ID-C"]),
  sectores: SECTORES,
  nombresPropios: RECORRIDO.nombresPropios,
  ejemplosForaneos: RECORRIDO.ejemplosForaneos,
  publicadas: RUTAS_PUBLICADAS,
};

const bi = (es, en = es + " (en)") => ({ es, en });
const textos = (s) => ({ divulgacion: bi(s + " div"), tecnico: bi(s + " tec") });

const dato = (extra = {}) => ({
  id: "D1",
  tipo_dato: "cifra",
  etiqueta: bi("Etiqueta"),
  valor: "8,5",
  unidad: "°API",
  aproximado: true,
  fecha_dato: "2021-09-13",
  fuente: "https://example.org/dato",
  fuente_nombre: bi("Fuente de prueba"),
  confianza: "media",
  ultima_verificacion: "2026-10-24",
  ...extra,
});

function validoBase() {
  return {
    version: 1,
    ultima_verificacion: "2026-10-24",
    recorridos: [
      {
        id: "R5",
        estado: "publicado",
        titulo: bi("Titulo"),
        pregunta: bi("Pregunta"),
        escenas: [
          {
            id: "R5-E1", recorrido: "R5", orden: 1,
            camara: { objetivo_ref: "ID-A" }, referencia: "ubicacion",
            capas: ["upstream"], texto: textos("uno"), datos: [], interaccion: null,
          },
          {
            id: "R5-E2", recorrido: "R5", orden: 2,
            camara: { entre: ["ID-A", "ID-B"] }, referencia: "esquematico",
            capas: ["upstream", "midstream"], texto: textos("dos"),
            datos: [
              dato(),
              dato({ id: "D2", tipo_dato: "cualitativo", valor: "Mezcla con diluente", unidad: null, aproximado: false }),
            ],
            interaccion: null,
          },
          {
            id: "R5-E3", recorrido: "R5", orden: 3,
            camara: { vista: "faja" }, referencia: null,
            capas: [], texto: textos("tres"), datos: [], interaccion: null,
          },
        ],
      },
    ],
  };
}

const esc = (j, i = 1) => j.recorridos[0].escenas[i];

/** Cada caso: [nombre, regla esperada, mutacion del fixture valido] */
const INVALIDOS = [
  ["falta el texto en", "campos", (j) => { delete esc(j).texto.tecnico.en; }],
  ["texto [pendiente]", "campos", (j) => { esc(j).texto.divulgacion.es = "[pendiente]"; }],
  ["falta fuente_nombre.en", "campos", (j) => { delete esc(j).datos[0].fuente_nombre.en; }],
  ["falta fecha_dato", "campos", (j) => { delete esc(j).datos[0].fecha_dato; }],
  ["fuente [fuente_pendiente]", "fuente-https", (j) => { esc(j).datos[0].fuente = "[fuente_pendiente]"; }],
  ["fuente http://", "fuente-https", (j) => { esc(j).datos[0].fuente = "http://example.org/x"; }],
  ["legal sin fecha_norma", "fecha-norma", (j) => { esc(j).datos[0].tipo_dato = "legal"; }],
  ["instalacion sin nota", "nota-instalacion", (j) => { esc(j).datos[0].tipo_dato = "instalacion"; }],
  ["instalacion con nota sin en", "nota-instalacion", (j) => { Object.assign(esc(j).datos[0], { tipo_dato: "instalacion", nota: { es: "x" } }); }],
  ["°API sin aproximado", "api-aproximado", (j) => { esc(j).datos[0].aproximado = false; }],
  ["objetivo_ref inexistente", "camara", (j) => { esc(j, 0).camara = { objetivo_ref: "NO-EXISTE" }; }],
  ["entre con id inexistente", "camara", (j) => { esc(j).camara = { entre: ["ID-A", "NO-EXISTE"] }; }],
  ["capa que no es de sector", "capas", (j) => { esc(j).capas = ["upstream", "hitos"]; }],
  ["referencia invalida", "referencia", (j) => { esc(j).referencia = "exacto"; }],
  ["orden no consecutivo", "orden", (j) => { esc(j, 2).orden = 5; }],
  ["id de escena repetido", "id-repetido", (j) => { esc(j, 2).id = "R5-E1"; }],
  ["Alberta", "ejemplo-foraneo", (j) => { esc(j).texto.divulgacion.es = "Como en Alberta"; }],
  ["Texas", "ejemplo-foraneo", (j) => { esc(j).texto.tecnico.en = "Like Texas"; }],
  ["Mar del Norte en fuente_nombre", "ejemplo-foraneo", (j) => { esc(j).datos[0].fuente_nombre.es = "Crudo del Mar del Norte"; }],
  ["nombre propio en ES ausente en EN", "nombre-propio", (j) => {
    esc(j).texto.divulgacion = { es: "Petropiar mejora el crudo", en: "The upgrader improves the crude" };
  }],
  ["interaccion no nula", "interaccion", (j) => { esc(j).interaccion = { tipo: "quiz" }; }],
  ["recorrido fuera de publicadas", "publicada", (j) => { j.recorridos[0].id = "R9"; }],
];

test("validarRecorridos: el fixture valido pasa (con datos: [] y dato cualitativo con unidad null)", () => {
  const r = validarRecorridos(validoBase(), CTX);
  assert.deepEqual(r.errores, []);
  assert.equal(r.ok, true);
  assert.deepEqual(esc(validoBase(), 0).datos, []);
  assert.equal(esc(validoBase()).datos[1].unidad, null);
});

for (const [nombre, regla, mutar] of INVALIDOS) {
  test(`validarRecorridos: ${nombre} -> regla "${regla}"`, () => {
    const j = validoBase();
    mutar(j);
    const r = validarRecorridos(j, CTX);
    assert.equal(r.ok, false);
    const e = r.errores.find((x) => x.regla === regla);
    assert.ok(e, `esperaba regla ${regla}; salio ${JSON.stringify(r.errores)}`);
    assert.equal(typeof e.ruta, "string");
    assert.ok(e.ruta.length > 0);
    assert.equal(typeof e.detalle, "string");
    assert.ok(e.detalle.length > 0);
  });
}

test("validarRecorridos: nombre propio presente en ES y EN pasa // RF-119", () => {
  const j = validoBase();
  esc(j).texto.divulgacion = { es: "Petropiar mejora el crudo", en: "Petropiar upgrades the crude" };
  assert.equal(validarRecorridos(j, CTX).ok, true);
});

test("validarRecorridos: estructura rota no lanza, devuelve error legible", () => {
  for (const malo of [null, {}, { recorridos: "x" }]) {
    const r = validarRecorridos(malo, CTX);
    assert.equal(r.ok, false);
    assert.ok(r.errores.length > 0);
  }
});

test("validarRecorridos: no muta la entrada", () => {
  const j = validoBase();
  const copia = JSON.stringify(j);
  validarRecorridos(j, CTX);
  assert.equal(JSON.stringify(j), copia);
});

// --- Archivo real (T06): public/data/ruta/recorridos.json ---------------------

import { readFile, readdir, stat } from "node:fs/promises";
import { RUTAS_DATOS } from "../src/config.js";

const RAIZ = new URL("../", import.meta.url);
const ARCHIVO_REAL = new URL(`public${RUTAS_DATOS.recorridos}`, RAIZ);

async function idsDeDatos() {
  const dir = new URL("public/data/", RAIZ);
  const ids = new Set();
  for (const nombre of await readdir(dir)) {
    if (!nombre.endsWith(".geojson")) continue;
    const fc = JSON.parse(await readFile(new URL(nombre, dir), "utf8"));
    for (const f of fc.features || []) {
      const id = (f.properties && f.properties.id) ?? f.id;
      if (id != null) ids.add(String(id));
    }
  }
  return ids;
}

async function cargarReal() {
  const crudo = await readFile(ARCHIVO_REAL, "utf8");
  return { crudo, json: JSON.parse(crudo) };
}

async function textosSrc(dir = new URL("src/", RAIZ), acc = []) {
  for (const nombre of await readdir(dir)) {
    const url = new URL(nombre, dir);
    if ((await stat(url)).isDirectory()) await textosSrc(new URL(`${nombre}/`, dir), acc);
    else if (/\.(js|json|css|html)$/.test(nombre)) acc.push(await readFile(url, "utf8"));
  }
  return acc;
}

/** Todas las cadenas de texto de escena (divulgacion y tecnico, ES y EN). */
function frasesDeEscenas(json) {
  const frases = [];
  for (const r of json.recorridos) {
    for (const e of r.escenas) {
      for (const nivel of ["divulgacion", "tecnico"]) {
        frases.push(e.texto[nivel].es, e.texto[nivel].en);
      }
    }
  }
  return frases;
}

test("archivo real: pasa validarRecorridos con los ids de public/data/*.geojson // RF-112 a RF-121", async () => {
  const { json } = await cargarReal();
  const ctx = { ...CTX, idsActivos: await idsDeDatos() };
  const r = validarRecorridos(json, ctx);
  assert.deepEqual(r.errores, []);
  assert.equal(r.ok, true);
});

test("archivo real: R5 con 5 escenas, 2 niveles y 2 idiomas, interaccion null // RF-96, RF-100", async () => {
  const { json } = await cargarReal();
  assert.equal(json.recorridos.length, 1);
  const r5 = json.recorridos[0];
  assert.equal(r5.id, "R5");
  assert.equal(r5.estado, "publicado");
  assert.equal(r5.escenas.length, 5);
  for (const e of r5.escenas) {
    for (const nivel of RECORRIDO.niveles) {
      for (const idioma of ["es", "en"]) assert.ok(e.texto[nivel][idioma].trim().length > 10, `${e.id} ${nivel} ${idioma}`);
    }
    assert.equal(e.interaccion, null, e.id);
  }
});

test("archivo real: camara y referencia segun plan 2.2; escena 2 con entre; escena 1 sin datos // RF-101, RF-107", async () => {
  const { json } = await cargarReal();
  const [e1, e2, e3, e4, e5] = json.recorridos[0].escenas;
  assert.deepEqual(e1.camara, { objetivo_ref: "GEM-L100000320738" });
  assert.equal(e1.referencia, "ubicacion");
  assert.deepEqual(e1.datos, []);
  assert.deepEqual(e2.camara, { entre: ["GEM-L100000320738", "OSM-W265071557"] });
  assert.equal(e2.referencia, "esquematico");
  assert.deepEqual(e3.camara, { objetivo_ref: "OSM-W265071557" });
  assert.equal(e3.referencia, "ubicacion");
  assert.deepEqual(e4.camara, { objetivo_ref: "OSM-W265071557" });
  assert.equal(e4.referencia, "ubicacion");
  assert.deepEqual(e5.camara, { vista: "faja" });
  assert.equal(e5.referencia, null);
});

test("archivo real: datos D1a-D9 presentes, sin D1b, D3b ni D10; todas las fuentes https // RF-111, RF-113", async () => {
  const { json } = await cargarReal();
  const datos = json.recorridos[0].escenas.flatMap((e) => e.datos);
  const ids = datos.map((d) => d.id).sort();
  assert.deepEqual(ids, ["D1a", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9"]);
  for (const d of datos) assert.ok(d.fuente.startsWith("https://"), d.id);
  const d4 = datos.find((d) => d.id === "D4");
  assert.equal(d4.tipo_dato, "instalacion");
  assert.ok(d4.fecha_dato.startsWith("2021"));
  assert.ok(d4.nota.es && d4.nota.en);
  for (const id of ["D7", "D8"]) assert.equal(datos.find((d) => d.id === id).fecha_norma, "2026-01-29");
});

test("archivo real: sin cifras retiradas por T02 (D1a dia 11/01, azufre 3,4 %, 32 grados) // RF-113", async () => {
  const { crudo } = await cargarReal();
  assert.ok(!/32\s*°|≈\s*32/.test(crudo), "≈32°");
  assert.ok(!/3,4|3\.4/.test(crudo), "azufre 3,4 %");
  assert.ok(!/11\/01\/2026|11 de enero/.test(crudo), "dia 11/01");
  assert.ok(!/se reconvirtieron|were converted/i.test(crudo), "reconversion como hecho");
  assert.ok(!/transferencia de custodia|custody transfer/i.test(crudo), "D10");
});

test("archivo real: la vigencia de 60 dias nombra impuesto y regalia (art. 51) // RF-114", async () => {
  const { json } = await cargarReal();
  const e4 = json.recorridos[0].escenas[3];
  assert.match(e4.texto.tecnico.es, /60 días/);
  assert.match(e4.texto.tecnico.es, /regalía/);
  assert.match(e4.texto.tecnico.es, /impuesto/);
  assert.match(e4.texto.tecnico.en, /60 days/);
  assert.match(e4.texto.tecnico.en, /royalty/i);
});

test("archivo real: pesa 30 KB o menos // RF-96", async () => {
  const { size } = await stat(ARCHIVO_REAL);
  assert.ok(size <= 30 * 1024, `${size} bytes`);
});

test("archivo real: ninguna frase de escena esta en src/ (los textos viven en el JSON) // RF-96", async () => {
  const { json } = await cargarReal();
  const fuentes = (await textosSrc()).join("\n");
  const repetidas = frasesDeEscenas(json).filter((f) => fuentes.includes(f.slice(0, 40)));
  assert.deepEqual(repetidas, []);
});
