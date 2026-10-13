/**
 * Tests de src/iconos.js: simbolos de la capa Ciudad Bolivar (E1, tarea A1).
 * RF-11, RF-14, RNF-3.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { icono, iconoAproximado, iconoCiudad } from "../src/iconos.js";
import { CLASES_CIUDAD, COLOR_CIUDAD } from "../src/config.js";

const TRAZO_CIUDAD = "#0b0f14";

/** Decodifica un data URI SVG a texto. */
function svgDe(uri) {
  const prefijo = "data:image/svg+xml;charset=UTF-8,";
  assert.ok(uri.startsWith(prefijo), "es un data URI SVG");
  return decodeURIComponent(uri.slice(prefijo.length));
}

/** Luminancia relativa WCAG de un color #rrggbb. */
function luminancia(hex) {
  const canales = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * canales[0] + 0.7152 * canales[1] + 0.0722 * canales[2];
}

/** Razon de contraste WCAG entre dos colores #rrggbb. */
function contraste(a, b) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

test("cada clase de la ciudad y la iniciativa dan un icono distinto // RF-11, RF-14", () => {
  const claves = [...CLASES_CIUDAD, "iniciativa"];
  const uris = claves.map((c) => iconoCiudad(c, COLOR_CIUDAD));
  assert.equal(new Set(uris).size, claves.length);
  for (const uri of uris) assert.ok(svgDe(uri).includes("<svg"));
});

test("el icono de la ciudad usa trazo oscuro sobre el disco claro, sin blanco", () => {
  const svg = svgDe(iconoCiudad("aeropuerto", COLOR_CIUDAD));
  assert.ok(svg.includes(`stroke="${TRAZO_CIUDAD}"`));
  assert.ok(svg.includes(`fill="${COLOR_CIUDAD}"`));
  assert.ok(!/#ffffff/i.test(svg));
});

test("contraste del trazo contra COLOR_CIUDAD >= 4,5:1 // RNF-3", () => {
  assert.ok(contraste(COLOR_CIUDAD, TRAZO_CIUDAD) >= 4.5);
});

test("una clave desconocida no revienta y cae a un simbolo generico", () => {
  const uri = iconoCiudad("no-existe", COLOR_CIUDAD);
  assert.ok(svgDe(uri).includes("<svg"));
});

test("iconoCiudad cachea por clave y color", () => {
  assert.equal(iconoCiudad("hotel", COLOR_CIUDAD), iconoCiudad("hotel", COLOR_CIUDAD));
});

test("icono() e iconoAproximado() conservan el trazo blanco", () => {
  for (const uri of [icono("campo", "#4cc9f0"), iconoAproximado("campo", "#4cc9f0")]) {
    const svg = svgDe(uri);
    assert.ok(svg.includes('stroke="#ffffff"'));
    assert.ok(!svg.includes(TRAZO_CIUDAD));
  }
});

test("ningun hex de marca ExpoFaja/CCIEB en iconos, config ni map // RNF-3", async () => {
  // 02-IDENTIDAD-VISUAL §1-2, sin el gris (#BBBBBB, neutro).
  const marca = [
    "#014655", "#04D5D6", "#066E86", "#58A51E", "#FFA201",
    "#131A8D", "#28166F", "#EE7C19", "#FAAB00", "#FAD00A",
  ];
  for (const archivo of ["iconos.js", "config.js", "map.js"]) {
    const texto = (await readFile(new URL(`../src/${archivo}`, import.meta.url), "utf8")).toUpperCase();
    for (const hex of marca) {
      assert.ok(!texto.includes(hex), `${archivo} contiene ${hex}`);
    }
  }
});
