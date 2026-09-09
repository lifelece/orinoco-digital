/**
 * gem-to-geojson.mjs — Convierte el Global Oil and Gas Extraction Tracker
 * de Global Energy Monitor a GeoJSON.
 *
 * IMPORTANTE: GOGET es un inventario de CAMPOS (yacimientos), no de pozos.
 * Cada registro abarca kilometros y su coordenada es, en palabras de GEM,
 * "aproximadamente el centro de la unidad". Llamarlos pozos seria falsear el
 * dato. Por eso la salida es campos.geojson y el tipo es "campo".
 *
 * Uso:
 *   1. Descargar el tracker (requiere formulario). Ver docs/DATA_SOURCES.md
 *      seccion 3.
 *   2. Guardar la hoja "Field-level main data" como CSV UTF-8 en:
 *        data/raw/gem-goget.csv
 *      Se usa CSV a proposito: leer .xlsx exigiria una dependencia nueva.
 *   3. node scripts/gem-to-geojson.mjs
 *
 * Salida: public/data/campos.geojson
 *
 * El script NO inventa nada. Las filas sin geometria utilizable se descartan y
 * se reportan. Los campos ausentes quedan como null.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = join(RAIZ, "data", "raw", "gem-goget.csv");
const SALIDA = join(RAIZ, "public", "data", "campos.geojson");

const PAIS = "Venezuela";
const VERSION_DATASET = "March 2026";
const FUENTE = `Global Energy Monitor, Global Oil and Gas Extraction Tracker, ${VERSION_DATASET}`;
const FECHA_HOY = new Date().toISOString().slice(0, 10);

/** Venezuela continental y sus aguas, con margen. Fuera de esto hay un error. */
const LIMITES = { latMin: 0, latMax: 13, lngMin: -74, lngMax: -59 };

