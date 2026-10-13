/**
 * Geometria de la regla del rio (src/ui/reglaRio.js, ADR-021): pura, sin DOM.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { geometriaRegla } from "../src/ui/reglaRio.js";

const regla = JSON.parse(await readFile(new URL("../public/data/regla-rio.json", import.meta.url), "utf8"));

test("geometriaRegla: una marca por cruce, todas dentro de la caja de vista", () => {
  const g = geometriaRegla(regla);
  assert.equal(g.marcas.length, regla.cruces.length);
  const [x0, y0, ancho, alto] = g.viewBox.split(" ").map(Number);
  for (const m of g.marcas) {
    assert.ok(m.x >= x0 && m.x <= x0 + ancho, `marca de ${m.km} km fuera en x`);
    assert.ok(m.y >= y0 && m.y <= y0 + alto, `marca de ${m.km} km fuera en y`);
  }
  assert.ok(g.ejeY > regla.caja.maxY && g.ejeY < y0 + alto, "el eje queda bajo el rio y dentro de la vista");
});
