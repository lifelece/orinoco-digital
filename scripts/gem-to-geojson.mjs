/**
 * gem-to-geojson.mjs — Convierte el tracker de Global Energy Monitor a GeoJSON.
 *
 * Uso:
 *   1. Descarga el Global Oil and Gas Extraction Tracker (requiere formulario).
 *      Instrucciones: docs/DATA_SOURCES.md seccion 3.
 *   2. Abre el .xlsx y guarda la hoja de datos como CSV UTF-8 en:
 *        data/raw/gem-goget.csv
 *      Se usa CSV a proposito: leer .xlsx exigiria una dependencia nueva, y la
 *      regla del proyecto es no anadir dependencias sin aprobacion.
 *   3. node scripts/gem-to-geojson.mjs
 *
 * Salida: public/data/pozos.geojson
 *
 * El script NO inventa nada. Las filas sin coordenadas validas se descartan y
 * se reportan. Los campos ausentes quedan como null.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA = join(RAIZ, "data", "raw", "gem-goget.csv");
const SALIDA = join(RAIZ, "public", "data", "pozos.geojson");

const PAIS = "Venezuela";
const FECHA_HOY = new Date().toISOString().slice(0, 10);

/**
 * Nombres de columna que GEM ha usado, en orden de preferencia.
 * Si tu descarga trae otros encabezados, anadelos aqui en vez de renombrar el
 * CSV: asi queda constancia de la variante que usaste.
 */
const COLUMNAS = {
  nombre: ["Unit name", "Unit Name", "Project name", "Nombre"],
  pais: ["Country/Area", "Country", "Pais"],
  lat: ["Latitude", "Lat", "Latitud"],
  lng: ["Longitude", "Lon", "Long", "Longitud"],
  estado: ["Status", "Unit status", "Estado"],
  operadora: ["Operator", "Owner", "Operadora"],
  tipoUnidad: ["Fuel type", "Fuel description", "Unit type"],
  descubrimiento: ["Discovery year", "Production start year"],
};

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
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
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

/** Devuelve el valor de la primera columna candidata que exista. */
function valor(registro, candidatas) {
  for (const nombre of candidatas) {
    if (registro[nombre] !== undefined && registro[nombre] !== "") {
      return String(registro[nombre]).trim();
    }
  }
  return null;
}

/** Normaliza el estado de GEM al vocabulario del proyecto. */
function normalizarEstado(bruto) {
  if (!bruto) return "desconocido";
  const s = bruto.toLowerCase();
  if (s.includes("operating") || s.includes("producing")) return "activo";
  if (s.includes("discovered") || s.includes("development") || s.includes("proposed"))
    return "inactivo";
  if (s.includes("shut") || s.includes("cancelled") || s.includes("abandoned"))
    return "abandonado";
  return "desconocido";
}

/** Genera un id estable a partir del nombre de la unidad. */
function generarId(nombre, indice) {
  const base = (nombre ?? `SIN-NOMBRE-${indice}`)
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita diacriticos separados por NFD
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `GEM-${base}`;
}

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
      "  2. Abre el .xlsx y guarda la hoja de datos como CSV UTF-8 en:\n" +
      `     ${ENTRADA}\n` +
      "  3. Vuelve a ejecutar este script.\n\n" +
      "Detalles en docs/DATA_SOURCES.md seccion 3."
  );
  process.exit(1);
}

const filas = parsearCSV(csv);
if (filas.length < 2) {
  console.error("El CSV no tiene filas de datos.");
  process.exit(1);
}

const encabezados = filas[0].map((h) => h.trim());
const registros = filas.slice(1).map((f) =>
  Object.fromEntries(encabezados.map((h, i) => [h, f[i] ?? ""]))
);

console.log(`Filas leidas: ${registros.length}`);
console.log(`Columnas detectadas: ${encabezados.length}`);

const descartes = { otroPais: 0, sinCoordenadas: 0, fueraDeRango: 0 };
const features = [];

registros.forEach((registro, indice) => {
  const pais = valor(registro, COLUMNAS.pais);
  if (!pais || !pais.toLowerCase().includes(PAIS.toLowerCase())) {
    descartes.otroPais += 1;
    return;
  }

  const latBruta = valor(registro, COLUMNAS.lat);
  const lngBruta = valor(registro, COLUMNAS.lng);
  if (!latBruta || !lngBruta) {
    descartes.sinCoordenadas += 1;
    return;
  }

  const lat = Number.parseFloat(latBruta);
  const lng = Number.parseFloat(lngBruta);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    descartes.sinCoordenadas += 1;
    return;
  }
  // Venezuela continental, con margen generoso. Fuera de esto hay un error.
  if (lat < 0 || lat > 13 || lng < -74 || lng > -59) {
    console.warn(`  Fuera de rango: ${valor(registro, COLUMNAS.nombre)} (${lat}, ${lng})`);
    descartes.fueraDeRango += 1;
    return;
  }

  const nombre = valor(registro, COLUMNAS.nombre);

  features.push({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      id: generarId(nombre, indice),
      nombre,
      tipo: "pozo",
      sector: "upstream",
      bloque: null, // GEM no lo trae; se completa a mano con fuente propia
      estado: normalizarEstado(valor(registro, COLUMNAS.estado)),
      operadora: valor(registro, COLUMNAS.operadora),
      notas: valor(registro, COLUMNAS.tipoUnidad),
      fuente: "Global Energy Monitor, Global Oil and Gas Extraction Tracker",
      confianza: "media",
      ultima_verificacion: FECHA_HOY,
    },
  });
});

await mkdir(dirname(SALIDA), { recursive: true });
await writeFile(
  SALIDA,
  JSON.stringify({ type: "FeatureCollection", features }, null, 2)
);

console.log(`\nGenerado: ${SALIDA}`);
console.log(`  Features escritas: ${features.length}`);
console.log(`  Descartadas por otro pais: ${descartes.otroPais}`);
console.log(`  Descartadas sin coordenadas: ${descartes.sinCoordenadas}`);
console.log(`  Descartadas fuera de rango: ${descartes.fueraDeRango}`);
console.log(
  "\nSiguiente paso OBLIGATORIO: revisa el GeoJSON a mano antes de publicarlo,\n" +
    "completa el campo 'bloque' con fuente propia, y registra la version del\n" +
    "dataset en docs/DATA_SOURCES.md. Revisar, no confiar."
);
