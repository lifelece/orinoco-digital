import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alternarCapa,
  hayCapaDemo,
  volarAActivo,
  conectarMapa,
  reiniciarPuente,
  pendientes,
} from "../src/puenteMapa.js";

test("antes de conectar, las ordenes se encolan y las preguntas dan valor neutro", () => {
  reiniciarPuente();
  alternarCapa("upstream", false);
  assert.equal(volarAActivo("campos", ["X"]), true);
  assert.equal(hayCapaDemo(), false);
  assert.equal(pendientes(), 2);
});

test("al conectar se reproducen en orden y despues se delega directo", () => {
  reiniciarPuente();
  const llamadas = [];
  alternarCapa("upstream", false);
  alternarCapa("midstream", true);
  conectarMapa({
    alternarCapa: (...a) => llamadas.push(["alternarCapa", ...a]),
    hayCapaDemo: () => true,
    volarAActivo: () => "volo",
  });
  assert.deepEqual(llamadas, [
    ["alternarCapa", "upstream", false],
    ["alternarCapa", "midstream", true],
  ]);
  assert.equal(pendientes(), 0);
  assert.equal(hayCapaDemo(), true);
  assert.equal(volarAActivo("campos", ["X"]), "volo");
  reiniciarPuente();
});
