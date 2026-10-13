/**
 * ciudad-bolivar-to-geojson.mjs — Capa Ciudad Bolivar del modo E1.
 *
 * Genera, de forma reproducible:
 *   data/raw/osm-ciudad-bolivar.json           crudo de Overpass (no se versiona)
 *   public/data/ciudad-bolivar-osm.geojson     servicios de la ciudad (OSM, ODbL)
 *   public/data/iniciativas-ccieb.geojson      iniciativas CON ubicacion en OSM
 *   public/data/ciudad-bolivar-resumen.json    conteos por clase y por anillo
 *
 * Uso:  npm run data:ciudad-bolivar            (descarga de Overpass)
 *       npm run data:ciudad-bolivar -- --sin-red   (reutiliza el crudo guardado)
 *
 * Corre con `node --import ./test/entorno.mjs` porque calcula el resumen con
 * src/data.js, que importa src/config.js. Los mirrors de Overpass son los de
 * scripts/descargar-fuentes.mjs. Ver docs/DATA_SOURCES.md seccion 17.
 *
 * Ninguna coordenada ni nombre se escribe a mano: la geometria de cada
 * feature sale del elemento OSM descargado.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { consultarOverpass } from "./descargar-fuentes.mjs";
import {
  ID_SEDE_EXPOFAJA,
  CENTRO_CIUDAD_BOLIVAR,
  CIUDAD_BOLIVAR_CAJA,
  ANILLOS_KM,
  CLASES_CIUDAD,
} from "../src/config.js";
import { camposMasCercanos, contarPorAnillo } from "../src/data.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const RUTA_CRUDO = join(RAIZ, "data", "raw", "osm-ciudad-bolivar.json");
const SALIDA = join(RAIZ, "public", "data");
const RUTA_SEMILLA = join(RAIZ, "docs", "expofaja", "semillas", "iniciativas-ccieb.json");

/** Elementos que se piden por id, no por etiqueta. Decision en E1 / ADR-020. */
const ID_SEDE = "relation/7948635"; // Museo de Arte Moderno Jesus Soto
const ID_PUENTE = "way/1485676372"; // Puente Angostura (LineString)

/** Nombres de educacion que NO son educacion superior (ver E1, "Datos: servicios"). */
const PREFIJOS_EXCLUIDOS_EDUCACION = ["i.e.e.", "e.t.", "u.e.", "academia"];

// Nombre de la relation OSM 14534562 (Nominatim, 2026-10-12), como en la semilla de verificacion.
const NOMBRE_CIUDAD = "Ciudad Bolívar";

const { sur, oeste, norte, este } = CIUDAD_BOLIVAR_CAJA;
const CAJA = `${sur},${oeste},${norte},${este}`;

// Consulta de la spec tecnica (04, seccion 4): lo pedido por id sale con geometria
// completa (el puente es LineString); los servicios, con centro y etiquetas.
const CONSULTA = `
  [out:json][timeout:90];
  (
    relation(${ID_SEDE.split("/")[1]});
    way(${ID_PUENTE.split("/")[1]});
  )->.porId;
  (
    nwr["aeroway"="aerodrome"](${CAJA});
    nwr["amenity"~"^(university|college)$"](${CAJA});
    nwr["amenity"~"^(hospital|clinic)$"](${CAJA});
    nwr["healthcare"~"^(hospital|clinic)$"](${CAJA});
    nwr["tourism"~"^(hotel|motel|guest_house)$"](${CAJA});
    nwr["amenity"="bank"](${CAJA});
    nwr["amenity"="bus_station"](${CAJA});
  )->.servicios;
  .porId out geom;
  .servicios out center tags;`;

/** Clave `tipo/id` de un elemento OSM, como la usa su URL. */
const claveOsm = (e) => `${e.type}/${e.id}`;

/** ID del mapa con la convencion del repo: OSM-N…, OSM-W…, OSM-R…. */
const idMapa = (e) => `OSM-${e.type[0].toUpperCase()}${e.id}`;

/**
 * ¿Es un instituto, escuela tecnica o academia y no educacion superior?
 * OSM etiqueta `amenity=college` a liceos y escuelas tecnicas.
 * @param {string | undefined} nombre
 * @returns {boolean}
 */
export function esEducacionNoSuperior(nombre) {
  const n = (nombre ?? "").trim().toLowerCase();
  return PREFIJOS_EXCLUIDOS_EDUCACION.some((p) => n.startsWith(p));
}

/**
 * Clase de servicio de un elemento, o null si no encaja en ninguna.
 * Las dos selecciones por id mandan sobre las etiquetas.
 */
export function claseDe(e) {
  const clave = claveOsm(e);
  if (clave === ID_SEDE) return "sede_evento";
  if (clave === ID_PUENTE) return "puente";
  const t = e.tags ?? {};
  if (t.aeroway === "aerodrome") return "aeropuerto";
  if (t.amenity === "university" || t.amenity === "college") return "educacion_superior";
  if (/^(hospital|clinic)$/.test(t.amenity ?? "") || /^(hospital|clinic)$/.test(t.healthcare ?? ""))
    return "salud";
  if (/^(hotel|motel|guest_house)$/.test(t.tourism ?? "")) return "hotel";
  if (t.amenity === "bank") return "banca";
  if (t.amenity === "bus_station") return "transporte";
  return null;
}

