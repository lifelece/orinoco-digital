/**
 * modos.js — Parte pura de los modos del mapa: lectura de enlaces, resolucion
 * del modo y busqueda de un activo por id. Sin window, document ni history:
 * main.js le pasa los valores y aplica el resultado (ADR-020, pieza 5 y 10).
 */

/**
 * Lee los parametros de enlace que entiende el mapa. Los vacios son null.
 * @param {string} search — `location.search`, con o sin "?"
 * @returns {{modo: string|null, capa: string|null, vuelo: string|null}}
 */
export function leerEnlace(search) {
  const params = new URLSearchParams(search ?? "");
  const leer = (clave) => params.get(clave) || null;
  return { modo: leer("modo"), capa: leer("capa"), vuelo: leer("vuelo") };
}

/**
 * Un modo pedido y valido gana; ausente o desconocido = el inicial.
 * @param {string|null|undefined} pedido
 * @param {string[]} modos — ids validos
 * @param {string} inicial
 * @returns {string}
 */
export function resolverModo(pedido, modos, inicial) {
  return modos.includes(pedido) ? pedido : inicial;
}

/**
 * URL de un modo. Cambiar de modo descarta `vuelo` y `capa`: son de un solo uso.
 * @param {string} pathname
 * @param {string} modo
 * @returns {string}
 */
export function urlDeModo(pathname, modo) {
  return `${pathname}?modo=${encodeURIComponent(modo)}`;
}

/**
 * Busca una feature por id en las colecciones, en el orden dado.
 * Las colecciones null (cargando) o false (fallaron) se saltan.
 * @param {string|null} id — el de `properties.id` (o `feature.id`)
 * @param {Object<string, {features: Array<Object>}|null|false>} colecciones
 * @param {string[]} orden — claves de `colecciones`
 * @returns {{capa: string, feature: Object}|null}
 */
export function buscarActivo(id, colecciones, orden) {
  if (!id) return null;
  for (const capa of orden) {
    const coleccion = colecciones[capa];
    if (!coleccion?.features) continue;
    const feature = coleccion.features.find((f) => (f.properties?.id ?? f.id) === id);
    if (feature) return { capa, feature };
  }
  return null;
}
