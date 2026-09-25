/**
 * centrales-to-geojson.mjs — Centrales electricas de Venezuela.
 *
 * POR QUE EXISTE
 * Los dos mapas de divulgacion que sirvieron de referencia dibujan las
 * centrales electricas, y con razon: el gas que este proyecto cartografia se
 * quema en buena parte para generar electricidad, y las cuatro hidroelectricas
 * del Caroni son lo que explica que Venezuela haya podido permitirse no
 * desarrollar su gas durante decadas. Sin ellas falta la mitad de la historia
 * energetica del pais.
 *
 * NO SON CADENA DE HIDROCARBUROS. Por eso van en capa propia y con su
 * interruptor, no dentro de downstream. Es coherente con la decision ya tomada
 * en la Fase 3, donde `power=plant` se excluyo de la capa de OSM justamente por
 * esto. Ver docs/DECISIONS.md -> ADR-013.
 *
 * FUENTE
 * WRI Global Power Plant Database v1.3.0 (CC BY 4.0). Es la misma fuente que
 * cita El Orden Mundial en su mapa de infraestructura energetica venezolana.
 *
 * AVISO IMPORTANTE DE FRESCURA
 * WRI declara en su propio README que **no mantiene el proyecto desde
 * principios de 2022** y que 1.3.0 es la ultima version. Estos datos tienen
 * anos. Es aceptable para infraestructura pesada —una represa no se mueve— pero
 * NO dice que este operativa hoy, y en el sistema electrico venezolano esa
 * diferencia es enorme. La capa lo advierte en la interfaz.
 *
 * Salida: public/data/centrales.geojson
 *
 * Uso: node scripts/centrales-to-geojson.mjs   (npm run data:centrales)
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(RAIZ, "public", "data", "centrales.geojson");

const BASE =
  "https://raw.githubusercontent.com/wri/global-power-plant-database/master/";
const CSV = `${BASE}output_database/global_power_plant_database.csv`;
const VERSION_URL = `${BASE}output_database/DATABASE_VERSION`;

const PAIS = "Venezuela";
const FECHA = new Date().toISOString().slice(0, 10);

/** Venezuela continental y sus aguas, con margen. Fuera de esto hay un error. */
const LIMITES = { latMin: 0, latMax: 13, lngMin: -74, lngMax: -59 };

/**
 * Confianza segun de donde saco WRI la coordenada.
 *
 * No es un juicio nuestro: la propia base declara el origen de cada
 * geolocalizacion en `geolocation_source`. GEODB y WRI son geolocalizaciones
 * revisadas; CARMA es un volcado antiguo y conocido por su imprecision. Que la
 * confianza la fije el dato y no nosotros es justo la regla del proyecto.
 */
const CONFIANZA_POR_ORIGEN = {
  GEODB: "media",
  WRI: "media",
  CARMA: "baja",
};

// CRS de las coordenadas: WGS84 (EPSG:4326), declarado por WRI en el README.txt
// del ZIP de la v1.3.0 y en powerplant_database.py. Se cargan sin transformar.
// Ver docs/DATA_SOURCES.md seccion 15, incluida la correccion del 2026-09-15:
// una primera busqueda no encontro la declaracion y bajo la confianza a baja.

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
 * Normaliza el combustible primario a las clases del proyecto.
 *
 * Venezuela solo trae Gas e Hydro en esta version, pero la funcion cubre el
 * resto: si una version futura anade carbon o fuel oil, entrara clasificado en
 * vez de desaparecer en silencio.
 *
 * @param {string} fuel — primary_fuel de WRI
 * @returns {"hidro" | "termo" | "otro"}
 */
function claseDeCombustible(fuel) {
  const f = String(fuel ?? "").toLowerCase();
  if (f === "hydro") return "hidro";
  if (["gas", "oil", "coal", "petcoke"].includes(f)) return "termo";
  return "otro";
}

/** Numero o null. Nunca 0 por defecto: un dato ausente no es un cero. */
function numeroONull(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && valor !== "" ? n : null;
}

/** El ano viene como "2017.0" en el CSV. */
function anoONull(valor) {
  const n = numeroONull(valor);
  return n ? String(Math.round(n)) : null;
}

// --- Descarga ----------------------------------------------------------------

async function traer(url) {
  const respuesta = await fetch(url, {
    headers: { "User-Agent": "orinoco-digital/0.1" },
  });
  if (!respuesta.ok) throw new Error(`${url}: HTTP ${respuesta.status}`);
  return respuesta.text();
}

const version = (await traer(VERSION_URL)).trim();
const FUENTE = `WRI Global Power Plant Database v${version} (CC BY 4.0)`;
console.log(`Version declarada por la fuente: ${version}`);

const filas = parsearCSV(await traer(CSV));
const cabecera = filas[0];
const col = Object.fromEntries(cabecera.map((c, i) => [c, i]));

