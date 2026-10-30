/**
 * Cargador de recorridos (spec 003, T08; plan 3.4). Unico modulo de src/ruta/
 * que hace red. RF-96, 105, 122.
 *
 * Validacion de runtime = solo estructura y tipos (RF-122): se reutiliza
 * `validarRecorridos` con un conjunto de ids permisivo, porque que el
 * `objetivo_ref` exista en los GeoJSON lo comprueba CI (test/recorridos.test.mjs)
 * y en runtime lo resuelve `motor.resolverCamara` (ausente / pendiente).
 */

import { RECORRIDO, RUTAS_DATOS, RUTAS_PUBLICADAS, SECTORES } from "../config.js";
import { validarRecorridos } from "./validar.js";

const ORIGEN = RUTAS_DATOS.recorridos;
const CUALQUIER_ID = { has: () => true };

/**
 * fetch(RUTAS_DATOS.recorridos) + validacion estructural ligera.
 * @param {typeof fetch} [fetchFn] inyectable para tests; por defecto globalThis.fetch
 * @returns {Promise<Object>} el JSON de recorridos
 * @throws {Error} con mensaje que nombra el archivo y la causa
 */
export async function cargarRecorridos(fetchFn = globalThis.fetch) {
  let respuesta;
  try {
    respuesta = await fetchFn(ORIGEN);
  } catch (e) {
    throw new Error(`${ORIGEN}: no se pudo descargar (${e && e.message ? e.message : e})`);
  }
  if (!respuesta.ok) throw new Error(`${ORIGEN}: HTTP ${respuesta.status}`);

  let json;
  try {
    json = await respuesta.json();
  } catch (e) {
    throw new Error(`${ORIGEN}: no es JSON valido (${e && e.message ? e.message : e})`);
  }

  const { ok, errores } = validarRecorridos(json, {
    idsActivos: CUALQUIER_ID,
    sectores: SECTORES,
    nombresPropios: RECORRIDO.nombresPropios,
    ejemplosForaneos: RECORRIDO.ejemplosForaneos,
    publicadas: RUTAS_PUBLICADAS,
  });
  if (!ok) {
    const primero = errores[0];
    const resto = errores.length > 1 ? ` (+${errores.length - 1} mas)` : "";
    throw new Error(`${ORIGEN}: estructura invalida en ${primero.ruta} [${primero.regla}]: ${primero.detalle}${resto}`);
  }
  return json;
}
