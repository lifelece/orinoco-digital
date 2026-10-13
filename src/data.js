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
  "terminal",
  "refineria",
  "petroquimica",
  "planta_gas",
  "puerto",
  "mejorador",
  // Central electrica. No es cadena de hidrocarburos —va en capa propia, ver
  // ADR-013— pero si es un activo con fuente, y pasa por la misma aduana.
  "central",
  // Instalacion industrial petrolera que las fuentes no permiten clasificar
  // con mas precision. Es preferible a llamar "refineria" a lo que no consta
  // que lo sea.
  "instalacion",
];

/** Claves de hidrocarburo con las que el mapa colorea los campos. */
export const HIDROCARBUROS = ["petroleo", "gas", "mixto", "desconocido"];

/**
 * Traduce el "Fuel type" de GOGET a la clave de hidrocarburo del proyecto.
 *
 * GOGET escribe "oil", "gas" y "oil and gas". Se comprueba primero el caso
 * mixto: "oil and gas" contiene ambas palabras y un orden de comprobacion
 * ingenuo lo clasificaria como petroleo, perdiendo 35 de los 105 campos.
 *
 * Un valor que no se reconoce devuelve "desconocido". No se adivina: un campo
 * mal clasificado en el mapa es peor que uno gris.
 *
 * @param {string | null | undefined} fluido — valor crudo de la fuente
 * @returns {"petroleo" | "gas" | "mixto" | "desconocido"}
 */
export function hidrocarburoDe(fluido) {
  const texto = String(fluido ?? "").toLowerCase();
  const hayPetroleo = texto.includes("oil") || texto.includes("petrol");
  const hayGas = texto.includes("gas");

  if (hayPetroleo && hayGas) return "mixto";
  if (hayGas) return "gas";
  if (hayPetroleo) return "petroleo";
  return "desconocido";
}

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

// --- Proximidad -------------------------------------------------------------
//
// Calculo geodesico puro para el modo Ciudad Bolivar (E1). Todas las funciones
// miden en linea recta sobre la esfera: no son distancias por carretera.

/** Radio medio de la Tierra, en km (IUGG). */
const RADIO_TIERRA_KM = 6371.0088;

const aRadianes = (grados) => (grados * Math.PI) / 180;

/** Acepta `[lng, lat]` o `{lng, lat}` y devuelve `[lng, lat]`. */
const comoPosicion = (p) => (Array.isArray(p) ? p : [p.lng, p.lat]);

/**
 * Distancia haversine entre dos posiciones, en km (R = 6371,0088 km).
 * @param {[number, number] | {lng: number, lat: number}} a — [lng, lat]
 * @param {[number, number] | {lng: number, lat: number}} b — [lng, lat]
 * @returns {number} km, en linea recta sobre la esfera
 */
