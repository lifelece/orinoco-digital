/**
 * Interpolacion de marcadores {nombre} en un texto. Pura: sin DOM ni estado.
 *
 * Un marcador sin valor (ausente, null o undefined) queda visible en el texto,
 * igual que una clave sin traducir, para que el hueco se vea.
 */

/**
 * @param {string} texto
 * @param {Object<string, string|number>} [params]
 * @returns {string} el texto intacto si no hay params
 */
export function interpolar(texto, params) {
  if (!params) return texto;
  return texto.replace(/\{(\w+)\}/g, (marcador, nombre) => {
    const valor = Object.hasOwn(params, nombre) ? params[nombre] : undefined;
    return valor === undefined || valor === null ? marcador : String(valor);
  });
}
