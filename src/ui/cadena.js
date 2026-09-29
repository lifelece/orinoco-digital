/**
 * ui/cadena.js — Diagrama "cadena de valor" del panel de capas.
 *
 * SVG de linea limpia, sin dependencias: Upstream -> Midstream -> Downstream
 * como tres nodos unidos por trazo, con el mismo color de acento que ya usa
 * cada interruptor de sector en ui.js (ACENTO: crudo, gas, refino) y su
 * contador de activos.
 *
 * Puramente decorativo (`aria-hidden="true"`): la forma accesible de saber
 * que hay tres sectores y cuantos activos tiene cada uno sigue siendo las
 * tres filas de interruptores que ui.js dibuja justo debajo, con su propio
 * `<label>`, casilla y texto. Duplicar eso en el arbol de accesibilidad no
 * ayuda a nadie que use lector de pantalla.
 *
 * El trazo entre nodos se "dibuja" con stroke-dasharray/stroke-dashoffset —
 * el equivalente SVG de drawLine sin GSAP (C4 de docs/NOTION.md; ver
 * docs/DECISIONS.md -> ADR-018). La animacion en si vive en style.css
 * (`.cadena-trazo`), que hereda la regla `prefers-reduced-motion` ya existente
 * ahi: este modulo solo calcula la geometria real de cada linea para que el
 * dasharray/dashoffset iniciales coincidan con su longitud.
 *
 * Mismo contrato que ui.js: no importa "cesium" ni hace fetch.
 */

import { t } from "../i18n/index.js";

/** Un nodo por sector, en orden Upstream -> Midstream -> Downstream. */
const NODOS = [
  { sector: "upstream", color: "var(--color-crudo)", clave: "cadena.upstream" },
  { sector: "midstream", color: "var(--color-gas)", clave: "cadena.midstream" },
  { sector: "downstream", color: "var(--color-refino)", clave: "cadena.downstream" },
];

/** Centros X de los tres nodos y su radio, en el viewBox del SVG. */
const X = [30, 130, 230];
const CY = 22;
const R = 13;
const ALTO_VIEWBOX = 48;

/** Escapa texto antes de meterlo en el SVG. Mismo criterio que esc() en ui.js. */
function esc(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/**
 * Las dos lineas que unen los tres nodos, con su longitud real para el
 * drawLine (ver cabecera del archivo).
 * @param {boolean} animar
 * @returns {string}
 */
function lineas(animar) {
  const tramos = [
    [X[0] + R, X[1] - R],
    [X[1] + R, X[2] - R],
  ];

  return tramos
    .map(([x1, x2], i) => {
      const longitud = x2 - x1;
      const clase = animar ? "cadena-trazo" : "";
      const retraso = animar ? ` style="animation-delay:${i * 140}ms"` : "";
      const dashoffset = animar ? longitud : 0;
      return `<line x1="${x1}" y1="${CY}" x2="${x2}" y2="${CY}"
          stroke="var(--color-trazo)" stroke-width="2"
          stroke-dasharray="${longitud}" stroke-dashoffset="${dashoffset}"
          class="${clase}"${retraso}/>`;
    })
    .join("");
}

/**
 * Los tres nodos: circulo de color por sector, su contador dentro y su
 * nombre debajo.
 * @param {{upstream: number, midstream: number, downstream: number}} conteos
 * @returns {string}
 */
function nodos(conteos) {
  return NODOS.map(({ sector, color, clave }, i) => {
    const n = conteos[sector] ?? 0;
    return `
      <circle cx="${X[i]}" cy="${CY}" r="${R}" fill="${color}" fill-opacity="0.2"
              stroke="${color}" stroke-width="1.5"/>
      <text x="${X[i]}" y="${CY + 4}" text-anchor="middle" font-size="10"
            font-family="var(--font-mono)" fill="${color}">${esc(n)}</text>
      <text x="${X[i]}" y="${CY + R + 12}" text-anchor="middle" font-size="8.5"
            fill="var(--color-lo)">${esc(t(clave))}</text>`;
  }).join("");
}

/**
 * HTML (SVG en linea) del diagrama de cadena de valor.
 *
 * @param {{upstream: number, midstream: number, downstream: number}} conteos
 * @param {boolean} animar — true solo en el primer montaje del panel de capas
 * @returns {string}
 */
export function htmlCadena(conteos, animar) {
  return `
    <svg viewBox="0 0 260 ${ALTO_VIEWBOX}" aria-hidden="true" focusable="false"
         class="mx-auto block w-full max-w-56 px-2 py-1">
      ${lineas(animar)}
      ${nodos(conteos)}
    </svg>`;
}