/** Parser CSV minimo con soporte de comillas y comas dentro de campo. */
function parsearCSV(texto) {
  const filas = [];
  let campo = "";
  let fila = [];
  let enComillas = false;
  const limpio = texto.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  for (let i = 0; i < limpio.length; i += 1) {
    const c = limpio[i];
    if (enComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else enComillas = false;
      } else campo += c;
      continue;
    }
    if (c === '"') enComillas = true;
    else if (c === ",") {
      fila.push(campo);
      campo = "";
    } else if (c === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else campo += c;
  }
  if (campo || fila.length) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

/**
 * Convierte WKT (POLYGON / MULTIPOLYGON) a geometria GeoJSON.
 * GOGET usa orden lon lat, que es el mismo de GeoJSON.
 * @returns {Object | null}
 */
function wktAGeometria(wkt) {
  if (!wkt) return null;
  const texto = wkt.trim();

  const anillos = (cuerpo) =>
    cuerpo
      .split(/\)\s*,\s*\(/)
      .map((a) =>
        a
          .replace(/[()]/g, "")
          .split(",")
          .map((par) => {
            const [x, y] = par.trim().split(/\s+/).map(Number);
            return [x, y];
          })
          .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
      )
      .filter((a) => a.length >= 4);

  if (texto.startsWith("MULTIPOLYGON")) {
    const cuerpo = texto.slice(texto.indexOf("(") + 1, texto.lastIndexOf(")"));
    // Cada poligono del multipoligono va entre "))," y "(("
    const partes = cuerpo.split(/\)\s*\)\s*,\s*\(\s*\(/);
    const coords = partes
      .map((p) => anillos(p.replace(/^\s*\(\(/, "").replace(/\)\)\s*$/, "")))
      .filter((a) => a.length > 0);
    return coords.length ? { type: "MultiPolygon", coordinates: coords } : null;
  }

  if (texto.startsWith("POLYGON")) {
    const cuerpo = texto.slice(texto.indexOf("(") + 1, texto.lastIndexOf(")"));
    const coords = anillos(cuerpo);
    return coords.length ? { type: "Polygon", coordinates: coords } : null;
  }

  return null;
}

/** Primera posicion [lng, lat] de una geometria, para validar el rango. */
function primeraPosicion(geom) {
  let a = geom.coordinates;
  let n = 0;
  while (Array.isArray(a[0]) && n < 5) {
    a = a[0];
    n += 1;
  }
  return Array.isArray(a) && a.length >= 2 ? a : null;
}

/**
 * Normaliza el estado de GOGET al vocabulario del proyecto.
 * Valores de GEM: discovered, in-development, operating, abandoned,
 * mothballed, decommissioning, UGS, exploration, cancelled.
 */
function normalizarEstado(bruto) {
  const s = String(bruto ?? "").toLowerCase().trim();
  if (!s) return "desconocido";
  if (s.includes("operating")) return "activo";
  if (s.includes("abandoned") || s.includes("decommission") || s.includes("cancelled"))
    return "abandonado";
  if (
    s.includes("mothballed") ||
    s.includes("discovered") ||
    s.includes("development") ||
    s.includes("exploration") ||
    s.includes("ugs")
  )
    return "inactivo";
  return "desconocido";
}

/**
 * Confianza segun lo que declara el propio GEM sobre la ubicacion.
 * GOGET es una fuente curada fiable, pero secundaria y sin contrastar aqui:
 * el techo es "media". Ver docs/DATA_SOURCES.md seccion 6.
 */
function normalizarConfianza(precision) {
  const s = String(precision ?? "").toLowerCase();
  if (s.includes("approximate")) return "baja";
  if (s.includes("exact")) return "media";
  return "baja";
}

const limpiar = (v) => {
  const s = String(v ?? "").trim();
  return s === "" || s === "-" ? null : s;
};

// --- Ejecucion ---------------------------------------------------------------

let csv;
try {
  csv = await readFile(ENTRADA, "utf8");
} catch {
  console.error(
    `No se encontro ${ENTRADA}\n\n` +
      "Pasos:\n" +
      "  1. Descarga el Global Oil and Gas Extraction Tracker desde\n" +
      "     https://globalenergymonitor.org/projects/global-oil-gas-extraction-tracker/\n" +
      "     (requiere rellenar un formulario)\n" +
      '  2. Guarda la hoja "Field-level main data" como CSV UTF-8 en:\n' +
      `     ${ENTRADA}\n` +
      "  3. Vuelve a ejecutar este script.\n\n" +
      "Detalles en docs/DATA_SOURCES.md seccion 3."
  );
  process.exit(1);
}

const filas = parsearCSV(csv);
const cabecera = filas[0].map((h) => h.trim());
const col = (nombre) => cabecera.indexOf(nombre);

const IDX = {
  id: col("Unit ID"),
  nombre: col("Unit Name"),
  fluido: col("Fuel type"),
  pais: col("Country/Area"),
  subnacional: col("Subnational unit"),
  tipoProduccion: col("Production Type"),
  estado: col("Status"),
  descubrimiento: col("Discovery year"),
  inicioProduccion: col("Production start year"),
  operadora: col("Operator"),
  propietarios: col("Owner(s)"),
  wiki: col("Wiki URL (field)"),
  lat: col("Latitude"),
  lng: col("Longitude"),
  precision: col("Location accuracy"),
  costa: col("Onshore/Offshore"),
  wkt: col("Field outline (WKT)"),
  cuenca: col("Basin"),
  bloque: col("Block(s)") !== -1 ? col("Block(s)") : col("Block"),
};

const faltan = Object.entries(IDX).filter(([, i]) => i === -1);
if (faltan.length) {
  console.error(
    "Faltan columnas esperadas en el CSV: " + faltan.map(([k]) => k).join(", ") +
      "\nComprueba que exportaste la hoja \"Field-level main data\"."
  );
  process.exit(1);
}

console.log(`Filas leidas: ${filas.length - 1}`);

const descartes = { otroPais: 0, sinGeometria: 0, fueraDeRango: 0 };
const features = [];
let conPoligono = 0;

for (let i = 1; i < filas.length; i += 1) {
  const f = filas[i];
  if (!f || f.length < cabecera.length - 2) continue;

  const pais = f[IDX.pais] ?? "";
  if (!pais.toLowerCase().includes(PAIS.toLowerCase())) {
    descartes.otroPais += 1;
    continue;
  }

  // Preferimos el poligono real; el punto es el respaldo.
  let geometria = wktAGeometria(f[IDX.wkt]);
  if (geometria) conPoligono += 1;
  else {
    const lat = Number.parseFloat(f[IDX.lat]);
    const lng = Number.parseFloat(f[IDX.lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      descartes.sinGeometria += 1;
      continue;
    }
    geometria = { type: "Point", coordinates: [lng, lat] };
  }

  const pos = primeraPosicion(geometria);
  if (!pos) {
    descartes.sinGeometria += 1;
    continue;
  }
  const [lng, lat] = pos;
  if (
    lat < LIMITES.latMin || lat > LIMITES.latMax ||
    lng < LIMITES.lngMin || lng > LIMITES.lngMax
  ) {
    console.warn(`  fuera de rango: ${f[IDX.nombre]} (${lat}, ${lng})`);
    descartes.fueraDeRango += 1;
    continue;
  }

  features.push({
    type: "Feature",
    geometry: geometria,
    properties: {
      id: limpiar(f[IDX.id]) ? `GEM-${limpiar(f[IDX.id])}` : null,
      nombre: limpiar(f[IDX.nombre]),
      tipo: "campo",
      sector: "upstream",
      fluido: limpiar(f[IDX.fluido]),
      estado: normalizarEstado(f[IDX.estado]),
      operadora: limpiar(f[IDX.operadora]),
      propietarios: limpiar(f[IDX.propietarios]),
      cuenca: limpiar(f[IDX.cuenca]),
      // GOGET no rellena "Block(s)" para Venezuela: queda null, no se inventa.
      bloque: limpiar(f[IDX.bloque]),
      subnacional: limpiar(f[IDX.subnacional]),
      tipo_produccion: limpiar(f[IDX.tipoProduccion]),
      costa: limpiar(f[IDX.costa]),
      descubrimiento: limpiar(f[IDX.descubrimiento]),
      inicio_produccion: limpiar(f[IDX.inicioProduccion]),
      notas: limpiar(f[IDX.wiki]),

      fuente: FUENTE,
      confianza: normalizarConfianza(f[IDX.precision]),
      ultima_verificacion: FECHA_HOY,
    },
  });
}

await mkdir(dirname(SALIDA), { recursive: true });
await writeFile(
  SALIDA,
  JSON.stringify({ type: "FeatureCollection", features }, null, 2)
);

const bytes = (await readFile(SALIDA)).length;

console.log(`\nGenerado: ${SALIDA}`);
console.log(`  campos escritos: ${features.length}`);
console.log(`    con poligono real: ${conPoligono}`);
console.log(`    solo con punto:    ${features.length - conPoligono}`);
console.log(`  descartados por otro pais: ${descartes.otroPais}`);
console.log(`  descartados sin geometria: ${descartes.sinGeometria}`);
console.log(`  descartados fuera de rango: ${descartes.fueraDeRango}`);
console.log(`  peso: ${Math.round(bytes / 1024)} KB`);
if (bytes > 2 * 1024 * 1024) {
  console.warn("  AVISO: supera los 2 MB del presupuesto de rendimiento.");
}
console.log(
  "\nSiguiente paso OBLIGATORIO: revisa el GeoJSON antes de publicarlo y\n" +
    "registra la version del dataset en docs/DATA_SOURCES.md. Revisar, no confiar."
);