export function haversineKm(a, b) {
  const [lng1, lat1] = comoPosicion(a);
  const [lng2, lat2] = comoPosicion(b);
  const dFi = aRadianes(lat2 - lat1);
  const dLambda = aRadianes(lng2 - lng1);
  const h =
    Math.sin(dFi / 2) ** 2 +
    Math.cos(aRadianes(lat1)) * Math.cos(aRadianes(lat2)) * Math.sin(dLambda / 2) ** 2;
  return 2 * RADIO_TIERRA_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Recorre todas las posiciones [lng, lat] de unas coordenadas GeoJSON anidadas. */
function* posiciones(coordenadas) {
  if (!Array.isArray(coordenadas)) return;
  if (typeof coordenadas[0] === "number") {
    yield coordenadas;
    return;
  }
  for (const hijo of coordenadas) yield* posiciones(hijo);
}

/**
 * Distancia minima, en km, de un punto a los VERTICES de una feature.
 *
 * Mide al vertice mas cercano, no al segmento ni al interior: es APROXIMADA y
 * es el metodo con el que se fijaron los anillos (ADR-020). Sirve para Point,
 * LineString, Polygon, MultiPoint, MultiLineString y MultiPolygon.
 *
 * @param {[number, number] | {lng: number, lat: number}} punto
 * @param {{geometry?: {coordinates?: unknown}}} feature
 * @returns {number} km; Infinity si la feature no tiene geometria utilizable
 */
export function distanciaMinimaKm(punto, feature) {
  let minima = Infinity;
  for (const posicion of posiciones(feature?.geometry?.coordinates)) {
    const d = haversineKm(punto, posicion);
    if (d < minima) minima = d;
  }
  return minima;
}

/**
 * Los `n` campos mas cercanos a un punto, de menor a mayor distancia.
 * No deduplica: dos registros con el mismo nombre son dos campos.
 *
 * @param {[number, number] | {lng: number, lat: number}} punto
 * @param {{features: Array<Object>} | Array<Object>} campos — FeatureCollection o array de features
 * @param {number} [n=5]
 * @returns {Array<{id: string, nombre: string | null, km: number, confianza: string | null}>}
 */
export function camposMasCercanos(punto, campos, n = 5) {
  const features = Array.isArray(campos) ? campos : campos.features;
  return features
    .map((f) => ({
      id: f.properties?.id,
      nombre: f.properties?.nombre ?? null,
      km: distanciaMinimaKm(punto, f),
      confianza: f.properties?.confianza ?? null,
    }))
    .filter((c) => Number.isFinite(c.km))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

/**
 * Cuantos campos quedan dentro de cada anillo (acumulado: el de 200 km incluye
 * los del de 50 km).
 *
 * @param {[number, number] | {lng: number, lat: number}} punto
 * @param {{features: Array<Object>} | Array<Object>} campos — FeatureCollection o array de features
 * @param {number[]} radiosKm
 * @returns {Array<{km: number, campos: number}>}
 */
export function contarPorAnillo(punto, campos, radiosKm) {
  const features = Array.isArray(campos) ? campos : campos.features;
  const distancias = features.map((f) => distanciaMinimaKm(punto, f));
  return radiosKm.map((km) => ({ km, campos: distancias.filter((d) => d <= km).length }));
}

/**
 * Anillo cerrado de `n` vertices a `km` del centro, sobre la esfera.
 *
 * @param {[number, number] | {lng: number, lat: number}} centro
 * @param {number} km
 * @param {number} [n=128] — segmentos
 * @returns {Array<[number, number]>} n + 1 posiciones [lng, lat]; la ultima repite la primera
 */
export function circuloGeodesico(centro, km, n = 128) {
  const [lng, lat] = comoPosicion(centro);
  const fi1 = aRadianes(lat);
  const lambda1 = aRadianes(lng);
  const delta = km / RADIO_TIERRA_KM;
  const anillo = [];
  for (let i = 0; i < n; i += 1) {
    const rumbo = (2 * Math.PI * i) / n;
    const fi2 = Math.asin(
      Math.sin(fi1) * Math.cos(delta) +
        Math.cos(fi1) * Math.sin(delta) * Math.cos(rumbo)
    );
    const lambda2 =
      lambda1 +
      Math.atan2(
        Math.sin(rumbo) * Math.sin(delta) * Math.cos(fi1),
        Math.cos(delta) - Math.sin(fi1) * Math.sin(fi2)
      );
    anillo.push([(((lambda2 * 180) / Math.PI + 540) % 360) - 180, (fi2 * 180) / Math.PI]);
  }
  anillo.push(anillo[0]);
  return anillo;
}

/**
 * Vertice de la feature mas cercano al punto y su distancia.
 * Mismo metodo (y mismo km) que `distanciaMinimaKm`: sirve para dibujar la
 * linea de proximidad hasta el punto que se midio, no hasta otro.
 *
 * @param {[number, number] | {lng: number, lat: number}} punto
 * @param {{geometry?: {coordinates?: unknown}} | null | undefined} feature
 * @returns {{posicion: [number, number], km: number} | null} null sin geometria utilizable
 */
export function verticeMasCercano(punto, feature) {
  let mejor = null;
  for (const posicion of posiciones(feature?.geometry?.coordinates)) {
    const km = haversineKm(punto, posicion);
    if (!mejor || km < mejor.km) mejor = { posicion: [posicion[0], posicion[1]], km };
  }
  return mejor;
}

/**
 * Elementos por `properties.clase`; 0 para las clases sin elementos.
 * Las clases que no estan en `clases` no se cuentan.
 *
 * @param {Array<{properties?: {clase?: string}}>} features
 * @param {string[]} clases
 * @returns {Object<string, number>}
 */
export function contarPorClase(features, clases) {
  const conteo = Object.fromEntries(clases.map((clase) => [clase, 0]));
  for (const f of features) {
    const clase = f.properties?.clase;
    if (Object.hasOwn(conteo, clase)) conteo[clase] += 1;
  }
  return conteo;
}

/**
 * Semilla de iniciativas -> FeatureCollection SIN geometria (RFC 7946 §3.2),
 * una feature por iniciativa. Solo para listas: no pasa por
 * `validarFeatureCollection` (que descarta lo que no tiene geometria) ni
 * llega a map.js. Los textos se copian tal cual.
 *
 * @param {{iniciativas?: Array<Object>, ultima_verificacion?: string} | null} semilla
 * @returns {{type: "FeatureCollection", features: Array<Object>}}
 */
export function iniciativasSinGeometria(semilla) {
  const lista = Array.isArray(semilla?.iniciativas) ? semilla.iniciativas : [];
  return {
    type: "FeatureCollection",
    features: lista.map((i) => ({
      type: "Feature",
      geometry: null,
      properties: {
        id: i.id,
        nombre: i.nombre,
        fecha: i.fechas ?? i.fecha_fuente ?? null,
        fecha_fuente: i.fecha_fuente ?? null,
        fuente: i.fuente ?? null,
        en_mapa: i.ubicacion?.osm != null,
        ultima_verificacion: semilla.ultima_verificacion ?? null,
      },
    })),
  };
}

/**
 * Posicion {lng, lat} de una feature: la del punto, o la primera de su
 * geometria. Sirve para usar la sede de la capa como origen sin escribir sus
 * coordenadas a mano.
 *
 * @param {{geometry?: {coordinates?: unknown}} | null | undefined} feature
 * @returns {{lng: number, lat: number} | null}
 */
export function posicionDe(feature) {
  const coords = feature?.geometry?.coordinates;
  const primera = coords ? primeraPosicion(coords) : null;
  return primera ? { lng: primera[0], lat: primera[1] } : null;
}
