/**
 * Modos del mapa: parte pura (URL, resolucion, busqueda) y definicion en config.
 * Spec 001, RF-1, 2, 3, 11, 17, 18.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { leerEnlace, resolverModo, urlDeModo, buscarActivo } from "../src/modos.js";
import { DEFINICION_MODOS, MODOS, MODO_INICIAL, ORDEN_VUELO } from "../src/config.js";

test("resolverModo: ?modo=ciudadBolivar entra al modo // RF-1", () => {
  assert.equal(resolverModo("ciudadBolivar", MODOS, MODO_INICIAL), "ciudadBolivar");
});

test("resolverModo: sin parametro usa MODO_INICIAL // RF-2", () => {
  assert.equal(resolverModo(null, MODOS, MODO_INICIAL), MODO_INICIAL);
  assert.equal(resolverModo(undefined, MODOS, MODO_INICIAL), MODO_INICIAL);
});

test("resolverModo: ?modo=nacional gana sobre el inicial // RF-3", () => {
  assert.equal(resolverModo("nacional", MODOS, "ciudadBolivar"), "nacional");
});

test("resolverModo: un modo desconocido se trata como ausente", () => {
  assert.equal(resolverModo("xyz", MODOS, MODO_INICIAL), MODO_INICIAL);
  // "toString" existe en Object.prototype: no puede colarse como modo.
  assert.equal(resolverModo("toString", MODOS, MODO_INICIAL), MODO_INICIAL);
});

test("leerEnlace: lee modo, capa y vuelo; los vacios son null", () => {
  assert.deepEqual(leerEnlace("?modo=nacional&capa=centrales&vuelo=OSM-R7948635"), {
    modo: "nacional",
    capa: "centrales",
    vuelo: "OSM-R7948635",
  });
  assert.deepEqual(leerEnlace(""), { modo: null, capa: null, vuelo: null });
  assert.deepEqual(leerEnlace("?modo=&capa=&vuelo="), { modo: null, capa: null, vuelo: null });
  assert.deepEqual(leerEnlace("?otro=1"), { modo: null, capa: null, vuelo: null });
});

test("urlDeModo: cambiar de modo descarta vuelo y capa", () => {
  assert.equal(urlDeModo("/", "nacional"), "/?modo=nacional");
  assert.equal(urlDeModo("/", "ciudadBolivar"), "/?modo=ciudadBolivar");
});

const colecciones = {
  ciudadBolivar: {
    features: [
      { id: "OSM-R7948635", properties: { id: "OSM-R7948635" } },
      { id: "OSM-N1", properties: { id: "OSM-N1" } },
    ],
  },
  iniciativasCcieb: false,
  campos: { features: [{ properties: { id: "GEM-1" } }, { properties: { id: "OSM-N1" } }] },
  downstream: null,
};

test("buscarActivo: encuentra el id en la primera capa del orden // RF-17", () => {
  const r = buscarActivo("OSM-R7948635", colecciones, ORDEN_VUELO);
  assert.equal(r.capa, "ciudadBolivar");
  assert.equal(r.feature.properties.id, "OSM-R7948635");
  // Id repetido en dos capas: gana la primera del orden.
  assert.equal(buscarActivo("OSM-N1", colecciones, ORDEN_VUELO).capa, "ciudadBolivar");
  assert.equal(buscarActivo("OSM-N1", colecciones, ["campos", "ciudadBolivar"]).capa, "campos");
});

test("buscarActivo: ignora colecciones null o false y capas ausentes", () => {
  assert.equal(buscarActivo("GEM-1", colecciones, ORDEN_VUELO).capa, "campos");
  assert.equal(buscarActivo("X", { a: null, b: false }, ["a", "b", "c"]), null);
});

test("buscarActivo: un id inexistente o vacio da null // RF-18", () => {
  assert.equal(buscarActivo("NOEXISTE", colecciones, ORDEN_VUELO), null);
  assert.equal(buscarActivo("", colecciones, ORDEN_VUELO), null);
  assert.equal(buscarActivo(null, colecciones, ORDEN_VUELO), null);
});

test("config: MODOS y MODO_INICIAL", () => {
  assert.deepEqual(MODOS, ["nacional", "ciudadBolivar", "ruta"]);
  assert.ok(MODOS.includes(MODO_INICIAL));
});

test("config: el modo Ciudad Bolivar enciende upstream, ciudadBolivar e iniciativas // RF-11", () => {
  assert.deepEqual(DEFINICION_MODOS.ciudadBolivar.capasEncendidas, [
    "upstream",
    "ciudadBolivar",
    "iniciativas",
  ]);
});

test("config: cada modo tiene camara conocida, id coherente y vueltaAtras valida", () => {
  for (const [clave, def] of Object.entries(DEFINICION_MODOS)) {
    assert.equal(def.id, clave);
    assert.ok(["faja", "ciudadBolivar", "ruta"].includes(def.camara), `camara de ${clave}`);
    assert.ok(def.vueltaAtras === null || MODOS.includes(def.vueltaAtras), `vueltaAtras de ${clave}`);
  }
});

test("modoInicialEn: la portada vuelve a la vista nacional desde el 18/10 (hora del evento)", async () => {
  const { modoInicialEn } = await import("../src/modos.js");
  const { PORTADA_POR_FECHA } = await import("../src/config.js");
  const en = (iso) => modoInicialEn(new Date(iso), MODO_INICIAL, PORTADA_POR_FECHA);
  assert.equal(en("2026-10-15T17:00:00-04:00"), "ciudadBolivar"); // inauguracion
  assert.equal(en("2026-10-17T23:59:59-04:00"), "ciudadBolivar"); // ultimo minuto del evento
  assert.equal(en("2026-10-18T00:00:00-04:00"), "nacional");
  assert.equal(en("2026-10-18T03:59:59Z"), "ciudadBolivar"); // aun 17/10 en Caracas
  assert.ok(MODOS.includes(PORTADA_POR_FECHA.modo));
});

test("modoInicialEn: sin cambio o con fecha invalida usa el inicial", async () => {
  const { modoInicialEn } = await import("../src/modos.js");
  assert.equal(modoInicialEn(new Date("2030-01-01T00:00:00Z"), "ciudadBolivar", null), "ciudadBolivar");
  assert.equal(modoInicialEn(new Date("2030-01-01T00:00:00Z"), "ciudadBolivar", { modo: "nacional", desde: "no-es-fecha" }), "ciudadBolivar");
});

// --- Spec 003 (T03): modo "ruta" y modoPedido ---------------------------------

import { modoPedido } from "../src/modos.js";
import { RUTAS_PUBLICADAS, RUTAS_DATOS, RECORRIDO } from "../src/config.js";

const opciones = { modos: MODOS, publicadas: RUTAS_PUBLICADAS };

test("modoPedido: ?modo=ruta&recorrido=R5 abre la ruta // RF-79", () => {
  assert.equal(modoPedido("?modo=ruta&recorrido=R5", opciones), "ruta");
  assert.equal(modoPedido("?modo=ruta&recorrido=R5&escena=3&nivel=tecnico", opciones), "ruta");
});

test("modoPedido: ruta sin recorrido, no publicado o vacio -> null // RF-80", () => {
  assert.equal(modoPedido("?modo=ruta", opciones), null);
  assert.equal(modoPedido("?modo=ruta&recorrido=R9", opciones), null);
  assert.equal(modoPedido("?modo=ruta&recorrido=", opciones), null);
});

test("modoPedido: los demas modos no cambian // RF-80", () => {
  assert.equal(modoPedido("?modo=ciudadBolivar", opciones), "ciudadBolivar");
  assert.equal(modoPedido("?modo=nacional", opciones), "nacional");
  assert.equal(modoPedido("", opciones), null);
  assert.equal(modoPedido("?modo=xyz", opciones), "xyz");
});

test("modoPedido: null -> modo inicial por fecha con resolverModo // RF-80", () => {
  const pedido = modoPedido("?modo=ruta&recorrido=R9", opciones);
  assert.equal(resolverModo(pedido, MODOS, MODO_INICIAL), MODO_INICIAL);
});

test("config: RUTAS_PUBLICADAS, RECORRIDO y modo ruta // RF-79, 87, 107, 117", () => {
  assert.ok(RUTAS_PUBLICADAS.includes("R5"));
  assert.equal(RUTAS_DATOS.recorridos, "/data/ruta/recorridos.json");
  assert.ok(RECORRIDO.duracionVueloS <= 2.5);
  assert.equal(DEFINICION_MODOS.ruta.vueltaAtras, "nacional");
  assert.equal(DEFINICION_MODOS.ruta.id, "ruta");
  assert.ok(MODOS.includes("ruta"));
  for (const n of ["Merey 16", "Petropiar", "José", "Junín"]) assert.ok(RECORRIDO.nombresPropios.includes(n));
  for (const n of ["Alberta", "Texas", "Mar del Norte"]) assert.ok(RECORRIDO.ejemplosForaneos.includes(n));
  assert.deepEqual(RECORRIDO.niveles, ["divulgacion", "tecnico"]);
});
