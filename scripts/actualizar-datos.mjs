/**
 * actualizar-datos.mjs — Verificacion periodica de las capas de OpenStreetMap.
 *
 * Uso:  npm run data:actualizar
 *       npm run data:actualizar -- --forzar    (acepta caidas de mas del 30 %)
 *
 * Orquesta, sin dependencias:
 *   1. descarga las consultas Overpass de scripts/descargar-fuentes.mjs a una
 *      carpeta temporal (si TODOS los mirrors fallan, sale con error y no toca nada);
 *   2. regenera con osm-to-geojson y ciudad-bolivar-to-geojson;
 *   3. pone FECHA_DATOS (src/config.js) en la fecha del dia;
 *   4. valida con validate-geojson;
 *   5. escribe data/raw/informe-actualizacion.md (conteos antes/despues e ids
 *      anadidos y quitados).
 *
 * Static-first (ADR-003): este script NO publica nada. Deja cambios en el
 * arbol de trabajo; el workflow datos-semanal.yml los sube a un PR y Luis
 * mergea. Si algo falla despues de empezar a escribir, restaura public/data y
 * src/config.js tal como estaban.
 *
 * GEM GOGET no se actualiza aqui: exige formulario (docs/DATA_SOURCES.md s.3).
 */

import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { consultarOverpass, CONSULTAS_OSM } from "./descargar-fuentes.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CRUDO = join(RAIZ, "data", "raw");
const TEMPORAL = join(CRUDO, ".nuevo");
const SALIDA = join(RAIZ, "public", "data");
const CONFIG = join(RAIZ, "src", "config.js");
const INFORME = join(CRUDO, "informe-actualizacion.md");

/** Caida relativa de entidades que se considera sospechosa de una descarga incompleta. */
export const UMBRAL_CAIDA = 0.3;
const MAX_LISTADOS = 20;

/** Capas que regeneran los scripts. */
const CAPAS = [
  "ductos-osm.geojson",
  "downstream-osm.geojson",
  "ciudad-bolivar-osm.geojson",
  "iniciativas-ccieb.geojson",
];
const ARCHIVOS_SALIDA = [...CAPAS, "ciudad-bolivar-resumen.json"];

/**
 * Resume una FeatureCollection como mapa id -> nombre.
 * @param {?Object} coleccion
 * @returns {Map<string, ?string>}
 */
export function indexarFeatures(coleccion) {
  const mapa = new Map();
  for (const f of coleccion?.features ?? []) {
    const id = f.properties?.id ?? f.id;
    if (id !== undefined) mapa.set(String(id), f.properties?.nombre ?? null);
  }
  return mapa;
}

/**
 * Compara dos indices de features.
 * @param {Map<string, ?string>} antes
 * @param {Map<string, ?string>} despues
 * @returns {{antes: number, despues: number, anadidos: Array, quitados: Array}}
 */
export function compararIndices(antes, despues) {
  const anadidos = [...despues].filter(([id]) => !antes.has(id));
  const quitados = [...antes].filter(([id]) => !despues.has(id));
  return { antes: antes.size, despues: despues.size, anadidos, quitados };
}

/**
 * Capas cuyo conteo cayo mas que el umbral.
 * @param {Object<string, {antes: number, despues: number}>} comparacion
 * @param {number} [umbral]
 * @returns {string[]} nombres de archivo
 */
export function capasConCaida(comparacion, umbral = UMBRAL_CAIDA) {
  return Object.entries(comparacion)
    .filter(([, c]) => c.antes > 0 && (c.antes - c.despues) / c.antes > umbral)
    .map(([nombre]) => nombre);
}

const lineaEntidad = ([id, nombre]) => `\`${id}\`${nombre ? ` ${nombre}` : ""}`;

function listado(titulo, items) {
  if (items.length === 0) return [];
  const lineas = [`**${titulo} (${items.length})**`, ""];
  for (const it of items.slice(0, MAX_LISTADOS)) lineas.push(`- ${lineaEntidad(it)}`);
  if (items.length > MAX_LISTADOS) lineas.push(`- ... y ${items.length - MAX_LISTADOS} mas`);
  return [...lineas, ""];
}

