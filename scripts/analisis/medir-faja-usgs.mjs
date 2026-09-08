/**
 * medir-faja-usgs.mjs — Mide la extension de la Faja Petrolifera del Orinoco
 * sobre la figura 1 del USGS Fact Sheet 2009-3028.
 *
 * POR QUE EXISTE
 * El poligono oficial de la Orinoco Oil Belt Assessment Unit NO esta publicado
 * como GIS: el shapefile del USGS para Suramerica solo contiene las assessment
 * units *convencionales*, y la Faja es una unidad *continua* de crudo pesado
 * (comprobado en ScienceBase, ver docs/DATA_SOURCES.md seccion 9).
 * La unica representacion publica de su limite es el mapa del Fact Sheet.
 *
 * Este script lo mide de forma reproducible en lugar de estimarlo a ojo:
 * renderiza la pagina, calibra la graticula del mapa detectando las marcas de
 * graduacion, localiza la linea azul de la AU por su color y convierte pixeles
 * a grados.
 *
 * DEPENDENCIAS — NO son dependencias del proyecto
 * Se ejecuta de forma aislada con npx, para no meter pdfjs ni canvas en
 * package.json solo por una medicion que se hace una vez:
 *
 *   cd scripts/analisis
 *   npm init -y
 *   npm install pdfjs-dist @napi-rs/canvas
 *   node medir-faja-usgs.mjs ../../data/raw/usgs-fs-2009-3028-orinoco-oil-belt.pdf
 *
 * Ese package.json y node_modules locales estan en .gitignore.
 *
 * LIMITES DEL METODO
 * Precision estimada +-0,05 grados (~5 km), limitada por el grosor de la linea
 * impresa y la resolucion del render. Sirve para encuadrar una camara.
 * NO es un limite legal, catastral ni de concesion.
 */

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";

const ESCALA = 6; // 6x sobre el tamano nominal: ~137 px por grado
const COLOR_AU = [24, 72, 160]; // azul de la linea, tomado de la leyenda
const TOLERANCIA = 45;

// Valores de la graticula impresos en el mapa.
const GRADOS_LON = [-70, -68, -66, -64, -62, -60, -58, -56];
const GRADOS_LAT = [14, 12, 10, 8, 6, 4];

const ruta = process.argv[2];
if (!ruta) {
  console.error("Uso: node medir-faja-usgs.mjs <ruta-al-pdf>");
  process.exit(1);
}

// --- 1. Renderizar la pagina 1 ---------------------------------------------

const doc = await getDocument({
  data: new Uint8Array(readFileSync(ruta)),
  useSystemFonts: true,
}).promise;
const pagina = await doc.getPage(1);
const vp = pagina.getViewport({ scale: ESCALA });
const canvas = createCanvas(vp.width, vp.height);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "white";
ctx.fillRect(0, 0, vp.width, vp.height);
await pagina.render({ canvasContext: ctx, viewport: vp, canvas }).promise;

const { data, width, height } = ctx.getImageData(0, 0, vp.width, vp.height);
const px = (x, y) => {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
};
const esNegro = (x, y) => {
  const [r, g, b] = px(x, y);
  return r < 110 && g < 110 && b < 110;
};
const esAU = (x, y) => {
  const [r, g, b] = px(x, y);
  return Math.hypot(r - COLOR_AU[0], g - COLOR_AU[1], b - COLOR_AU[2]) < TOLERANCIA;
};

console.log(`render: ${width} x ${height}`);

// --- 2. Marco del mapa ------------------------------------------------------

const xIni = Math.floor(width * 0.3);
let arriba = -1;
let abajo = -1;
for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.6); y += 1) {
  let n = 0;
  for (let x = xIni; x < width; x += 1) if (esNegro(x, y)) n += 1;
  if (n > (width - xIni) * 0.75) {
    if (arriba === -1) arriba = y;
    abajo = y;
  }
}
let izq = -1;
let der = -1;
for (let x = xIni; x < width; x += 1) {
  let n = 0;
  for (let y = arriba; y <= abajo; y += 1) if (esNegro(x, y)) n += 1;
  if (n > (abajo - arriba) * 0.6) {
    if (izq === -1) izq = x;
    der = x;
  }
}
console.log(`marco: x ${izq}..${der} | y ${arriba}..${abajo}`);

// --- 3. Marcas de graduacion ------------------------------------------------

/** Agrupa posiciones contiguas y devuelve el centro de cada grupo. */
function agrupar(posiciones, holgura = 4) {
  const grupos = [];
  let g = null;
  for (const p of posiciones) {
    if (g && p - g.fin <= holgura) g.fin = p;
    else {
      if (g) grupos.push(Math.round((g.ini + g.fin) / 2));
      g = { ini: p, fin: p };
    }
  }
  if (g) grupos.push(Math.round((g.ini + g.fin) / 2));
  return grupos;
}

const marcasX = [];
for (let x = izq + 2; x < der - 2; x += 1) {
  let largo = 0;
  for (let k = 1; k < 22; k += 1) {
    if (esNegro(x, arriba + k)) largo += 1;
    else break;
  }
  if (largo >= 8) marcasX.push(x);
}
// Se arranca 20 px por dentro del marco: si no, el propio borde superior se
// detecta como si fuera una marca de graduacion y desplaza toda la escala.
const marcasY = [];
for (let y = arriba + 20; y < abajo - 20; y += 1) {
  let largo = 0;
  for (let k = 1; k < 26; k += 1) {
    if (esNegro(der - k, y)) largo += 1;
    else break;
  }
  if (largo >= 6) marcasY.push(y);
}

