/**
 * scripts/validate-geojson.mjs es la ultima barrera antes de publicar un dato.
 * Se comprueba que deja pasar los datos reales y que TUMBA los malos: un
 * validador que nunca falla no protege nada.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("../scripts/validate-geojson.mjs", import.meta.url));

function validar(directorio) {
  const args = directorio ? [SCRIPT, directorio] : [SCRIPT];
  return spawnSync(process.execPath, args, { encoding: "utf8" });
}

/** Valida un directorio temporal con un solo archivo de contenido dado. */
async function conArchivo(nombre, contenido, prueba) {
  const dir = await mkdtemp(join(tmpdir(), "orinoco-validador-"));
  try {
    await writeFile(join(dir, nombre), contenido);
    await prueba(validar(dir));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const conCapa = (nombre, features, prueba) =>
  conArchivo(nombre, JSON.stringify({ type: "FeatureCollection", features }), prueba);

const activo = (props, coordenadas = [-64, 8.5]) => ({
  type: "Feature",
  properties: {
    id: "prueba-1",
    fuente: "Fuente de prueba",
    confianza: "media",
    ultima_verificacion: "2026-09-08",
    ...props,
  },
  geometry: { type: "Point", coordinates: coordenadas },
});

test("los datos publicados en public/data pasan", () => {
  const r = validar();
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /0 errores/);
});

test("un registro correcto pasa", async () => {
  await conCapa("campos.geojson", [activo({})], (r) => {
    assert.equal(r.status, 0, r.stdout);
  });
});

test("un registro SIN FUENTE tumba la validacion", async () => {
  await conCapa("campos.geojson", [activo({ fuente: undefined })], (r) => {
    assert.equal(r.status, 1);
    assert.match(r.stdout, /SIN FUENTE/);
  });
});

test("coordenadas fuera de Venezuela tumban la validacion (CRS mal)", async () => {
  // PSAD56 sin transformar, o lat/lng cruzadas: el punto cae lejos.
  await conCapa("campos.geojson", [activo({}, [8.5, -64])], (r) => {
    assert.equal(r.status, 1);
    assert.match(r.stdout, /fuera de Venezuela/);
  });
});

test("las capas de contexto pueden salir del pais, pero no del mapa", async () => {
  // Rotular GUYANA exige cruzar la frontera: no es error.
  await conCapa("toponimia.geojson", [activo({}, [-58.5, 6.8])], (r) => {
    assert.equal(r.status, 0, r.stdout);
  });
  await conCapa("toponimia.geojson", [activo({}, [2.35, 48.85])], (r) => {
    assert.equal(r.status, 1);
  });
});

test("fecha, confianza y estado fuera de formato tumban la validacion", async () => {
  await conCapa(
    "campos.geojson",
    [
      activo({ id: "a", ultima_verificacion: "08/09/2026" }),
      activo({ id: "b", confianza: "altisima" }),
      activo({ id: "c", estado: "boyante" }),
    ],
    (r) => {
      assert.equal(r.status, 1);
      assert.match(r.stdout, /no es ISO 8601/);
      assert.match(r.stdout, /confianza invalida/);
      assert.match(r.stdout, /estado invalido/);
    }
  );
});

test("un JSON roto tumba la validacion", async () => {
  await conArchivo("campos.geojson", "{ esto no es json", (r) => {
    assert.equal(r.status, 1);
    assert.match(r.stdout, /JSON invalido/);
  });
});
