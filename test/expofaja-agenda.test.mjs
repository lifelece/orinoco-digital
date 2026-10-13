/**
 * Logica pura de la agenda del micrositio: hora del evento, Ahora/Siguiente, .ics.
 * Spec 002, RF-13..24, 26, 29, 31..34. Fechas del programa: agenda.json real.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  instanteEvento,
  horaEvento,
  fechaEvento,
  estadoEvento,
  sesionActual,
  exposicionEnCurso,
  proximaSesion,
  cuentaRegresiva,
  diaInicial,
  enCurso,
  uidSesion,
  generarIcs,
  leerAhora,
} from "../src/expofaja/agenda.js";

const RAIZ = new URL("../", import.meta.url);
const agenda = JSON.parse(await readFile(new URL("public/data/expofaja/agenda.json", RAIZ), "utf8"));
const ponentes = JSON.parse(await readFile(new URL("public/data/expofaja/ponentes.json", RAIZ), "utf8")).ponentes;
const evento = JSON.parse(await readFile(new URL("public/data/expofaja/evento.json", RAIZ), "utf8"));

/** Instante a partir de una hora de pared de Caracas. */
const caracas = (texto) => new Date(`${texto}:00-04:00`);
const titulos = (lista) => lista.map((x) => x.sesion.titulo);
const dia = (fecha) => agenda.dias.find((d) => d.fecha === fecha);
const sesion = (fecha, inicio) => dia(fecha).sesiones.find((s) => s.inicio === inicio);

test("RF-13: instanteEvento interpreta fecha y hora como UTC-04:00", () => {
  assert.equal(instanteEvento("2026-10-16", "09:00").toISOString(), "2026-10-16T13:00:00.000Z");
  assert.equal(instanteEvento("2026-10-16", null), null);
});

test("RF-14: horaEvento y fechaEvento dan la hora de Caracas, no la del equipo", () => {
  const instante = new Date("2026-10-17T02:30:00Z"); // 22:30 del 16 en Caracas
  assert.equal(horaEvento(instante), "22:30");
  assert.equal(fechaEvento(instante), "2026-10-16");
});

test("RF-16: a las 11:59 del 16 Ahora es Farias en Sala 5; a las 12:00 es la pausa", () => {
  const a = sesionActual(agenda, caracas("2026-10-16T11:59"));
  assert.equal(a.length, 1);
  assert.equal(a[0].sesion.ponente_id, "jesus-farias");
  assert.equal(a[0].sesion.sala, "Sala 5");
  const b = sesionActual(agenda, caracas("2026-10-16T12:00"));
  assert.equal(b.length, 1);
  assert.equal(b[0].sesion.tipo, "pausa");
});

test("RF-18: a las 11:59 Siguiente es la pausa; a las 12:00 en punto es la sesion de las 14:00", () => {
  assert.equal(proximaSesion(agenda, caracas("2026-10-16T11:59")).sesion.tipo, "pausa");
  assert.equal(proximaSesion(agenda, caracas("2026-10-16T12:00")).sesion.inicio, "14:00");
});

test("RF-16: la exposicion no cuenta como sesion actual aunque este abierta", () => {
  for (const hora of ["09:30", "13:00", "16:30"]) {
    const a = sesionActual(agenda, caracas(`2026-10-16T${hora}`));
    assert.ok(a.every((x) => x.sesion.tipo !== "exposicion"), hora);
  }
});

test("RF-16: una sesion por sala (dos salas a la vez dan dos; misma sala, una)", () => {
  const sala = (inicio, fin, s) => ({ inicio, fin, tipo: "ponencia", titulo: `T${inicio}${s}`, sala: s });
  const falsa = {
    dias: [{ fecha: "2026-10-16", sesiones: [sala("10:00", "11:00", "Sala 5"), sala("10:00", "11:00", "Sala 6"), sala("10:30", "11:30", "Sala 5")] }],
  };
  const a = sesionActual(falsa, caracas("2026-10-16T10:45"));
  assert.deepEqual(titulos(a), ["T10:00Sala 5", "T10:00Sala 6"]);
});

