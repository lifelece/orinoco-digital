/**
 * Datos del micrositio ExpoFaja: copias de las semillas, noscript, carga y validacion.
 * Spec 002, RF-1..8, RF-47, RF-73.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

import { RUTAS_EXPOFAJA } from "../src/config.js";
import {
  cargarDatosEvento,
  validarAgenda,
  validarEvento,
  validarNoticias,
  validarResumen,
} from "../src/expofaja/datos.js";
import { generarNoscript, insertarNoscript } from "../scripts/expofaja-datos.mjs";

const RAIZ = new URL("../", import.meta.url);
const PUBLICAR = {
  "evento.json": "evento.json",
  "agenda.json": "agenda.json",
  "ponentes.json": "ponentes.json",
  "aliados.json": "aliados.json",
  "marcas-manifiesto.json": "marcas-manifiesto.json",
  "iniciativas-ccieb.json": "iniciativas-ccieb.json",
  "noticias-ccieb.json": "noticias.json",
};

const leer = async (ruta) => JSON.parse(await readFile(new URL(ruta, RAIZ), "utf8"));
const clonar = (v) => structuredClone(v);
const sinNotas = (v) => JSON.parse(JSON.stringify(v, (clave, valor) => (clave === "_nota" ? undefined : valor)));

/** fetch simulado que sirve public/ del repo; `roto` mapea ruta -> estado HTTP. */
function fetchLocal(roto = {}, cambios = {}) {
  return async (ruta) => {
    if (roto[ruta]) return { ok: false, status: roto[ruta], json: async () => ({}) };
    const datos = cambios[ruta] ?? (await leer(`public${ruta}`));
    return { ok: true, status: 200, json: async () => datos };
  };
}

// --- A1: copias de las semillas -------------------------------------------------

test("RF-2: cada semilla tiene su copia publicada, identica salvo las claves _nota", async () => {
  for (const [semilla, copia] of Object.entries(PUBLICAR)) {
    const original = await leer(`docs/expofaja/semillas/${semilla}`);
    const publicada = await leer(`public/data/expofaja/${copia}`);
    assert.deepEqual(publicada, sinNotas(original), copia);
  }
});

test("RF-2: ninguna copia publicada contiene la clave _nota", async () => {
  for (const copia of Object.values(PUBLICAR)) {
    const texto = await readFile(new URL(`public/data/expofaja/${copia}`, RAIZ), "utf8");
    assert.equal(texto.includes('"_nota"'), false, copia);
  }
});

test("RF-2: las claves nota (sin guion bajo) de las sesiones se conservan", async () => {
  const agenda = await leer("public/data/expofaja/agenda.json");
  const notas = agenda.dias.flatMap((d) => d.sesiones).filter((s) => s.nota);
  assert.ok(notas.length > 0);
});

test("RF-8: toda foto de ponente y todo logo publicable referenciado existe bajo public/expofaja/", async () => {
  const ponentes = await leer("public/data/expofaja/ponentes.json");
  const manifiesto = await leer("public/data/expofaja/marcas-manifiesto.json");
  const rutas = ponentes.ponentes.map((p) => p.foto).filter(Boolean);
  for (const item of manifiesto.items) {
    if (item.publicable) rutas.push(item.publicable);
    // "ruta.webp (derivado...)": solo la ruta
    for (const p of item.publicables ?? []) rutas.push(p.split(" (")[0]);
  }
  assert.ok(rutas.length > 40);
  const faltan = [];
  for (const ruta of rutas) {
    assert.ok(ruta.startsWith("public/expofaja/"), `fuera de public/expofaja/: ${ruta}`);
    try {
      await access(new URL(ruta, RAIZ));
    } catch {
      faltan.push(ruta);
    }
  }
  assert.deepEqual(faltan, []);
});

