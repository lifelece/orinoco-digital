/**
 * Regla del rio (ADR-021): trazo del Orinoco con marcas en los anillos de
 * Ciudad Bolivar. Los cruces se miden contra ANILLOS_KM y el centro de
 * config.js (haversine), no contra valores copiados del script.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

import { haversineKm } from "../src/data.js";
import { CENTRO_CIUDAD_BOLIVAR, ANILLOS_KM } from "../src/config.js";
import { reglaDesdeHidrografia } from "../scripts/regla-rio.mjs";

const RUTA = new URL("../public/data/regla-rio.json", import.meta.url);
const regla = JSON.parse(await readFile(RUTA, "utf8"));
const hidrografia = JSON.parse(
  await readFile(new URL("../public/data/hidrografia.geojson", import.meta.url), "utf8")
);

const KM = 111.195;
const cosLat0 = Math.cos((CENTRO_CIUDAD_BOLIVAR.lat * Math.PI) / 180);

test("regla-rio: 7 cruces, cuatro rio arriba y tres rio abajo", () => {
  assert.equal(regla.cruces.length, 7);
  const arriba = regla.cruces.filter((c) => c.xy[0] < 0).map((c) => c.km).sort((a, b) => b - a);
  const abajo = regla.cruces.filter((c) => c.xy[0] > 0).map((c) => c.km).sort((a, b) => a - b);
  assert.deepEqual(arriba, [200, 150, 100, 50]);
  assert.deepEqual(abajo, [50, 100, 150]);
  for (const c of regla.cruces) assert.ok(ANILLOS_KM.includes(c.km), `${c.km} km no es un anillo`);
});

test("regla-rio: cada cruce cae a +-1 km de su anillo (distancia medida en el mapa real)", () => {
  for (const { km, xy } of regla.cruces) {
    // Se deshace la proyeccion local (y hacia abajo) y se mide con haversine.
    const punto = [
      CENTRO_CIUDAD_BOLIVAR.lng + xy[0] / (KM * cosLat0),
      CENTRO_CIUDAD_BOLIVAR.lat - xy[1] / KM,
    ];
    const real = haversineKm(CENTRO_CIUDAD_BOLIVAR, punto);
    assert.ok(Math.abs(real - km) <= 1, `cruce de ${km} km: distancia real ${real.toFixed(2)} km`);
  }
});

test("regla-rio: pesa 4 KB o menos y lleva fuente y fecha", async () => {
  const { size } = await stat(RUTA);
  assert.ok(size <= 4096, `regla-rio.json pesa ${size} B`);
  assert.match(regla.fuente, /Natural Earth/);
  assert.match(regla.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(regla.path, /^M[\d.\- ]+( L[\d.\- ]+)+$/);
});

test("regla-rio: el archivo versionado es la salida del script (no se edita a mano)", () => {
  assert.deepEqual(reglaDesdeHidrografia(hidrografia), regla);
});

test("regla-rio: el trazo cabe en su caja y cubre 200 km rio arriba y 150 rio abajo", () => {
  const pares = regla.path.replace(/[ML]/g, "").trim().split(/\s+/).map(Number);
  const xs = pares.filter((_, i) => i % 2 === 0);
  const ys = pares.filter((_, i) => i % 2 === 1);
  assert.ok(Math.min(...xs) >= regla.caja.minX - 0.1 && Math.max(...xs) <= regla.caja.maxX + 0.1);
  assert.ok(Math.min(...ys) >= regla.caja.minY - 0.1 && Math.max(...ys) <= regla.caja.maxY + 0.1);
  assert.ok(regla.caja.minX < -200 && regla.caja.maxX > 140);
});
