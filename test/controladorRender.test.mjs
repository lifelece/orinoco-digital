/**
 * Tests de src/controladorRender.js: el controlador de render con holds
 * contados por referencia (ADR-019). Logica pura sobre un "viewer" de
 * mentira — el modulo no importa "cesium", asi que no hace falta ningun
 * doble mas elaborado que un objeto con `.scene.requestRenderMode` y
 * `.scene.requestRender()`. Mismo patron que ADR-016 ya aplica a data.js.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  instalarControladorRender,
  pedirRenderContinuo,
  liberarRenderContinuo,
  pedirRenderPuntual,
  sostenerHastaListo,
  estadoControladorRender,
  desinstalarControladorRender,
  _resetControladorRenderParaTest,
} from "../src/controladorRender.js";

/** Viewer de mentira: cuenta cuantas veces se pidio un frame. */
function viewerFalso() {
  const escena = { requestRenderMode: true, framesPedidos: 0 };
  escena.requestRender = () => {
    escena.framesPedidos += 1;
  };
  return { scene: escena };
}

test.beforeEach(() => {
  _resetControladorRenderParaTest();
});

test("instalarControladorRender exige un viewer con .scene", () => {
  assert.throws(() => instalarControladorRender(null), TypeError);
  assert.throws(() => instalarControladorRender({}), TypeError);
});

test("sin holds, el modo es reposo (requestRenderMode = true)", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  assert.equal(viewer.scene.requestRenderMode, true);
  assert.deepEqual(estadoControladorRender(), { modo: "reposo", holds: [] });
});

test("un hold activo pasa a modo continuo (requestRenderMode = false)", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("vuelo-entrada");
  assert.equal(viewer.scene.requestRenderMode, false);
  assert.deepEqual(estadoControladorRender(), {
    modo: "continuo",
    holds: ["vuelo-entrada"],
  });
});

test("liberar el unico hold vuelve a reposo", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("vuelo-entrada");
  liberarRenderContinuo("vuelo-entrada");
  assert.equal(viewer.scene.requestRenderMode, true);
  assert.deepEqual(estadoControladorRender(), { modo: "reposo", holds: [] });
});

test("dos holds solapados: el modo sigue continuo hasta liberar los DOS", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("vuelo-entrada");
  pedirRenderContinuo("volar-faja");
  liberarRenderContinuo("vuelo-entrada");
  // Sigue habiendo un hold activo: no debe volver a reposo todavia. Esto es
  // justo lo que un flag booleano fijo no puede garantizar (la animacion que
  // termina antes no puede "congelar" a la que sigue en marcha).
  assert.equal(viewer.scene.requestRenderMode, false);
  assert.deepEqual(estadoControladorRender().holds, ["volar-faja"]);

  liberarRenderContinuo("volar-faja");
  assert.equal(viewer.scene.requestRenderMode, true);
});

test("pedir el mismo hold dos veces es idempotente", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("volar-activo");
  pedirRenderContinuo("volar-activo");
  assert.deepEqual(estadoControladorRender().holds, ["volar-activo"]);
  liberarRenderContinuo("volar-activo");
  assert.equal(viewer.scene.requestRenderMode, true);
});

test("liberar un hold que nunca se pidio no rompe nada", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  assert.doesNotThrow(() => liberarRenderContinuo("nunca-pedido"));
  assert.equal(viewer.scene.requestRenderMode, true);
});

test("pedirRenderContinuo/liberarRenderContinuo sin id (undefined) no hacen nada", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo();
  liberarRenderContinuo();
  assert.deepEqual(estadoControladorRender(), { modo: "reposo", holds: [] });
});

test("volver a reposo pide un ultimo frame de asentamiento", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("x");
  const antes = viewer.scene.framesPedidos;
  liberarRenderContinuo("x");
  assert.ok(viewer.scene.framesPedidos > antes);
});

test("pedirRenderPuntual pide un frame cuando hay viewer instalado", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  const antes = viewer.scene.framesPedidos;
  pedirRenderPuntual("cambio-de-idioma");
  assert.equal(viewer.scene.framesPedidos, antes + 1);
});

test("pedirRenderPuntual sin viewer instalado no revienta", () => {
  assert.doesNotThrow(() => pedirRenderPuntual("motivo"));
});

test("aplicarModo es idempotente: pedir el mismo modo otra vez no pide un frame extra", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("a");
  pedirRenderContinuo("b"); // ya estaba en continuo: no debe volver a "entrar"
  liberarRenderContinuo("a");
  const antes = viewer.scene.framesPedidos;
  liberarRenderContinuo("b"); // esta SI sale de continuo: pide un frame
  assert.equal(viewer.scene.framesPedidos, antes + 1);
});