/**
 * Geometria GeoJSON de un elemento OSM, o null.
 * - nodo: Point exacto; via/relacion con `center`: Point (centro aproximado);
 * - puente (via con `geometry`): LineString.
 * @returns {{geometry: Object, aproximada: boolean} | null}
 */
export function geometriaDe(e, clase) {
  if (clase === "puente") {
    if (!Array.isArray(e.geometry) || e.geometry.length < 2) return null;
    return {
      geometry: { type: "LineString", coordinates: e.geometry.map((p) => [p.lon, p.lat]) },
      aproximada: false,
    };
  }
  if (e.type === "relation" && e.bounds) {
    const { minlat, maxlat, minlon, maxlon } = e.bounds;
    return {
      geometry: { type: "Point", coordinates: [(minlon + maxlon) / 2, (minlat + maxlat) / 2] },
      aproximada: true,
    };
  }
  if (Number.isFinite(e.lat) && Number.isFinite(e.lon)) {
    return { geometry: { type: "Point", coordinates: [e.lon, e.lat] }, aproximada: false };
  }
  if (e.center) {
    return {
      geometry: { type: "Point", coordinates: [e.center.lon, e.center.lat] },
      aproximada: true,
    };
  }
  return null;
}

/** Descarga (o relee) el crudo y lo devuelve junto con su fecha. */
async function obtenerCrudo(sinRed) {
  if (sinRed) {
    const crudo = JSON.parse(await readFile(RUTA_CRUDO, "utf8"));
    console.log(`Crudo reutilizado: ${RUTA_CRUDO} (mirror ${crudo._mirror}, ${crudo._fecha})`);
    return crudo;
  }
  const { json, mirror } = await consultarOverpass(CONSULTA, true);
  console.log(`Overpass respondio: ${mirror}`);
  const crudo = {
    _fecha: new Date().toISOString().slice(0, 10),
    _mirror: mirror,
    _caja: CIUDAD_BOLIVAR_CAJA,
    _licencia: "OpenStreetMap contributors, ODbL 1.0",
    osm3s: json.osm3s,
    elements: json.elements,
  };
  await mkdir(dirname(RUTA_CRUDO), { recursive: true });
  await writeFile(RUTA_CRUDO, JSON.stringify(crudo, null, 2));
  return crudo;
}

/** Convierte el crudo en features de servicios, y lista lo excluido. */
function construirServicios(crudo) {
  const fecha = crudo._fecha;
  const fuente = `OpenStreetMap contributors (ODbL), consulta Overpass ${fecha}`;
  // El puente aparece dos veces si tambien cae en la caja: gana la copia con geometria.
  const porClave = new Map();
  for (const e of crudo.elements) {
    const previo = porClave.get(claveOsm(e));
    if (!previo || (e.geometry && !previo.geometry)) porClave.set(claveOsm(e), e);
  }

  const features = [];
  const excluidos = [];
  for (const e of porClave.values()) {
    const clase = claseDe(e);
    if (!clase) {
      excluidos.push({ motivo: "sin clase", e });
      continue;
    }
    if (clase === "educacion_superior" && esEducacionNoSuperior(e.tags?.name)) {
      excluidos.push({ motivo: "educacion no superior (prefijo de nombre)", e });
      continue;
    }
    const geo = geometriaDe(e, clase);
    if (!geo) {
      excluidos.push({ motivo: "sin geometria", e });
      continue;
    }
    const propiedades = {
      id: idMapa(e),
      nombre: e.tags?.name ?? null,
      clase,
      sector: "servicios",
      osm_url: `https://www.openstreetmap.org/${claveOsm(e)}`,
      fuente,
      // OSM es colaborativo y sin auditar; los servicios se eligen por etiqueta.
      confianza: "media",
      ultima_verificacion: fecha,
    };
    propiedades.geom_precision = geo.aproximada ? "centro_aproximado" : "exacta";
    features.push({ type: "Feature", geometry: geo.geometry, properties: propiedades });
  }
  features.sort((a, b) => a.properties.id.localeCompare(b.properties.id));
  return { features, excluidos };
}

/** Iniciativas con `ubicacion.osm`: la geometria sale del elemento descargado. */
async function construirIniciativas(crudo) {
  const semilla = JSON.parse(await readFile(RUTA_SEMILLA, "utf8"));
  const porClave = new Map(crudo.elements.map((e) => [claveOsm(e), e]));
  const features = [];
  const sinUbicacion = [];
  for (const ini of semilla.iniciativas) {
    const clave = ini.ubicacion?.osm;
    if (!clave) {
      sinUbicacion.push(ini.id);
      continue;
    }
    const e = porClave.get(clave);
    const geo = e ? geometriaDe(e, claseDe(e)) : null;
    if (!geo) {
      throw new Error(`${ini.id}: ${clave} no esta en el crudo de OSM; no se inventa la coordenada`);
    }
    features.push({
      type: "Feature",
      geometry: geo.geometry,
      properties: {
        id: ini.id,
        nombre: ini.nombre,
        tipo: ini.tipo,
        resumen: ini.resumen,
        ...(ini.fechas ? { fechas: ini.fechas } : {}),
        // El contenido es del organizador y se rotula asi en la interfaz.
        fuente: ini.fuente,
        fecha_fuente: ini.fecha_fuente,
        ubicacion_osm: clave,
        // "alta" vale solo para la ubicacion (un elemento OSM identificado por id).
        confianza: "alta",
        ultima_verificacion: crudo._fecha,
        geom_precision: geo.aproximada ? "centro_aproximado" : "exacta",
      },
    });
  }
  return { features, sinUbicacion };
}

