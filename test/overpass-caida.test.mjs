/**
 * Clasificacion de fallos de Overpass: una caida externa (red, timeout, 5xx,
 * 429 en TODOS los mirrors) no debe poner el workflow en rojo; cualquier otro
 * error si. Sin red: fetch se simula.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consultarOverpass,
  esCaidaExterna,
  OVERPASS_MIRRORS,
} from "../scripts/descargar-fuentes.mjs";

async function conFetch(simulado, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = simulado;
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const http = (status, cuerpo = "{}") => async () =>
  new Response(cuerpo, { status });
const capturar = (fn) => fn().then(() => null, (e) => e);

test("todos los mirrors con HTTP 504: caida externa", async () => {
  const error = await conFetch(http(504), () => capturar(() => consultarOverpass("x")));
  assert.equal(error.code, "OVERPASS_NO_DISPONIBLE");
  assert.equal(esCaidaExterna(error), true);
  assert.match(error.message, /HTTP 504/);
});

test("mezcla de red caida, timeout, 429 y 5xx: caida externa", async () => {
  const respuestas = [
    () => { throw new TypeError("fetch failed"); },
    () => { throw new DOMException("timeout", "TimeoutError"); },
    () => new Response("", { status: 429 }),
    () => new Response("", { status: 502 }),
  ];
  let i = 0;
  const error = await conFetch(async () => respuestas[i++ % 4](), () =>
    capturar(() => consultarOverpass("x")));
  assert.equal(i, OVERPASS_MIRRORS.length);
  assert.equal(esCaidaExterna(error), true);
});

test("un 4xx distinto de 429 NO es caida externa", async () => {
  const error = await conFetch(http(406), () => capturar(() => consultarOverpass("x")));
  assert.ok(error instanceof Error);
  assert.equal(esCaidaExterna(error), false);
});

test("un solo mirror con 400 entre 5xx NO es caida externa", async () => {
  let i = 0;
  const error = await conFetch(
    async () => new Response("", { status: i++ === 1 ? 400 : 503 }),
    () => capturar(() => consultarOverpass("x")),
  );
  assert.equal(esCaidaExterna(error), false);
});

test("JSON invalido con HTTP 200 NO es caida externa", async () => {
  const error = await conFetch(http(200, "<html>no es json"), () =>
    capturar(() => consultarOverpass("x")));
  assert.ok(error instanceof Error);
  assert.equal(esCaidaExterna(error), false);
});

test("un mirror que responde bien se devuelve sin error", async () => {
  let i = 0;
  const r = await conFetch(
    async () => (i++ === 0 ? new Response("", { status: 504 }) : Response.json({ elements: [1] })),
    () => consultarOverpass("x", true),
  );
  assert.deepEqual(r.json.elements, [1]);
});

test("esCaidaExterna: errores ajenos y valores raros dan false", () => {
  assert.equal(esCaidaExterna(new Error("boom")), false);
  assert.equal(esCaidaExterna(new TypeError("x is undefined")), false);
  assert.equal(esCaidaExterna(null), false);
  assert.equal(esCaidaExterna(undefined), false);
  assert.equal(esCaidaExterna(Object.assign(new Error("a"), { code: "OVERPASS_NO_DISPONIBLE" })), true);
});
