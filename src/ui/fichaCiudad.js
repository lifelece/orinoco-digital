/**
 * fichaCiudad.js — Contenido de la ficha de un servicio de Ciudad Bolivar o de
 * una iniciativa de la CCIEB (E1, RF-9, RF-13, RF-15, RF-21).
 *
 * Sin `cesium` y sin `fetch`. Recibe las utilidades de ui.js por parametro
 * (`esc`, `numero`, `enlaceSeguro`) y no importa ui.js: asi ui.js no crece y
 * este archivo se prueba sin DOM. Devuelve HTML ya escapado.
 */

import { t } from "../i18n/index.js";

/** Capas del mapa cuyas entidades usan esta ficha (`props.capa`). */
const CAPAS = ["ciudadBolivar", "iniciativasCcieb"];

/** Icono de enlace externo, mismo trazo que el de ui.js. */
const ICONO_EXTERNO =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" ' +
  'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ' +
  'focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

const CLASE_ENLACE =
  "mt-3 mr-4 inline-flex min-h-11 items-center gap-1.5 text-[13px] text-gas " +
  "underline decoration-gas/40 underline-offset-2 hover:text-hi sm:min-h-8";

/**
 * @param {unknown} activo
 * @returns {boolean} si el activo es de "ciudadBolivar" o "iniciativasCcieb" (props.capa)
 */
export function esFichaCiudad(activo) {
  return CAPAS.includes(activo?.capa);
}

/**
 * Lista de los campos mas cercanos, solo para la sede (RF-9).
 * @param {Array<{id: string, nombre: string|null, km: number}>} cercanos
 * @param {{esc: Function, numero: Function}} util
 * @returns {string}
 */
function listaCercanos(cercanos, util) {
  const { esc, numero } = util;
  const filas = cercanos
    .map(
      (c) => `
      <li class="flex items-baseline justify-between gap-3 py-1.5">
        <span class="min-w-0 break-words text-hi">${esc(c.nombre ?? c.id)}</span>
        <span class="shrink-0 font-mono text-[13px] tabular-nums text-hi">${esc(
          t("modo.distancia", { km: numero(c.km, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })
        )}</span>
      </li>`
    )
    .join("");
  return `
    <section class="mt-3">
      <h3 class="text-[11px] font-medium uppercase tracking-wider text-lo">${esc(t("modo.cercanosSede"))}</h3>
      <ul class="mt-1 divide-y divide-trazo text-[13px]">${filas}</ul>
      <p class="mt-1 text-xs leading-relaxed text-lo">${esc(t("ciudad.lineaRecta"))}. ${esc(t("modo.metodo"))}</p>
    </section>`;
}

/**
 * Aviso de cautela, con el mismo estilo que los de ui.js.
 * @param {string} clave
 * @param {Function} esc
 * @returns {string}
 */
function aviso(clave, esc) {
  return `<p class="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100">${esc(t(clave))}</p>`;
}

/**
 * Enlace externo seguro (solo http/https) o cadena vacia.
 * @param {unknown} url
 * @param {string} clave — clave i18n del texto
 * @param {{esc: Function, enlaceSeguro: Function}} util
 * @returns {string}
 */
function enlace(url, clave, util) {
  const seguro = util.enlaceSeguro(url);
  if (!seguro) return "";
  return `<a href="${util.esc(seguro)}" target="_blank" rel="noopener noreferrer" class="${CLASE_ENLACE}">${util.esc(
    t(clave)
  )}${ICONO_EXTERNO}</a>`;
}

/** Ficha de una iniciativa: fecha y resumen tal cual (dato de la CCIEB, no se traduce). */
function fichaIniciativa(activo, util) {
  const { esc } = util;
  const fecha = activo.fechas ?? activo.fecha_fuente;
  const cuerpo = `
    <dl class="mt-2 text-[13px]">
      ${
        fecha
          ? `<div class="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
               <dt class="text-lo">${esc(t("ciudad.fecha"))}</dt>
               <dd class="min-w-0 break-words"><span class="font-mono text-[13px] tabular-nums text-hi">${esc(fecha)}</span></dd>
             </div>`
          : ""
      }
    </dl>
    ${activo.resumen ? `<p class="mt-1 text-[13px] leading-relaxed text-hi">${esc(activo.resumen)}</p>` : ""}`;
  return {
    tipo: esc(t("ciudad.iniciativa")),
    titulo: esc(activo.nombre ?? activo.id ?? ""),
    aviso: aviso("ciudad.contenidoOrganizador", esc),
    cuerpo,
    enlaces: enlace(activo.fuente, "modo.notaPrensa", util),
  };
}

/** Ficha de un servicio de la ciudad. */
function fichaServicio(activo, extra, util) {
  const { esc } = util;
  const cercanos = Array.isArray(extra?.cercanos) && extra.cercanos.length ? extra.cercanos : null;
  return {
    tipo: esc(t(`ciudad.clase.${activo.clase}`)),
    titulo: esc(activo.nombre ?? t("ciudad.sinNombre")),
    aviso: activo.geom_precision === "centro_aproximado" ? aviso("ciudad.centroAproximado", esc) : "",
    cuerpo: cercanos ? listaCercanos(cercanos, util) : "",
    enlaces:
      enlace(activo.osm_url, "ciudad.verEnOsm", util) +
      enlace(activo.osm_url, "ciudad.agregarOsm", util),
  };
}

/**
 * Partes de la ficha de un servicio o iniciativa de Ciudad Bolivar.
 *
 * @param {Object} activo — props de la entidad, con `capa`
 * @param {{cercanos?: Array<{id: string, nombre: string|null, km: number, confianza: string|null}>}} [extra]
 *   `cercanos` solo llega para la sede de la ExpoFaja
 * @param {{esc: Function, numero: Function, enlaceSeguro: Function}} util — de ui.js
 * @returns {{tipo: string, titulo: string, aviso: string, cuerpo: string, enlaces: string}}
 *   HTML ya escapado
 */
export function partesFichaCiudad(activo, extra, util) {
  return activo.capa === "iniciativasCcieb"
    ? fichaIniciativa(activo, util)
    : fichaServicio(activo, extra, util);
}
