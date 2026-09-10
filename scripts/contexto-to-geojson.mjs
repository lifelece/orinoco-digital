/**
 * contexto-to-geojson.mjs — Toponimia e hidrografia desde Natural Earth.
 *
 * POR QUE EXISTE
 * El mapa dibujaba geometria correcta pero muda. Un campo petrolifero flotando
 * sobre una mancha verde no dice en que estado esta, y el rio que da nombre al
 * proyecto no aparecia por ninguna parte. Los mapas de divulgacion del sector
 * son legibles precisamente por lo contrario: rotulan y situan.
 *
 * Produce DOS archivos, uno por familia visual y por interruptor:
 *   public/data/toponimia.geojson    paises, estados y ciudades (Point)
 *   public/data/hidrografia.geojson  rios (LineString) y lagos (Polygon)
 *
 * FUENTE
 * Natural Earth 1:10m, dominio publico. Es la misma casa de la que ya sale
 * `zona-disputada.geojson`, y se usa por tres razones concretas:
 *   - Los puntos de etiqueta vienen CALCULADOS en el dato (`latitude`,
 *     `longitude`, `LABEL_X`, `LABEL_Y`). No hay que derivar centroides, que
 *     en un estado con forma de C caen fuera del propio estado.
 *   - Trae los nombres en espanol y en ingles, asi que la capa es bilingue sin
 *     que nadie traduzca a mano.
 *   - Es dominio publico: no arrastra share-alike como OSM.
 *
 * LO QUE ESTE SCRIPT NO HACE
 * No toca los limites administrativos. Esos siguen viniendo de geoBoundaries
 * (`limites-venezuela.geojson`). De Natural Earth se toman UNICAMENTE los
 * puntos de etiqueta: dos fuentes distintas para la misma frontera se
 * contradirian sobre el mapa.
 *
 * Uso: node scripts/contexto-to-geojson.mjs   (npm run data:contexto)
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA_TOPONIMIA = join(RAIZ, "public", "data", "toponimia.geojson");
const SALIDA_HIDROGRAFIA = join(RAIZ, "public", "data", "hidrografia.geojson");

const BASE =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/";

const FUENTE = "Natural Earth 1:10m (dominio publico)";
const FECHA = new Date().toISOString().slice(0, 10);

/**
 * Ventana de interes: Venezuela y el entorno que se ve al encuadrar la Faja.
 *
 * Es deliberadamente mas ancha que el pais. Un mapa que corta la toponimia
 * justo en la frontera deja al usuario sin saber que hay al otro lado, que es
 * la mitad del contexto que estas capas existen para dar.
 */
const VENTANA = { oeste: -74, este: -58.5, sur: 0.5, norte: 13 };

/** Cuantos decimales se conservan. 4 = ~11 m, de sobra a esta escala. */
const DECIMALES = 4;

/**
 * Estados y provincias extranjeros NO se rotulan.
 *
 * Este es un mapa DE Venezuela: los paises vecinos son contexto, no sujeto.
 * Rotular sus divisiones internas metia 42 etiquetas mas —16 solo de las
 * regiones de Trinidad, que caben en una pantalla de telefono— y tapaba justo
 * lo que el mapa viene a mostrar.
 */
const PAIS_CON_ESTADOS = "VEN";

/**
 * Paises limitrofes cuyo punto de etiqueta oficial cae fuera de la ventana.
 * Sin esto, Brasil no se rotula: Natural Earth lo situa en Mato Grosso.
 */
const LIMITROFES_SIN_PUNTO = ["BRA"];

/** @param {number} n */
const redondear = (n) => Number(n.toFixed(DECIMALES));

/** Recorta decimales a toda una geometria, sea cual sea su anidamiento. */
function redondearGeometria(coords) {
  if (typeof coords[0] === "number") {
    return [redondear(coords[0]), redondear(coords[1])];
  }
  return coords.map(redondearGeometria);
}

/** @returns {boolean} si el punto cae dentro de la ventana de interes */
function enVentana(lng, lat) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= VENTANA.oeste &&
    lng <= VENTANA.este &&
    lat >= VENTANA.sur &&
    lat <= VENTANA.norte
  );
}

/** @returns {boolean} si alguna posicion de la geometria cae en la ventana */
function tocaVentana(coords) {
  let toca = false;
  const recorrer = (c) => {
    if (toca) return;
    if (typeof c[0] === "number") {
      if (enVentana(c[0], c[1])) toca = true;
      return;
    }
    c.forEach(recorrer);
  };
  recorrer(coords);
  return toca;
}