/**
 * Redacta el informe Markdown de la actualizacion.
 * @param {Object} datos
 * @param {string} datos.fecha AAAA-MM-DD
 * @param {Object} datos.comparacion archivo -> resultado de compararIndices
 * @param {Object} datos.clasesAntes servicios_por_clase antes
 * @param {Object} datos.clasesDespues servicios_por_clase despues
 * @param {string[]} datos.alertas capas con caida sospechosa
 * @param {string} datos.mirrors hosts que respondieron
 * @returns {string}
 */
export function redactarInforme({ fecha, comparacion, clasesAntes, clasesDespues, alertas, mirrors }) {
  const l = [`## Datos: verificacion del ${fecha} (OpenStreetMap)`, ""];
  if (alertas.length) {
    l.push(`> **ALERTA:** caida de mas del ${UMBRAL_CAIDA * 100} % en: ${alertas.join(", ")}. ` +
      "Probable descarga incompleta de Overpass. No mergear sin revisar.", "");
  }
  l.push(`Fuente: OpenStreetMap contributors (ODbL), consulta Overpass del ${fecha} (${mirrors}). ` +
    `\`FECHA_DATOS\` pasa a \`${fecha}\`. GEM GOGET no se actualiza aqui (formulario manual).`, "");
  l.push("### Conteos por archivo", "", "| Archivo | Antes | Despues | Diferencia |", "|---|---:|---:|---:|");
  for (const [nombre, c] of Object.entries(comparacion)) {
    const d = c.despues - c.antes;
    l.push(`| \`${nombre}\` | ${c.antes} | ${c.despues} | ${d > 0 ? "+" : ""}${d} |`);
  }
  l.push("");
  const clases = [...new Set([...Object.keys(clasesAntes), ...Object.keys(clasesDespues)])];
  if (clases.length) {
    l.push("Servicios de Ciudad Bolivar por clase (antes -> despues): " +
      clases.map((c) => `${c} ${clasesAntes[c] ?? 0}->${clasesDespues[c] ?? 0}`).join(", "), "");
  }
  l.push("### Cambios de entidades", "");
  let hayCambios = false;
  for (const [nombre, c] of Object.entries(comparacion)) {
    if (!c.anadidos.length && !c.quitados.length) continue;
    hayCambios = true;
    l.push(`#### \`${nombre}\``, "", ...listado("Anadidos", c.anadidos), ...listado("Quitados", c.quitados));
  }
  if (!hayCambios) l.push("Sin entidades nuevas ni quitadas: solo cambian `ultima_verificacion` y `FECHA_DATOS`.", "");
  l.push("### Checklist de revision", "",
    "- [ ] Los conteos y la lista de quitados son razonables (sin caidas bruscas).",
    "- [ ] Los anadidos de `downstream-osm.geojson` son de hidrocarburos (cuidado con falsos positivos tipo \"Velas 3N\", `docs/DATA_SOURCES.md` s.11).",
    "- [ ] Ninguna entidad conocida (Amuay, El Palito, Punta Cardon) desaparecio.",
    "- [ ] `npm test` verde (corre en el job antes de abrir este PR).",
    "- [ ] Merge = deploy: revisado por Luis.", "");
  return l.join("\n");
}

async function leerJson(ruta) {
  try {
    return JSON.parse(await readFile(ruta, "utf8"));
  } catch {
    return null;
  }
}

function fechaHoy() {
  return process.env.DATOS_FECHA ?? new Date().toISOString().slice(0, 10);
}