test("RF-15 (caso limite 08:00 del 15): estado antes, sin Ahora y cuenta regresiva hasta el acto de las 17:00", () => {
  const ahora = caracas("2026-10-15T08:00");
  assert.equal(estadoEvento(agenda, ahora), "antes");
  assert.deepEqual(sesionActual(agenda, ahora), []);
  assert.deepEqual(cuentaRegresiva(agenda, ahora), { dias: 0, horas: 9, minutos: 0 });
  assert.equal(proximaSesion(agenda, ahora).sesion.tipo, "protocolo");
});

test("RF-15: cuenta regresiva con dias y minutos; null una vez empezado", () => {
  assert.deepEqual(cuentaRegresiva(agenda, caracas("2026-10-13T16:30")), { dias: 2, horas: 0, minutos: 30 });
  assert.equal(cuentaRegresiva(agenda, caracas("2026-10-15T17:00")), null);
});

test("RF-21 (21:00 del 17): estado despues, sin Ahora ni Siguiente; 20:00 en punto ya es despues", () => {
  const ahora = caracas("2026-10-17T21:00");
  assert.equal(estadoEvento(agenda, ahora), "despues");
  assert.deepEqual(sesionActual(agenda, ahora), []);
  assert.equal(proximaSesion(agenda, ahora), null);
  assert.equal(estadoEvento(agenda, caracas("2026-10-17T20:00")), "despues");
  assert.equal(estadoEvento(agenda, caracas("2026-10-17T19:59")), "durante");
});

test("RF-16: el 15 a las 17:00 en punto empieza el evento con el acto inaugural en Ahora", () => {
  const ahora = caracas("2026-10-15T17:00");
  assert.equal(estadoEvento(agenda, ahora), "durante");
  assert.equal(sesionActual(agenda, ahora)[0].sesion.tipo, "protocolo");
});

test("RF-17/18 (03:00 del 16): durante, nada en Ahora y Siguiente es la de las 09:00", () => {
  const ahora = caracas("2026-10-16T03:00");
  assert.equal(estadoEvento(agenda, ahora), "durante");
  assert.deepEqual(sesionActual(agenda, ahora), []);
  assert.equal(proximaSesion(agenda, ahora).sesion.inicio, "09:00");
});

test("RF-17/20 (18:30 del 16): sin sesion, exposicion abierta hasta las 20:00, Siguiente el cierre a las 19:00", () => {
  const ahora = caracas("2026-10-16T18:30");
  assert.deepEqual(sesionActual(agenda, ahora), []);
  assert.equal(exposicionEnCurso(agenda, ahora).sesion.fin, "20:00");
  assert.equal(proximaSesion(agenda, ahora).sesion.titulo, "Cierre de la jornada");
});

test("RF-19/28 (17:45 del 17): no quedan sesiones con hora; la clausura sin hora nunca sale", () => {
  const ahora = caracas("2026-10-17T17:45");
  assert.deepEqual(sesionActual(agenda, ahora), []);
  assert.equal(proximaSesion(agenda, ahora), null);
  assert.equal(exposicionEnCurso(agenda, ahora).sesion.fin, "20:00");
  const clausura = dia("2026-10-17").sesiones.at(-1);
  assert.equal(enCurso(dia("2026-10-17"), clausura, ahora), false);
});

test("RF-20: sin exposicion abierta fuera de horario", () => {
  assert.equal(exposicionEnCurso(agenda, caracas("2026-10-16T07:59")), null);
  assert.equal(exposicionEnCurso(agenda, caracas("2026-10-16T20:00")), null);
});

test("RF-18: ante empate de inicio gana la primera del programa", () => {
  const falsa = {
    dias: [{ fecha: "2026-10-16", sesiones: [
      { inicio: "10:00", fin: "11:00", tipo: "ponencia", titulo: "Primera", sala: "Sala 5" },
      { inicio: "10:00", fin: "11:00", tipo: "ponencia", titulo: "Segunda", sala: "Sala 6" },
    ] }],
  };
  assert.equal(proximaSesion(falsa, caracas("2026-10-16T09:00")).sesion.titulo, "Primera");
});

