/**
 * Motor puro del recorrido guiado (spec 003, plan §3.2). Sin DOM, sin red y
 * sin Cesium: todo entra por parametro. Solo se carga por `import()`.
 * RF-79, 80, 82, 83, 85, 86, 91-93, 109, 123-126.
 */

import { buscarActivo } from "../modos.js";

const IDIOMA_BASE = "es";
const NIVEL_BASE = "divulgacion";
const RADIO_TIERRA_M = 6_371_000;
/** Radio minimo de un encuadre (un solo punto). SIN VERIFICAR: se mide en T13. */
const RADIO_MINIMO_M = 15_000;
/** Desplazamiento en horizontal bajo = el vertical por este factor. SIN VERIFICAR (T13). */
const FACTOR_HORIZONTAL_BAJO = 1.5;

/** @returns {{recorrido: string|null, escena: number|null, nivel: string|null}} vacios o no numericos -> null */
export function leerEnlaceRuta(search) {
  const params = new URLSearchParams(search ?? "");
  const texto = (clave) => params.get(clave) || null;
  const escena = texto("escena");
  return {
    recorrido: texto("recorrido"),
    escena: escena !== null && /^\d+$/.test(escena) ? Number(escena) : null,
    nivel: texto("nivel"),
  };
}

/** Acota DESPUES de cargar: escena en rango o 1; nivel valido o "divulgacion" (RF-80). */
export function estadoInicial(recorrido, enlace, niveles) {
  const total = recorrido?.escenas?.length ?? 0;
  const n = enlace?.escena;
  const escena = Number.isInteger(n) && n >= 1 && n <= total ? n : 1;
  const nivel = niveles.includes(enlace?.nivel) ? enlace.nivel : NIVEL_BASE;
  return { escena, nivel };
}

/** "/?modo=ruta&recorrido=R5&escena=3&nivel=tecnico" (RF-91) */
export function urlDeEscena(pathname, { recorrido, escena, nivel }) {
  const p = new URLSearchParams({ modo: "ruta", recorrido, escena: String(escena), nivel });
  return `${pathname}?${p.toString()}`;
}

/** @returns {{escena: number, terminado: boolean}} (RF-83, RF-85) */
export function siguiente(recorrido, escena) {
  const total = recorrido.escenas.length;
  return escena >= total ? { escena: total, terminado: true } : { escena: escena + 1, terminado: false };
}

/** En la 1 se queda en 1. */
export function anterior(recorrido, escena) {
  return { escena: Math.max(1, escena - 1), terminado: false };
}

/** Sin idioma (o idioma sin texto) cae a "es". */
export function textoDeEscena(escena, nivel, idioma) {
  const bloque = escena?.texto?.[nivel];
  return bloque?.[idioma] ?? bloque?.[IDIOMA_BASE] ?? "";
}

/** Datos listos para pintar; [] si no hay (RF-94, RF-95, RF-100). */
export function datosDeEscena(escena, idioma) {
  const pick = (bilingue) => (bilingue ? (bilingue[idioma] ?? bilingue[IDIOMA_BASE] ?? null) : null);
  return (escena?.datos ?? []).map((d) => ({
    id: d.id,
    tipoDato: d.tipo_dato ?? null,
    etiqueta: pick(d.etiqueta),
    valor: d.valor,
    unidad: d.unidad ?? null,
    aproximado: d.aproximado === true,
    fuente: d.fuente,
    fuenteNombre: pick(d.fuente_nombre),
    confianza: d.confianza ?? null,
    fechaDato: d.fecha_dato ?? null,
    ultimaVerificacion: d.ultima_verificacion ?? null,
    fechaNorma: d.fecha_norma ?? null,
    nota: pick(d.nota),
  }));
}

/** Capas de sector a encender y a apagar (RF-86). */
export function capasDeSector(escena, sectores) {
  const pedidas = escena?.capas ?? [];
  return {
    encender: sectores.filter((s) => pedidas.includes(s)),
    apagar: sectores.filter((s) => !pedidas.includes(s)),
  };
}

