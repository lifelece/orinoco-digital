/**
 * i18n — Diccionarios ES/EN y helper t(clave). Sin librerias.
 *
 * Existe desde el primer commit a proposito: retro-adaptar i18n despues de
 * escribir toda la UI es caro. Ver docs/DECISIONS.md -> ADR-005.
 */

import es from "./es.json";
import en from "./en.json";
import { IDIOMA_POR_DEFECTO, IDIOMAS } from "../config.js";

const DICCIONARIOS = { es, en };

const CLAVE_ALMACENAMIENTO = "orinoco.idioma";

let idiomaActual = detectarIdioma();

/**
 * Preferencia guardada > idioma del navegador > por defecto.
 * @returns {string}
 */
function detectarIdioma() {
  try {
    const guardado = localStorage.getItem(CLAVE_ALMACENAMIENTO);
    if (guardado && IDIOMAS.includes(guardado)) return guardado;
  } catch {
    // localStorage puede lanzar en modo privado. No es motivo para romper la app.
  }
  const navegador = navigator.language?.slice(0, 2);
  return IDIOMAS.includes(navegador) ? navegador : IDIOMA_POR_DEFECTO;
}

/**
 * Traduce una clave. Si falta, devuelve la clave misma para que el hueco se vea.
 * @param {string} clave
 * @returns {string}
 */
export function t(clave) {
  return DICCIONARIOS[idiomaActual]?.[clave] ?? clave;
}

/** @returns {string} */
export function idioma() {
  return idiomaActual;
}

/**
 * Cambia el idioma y persiste la eleccion.
 * @param {string} nuevo
 */
export function cambiarIdioma(nuevo) {
  if (!IDIOMAS.includes(nuevo)) return;
  idiomaActual = nuevo;
  try {
    localStorage.setItem(CLAVE_ALMACENAMIENTO, nuevo);
  } catch {
    // Sin persistencia el idioma dura la sesion. Aceptable.
  }
  document.documentElement.lang = nuevo;
  window.dispatchEvent(new CustomEvent("idioma:cambiado", { detail: nuevo }));
}
