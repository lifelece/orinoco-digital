/**
 * datos.js — Origen de datos del micrositio: fetch y validacion. Sin DOM.
 * Los datos del evento salen solo de public/data/expofaja/ (RF-1).
 */

import { RUTAS_EXPOFAJA, ORIGEN_CCIEB } from "../config.js";

const TIPOS_SESION = ["protocolo", "exposicion", "ponencia", "mesa", "pausa"];
const FECHA_MIN = "2026-10-15";
const FECHA_MAX = "2026-10-17";
const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Archivos opcionales: si fallan, su seccion se omite (RF-4, RF-47). */
const OPCIONALES = [
  ["aliados", "aliados", (d) => validarLista(d, "aliados_comerciales", "aliados")],
  ["manifiesto", "marcas-manifiesto", (d) => validarLista(d, "items", "marcas-manifiesto")],
  ["noticias", "noticias", (d) => validarNoticias(d)],
  ["iniciativas", "iniciativas-ccieb", (d) => validarLista(d, "iniciativas", "iniciativas-ccieb")],
  ["resumen", "resumen de Ciudad Bolívar", (d) => validarResumen(d)],
];

/**
 * Descarga y parsea un JSON.
 * @param {Function} fetchFn
 * @param {string} ruta
 * @returns {Promise<Object>}
 * @throws {Error} si la respuesta no es 2xx o no es JSON
 */
async function pedirJson(fetchFn, ruta) {
  const respuesta = await fetchFn(ruta);
  if (!respuesta.ok) throw new Error(`${ruta}: HTTP ${respuesta.status}`);
  return respuesta.json();
}

