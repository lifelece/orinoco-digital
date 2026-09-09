/**
 * osm-to-geojson.mjs — Convierte las descargas de OpenStreetMap a GeoJSON.
 *
 * Genera las capas midstream y downstream de la Fase 3:
 *   public/data/ductos-osm.geojson      LineString
 *   public/data/downstream-osm.geojson  Point
 *
 * ODbL: OpenStreetMap es share-alike sobre bases de datos. Por eso estas capas
 * viven en archivos SEPARADOS con sufijo -osm y no se fusionan con el resto del
 * dataset. Ver docs/DATA_SOURCES.md seccion 4.
 *
 * Uso:  node scripts/osm-to-geojson.mjs
 * Requiere las descargas previas de scripts/descargar-fuentes.mjs.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CRUDO = join(RAIZ, "data", "raw");
const SALIDA = join(RAIZ, "public", "data");

const FUENTE = "OpenStreetMap contributors (ODbL), consulta Overpass 2026-09-08";
const FECHA = "2026-09-08";

/** Sustancias que SI son de nuestro sector. */
const SUSTANCIAS_VALIDAS = ["oil", "gas", "hydrocarbons", "fuel"];

/** Radio de agrupacion de tanques, en grados (~1,5 km en esta latitud). */
const RADIO_AGRUPACION = 0.0135;

const leer = async (nombre) => {
  try {
    return JSON.parse(await readFile(join(CRUDO, nombre), "utf8"));
  } catch {
    console.warn(`  aviso: falta ${nombre}, se omite`);
    return { elements: [] };
  }
};

/** Punto representativo de un elemento OSM (nodo, o centro de una via). */
function posicion(e) {
  if (Number.isFinite(e.lat) && Number.isFinite(e.lon)) return [e.lon, e.lat];
  if (e.center) return [e.center.lon, e.center.lat];
  return null;
}

// --- 1. Ductos ---------------------------------------------------------------

/**
 * Los ductos de OSM incluyen agua y alcantarillado. Un acueducto no es
 * infraestructura petrolera: pintarlo como tal seria un error de datos.
 * Y un ducto sin `substance` no es verificablemente de hidrocarburos, asi que
 * tampoco entra: no se afirma lo que no se puede sostener.
 */
async function construirDuctos() {
  const datos = await leer("osm-ductos.json");
  const descartes = { agua: 0, sinSustancia: 0, sinGeometria: 0 };
  const features = [];

  for (const e of datos.elements) {
    const sustancia = e.tags?.substance;

    if (!sustancia) {
      descartes.sinSustancia += 1;
      continue;
    }
    if (!SUSTANCIAS_VALIDAS.includes(sustancia)) {
      descartes.agua += 1;
      continue;
    }
    if (!Array.isArray(e.geometry) || e.geometry.length < 2) {
      descartes.sinGeometria += 1;
      continue;
    }

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: e.geometry.map((p) => [p.lon, p.lat]),
      },
      properties: {
        id: `OSM-W${e.id}`,
        nombre: e.tags.name ?? null,
        tipo: "ducto",
        sector: "midstream",
        fluido: sustancia,
        estado: "desconocido",
        operadora: e.tags.operator ?? null,
        diametro: e.tags.diameter ?? null,
        ubicacion: e.tags.location ?? null,
        fuente: FUENTE,
        // OSM es colaborativo y sin auditar: el techo es baja.
        confianza: "baja",
        ultima_verificacion: FECHA,
      },
    });
  }

  return { features, descartes };
}

// --- 2. Downstream: refinerias, petroquimicas, plantas, puertos --------------

/**
 * Clasifica una instalacion por sus etiquetas y su nombre.
 *
 * El nombre importa tanto como la etiqueta: el Centro de Refinacion Paraguana
 * —Punta Cardon, de los mayores complejos refinadores del mundo— viene
 * etiquetado solo como `industrial=oil`. Buscar "refiner" no basta en espanol:
 * hay que cubrir tambien "refinacion" y "refineria".
 */
