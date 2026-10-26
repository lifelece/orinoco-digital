/**
 * descargar-fuentes.mjs — Descarga los datasets de acceso abierto (sin registro).
 *
 * Uso:  node scripts/descargar-fuentes.mjs
 *
 * Descarga a data/raw/, que NO se versiona. La transformacion a GeoJSON curado
 * en public/data/ es un paso aparte y deliberado: nada entra al mapa sin pasar
 * por revision y sin quedar registrado en docs/DATA_SOURCES.md.
 *
 * Los datasets que exigen registro o aceptar terminos (Global Energy Monitor,
 * VIIRS Nightfire de EOG) NO se descargan aqui. Ver docs/DATA_SOURCES.md.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "data", "raw");

// Varios mirrors: si uno esta caido o saturado, se prueba el siguiente.
// Orden por fiabilidad observada en septiembre 2026: el mirror principal
// (overpass-api.de) rechazaba la conexion mientras kumi.systems respondia bien.
export const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  // 2026-10-12: kumi.systems dio timeout y overpass-api.de corto la conexion;
  // este mirror respondio.
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// Overpass rechaza con HTTP 406 las peticiones sin User-Agent identificable.
// Es su politica anti-abuso: identifica tu proyecto y deja un contacto.
export const USER_AGENT =
  "orinoco-digital/0.1 (https://github.com/lifelece/orinoco-digital)";

/**
 * Consultas Overpass acotadas a Venezuela. Datos OSM, licencia ODbL.
 * Exportadas para scripts/actualizar-datos.mjs.
 */
export const CONSULTAS_OSM = {
  "osm-pozos.json": `
    [out:json][timeout:180];
    area["ISO3166-1"="VE"][admin_level=2]->.ve;
    node["man_made"="petroleum_well"](area.ve);
    out body;`,

  "osm-ductos.json": `
    [out:json][timeout:300];
    area["ISO3166-1"="VE"][admin_level=2]->.ve;
    way["man_made"="pipeline"](area.ve);
    out geom;`,

  "osm-refinerias.json": `
    [out:json][timeout:180];
    area["ISO3166-1"="VE"][admin_level=2]->.ve;
    (
      node["industrial"="oil"](area.ve);
      way["industrial"="oil"](area.ve);
      node["man_made"="works"]["product"~"oil|petroleum|fuel",i](area.ve);
      way["man_made"="works"]["product"~"oil|petroleum|fuel",i](area.ve);
    );
    out center;`,

  // Segunda consulta de refinerias (docs/DATA_SOURCES.md seccion 11): la primera
  // no devuelve Amuay, El Palito ni Punta Cardon. Trae todo man_made=works y lo
  // filtra osm-to-geojson (esRelevante). SIN VERIFICAR: la consulta original de
  // 2026-09-08 no quedo guardada; esta es su reconstruccion, y el informe de
  // actualizacion compara el resultado contra el crudo anterior.
  "osm-refinerias-2.json": `
    [out:json][timeout:180];
    area["ISO3166-1"="VE"][admin_level=2]->.ve;
    (
      nwr["man_made"="works"](area.ve);
      nwr["industrial"~"^(oil|refinery)$"](area.ve);
      nwr["name"~"refiner|Amuay|Palito|Cardon|Cardón",i](area.ve);
    );
    out center;`,

  "osm-terminales.json": `
    [out:json][timeout:180];
    area["ISO3166-1"="VE"][admin_level=2]->.ve;
    (
      node["man_made"="storage_tank"]["content"~"oil|fuel|gas",i](area.ve);
      way["man_made"="storage_tank"]["content"~"oil|fuel|gas",i](area.ve);
      node["industrial"="port"](area.ve);
      way["industrial"="port"](area.ve);
    );
    out center;`,
};

/** Archivos directos, sin registro. */
const DESCARGAS_DIRECTAS = [
  {
    nombre: "usgs-fs-2009-3028-orinoco-oil-belt.pdf",
    url: "https://pubs.usgs.gov/fs/2009/3028/pdf/FS09-3028.pdf",
    nota: "USGS Fact Sheet 2009-3028. Dominio publico. Petrofisica de la Faja.",
  },
];

async function guardar(nombre, contenido) {
  const ruta = join(DESTINO, nombre);
  await writeFile(ruta, contenido);
  const kb = Math.round(
    (Buffer.isBuffer(contenido) ? contenido.length : Buffer.byteLength(contenido)) / 1024
  );
  console.log(`  OK  ${nombre}  (${kb} KB)`);
}