test("RF-73: el noscript de index.html trae todas las sesiones escapadas y el enlace a la CCIEB", async () => {
  const html = await readFile(new URL("expofaja/index.html", RAIZ), "utf8");
  const bloque = html.slice(html.indexOf("agenda-noscript:inicio"), html.indexOf("agenda-noscript:fin"));
  const agenda = await leer("public/data/expofaja/agenda.json");
  const evento = await leer("public/data/expofaja/evento.json");
  const escapar = (t) => t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  assert.ok(bloque.includes("<noscript>"));
  for (const dia of agenda.dias) {
    assert.ok(bloque.includes(escapar(dia.nombre)), dia.nombre);
    for (const s of dia.sesiones) assert.ok(bloque.includes(escapar(s.titulo)), s.titulo);
  }
  assert.ok(bloque.includes(evento.ccieb.pagina_evento));
  assert.ok(bloque.includes("Hora por confirmar"));
  assert.ok(bloque.includes("Sala 5") && bloque.includes("Alfredo Ordóñez López"));
});

test("RF-73: generarNoscript escapa HTML de los datos y insertarNoscript es idempotente", () => {
  const agenda = { dias: [{ nombre: "Dia <b>1</b>", sesiones: [{ inicio: "09:00", fin: "10:00", titulo: "A & <script>x</script>", ponente_id: "p" }] }] };
  const ponentes = { ponentes: [{ id: "p", titulo: "Dr.", nombre: "Ana \"X\"" }] };
  const evento = { nombre: "Ev", ccieb: { pagina_evento: "https://camaradecomerciobolivar.org/expofaja/" } };
  const bloque = generarNoscript(agenda, ponentes, evento);
  assert.equal(bloque.includes("<script>"), false);
  assert.ok(bloque.includes("A &amp; &lt;script&gt;"));
  assert.ok(bloque.includes("Ana &quot;X&quot;"));
  const base = "<body>\n    <!-- agenda-noscript:inicio (x) -->\n    <!-- agenda-noscript:fin -->\n</body>";
  const una = insertarNoscript(base, bloque);
  assert.equal(insertarNoscript(una, bloque), una);
  assert.throws(() => insertarNoscript("<body></body>", bloque));
});

// --- A2: validadores y carga ----------------------------------------------------

test("RF-5/6/7/47: los JSON reales publicados superan su validacion", async () => {
  const [agenda, ponentes, evento, noticias, resumen] = await Promise.all([
    leer("public/data/expofaja/agenda.json"),
    leer("public/data/expofaja/ponentes.json"),
    leer("public/data/expofaja/evento.json"),
    leer("public/data/expofaja/noticias.json"),
    leer("public/data/ciudad-bolivar-resumen.json"),
  ]);
  assert.deepEqual(validarAgenda(agenda, ponentes), []);
  assert.deepEqual(validarEvento(evento), []);
  assert.deepEqual(validarNoticias(noticias), []);
  assert.deepEqual(validarResumen(resumen), []);
});

test("RF-5: agenda con fecha fuera de 15..17 de octubre es invalida", async () => {
  const ponentes = await leer("public/data/expofaja/ponentes.json");
  const agenda = clonar(await leer("public/data/expofaja/agenda.json"));
  agenda.dias[0].fecha = "2026-10-18";
  assert.equal(validarAgenda(agenda, ponentes).length, 1);
  agenda.dias[0].fecha = "15/10/2026";
  assert.equal(validarAgenda(agenda, ponentes).length, 1);
});

test("RF-5: hora '12:00 AM', '9:00' o '24:00' es invalida; null es valida", async () => {
  const ponentes = await leer("public/data/expofaja/ponentes.json");
  for (const mala of ["12:00 AM", "9:00", "24:00", "", 900]) {
    const agenda = clonar(await leer("public/data/expofaja/agenda.json"));
    agenda.dias[1].sesiones[2].fin = mala;
    assert.ok(validarAgenda(agenda, ponentes).length >= 1, String(mala));
  }
  const agenda = clonar(await leer("public/data/expofaja/agenda.json"));
  const sesion = agenda.dias[2].sesiones.at(-1);
  assert.equal(sesion.inicio, null);
  assert.deepEqual(validarAgenda(agenda, ponentes), []);
});

