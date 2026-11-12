/**
 * capaBloques.js — Leyenda, filtros y contador de "Bloques y contratos 2026"
 * (spec 004, T12; RF-138, RF-146 a RF-149).
 *
 * Sin `cesium` y sin `fetch`. El HTML sale de funciones puras que reciben `t` y
 * escapan todo valor (las empresas y licencias vienen de un tercero). El color nunca
 * es el unico canal: cada entrada de leyenda lleva su texto (RNF-5). El unico efecto
 * es `montarFiltrosBloques`, que engancha eventos al nodo que le pasan y no toca
 * `document`.
 */

import { COLOR_CAPA_BLOQUE } from "../config.js";

const CAPAS = ["nabep", "chevron", "acuerdo_2026", "sin_registro"];
const GRUPOS = ["operando", "detenido", "sin_operacion_registrada"];
const GRIS = "#8b98a5";

/** Escapado minimo propio: el modulo es puro y no recibe `esc` en estas firmas. */
function esc(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MUESTRA_RELLENO = {
  operando: `background:${GRIS}`,
  detenido: `background:${GRIS};opacity:.6`, // el mapa usa 3 opacidades, no rayado (T13)
  sin_operacion_registrada: `background:${GRIS};opacity:.3`,
};

const muestra = (estilo) =>
  `<span class="inline-block h-3.5 w-5 shrink-0 rounded-sm border border-current" style="${esc(estilo)}" aria-hidden="true"></span>`;

/**
 * Leyenda en texto: 4 capas (con n.o de bloques visibles), 3 tratamientos de relleno y 2 bordes.
 * @param {{nabep: number, chevron: number, acuerdo_2026: number, sin_registro: number}} conteos
 * @param {(clave: string, params?: object) => string} t
 * @returns {string} HTML ya escapado
 */
export function htmlLeyendaBloques(conteos, t) {
  const capas = CAPAS.map(
    (c) =>
      `<li class="flex items-center gap-2" data-leyenda="capa-${c}">${muestra(`background:${COLOR_CAPA_BLOQUE[c]}`)}` +
      `<span>${esc(t(`bloques.capa.${c}`))} · ${esc(t("bloques.leyenda.visibles", { n: conteos?.[c] ?? 0 }))}</span></li>`
  ).join("");
  const grupos = GRUPOS.map(
    (g) =>
      `<li class="flex items-center gap-2" data-leyenda="grupo-${g}">${muestra(MUESTRA_RELLENO[g])}` +
      `<span>${esc(t(`bloques.grupo.${g}`))}</span></li>`
  ).join("");
  const borde = (clave, estilo) =>
    `<li class="flex items-center gap-2" data-leyenda="borde-${clave}">` +
    `<span class="inline-block h-3.5 w-5 shrink-0 rounded-sm" style="border:2px ${estilo} currentColor" aria-hidden="true"></span>` +
    `<span>${esc(t(`bloques.leyenda.borde${clave === "discontinuo" ? "Discontinuo" : "Continuo"}`))}</span></li>`;
  return (
    `<section class="bloques-leyenda text-xs text-hi" aria-label="${esc(t("bloques.leyenda.titulo"))}">` +
    `<h3 class="text-[11px] font-medium uppercase tracking-wider text-lo">${esc(t("bloques.leyenda.titulo"))}</h3>` +
    `<p class="mt-1 text-lo">${esc(t("bloques.leyenda.rellenoTitulo"))}</p>` +
    `<ul class="m-0 mt-1 list-none space-y-1 p-0">${capas}${grupos}</ul>` +
    `<h4 class="mt-2 text-lo">${esc(t("bloques.leyenda.bordeTitulo"))}</h4>` +
    `<ul class="m-0 mt-1 list-none space-y-1 p-0">${borde("discontinuo", "dashed")}${borde("continuo", "solid")}</ul>` +
    `<p class="mt-1 text-lo">${esc(t("bloques.leyenda.bordeNota"))}</p>` +
    `</section>`
  );
}

const CLASE_ETIQUETA = "flex min-h-11 items-center gap-2 sm:min-h-8";

function casilla(dimension, valor, etiqueta, marcada, nulo = false) {
  return (
    `<label class="${CLASE_ETIQUETA}"><input type="checkbox" data-filtro="${dimension}" ` +
    `data-valor="${esc(valor ?? "")}"${nulo ? ' data-nulo="1"' : ""}${marcada ? " checked" : ""}>` +
    `<span>${esc(etiqueta)}</span></label>`
  );
}

function grupoCasillas(dimension, titulo, items) {
  return (
    `<fieldset class="m-0 mt-2 border-0 p-0"><legend class="text-lo">${esc(titulo)}</legend>` +
    `<div class="max-h-40 overflow-y-auto">${items.join("")}</div></fieldset>`
  );
}

/**
 * Filtros, contador "n de N" y estado vacio con "Quitar filtros".
 * @param {{empresas: string[], estatus: string[], licencias: Array<string|null>, convenio: boolean[]}} opciones
 * @param {{empresas: Set<string>, estatus: Set<string>, licencias: Set<string|null>, convenio: boolean|null}} filtros
 * @param {number} visibles bloques que cumplen los filtros
 * @param {number} total bloques cargados
 * @param {(clave: string, params?: object) => string} t
 * @returns {string} HTML ya escapado
 */
export function htmlFiltrosBloques(opciones, filtros, visibles, total, t) {
  const f = {
    empresas: filtros?.empresas ?? new Set(),
    estatus: filtros?.estatus ?? new Set(),
    licencias: filtros?.licencias ?? new Set(),
    convenio: filtros?.convenio ?? null,
  };
  const empresas = opciones.empresas.map((e) => casilla("empresas", e, e, f.empresas.has(e)));
  const estatus = opciones.estatus.map((e) => casilla("estatus", e, t(`bloques.estatus.${e}`), f.estatus.has(e)));
  const licencias = opciones.licencias.map((l) =>
    l === null
      ? casilla("licencias", "", t("bloques.ficha.sinLicencia"), f.licencias.has(null), true)
      : casilla("licencias", l, l, f.licencias.has(l))
  );
  const radio = (valor, clave, marcado) =>
    `<label class="${CLASE_ETIQUETA}"><input type="radio" name="bloques-convenio" data-filtro="convenio" ` +
    `data-valor="${valor}"${marcado ? " checked" : ""}><span>${esc(t(clave))}</span></label>`;
  const convenio =
    `<fieldset class="m-0 mt-2 border-0 p-0"><legend class="text-lo">${esc(t("bloques.filtros.convenio"))}</legend>` +
    radio("todos", "bloques.filtros.convenioTodos", f.convenio === null) +
    radio("si", "bloques.filtros.convenioSi", f.convenio === true) +
    radio("no", "bloques.filtros.convenioNo", f.convenio === false) +
    `</fieldset>`;
  const vacio =
    visibles === 0
      ? `<div class="mt-2" data-estado="vacio"><p class="m-0 text-hi">${esc(t("bloques.filtros.vacio"))}</p>` +
        `<button type="button" class="mt-1 min-h-11 underline sm:min-h-8" data-accion="quitar-filtros">${esc(t("bloques.filtros.quitar"))}</button></div>`
      : "";
  return (
    `<section class="bloques-filtros text-xs text-hi" aria-label="${esc(t("bloques.filtros.titulo"))}">` +
    `<h3 class="text-[11px] font-medium uppercase tracking-wider text-lo">${esc(t("bloques.filtros.titulo"))}</h3>` +
    `<p class="m-0 mt-1" role="status" aria-live="polite" data-contador>${esc(t("bloques.filtros.contador", { n: visibles, N: total }))}</p>` +
    vacio +
    grupoCasillas("empresas", t("bloques.filtros.empresa"), empresas) +
    grupoCasillas("estatus", t("bloques.filtros.estatus"), estatus) +
    grupoCasillas("licencias", t("bloques.filtros.licencia"), licencias) +
    convenio +
    `</section>`
  );
}

/** Filtros sin ninguna dimension activa. */
function filtrosVacios() {
  return { empresas: new Set(), estatus: new Set(), licencias: new Set(), convenio: null };
}

/**
 * Lee el estado de los controles marcados dentro de `nodo`.
 * @param {{querySelectorAll: Function}} nodo
 * @returns {{empresas: Set<string>, estatus: Set<string>, licencias: Set<string|null>, convenio: boolean|null}}
 */
function leerFiltros(nodo) {
  const filtros = filtrosVacios();
  for (const el of nodo.querySelectorAll("input[data-filtro]")) {
    if (!el.checked) continue;
    const { filtro, valor, nulo } = el.dataset;
    if (filtro === "convenio") filtros.convenio = valor === "si" ? true : valor === "no" ? false : null;
    else filtros[filtro].add(nulo === "1" ? null : valor);
  }
  return filtros;
}

/**
 * Engancha los controles de `htmlFiltrosBloques` ya insertados en `nodo`: cada cambio
 * llama a `alCambiar(filtros)`; "Quitar filtros" llama con los filtros vacios.
 * @param {{addEventListener: Function, removeEventListener: Function, querySelectorAll: Function}} nodo
 * @param {(filtros: object) => void} alCambiar
 * @returns {() => void} desmontar
 */
export function montarFiltrosBloques(nodo, alCambiar) {
  const alCambio = () => alCambiar(leerFiltros(nodo));
  const alClic = (evento) => {
    if (evento.target?.closest?.('[data-accion="quitar-filtros"]')) alCambiar(filtrosVacios());
  };
  nodo.addEventListener("change", alCambio);
  nodo.addEventListener("click", alClic);
  return () => {
    nodo.removeEventListener("change", alCambio);
    nodo.removeEventListener("click", alClic);
  };
}
