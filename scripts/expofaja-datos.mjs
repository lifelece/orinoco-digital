/**
 * expofaja-datos.mjs — Publica las semillas del evento para el micrositio.
 *
 * Copia docs/expofaja/semillas/*.json a public/data/expofaja/ quitando solo las
 * claves `_nota` (a cualquier nivel); no edita ningun valor (RF-2). Genera el
 * <noscript> con la agenda en texto entre los marcadores de expofaja/index.html
 * (RF-73). Idempotente. Uso: npm run data:expofaja
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const RAIZ = new URL("../", import.meta.url);
const SEMILLAS = new URL("docs/expofaja/semillas/", RAIZ);
const DESTINO = new URL("public/data/expofaja/", RAIZ);
const HTML = new URL("expofaja/index.html", RAIZ);

/** Semilla -> nombre publicado. */
export const ARCHIVOS = {
  "evento.json": "evento.json",
  "agenda.json": "agenda.json",
  "ponentes.json": "ponentes.json",
  "aliados.json": "aliados.json",
  "marcas-manifiesto.json": "marcas-manifiesto.json",
  "iniciativas-ccieb.json": "iniciativas-ccieb.json",
  "noticias-ccieb.json": "noticias.json",
};

const MARCA_INICIO = "<!-- agenda-noscript:inicio";
const MARCA_FIN = "<!-- agenda-noscript:fin -->";

/**
 * Devuelve una copia profunda sin ninguna clave `_nota`, a cualquier nivel.
 * @param {*} valor
 * @returns {*}
 */
export function quitarNotas(valor) {
  if (Array.isArray(valor)) return valor.map(quitarNotas);
  if (valor && typeof valor === "object") {
    const salida = {};
    for (const [clave, v] of Object.entries(valor)) {
      if (clave !== "_nota") salida[clave] = quitarNotas(v);
    }
    return salida;
  }
  return valor;
}

/**
 * Escapa texto para HTML.
 * @param {*} texto
 * @returns {string}
 */
export function escaparHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Construye el <noscript> con la agenda completa en texto (RF-73).
 * @param {Object} agenda
 * @param {Object} ponentes
 * @param {Object} evento
 * @returns {string} HTML
 */
export function generarNoscript(agenda, ponentes, evento) {
  const porId = new Map(ponentes.ponentes.map((p) => [p.id, p]));
  const e = escaparHtml;
  const lineas = [
    "<noscript>",
    `  <h1>${e(evento.nombre)}</h1>`,
    "  <p>Programa oficial de la CCIEB. Horarios y salas sujetos a cambios del organizador.</p>",
  ];
  for (const dia of agenda.dias) {
    lineas.push(`  <h2>${e(dia.nombre)}</h2>`, "  <ul>");
    for (const s of dia.sesiones) {
      const hora = s.inicio && s.fin ? `${s.inicio}-${s.fin}` : "Hora por confirmar";
      const partes = [hora];
      if (s.sala) partes.push(s.sala);
      partes.push(s.titulo);
      const p = s.ponente_id ? porId.get(s.ponente_id) : null;
      if (p) partes.push([p.titulo, p.nombre].filter(Boolean).join(" "));
      lineas.push(`    <li>${partes.map(e).join(" · ")}</li>`);
    }
    lineas.push("  </ul>");
  }
  const url = evento.ccieb.pagina_evento;
  lineas.push(`  <p><a href="${e(url)}">Pagina oficial del evento (CCIEB)</a></p>`, "</noscript>");
  return lineas.join("\n");
}

/**
 * Sustituye el contenido entre los marcadores agenda-noscript.
 * @param {string} html documento completo
 * @param {string} bloque HTML a insertar
 * @returns {string}
 * @throws {Error} si faltan los marcadores
 */
export function insertarNoscript(html, bloque) {
  const i = html.indexOf(MARCA_INICIO);
  const f = html.indexOf(MARCA_FIN);
  if (i < 0 || f < i) throw new Error("faltan los marcadores agenda-noscript en expofaja/index.html");
  const finLineaInicio = html.indexOf("\n", i);
  const sangria = "    ";
  const cuerpo = bloque.split("\n").map((l) => sangria + l).join("\n");
  return `${html.slice(0, finLineaInicio + 1)}${cuerpo}\n${sangria}${html.slice(f)}`;
}

async function leerJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

async function principal() {
  await mkdir(DESTINO, { recursive: true });
  for (const [origen, nombre] of Object.entries(ARCHIVOS)) {
    const limpio = quitarNotas(await leerJson(new URL(origen, SEMILLAS)));
    await writeFile(new URL(nombre, DESTINO), `${JSON.stringify(limpio, null, 2)}\n`);
    console.log(`public/data/expofaja/${nombre}`);
  }
  const [agenda, ponentes, evento] = await Promise.all(
    ["agenda.json", "ponentes.json", "evento.json"].map((n) => leerJson(new URL(n, DESTINO))),
  );
  const html = await readFile(HTML, "utf8");
  await writeFile(HTML, insertarNoscript(html, generarNoscript(agenda, ponentes, evento)));
  console.log("expofaja/index.html: bloque agenda-noscript");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await principal();
