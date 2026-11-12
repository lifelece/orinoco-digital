/**
 * nucleo.js — Logica pura de la capa "Bloques y contratos 2026" (spec 004).
 *
 * Estilo por bloque, opciones de filtro, filtrado, conteos y fecha de corte.
 * Sin DOM, sin fetch, sin cesium. Los textos visibles no viven aqui (t(clave)).
 */

import { GRUPO_ESTATUS_BLOQUE, COLOR_CAPA_BLOQUE } from "../config.js";

const COMPARAR = (a, b) => String(a).localeCompare(String(b), "es");
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const RELLENO_POR_GRUPO = {
  operando: "solido",
  detenido: "rayado",
  sin_operacion_registrada: "tenue",
};

/**
 * Grupo de tratamiento de relleno de un estatus normalizado (RF-135).
 * Un valor fuera de vocabulario cae en "sin_operacion_registrada" (el mas neutro).
 * @param {string} estatusNorm
 * @returns {"operando"|"detenido"|"sin_operacion_registrada"}
 */
export function grupoEstatus(estatusNorm) {
  for (const [grupo, valores] of Object.entries(GRUPO_ESTATUS_BLOQUE)) {
    if (valores.includes(estatusNorm)) return grupo;
  }
  return "sin_operacion_registrada";
}

/**
 * Estilo abstracto de un bloque: el color sale de la capa (RF-134), el relleno del
 * grupo de estatus (RF-135) y el borde de la licencia (RF-136). map.js lo traduce.
 * @param {object} props  properties del bloque (esquema publicado)
 * @returns {{colorClave: string, relleno: "solido"|"rayado"|"tenue", borde: "continuo"|"discontinuo"}}
 */
export function estiloBloque(props) {
  const colorClave = props.capa in COLOR_CAPA_BLOQUE ? props.capa : "sin_registro";
  return {
    colorClave,
    relleno: RELLENO_POR_GRUPO[grupoEstatus(props.estatus_norm)],
    borde: props.tiene_licencia_ofac === true ? "discontinuo" : "continuo",
  };
}

/**
 * Opciones de filtro generadas a partir de los datos (RF-146), ordenadas con
 * localeCompare("es"). `licencias` termina siempre en null (= "Sin licencia
 * registrada en la fuente"): el RF pide los valores presentes MAS esa opcion.
 * @param {Array<{properties: object}>} features
 * @returns {{empresas: string[], estatus: string[], licencias: (string|null)[], convenio: boolean[]}}
 */
export function opcionesFiltro(features) {
  const empresas = new Set();
  const estatus = new Set();
  const licencias = new Set();
  for (const { properties: p } of features) {
    for (const o of p.operadores_2026 ?? []) empresas.add(o);
    if (p.estatus_norm) estatus.add(p.estatus_norm);
    if (p.licencia_ofac) licencias.add(p.licencia_ofac);
  }
  return {
    empresas: [...empresas].sort(COMPARAR),
    estatus: [...estatus].sort(COMPARAR),
    licencias: [...[...licencias].sort(COMPARAR), null],
    convenio: [true, false],
  };
}

/**
 * Ids de los bloques que cumplen todas las dimensiones filtradas (RF-147).
 * Dentro de una dimension basta un valor marcado; una dimension vacia no filtra.
 * @param {Array<{id?: string, properties: object}>} features
 * @param {{empresas: Set<string>, estatus: Set<string>, licencias: Set<string|null>, convenio: boolean|null}} filtros
 * @returns {Set<string>}
 */
export function filtrarBloques(features, filtros) {
  const { empresas, estatus, licencias, convenio } = filtros;
  const visibles = new Set();
  for (const f of features) {
    const p = f.properties;
    if (empresas?.size && !(p.operadores_2026 ?? []).some((o) => empresas.has(o))) continue;
    if (estatus?.size && !estatus.has(p.estatus_norm)) continue;
    if (licencias?.size && !licencias.has(p.licencia_ofac ?? null)) continue;
    if (convenio === true || convenio === false) {
      if (p.convenio_eeuu_vzla !== convenio) continue;
    }
    visibles.add(p.id ?? f.id);
  }
  return visibles;
}

/**
 * Bloques visibles por capa (RF-138).
 * @param {Array<{properties: object}>} features
 * @param {Set<string>} idsVisibles
 * @returns {{nabep: number, chevron: number, acuerdo_2026: number, sin_registro: number}}
 */
export function conteoPorCapa(features, idsVisibles) {
  const conteo = { nabep: 0, chevron: 0, acuerdo_2026: 0, sin_registro: 0 };
  for (const { properties: p } of features) {
    if (idsVisibles.has(p.id) && p.capa in conteo) conteo[p.capa] += 1;
  }
  return conteo;
}

/**
 * Fecha de corte de los datos cargados: la mas antigua (RF-145). Ignora valores
 * que no son AAAA-MM-DD. Las fechas ISO se comparan como texto.
 * @param {Array<{properties: object}>} features
 * @returns {string|null}
 */
export function corteDeDatos(features) {
  let corte = null;
  for (const { properties: p } of features) {
    const d = p?.fecha_corte;
    if (typeof d === "string" && FECHA_ISO.test(d) && (corte === null || d < corte)) corte = d;
  }
  return corte;
}