const requeridas = [
  "country_long",
  "name",
  "gppd_idnr",
  "capacity_mw",
  "latitude",
  "longitude",
  "primary_fuel",
];
const ausentes = requeridas.filter((c) => col[c] === undefined);
if (ausentes.length) {
  console.error(
    `El CSV no trae estas columnas: ${ausentes.join(", ")}. ` +
      "WRI pudo cambiar el esquema: revisa antes de dar el resultado por bueno."
  );
  process.exit(1);
}

// --- Conversion --------------------------------------------------------------

const features = [];
const descartadas = { sinCoordenada: 0, fueraDeRango: 0 };
const porClase = { hidro: 0, termo: 0, otro: 0 };
const porConfianza = {};
/** Coordenadas repetidas: sintoma de que WRI lista dos veces el mismo sitio. */
const vistas = new Map();

for (const fila of filas.slice(1)) {
  if (fila[col.country_long] !== PAIS) continue;

  const lat = numeroONull(fila[col.latitude]);
  const lng = numeroONull(fila[col.longitude]);
  if (lat === null || lng === null) {
    descartadas.sinCoordenada += 1;
    continue;
  }
  if (
    lat < LIMITES.latMin ||
    lat > LIMITES.latMax ||
    lng < LIMITES.lngMin ||
    lng > LIMITES.lngMax
  ) {
    descartadas.fueraDeRango += 1;
    console.warn(`  fuera de Venezuela: ${fila[col.name]} (${lat}, ${lng})`);
    continue;
  }

  const clase = claseDeCombustible(fila[col.primary_fuel]);
  const origen = fila[col.geolocation_source] || "";
  const confianza = CONFIANZA_POR_ORIGEN[origen] ?? "baja";

  const clave = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  vistas.set(clave, [...(vistas.get(clave) ?? []), fila[col.name]]);

  porClase[clase] += 1;
  porConfianza[confianza] = (porConfianza[confianza] ?? 0) + 1;

  features.push({
    type: "Feature",
    geometry: { type: "Point", coordinates: [lng, lat] },
    properties: {
      id: fila[col.gppd_idnr],
      nombre: fila[col.name],
      tipo: "central",
      sector: "energia",
      clase,
      combustible: fila[col.primary_fuel],
      capacidad_mw: numeroONull(fila[col.capacity_mw]),
      // WRI NO publica estado operativo. Deducirlo del ano de puesta en marcha
      // seria inventar, y en el sistema electrico venezolano justamente el
      // estado es lo mas dudoso de todo.
      estado: "desconocido",
      inicio_operacion: anoONull(fila[col.commissioning_year]),
      operadora: fila[col.owner] || null,
      notas: fila[col.url] || null,
      origen_coordenada: origen || null,
      fuente: FUENTE,
      confianza,
      ultima_verificacion: FECHA,
    },
  });
}

features.sort((a, b) => (b.properties.capacidad_mw ?? 0) - (a.properties.capacidad_mw ?? 0));

// --- Salida ------------------------------------------------------------------

await mkdir(dirname(SALIDA), { recursive: true });
const texto = JSON.stringify({ type: "FeatureCollection", features });
await writeFile(SALIDA, texto, "utf8");

const mw = features.reduce((s, f) => s + (f.properties.capacidad_mw ?? 0), 0);
const mwHidro = features
  .filter((f) => f.properties.clase === "hidro")
  .reduce((s, f) => s + (f.properties.capacidad_mw ?? 0), 0);

console.log(
  `\ncentrales.geojson  ${features.length} centrales, ` +
    `${Math.round(Buffer.byteLength(texto) / 1024)} KB`
);
console.log(`  ${porClase.hidro} hidroelectricas, ${porClase.termo} termicas`);
console.log(
  `  ${Math.round(mw).toLocaleString("es")} MW instalados, ` +
    `${Math.round((mwHidro / mw) * 100)}% hidroelectricos`
);
console.log(`  confianza: ${JSON.stringify(porConfianza)}`);
if (descartadas.sinCoordenada || descartadas.fueraDeRango) {
  console.log(`  descartadas: ${JSON.stringify(descartadas)}`);
}

const repetidas = [...vistas.entries()].filter(([, n]) => n.length > 1);
if (repetidas.length) {
  console.log(
    `\n  AVISO: ${repetidas.length} coordenadas con mas de una central. ` +
      "Puede ser un mismo sitio listado dos veces por WRI, o unidades\n" +
      "  distintas del mismo complejo. NO se fusionan: no hay forma de\n" +
      "  saberlo desde el dato, y fusionar seria decidir por la fuente."
  );
  for (const [clave, nombres] of repetidas) {
    console.log(`    ${clave}  ${nombres.join(" | ")}`);
  }
}
