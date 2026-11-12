/**
 * fichaBloque.js — Contenido de la ficha de un bloque de "Bloques y contratos 2026"
 * (spec 004, T11; RF-139 a RF-142, RF-144, RF-145).
 *
 * Sin `cesium`, sin `fetch` y sin DOM. Funcion pura: recibe el bloque, los campos
 * que caen dentro y las utilidades de ui.js (`esc`, `t`, `enlaceSeguro`, `numero`) por
 * parametro, como `fichaCiudad.js`. Los datos vienen de un tercero: TODO valor se
 * escapa con `esc` antes de entrar al HTML y la URL pasa por `enlaceSeguro`.
 * Ningun texto propio interpreta los datos (RNF-7): rotulos neutrales de i18n.
 */

import { UMBRAL_FRESCURA_DIAS } from "../config.js";

const CLASE_ENLACE =
  "mt-3 inline-flex min-h-11 items-center gap-1.5 text-[13px] text-gas " +
  "underline decoration-gas/40 underline-offset-2 hover:text-hi sm:min-h-8";
const CLASE_DT = "text-lo";
const CLASE_DD = "m-0 text-hi";
const CLASE_VACIO = "text-lo";

/**
 * Color del punto del chip segun la antiguedad: mismos umbrales y mismas clases que
 * el chip de frescura del mapa (`ui.js`, `chipFrescura`).
 * @param {number|null|undefined} dias
 * @returns {string}
 */
export function claseFrescura(dias) {
  if (typeof dias !== "number" || !Number.isFinite(dias)) return "bg-lo";
  if (dias > UMBRAL_FRESCURA_DIAS.caducado) return "bg-alerta";
  if (dias > UMBRAL_FRESCURA_DIAS.aviso) return "bg-crudo";
  return "bg-activo";
}

/**
 * @param {object} bloque Feature del bloque (esquema plan 004 §3.1)
 * @param {{campos?: Array<{id: string, nombre: string|null}>, frescura?: {fecha: string|null, dias: number|null}}} contexto
 *   `campos`: campos del mapa cuyo punto cae dentro (RF-142). `frescura`: fecha de corte
 *   (la mas antigua de los datos cargados, RF-145) y su antiguedad en dias, calculada por quien llama.
 * @param {{esc: Function, t: Function, enlaceSeguro: Function, numero: Function}} util
 * @returns {string} HTML ya escapado
 */
export function htmlFichaBloque(bloque, contexto, util) {
  const { esc, t, enlaceSeguro, numero } = util;
  const p = bloque?.properties ?? bloque ?? {};
  const campos = contexto?.campos ?? [];
  const frescura = contexto?.frescura ?? { fecha: p.fecha_corte ?? null, dias: null };

  const sinDato = `<span class="${CLASE_VACIO}">${esc(t("bloques.ficha.sinDato"))}</span>`;
  const texto = (v) => (typeof v === "string" && v.trim() !== "" ? esc(v) : sinDato);

  /** Varios valores de un mismo campo de la fuente: una lista, uno por renglon (RF-141). */
  const listaOperadores = (valores) =>
    Array.isArray(valores) && valores.length > 0
      ? `<ul class="m-0 list-none p-0">${valores.map((v) => `<li>${esc(v)}</li>`).join("")}</ul>`
      : `<span class="${CLASE_VACIO}">${esc(t("bloques.ficha.sinRegistro"))}</span>`;

  const renglon = (clave, contenido) =>
    `<div class="flex flex-col gap-0.5 py-1.5"><dt class="${CLASE_DT}">${esc(t(clave))}</dt><dd class="${CLASE_DD}">${contenido}</dd></div>`;

  const licencia =
    typeof p.licencia_ofac === "string" && p.licencia_ofac.trim() !== ""
      ? esc(p.licencia_ofac)
      : esc(t("bloques.ficha.sinLicencia"));
  const estatusNorm = p.estatus_norm ? esc(t(`bloques.estatus.${p.estatus_norm}`)) : sinDato;
  const convenio = esc(t(p.convenio_eeuu_vzla === true ? "bloques.ficha.convenioSi" : "bloques.ficha.convenioNo"));
  const municipios =
    Array.isArray(p.municipios) && p.municipios.length > 0 ? esc(p.municipios.join(", ")) : sinDato;
  const area =
    typeof p.area_km2 === "number" && Number.isFinite(p.area_km2)
      ? esc(`${numero(p.area_km2, { maximumFractionDigits: 1 })} km²`)
      : sinDato;
  const registros = Number.isInteger(p.registros_vinculados) ? esc(numero(p.registros_vinculados)) : sinDato;

  const listaCampos =
    campos.length > 0
      ? `<ul class="m-0 list-none p-0">${campos.map((c) => `<li>${esc(c.nombre ?? c.id)}</li>`).join("")}</ul>`
      : `<span class="${CLASE_VACIO}">${esc(t("bloques.ficha.ningunCampo"))}</span>`;

  const textoCorte = frescura.fecha ? t("bloques.ficha.corte", { fecha: frescura.fecha }) : "";
  const chip = frescura.fecha
    ? `<p class="mt-3 inline-flex items-center gap-1.5 text-[12px] text-lo">` +
      `<span class="h-1.5 w-1.5 shrink-0 rounded-full ${claseFrescura(frescura.dias)}" aria-hidden="true"></span>` +
      `<span>${esc(textoCorte)}</span></p>`
    : "";

  const atribucion = t("bloques.ficha.atribucion", {
    fuente: p.fuente ?? "",
    poligonos: p.fuente_poligonos ?? "",
  });
  const url = enlaceSeguro(p.fuente_url);
  const enlace = url
    ? `<a class="${CLASE_ENLACE}" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(t("bloques.ficha.verFuente"))}</a>`
    : "";

  return (
    `<section class="bloque-ficha" data-bloque="${esc(p.id ?? "")}">` +
    `<h3 class="text-sm font-medium text-hi">${esc(p.nombre ?? "")} <span class="text-lo">· ${esc(p.id ?? "")}</span></h3>` +
    `<dl class="m-0 mt-2 text-xs leading-relaxed">` +
    renglon("bloques.ficha.operador2026", listaOperadores(p.operadores_2026)) +
    renglon("bloques.ficha.operadorAntes", listaOperadores(p.operadores_antes_2026)) +
    renglon("bloques.ficha.tipoAlianza", texto(p.tipo_alianza)) +
    renglon("bloques.ficha.estatusFuente", texto(p.estatus_fuente)) +
    renglon("bloques.ficha.estatusNorm", estatusNorm) +
    renglon("bloques.ficha.licencia", licencia) +
    renglon("bloques.ficha.convenio", convenio) +
    renglon("bloques.ficha.zona", texto(p.zona)) +
    renglon("bloques.ficha.entidad", texto(p.entidad_federal)) +
    renglon("bloques.ficha.municipios", municipios) +
    renglon("bloques.ficha.area", area) +
    renglon("bloques.ficha.registros", registros) +
    renglon("bloques.ficha.campos", listaCampos) +
    `</dl>` +
    chip +
    `<p class="mt-2 text-[11px] leading-relaxed text-lo">${esc(atribucion)}</p>` +
    enlace +
    `</section>`
  );
}
