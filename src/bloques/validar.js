/**
 * validar.js — Validador puro de la capa "Bloques y contratos 2026" (spec 004).
 *
 * Sin DOM, sin fetch, sin cesium y sin importar config.js (lo usan tambien el
 * conversor y el CLI en Node plano, donde config.js no carga). Por eso los
 * vocabularios viven aqui; test/bloques-validar.test.mjs comprueba que
 * coinciden con los de config.js.
 *
 * Cada funcion devuelve { errores, avisos } con textos que citan el id.
 */

export const CAPAS = ["nabep", "chevron", "acuerdo_2026", "sin_registro"];
export const ESTATUS_NORM = [
  "activo", "intermitente", "paralizado", "en_proyecto", "en_evaluacion", "sin_info", "sin_registro",
];
const CONFIANZAS = ["alta", "media", "baja"];

/** Mismos limites que scripts/validate-geojson.mjs (venezuela continental con margen). */
const LIMITES = { latMin: 0, latMax: 13, lngMin: -74, lngMax: -59 };
const MAX_ENTIDADES = 2000;
const ID_BLOQUE = /^B\d{3}$/;
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

const esTexto = (v) => typeof v === "string";
const esTextoONulo = (v) => v === null || esTexto(v);
const esArregloTexto = (v) => Array.isArray(v) && v.every(esTexto);
const esFechaIso = (v) => esTexto(v) && FECHA_ISO.test(v) && !Number.isNaN(Date.parse(v));
const esHttps = (v) => esTexto(v) && /^https:\/\/\S+$/.test(v);

/** Valida la geometria de una entidad; empuja todos los errores que encuentre. */
function validarGeometria(id, geom, errores) {
  if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
    errores.push(`${id}: geometria debe ser Polygon o MultiPolygon (es ${geom?.type ?? "ausente"})`);
    return;
  }
  const poligonos = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  if (!Array.isArray(poligonos)) {
    errores.push(`${id}: geometria sin coordenadas`);
    return;
  }
  for (const poligono of poligonos) {
    for (const anillo of Array.isArray(poligono) ? poligono : []) {
      if (!Array.isArray(anillo) || anillo.length < 4) {
        errores.push(`${id}: anillo con menos de 4 posiciones`);
        continue;
      }
      const a = anillo[0];
      const z = anillo[anillo.length - 1];
      if (a[0] !== z[0] || a[1] !== z[1]) errores.push(`${id}: anillo sin cerrar (primera y ultima posicion difieren)`);
      for (const [lng, lat] of anillo) {
        if (
          typeof lng !== "number" || typeof lat !== "number" ||
          lat < LIMITES.latMin || lat > LIMITES.latMax || lng < LIMITES.lngMin || lng > LIMITES.lngMax
        ) {
          errores.push(`${id}: posicion [${lng}, ${lat}] fuera de la ventana de Venezuela`);
        }
      }
    }
  }
}

/** Campos de procedencia comunes a bloques y divisiones. */
function validarProcedencia(id, p, errores) {
  if (!esTexto(p.fuente) || p.fuente.trim() === "") errores.push(`${id}: SIN fuente`);
  if (!esHttps(p.fuente_url)) errores.push(`${id}: fuente_url debe ser https`);
  if (!esTexto(p.fuente_poligonos)) errores.push(`${id}: fuente_poligonos debe ser texto`);
  if (!esFechaIso(p.fecha_corte)) errores.push(`${id}: fecha_corte no es AAAA-MM-DD (${p.fecha_corte})`);
  if (!esFechaIso(p.ultima_verificacion)) errores.push(`${id}: ultima_verificacion no es AAAA-MM-DD (${p.ultima_verificacion})`);
  if (!CONFIANZAS.includes(p.confianza)) errores.push(`${id}: confianza invalida "${p.confianza}"`);
}

function cabecera(fc, errores) {
  if (!fc || fc.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
    errores.push("no es un FeatureCollection");
    return false;
  }
  return true;
}

