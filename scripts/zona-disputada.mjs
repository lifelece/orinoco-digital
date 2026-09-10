/**
 * zona-disputada.mjs — Extrae la Guayana Esequiba como zona en disputa.
 *
 * POR QUE EXISTE
 * Los datos de frontera de geoBoundaries trazan el limite oriental de Venezuela
 * en la linea administrada de facto por Guyana: no incluyen la Guayana
 * Esequiba, que Venezuela reclama. Publicar solo esa linea toma partido por
 * omision; dibujar la reclamacion como territorio venezolano toma partido en el
 * otro sentido.
 *
 * La salida honesta es la tercera: mostrar la zona y decir que esta en disputa,
 * que es lo que hacen los atlas que buscan neutralidad.
 *
 * FUENTE
 * Natural Earth, `ne_10m_admin_0_disputed_areas`. Es dominio publico y **la
 * propia fuente la clasifica como `TYPE: Disputed`** con el nombre "West of
 * Essequibo River". No la etiquetamos nosotros: la etiqueta viene con el dato,
 * que es justo lo que hacia falta para no opinar.
 *
 * Salida: public/data/zona-disputada.geojson
 *
 * Uso: node scripts/zona-disputada.mjs
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SALIDA = join(RAIZ, "public", "data", "zona-disputada.geojson");

const FUENTE_URL =
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_disputed_areas.geojson";

const FUENTE =
  "Natural Earth, ne_10m_admin_0_disputed_areas (dominio publico). " +
  "Clasificada por la propia fuente como TYPE: Disputed.";
const FECHA = "2026-09-09";

/** Nombres, tal como los escribe Natural Earth, de lo que nos interesa. */
const BUSCADOS = ["West of Essequibo River"];

const respuesta = await fetch(FUENTE_URL, {
  headers: { "User-Agent": "orinoco-digital/0.1" },
});
if (!respuesta.ok) {
  console.error(`No se pudo descargar Natural Earth: HTTP ${respuesta.status}`);
  process.exit(1);
}

const datos = await respuesta.json();
const encontrados = datos.features.filter((f) =>
  BUSCADOS.includes(f.properties?.BRK_NAME)
);

if (encontrados.length === 0) {
  console.error(
    "No se encontro ninguna de las zonas buscadas. Natural Earth pudo cambiar " +
      "los nombres: revisa BRK_NAME antes de dar por bueno el resultado."
  );
  process.exit(1);
}

/** Convierte los anillos exteriores de una geometria a lineas. */
function aLineas(geometria) {
  const poligonos =
    geometria.type === "Polygon"
      ? [geometria.coordinates]
      : geometria.type === "MultiPolygon"
        ? geometria.coordinates
        : [];
  // Solo el anillo exterior: los agujeros no aportan a un contorno.
  return poligonos.map((p) => p[0]).filter((a) => a && a.length >= 4);
}

const features = [];
for (const f of encontrados) {
  const p = f.properties;
  for (const linea of aLineas(f.geometry)) {
    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: linea.map(([x, y]) => [
          Number(x.toFixed(4)),
          Number(y.toFixed(4)),
        ]),
      },
      properties: {
        id: "DISPUTA-ESEQUIBO",
        nombre: p.BRK_NAME,
        tipo: "limite",
        nivel: "disputa",
        sector: "contexto",
        estado: "desconocido",
        clasificacion_fuente: p.TYPE ?? null,
        administrado_por: p.SOVEREIGNT ?? null,
        fuente: FUENTE,
        confianza: "media",
        ultima_verificacion: FECHA,
        notas:
          "Territorio en disputa entre Venezuela y Guyana. El proyecto no toma " +
          "posicion: se muestra la zona con la clasificacion que le da la " +
          "propia fuente. Ver docs/DATA_SOURCES.md seccion 13.",
      },
    });
  }
}

await mkdir(dirname(SALIDA), { recursive: true });
await writeFile(SALIDA, JSON.stringify({ type: "FeatureCollection", features }));

const vertices = features.reduce((a, f) => a + f.geometry.coordinates.length, 0);
console.log("Zona en disputa extraida de Natural Earth");
for (const f of encontrados) {
  console.log(
    `  ${f.properties.BRK_NAME} | clasificacion de la fuente: ${f.properties.TYPE} | administrado por: ${f.properties.SOVEREIGNT}`
  );
}
console.log(`  ${features.length} lineas | ${vertices} vertices`);
console.log(`  generado: ${SALIDA}`);