/**
 * Descarga una capa de Natural Earth.
 * @param {string} capa
 * @returns {Promise<{features: Array<Object>}>}
 */
async function descargar(capa) {
  const respuesta = await fetch(`${BASE}${capa}.geojson`, {
    headers: { "User-Agent": "orinoco-digital/0.1" },
  });
  if (!respuesta.ok) {
    throw new Error(`${capa}: HTTP ${respuesta.status}`);
  }
  return respuesta.json();
}

/** Trazabilidad obligatoria en todo registro. Ver CLAUDE.md regla 3. */
function trazabilidad(confianza = "media") {
  return { fuente: FUENTE, confianza, ultima_verificacion: FECHA };
}

/**
 * Punto de etiqueta derivado, promediando los vertices del pais que SI caen en
 * la ventana.
 *
 * El resultado se marca `derivado: true` y lleva nota. La posicion de un rotulo
 * es una decision de diseno y no un dato, pero en este proyecto eso se dice
 * igual: la regla es que nada calculado por nosotros se presente como fuente.
 *
 * @returns {[number, number] | null}
 */
function etiquetaDerivada(geometria) {
  let sumaLng = 0;
  let sumaLat = 0;
  let n = 0;

  const recorrer = (c) => {
    if (typeof c[0] === "number") {
      if (enVentana(c[0], c[1])) {
        sumaLng += c[0];
        sumaLat += c[1];
        n += 1;
      }
      return;
    }
    c.forEach(recorrer);
  };

  recorrer(geometria.coordinates);
  return n > 0 ? [sumaLng / n, sumaLat / n] : null;
}

/**
 * Rango de zoom de una ciudad, a partir del SCALERANK de Natural Earth.
 *
 * SCALERANK es el criterio con el que Natural Earth decide a que escala
 * aparece cada ciudad en un mapa impreso. Se reutiliza tal cual en vez de
 * inventar una jerarquia propia: es reproducible y no lo decidimos nosotros.
 *
 * @param {number} scalerank
 * @returns {1 | 2 | 3}
 */
function rangoCiudad(scalerank) {
  if (scalerank <= 4) return 1;
  if (scalerank <= 7) return 2;
  return 3;
}

// --- Toponimia ---------------------------------------------------------------

async function construirToponimia() {
  const [paises, estados, ciudades] = await Promise.all([
    descargar("ne_10m_admin_0_countries"),
    descargar("ne_10m_admin_1_states_provinces"),
    descargar("ne_10m_populated_places"),
  ]);

  const features = [];
  const resumen = { pais: 0, estado: 0, ciudad: 0, derivados: 0 };

  for (const f of paises.features) {
    const p = f.properties;
    const oficial = enVentana(p.LABEL_X, p.LABEL_Y);
    if (!oficial && !LIMITROFES_SIN_PUNTO.includes(p.ADM0_A3)) continue;

    const punto = oficial ? [p.LABEL_X, p.LABEL_Y] : etiquetaDerivada(f.geometry);
    if (!punto) continue;
    if (!oficial) resumen.derivados += 1;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: redondearGeometria(punto) },
      properties: {
        id: `pais-${p.ADM0_A3}`,
        clase: "pais",
        nombre: p.NAME_ES ?? p.NAME_EN,
        nombre_en: p.NAME_EN,
        rango: 1,
        ...(oficial
          ? {}
          : {
              derivado: true,
              nota:
                "Punto de etiqueta calculado por este proyecto: el de Natural " +
                "Earth cae fuera de la ventana del mapa. Solo posiciona el " +
                "rotulo; no afirma nada sobre el territorio.",
            }),
        ...trazabilidad(oficial ? "media" : "baja"),
      },
    });
    resumen.pais += 1;
  }

  // Natural Earth trae una entrada de Venezuela sin nombre: se cae sola por el
  // filtro, y es correcto que se caiga. No se le inventa uno.
  for (const f of estados.features) {
    const p = f.properties;
    if (p.adm0_a3 !== PAIS_CON_ESTADOS) continue;
    if (!p.name) continue;
    if (!enVentana(p.longitude, p.latitude)) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: redondearGeometria([p.longitude, p.latitude]),
      },
      properties: {
        id: `estado-${p.iso_3166_2 ?? p.name}`,
        clase: "estado",
        nombre: p.name_es ?? p.name,
        nombre_en: p.name_en ?? p.name,
        rango: 2,
        ...trazabilidad(),
      },
    });
    resumen.estado += 1;
  }

  for (const f of ciudades.features) {
    const p = f.properties;
    if (p.ADM0_A3 !== PAIS_CON_ESTADOS) continue;
    const [lng, lat] = f.geometry.coordinates;
    if (!enVentana(lng, lat)) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: redondearGeometria([lng, lat]) },
      properties: {
        id: `ciudad-${p.NAMEASCII}`,
        clase: "ciudad",
        nombre: p.NAME,
        nombre_en: p.NAME_EN ?? p.NAME,
        rango: rangoCiudad(Number(p.SCALERANK)),
        // Capital del pais o de estado: lo declara la fuente, no lo deducimos.
        capital: p.FEATURECLA?.includes("capital") ? p.FEATURECLA : null,
        ...trazabilidad(),
      },
    });
    resumen.ciudad += 1;
  }

  return { features, resumen };
}

