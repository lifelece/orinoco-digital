/**
 * Tests de ui/animar.js: la parte de las animaciones del paquete visual
 * (ADR-018) que SI es logica pura y se puede probar sin DOM, igual que
 * data.js. Ver docs/DECISIONS.md -> ADR-016.
 *
 * Lo que no se prueba aqui, y por que: `activarContadores` toca el DOM
 * (querySelectorAll, requestAnimationFrame, performance.now) y
 * `prefiereMovimientoReducido` depende de `window.matchMedia`; ninguno de los
 * dos existe en Node sin levantar un DOM, la misma frontera que ADR-016 ya
 * documenta para ui.js y map.js.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  easeSalida,
  valorCountUp,
  entradaFila,
  claseDibujarLinea,
  prefiereMovimientoReducido,
} from "../src/ui/animar.js";

test("easeSalida: arranca en 0, termina en 1, y frena en vez de ir a velocidad constante", () => {
  assert.equal(easeSalida(0), 0);
  assert.equal(easeSalida(1), 1);
  // easeOutCubic avanza mas en la primera mitad del tiempo que en la segunda:
  // es justo lo que lo distingue de una interpolacion lineal.
  const avanceInicial = easeSalida(0.5) - easeSalida(0);
  const avanceFinal = easeSalida(1) - easeSalida(0.5);
  assert.ok(
    avanceInicial > avanceFinal,
    "la curva de salida deberia avanzar mas al principio que al final"
  );
});

test("easeSalida: no se sale de [0, 1] con progreso fuera de rango", () => {
  assert.equal(easeSalida(-0.5), 0);
  assert.equal(easeSalida(1.5), 1);
});

test("valorCountUp: 0 al empezar, el valor final al terminar", () => {
  assert.equal(valorCountUp(105, 0), 0);
  assert.equal(valorCountUp(105, 1), 105);
  assert.equal(valorCountUp(371, 1), 371);
});

test("valorCountUp: monotono creciente a mitad de camino, nunca pasa del final", () => {
  const aMitad = valorCountUp(105, 0.5);
  assert.ok(aMitad > 0 && aMitad < 105);
});

test("valorCountUp: sin valor final valido, cuenta 0 en vez de inventar algo", () => {
  assert.equal(valorCountUp(0, 0.5), 0);
  assert.equal(valorCountUp(-5, 0.5), 0);
  assert.equal(valorCountUp(NaN, 0.5), 0);
});

test("entradaFila: sin animar, ni clase ni retraso", () => {
  assert.deepEqual(entradaFila(false, 3), { clase: "", estilo: "" });
});

test("entradaFila: animando, la primera fila no espera y las siguientes se escalonan", () => {
  const primera = entradaFila(true, 0);
  assert.equal(primera.clase, "animate-fila-entra");
  assert.equal(primera.estilo, "animation-delay:0ms");

  const tercera = entradaFila(true, 3);
  assert.equal(tercera.estilo, "animation-delay:90ms"); // 3 * 30ms por defecto
});

test("entradaFila: el paso de retraso es configurable", () => {
  assert.equal(entradaFila(true, 2, 50).estilo, "animation-delay:100ms");
});

test("claseDibujarLinea: solo hay clase si se pide animar", () => {
  assert.equal(claseDibujarLinea(true), "animate-linea-dibujar");
  assert.equal(claseDibujarLinea(false), "");
});

test("prefiereMovimientoReducido: sin window (como en este test de Node), no revienta y no fuerza animacion", () => {
  assert.equal(prefiereMovimientoReducido(), false);
});
