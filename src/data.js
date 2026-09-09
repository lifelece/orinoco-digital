/**
 * data.js — Validacion y normalizacion. Sin red, sin DOM, sin Cesium.
 *
 * Este modulo es la aduana: nada entra al mapa sin pasar por aqui.
 * Un dato sin fuente o con coordenadas imposibles se rechaza, no se dibuja.
 */

import { CRS, PRESUPUESTO } from "./config.js";

/** Estados validos de un activo. */
export const ESTADOS = ["activo", "inactivo", "abandonado", "desconocido"];

/**
 * Tipos validos de activo.
 *
 * "campo" es un yacimiento con extension propia (poligono); "pozo" es una
 * perforacion puntual. No son lo mismo y no se mezclan: las fuentes publicas
 * disponibles son de campos, y presentarlos como pozos falsearia el dato.
 */
export const TIPOS = [
  "campo",
  "pozo",
  "ducto",
  "refineria",
  "puerto",
  "mejorador",
];

/**
 * Valida que un objeto sea una FeatureCollection GeoJSON usable.
 * @param {unknown} json
 * @param {string} origen — para mensajes de error legibles
 * @returns {{type: "FeatureCollection", features: Array<Object>}}
 */
export function validarFeatureCollection(json, origen = "desconocido") {
  if (!json || typeof json !== "object") {
    throw new Error(`${origen}: no es un objeto JSON`);
  }
  if (json.type !== "FeatureCollection") {
    throw new Error(`${origen}: se esperaba FeatureCollection, llego "${json.type}"`);
  }
  if (!Array.isArray(json.features)) {
    throw new Error(`${origen}: "features" no es un array`);
  }

  if (json.features.length > PRESUPUESTO.maxEntidadesPorCapa) {
    console.warn(
      `${origen}: ${json.features.length} features supera el presupuesto ` +
        `(${PRESUPUESTO.maxEntidadesPorCapa}). Ver docs/PERFORMANCE_BUDGET.md.`
    );
  }

  const validas = json.features.filter((f) => esFeatureValida(f, origen));
  return { type: "FeatureCollection", features: validas };
}

/**
 * Una Feature es valida si tiene geometria con coordenadas dentro del planeta.
 * @param {Object} feature
 * @param {string} origen
 * @returns {boolean}
 */
function esFeatureValida(feature, origen) {
  if (!feature?.geometry?.coordinates) {
    console.warn(`${origen}: feature sin geometria, descartada`, feature?.id);
    return false;
  }

  const primera = primeraPosicion(feature.geometry.coordinates);
  if (!primera) return false;

  const [lng, lat] = primera;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    console.warn(`${origen}: coordenadas no numericas, descartada`, feature.id);
    return false;
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    console.warn(
      `${origen}: coordenadas fuera de rango ${CRS}, descartada`,
      feature.id,
      primera
    );
    return false;
  }
  return true;
}

/**
 * Extrae la primera posicion [lng, lat] de cualquier geometria GeoJSON anidada.
 * @param {Array} coords
 * @returns {[number, number] | null}
 */
function primeraPosicion(coords) {
  let actual = coords;
  let profundidad = 0;
  while (Array.isArray(actual[0]) && profundidad < 5) {
    actual = actual[0];
    profundidad += 1;
  }
  return Array.isArray(actual) && actual.length >= 2 ? [actual[0], actual[1]] : null;
}

/**
 * Normaliza las propiedades de un activo al esquema del proyecto.
 * Los campos ausentes quedan como null explicito, NUNCA inventados.
 *
 * @param {Object} props — properties crudas de la Feature
 * @returns {Object}
 */
export function normalizarActivo(props = {}) {
  return {
    id: props.id ?? null,
    tipo: TIPOS.includes(props.tipo) ? props.tipo : null,
    sector: props.sector ?? null,
    bloque: props.bloque ?? null,
    estado: ESTADOS.includes(props.estado) ? props.estado : "desconocido",
    operadora: props.operadora ?? null,
    notas: props.notas ?? null,

    // Trazabilidad: obligatorios por politica del proyecto.
    // Ver docs/DATA_SOURCES.md y CLAUDE.md regla 3.
    fuente: props.fuente ?? null,
    confianza: props.confianza ?? null, // alta | media | baja
    ultima_verificacion: props.ultima_verificacion ?? null, // ISO 8601
  };
}

/**
 * Un activo publicable debe tener fuente. Sin fuente no entra al mapa.
 * @param {Object} activoNormalizado
 * @returns {boolean}
 */
export function tieneProcedencia(activoNormalizado) {
  return Boolean(activoNormalizado.fuente);
}