test("RF-5: tipo desconocido y ponente_id inexistente son invalidos", async () => {
  const ponentes = await leer("public/data/expofaja/ponentes.json");
  const a = clonar(await leer("public/data/expofaja/agenda.json"));
  a.dias[1].sesiones[1].tipo = "taller";
  assert.match(validarAgenda(a, ponentes).join(), /tipo desconocido: taller/);
  const b = clonar(await leer("public/data/expofaja/agenda.json"));
  b.dias[1].sesiones[1].ponente_id = "nadie";
  assert.match(validarAgenda(b, ponentes).join(), /ponente_id inexistente: nadie/);
});

test("RF-6: un bloque del organizador sin fuente invalida el evento (sede, cifra, patrocinio)", async () => {
  const evento = await leer("public/data/expofaja/evento.json");
  const a = clonar(evento);
  delete a.sede.fuente;
  assert.match(validarEvento(a).join(), /sede: sin fuente/);
  const b = clonar(evento);
  b.cifras_organizador.items[3].fuente = "";
  assert.match(validarEvento(b).join(), /cifras_organizador\.items\[3\]: sin fuente/);
  const c = clonar(evento);
  delete c.patrocinio.fuente;
  assert.match(validarEvento(c).join(), /patrocinio: sin fuente/);
});

test("RF-7: noticia de otro dominio (o con dominio disfrazado) invalida noticias.json", async () => {
  const base = await leer("public/data/expofaja/noticias.json");
  for (const url of [
    "https://example.com/2026/10/12/x/",
    "https://camaradecomerciobolivar.org.evil.com/x/",
    "http://camaradecomerciobolivar.org/x/",
    "no es una url",
  ]) {
    const n = clonar(base);
    n.items[0].url = url;
    assert.equal(validarNoticias(n).length, 1, url);
  }
});

test("RF-47: un resumen con otra forma no valida", () => {
  assert.ok(validarResumen({}).length > 0);
  assert.ok(validarResumen({ anillos: [{ km: 50 }], total_campos: 1 }).length > 0);
  assert.ok(validarResumen(null).length > 0);
});

test("RF-3/4: cargarDatosEvento con los datos reales trae todo y sin avisos", async () => {
  const datos = await cargarDatosEvento(fetchLocal());
  assert.equal(datos.evento.id, "expofaja-cbo-2026");
  assert.ok(datos.agenda.dias.length === 3 && datos.ponentes.ponentes.length > 0);
  for (const clave of ["aliados", "manifiesto", "noticias", "iniciativas", "resumen"]) assert.ok(datos[clave], clave);
  assert.deepEqual(datos.avisos, []);
});

test("RF-4/47: un 404 en un archivo opcional lo deja en null con aviso y el resto carga", async () => {
  for (const clave of ["aliados", "manifiesto", "noticias", "iniciativas", "resumen"]) {
    const datos = await cargarDatosEvento(fetchLocal({ [RUTAS_EXPOFAJA[clave]]: 404 }));
    assert.equal(datos[clave], null, clave);
    assert.equal(datos.avisos.length, 1, clave);
    assert.ok(datos.agenda && datos.evento && datos.ponentes);
  }
});

test("RF-4: un opcional que no valida (noticias de otro dominio) queda en null con aviso", async () => {
  const noticias = clonar(await leer("public/data/expofaja/noticias.json"));
  noticias.items[0].url = "https://example.com/x";
  const datos = await cargarDatosEvento(fetchLocal({}, { [RUTAS_EXPOFAJA.noticias]: noticias }));
  assert.equal(datos.noticias, null);
  assert.equal(datos.avisos.length, 1);
});

test("RF-3: un 404 o un JSON invalido en evento, agenda o ponentes lanza Error", async () => {
  for (const clave of ["evento", "agenda", "ponentes"]) {
    await assert.rejects(cargarDatosEvento(fetchLocal({ [RUTAS_EXPOFAJA[clave]]: 404 })), /404/, clave);
  }
  const agenda = clonar(await leer("public/data/expofaja/agenda.json"));
  agenda.dias[0].fecha = "2027-01-01";
  await assert.rejects(cargarDatosEvento(fetchLocal({}, { [RUTAS_EXPOFAJA.agenda]: agenda })), /invalidos/);
  const red = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(cargarDatosEvento(red), /Failed to fetch/);
});
