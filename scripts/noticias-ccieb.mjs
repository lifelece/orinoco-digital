/**
 * noticias-ccieb.mjs — Noticias de la CCIEB para el micrositio ExpoFaja (E4.2).
 *
 * Uso:  npm run data:noticias
 *
 * Lee la API publica de WordPress de la Camara de Comercio, Industria y
 * Empresas de Bolivar (categorias 163 = CBO Capital de Oportunidades,
 * 7 = Eventos), limpia el HTML y escribe public/data/expofaja/noticias.json
 * con la forma que consume src/expofaja/datos.js (validarNoticias).
 *
 * Si el WordPress falla o no trae noticias validas, NO toca el JSON versionado
 * (static-first, ADR-003). Si las noticias no cambiaron, tampoco lo reescribe:
 * asi `consultado` no genera un diff diario. Nada llega a produccion sin PR.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ORIGEN_CCIEB = "https://camaradecomerciobolivar.org";
export const ENDPOINT =
  `${ORIGEN_CCIEB}/wp-json/wp/v2/posts?categories=163,7&per_page=8&_fields=id,date,link,title,excerpt`;
const RUTA_JSON = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data", "expofaja", "noticias.json");
const CATEGORIAS = {
  7: "Eventos",
  40: "Noticias",
  68: "Pronunciamientos",
  163: "CBO Capital de Oportunidades",
};
const MAX_EXTRACTO = 220;

const ENTIDADES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", iexcl: "¡", iquest: "¿", ntilde: "ñ", Ntilde: "Ñ", uuml: "ü", Uuml: "Ü",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
};

/**
 * Convierte HTML de WordPress en texto plano: quita etiquetas, decodifica
 * entidades (numericas y las habituales) y colapsa espacios.
 * @param {*} html
 * @returns {string} texto limpio; "" si la entrada no es texto
 */
export function limpiarHtml(html) {
  if (typeof html !== "string") return "";
  // Etiquetas de bloque separan palabras; las de linea (strong, a...) no.
  const sinEtiquetas = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(p|br|div|li|ul|ol|h[1-6])\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, "");
  const decodificado = sinEtiquetas.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
    }
    return ENTIDADES[e] ?? ENTIDADES[e.toLowerCase()] ?? m;
  });
  return decodificado.replace(/\s+/g, " ").trim();
}

/** Recorta en el ultimo espacio antes del limite y anade puntos suspensivos. */
function recortar(texto, max) {
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/**
 * Indica si un enlace es https y del dominio de la CCIEB.
 * @param {*} url
 * @returns {boolean}
 */
export function esEnlaceCcieb(url) {
  try {
    return new URL(url).origin === ORIGEN_CCIEB;
  } catch {
    return false;
  }
}

/**
 * Convierte la respuesta de WordPress en items de noticias.json. Descarta (y
 * lista) lo que no sea verificable: enlace ajeno, sin id, sin titulo o sin fecha.
 * @param {*} posts respuesta JSON de /wp/v2/posts
 * @returns {{items: Object[], descartados: string[]}}
 */
export function normalizarPosts(posts) {
  const items = [];
  const descartados = [];
  if (!Array.isArray(posts)) return { items, descartados: ["la respuesta no es una lista"] };
  for (const p of posts) {
    const titulo = limpiarHtml(p?.title?.rendered);
    const fecha = typeof p?.date === "string" ? p.date.slice(0, 10) : "";
    if (!Number.isInteger(p?.id) || titulo === "" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      descartados.push(`post ${p?.id ?? "?"}: falta id, titulo o fecha`);
    } else if (!esEnlaceCcieb(p.link)) {
      descartados.push(`post ${p.id}: enlace fuera de ${ORIGEN_CCIEB}: ${p.link}`);
    } else {
      const extracto = recortar(limpiarHtml(p.excerpt?.rendered), MAX_EXTRACTO);
      items.push({ id: p.id, fecha, titulo, ...(extracto ? { extracto } : {}), url: p.link });
    }
  }
  return { items, descartados };
}

/**
 * Compara dos listas de noticias por lo esencial (id, fecha, titulo, url).
 * @param {Object[]} a
 * @param {Object[]} b
 * @returns {boolean} true si son iguales
 */
export function mismasNoticias(a, b) {
  const proyectar = (lista) => JSON.stringify((lista ?? []).map(({ id, fecha, titulo, url }) => ({ id, fecha, titulo, url })));
  return proyectar(a) === proyectar(b);
}

async function main() {
  const respuesta = await fetch(ENDPOINT, {
    headers: {
      "User-Agent": "orinoco-digital/0.1 (https://github.com/lifelece/orinoco-digital)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!respuesta.ok) throw new Error(`WordPress respondio HTTP ${respuesta.status}`);
  const { items, descartados } = normalizarPosts(await respuesta.json());
  for (const d of descartados) console.warn(`  descartado: ${d}`);
  if (items.length === 0) throw new Error("WordPress no devolvio noticias validas");

  const actual = JSON.parse(await readFile(RUTA_JSON, "utf8"));
  if (mismasNoticias(items, actual.items)) {
    console.log(`Sin noticias nuevas (${items.length} consultadas). No se toca ${RUTA_JSON}.`);
    return;
  }
  const nuevo = {
    endpoint: ENDPOINT,
    categorias_relevantes: CATEGORIAS,
    consultado: new Date().toISOString().slice(0, 10),
    items,
  };
  await writeFile(RUTA_JSON, `${JSON.stringify(nuevo, null, 2)}\n`);
  const ids = new Set((actual.items ?? []).map((n) => n.id));
  const nuevas = items.filter((n) => !ids.has(n.id));
  console.log(`Escrito ${RUTA_JSON}: ${items.length} noticias, ${nuevas.length} nuevas.`);
  for (const n of nuevas) console.log(`  + ${n.fecha}  ${n.titulo}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`ERROR: ${error.message}. El JSON versionado sigue sirviendo.`);
    process.exitCode = 1;
  });
}
