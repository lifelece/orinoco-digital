/**
 * ui/reglaRio.js — La "regla del rio" como SVG (ADR-021).
 *
 * Dibuja el cauce del Orinoco con una marca en cada cruce de un anillo de
 * distancia desde Ciudad Bolivar. Los datos son los de regla-rio.json (los
 * genera scripts/regla-rio.mjs); aqui no hay coordenadas escritas a mano.
 *
 * Solo estructura: los colores los pone el CSS de cada contexto
 * (`.regla-rio` en style.css con tinta; en expofaja.css con ef-azul), asi el
 * mismo SVG sirve a las dos caras de la identidad sin cruzar prefijos.
 * Sin `cesium`, sin `fetch`: lo usan el modo del mapa y el micrositio.
 */

const NS = "http://www.w3.org/2000/svg";

/** Margen alrededor del trazo, en km locales. */
const MARGEN = 8;
/** Medio largo de la marca sobre el rio, en km locales. */
const MARCA = 7;

/**
 * @typedef {Object} ReglaRio
 * @property {{minX: number, maxX: number, minY: number, maxY: number}} caja  km locales
 * @property {string} path  trazo en km locales (comandos M y L)
 * @property {Array<{km: number, xy: [number, number]}>} cruces
 */

/**
 * Geometria de la regla: caja de vista y marcas. Pura, sin DOM.
 * Sin eje ni lineas guia a proposito: con ellos el cauce (que sube hacia el
 * noreste) se leia como un grafico de tendencia. Es un mapa, no una serie.
 * @param {ReglaRio} regla
 * @returns {{viewBox: string, ancho: number, alto: number,
 *   marcas: Array<{km: number, x: number, y: number}>}}
 */
export function geometriaRegla(regla) {
  const { minX, maxX, minY, maxY } = regla.caja;
  const ancho = maxX - minX + 2 * MARGEN;
  const alto = maxY - minY + 2 * MARGEN;
  return {
    viewBox: [minX - MARGEN, minY - MARGEN, ancho, alto].map((n) => Math.round(n * 10) / 10).join(" "),
    ancho,
    alto,
    marcas: regla.cruces.map(({ km, xy }) => ({ km, x: xy[0], y: xy[1] })),
  };
}

function el(nombre, atributos) {
  const nodo = document.createElementNS(NS, nombre);
  for (const [k, v] of Object.entries(atributos)) nodo.setAttribute(k, String(v));
  return nodo;
}

/**
 * SVG decorativo (`aria-hidden`): la distancia de cada marca se repite en texto
 * en el panel. `trazar` anade la clase que dibuja el rio en --dur-trazo (se
 * descubre de izquierda a derecha, rio abajo); el que llama decide si ya se
 * dibujo antes (el panel se repinta con cada dato).
 * @param {ReglaRio} regla
 * @param {{trazar?: boolean, clase?: string}} [opciones]
 * @returns {SVGSVGElement}
 */
export function crearReglaRio(regla, { trazar = false, clase = "" } = {}) {
  const g = geometriaRegla(regla);
  const svg = el("svg", {
    viewBox: g.viewBox,
    class: `regla-rio ${trazar ? "regla-trazo" : ""} ${clase}`.replace(/\s+/g, " ").trim(),
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": "true",
    focusable: "false",
  });

  svg.append(el("path", { class: "rio", d: regla.path }));
  for (const m of g.marcas) {
    svg.append(el("line", { class: "marca", x1: m.x, x2: m.x, y1: m.y - MARCA, y2: m.y + MARCA }));
  }
  svg.append(el("circle", { class: "ciudad", cx: 0, cy: 0, r: 2.4 }));
  return svg;
}
