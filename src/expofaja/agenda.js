/**
 * agenda.js — Funciones puras sobre la agenda. Sin red, sin DOM, sin Cesium.
 *
 * Toda hora del programa es hora del evento (UTC-04:00 fijo). Se comparan
 * instantes (Date), nunca la hora local del equipo (RF-13).
 */

import { DESFASE_EVENTO } from "../config.js";

const MS_MINUTO = 60000;
const RE_AHORA = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/;
const PRODID = "-//Orinoco Digital//ExpoFaja 2026//ES";
const ZONA_ICS = "America/Caracas";

/** Desfase del evento en milisegundos, derivado de DESFASE_EVENTO ("-04:00"). */
function desfaseMs() {
  const [, signo, h, m] = /^([+-])(\d{2}):(\d{2})$/.exec(DESFASE_EVENTO);
  return (signo === "-" ? -1 : 1) * (Number(h) * 60 + Number(m)) * MS_MINUTO;
}

/** Date cuyos getters UTC dan la hora de pared del evento. */
function relojEvento(ahora) {
  return new Date(ahora.getTime() + desfaseMs());
}

const dos = (n) => String(n).padStart(2, "0");

/**
 * Instante de una hora del programa.
 * @param {string} fecha "AAAA-MM-DD"
 * @param {?string} hhmm "HH:MM" o null
 * @returns {?Date} null si hhmm es null
 */
export function instanteEvento(fecha, hhmm) {
  if (hhmm === null || hhmm === undefined) return null;
  return new Date(`${fecha}T${hhmm}:00${DESFASE_EVENTO}`);
}

/**
 * Hora actual en hora del evento (RF-14).
 * @param {Date} ahora
 * @returns {string} "HH:MM"
 */
export function horaEvento(ahora) {
  const r = relojEvento(ahora);
  return `${dos(r.getUTCHours())}:${dos(r.getUTCMinutes())}`;
}

/**
 * Fecha actual en hora del evento.
 * @param {Date} ahora
 * @returns {string} "AAAA-MM-DD"
 */
export function fechaEvento(ahora) {
  const r = relojEvento(ahora);
  return `${r.getUTCFullYear()}-${dos(r.getUTCMonth() + 1)}-${dos(r.getUTCDate())}`;
}

/** Sesiones con hora, en el orden del programa, con sus instantes. */
function sesionesConHora(agenda) {
  const salida = [];
  for (const dia of agenda.dias) {
    for (const sesion of dia.sesiones) {
      const ini = instanteEvento(dia.fecha, sesion.inicio);
      const fin = instanteEvento(dia.fecha, sesion.fin);
      if (ini && fin) salida.push({ dia, sesion, ini, fin });
    }
  }
  return salida;
}

/**
 * Estado del evento respecto a "ahora".
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {"antes"|"durante"|"despues"} antes del primer inicio con hora;
 *   despues desde el ultimo fin con hora
 */
export function estadoEvento(agenda, ahora) {
  const todas = sesionesConHora(agenda);
  if (todas.length === 0) return "antes";
  const primero = Math.min(...todas.map((s) => s.ini.getTime()));
  const ultimo = Math.max(...todas.map((s) => s.fin.getTime()));
  if (ahora.getTime() < primero) return "antes";
  if (ahora.getTime() >= ultimo) return "despues";
  return "durante";
}

const abierta = (s, ahora) => s.ini <= ahora && ahora < s.fin;

/**
 * Sesiones en curso que no son exposicion, una por sala (RF-16).
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {Array<{dia: Object, sesion: Object}>} vacio si no hay ninguna; si dos
 *   sesiones comparten sala, la primera del programa. Sin sala: no se agrupa.
 */
export function sesionActual(agenda, ahora) {
  const salas = new Set();
  const salida = [];
  for (const s of sesionesConHora(agenda)) {
    if (s.sesion.tipo === "exposicion" || !abierta(s, ahora)) continue;
    if (s.sesion.sala) {
      if (salas.has(s.sesion.sala)) continue;
      salas.add(s.sesion.sala);
    }
    salida.push({ dia: s.dia, sesion: s.sesion });
  }
  return salida;
}

/**
 * Exposicion abierta en este instante (RF-20).
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {?{dia: Object, sesion: Object}}
 */
export function exposicionEnCurso(agenda, ahora) {
  const s = sesionesConHora(agenda).find((x) => x.sesion.tipo === "exposicion" && abierta(x, ahora));
  return s ? { dia: s.dia, sesion: s.sesion } : null;
}

/**
 * Siguiente sesion con hora, que no sea exposicion, de inicio posterior a "ahora";
 * si varias empatan, la primera del programa (RF-18/19).
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {?{dia: Object, sesion: Object}} null si no queda ninguna
 */
export function proximaSesion(agenda, ahora) {
  let mejor = null;
  for (const s of sesionesConHora(agenda)) {
    if (s.sesion.tipo === "exposicion" || s.ini <= ahora) continue;
    if (!mejor || s.ini < mejor.ini) mejor = s;
  }
  return mejor ? { dia: mejor.dia, sesion: mejor.sesion } : null;
}

