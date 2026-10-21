/**
 * regla-rio.mjs — Genera la "regla del rio" (ADR-021).
 *
 * Toma el cauce del Orinoco (`rio-75`) de public/data/hidrografia.geojson
 * (Natural Earth 1:10m, dominio publico), recorta el tramo que queda a
 * <= 220 km de Ciudad Bolivar, lo simplifica (Douglas-Peucker, 0,6 km) y
 * marca donde cruza los anillos de ANILLOS_KM. Escribe
 * public/data/regla-rio.json (<= 4 KB): coordenadas en km locales
 * (equirectangular alrededor del centro, y hacia abajo como en SVG).
 *
 * La proyeccion sirve para la firma grafica, no para medir.
 *
 * Uso:  npm run data:regla
 * Corre con `node --import ./test/entorno.mjs` porque importa src/config.js.
 * Sin dependencias.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { CENTRO_CIUDAD_BOLIVAR, ANILLOS_KM } from "../src/config.js";
import { haversineKm } from "../src/data.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = join(RAIZ, "public", "data", "hidrografia.geojson");
const SALIDA = join(RAIZ, "public", "data", "regla-rio.json");

const ID_RIO = "rio-75";
const TRAMO_MAX_KM = 220;
const TOLERANCIA_KM = 0.6;
const KM_POR_GRADO = 111.195;

const COS_LAT0 = Math.cos((CENTRO_CIUDAD_BOLIVAR.lat * Math.PI) / 180);
const redondear = (n) => Math.round(n * 10) / 10;

/** [lng, lat] -> [x, y] en km locales; el norte es y negativo (SVG). */
function proyectar([lng, lat]) {
  return [
    (lng - CENTRO_CIUDAD_BOLIVAR.lng) * COS_LAT0 * KM_POR_GRADO,
    -(lat - CENTRO_CIUDAD_BOLIVAR.lat) * KM_POR_GRADO,
  ];
}

const distCentro = (posicion) => haversineKm(CENTRO_CIUDAD_BOLIVAR, posicion);

/**
 * Tramo continuo de la linea con todos sus vertices a <= TRAMO_MAX_KM del
 * centro, el que contiene el vertice mas cercano.
 * @param {Array<[number, number]>} linea
 * @returns {Array<[number, number]>}
 */
function recortarTramo(linea) {
  const d = linea.map(distCentro);
  let cerca = 0;
  for (let i = 1; i < d.length; i++) if (d[i] < d[cerca]) cerca = i;
  let a = cerca;
  let b = cerca;
  while (a > 0 && d[a - 1] <= TRAMO_MAX_KM) a--;
  while (b < d.length - 1 && d[b + 1] <= TRAMO_MAX_KM) b++;
  return linea.slice(a, b + 1);
}

/** Distancia de un punto al segmento ab (plano, km). */
function distanciaASegmento(p, a, b) {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const largo2 = dx * dx + dy * dy;
  const u = largo2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / largo2)) : 0;
  return Math.hypot(p[0] - (a[0] + u * dx), p[1] - (a[1] + u * dy));
}

/**
 * Douglas-Peucker iterativo (sin recursion: el cauce tiene cientos de vertices).
 * @param {Array<[number, number]>} puntos
 * @param {number} tolerancia km
 * @returns {Array<[number, number]>}
 */
export function simplificar(puntos, tolerancia) {
  const mantener = new Uint8Array(puntos.length);
  mantener[0] = mantener[puntos.length - 1] = 1;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [i, j] = pila.pop();
    let max = 0;
    let en = -1;
    for (let k = i + 1; k < j; k++) {
      const dist = distanciaASegmento(puntos[k], puntos[i], puntos[j]);
      if (dist > max) [max, en] = [dist, k];
    }
    if (en >= 0 && max > tolerancia) {
      mantener[en] = 1;
      pila.push([i, en], [en, j]);
    }
  }
  return puntos.filter((_, k) => mantener[k]);
}