function clasificar(tags) {
  const nombre = (tags.name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

  if (tags.industrial === "refinery" || /refiner|refinac/.test(nombre))
    return "refineria";
  if (/petroqu/.test(nombre)) return "petroquimica";
  if (tags.industrial === "port" || /puerto|muelle|terminal maritim/.test(nombre))
    return "puerto";
  if (/planta de gas|gas plant|planta.*lng/.test(nombre)) return "planta_gas";
  return "instalacion";
}

/**
 * Se excluyen centrales electricas y zonas francas: estan etiquetadas como
 * industria pero no son parte de la cadena de hidrocarburos. Incluirlas
 * inflaria la capa con activos que no lo son.
 */
function esRelevante(tags) {
  if (tags.power === "plant" || tags.power === "generator") return false;
  if (/zona franca/i.test(tags.name ?? "")) return false;
  return true;
}

async function construirDownstream() {
  const fuentes = [
    await leer("osm-refinerias.json"),
    await leer("osm-refinerias-2.json"),
    await leer("osm-terminales.json"),
  ];

  const vistos = new Set();
  const features = [];
  const descartes = { noRelevante: 0, sinNombre: 0, sinPosicion: 0, duplicado: 0 };

  for (const datos of fuentes) {
    for (const e of datos.elements) {
      const tags = e.tags ?? {};

      // Los tanques sueltos se tratan aparte, agrupados.
      if (tags.man_made === "storage_tank") continue;

      const clave = `${e.type}${e.id}`;
      if (vistos.has(clave)) {
        descartes.duplicado += 1;
        continue;
      }

      if (!esRelevante(tags)) {
        descartes.noRelevante += 1;
        continue;
      }
      // Una instalacion sin nombre no es identificable ni verificable.
      if (!tags.name) {
        descartes.sinNombre += 1;
        continue;
      }

      const pos = posicion(e);
      if (!pos) {
        descartes.sinPosicion += 1;
        continue;
      }

      vistos.add(clave);
      const tipo = clasificar(tags);

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: pos },
        properties: {
          id: `OSM-${e.type[0].toUpperCase()}${e.id}`,
          nombre: tags.name,
          tipo,
          // Refinerias, petroquimicas, plantas de gas y puertos son el final
          // de la cadena. Los parques de tanques son midstream y se generan
          // aparte, en construirTerminales().
          sector: "downstream",
          fluido: tags.product ?? tags.refinery ?? null,
          estado: "desconocido",
          operadora: tags.operator ?? null,
          notas: tags.wikidata ? `wikidata:${tags.wikidata}` : null,
          fuente: FUENTE,
          confianza: "baja",
          ultima_verificacion: FECHA,
        },
      });
    }
  }

  return { features, descartes };
}

// --- 3. Tanques agrupados en terminales --------------------------------------

/**
 * Un tanque de almacenamiento suelto no es un activo informativo a escala de
 * pais, y hay 1.856 de ellos. Se agrupan por proximidad en "parques de
 * tanques", que si lo son.
 *
 * ATENCION: el resultado es un dato DERIVADO, no una entidad que exista en
 * OSM. La propiedad `n_tanques` y la nota lo dejan explicito, y el punto es el
 * centroide del grupo, no la ubicacion de nada concreto.
 */