/**
 * Tiempo que falta para el primer inicio con hora del programa (RF-15).
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {?{dias: number, horas: number, minutos: number}} null si el evento ya empezo
 */
export function cuentaRegresiva(agenda, ahora) {
  if (estadoEvento(agenda, ahora) !== "antes") return null;
  const todas = sesionesConHora(agenda);
  const primero = Math.min(...todas.map((s) => s.ini.getTime()));
  const minutosTotales = Math.floor((primero - ahora.getTime()) / MS_MINUTO);
  return {
    dias: Math.floor(minutosTotales / 1440),
    horas: Math.floor((minutosTotales % 1440) / 60),
    minutos: minutosTotales % 60,
  };
}

/**
 * Indice de la pestana a seleccionar al cargar (RF-26).
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {number} dia actual en hora del evento si es del programa; 0 si no
 */
export function diaInicial(agenda, ahora) {
  const i = agenda.dias.findIndex((d) => d.fecha === fechaEvento(ahora));
  return i < 0 ? 0 : i;
}

/**
 * Si una sesion esta en curso (RF-29). Incluye las exposiciones: quien pinte la
 * etiqueta decide si las excluye.
 * @param {Object} dia
 * @param {Object} sesion
 * @param {Date} ahora
 * @returns {boolean} false si la sesion no tiene hora
 */
export function enCurso(dia, sesion, ahora) {
  const ini = instanteEvento(dia.fecha, sesion.inicio);
  const fin = instanteEvento(dia.fecha, sesion.fin);
  return Boolean(ini && fin && abierta({ ini, fin }, ahora));
}

/**
 * UID estable de una sesion: fecha, hora de inicio y sala (RF-33).
 * @param {Object} dia
 * @param {Object} sesion
 * @returns {string} "<fecha>-<HHMM>-<sala>@orinoco-digital"
 */
export function uidSesion(dia, sesion) {
  const hora = sesion.inicio ? sesion.inicio.replace(":", "") : "sinhora";
  const sala = sesion.sala
    ? sesion.sala.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "general";
  return `${dia.fecha}-${hora}-${sala}@orinoco-digital`;
}

/** Escapa un valor de texto iCalendar (RFC 5545 3.3.11, RF-34). */
function escaparIcs(texto) {
  return String(texto)
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Pliega una linea a 75 octetos UTF-8 sin partir caracteres (RF-32). */
function plegar(linea) {
  const partes = [];
  let actual = "";
  let octetos = 0;
  for (const caracter of linea) {
    const n = new TextEncoder().encode(caracter).length;
    // la continuacion lleva un espacio inicial que tambien cuenta
    const limite = partes.length === 0 ? 75 : 74;
    if (octetos + n > limite) {
      partes.push(actual);
      actual = "";
      octetos = 0;
    }
    actual += caracter;
    octetos += n;
  }
  partes.push(actual);
  return partes.map((p, i) => (i === 0 ? p : ` ${p}`)).join("\r\n");
}

/** "AAAA-MM-DD","HH:MM" -> "AAAAMMDDTHHMMSS" (hora de pared del evento). */
const marcaLocal = (fecha, hhmm) => `${fecha.replaceAll("-", "")}T${hhmm.replace(":", "")}00`;

/** Date -> "AAAAMMDDTHHMMSSZ" en UTC. */
const marcaUtc = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/** Lineas sin plegar del VEVENT de una sesion con hora (RF-32..34). */
function lineasEvento(sesion, dia, ponente, generado, evento) {
  const descripcion = [
    ponente ? [ponente.titulo, ponente.nombre].filter(Boolean).join(" ") : null,
    sesion.sala || null,
    "Programa oficial de la CCIEB",
  ].filter(Boolean);
  const sede = evento?.sede;
  return [
    "BEGIN:VEVENT",
    `UID:${uidSesion(dia, sesion)}`,
    `DTSTAMP:${marcaUtc(generado)}`,
    `DTSTART;TZID=${ZONA_ICS}:${marcaLocal(dia.fecha, sesion.inicio)}`,
    `DTEND;TZID=${ZONA_ICS}:${marcaLocal(dia.fecha, sesion.fin)}`,
    `SUMMARY:${escaparIcs(sesion.titulo)}`,
    ...(sede?.nombre ? [`LOCATION:${escaparIcs([sede.nombre, sede.ciudad].filter(Boolean).join(", "))}`] : []),
    `DESCRIPTION:${escaparIcs(descripcion.join("\n"))}`,
    "END:VEVENT",
  ];
}

/** Envuelve VEVENTs en un VCALENDAR con su VTIMEZONE, plegado y con CRLF (RF-32). */
function calendarioIcs(eventos) {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "BEGIN:VTIMEZONE",
    `TZID:${ZONA_ICS}`,
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0400",
    "TZOFFSETTO:-0400",
    "TZNAME:-04",
    "END:STANDARD",
    "END:VTIMEZONE",
    ...eventos,
    "END:VCALENDAR",
  ];
  return `${lineas.map(plegar).join("\r\n")}\r\n`;
}

