/**
 * Motor puro del recorrido (spec 003, T04). Sin DOM, sin red, sin Cesium.
 * RF-79, 80, 82, 83, 85, 86, 91, 92, 93, 109, 123, 124, 126.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  leerEnlaceRuta,
  estadoInicial,
  urlDeEscena,
  siguiente,
  anterior,
  textoDeEscena,
  datosDeEscena,
  capasDeSector,
  resolverCamara,
  encuadreDe,
} from "../src/ruta/motor.js";
import { RECORRIDO, SECTORES } from "../src/config.js";

const escena = (orden, extra = {}) => ({ id: `T-E${orden}`, orden, camara: { vista: "faja" }, capas: [], texto: {}, datos: [], ...extra });
const recorrido = { id: "T", escenas: [1, 2, 3, 4, 5].map((n) => escena(n)) };
const NIVELES = ["divulgacion", "tecnico"];

// --- leerEnlaceRuta / estadoInicial / urlDeEscena ---------------------------

test("leerEnlaceRuta: enlace valido // RF-91", () => {
  assert.deepEqual(leerEnlaceRuta("?modo=ruta&recorrido=R5&escena=3&nivel=tecnico"), { recorrido: "R5", escena: 3, nivel: "tecnico" });
});

test("leerEnlaceRuta: vacios o no numericos dan null // RF-80", () => {
  assert.deepEqual(leerEnlaceRuta(""), { recorrido: null, escena: null, nivel: null });
  assert.deepEqual(leerEnlaceRuta(undefined), { recorrido: null, escena: null, nivel: null });
  assert.deepEqual(leerEnlaceRuta("?recorrido=&escena=&nivel="), { recorrido: null, escena: null, nivel: null });
  assert.equal(leerEnlaceRuta("?escena=x").escena, null);
  assert.equal(leerEnlaceRuta("?escena=2.5").escena, null);
});

test("leerEnlaceRuta: escena 0 y 9 se leen tal cual; acotar es de estadoInicial", () => {
  assert.equal(leerEnlaceRuta("?escena=0").escena, 0);
  assert.equal(leerEnlaceRuta("?escena=9").escena, 9);
});

test("estadoInicial: acota DESPUES de cargar // RF-80", () => {
  assert.deepEqual(estadoInicial(recorrido, { recorrido: "T", escena: 3, nivel: "tecnico" }, NIVELES), { escena: 3, nivel: "tecnico" });
  assert.equal(estadoInicial(recorrido, { escena: 0 }, NIVELES).escena, 1);
  assert.equal(estadoInicial(recorrido, { escena: 9 }, NIVELES).escena, 1);
  assert.equal(estadoInicial(recorrido, { escena: null }, NIVELES).escena, 1);
  assert.equal(estadoInicial(recorrido, { escena: 5 }, NIVELES).escena, 5);
});

test("estadoInicial: nivel invalido o vacio cae a divulgacion // RF-80", () => {
  assert.equal(estadoInicial(recorrido, { nivel: "experto" }, NIVELES).nivel, "divulgacion");
  assert.equal(estadoInicial(recorrido, { nivel: null }, NIVELES).nivel, "divulgacion");
  assert.equal(estadoInicial(recorrido, {}, NIVELES).nivel, "divulgacion");
});

test("urlDeEscena: forma exacta del plan // RF-91", () => {
  assert.equal(urlDeEscena("/", { recorrido: "R5", escena: 3, nivel: "tecnico" }), "/?modo=ruta&recorrido=R5&escena=3&nivel=tecnico");
});

test("urlDeEscena: ida y vuelta con leerEnlaceRuta // RF-91", () => {
  const estado = { recorrido: "R5", escena: 4, nivel: "divulgacion" };
  const url = urlDeEscena("/", estado);
  assert.deepEqual(leerEnlaceRuta(url.slice(url.indexOf("?"))), estado);
});

// --- siguiente / anterior ---------------------------------------------------

test("siguiente: avanza y marca terminado en la ultima // RF-83, RF-85", () => {
  assert.deepEqual(siguiente(recorrido, 1), { escena: 2, terminado: false });
  assert.deepEqual(siguiente(recorrido, 4), { escena: 5, terminado: false });
  assert.deepEqual(siguiente(recorrido, 5), { escena: 5, terminado: true });
});

test("anterior: retrocede y en la 1 se queda en 1 // RF-85", () => {
  assert.deepEqual(anterior(recorrido, 3), { escena: 2, terminado: false });
  assert.deepEqual(anterior(recorrido, 1), { escena: 1, terminado: false });
});

// --- textoDeEscena / datosDeEscena / capasDeSector --------------------------

const conTexto = escena(3, {
  texto: {
    divulgacion: { es: "Hola", en: "Hello" },
    tecnico: { es: "Tecnico", en: "Technical" },
  },
});

test("textoDeEscena: por nivel e idioma // RF-92", () => {
  assert.equal(textoDeEscena(conTexto, "divulgacion", "es"), "Hola");
  assert.equal(textoDeEscena(conTexto, "divulgacion", "en"), "Hello");
  assert.equal(textoDeEscena(conTexto, "tecnico", "en"), "Technical");
});

test("textoDeEscena: sin idioma cae a es; nivel inexistente da cadena vacia", () => {
  assert.equal(textoDeEscena(conTexto, "tecnico", undefined), "Tecnico");
  assert.equal(textoDeEscena(conTexto, "tecnico", "fr"), "Tecnico");
  assert.equal(textoDeEscena(conTexto, "experto", "es"), "");
});

const dato = {
  id: "D2", tipo_dato: "cifra",
  etiqueta: { es: "Gravedad", en: "Gravity" },
  valor: "16", unidad: "°API", aproximado: true,
  fecha_dato: "2021-09-13", fuente: "https://ejemplo.org/x",
  fuente_nombre: { es: "Fuente ES", en: "Source EN" },
  confianza: "media", ultima_verificacion: "2026-10-24",
  fecha_norma: "2026-01-29", nota: { es: "Nota ES", en: "Note EN" },
};

test("datosDeEscena: lista lista para pintar, por idioma // RF-94, RF-95", () => {
  const [d] = datosDeEscena(escena(1, { datos: [dato] }), "en");
  assert.equal(d.id, "D2");
  assert.equal(d.etiqueta, "Gravity");
  assert.equal(d.valor, "16");
  assert.equal(d.unidad, "°API");
  assert.equal(d.aproximado, true);
  assert.equal(d.fuente, "https://ejemplo.org/x");
  assert.equal(d.fuenteNombre, "Source EN");
  assert.equal(d.confianza, "media");
  assert.equal(d.fechaDato, "2021-09-13");
  assert.equal(d.ultimaVerificacion, "2026-10-24");
  assert.equal(d.fechaNorma, "2026-01-29");
  assert.equal(d.nota, "Note EN");
});

test("datosDeEscena: sin nota ni norma da null; sin datos da [] // RF-100", () => {
  const sinExtras = { ...dato, aproximado: false, nota: undefined, fecha_norma: undefined };
  const [d] = datosDeEscena(escena(1, { datos: [sinExtras] }), "es");
  assert.equal(d.nota, null);
  assert.equal(d.fechaNorma, null);
  assert.equal(d.aproximado, false);
  assert.deepEqual(datosDeEscena(escena(1, { datos: [] }), "es"), []);
  assert.deepEqual(datosDeEscena(escena(1, { datos: undefined }), "es"), []);
});

test("capasDeSector: enciende las de la escena y apaga el resto // RF-86", () => {
  const r = capasDeSector(escena(3, { capas: ["midstream", "downstream"] }), SECTORES);
  assert.deepEqual(r, { encender: ["midstream", "downstream"], apagar: ["upstream"] });
  assert.deepEqual(capasDeSector(escena(1, { capas: [] }), SECTORES), { encender: [], apagar: ["upstream", "midstream", "downstream"] });
});

// --- resolverCamara ---------------------------------------------------------

const pt = (id, lng, lat) => ({ type: "Feature", properties: { id }, geometry: { type: "Point", coordinates: [lng, lat] } });
const linea = (id, coords) => ({ type: "Feature", properties: { id }, geometry: { type: "LineString", coordinates: coords } });
const poligono = (id, anillo) => ({ type: "Feature", properties: { id }, geometry: { type: "Polygon", coordinates: [anillo] } });
const fc = (...features) => ({ type: "FeatureCollection", features });

const ORDEN = ["campos", "downstream", "ductos"];
const cargadas = () => ({
  campos: fc(poligono("P1", [[-65, 8], [-63, 8], [-63, 10], [-65, 10], [-65, 8]])),
  downstream: fc(pt("A", -64.8, 10.0), pt("B", -64.0, 9.0)),
  ductos: fc(linea("L1", [[-66, 9], [-64, 9], [-64, 11]])),
});
const refEscena = (camara) => escena(3, { camara });

test("resolverCamara: Point -> su coordenada // RF-86", () => {
  const r = resolverCamara(refEscena({ objetivo_ref: "A" }), cargadas(), ORDEN);
  assert.deepEqual(r, { estado: "ok", puntos: [{ lng: -64.8, lat: 10.0 }], vista: null });
});

test("resolverCamara: LineString -> centro de su caja", () => {
  const r = resolverCamara(refEscena({ objetivo_ref: "L1" }), cargadas(), ORDEN);
  assert.equal(r.estado, "ok");
  assert.deepEqual(r.puntos, [{ lng: -65, lat: 10 }]);
});

test("resolverCamara: Polygon -> centro de su caja", () => {
  const r = resolverCamara(refEscena({ objetivo_ref: "P1" }), cargadas(), ORDEN);
  assert.deepEqual(r.puntos, [{ lng: -64, lat: 9 }]);
});

test("resolverCamara: par `entre` -> dos puntos // RF-86", () => {
  const r = resolverCamara(refEscena({ entre: ["A", "B"] }), cargadas(), ORDEN);
  assert.equal(r.estado, "ok");
  assert.deepEqual(r.puntos, [{ lng: -64.8, lat: 10.0 }, { lng: -64.0, lat: 9.0 }]);
});

test("resolverCamara: vista faja // RF-86", () => {
  const r = resolverCamara(refEscena({ vista: "faja" }), cargadas(), ORDEN);
  assert.deepEqual(r, { estado: "ok", puntos: [], vista: "faja" });
});

test("resolverCamara: vista faja no necesita colecciones", () => {
  const r = resolverCamara(refEscena({ vista: "faja" }), { campos: null, downstream: null, ductos: null }, ORDEN);
  assert.equal(r.estado, "ok");
});

test("resolverCamara: id inexistente con todas las capas cargadas -> ausente // RF-123", () => {
  assert.deepEqual(resolverCamara(refEscena({ objetivo_ref: "NOPE" }), cargadas(), ORDEN), { estado: "ausente" });
});

test("resolverCamara: id inexistente con una capa en null -> pendiente // RF-124", () => {
  const colecciones = { ...cargadas(), ductos: null };
  assert.deepEqual(resolverCamara(refEscena({ objetivo_ref: "NOPE" }), colecciones, ORDEN), { estado: "pendiente" });
});

test("resolverCamara: capa en false (fallo) -> ausente // RF-123", () => {
  const colecciones = { ...cargadas(), ductos: false };
  assert.deepEqual(resolverCamara(refEscena({ objetivo_ref: "NOPE" }), colecciones, ORDEN), { estado: "ausente" });
});

test("resolverCamara: id presente aunque otra capa siga cargando -> ok", () => {
  const colecciones = { ...cargadas(), ductos: null };
  assert.equal(resolverCamara(refEscena({ objetivo_ref: "A" }), colecciones, ORDEN).estado, "ok");
});

test("resolverCamara: par con un id que falta -> pendiente o ausente segun las capas", () => {
  assert.deepEqual(resolverCamara(refEscena({ entre: ["A", "NOPE"] }), cargadas(), ORDEN), { estado: "ausente" });
  assert.deepEqual(resolverCamara(refEscena({ entre: ["A", "NOPE"] }), { ...cargadas(), ductos: null }, ORDEN), { estado: "pendiente" });
});

// --- encuadreDe -------------------------------------------------------------

const pantallaDe = (ancho, alto) => ({ vertical: ancho < 640, horizontalBajo: ancho >= 640 && alto < 500 });
const VERTICAL = pantallaDe(390, 844);
const ESCRITORIO = pantallaDe(1440, 900);
const HORIZONTAL = pantallaDe(844, 390);
const CFG = RECORRIDO.camara;

const unPunto = { estado: "ok", puntos: [{ lng: -64.8, lat: 10.0 }], vista: null };
const unPar = { estado: "ok", puntos: [{ lng: -64.8, lat: 10.0 }, { lng: -64.0, lat: 9.0 }], vista: null };

test("pantallaDe del test: las tres geometrias son distintas", () => {
  assert.deepEqual(VERTICAL, { vertical: true, horizontalBajo: false });
  assert.deepEqual(ESCRITORIO, { vertical: false, horizontalBajo: false });
  assert.deepEqual(HORIZONTAL, { vertical: false, horizontalBajo: true });
});

test("encuadreDe: un punto -> centro en el punto, radio positivo, inclinacion de config // RF-109", () => {
  const e = encuadreDe(unPunto, CFG, ESCRITORIO);
  assert.deepEqual(e.centro, { lng: -64.8, lat: 10.0 });
  assert.ok(e.radioM > 0);
  assert.equal(e.inclinacion, CFG.inclinacionGrados);
  assert.equal(typeof e.rumbo, "number");
  assert.equal(e.vista, null);
});

test("encuadreDe: un par -> centro en el punto medio y radio que cubre ambos // RF-126", () => {
  const e = encuadreDe(unPar, CFG, ESCRITORIO);
  assert.ok(Math.abs(e.centro.lng - -64.4) < 1e-9);
  assert.ok(Math.abs(e.centro.lat - 9.5) < 1e-9);
  // distancia entre los puntos ~ 135 km; el radio incluye ambos con margen
  assert.ok(e.radioM >= 67_000 * CFG.margen * 0.95, `radio ${e.radioM}`);
  assert.ok(e.radioM > encuadreDe(unPunto, CFG, ESCRITORIO).radioM);
});

test("encuadreDe: el desplazamiento difiere en vertical, escritorio y horizontal bajo // RF-109, RF-126", () => {
  const v = encuadreDe(unPunto, CFG, VERTICAL).desplazamiento;
  const d = encuadreDe(unPunto, CFG, ESCRITORIO).desplazamiento;
  const h = encuadreDe(unPunto, CFG, HORIZONTAL).desplazamiento;
  assert.equal(v, CFG.desplazamientoVertical);
  assert.equal(d, 0);
  assert.ok(h > 0);
  assert.notEqual(v, d);
  assert.notEqual(h, d);
  assert.notEqual(v, h);
  // el par se comporta igual
  assert.equal(encuadreDe(unPar, CFG, VERTICAL).desplazamiento, v);
  assert.equal(encuadreDe(unPar, CFG, HORIZONTAL).desplazamiento, h);
});

test("encuadreDe: el radio no depende de la pantalla; solo el desplazamiento", () => {
  assert.equal(encuadreDe(unPar, CFG, VERTICAL).radioM, encuadreDe(unPar, CFG, HORIZONTAL).radioM);
});

test("encuadreDe: vista faja delega (centro null, vista 'faja') // RF-86", () => {
  const e = encuadreDe({ estado: "ok", puntos: [], vista: "faja" }, CFG, VERTICAL);
  assert.equal(e.vista, "faja");
  assert.equal(e.centro, null);
});

test("encuadreDe: sin resolucion ok devuelve null", () => {
  assert.equal(encuadreDe({ estado: "pendiente" }, CFG, VERTICAL), null);
  assert.equal(encuadreDe({ estado: "ausente" }, CFG, VERTICAL), null);
});
