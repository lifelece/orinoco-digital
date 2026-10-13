/**
 * vista.js — DOM del micrositio. Sin fetch y sin cesium: los datos llegan
 * desde main.js.
 */

import { t } from "../i18n/index.js";

/**
 * Pinta el titulo del micrositio en el contenedor.
 * @param {HTMLElement} contenedor
 * @returns {void} efecto: reemplaza el contenido del contenedor
 */
export function montarVista(contenedor) {
  const h1 = document.createElement("h1");
  h1.className = "p-4 text-2xl font-extrabold text-ef-petroleo";
  h1.textContent = t("expofaja.titulo");
  contenedor.replaceChildren(h1);
}