async function construirTerminales() {
  const datos = await leer("osm-terminales.json");

  const tanques = [];
  const descartes = { agua: 0, sinContenido: 0, sinPosicion: 0 };

  for (const e of datos.elements) {
    if (e.tags?.man_made !== "storage_tank") continue;
    const contenido = e.tags.content;
    if (!contenido) {
      descartes.sinContenido += 1;
      continue;
    }
    if (!SUSTANCIAS_VALIDAS.includes(contenido)) {
      descartes.agua += 1;
      continue;
    }
    const pos = posicion(e);
    if (!pos) {
      descartes.sinPosicion += 1;
      continue;
    }
    tanques.push({ pos, contenido, operadora: e.tags.operator ?? null });
  }

  // Agrupacion por enlace simple sobre una rejilla, para no comparar todos
  // contra todos.
  const celda = (p) =>
    `${Math.floor(p[0] / RADIO_AGRUPACION)},${Math.floor(p[1] / RADIO_AGRUPACION)}`;
  const rejilla = new Map();
  tanques.forEach((t, i) => {
    const k = celda(t.pos);
    if (!rejilla.has(k)) rejilla.set(k, []);
    rejilla.get(k).push(i);
  });

  const asignado = new Array(tanques.length).fill(false);
  const grupos = [];

  for (let i = 0; i < tanques.length; i += 1) {
    if (asignado[i]) continue;
    const grupo = [i];
    asignado[i] = true;
    const cola = [i];

    while (cola.length) {
      const actual = tanques[cola.pop()];
      const [cx, cy] = celda(actual.pos).split(",").map(Number);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (const j of rejilla.get(`${cx + dx},${cy + dy}`) ?? []) {
            if (asignado[j]) continue;
            const d = Math.hypot(
              tanques[j].pos[0] - actual.pos[0],
              tanques[j].pos[1] - actual.pos[1]
            );
            if (d <= RADIO_AGRUPACION) {
              asignado[j] = true;
              grupo.push(j);
              cola.push(j);
            }
          }
        }
      }
    }
    grupos.push(grupo);
  }

  const features = grupos.map((grupo, i) => {
    const miembros = grupo.map((k) => tanques[k]);
    const lng = miembros.reduce((a, t) => a + t.pos[0], 0) / miembros.length;
    const lat = miembros.reduce((a, t) => a + t.pos[1], 0) / miembros.length;
    const operadoras = [...new Set(miembros.map((t) => t.operadora).filter(Boolean))];
    const contenidos = [...new Set(miembros.map((t) => t.contenido))];

    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: `OSM-TANQUES-${String(i + 1).padStart(3, "0")}`,
        nombre: null,
        tipo: "terminal",
        sector: "midstream",
        fluido: contenidos.join(", "),
        estado: "desconocido",
        operadora: operadoras.join(", ") || null,
        n_tanques: miembros.length,
        derivado: true,
        notas:
          "Agrupacion propia por proximidad de tanques individuales de OSM. " +
          "El punto es el centroide del grupo, no una entidad cartografiada.",
        fuente: FUENTE,
        confianza: "baja",
        ultima_verificacion: FECHA,
      },
    };
  });

  return { features, descartes, totalTanques: tanques.length };
}

// --- Ejecucion ---------------------------------------------------------------

console.log("Convirtiendo OpenStreetMap a GeoJSON (licencia ODbL)\n");

const ductos = await construirDuctos();
console.log("Ductos:");
console.log(`  escritos: ${ductos.features.length}`);
console.log(`  descartados por ser agua o alcantarillado: ${ductos.descartes.agua}`);
console.log(`  descartados sin sustancia declarada: ${ductos.descartes.sinSustancia}`);
console.log(`  descartados sin geometria: ${ductos.descartes.sinGeometria}`);

const downstream = await construirDownstream();
const terminales = await construirTerminales();

console.log("\nInstalaciones:");
console.log(`  escritas: ${downstream.features.length}`);
console.log(`  descartadas por no ser del sector: ${downstream.descartes.noRelevante}`);
console.log(`  descartadas sin nombre: ${downstream.descartes.sinNombre}`);
const porTipo = {};
for (const f of downstream.features) {
  porTipo[f.properties.tipo] = (porTipo[f.properties.tipo] ?? 0) + 1;
}
console.log(`  por tipo: ${JSON.stringify(porTipo)}`);

console.log("\nTanques agrupados:");
console.log(`  tanques de hidrocarburos: ${terminales.totalTanques}`);
console.log(`  descartados por ser de agua: ${terminales.descartes.agua}`);
console.log(`  descartados sin contenido declarado: ${terminales.descartes.sinContenido}`);
console.log(`  parques de tanques resultantes: ${terminales.features.length}`);

await mkdir(SALIDA, { recursive: true });

await writeFile(
  join(SALIDA, "ductos-osm.geojson"),
  JSON.stringify({ type: "FeatureCollection", features: ductos.features }, null, 2)
);
await writeFile(
  join(SALIDA, "downstream-osm.geojson"),
  JSON.stringify(
    {
      type: "FeatureCollection",
      features: [...downstream.features, ...terminales.features],
    },
    null,
    2
  )
);

const peso = async (n) => Math.round((await readFile(join(SALIDA, n))).length / 1024);
console.log(`\nGenerado ductos-osm.geojson      ${await peso("ductos-osm.geojson")} KB`);
console.log(`Generado downstream-osm.geojson  ${await peso("downstream-osm.geojson")} KB`);
console.log(
  "\nRecordatorio ODbL: estas capas van separadas y deben citar " +
    '"© OpenStreetMap contributors" en la interfaz.'
);