function esObjeto(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function conFuente(bloque) {
  return esObjeto(bloque) && typeof bloque.fuente === "string" && bloque.fuente.trim() !== "";
}

/**
 * Valida la forma de ponentes.json.
 * @param {Object} ponentes
 * @returns {string[]}
 */
function validarPonentes(ponentes) {
  if (!esObjeto(ponentes) || !Array.isArray(ponentes.ponentes)) return ["ponentes: falta la lista ponentes[]"];
  const errores = [];
  const vistos = new Set();
  ponentes.ponentes.forEach((p, i) => {
    if (!esObjeto(p) || typeof p.id !== "string" || typeof p.nombre !== "string") {
      errores.push(`ponentes[${i}]: faltan id o nombre`);
    } else if (vistos.has(p.id)) {
      errores.push(`ponentes[${i}]: id repetido "${p.id}"`);
    } else vistos.add(p.id);
  });
  return errores;
}

function validarLista(datos, clave, nombre) {
  return esObjeto(datos) && Array.isArray(datos[clave]) ? [] : [`${nombre}: falta la lista ${clave}[]`];
}

/**
 * Comprueba la agenda: fechas del programa, horas HH:MM o null, tipos conocidos
 * e integridad referencial de ponente_id (RF-5).
 * @param {Object} agenda contenido de agenda.json
 * @param {Object|Array} ponentes contenido de ponentes.json (o su lista)
 * @returns {string[]} problemas; vacia si es valida
 */
export function validarAgenda(agenda, ponentes) {
  if (!esObjeto(agenda) || !Array.isArray(agenda.dias)) return ["agenda: falta la lista dias[]"];
  const lista = Array.isArray(ponentes) ? ponentes : ponentes?.ponentes;
  const ids = new Set((Array.isArray(lista) ? lista : []).map((p) => p?.id));
  const errores = [];
  agenda.dias.forEach((dia, d) => {
    if (!RE_FECHA.test(dia?.fecha ?? "") || dia.fecha < FECHA_MIN || dia.fecha > FECHA_MAX) {
      errores.push(`dias[${d}]: fecha fuera de ${FECHA_MIN}..${FECHA_MAX}: ${dia?.fecha}`);
    }
    if (!Array.isArray(dia?.sesiones)) {
      errores.push(`dias[${d}]: falta sesiones[]`);
      return;
    }
    dia.sesiones.forEach((s, i) => errores.push(...validarSesion(s, `dias[${d}].sesiones[${i}]`, ids)));
  });
  return errores;
}

function validarSesion(s, rotulo, ids) {
  const errores = [];
  for (const campo of ["inicio", "fin"]) {
    const v = s?.[campo];
    if (v !== null && !(typeof v === "string" && RE_HORA.test(v))) errores.push(`${rotulo}: ${campo} no es HH:MM ni null: ${v}`);
  }
  if ((s?.inicio === null) !== (s?.fin === null)) errores.push(`${rotulo}: inicio y fin deben ser ambos nulos o ambos con hora`);
  if (RE_HORA.test(s?.inicio ?? "") && RE_HORA.test(s?.fin ?? "") && s.fin <= s.inicio) errores.push(`${rotulo}: fin no es posterior a inicio`);
  if (!TIPOS_SESION.includes(s?.tipo)) errores.push(`${rotulo}: tipo desconocido: ${s?.tipo}`);
  if (typeof s?.titulo !== "string" || s.titulo === "") errores.push(`${rotulo}: falta titulo`);
  if (s?.ponente_id !== undefined && !ids.has(s.ponente_id)) errores.push(`${rotulo}: ponente_id inexistente: ${s.ponente_id}`);
  return errores;
}

/**
 * Comprueba que cada bloque de contenido del organizador lleve fuente (RF-6).
 * @param {Object} evento contenido de evento.json
 * @returns {string[]} problemas; vacia si es valido
 */
export function validarEvento(evento) {
  if (!esObjeto(evento)) return ["evento: no es un objeto"];
  const errores = [];
  const exigir = (bloque, rotulo) => {
    if (!conFuente(bloque)) errores.push(`evento.${rotulo}: sin fuente`);
  };
  for (const clave of ["sede", "ccieb", "contactos_evento", "por_que_ciudad_bolivar", "espacios", "patrocinio"]) {
    exigir(evento[clave], clave);
  }
  const listas = [
    ["organizadores", evento.organizadores],
    ["cifras_organizador.items", evento.cifras_organizador?.items],
    ["iniciativas_anunciadas", evento.iniciativas_anunciadas],
  ];
  for (const [rotulo, lista] of listas) {
    if (!Array.isArray(lista)) errores.push(`evento.${rotulo}: falta la lista`);
    else lista.forEach((b, i) => exigir(b, `${rotulo}[${i}]`));
  }
  if (!esObjeto(evento.fechas) || !evento.fechas.inicio || !evento.fechas.fin) errores.push("evento.fechas: faltan inicio o fin");
  return errores;
}

/**
 * Comprueba que toda URL de noticias sea de camaradecomerciobolivar.org (RF-7).
 * @param {Object} noticias contenido de noticias.json
 * @returns {string[]} problemas; vacia si es valido
 */
export function validarNoticias(noticias) {
  if (!esObjeto(noticias) || !Array.isArray(noticias.items)) return ["noticias: falta la lista items[]"];
  const errores = [];
  noticias.items.forEach((n, i) => {
    let origen = null;
    try {
      origen = new URL(n?.url).origin;
    } catch {
      // URL ilegible: se reporta abajo
    }
    if (origen !== ORIGEN_CCIEB) errores.push(`noticias.items[${i}]: URL fuera de ${ORIGEN_CCIEB}/: ${n?.url}`);
    if (typeof n?.titulo !== "string" || n.titulo === "") errores.push(`noticias.items[${i}]: falta titulo`);
  });
  return errores;
}

/**
 * Comprueba la forma del resumen de Ciudad Bolivar (contrato spec tecnica 3.3).
 * @param {Object} resumen contenido de ciudad-bolivar-resumen.json
 * @returns {string[]} problemas; vacia si es valido
 */
export function validarResumen(resumen) {
  if (!esObjeto(resumen)) return ["resumen: no es un objeto"];
  const errores = [];
  const anillos = resumen.anillos;
  if (!Array.isArray(anillos) || anillos.length === 0) errores.push("resumen: faltan anillos[]");
  else if (!anillos.every((a) => Number.isFinite(a?.km) && Number.isFinite(a?.campos))) errores.push("resumen: anillos[] sin km/campos numericos");
  if (!Number.isFinite(resumen.total_campos)) errores.push("resumen: falta total_campos numerico");
  if (typeof resumen.centro?.nombre !== "string") errores.push("resumen: falta centro.nombre");
  if (!Array.isArray(resumen.campos_mas_cercanos)) errores.push("resumen: falta campos_mas_cercanos[]");
  if (!esObjeto(resumen.servicios_por_clase)) errores.push("resumen: falta servicios_por_clase");
  if (typeof resumen.metodo !== "string" || resumen.metodo === "") errores.push("resumen: falta metodo");
  if (!Array.isArray(resumen.fuentes) || resumen.fuentes.length === 0) errores.push("resumen: faltan fuentes[]");
  return errores;
}

/**
 * Carga y valida todos los datos del micrositio.
 * @param {Function} [fetchFn=fetch] fetch inyectable (tests)
 * @returns {Promise<{evento: Object, agenda: Object, ponentes: Object, aliados: ?Object,
 *   manifiesto: ?Object, noticias: ?Object, iniciativas: ?Object, resumen: ?Object,
 *   avisos: string[]}>} los opcionales que falten van a null con una entrada en avisos
 * @throws {Error} si evento, agenda o ponentes faltan o no validan (RF-3)
 */
export async function cargarDatosEvento(fetchFn = fetch) {
  const [evento, agenda, ponentes] = await Promise.all(
    ["evento", "agenda", "ponentes"].map((clave) => pedirJson(fetchFn, RUTAS_EXPOFAJA[clave])),
  );
  const errores = [
    ...validarEvento(evento),
    ...validarPonentes(ponentes),
    ...validarAgenda(agenda, ponentes),
  ];
  if (errores.length > 0) throw new Error(`datos del evento invalidos: ${errores.join("; ")}`);

  const avisos = [];
  const salida = { evento, agenda, ponentes };
  await Promise.all(
    OPCIONALES.map(async ([clave, nombre, validar]) => {
      try {
        const datos = await pedirJson(fetchFn, RUTAS_EXPOFAJA[clave]);
        const problemas = validar(datos);
        if (problemas.length > 0) throw new Error(problemas.join("; "));
        salida[clave] = datos;
      } catch (error) {
        salida[clave] = null;
        avisos.push(`${nombre}: no disponible (${error.message})`);
      }
    }),
  );
  return { ...salida, avisos };
}
