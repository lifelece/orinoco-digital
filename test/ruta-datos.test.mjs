/**
 * Cargador de recorridos (spec 003, T08). RF-96, 105, 122.
 * `fetch` simulado: ningun test toca la red.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { cargarRecorridos } from "../src/ruta/datos.js";
import { RUTAS_DATOS } from "../src/config.js";

const bi = (es) => ({ es, en: es + " (en)" });
const textos = (s) => ({ divulgacion: bi(s + " div"), tecnico: bi(s + " tec") });

function valido() {
  return {
    version: 1,
    recorridos: [
      {
        id: "R5",
        titulo: bi("Titulo"),
        pregunta: bi("Pregunta"),
        escenas: [
          {
            id: "R5-E1", orden: 1, camara: { vista: "faja" }, referencia: null,
            capas: [], texto: textos("uno"), datos: [], interaccion: null,
          },
        ],
      },
    ],
  };
}

const respuestaOk = (cuerpo) => async (url) => {
  respuestaOk.url = url;
  return { ok: true, status: 200, json: async () => cuerpo };
};

test("ok: devuelve el objeto y pide RUTAS_DATOS.recorridos", async () => {
  const json = valido();
  const datos = await cargarRecorridos(respuestaOk(json));
  assert.deepEqual(datos, json);
  assert.equal(respuestaOk.url, RUTAS_DATOS.recorridos);
});

test("usa globalThis.fetch si no se inyecta ninguno", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = respuestaOk(valido());
  try {
    const datos = await cargarRecorridos();
    assert.equal(datos.recorridos[0].id, "R5");
  } finally {
    globalThis.fetch = original;
  }
});

test("404: lanza con la ruta y el codigo HTTP", async () => {
  const fetch404 = async () => ({ ok: false, status: 404, json: async () => ({}) });
  await assert.rejects(cargarRecorridos(fetch404), (e) => {
    assert.match(e.message, /recorridos\.json/);
    assert.match(e.message, /404/);
    return true;
  });
});

test("fallo de red: lanza con la ruta", async () => {
  const caido = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(cargarRecorridos(caido), (e) => {
    assert.match(e.message, /recorridos\.json/);
    assert.match(e.message, /Failed to fetch/);
    return true;
  });
});

test("JSON roto: lanza indicando que no es JSON valido", async () => {
  const roto = async () => ({
    ok: true, status: 200,
    json: async () => { throw new SyntaxError("Unexpected token <"); },
  });
  await assert.rejects(cargarRecorridos(roto), (e) => {
    assert.match(e.message, /recorridos\.json/);
    assert.match(e.message, /JSON/);
    return true;
  });
});

test("estructura invalida: lanza con la ruta y la regla del primer error", async () => {
  const mal = valido();
  delete mal.recorridos[0].escenas[0].texto.tecnico.en;
  await assert.rejects(cargarRecorridos(respuestaOk(mal)), (e) => {
    assert.match(e.message, /recorridos\.json/);
    assert.match(e.message, /texto\.tecnico\.en/);
    assert.match(e.message, /campos/);
    return true;
  });
});

test("sin lista de recorridos: lanza", async () => {
  await assert.rejects(cargarRecorridos(respuestaOk({ foo: 1 })), /recorridos/);
});

test("la validacion de runtime no exige ids de datos geograficos (solo estructura)", async () => {
  const json = valido();
  json.recorridos[0].escenas[0].camara = { objetivo_ref: "ID-QUE-SOLO-CONOCE-EL-MAPA" };
  const datos = await cargarRecorridos(respuestaOk(json));
  assert.equal(datos.recorridos.length, 1);
});