test("RF-26: diaInicial elige el dia de Caracas si es del programa, y el primero si no", () => {
  assert.equal(diaInicial(agenda, caracas("2026-10-16T23:59")), 1);
  assert.equal(diaInicial(agenda, new Date("2026-10-17T03:00:00Z")), 1); // 23:00 del 16 en Caracas
  assert.equal(diaInicial(agenda, caracas("2026-10-17T00:00")), 2);
  assert.equal(diaInicial(agenda, caracas("2026-10-20T10:00")), 0);
  assert.equal(diaInicial(agenda, caracas("2026-10-01T10:00")), 0);
});

test("RF-29: enCurso es verdadero en [inicio, fin) y falso en el fin", () => {
  const d = dia("2026-10-16");
  const s = sesion("2026-10-16", "11:00");
  assert.equal(enCurso(d, s, caracas("2026-10-16T11:00")), true);
  assert.equal(enCurso(d, s, caracas("2026-10-16T11:59")), true);
  assert.equal(enCurso(d, s, caracas("2026-10-16T12:00")), false);
  assert.equal(enCurso(d, s, caracas("2026-10-16T10:59")), false);
});

// --- RF-13: independencia de la zona horaria del equipo --------------------------

test("RF-13: los resultados son identicos con TZ=Asia/Tokyo, America/Caracas y Europe/Madrid", () => {
  const entorno = new URL("test/entorno.mjs", RAIZ).href;
  const modulo = new URL("src/expofaja/agenda.js", RAIZ).href;
  const datos = fileURLToPath(new URL("public/data/expofaja/agenda.json", RAIZ));
  const codigo = `
    import { readFileSync } from "node:fs";
    import * as m from ${JSON.stringify(modulo)};
    const agenda = JSON.parse(readFileSync(${JSON.stringify(datos)}, "utf8"));
    const salida = {};
    for (const t of ["2026-10-15T08:00","2026-10-16T11:59","2026-10-16T12:00","2026-10-16T18:30","2026-10-17T21:00"]) {
      const ahora = new Date(t + ":00-04:00");
      salida[t] = {
        estado: m.estadoEvento(agenda, ahora),
        actual: m.sesionActual(agenda, ahora).map((x) => x.sesion.titulo),
        siguiente: m.proximaSesion(agenda, ahora)?.sesion.titulo ?? null,
        cuenta: m.cuentaRegresiva(agenda, ahora),
        hora: m.horaEvento(ahora),
        fecha: m.fechaEvento(ahora),
        dia: m.diaInicial(agenda, ahora),
        ics: m.generarIcs(agenda.dias[1].sesiones[1], agenda.dias[1], null, new Date("2026-10-13T12:00:00Z")),
      };
    }
    salida.inicio = m.instanteEvento("2026-10-16", "09:00").toISOString();
    salida.ahora = m.leerAhora("?ahora=2026-10-16T10:30", true).toISOString();
    console.log(JSON.stringify(salida));
  `;
  const correr = (tz) =>
    JSON.parse(
      execFileSync(process.execPath, ["--import", entorno, "--input-type=module", "-e", codigo], {
        env: { ...process.env, TZ: tz },
        encoding: "utf8",
      }),
    );
  const referencia = correr("America/Caracas");
  assert.equal(referencia["2026-10-16T11:59"].actual.length, 1);
  assert.equal(referencia.ahora, "2026-10-16T14:30:00.000Z");
  for (const tz of ["Asia/Tokyo", "Europe/Madrid"]) assert.deepEqual(correr(tz), referencia, tz);
});

// --- RF-23/24: ?ahora= -------------------------------------------------------------

test("RF-23: en desarrollo ?ahora= fija el instante en hora del evento y da Perez Graterol", () => {
  const ahora = leerAhora("?ahora=2026-10-16T10:30", true, () => new Date(0));
  assert.equal(ahora.toISOString(), "2026-10-16T14:30:00.000Z");
  assert.equal(sesionActual(agenda, ahora)[0].sesion.ponente_id, "julio-perez-graterol");
});