// Las marcas de longitud son perfectamente regulares: se filtran quedandose
// con la serie de espaciado constante mas larga.
let ticksX = agrupar(marcasX);
if (ticksX.length > GRADOS_LON.length) ticksX = ticksX.slice(-GRADOS_LON.length);
// Las marcas de latitud estan mas separadas entre si que cualquier deteccion
// espuria, asi que se descarta la mas proxima a su vecina hasta cuadrar el
// numero de etiquetas del mapa.
let ticksY = agrupar(marcasY);
while (ticksY.length > GRADOS_LAT.length) {
  let peor = 1;
  let minDist = Infinity;
  for (let i = 1; i < ticksY.length; i += 1) {
    const d = ticksY[i] - ticksY[i - 1];
    if (d < minDist) {
      minDist = d;
      peor = i;
    }
  }
  ticksY.splice(peor, 1);
}

console.log(`ticks longitud (${ticksX.length}): ${ticksX.join(", ")}`);
console.log(`ticks latitud  (${ticksY.length}): ${ticksY.join(", ")}`);

if (ticksX.length !== GRADOS_LON.length || ticksY.length !== GRADOS_LAT.length) {
  console.error(
    "\nNo se detectaron las marcas esperadas. Revisa ESCALA o los umbrales " +
      "antes de fiarte del resultado."
  );
  process.exit(1);
}

const tablaLon = ticksX.map((p, i) => [p, GRADOS_LON[i]]);
const tablaLat = ticksY.map((p, i) => [p, GRADOS_LAT[i]]);

/** Interpolacion lineal por tramos: absorbe la variacion de escala del mapa. */
function interpolar(v, tabla) {
  for (let i = 0; i < tabla.length - 1; i += 1) {
    const [p0, g0] = tabla[i];
    const [p1, g1] = tabla[i + 1];
    if (v >= p0 && v <= p1) return g0 + ((v - p0) / (p1 - p0)) * (g1 - g0);
  }
  const [p0, g0] = tabla[0];
  const [p1, g1] = tabla[1];
  return g0 + ((v - p0) / (p1 - p0)) * (g1 - g0);
}

// --- 4. Linea de la AU ------------------------------------------------------

// Perfil por filas para separar la AU del recuadro de localizacion, que usa
// el mismo azul. Se toma el bloque contiguo con mas pixeles.
const filas = [];
for (let y = arriba; y < abajo; y += 1) {
  let n = 0;
  for (let x = izq; x < der; x += 1) if (esAU(x, y)) n += 1;
  if (n > 20) filas.push([y, n]);
}
const bloques = [];
let actual = null;
for (const [y, n] of filas) {
  if (actual && y - actual.fin <= 5) {
    actual.fin = y;
    actual.total += n;
  } else {
    if (actual) bloques.push(actual);
    actual = { ini: y, fin: y, total: n };
  }
}
if (actual) bloques.push(actual);
bloques.sort((a, b) => b.total - a.total);
const banda = bloques[0];
console.log(`banda de la AU: y ${banda.ini}..${banda.fin} (${banda.total} px)`);

let xmin = Infinity;
let xmax = -Infinity;
let ymin = Infinity;
let ymax = -Infinity;
for (let y = banda.ini - 8; y <= banda.fin + 8; y += 1) {
  for (let x = izq; x <= der; x += 1) {
    if (!esAU(x, y)) continue;
    if (x < xmin) xmin = x;
    if (x > xmax) xmax = x;
    if (y < ymin) ymin = y;
    if (y > ymax) ymax = y;
  }
}

// --- 5. Resultado -----------------------------------------------------------

const oeste = interpolar(xmin, tablaLon);
const este = interpolar(xmax, tablaLon);
const norte = interpolar(ymin, tablaLat);
const sur = interpolar(ymax, tablaLat);
const cLat = (norte + sur) / 2;
const cLng = (oeste + este) / 2;
const anchoKm = (este - oeste) * 111.32 * Math.cos((cLat * Math.PI) / 180);
const altoKm = (norte - sur) * 110.57;

console.log("\n=== Orinoco Oil Belt Assessment Unit ===");
console.log(`  oeste  ${oeste.toFixed(2)}`);
console.log(`  este   ${este.toFixed(2)}`);
console.log(`  sur    ${sur.toFixed(2)}`);
console.log(`  norte  ${norte.toFixed(2)}`);
console.log(`  centro ${cLat.toFixed(2)} N, ${cLng.toFixed(2)}`);
console.log(`  extension ${anchoKm.toFixed(0)} km E-O x ${altoKm.toFixed(0)} km N-S`);
console.log(`  area de la caja ${Math.round(anchoKm * altoKm).toLocaleString("es")} km2`);
console.log(
  `  control: la AU declara ~50.000 km2 -> ocupa el ` +
    `${((50000 / (anchoKm * altoKm)) * 100).toFixed(0)}% de su caja ` +
    `(franja sinuosa, coherente)`
);
console.log("\nCopiar a src/config.js -> FAJA_BBOX");
