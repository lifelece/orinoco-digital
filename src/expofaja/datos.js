/**
 * datos.js — Origen de datos del micrositio: fetch y validacion. Sin DOM.
 */

/**
 * Carga y valida la agenda del evento.
 * @returns {Promise<Object>} agenda validada
 * @throws {Error} siempre, hasta implementar T-datos (esqueleto de E2 T1)
 */
export async function cargarAgenda() {
  throw new Error("no implementado: cargarAgenda");
}

/**
 * Comprueba la integridad referencial de la agenda (todo ponente_id existe,
 * horas con formato HH:MM).
 * @param {Object} agenda
 * @returns {string[]} lista de problemas; vacia si la agenda es valida
 */
export function validarAgenda(agenda) {
  void agenda;
  return [];
}