test("RF-24: leerAhora ignora ?ahora= si no esta permitido o el valor es invalido", () => {
  const reloj = () => new Date("2030-01-01T00:00:00Z");
  assert.equal(leerAhora("?ahora=2026-10-16T10:30", false, reloj).getTime(), reloj().getTime());
  for (const malo of ["manana", "", "2026-10-16", "2026-10-16T25:00", "2026-10-16T24:00", "2026-02-31T10:00", "2026-13-01T10:00", "2026-10-16T10:30:00"]) {
    assert.equal(leerAhora(`?ahora=${malo}`, true, reloj).getTime(), reloj().getTime(), malo);
  }
  assert.equal(leerAhora("?otro=1", true, reloj).getTime(), reloj().getTime());
  assert.equal(leerAhora("", true, reloj).getTime(), reloj().getTime());
});

// --- .ics ---------------------------------------------------------------------------

const GENERADO = new Date("2026-10-13T12:34:56Z");
const farias = () => ponentes.find((p) => p.id === "jesus-farias");

test("RF-32: el .ics usa CRLF y ninguna linea pasa de 75 octetos", () => {
  const largo = { inicio: "11:00", fin: "12:00", tipo: "ponencia", titulo: "Ñandú, ".repeat(40), sala: "Sala 5" };
  const texto = generarIcs(largo, dia("2026-10-16"), farias(), GENERADO, evento);
  assert.ok(texto.endsWith("\r\n"));
  assert.equal(texto.replace(/\r\n/g, "").includes("\n"), false);
  assert.equal(texto.replace(/\r\n/g, "").includes("\r"), false);
  for (const linea of texto.split("\r\n")) assert.ok(Buffer.byteLength(linea, "utf8") <= 75, linea);
  // las lineas plegadas se desplegan al titulo original
  const desplegado = texto.replace(/\r\n /g, "");
  assert.ok(desplegado.includes(`SUMMARY:${largo.titulo.replaceAll(",", "\\,")}`));
});

test("RF-32: estructura VCALENDAR/VTIMEZONE/VEVENT con TZID America/Caracas y sede de evento.json", () => {
  const s = sesion("2026-10-16", "11:00");
  const texto = generarIcs(s, dia("2026-10-16"), farias(), GENERADO, evento);
  const lineas = texto.split("\r\n");
  for (const esperada of [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Orinoco Digital//ExpoFaja 2026//ES",
    "BEGIN:VTIMEZONE",
    "TZID:America/Caracas",
    "TZOFFSETTO:-0400",
    "BEGIN:VEVENT",
    "DTSTAMP:20261013T123456Z",
    "DTSTART;TZID=America/Caracas:20261016T110000",
    "DTEND;TZID=America/Caracas:20261016T120000",
    "END:VEVENT",
    "END:VCALENDAR",
  ]) {
    assert.ok(lineas.includes(esperada), esperada);
  }
  const desplegado = texto.replace(/\r\n /g, "");
  assert.ok(desplegado.includes("LOCATION:Museo de Arte Moderno Jesús Soto\\, Ciudad Bolívar"));
  assert.ok(desplegado.includes("DESCRIPTION:Eco. Jesús Farías\\nSala 5\\nPrograma oficial de la CCIEB"));
});

test("RF-32: sin ponente ni sala la descripcion solo trae el programa oficial; sin evento no se inventa LOCATION", () => {
  const pausa = sesion("2026-10-16", "12:00");
  const texto = generarIcs(pausa, dia("2026-10-16"), null, GENERADO);
  assert.ok(texto.includes("DESCRIPTION:Programa oficial de la CCIEB\r\n"));
  assert.equal(texto.includes("LOCATION"), false);
});

test("RF-34: se escapan barra invertida, coma, punto y coma y salto de linea", () => {
  const rara = { inicio: "09:00", fin: "10:00", tipo: "ponencia", titulo: "a\\b, c; d\ne", sala: "S;1" };
  const texto = generarIcs(rara, dia("2026-10-16"), null, GENERADO);
  assert.ok(texto.includes("SUMMARY:a\\\\b\\, c\\; d\\ne\r\n"));
  assert.ok(texto.includes("DESCRIPTION:S\\;1\\nPrograma oficial de la CCIEB\r\n"));
});

