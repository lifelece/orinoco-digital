/**
 * cruce.js — Punto en poligono y cruce campos <-> bloques (spec 004, RF-142/143).
 *
 * Puro: sin DOM, sin fetch, sin cesium. Trabaja en el plano lon/lat; a la escala
 * de un bloque (decenas de km) la curvatura no cambia el resultado. Un punto
 * exactamente sobre un borde puede caer a cualquier lado (aceptado).
 */

/** Ray casting sobre un anillo [[lng, lat], ...]; true si el punto esta dentro. */
function dentroDeAnillo(x, y, anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i];
    const [xj, yj] = anillo[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

/** Un poligono = [anilloExterior, ...agujeros]. */
function dentroDePoligono(x, y, anillos) {
  if (!Array.isArray(anillos) || anillos.length === 0) return false;
  if (!dentroDeAnillo(x, y, anillos[0])) return false;
  for (let k = 1; k < anillos.length; k++) {
    if (dentroDeAnillo(x, y, anillos[k])) return false;
  }
  return true;
}

/**
 * @param {[number, number]} punto  [lng, lat]
 * @param {{type: string, coordinates: unknown} | null | undefined} geometry  Polygon o MultiPolygon
 * @returns {boolean} true si cae dentro (los agujeros quedan fuera); false para otras geometrias
 */
export function puntoEnPoligono(punto, geometry) {
  const [x, y] = punto;
  if (geometry?.type === "Polygon") return dentroDePoligono(x, y, geometry.coordinates);
  if (geometry?.type === "MultiPolygon") {
    return (geometry.coordinates ?? []).some((p) => dentroDePoligono(x, y, p));
  }
  return false;
}

/**
 * Cruza los campos del mapa con los bloques por su punto representativo.
 * Un campo puede caer en varios bloques solapados (RF-143 los lista todos).
 * Los mapas solo contienen entradas no vacias.
 *
 * @param {Array<{properties: {id: string}}>} campos
 * @param {Array<{id?: string, properties: {id?: string}, geometry: object}>} bloques
 * @param {(campo: object) => ({lng: number, lat: number} | [number, number] | null)} posicionDe
 *   inyectada, para que este modulo no dependa de data.js
 * @returns {{porBloque: Map<string, string[]>, porCampo: Map<string, string[]>}}
 */
export function cruzarCamposConBloques(campos, bloques, posicionDe) {
  const porBloque = new Map();
  const porCampo = new Map();
  for (const campo of campos) {
    const pos = posicionDe(campo);
    if (!pos) continue;
    const punto = Array.isArray(pos) ? pos : [pos.lng, pos.lat];
    const idCampo = campo.properties?.id ?? campo.id;
    for (const bloque of bloques) {
      if (!puntoEnPoligono(punto, bloque.geometry)) continue;
      const idBloque = bloque.properties?.id ?? bloque.id;
      if (!porBloque.has(idBloque)) porBloque.set(idBloque, []);
      porBloque.get(idBloque).push(idCampo);
      if (!porCampo.has(idCampo)) porCampo.set(idCampo, []);
      porCampo.get(idCampo).push(idBloque);
    }
  }
  return { porBloque, porCampo };
}