test("holds pedidos antes de instalar el viewer se aplican al instalar", () => {
  pedirRenderContinuo("temprano");
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  assert.equal(viewer.scene.requestRenderMode, false);
  assert.deepEqual(estadoControladorRender().holds, ["temprano"]);
});

test("desinstalarControladorRender limpia los holds", () => {
  const viewer = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("x");
  desinstalarControladorRender(viewer);
  assert.deepEqual(estadoControladorRender(), { modo: "reposo", holds: [] });
});

test("desinstalarControladorRender con un viewer distinto al instalado no hace nada", () => {
  const viewer = viewerFalso();
  const otro = viewerFalso();
  instalarControladorRender(viewer);
  pedirRenderContinuo("x");
  desinstalarControladorRender(otro);
  assert.deepEqual(estadoControladorRender().holds, ["x"]);
});

// --- sostenerHastaListo (E1, A3) ---------------------------------------------

/** Viewer de mentira con `scene.postRender`, como el Event de Cesium. */
function viewerConPostRender() {
  const viewer = viewerFalso();
  const oyentes = new Set();
  viewer.scene.postRender = {
    addEventListener(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    removeEventListener(fn) {
      return oyentes.delete(fn);
    },
  };
  viewer.oyentes = oyentes;
  viewer.frame = () => [...oyentes].forEach((fn) => fn());
  return viewer;
}

test("sostenerHastaListo mantiene el modo continuo hasta que listo() es true", () => {
  const viewer = viewerConPostRender();
  instalarControladorRender(viewer);
  let listo = false;
  sostenerHastaListo("anillos", () => listo);
  assert.equal(viewer.scene.requestRenderMode, false);

  viewer.frame();
  viewer.frame();
  assert.equal(viewer.scene.requestRenderMode, false, "sigue sosteniendo mientras no este listo");
  assert.deepEqual(estadoControladorRender().holds, ["anillos"]);

  listo = true;
  viewer.frame();
  assert.equal(viewer.scene.requestRenderMode, true);
  assert.deepEqual(estadoControladorRender().holds, []);
  assert.equal(viewer.oyentes.size, 0, "quita su listener al terminar");
});

test("sostenerHastaListo: la funcion devuelta cancela, libera el hold y quita el listener", () => {
  const viewer = viewerConPostRender();
  instalarControladorRender(viewer);
  const cancelar = sostenerHastaListo("lineas-proximidad", () => false);
  cancelar();
  assert.equal(viewer.scene.requestRenderMode, true);
  assert.equal(viewer.oyentes.size, 0);
  assert.doesNotThrow(() => cancelar());
});

test("sostenerHastaListo con el mismo id reemplaza al anterior", () => {
  const viewer = viewerConPostRender();
  instalarControladorRender(viewer);
  let primeraLlamada = 0;
  sostenerHastaListo("anillos", () => {
    primeraLlamada += 1;
    return true;
  });
  let listo = false;
  sostenerHastaListo("anillos", () => listo);
  assert.equal(viewer.oyentes.size, 1, "solo queda un listener");

  viewer.frame();
  assert.equal(primeraLlamada, 0, "la primera ya no se consulta");
  assert.equal(viewer.scene.requestRenderMode, false);
  listo = true;
  viewer.frame();
  assert.equal(viewer.scene.requestRenderMode, true);
});

test("sostenerHastaListo no toca los holds de otros ids", () => {
  const viewer = viewerConPostRender();
  instalarControladorRender(viewer);
  pedirRenderContinuo("vuelo-entrada");
  let listo = false;
  const cancelar = sostenerHastaListo("anillos", () => listo);

  listo = true;
  viewer.frame();
  assert.deepEqual(estadoControladorRender().holds, ["vuelo-entrada"]);
  assert.equal(viewer.scene.requestRenderMode, false);

  cancelar(); // ya terminado: no debe soltar el hold ajeno ni uno nuevo del mismo id
  assert.deepEqual(estadoControladorRender().holds, ["vuelo-entrada"]);
});

test("cancelar un hold reemplazado no suelta el del reemplazo", () => {
  const viewer = viewerConPostRender();
  instalarControladorRender(viewer);
  const vieja = sostenerHastaListo("anillos", () => false);
  sostenerHastaListo("anillos", () => false);
  vieja();
  assert.deepEqual(estadoControladorRender().holds, ["anillos"]);
});

test("sostenerHastaListo sin viewer con postRender no retiene nada", () => {
  const cancelar = sostenerHastaListo("anillos", () => false);
  assert.deepEqual(estadoControladorRender(), { modo: "reposo", holds: [] });
  assert.doesNotThrow(() => cancelar());
});
