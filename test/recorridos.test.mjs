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