// --- Hidrografia -------------------------------------------------------------

async function construirHidrografia() {
  const [rios, lagos] = await Promise.all([
    descargar("ne_10m_rivers_lake_centerlines"),
    descargar("ne_10m_lakes"),
  ]);

  const features = [];
  const resumen = { rio: 0, lago: 0, sinNombre: 0 };

  for (const f of rios.features) {
    if (!tocaVentana(f.geometry.coordinates)) continue;
    const p = f.properties;
    // Un rio sin nombre se dibuja igual: la linea es informacion aunque no se
    // pueda rotular. Lo que no se hace es inventarle un nombre.
    if (!p.name) resumen.sinNombre += 1;

    features.push({
      type: "Feature",
      geometry: {
        type: f.geometry.type,
        coordinates: redondearGeometria(f.geometry.coordinates),
      },
      properties: {
        id: `rio-${p.rivernum ?? p.name ?? resumen.rio}`,
        clase: "rio",
        nombre: p.name ?? null,
        nombre_en: p.name_en ?? p.name ?? null,
        ...trazabilidad(),
      },
    });
    resumen.rio += 1;
  }

  for (const f of lagos.features) {
    if (!tocaVentana(f.geometry.coordinates)) continue;
    const p = f.properties;

    features.push({
      type: "Feature",
      geometry: {
        type: f.geometry.type,
        coordinates: redondearGeometria(f.geometry.coordinates),
      },
      properties: {
        id: `lago-${p.name ?? resumen.lago}`,
        clase: "lago",
        nombre: p.name ?? null,
        nombre_en: p.name_en ?? p.name ?? null,
        // "Reservoir" en la fuente = embalse. Guri es el caso que importa:
        // es infraestructura, no un lago natural, y el dato lo distingue.
        embalse: p.featurecla === "Reservoir",
        ...trazabilidad(),
      },
    });
    resumen.lago += 1;
  }

  return { features, resumen };
}

// --- Ejecucion ---------------------------------------------------------------

/** @returns {Promise<number>} peso en KB del archivo escrito */
async function escribir(ruta, features) {
  await mkdir(dirname(ruta), { recursive: true });
  const texto = JSON.stringify({ type: "FeatureCollection", features });
  await writeFile(ruta, texto, "utf8");
  return Math.round(Buffer.byteLength(texto) / 1024);
}

const toponimia = await construirToponimia();
const hidrografia = await construirHidrografia();

const kbTop = await escribir(SALIDA_TOPONIMIA, toponimia.features);
const kbHid = await escribir(SALIDA_HIDROGRAFIA, hidrografia.features);

console.log(`toponimia.geojson    ${toponimia.features.length} etiquetas, ${kbTop} KB`);
console.log(
  `  ${toponimia.resumen.pais} paises (${toponimia.resumen.derivados} con punto derivado), ` +
    `${toponimia.resumen.estado} estados, ${toponimia.resumen.ciudad} ciudades`
);
console.log(`hidrografia.geojson  ${hidrografia.features.length} elementos, ${kbHid} KB`);
console.log(
  `  ${hidrografia.resumen.rio} rios (${hidrografia.resumen.sinNombre} sin nombre), ` +
    `${hidrografia.resumen.lago} lagos y embalses`
);

if (kbTop > 2048 || kbHid > 2048) {
  console.warn(
    "AVISO: algun archivo supera los 2 MB del presupuesto. " +
      "Ver docs/PERFORMANCE_BUDGET.md."
  );
}
