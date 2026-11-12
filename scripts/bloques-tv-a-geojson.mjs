#!/usr/bin/env node
/**
 * bloques-tv-a-geojson.mjs — Conversor de la capa "Bloques y contratos 2026" (spec 004, T07).
 *
 * Lee la entrega cruda (`data/raw/tv-2026/orinoco_capa_2026/`, ignorada por git),
 * la convierte al esquema publicado (plan 004 §3.1), la valida con
 * `src/bloques/validar.js` y escribe dos archivos:
 *   - por defecto en `data/raw/tv-2026/publicado/` (ignorado por git);
 *   - con `--publicar`, en `public/data/` (solo tras el permiso de redistribucion, ADR-024).
 * Si el validador encuentra un error no escribe nada y sale con codigo 1 (RF-155).
 *
 * Uso: node scripts/bloques-tv-a-geojson.mjs [--entrada <dir>] [--salida <dir>] [--publicar]
 * Sin dependencias: solo modulos nativos de Node. CSV con parser propio.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { validarBloques, validarDivisiones, validarRegistros } from "../src/bloques/validar.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRADA_DEFECTO = join(RAIZ, "data", "raw", "tv-2026", "orinoco_capa_2026");
const SALIDA_DEFECTO = join(RAIZ, "data", "raw", "tv-2026", "publicado");
const SALIDA_PUBLICAR = join(RAIZ, "public", "data");
const ARCHIVO_BLOQUES = "bloques-2026.geojson";
const ARCHIVO_DIVISIONES = "faja-divisiones-2026.geojson";
const DECIMALES = 1e5;
const SIN_REGISTRO_TABLA = "Sin registro en la tabla";
const SIN_LICENCIA = "Sin licencia registrada";
const SIN_BLOQUE = "SIN_BLOQUE";

/**
 * Parser CSV propio (RFC 4180 basico): comillas, comas y saltos de linea dentro
 * de comillas, comillas dobles escapadas, BOM inicial. La primera fila son los
 * encabezados.
 * @param {string} texto
 * @returns {Array<Record<string, string>>}
 */
export function parsearCsv(texto) {
  const t = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const filas = [];
  let fila = [];
  let campo = "";
  let entreComillas = false;
  const cerrarCampo = () => { fila.push(campo); campo = ""; };
  const cerrarFila = () => {
    cerrarCampo();
    if (!(fila.length === 1 && fila[0] === "")) filas.push(fila);
    fila = [];
  };
  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];
    if (entreComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i += 1; } else entreComillas = false;
      } else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ",") cerrarCampo();
    else if (c === "\n") cerrarFila();
    else if (c === "\r") { if (t[i + 1] !== "\n") cerrarFila(); }
    else campo += c;
  }
  if (campo !== "" || fila.length > 0) cerrarFila();
  if (filas.length === 0) return [];
  const [encabezados, ...datos] = filas;
  return datos.map((f) => Object.fromEntries(encabezados.map((h, i) => [h, f[i] ?? ""])));
}

const texto = (v) => (typeof v === "string" ? v.trim() : "");
const textoONulo = (v) => (texto(v) === "" ? null : texto(v));
const lista = (v, separador) =>
  texto(v) === "" || texto(v) === SIN_REGISTRO_TABLA
    ? []
    : texto(v).split(separador).map((s) => s.trim()).filter(Boolean);

function redondear(n) {
  return Math.round(n * DECIMALES) / DECIMALES;
}

/** Redondea, quita vertices consecutivos repetidos y cierra el anillo. Devuelve null si queda degenerado (< 4 posiciones). */
function limpiarAnillo(anillo) {
  const salida = [];
  for (const [lng, lat] of anillo) {
    const p = [redondear(lng), redondear(lat)];
    const ult = salida[salida.length - 1];
    if (!ult || ult[0] !== p[0] || ult[1] !== p[1]) salida.push(p);
  }
  if (salida.length > 0) {
    const a = salida[0];
    const z = salida[salida.length - 1];
    if (a[0] !== z[0] || a[1] !== z[1]) salida.push([a[0], a[1]]);
  }
  return salida.length >= 4 ? salida : null;
}

/**
 * Limpia la geometria. Los anillos degenerados de la fuente (sin area: vertices repetidos o
 * colineales) se descartan: un agujero se quita, una parte de un MultiPolygon se quita y,
 * si ninguna parte sobrevive, la geometria queda vacia y el validador falla. Cada descarte se anota en `avisos`.
 */
