/**
 * api.js — Frontera de datos. Unico modulo que sabe DE DONDE vienen los datos.
 *
 * Contrato estable: todas las funciones devuelven una FeatureCollection GeoJSON.
 * Ese contrato es lo que permite migrar a Supabase en la Fase 4 sin tocar
 * map.js ni ui.js. No lo rompas.
 */

import { RUTAS_DATOS } from "./config.js";
import { validarFeatureCollection } from "./data.js";

/**
 * @typedef {Object} FeatureCollection
 * @property {"FeatureCollection"} type
 * @property {Array<Object>} features
 */

/** FeatureCollection vacia, para fallos y estados iniciales. */
const VACIA = { type: "FeatureCollection", features: [] };

/**
 * Carga un GeoJSON estatico desde /public/data.
 * @param {string} ruta
 * @returns {Promise<FeatureCollection>}
 */
async function cargarGeoJSON(ruta) {
  const respuesta = await fetch(ruta);
  if (!respuesta.ok) {
    throw new Error(`No se pudo cargar ${ruta}: HTTP ${respuesta.status}`);
  }
  const json = await respuesta.json();
  return validarFeatureCollection(json, ruta);
}

/**
 * Activos upstream: campos petroliferos y gasiferos. Fase 2.
 *
 * Son CAMPOS, no pozos. La mayoria llega con poligono real (Polygon o
 * MultiPolygon); los que no, con un punto en su centro aproximado.
 * map.js debe manejar ambas geometrias.
 *
 * Fase 4 reemplaza el cuerpo de esta funcion por una consulta a Supabase
 * (supabase-js + ST_AsGeoJSON). La firma y el valor de retorno NO cambian.
 *
 * @returns {Promise<FeatureCollection>}
 */
export async function getCampos() {
  return cargarGeoJSON(RUTAS_DATOS.campos);
}

/**
 * Ductos midstream (LineString). Fase 3.
 * @returns {Promise<FeatureCollection>}
 */
export async function getDuctos() {
  return cargarGeoJSON(RUTAS_DATOS.ductos);
}

/**
 * Refinerias, mejoradores y puertos (Point). Fase 3.
 * @returns {Promise<FeatureCollection>}
 */
export async function getDownstream() {
  return cargarGeoJSON(RUTAS_DATOS.downstream);
}

/**
 * Fronteras y limites estatales de Venezuela. Contexto geografico.
 * @returns {Promise<FeatureCollection>}
 */
export async function getLimites() {
  return cargarGeoJSON(RUTAS_DATOS.limites);
}

/**
 * Grid de probabilidad del modelo DEMO. Fase 5.
 *
 * ATENCION: la capa que consume esto DEBE mostrar el banner DEMO.
 * No es un dato observado. Ver MODEL_CARD.md.
 *
 * @returns {Promise<FeatureCollection>}
 */
export async function getGridProbabilidadDemo() {
  return cargarGeoJSON(RUTAS_DATOS.probGrid);
}

export { VACIA };