/**
 * Genera un evento iCalendar (RFC 5545) para una sesion con hora (RF-31..34).
 * @param {Object} sesion sesion con inicio y fin
 * @param {Object} dia dia de la agenda ({fecha})
 * @param {?Object} ponente entrada de ponentes.json, o null/undefined si no hay
 * @param {Date} [generado=new Date()] instante del DTSTAMP (inyectable en tests)
 * @param {?Object} [evento] contenido de evento.json: de `sede` salen nombre y ciudad
 *   de LOCATION; sin el, no se escribe LOCATION (no se inventa la sede)
 * @returns {string} texto .ics con lineas CRLF
 * @throws {Error} si la sesion no tiene hora
 */
export function generarIcs(sesion, dia, ponente, generado = new Date(), evento = null) {
  if (!sesion.inicio || !sesion.fin) throw new Error("generarIcs: la sesion no tiene hora");
  return calendarioIcs(lineasEvento(sesion, dia, ponente, generado, evento));
}

/**
 * Numero de sesiones que entran en el .ics del programa completo (RF-78).
 * @param {Object} agenda
 * @returns {number}
 */
export function contarSesionesConHora(agenda) {
  return sesionesConHora(agenda).length;
}

/**
 * Un solo .ics con todas las sesiones con hora del programa, en su orden (RF-78).
 * Cada VEVENT es identico al que da generarIcs para esa sesion.
 * @param {Object} agenda
 * @param {Map<string, Object>} ponentes ponentes.json indexado por id
 * @param {Date} [generado=new Date()] instante del DTSTAMP (inyectable en tests)
 * @param {?Object} [evento] contenido de evento.json (ver generarIcs)
 * @returns {string} texto .ics con lineas CRLF
 * @throws {Error} si ninguna sesion tiene hora
 */
export function generarIcsPrograma(agenda, ponentes, generado = new Date(), evento = null) {
  const eventos = sesionesConHora(agenda).flatMap(({ dia, sesion }) =>
    lineasEvento(sesion, dia, sesion.ponente_id ? ponentes.get(sesion.ponente_id) : null, generado, evento),
  );
  if (eventos.length === 0) throw new Error("generarIcsPrograma: ninguna sesion tiene hora");
  return calendarioIcs(eventos);
}

/**
 * Instante que usa la pagina como "ahora" (RF-23/24).
 * @param {string} search cadena de consulta de la URL (p. ej. "?ahora=2026-10-16T10:30")
 * @param {boolean} permitido true solo en desarrollo (MODO_DESARROLLO)
 * @param {Function} [reloj] reloj del dispositivo, inyectable
 * @returns {Date} el valor de ?ahora= en hora del evento si es permitido y valido;
 *   si no, reloj()
 */
export function leerAhora(search, permitido, reloj = () => new Date()) {
  if (!permitido) return reloj();
  const valor = new URLSearchParams(search).get("ahora");
  const partes = valor === null ? null : RE_AHORA.exec(valor);
  if (!partes) return reloj();
  const instante = instanteEvento(partes[1], partes[2]);
  // El ida y vuelta descarta fechas imposibles que Date "arregla" (24:00, 31 de febrero)
  const valido = !Number.isNaN(instante.getTime()) && fechaEvento(instante) === partes[1] && horaEvento(instante) === partes[2];
  return valido ? instante : reloj();
}

/**
 * Que se pinta segun el estado del evento (E4.1, RF-21): tras el cierre la
 * franja Ahora/Siguiente pasa a "Resumen", la agenda queda como archivo y
 * desaparecen el boton de calendario, la etiqueta "Ahora" y el reloj. Solo
 * depende de la fecha: pasar a "despues" no requiere un despliegue.
 * @param {Object} agenda
 * @param {Date} ahora
 * @returns {{estado: "antes"|"durante"|"despues", celebrado: boolean, franja: "ahoraSiguiente"|"resumen",
 *   calendario: boolean, etiquetaAhora: boolean, reloj: boolean}}
 */
export function presentacionEvento(agenda, ahora) {
  const estado = estadoEvento(agenda, ahora);
  const despues = estado === "despues";
  return {
    estado,
    celebrado: despues,
    franja: despues ? "resumen" : "ahoraSiguiente",
    calendario: !despues,
    etiquetaAhora: !despues,
    reloj: !despues,
  };
}

/**
 * Si la agenda marca una sesion con la etiqueta "Ahora" (RF-29 + E4.1).
 * @param {Object} agenda
 * @param {Object} dia
 * @param {Object} sesion
 * @param {Date} ahora
 * @returns {boolean} nunca en "despues" ni para exposiciones
 */
export function mostrarEtiquetaAhora(agenda, dia, sesion, ahora) {
  return presentacionEvento(agenda, ahora).etiquetaAhora && sesion.tipo !== "exposicion" && enCurso(dia, sesion, ahora);
}