const coleccion = (features) => ({ type: "FeatureCollection", features });
const escribir = (nombre, datos) =>
  writeFile(join(SALIDA, nombre), JSON.stringify(datos, null, 2));

async function main() {
  const sinRed = process.argv.includes("--sin-red");
  console.log("Capa Ciudad Bolivar (OpenStreetMap, ODbL)\n");
  const crudo = await obtenerCrudo(sinRed);

  const { features, excluidos } = construirServicios(crudo);
  const iniciativas = await construirIniciativas(crudo);

  // Conteo por clase y control previo al filtro de educacion.
  const porClase = Object.fromEntries(CLASES_CIUDAD.map((c) => [c, 0]));
  for (const f of features) porClase[f.properties.clase] += 1;
  const eduAntes = porClase.educacion_superior +
    excluidos.filter((x) => x.motivo.startsWith("educacion")).length;
  console.log("\nServicios por clase:");
  for (const [c, n] of Object.entries(porClase)) console.log(`  ${c.padEnd(20)} ${n}`);
  console.log(`  total ${features.length}; sin nombre en OSM: ${features.filter((f) => f.properties.nombre === null).length}`);
  console.log(`  control: university+college antes del filtro = ${eduAntes}`);

  console.log(`\nExcluidos (${excluidos.length}), para revision humana:`);
  for (const { motivo, e } of excluidos) {
    console.log(`  - ${claveOsm(e)}  "${e.tags?.name ?? "(sin nombre)"}"  [${motivo}]  ` +
      `amenity=${e.tags?.amenity ?? "—"} aeroway=${e.tags?.aeroway ?? "—"}`);
  }

  console.log(`\nIniciativas con ubicacion: ${iniciativas.features.length}; ` +
    `sin ubicacion (solo panel): ${iniciativas.sinUbicacion.join(", ") || "ninguna"}`);

  const campos = JSON.parse(await readFile(join(SALIDA, "campos.geojson"), "utf8")).features;
  const anillos = contarPorAnillo(CENTRO_CIUDAD_BOLIVAR, campos, ANILLOS_KM);
  const sede = features.find((f) => f.properties.id === ID_SEDE_EXPOFAJA);
  if (!sede) throw new Error(`La sede ${ID_SEDE} no esta en el crudo`);
  const cercanos = camposMasCercanos(sede.geometry.coordinates, campos, 5);

  console.log(`\nCampos GEM dentro de cada anillo (de ${campos.length}), desde el centro:`);
  for (const a of anillos) console.log(`  ${String(a.km).padStart(3)} km: ${a.campos}`);
  console.log("\n5 campos mas cercanos a la sede (km al vertice mas cercano):");
  for (const c of cercanos) console.log(`  ${c.km.toFixed(1).padStart(5)}  ${c.nombre}  (${c.id})`);

  const resumen = {
    generado: crudo._fecha,
    centro: { nombre: NOMBRE_CIUDAD, osm: "relation/14534562", ...CENTRO_CIUDAD_BOLIVAR },
    anillos,
    total_campos: campos.length,
    cercanos_a: { nombre: sede.properties.nombre, id: sede.properties.id },
    campos_mas_cercanos: cercanos.map((c) => ({ ...c, km: Math.round(c.km * 10) / 10 })),
    servicios_por_clase: porClase,
    metodo: "Linea recta (haversine, R = 6371,0088 km) al vertice mas cercano de cada campo GEM GOGET marzo 2026. No es distancia por carretera.",
    fuentes: [
      "OpenStreetMap contributors (ODbL)",
      "Global Energy Monitor, GOGET marzo 2026 (CC BY 4.0)",
    ],
  };

  await mkdir(SALIDA, { recursive: true });
  await escribir("ciudad-bolivar-osm.geojson", coleccion(features));
  await escribir("iniciativas-ccieb.geojson", coleccion(iniciativas.features));
  await escribir("ciudad-bolivar-resumen.json", resumen);

  console.log("\nGenerado:");
  for (const n of ["ciudad-bolivar-osm.geojson", "iniciativas-ccieb.geojson", "ciudad-bolivar-resumen.json"]) {
    const bytes = (await readFile(join(SALIDA, n))).length;
    console.log(`  ${n.padEnd(30)} ${(bytes / 1024).toFixed(1)} KB`);
  }
  console.log('\nRecordatorio ODbL: citar "© OpenStreetMap contributors" en la interfaz.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