/**
 * Tiempo maximo de espera del cliente para una consulta: el [timeout:N] que la
 * propia consulta le concede al servidor, mas 30 s de margen de red. Con un
 * limite fijo menor (antes 60 s) cortabamos consultas que Overpass aun estaba
 * resolviendo en dias de saturacion (2026-10-13, osm-refinerias-2.json).
 * @param {string} consulta
 * @returns {number} milisegundos
 */
export function limiteCliente(consulta) {
  const servidor = Number(/\[timeout:(\d+)\]/.exec(consulta)?.[1] ?? 60);
  return (servidor + 30) * 1000;
}

/** Marca de un fallo que no es culpa del codigo ni de los datos: Overpass caido. */
export const OVERPASS_NO_DISPONIBLE = "OVERPASS_NO_DISPONIBLE";

/**
 * True si el error es "todos los mirrors caidos" (red, timeout, HTTP 5xx o 429).
 * El workflow semanal lo trata como aviso, no como fallo: los datos no cambian
 * y se reintenta la semana siguiente. Todo lo demas sigue siendo un error.
 */
export function esCaidaExterna(error) {
  return error?.code === OVERPASS_NO_DISPONIBLE;
}

/** Un HTTP es caida del servicio (reintentable) si es 5xx o 429; el resto de 4xx es un bug nuestro. */
const statusExterno = (status) => status >= 500 || status === 429;

/**
 * Consulta Overpass rotando los mirrors. Devuelve el JSON y el host que respondio.
 * Si TODOS fallan por red, timeout, 5xx o 429, lanza un error con
 * `code: OVERPASS_NO_DISPONIBLE`; cualquier otro fallo lanza un Error normal.
 * Exportada para que otros scripts de datos reutilicen los mismos mirrors.
 */
export async function consultarOverpass(consulta, conMirror = false) {
  let ultimoError = "sin intentos";
  let todosExternos = true;
  for (const endpoint of OVERPASS_MIRRORS) {
    const host = new URL(endpoint).host;
    let respuesta;
    try {
      respuesta = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: consulta }),
        // Un mirror caido puede no responder nunca: sin limite, el script se cuelga.
        signal: AbortSignal.timeout(limiteCliente(consulta)),
      });
    } catch (error) {
      // Sin respuesta (conexion rechazada, DNS, timeout): el mirror esta caido.
      ultimoError = `${error.message} en ${host}`;
      continue;
    }
    if (!respuesta.ok) {
      ultimoError = `HTTP ${respuesta.status} en ${host}`;
      if (!statusExterno(respuesta.status)) todosExternos = false;
      continue;
    }
    try {
      const json = await respuesta.json();
      return conMirror ? { json, mirror: host } : json;
    } catch (error) {
      // HTTP 200 con cuerpo ilegible: no es una caida, es una respuesta rara.
      ultimoError = `respuesta no valida (${error.message}) en ${host}`;
      todosExternos = false;
    }
  }
  const error = new Error(ultimoError);
  if (todosExternos) error.code = OVERPASS_NO_DISPONIBLE;
  throw error;
}

async function descargarOSM() {
  console.log("\nOpenStreetMap via Overpass API (licencia ODbL):");
  for (const [nombre, consulta] of Object.entries(CONSULTAS_OSM)) {
    try {
      const json = await consultarOverpass(consulta);
      console.log(`       ${json.elements?.length ?? 0} elementos`);
      await guardar(nombre, JSON.stringify(json, null, 2));
    } catch (error) {
      console.log(`  FALLO  ${nombre}: ${error.message}`);
    }
    // Overpass es un servicio publico y gratuito. No lo satures.
    await new Promise((r) => setTimeout(r, 4000));
  }
}

async function descargarDirectas() {
  console.log("\nDescargas directas:");
  for (const item of DESCARGAS_DIRECTAS) {
    try {
      const respuesta = await fetch(item.url, { redirect: "follow" });
      if (!respuesta.ok) {
        console.log(`  FALLO  ${item.nombre}: HTTP ${respuesta.status}`);
        continue;
      }
      const buffer = Buffer.from(await respuesta.arrayBuffer());
      await guardar(item.nombre, buffer);
    } catch (error) {
      console.log(`  FALLO  ${item.nombre}: ${error.message}`);
    }
  }
}

// Solo se ejecuta como script: otros scripts importan los mirrors sin disparar
// las descargas.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(DESTINO, { recursive: true });
  console.log(`Destino: ${DESTINO}`);
  await descargarDirectas();
  await descargarOSM();
  console.log(
    "\nListo. Recuerda: estos son datos CRUDOS. Antes de que entren al mapa hay que\n" +
      "verificar su CRS, transformarlos a WGS84 y registrarlos en docs/DATA_SOURCES.md."
  );
}