/** @returns {{errores: string[], avisos: string[]}} */
export function validarBloques(fc) {
  const errores = [];
  const avisos = [];
  if (!cabecera(fc, errores)) return { errores, avisos };
  if (fc.features.length > MAX_ENTIDADES) {
    avisos.push(`mas de 2.000 entidades (${fc.features.length}): revisar peso y rendimiento`);
  }
  const vistos = new Set();
  fc.features.forEach((f, i) => {
    const p = f?.properties ?? {};
    const id = esTexto(p.id) ? p.id : `#${i}`;
    if (!esTexto(p.id) || !ID_BLOQUE.test(p.id)) errores.push(`${id}: id fuera del patron B###`);
    else if (vistos.has(p.id)) errores.push(`${id}: id duplicado`);
    else vistos.add(p.id);
    if (f.id !== p.id) errores.push(`${id}: feature.id (${f.id}) distinto de properties.id`);

    if (!esTexto(p.nombre) || p.nombre === "") errores.push(`${id}: nombre debe ser texto no vacio`);
    if (!CAPAS.includes(p.capa)) errores.push(`${id}: capa fuera de vocabulario "${p.capa}"`);
    if (!ESTATUS_NORM.includes(p.estatus_norm)) errores.push(`${id}: estatus_norm fuera de vocabulario "${p.estatus_norm}"`);
    for (const k of ["operadores_2026", "operadores_antes_2026", "municipios"]) {
      if (!esArregloTexto(p[k])) errores.push(`${id}: ${k} debe ser arreglo de texto`);
    }
    for (const k of ["estatus_fuente", "licencia_ofac", "tipo_alianza", "proyecto", "pais_operador", "producto", "zona", "entidad_federal"]) {
      if (!esTextoONulo(p[k])) errores.push(`${id}: ${k} debe ser texto o null`);
    }
    for (const k of ["tiene_licencia_ofac", "convenio_eeuu_vzla"]) {
      if (typeof p[k] !== "boolean") errores.push(`${id}: ${k} debe ser booleano`);
    }
    if (p.area_km2 !== null && !(typeof p.area_km2 === "number" && Number.isFinite(p.area_km2) && p.area_km2 >= 0)) {
      errores.push(`${id}: area_km2 debe ser numero >= 0 o null`);
    }
    if (!Number.isInteger(p.registros_vinculados) || p.registros_vinculados < 0) {
      errores.push(`${id}: registros_vinculados debe ser entero >= 0`);
    }
    if (!esTexto(p.confianza_cruce)) errores.push(`${id}: confianza_cruce debe ser texto`);
    validarProcedencia(id, p, errores);
    validarGeometria(id, f?.geometry, errores);
  });
  return { errores, avisos };
}

/** @returns {{errores: string[], avisos: string[]}} */
export function validarDivisiones(fc) {
  const errores = [];
  const avisos = [];
  if (!cabecera(fc, errores)) return { errores, avisos };
  const vistos = new Set();
  fc.features.forEach((f, i) => {
    const p = f?.properties ?? {};
    const id = esTexto(p.id) ? p.id : `#${i}`;
    if (!esTexto(p.id) || p.id === "") errores.push(`${id}: id debe ser texto no vacio`);
    else if (vistos.has(p.id)) errores.push(`${id}: id duplicado`);
    else vistos.add(p.id);
    if (!esTexto(p.nombre) || p.nombre === "") errores.push(`${id}: nombre debe ser texto no vacio`);
    if (!(typeof p.area_km2 === "number" && p.area_km2 >= 0)) errores.push(`${id}: area_km2 debe ser numero >= 0`);
    if (!Number.isInteger(p.bloques_que_toca) || p.bloques_que_toca < 0) errores.push(`${id}: bloques_que_toca debe ser entero >= 0`);
    validarProcedencia(id, p, errores);
    validarGeometria(id, f?.geometry, errores);
  });
  return { errores, avisos };
}

/**
 * Valida los registros de contratos (solo en local, no se publican).
 * @param {Array<{id_registro?: string, id_bloque?: string, referencia?: string}>} filas
 * @param {Set<string>|string[]|Map<string, number>} idsBloque  Con un Map id -> registros_vinculados
 *   tambien se avisa cuando el conteo no coincide con las filas.
 * @returns {{errores: string[], avisos: string[], sinBloque: number}}
 */
export function validarRegistros(filas, idsBloque) {
  const errores = [];
  const avisos = [];
  const conocidos = idsBloque instanceof Map ? new Set(idsBloque.keys()) : new Set(idsBloque);
  const porBloque = new Map();
  let sinBloque = 0;
  filas.forEach((fila, i) => {
    const reg = fila.id_registro || `fila ${i + 1}`;
    const idb = (fila.id_bloque ?? "").trim();
    if (!(fila.referencia ?? "").trim()) errores.push(`${reg}: registro sin referencia`);
    if (idb === "") {
      sinBloque += 1;
    } else if (!conocidos.has(idb)) {
      errores.push(`${reg}: id_bloque ${idb} no existe en los bloques`);
    } else {
      porBloque.set(idb, (porBloque.get(idb) ?? 0) + 1);
    }
  });
  if (idsBloque instanceof Map) {
    for (const [id, declarado] of idsBloque) {
      const real = porBloque.get(id) ?? 0;
      if (declarado !== real) avisos.push(`${id}: registros_vinculados=${declarado} pero el CSV tiene ${real} fila(s)`);
    }
  }
  return { errores, avisos, sinBloque };
}
