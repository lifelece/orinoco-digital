/**
 * embed.js — Modo ?embed=1 del micrositio (RF-60..65): la pagina dentro de un
 * iframe de la CCIEB. Sin red; el unico mensaje sale por postMessage hacia los
 * origenes de la CCIEB, nunca hacia "*".
 */

import { ORIGEN_CCIEB } from "../config.js";

/** Separacion minima entre mensajes de altura (RF-63). */
const INTERVALO_MS = 150;

/**
 * Origenes de la CCIEB que pueden recibir la altura: el dominio y su variante www
 * (los mismos de frame-ancestors, ADR-020 §6).
 * @returns {string[]}
 */
function origenesDestino() {
  const url = new URL(ORIGEN_CCIEB);
  const www = url.hostname.startsWith("www.") ? url.hostname.slice(4) : `www.${url.hostname}`;
  return [ORIGEN_CCIEB, `${url.protocol}//${www}`];
}

/**
 * Si la URL pide el modo embed.
 * @param {string} search cadena de consulta (location.search)
 * @returns {boolean} true con embed=1
 */
export function esEmbed(search) {
  return new URLSearchParams(search).get("embed") === "1";
}

/**
 * Activa el modo embed: noindex, enlaces a la ventana superior y, si la pagina
 * esta dentro de un iframe, aviso de altura al padre (solo a la CCIEB).
 * @param {Document} documento
 * @param {Window} ventana
 * @returns {void} efectos: meta robots, target de los enlaces, ResizeObserver y mensajes
 */
export function iniciarEmbed(documento, ventana) {
  const meta = documento.createElement("meta");
  meta.name = "robots";
  meta.content = "noindex";
  documento.head.append(meta);
  documento.documentElement.classList.add("ef-embed");

  const observador = new MutationObserver(() => enlacesAlTope(documento));
  observador.observe(documento.body, { childList: true, subtree: true });
  enlacesAlTope(documento);

  if (ventana.parent !== ventana) avisarAltura(documento, ventana);
}

/** target="_top" en los enlaces que salen de la pagina (los de ancla se quedan). */
function enlacesAlTope(documento) {
  for (const a of documento.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    if (href.startsWith("#") || href.startsWith("mailto:")) continue;
    if (a.target !== "_top") a.target = "_top";
    if (!a.rel.includes("noopener")) a.rel = `${a.rel} noopener`.trim();
  }
}

/** Envia la altura del documento al padre con un minimo de 150 ms entre mensajes. */
function avisarAltura(documento, ventana) {
  const destinos = origenesDestino();
  let ultimo = 0;
  let pendiente = null;
  let enviada = -1;

  const enviar = () => {
    pendiente = null;
    const altura = Math.ceil(documento.body.getBoundingClientRect().height);
    if (altura === enviada) return;
    enviada = altura;
    ultimo = Date.now();
    for (const destino of destinos) {
      ventana.parent.postMessage({ tipo: "expofaja:altura", altura }, destino);
    }
  };

  const alCambiar = () => {
    const espera = INTERVALO_MS - (Date.now() - ultimo);
    if (espera <= 0 && pendiente === null) enviar();
    else if (pendiente === null) pendiente = setTimeout(enviar, espera); // la ultima altura siempre sale
  };

  new ResizeObserver(alCambiar).observe(documento.body);
  alCambiar();
}
