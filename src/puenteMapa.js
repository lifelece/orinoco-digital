/**
 * puenteMapa.js — Puente entre la interfaz y el mapa (ADR-022).
 *
 * `ui.js` no puede importar `map.js`: eso arrastraria Cesium (~1,1 MB) al
 * primer pintado. En su lugar llama a estas funciones, que NO importan nada
 * de Cesium. `main.js` trae `map.js` con `import()` dinamico y lo conecta con
 * `conectarMapa(modulo)`.
 *
 * Hasta la conexion, las ordenes se guardan en cola y se reproducen en orden
 * al conectar. Las preguntas devuelven un valor neutro. Sin DOM, sin red.
 */

/** @type {Object<string, Function>|null} */
let mapa = null;
/** @type {Array<[string, Array<*>]>} */
let cola = [];

/**
 * Conecta el modulo `map.js` ya cargado y reproduce las ordenes en espera.
 * @param {Object<string, Function>} modulo
 */
export function conectarMapa(modulo) {
  mapa = modulo;
  const pendientes = cola;
  cola = [];
  for (const [nombre, args] of pendientes) mapa[nombre](...args);
}

/** Ejecuta ya si hay mapa; si no, encola. Devuelve true si se ejecuto o se encolo. */
function ordenar(nombre, args) {
  if (mapa) return mapa[nombre](...args);
  cola.push([nombre, args]);
  return true;
}

/** Vacia la cola sin conectar (solo para tests). */
export function reiniciarPuente() {
  mapa = null;
  cola = [];
}

/** Numero de ordenes en espera (solo para tests). */
export const pendientes = () => cola.length;

export const volarAFaja = (...a) => ordenar("volarAFaja", a);
/** Antes de conectar encola el vuelo y da por bueno: no es un fallo, es una espera. */
export const volarAActivo = (...a) => ordenar("volarAActivo", a);
export const deseleccionar = (...a) => ordenar("deseleccionar", a);
export const alternarCapa = (...a) => ordenar("alternarCapa", a);
export const alternarContexto = (...a) => ordenar("alternarContexto", a);
export const alternarDemo = (...a) => ordenar("alternarDemo", a);
/** Sin mapa no hay capa DEMO dibujada. */
export const hayCapaDemo = () => (mapa ? mapa.hayCapaDemo() : false);