function limpiarGeometria(g, id, avisos) {
  if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon")) return g;
  if (!Array.isArray(g.coordinates)) return g;
  const poligono = (p) => {
    if (!Array.isArray(p)) return p;
    const anillos = p.map((a) => (Array.isArray(a) ? limpiarAnillo(a) : a));
    if (anillos[0] === null) { avisos.push(`${id}: parte con anillo exterior degenerado, descartada`); return null; }
    const validos = anillos.filter((a) => a !== null);
    if (validos.length < anillos.length) avisos.push(`${id}: agujero degenerado, descartado`);
    return validos;
  };
  if (g.type === "Polygon") {
    const p = poligono(g.coordinates);
    return { type: "Polygon", coordinates: p ?? [] };
  }
  const partes = g.coordinates.map(poligono).filter((p) => p !== null);
  return partes.length === 1 ? { type: "Polygon", coordinates: partes[0] } : { type: "MultiPolygon", coordinates: partes };
}

function fechaLarga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso ?? "");
}

function procedencia(meta) {
  return {
    fuente: `Transparencia Venezuela, Mapa del negocio petrolero en Venezuela 2026 (corte ${fechaLarga(meta?.corte)})`,
    fuente_url: meta?.fuente,
    fuente_poligonos: meta?.poligonos,
    fecha_corte: meta?.corte,
    ultima_verificacion: meta?.extraido,
  };
}

const confianzaDe = (cruce) => (cruce === "Alta" ? "alta" : cruce === "Media" ? "media" : "baja");

/**
 * @param {object} crudo FeatureCollection de la entrega, con `metadata`
 * @param {string[]} [avisos] recibe los descartes de anillos degenerados
 * @returns {object} FeatureCollection en el esquema publicado
 */
export function convertirBloques(crudo, avisos = []) {
  const proc = procedencia(crudo.metadata);
  const features = (crudo.features ?? []).map((f) => {
    const p = f.properties ?? {};
    const licencia = textoONulo(p.licencia_ofac);
    const props = {
      id: p.id,
      nombre: p.nombre,
      capa: p.capa,
      operadores_2026: lista(p.operador_2026, ";"),
      operadores_antes_2026: lista(p.operador_antes_2026, ";"),
      estatus_fuente: textoONulo(p.estatus),
      estatus_norm: p.estatus_norm,
      licencia_ofac: licencia === SIN_LICENCIA ? null : licencia,
      tiene_licencia_ofac: p.tiene_licencia_ofac,
      convenio_eeuu_vzla: p.convenio_eeuu_vzla,
      tipo_alianza: textoONulo(p.tipo_alianza),
      proyecto: textoONulo(p.proyecto),
      pais_operador: textoONulo(p.pais_operador),
      producto: textoONulo(p.producto),
      zona: textoONulo(p.zona),
      entidad_federal: textoONulo(p.estado),
      municipios: lista(p.municipios, ";"),
      area_km2: typeof p.area_km2 === "number" ? p.area_km2 : null,
      registros_vinculados: p.registros_vinculados,
      confianza_cruce: texto(p.confianza_cruce),
      confianza: confianzaDe(p.confianza_cruce),
      ...proc,
    };
    return { type: "Feature", id: props.id, properties: props, geometry: limpiarGeometria(f.geometry, props.id, avisos) };
  });
  return { type: "FeatureCollection", features };
}