/**
 * Primer cruce de cada anillo al alejarse del vertice mas cercano, en una
 * direccion (paso = -1 rio arriba, +1 rio abajo). Biseccion sobre el segmento:
 * la distancia no es lineal, y asi el cruce cae en el anillo.
 * @param {Array<[number, number]>} linea  [lng, lat]
 * @param {number} desde  indice del vertice mas cercano
 * @param {number} paso
 * @returns {Array<{km: number, xy: number[]}>}
 */
function cruces(linea, desde, paso) {
  const salida = [];
  for (const km of ANILLOS_KM) {
    for (let i = desde; i + paso >= 0 && i + paso < linea.length; i += paso) {
      const [d0, d1] = [distCentro(linea[i]), distCentro(linea[i + paso])];
      if (!(d0 < km && d1 >= km)) continue;
      const en = (u) => [
        linea[i][0] + (linea[i + paso][0] - linea[i][0]) * u,
        linea[i][1] + (linea[i + paso][1] - linea[i][1]) * u,
      ];
      let [lo, hi] = [0, 1];
      for (let n = 0; n < 40; n++) {
        const medio = (lo + hi) / 2;
        if (distCentro(en(medio)) < km) lo = medio;
        else hi = medio;
      }
      salida.push({ km, xy: proyectar(en(hi)).map(redondear) });
      break;
    }
  }
  return salida;
}

/**
 * Calcula la regla a partir de la hidrografia de Natural Earth.
 * @param {{features: Array<Object>}} hidrografia  FeatureCollection de hidrografia.geojson
 * @returns {{fuente: string, fecha: string, centro: Object, anillos_km: number[],
 *   caja: Object, path: string, cruces: Array<{km: number, xy: number[]}>}}
 */
export function reglaDesdeHidrografia(hidrografia) {
  const rio = hidrografia.features.find((f) => f.properties?.id === ID_RIO);
  if (!rio) throw new Error(`No hay ${ID_RIO} en hidrografia.geojson`);
  // MultiLineString: el cauce principal es la linea que pasa mas cerca de la ciudad.
  const minimo = (l) => Math.min(...l.map(distCentro));
  const principal = rio.geometry.coordinates.reduce((a, b) => (minimo(b) < minimo(a) ? b : a));

  const tramo = recortarTramo(principal);
  if (tramo[0][0] > tramo.at(-1)[0]) tramo.reverse(); // oeste -> este: rio arriba -> rio abajo
  const cerca = tramo.reduce((m, p, i) => (distCentro(p) < distCentro(tramo[m]) ? i : m), 0);

  const trazo = simplificar(tramo.map(proyectar), TOLERANCIA_KM).map((p) => p.map(redondear));
  const xs = trazo.map((p) => p[0]);
  const ys = trazo.map((p) => p[1]);
  return {
    fuente: "Natural Earth 1:10m, rio-75 (Orinoco), public/data/hidrografia.geojson (dominio publico)",
    fecha: rio.properties.ultima_verificacion,
    centro: { ...CENTRO_CIUDAD_BOLIVAR },
    anillos_km: [...ANILLOS_KM],
    caja: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
    path: trazo.map((p, i) => `${i ? "L" : "M"}${p[0]} ${p[1]}`).join(" "),
    cruces: [...cruces(tramo, cerca, -1), ...cruces(tramo, cerca, 1)],
  };
}

async function generar() {
  const hidrografia = JSON.parse(await readFile(ENTRADA, "utf8"));
  const regla = reglaDesdeHidrografia(hidrografia);
  const texto = JSON.stringify(regla);
  if (texto.length > 4096) throw new Error(`regla-rio.json pesa ${texto.length} B (> 4 KB)`);
  await writeFile(SALIDA, `${texto}\n`);
  console.log(`regla-rio.json: ${texto.length} B, ${regla.cruces.length} cruces -> ${SALIDA}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await generar();