function coordenadas(geometry) {
  if (!geometry) return [];
  if (geometry.type === "GeometryCollection") return geometry.geometries.flatMap(coordenadas);
  const salida = [];
  const recorrer = (c) => {
    if (typeof c?.[0] === "number") salida.push(c);
    else if (Array.isArray(c)) c.forEach(recorrer);
  };
  recorrer(geometry.coordinates);
  return salida;
}

function puntoDe(feature) {
  const g = feature.geometry;
  if (g?.type === "Point") return { lng: g.coordinates[0], lat: g.coordinates[1] };
  const cs = coordenadas(g);
  if (!cs.length) return null;
  const lngs = cs.map((c) => c[0]);
  const lats = cs.map((c) => c[1]);
  return { lng: (Math.min(...lngs) + Math.max(...lngs)) / 2, lat: (Math.min(...lats) + Math.max(...lats)) / 2 };
}

/**
 * Resuelve camara -> puntos con buscarActivo (src/modos.js). Point -> su coordenada; linea o poligono -> centro de su caja.
 * colecciones[clave]: null = cargando, false = fallo, FeatureCollection = cargada (convencion de main.js).
 * @returns {{estado: "ok", puntos: Array<{lng,lat}>, vista: "faja"|null}
 *         | {estado: "pendiente"}   // no esta y alguna capa de ordenBusqueda es null (RF-124)
 *         | {estado: "ausente"}}    // no esta y todas son coleccion o false (RF-123)
 */
export function resolverCamara(escena, colecciones, ordenBusqueda) {
  const camara = escena?.camara ?? {};
  if (camara.vista === "faja") return { estado: "ok", puntos: [], vista: "faja" };
  const refs = camara.entre ?? (camara.objetivo_ref ? [camara.objetivo_ref] : []);
  const puntos = [];
  for (const ref of refs) {
    const hallado = buscarActivo(ref, colecciones, ordenBusqueda);
    const punto = hallado && puntoDe(hallado.feature);
    if (!punto) {
      const cargando = ordenBusqueda.some((capa) => colecciones[capa] === null);
      return { estado: cargando ? "pendiente" : "ausente" };
    }
    puntos.push(punto);
  }
  if (!puntos.length) return { estado: "ausente" };
  return { estado: "ok", puntos, vista: null };
}

function distanciaM(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/**
 * Encuadre abstracto: centro, radio, rumbo, inclinacion y desplazamiento segun {vertical, horizontalBajo} (RF-109, RF-126).
 * Escritorio (ninguno de los dos) no desplaza: el panel es una tarjeta lateral. null si la resolucion no es "ok".
 */
export function encuadreDe(resolucion, camaraCfg, pantalla) {
  if (resolucion?.estado !== "ok") return null;
  const inclinacion = camaraCfg.inclinacionGrados;
  if (resolucion.vista === "faja") {
    return { centro: null, radioM: 0, rumbo: 0, inclinacion, desplazamiento: 0, vista: "faja" };
  }
  const { puntos } = resolucion;
  const centro = {
    lng: puntos.reduce((s, p) => s + p.lng, 0) / puntos.length,
    lat: puntos.reduce((s, p) => s + p.lat, 0) / puntos.length,
  };
  const alcance = Math.max(...puntos.map((p) => distanciaM(centro, p)));
  const radioM = Math.max(alcance * camaraCfg.margen, camaraCfg.radioMinimoM ?? RADIO_MINIMO_M);
  const vertical = camaraCfg.desplazamientoVertical ?? 0;
  const desplazamiento = pantalla?.vertical
    ? vertical
    : pantalla?.horizontalBajo
      ? (camaraCfg.desplazamientoHorizontalBajo ?? vertical * FACTOR_HORIZONTAL_BAJO)
      : 0;
  return { centro, radioM, rumbo: 0, inclinacion, desplazamiento, vista: null };
}