function nombreDivision(s) {
  const m = texto(s).toLowerCase();
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/**
 * @param {object} crudo FeatureCollection de las divisiones de la Faja
 * @param {object} metadata `metadata` del archivo de bloques (las divisiones no traen la suya)
 */
export function convertirDivisiones(crudo, metadata, avisos = []) {
  const proc = procedencia(crudo.metadata ?? metadata);
  const features = (crudo.features ?? []).map((f) => {
    const p = f.properties ?? {};
    const props = {
      id: p.id_fpo,
      nombre: nombreDivision(p.division),
      area_km2: p.area_km2,
      bloques_que_toca: p.bloques_que_toca,
      ...proc,
      confianza: "media",
    };
    return { type: "Feature", id: props.id, properties: props, geometry: limpiarGeometria(f.geometry, props.id, avisos) };
  });
  return { type: "FeatureCollection", features };
}

/**
 * Convierte y valida todo. No toca el disco.
 * @param {{bloques: object, divisiones: object, registros?: Array<object>}} entrada
 * @returns {{bloquesFc: object, divisionesFc: object, errores: string[], avisos: string[], sinBloque: number, registros: number}}
 */
export function convertir({ bloques, divisiones, registros }) {
  const avisosConv = [];
  const bloquesFc = convertirBloques(bloques, avisosConv);
  const divisionesFc = convertirDivisiones(divisiones, bloques.metadata, avisosConv);
  const rb = validarBloques(bloquesFc);
  const rd = validarDivisiones(divisionesFc);
  const errores = [...rb.errores, ...rd.errores];
  const avisos = [...avisosConv, ...rb.avisos, ...rd.avisos];
  let sinBloque = 0;
  if (registros) {
    const ids = new Map(bloquesFc.features.map((f) => [f.id, f.properties.registros_vinculados]));
    // La entrega marca los registros sin bloque con el centinela "SIN_BLOQUE"; el validador espera vacio.
    const normalizados = registros.map((r) => (texto(r.id_bloque) === SIN_BLOQUE ? { ...r, id_bloque: "" } : r));
    const rr = validarRegistros(normalizados, ids);
    errores.push(...rr.errores);
    avisos.push(...rr.avisos);
    sinBloque = rr.sinBloque;
  }
  return { bloquesFc, divisionesFc, errores, avisos, sinBloque, registros: registros?.length ?? 0 };
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function leerOpciones(argv) {
  const o = { entrada: ENTRADA_DEFECTO, salida: null, publicar: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--entrada") o.entrada = resolve(argv[++i]);
    else if (argv[i] === "--salida") o.salida = resolve(argv[++i]);
    else if (argv[i] === "--publicar") o.publicar = true;
    else throw new Error(`opcion desconocida: ${argv[i]}`);
  }
  o.destino = o.salida ?? (o.publicar ? SALIDA_PUBLICAR : SALIDA_DEFECTO);
  return o;
}

function principal(argv) {
  let o;
  try { o = leerOpciones(argv); } catch (e) { console.error(e.message); return 1; }
  const ruta = (n) => join(o.entrada, n);
  const necesarios = ["orinoco_bloques_2026.geojson", "orinoco_fpo_divisiones.geojson"];
  for (const n of necesarios) {
    if (!existsSync(ruta(n))) { console.error(`falta ${ruta(n)}`); return 1; }
  }
  const bloques = JSON.parse(readFileSync(ruta(necesarios[0]), "utf8"));
  const divisiones = JSON.parse(readFileSync(ruta(necesarios[1]), "utf8"));
  const csv = ruta("orinoco_contratos_2026.csv");
  const registros = existsSync(csv) ? parsearCsv(readFileSync(csv, "utf8")) : undefined;

  const r = convertir({ bloques, divisiones, registros });
  for (const a of r.avisos) console.warn(`AVISO ${a}`);
  if (r.errores.length > 0) {
    console.error(`${r.errores.length} error(es); no se escribio ningun archivo:`);
    for (const e of r.errores) console.error(`  ERROR ${e}`);
    return 1;
  }

  mkdirSync(o.destino, { recursive: true });
  const nBloques = r.bloquesFc.features.length;
  const conLicencia = r.bloquesFc.features.filter((f) => f.properties.tiene_licencia_ofac).length;
  const nabep = r.bloquesFc.features.filter((f) => f.properties.capa === "nabep").length;
  console.log(`${nBloques} bloques, ${r.divisionesFc.features.length} divisiones, ${nabep} nabep, ${conLicencia} con licencia`);
  if (registros) console.log(`${r.registros} filas de registros validadas (${r.sinBloque} sin bloque)`);
  for (const [nombre, fc] of [[ARCHIVO_BLOQUES, r.bloquesFc], [ARCHIVO_DIVISIONES, r.divisionesFc]]) {
    const cuerpo = JSON.stringify(fc);
    writeFileSync(join(o.destino, nombre), cuerpo);
    const crudoB = Buffer.byteLength(cuerpo);
    console.log(`${nombre}: crudo ${kb(crudoB)}, gzip ${kb(gzipSync(cuerpo).length)} -> ${o.destino}`);
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = principal(process.argv.slice(2));
}
