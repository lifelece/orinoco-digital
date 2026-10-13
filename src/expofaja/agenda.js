/**
 * agenda.js — Funciones puras sobre la agenda. Sin red, sin DOM, sin Cesium.
 * Firmas de docs 04-ESPECIFICACION-TECNICA seccion 6. Cuerpos pendientes.
 */

/**
 * Sesiones en curso, una por sala.
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {Array<{sala: string, sesion: Object}>} vacio si no hay ninguna
 */
export function sesionActual(agenda, ahora) {
  void agenda;
  void ahora;
  return [];
}

/**
 * Siguiente sesion con hora fija.
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {Object|null} null si no queda ninguna
 */
export function proximaSesion(agenda, ahora) {
  void agenda;
  void ahora;
  return null;
}

/**
 * Genera un evento iCalendar (RFC 5545) para una sesion.
 * @param {Object} sesion
 * @param {Object} dia
 * @param {Object} ponente
 * @returns {string} contenido .ics
 * @throws {Error} hasta implementarse
 */
export function generarIcs(sesion, dia, ponente) {
  void sesion;
  void dia;
  void ponente;
  throw new Error("no implementado: generarIcs");
}

/**
 * Estado del evento respecto a la hora dada.
 * @param {Object} evento
 * @param {Date} ahora
 * @returns {"antes"|"durante"|"despues"}
 * @throws {Error} hasta implementarse
 */
export function estadoEvento(evento, ahora) {
  void evento;
  void ahora;
  throw new Error("no implementado: estadoEvento");
}