/** Ejecuta un script de Node y devuelve su salida; lanza si termina con error. */
function correr(args) {
  const r = spawnSync(process.execPath, args, {
    cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, OSM_FECHA: fechaHoy() },
  });
  if (r.status !== 0) throw new Error(`${args.join(" ")} fallo:\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
}

/** Overpass satura a menudo: se repite la ronda de mirrors antes de rendirse. */
async function consultarConReintentos(nombre, consulta, rondas = 3) {
  let ultimo = "sin intentos";
  for (let i = 1; i <= rondas; i++) {
    try {
      const r = await consultarOverpass(consulta, true);
      if (!Array.isArray(r.json.elements)) throw new Error("respuesta sin elements[]");
      return r;
    } catch (error) {
      ultimo = error.message;
      console.log(`  ronda ${i}/${rondas} fallo: ${ultimo}`);
      if (i < rondas) await new Promise((res) => setTimeout(res, 30000));
    }
  }
  throw new Error(`Overpass fallo en todos los mirrors para ${nombre}: ${ultimo}. No se toco nada.`);
}

/** Descarga las consultas a la carpeta temporal. Lanza si alguna falla. */
async function descargarTodo() {
  await rm(TEMPORAL, { recursive: true, force: true });
  await mkdir(TEMPORAL, { recursive: true });
  const mirrors = new Set();
  for (const [nombre, consulta] of Object.entries(CONSULTAS_OSM)) {
    console.log(`Descargando ${nombre}...`);
    const { json, mirror } = await consultarConReintentos(nombre, consulta);
    mirrors.add(mirror);
    await writeFile(join(TEMPORAL, nombre), JSON.stringify(json, null, 2));
    console.log(`  ${json.elements.length} elementos (${mirror})`);
    await new Promise((r) => setTimeout(r, 4000)); // servicio publico: no saturar
  }
  return [...mirrors].join(", ");
}

async function promover() {
  for (const nombre of Object.keys(CONSULTAS_OSM)) {
    await rename(join(TEMPORAL, nombre), join(CRUDO, nombre));
  }
  await rm(TEMPORAL, { recursive: true, force: true });
}

async function main() {
  const forzar = process.argv.includes("--forzar");
  const fecha = fechaHoy();
  await mkdir(CRUDO, { recursive: true });

  // Copia de seguridad: ante cualquier fallo posterior se restaura tal cual.
  const respaldo = new Map();
  for (const n of ARCHIVOS_SALIDA) respaldo.set(join(SALIDA, n), await readFile(join(SALIDA, n)).catch(() => null));
  respaldo.set(CONFIG, await readFile(CONFIG));
  const antes = {};
  for (const n of CAPAS) antes[n] = indexarFeatures(await leerJson(join(SALIDA, n)));
  const clasesAntes = (await leerJson(join(SALIDA, "ciudad-bolivar-resumen.json")))?.servicios_por_clase ?? {};

  const mirrors = await descargarTodo(); // si falla aqui, no se ha tocado nada

  try {
    await promover();
    correr(["scripts/osm-to-geojson.mjs"]);
    correr(["--import", "./test/entorno.mjs", "scripts/ciudad-bolivar-to-geojson.mjs"]);
    const config = (await readFile(CONFIG, "utf8"))
      .replace(/export const FECHA_DATOS = "[^"]*";/, `export const FECHA_DATOS = "${fecha}";`);
    await writeFile(CONFIG, config);
    correr(["scripts/validate-geojson.mjs"]);

    const comparacion = {};
    for (const n of CAPAS) comparacion[n] = compararIndices(antes[n], indexarFeatures(await leerJson(join(SALIDA, n))));
    const clasesDespues = (await leerJson(join(SALIDA, "ciudad-bolivar-resumen.json"))).servicios_por_clase;
    const alertas = capasConCaida(comparacion);
    await writeFile(INFORME, redactarInforme({ fecha, comparacion, clasesAntes, clasesDespues, alertas, mirrors }));
    console.log(`Informe: ${INFORME}`);
    if (alertas.length && !forzar) {
      throw new Error(`Caida de mas del ${UMBRAL_CAIDA * 100} % en ${alertas.join(", ")}. ` +
        "Se restauran los datos; revisa el informe o repite con --forzar.");
    }
  } catch (error) {
    for (const [ruta, contenido] of respaldo) if (contenido) await writeFile(ruta, contenido);
    throw error;
  }
  console.log(`Listo. FECHA_DATOS = ${fecha}. Revisa el informe antes de abrir el PR.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`\nERROR: ${error.message}`);
    process.exitCode = 1;
  });
}
