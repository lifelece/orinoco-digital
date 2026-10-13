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
 * @param {string} trazo — color del trazo del simbolo y del borde del disco
 * @returns {string} data URI listo para un billboard
 */
function envolver(contenido, color, opacidadDisco = 0.92, trazo = "#ffffff") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TAMANO}" height="${TAMANO}" viewBox="0 0 ${TAMANO} ${TAMANO}">
<circle cx="20" cy="20" r="15" fill="${color}" fill-opacity="${opacidadDisco}" stroke="${trazo}" stroke-opacity="0.85" stroke-width="2"/>
<g fill="none" stroke="${trazo}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${contenido}</g>
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

/** Presa de arco con dos compuertas: central hidroelectrica. */
const PRESA = `
<path d="M12 27 C12 18 15.5 12.5 20 12.5 C24.5 12.5 28 18 28 27"/>
<path d="M11 27 L29 27"/>
<path d="M17 27 L17 19.5"/>
<path d="M23 27 L23 19.5"/>`;

/** Rayo: central termica. La convencion universal de "aqui se genera luz". */
const RAYO = `
<path d="M22.5 10 L14 21.5 L19.5 21.5 L17.5 30 L26 18 L20.5 18 Z"/>`;

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
  // Centrales electricas. Se indexan por la CLASE del combustible y no por el
  // tipo, porque una represa y una termica no se parecen en nada y el simbolo
  // tiene que decir cual es cual sin abrir el panel.
  hidro: PRESA,
  termo: RAYO,
  otro: INSTALACION,
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

// --- Ciudad Bolivar (E1) -----------------------------------------------------

/**
 * Trazo de los simbolos de la ciudad: mismo valor que --color-shell. El blanco
 * de `envolver()` no se veria sobre el disco claro de COLOR_CIUDAD (D11).
 */
const TRAZO_CIUDAD = "#0b0f14";

/** Edificio con fronton y columnas: museo (sede del evento). */
const MUSEO = `
<path d="M11 15 L20 10 L29 15 Z"/>
<path d="M13 17.5 L13 26"/>
<path d="M18 17.5 L18 26"/>
<path d="M22 17.5 L22 26"/>
<path d="M27 17.5 L27 26"/>
<path d="M11 28 L29 28"/>`;

/** Avion visto desde arriba: aeropuerto. */
const AVION = `
<path d="M20 9.5 C21.2 9.5 21.8 10.5 21.8 12 L21.8 17.5 L30 22.5 L30 24.5 L21.8 22 L21.8 27 L24.5 29 L24.5 30.5 L20 29.3 L15.5 30.5 L15.5 29 L18.2 27 L18.2 22 L10 24.5 L10 22.5 L18.2 17.5 L18.2 12 C18.2 10.5 18.8 9.5 20 9.5 Z"/>`;

/** Tablero con arco sobre el: puente. */
const PUENTE = `
<path d="M10 20 L30 20"/>
<path d="M12 20 C14 12 26 12 28 20"/>
<path d="M16 15.2 L16 20"/>
<path d="M20 13.7 L20 20"/>
<path d="M24 15.2 L24 20"/>
<path d="M12 20 L12 26"/>
<path d="M28 20 L28 26"/>`;

/** Birrete: educacion superior. */
const BIRRETE = `
<path d="M20 12 L31 17.5 L20 23 L9 17.5 Z"/>
<path d="M14.5 20.5 L14.5 25 C17 27 23 27 25.5 25 L25.5 20.5"/>
<path d="M31 17.5 L31 24"/>`;

/** Cruz: salud. */
const CRUZ = `
<path d="M17 11 L23 11 L23 17 L29 17 L29 23 L23 23 L23 29 L17 29 L17 23 L11 23 L11 17 L17 17 Z"/>`;

/** Cama con almohada: hotel. */
const CAMA = `
<path d="M10 14 L10 27"/>
<path d="M10 23 L30 23 L30 27"/>
<path d="M10 23 L10 19 L27 19 C29 19 30 20.5 30 23"/>
<circle cx="14.5" cy="21" r="1.8"/>`;

/** Fachada con columnas y base: banco. */
const BANCO = `
<path d="M10 16 L20 10.5 L30 16 Z"/>
<path d="M12.5 19 L12.5 25"/>
<path d="M17 19 L17 25"/>
<path d="M23 19 L23 25"/>
<path d="M27.5 19 L27.5 25"/>
<path d="M10 28 L30 28"/>
<path d="M11 25.5 L29 25.5"/>`;

/** Autobus de frente: transporte. */
const BUS = `
<rect x="11.5" y="11" width="17" height="15" rx="2.5"/>
<path d="M11.5 18 L28.5 18"/>
<path d="M15 22.5 L15.8 22.5"/>
<path d="M24.2 22.5 L25 22.5"/>
<path d="M14 26 L14 29"/>
<path d="M26 26 L26 29"/>`;

/** Estrella de contorno: iniciativa anunciada. */
const ESTRELLA = `
<path d="M20 10.5 L22.7 16.6 L29.3 17.2 L24.3 21.6 L25.8 28.1 L20 24.7 L14.2 28.1 L15.7 21.6 L10.7 17.2 L17.3 16.6 Z"/>`;

const SIMBOLOS_CIUDAD = {
  sede_evento: MUSEO,
  aeropuerto: AVION,
  puente: PUENTE,
  educacion_superior: BIRRETE,
  salud: CRUZ,
  hotel: CAMA,
  banca: BANCO,
  transporte: BUS,
  iniciativa: ESTRELLA,
};

/**
 * Simbolo de un servicio de Ciudad Bolivar o de una iniciativa de la CCIEB.
 * Disco de `color` con trazo oscuro (no blanco) para que el glifo se lea sobre
 * un disco claro. Una clave desconocida cae al simbolo del museo (nunca
 * rompe el dibujo de la capa).
 *
 * @param {string} clave — una de CLASES_CIUDAD o "iniciativa"
 * @param {string} color — CSS del disco (COLOR_CIUDAD)
 * @returns {string} data URI
 */
export function iconoCiudad(clave, color) {
  const llave = `${clave}|${color}|ciudad`;
  const guardado = cache.get(llave);
  if (guardado) return guardado;

  const uri = envolver(SIMBOLOS_CIUDAD[clave] ?? MUSEO, color, 0.96, TRAZO_CIUDAD);
  cache.set(llave, uri);
  return uri;
}

export { TAMANO };
