/**
 * validate-geojson.mjs — Comprueba los GeoJSON antes de publicarlos.
 *
 * Uso:  npm run data:validate
 *
 * Aplica las reglas del proyecto: geometria valida, coordenadas en WGS84
 * dentro de la ventana que le corresponda a la capa, y trazabilidad
 * obligatoria (fuente, confianza, ultima_verificacion). Sale con codigo 1 si
 * algo falla, para poder usarlo en un hook o en CI.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIRECTORIO = join(RAIZ, "public", "data");

// Venezuela continental con margen. Fuera de esto, hay un error de CRS.
const LIMITES = { latMin: 0, latMax: 13, lngMin: -74, lngMax: -59 };

/**
 * Capas de CONTEXTO: se salen de Venezuela A PROPOSITO.
 *
 * Rotular GUYANA, dibujar el Orinoco hasta su nacimiento o trazar una zona en
 * disputa exige cruzar la frontera; ese es justamente su trabajo. Aplicarles
 * el limite de las capas de activos no detectaria ningun error real, solo
 * castigaria el comportamiento correcto — y una validacion que da falsos
 * positivos acaba ignorandose, que es la peor forma de perderla.
 *
 * Lo que si se comprueba es que no se vayan a otro continente: sigue habiendo
 * ventana, solo que es la del mapa y no la del pais.
 */
const CAPAS_CONTEXTO = [
  "toponimia.geojson",
  "hidrografia.geojson",
  "zona-disputada.geojson",
];

/** La ventana de scripts/contexto-to-geojson.mjs, con un grado de holgura. */
const LIMITES_CONTEXTO = { latMin: 0, latMax: 14, lngMin: -75, lngMax: -58 };

const ESTADOS = ["activo", "inactivo", "abandonado", "desconocido"];
const CONFIANZAS = ["alta", "media", "baja"];

let errores = 0;
let avisos = 0;

function error(mensaje) {
  console.log(`  ERROR  ${mensaje}`);
  errores += 1;
}

function aviso(mensaje) {
  console.log(`  AVISO  ${mensaje}`);
  avisos += 1;
}

/** Primera posicion [lng, lat] de cualquier geometria anidada. */
function primeraPosicion(coords) {
  let actual = coords;
  let profundidad = 0;
  while (Array.isArray(actual?.[0]) && profundidad < 5) {
    actual = actual[0];
    profundidad += 1;
  }
  return Array.isArray(actual) && actual.length >= 2 ? actual : null;
}

function validarFeature(feature, indice, esCapaOSM, limites = LIMITES, ambito = "Venezuela") {
  const id = feature?.properties?.id ?? `#${indice}`;

  const posicion = primeraPosicion(feature?.geometry?.coordinates);
  if (!posicion) {
    error(`${id}: sin geometria utilizable`);
    return;
  }

  const [lng, lat] = posicion;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    error(`${id}: coordenadas no numericas`);
    return;
  }
  if (lat < limites.latMin || lat > limites.latMax ||
      lng < limites.lngMin || lng > limites.lngMax) {
    error(`${id}: fuera de ${ambito} (${lat}, ${lng}) — revisa el CRS de origen`);
  }
  // Sintoma clasico de coordenadas invertidas.
  if (lng > 0 && lat < 0) {
    error(`${id}: parecen lat/lng invertidas`);
  }

  const props = feature.properties ?? {};

  if (!props.fuente) {
    error(`${id}: SIN FUENTE — no puede publicarse`);
  }
  if (!props.ultima_verificacion) {
    aviso(`${id}: sin ultima_verificacion`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(props.ultima_verificacion)) {
    error(`${id}: ultima_verificacion no es ISO 8601 (${props.ultima_verificacion})`);
  }
  if (props.confianza && !CONFIANZAS.includes(props.confianza)) {
    error(`${id}: confianza invalida "${props.confianza}"`);
  }
  if (props.estado && !ESTADOS.includes(props.estado)) {
    error(`${id}: estado invalido "${props.estado}"`);
  }
  if (esCapaOSM && !/openstreetmap/i.test(props.fuente ?? "")) {
    aviso(`${id}: capa OSM sin atribucion a OpenStreetMap en 'fuente' (ODbL)`);
  }
}

let archivos;
try {
  archivos = (await readdir(DIRECTORIO)).filter((f) => f.endsWith(".geojson"));
} catch {
  console.log(`No existe ${DIRECTORIO} todavia. Nada que validar.`);
  process.exit(0);
}

if (archivos.length === 0) {
  console.log("No hay archivos .geojson en public/data/ todavia.");
  console.log("Normal antes de la Fase 2.");
  process.exit(0);
}

for (const archivo of archivos) {
  console.log(`\n${archivo}`);
  const esCapaOSM = archivo.includes("-osm");
  const esContexto = CAPAS_CONTEXTO.includes(archivo);
  const limites = esContexto ? LIMITES_CONTEXTO : LIMITES;
  const ambito = esContexto ? "la ventana del mapa" : "Venezuela";

  let json;
  try {
    json = JSON.parse(await readFile(join(DIRECTORIO, archivo), "utf8"));
  } catch (e) {
    error(`JSON invalido: ${e.message}`);
    continue;
  }

  if (json.type !== "FeatureCollection") {
    error(`type es "${json.type}", se esperaba FeatureCollection`);
    continue;
  }
  if (!Array.isArray(json.features)) {
    error('"features" no es un array');
    continue;
  }

  console.log(`  ${json.features.length} features`);
  if (json.features.length > 2000) {
    aviso(`supera el presupuesto de 2000 entidades por capa`);
  }

  json.features.forEach((f, i) =>
    validarFeature(f, i, esCapaOSM, limites, ambito)
  );
}

console.log(`\n${errores} errores, ${avisos} avisos.`);
if (errores > 0) {
  console.log("Hay errores. Estos datos NO deben publicarse.");
  process.exit(1);
}
console.log("Validacion superada.");
