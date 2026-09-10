/**
 * generar-features-demo.mjs — Dataset de entrenamiento del modulo DEMO.
 *
 * ================== LEE ESTO ANTES DE USAR NADA DE AQUI ==================
 *
 * Genera datos SINTETICOS. No describen la realidad de ningun bloque concreto
 * de la Faja y no deben presentarse como si lo hicieran.
 *
 * Lo unico real son las DISTRIBUCIONES marginales de cada variable, tomadas de
 * la tabla 1 del USGS Fact Sheet 2009-3028. Lo sintetico es como se reparten
 * en el espacio y, sobre todo, la etiqueta objetivo.
 *
 * LIMITACION FUNDAMENTAL, Y NO SE PUEDE MAQUILLAR:
 * la etiqueta la calcula este script con una formula que nos hemos inventado.
 * Un modelo entrenado sobre esto no aprende geologia: aprende a recuperar
 * nuestra propia formula. Sirve para ensenar el flujo de trabajo —rejilla,
 * features, entrenamiento, mapa de calor— y para nada mas.
 *
 * Ver MODEL_CARD.md.
 * =========================================================================
 *
 * Salida: data/raw/features-demo.csv    (para entrenar en Colab)
 *
 * Uso: node scripts/generar-features-demo.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(RAIZ, "data", "raw", "features-demo.csv");

/** Caja de la Faja. Misma que src/config.js -> FAJA_BBOX. */
const BBOX = { oeste: -67.34, este: -62.08, sur: 7.88, norte: 9.37 };

/** Lado de celda en grados. 0,08 = ~9 km. */
const CELDA = 0.08;

/**
 * Distribuciones de la tabla 1 del USGS FS 2009-3028, como
 * [minimo, mediana, maximo]. Son valores REALES publicados.
 *
 * La profundidad y la gravedad API vienen del cuerpo del texto del mismo
 * documento: "reservoirs range in depth from 150 to 1,400 meters" y
 * "gravities from 4 to 16 degrees API".
 */
const USGS = {
  porosidad_pct: [20, 25, 38],
  saturacion_agua_pct: [10, 20, 25],
  espesor_arena_neta_ft: [1, 150, 350],
  profundidad_m: [150, 700, 1400],
  gravedad_api: [4, 10, 16],
};

/** Generador congruente lineal: reproducible, sin dependencias. */
function crearAleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Muestreo de una distribucion triangular (min, moda, max).
 * Es la forma estandar de representar "minimo, valor mas probable, maximo",
 * que es exactamente como el USGS publica la tabla 1.
 */
function triangular(aleatorio, [min, moda, max]) {
  const u = aleatorio();
  const c = (moda - min) / (max - min);
  return u < c
    ? min + Math.sqrt(u * (max - min) * (moda - min))
    : max - Math.sqrt((1 - u) * (max - min) * (max - moda));
}

/**
 * Campo de ruido suave: da continuidad espacial en vez de puntos sueltos.
 * Es puro artificio visual — la geologia real no se genera con senos.
 */
function ondulacion(x, y, semilla) {
  return (
    0.5 +
    0.25 * Math.sin(x * 1.7 + semilla) +
    0.15 * Math.cos(y * 2.3 - semilla * 0.7) +
    0.1 * Math.sin((x + y) * 3.1 + semilla * 1.3)
  );
}

/** Mezcla un valor muestreado con la tendencia espacial. */
function conTendencia(valor, [min, , max], factor) {
  const normal = (valor - min) / (max - min);
  const mezcla = 0.55 * normal + 0.45 * factor;
  return min + Math.max(0, Math.min(1, mezcla)) * (max - min);
}

const aleatorio = crearAleatorio(20260909);
const filas = [];

for (let lat = BBOX.sur; lat <= BBOX.norte; lat += CELDA) {
  for (let lng = BBOX.oeste; lng <= BBOX.este; lng += CELDA) {
    const t1 = ondulacion(lng, lat, 1.1);
    const t2 = ondulacion(lng, lat, 4.7);

    const porosidad = conTendencia(
      triangular(aleatorio, USGS.porosidad_pct),
      USGS.porosidad_pct,
      t1
    );
    const saturacionAgua = conTendencia(
      triangular(aleatorio, USGS.saturacion_agua_pct),
      USGS.saturacion_agua_pct,
      1 - t1
    );
    const espesor = conTendencia(
      triangular(aleatorio, USGS.espesor_arena_neta_ft),
      USGS.espesor_arena_neta_ft,
      t2
    );
    const profundidad = conTendencia(
      triangular(aleatorio, USGS.profundidad_m),
      USGS.profundidad_m,
      (lat - BBOX.sur) / (BBOX.norte - BBOX.sur) // se profundiza hacia el norte
    );
    const api = triangular(aleatorio, USGS.gravedad_api);

    // --- La etiqueta. Formula INVENTADA. Ver la cabecera del archivo. ---
    // Combina lo que la intuicion diria que ayuda: mas porosidad, mas espesor,
    // menos agua, menos profundidad. Es plausible, no es geologia.
    const n = (v, [min, , max]) => (v - min) / (max - min);
    const puntuacion =
      0.35 * n(porosidad, USGS.porosidad_pct) +
      0.3 * n(espesor, USGS.espesor_arena_neta_ft) +
      0.2 * (1 - n(saturacionAgua, USGS.saturacion_agua_pct)) +
      0.15 * (1 - n(profundidad, USGS.profundidad_m));

    // Ruido: sin el, la etiqueta seria una funcion determinista de las features
    // y cualquier modelo la acertaria al 100%, lo que seria aun mas enganoso.
    const conRuido = puntuacion + (aleatorio() - 0.5) * 0.22;
    const etiqueta = conRuido > 0.5 ? 1 : 0;

    filas.push(
      [
        lng.toFixed(4),
        lat.toFixed(4),
        porosidad.toFixed(2),
        saturacionAgua.toFixed(2),
        espesor.toFixed(1),
        profundidad.toFixed(0),
        api.toFixed(1),
        etiqueta,
      ].join(",")
    );
  }
}

const cabecera = [
  "lng",
  "lat",
  "porosidad_pct",
  "saturacion_agua_pct",
  "espesor_arena_neta_ft",
  "profundidad_m",
  "gravedad_api",
  "etiqueta_sintetica",
].join(",");

await mkdir(dirname(SALIDA), { recursive: true });
await writeFile(SALIDA, `${cabecera}\n${filas.join("\n")}\n`);

const positivos = filas.filter((f) => f.endsWith(",1")).length;

console.log("Dataset SINTETICO del modulo DEMO");
console.log(`  celdas: ${filas.length} (rejilla de ${CELDA} grados, ~9 km)`);
console.log(
  `  etiqueta positiva: ${positivos} (${((positivos / filas.length) * 100).toFixed(1)}%)`
);
console.log(`  generado: ${SALIDA}`);
console.log(
  "\nDistribuciones tomadas de la tabla 1 del USGS FS 2009-3028 (reales).\n" +
    "Reparto espacial y ETIQUETA: inventados por este script.\n" +
    "Un modelo entrenado aqui recupera nuestra formula, no aprende geologia.\n" +
    "Siguiente paso: notebooks/modelo-demo.ipynb en Google Colab."
);
