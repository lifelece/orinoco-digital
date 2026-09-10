/**
 * limites-to-geojson.mjs — Limites administrativos de Venezuela, simplificados.
 *
 * Entrada:  data/raw/geoboundaries-ven-adm0.geojson  (frontera nacional)
 *           data/raw/geoboundaries-ven-adm1.geojson  (24 estados + dependencias)
 * Salida:   public/data/limites-venezuela.geojson
 *
 * El ADM1 original pesa 7,25 MB, muy por encima del presupuesto de 2 MB por
 * archivo. Se simplifica con Douglas-Peucker, sin dependencias.
 *
 * AVISO SOBRE LA FRONTERA ORIENTAL
 * Estos datos trazan el limite con Guyana en la linea administrada de facto:
 * NO incluyen la Guayana Esequiba, que Venezuela reclama. Cualquier dataset de
 * fronteras toma partido en esa disputa. Aqui se usa la delimitacion de
 * facto por ser la de la fuente, y queda documentado de forma explicita en
 * docs/DATA_SOURCES.md para que sea una decision consciente y no un descuido.
 *
 * Uso: node scripts/limites-to-geojson.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CRUDO = join(RAIZ, "data", "raw");
const SALIDA = join(RAIZ, "public", "data", "limites-venezuela.geojson");

/** Tolerancia en grados. ~0,002 = ~220 m. Suficiente a escala de pais. */
const TOLERANCIA_ESTADOS = 0.004;
const TOLERANCIA_PAIS = 0.004;

/** Anillos con menos vertices que esto se descartan: son islotes irrelevantes. */
const MIN_VERTICES = 8;

const FUENTE_ADM0 = "geoBoundaries gbOpen VEN ADM0 (Natural Earth), CC BY 4.0";
const FUENTE_ADM1 =
  "geoBoundaries gbOpen VEN ADM1 (OCHA Venezuela / Instituto Nacional de Estadistica), CC BY 4.0";
const FECHA = "2026-09-09";

/**
 * Distancia perpendicular de un punto al segmento a-b, en grados.
 * @returns {number}
 */
function distanciaPerpendicular(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const tc = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + tc * dx), py - (ay + tc * dy));
}

/**
 * Douglas-Peucker iterativo (sin recursion, para no desbordar la pila con
 * anillos de decenas de miles de vertices).
 * @param {Array<Array<number>>} puntos
 * @param {number} tolerancia
 * @returns {Array<Array<number>>}
 */
function simplificar(puntos, tolerancia) {
  if (puntos.length <= 2) return puntos;

  const conservar = new Uint8Array(puntos.length);
  conservar[0] = 1;
  conservar[puntos.length - 1] = 1;

  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [ini, fin] = pila.pop();
    let maxDist = 0;
    let indice = -1;
    for (let i = ini + 1; i < fin; i += 1) {
      const d = distanciaPerpendicular(puntos[i], puntos[ini], puntos[fin]);
      if (d > maxDist) {
        maxDist = d;
        indice = i;
      }
    }
    if (maxDist > tolerancia && indice !== -1) {
      conservar[indice] = 1;
      pila.push([ini, indice], [indice, fin]);
    }
  }

  return puntos.filter((_, i) => conservar[i]);
}

/**
 * Simplifica todos los anillos de una geometria y la convierte a lineas.
 *
 * Se emiten LineString en vez de Polygon a proposito: son limites, no areas.
 * Un poligono relleno taparia el terreno y el objetivo aqui es el contorno.
 *
 * @param {Object} geometria
 * @param {number} tolerancia
 * @returns {{lineas: Array<Array<Array<number>>>, antes: number, despues: number}}
 */
function aLineas(geometria, tolerancia) {
  const poligonos =
    geometria.type === "Polygon"
      ? [geometria.coordinates]
      : geometria.type === "MultiPolygon"
        ? geometria.coordinates
        : [];

  const lineas = [];
  let antes = 0;
  let despues = 0;

  for (const poligono of poligonos) {
    for (const anillo of poligono) {
      antes += anillo.length;
      if (anillo.length < MIN_VERTICES) continue;
      const simple = simplificar(anillo, tolerancia);
      if (simple.length < 4) continue;
      despues += simple.length;
      lineas.push(simple);
    }
  }

  return { lineas, antes, despues };
}

// --- Ejecucion ---------------------------------------------------------------

const features = [];
let totalAntes = 0;
let totalDespues = 0;

async function procesar(archivo, tolerancia, construirProps) {
  let datos;
  try {
    datos = JSON.parse(await readFile(join(CRUDO, archivo), "utf8"));
  } catch {
    console.warn(`  aviso: falta ${archivo}, se omite`);
    return 0;
  }

  let n = 0;
  for (const f of datos.features) {
    const { lineas, antes, despues } = aLineas(f.geometry, tolerancia);
    totalAntes += antes;
    totalDespues += despues;
    for (const linea of lineas) {
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: linea },
        properties: construirProps(f.properties),
      });
      n += 1;
    }
  }
  return n;
}

console.log("Simplificando limites administrativos de Venezuela\n");

const nPais = await procesar("geoboundaries-ven-adm0.geojson", TOLERANCIA_PAIS, () => ({
  id: "LIM-VEN",
  nombre: "Venezuela",
  tipo: "limite",
  nivel: "pais",
  sector: "contexto",
  estado: "desconocido",
  fuente: FUENTE_ADM0,
  confianza: "media",
  ultima_verificacion: FECHA,
  notas:
    "Frontera oriental segun la linea administrada de facto: no incluye la " +
    "Guayana Esequiba, en disputa. Ver docs/DATA_SOURCES.md seccion 12.",
}));
console.log(`Frontera nacional: ${nPais} lineas`);

const nEstados = await procesar(
  "geoboundaries-ven-adm1.geojson",
  TOLERANCIA_ESTADOS,
  (props) => ({
    id: `LIM-${(props.shapeISO ?? props.shapeID ?? props.shapeName ?? "").toString()}`,
    nombre: props.shapeName ?? null,
    tipo: "limite",
    nivel: "estado",
    sector: "contexto",
    estado: "desconocido",
    fuente: FUENTE_ADM1,
    confianza: "media",
    ultima_verificacion: FECHA,
  })
);
console.log(`Limites estatales: ${nEstados} lineas`);

// La simplificacion ya trabaja con una tolerancia de ~440 m, asi que guardar
// 15 decimales es guardar ruido. 4 decimales son ~11 m: dos ordenes de
// magnitud mas finos que la tolerancia, y recortan el archivo a la mitad.
for (const f of features) {
  f.geometry.coordinates = f.geometry.coordinates.map(([x, y]) => [
    Number(x.toFixed(4)),
    Number(y.toFixed(4)),
  ]);
}

await mkdir(dirname(SALIDA), { recursive: true });
// Sin indentar: son 10.000 pares de coordenadas, no algo que se lea a mano.
await writeFile(SALIDA, JSON.stringify({ type: "FeatureCollection", features }));

const bytes = (await readFile(SALIDA)).length;
console.log(`\nVertices: ${totalAntes.toLocaleString("es")} -> ${totalDespues.toLocaleString("es")}`);
console.log(`  reduccion: ${(100 - (totalDespues / totalAntes) * 100).toFixed(1)}%`);
console.log(`Generado ${SALIDA}`);
console.log(`  ${features.length} lineas | ${Math.round(bytes / 1024)} KB`);
if (bytes > 2 * 1024 * 1024) {
  console.warn("  AVISO: supera los 2 MB del presupuesto. Sube la tolerancia.");
}