test("RF-28/31: generarIcs rechaza una sesion sin hora", () => {
  const clausura = dia("2026-10-17").sesiones.at(-1);
  assert.throws(() => generarIcs(clausura, dia("2026-10-17"), null, GENERADO), /sin hora|no tiene hora/);
});

test("RF-33: el UID es estable, lleva @orinoco-digital y es distinto en cada sesion con hora del programa", () => {
  const s = sesion("2026-10-16", "09:00");
  assert.equal(uidSesion(dia("2026-10-16"), s), "2026-10-16-0900-sala-5@orinoco-digital");
  assert.equal(uidSesion(dia("2026-10-16"), s), uidSesion(dia("2026-10-16"), { ...s }));
  const uids = [];
  for (const d of agenda.dias) for (const x of d.sesiones) if (x.inicio) uids.push(uidSesion(d, x));
  assert.ok(uids.length >= 20);
  assert.equal(new Set(uids).size, uids.length);
  assert.ok(uids.every((u) => u.endsWith("@orinoco-digital")));
  // el UID del .ics es el de la sesion
  assert.ok(generarIcs(s, dia("2026-10-16"), null, GENERADO).includes(`UID:${uidSesion(dia("2026-10-16"), s)}\r\n`));
});

// --- E4.1: memoria del evento (RF-21) ---------------------------------------

import { presentacionEvento, mostrarEtiquetaAhora } from "../src/expofaja/agenda.js";

test("E4.1/RF-21: despues del cierre no hay calendario, etiqueta Ahora ni reloj; la franja es Resumen", () => {
  for (const hora of ["2026-10-17T20:00", "2026-10-18T10:00", "2027-01-05T09:00"]) {
    const p = presentacionEvento(agenda, caracas(hora));
    assert.deepEqual(
      { estado: p.estado, celebrado: p.celebrado, franja: p.franja, calendario: p.calendario, etiquetaAhora: p.etiquetaAhora, reloj: p.reloj },
      { estado: "despues", celebrado: true, franja: "resumen", calendario: false, etiquetaAhora: false, reloj: false },
      hora,
    );
  }
});

test("E4.1: antes y durante conservan Ahora/Siguiente, calendario y reloj", () => {
  for (const [hora, estado] of [["2026-10-14T09:00", "antes"], ["2026-10-16T10:30", "durante"], ["2026-10-17T19:59", "durante"]]) {
    const p = presentacionEvento(agenda, caracas(hora));
    assert.equal(p.estado, estado, hora);
    assert.deepEqual([p.celebrado, p.franja, p.calendario, p.etiquetaAhora, p.reloj], [false, "ahoraSiguiente", true, true, true], hora);
  }
});

test("E4.1: la etiqueta Ahora no aparece despues aunque la hora caiga dentro de una sesion; en vivo si", () => {
  const d = dia("2026-10-16");
  const ponencia = d.sesiones.find((s) => s.tipo !== "exposicion" && s.inicio && s.fin);
  const dentro = caracas(`2026-10-16T${ponencia.inicio}`);
  assert.equal(mostrarEtiquetaAhora(agenda, d, ponencia, dentro), true);
  const despues = caracas("2026-10-18T10:00");
  for (const dd of agenda.dias) {
    for (const s of dd.sesiones) assert.equal(mostrarEtiquetaAhora(agenda, dd, s, despues), false);
  }
});

test("E4.1: el modo sale de ?ahora= simulado en desarrollo y se ignora en produccion", () => {
  const sim = leerAhora("?ahora=2026-10-18T10:00", true, () => caracas("2026-10-14T09:00"));
  assert.equal(presentacionEvento(agenda, sim).celebrado, true);
  const prod = leerAhora("?ahora=2026-10-18T10:00", false, () => caracas("2026-10-14T09:00"));
  assert.equal(presentacionEvento(agenda, prod).celebrado, false);
});
