/**
 * iconos.js — Simbolos SVG como data URI. Sin red, sin DOM, sin Cesium.
 *
 * Un punto de color no dice que hay ahi. Una torre de perforacion, una
 * refineria o un ancla se reconocen de un vistazo y sobreviven al zoom, que es
 * lo que un mapa de infraestructura necesita.
 *
 * Los simbolos se generan como data URI para no depender de archivos externos:
 * cero peticiones de red y nada que se rompa en un despliegue.
 */

/** Lienzo comun de todos los simbolos. */
const TAMANO = 40;

/**
 * Envuelve un dibujo en un SVG completo con disco de fondo.
 *
 * El disco cumple dos funciones: da contraste sobre imagen satelital, que
 * puede ser clara u oscura, y es donde vive el color de estado o de tipo.
 *
 * @param {string} contenido — elementos SVG del simbolo, en blanco
 * @param {string} color — color del disco, en CSS
 * @param {number} opacidadDisco
 * @returns {string} data URI listo para un billboard
 */
function envolver(contenido, color, opacidadDisco = 0.92) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TAMANO}" height="${TAMANO}" viewBox="0 0 ${TAMANO} ${TAMANO}">
<circle cx="20" cy="20" r="15" fill="${color}" fill-opacity="${opacidadDisco}" stroke="#ffffff" stroke-opacity="0.85" stroke-width="2"/>
<g fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${contenido}</g>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Torre de perforacion: la silueta clasica con arriostramiento en X. */
const TORRE = `
<path d="M20 10 L26 28 L14 28 Z"/>
<path d="M16.4 21 L23.6 21"/>
<path d="M17.6 16.5 L22.4 16.5"/>
<path d="M12 28 L28 28"/>
<path d="M20 10 L20 7"/>`;

/** Torres de destilacion con antorcha: refineria. */
const REFINERIA = `
<path d="M13 28 L13 16 a2 2 0 0 1 4 0 L17 28"/>
<path d="M21 28 L21 13 a2 2 0 0 1 4 0 L25 28"/>
<path d="M11 28 L29 28"/>
<path d="M15 16 L15 13"/>`;

/** Reactor con conduccion: petroquimica. */
const PETROQUIMICA = `
<path d="M14 28 L14 15 a3 3 0 0 1 6 0 L20 28"/>
<path d="M12 28 L28 28"/>
<path d="M23 28 L23 20 L27 20 L27 28"/>
<path d="M20 18 L23 18"/>`;

/** Llama: planta de gas. */
const LLAMA = `
<path d="M20 29 c-4 0 -6.5 -2.8 -6.5 -6 c0 -4 4 -6 4.5 -10 c2.5 2 3 4 3 6 c1.2 -0.8 1.8 -2 1.8 -3.4 c2.2 2.4 3.7 4.8 3.7 7.4 c0 3.2 -2.5 6 -6.5 6 z"/>`;

/** Ancla: puerto o muelle. */
const ANCLA = `
<circle cx="20" cy="12" r="2.2"/>
<path d="M20 14.5 L20 29"/>
<path d="M15 18 L25 18"/>
<path d="M12.5 23.5 c0 4 3.5 5.8 7.5 5.8 c4 0 7.5 -1.8 7.5 -5.8"/>`;

/** Tanques cilindricos: parque de almacenamiento. */
const TANQUES = `
<path d="M11 28 L11 19 a3.2 1.7 0 0 1 6.4 0 L17.4 28 z"/>
<path d="M22.6 28 L22.6 16 a3.2 1.7 0 0 1 6.4 0 L29 28 z"/>
<path d="M11 19 a3.2 1.7 0 0 0 6.4 0"/>
<path d="M22.6 16 a3.2 1.7 0 0 0 6.4 0"/>`;

/** Valvula sobre conducto: instalacion generica. */
const INSTALACION = `
<path d="M11 20 L29 20"/>
<circle cx="20" cy="20" r="4"/>
<path d="M20 16 L20 12"/>
<path d="M17 12 L23 12"/>`;

const SIMBOLOS = {
  campo: TORRE,
  pozo: TORRE,
  refineria: REFINERIA,
  petroquimica: PETROQUIMICA,
  planta_gas: LLAMA,
  puerto: ANCLA,
  terminal: TANQUES,
  mejorador: PETROQUIMICA,
  instalacion: INSTALACION,
};

/** Cache: el mismo tipo y color se piden decenas de veces. */
const cache = new Map();

/**
 * Devuelve el data URI del simbolo para un tipo de activo.
 *
 * @param {string} tipo — clave de TIPOS en data.js
 * @param {string} color — CSS del disco de fondo
 * @returns {string}
 */
export function icono(tipo, color) {
  const clave = `${tipo}|${color}`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;

  const uri = envolver(SIMBOLOS[tipo] ?? INSTALACION, color);
  cache.set(clave, uri);
  return uri;
}

/**
 * Variante hueca, para activos de los que solo se conoce la ubicacion
 * aproximada. El disco casi transparente comunica "esto no es preciso"
 * sin necesidad de leer el panel.
 *
 * @param {string} tipo
 * @param {string} color
 * @returns {string}
 */
export function iconoAproximado(tipo, color) {
  const clave = `${tipo}|${color}|aprox`;
  const guardado = cache.get(clave);
  if (guardado) return guardado;

  const uri = envolver(SIMBOLOS[tipo] ?? INSTALACION, color, 0.22);
  cache.set(clave, uri);
  return uri;
}

export { TAMANO };
