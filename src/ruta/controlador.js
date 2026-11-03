/**
 * Controlador del recorrido guiado (spec 003, plan §3.7). Chunk diferido: solo
 * se carga con `import()` desde main.js (RF-110). Orquesta motor, datos y panel;
 * no importa ui.js ni map.js (todo lo que necesita llega en `deps`), no usa
 * `fetch` (lo hace datos.js) y no toca Cesium.
 *
 * deps = { fijarCapas, fijarSalidaPorEscape, t, idioma, mostrarError, ordenBusqueda,
 *          mapa: () => modulo|null, colecciones: () => Object, ocultarAccesos: (bool) => void,
 *          irAInicio: () => void }
 */

import { cargarRecorridos } from "./datos.js";
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
} from "./motor.js";
import { montarPanelRecorrido, actualizarPanelRecorrido, desmontarPanelRecorrido } from "../ui/recorrido.js";
import { RECORRIDO, SECTORES } from "../config.js";

/** Estado del recorrido abierto; null si no hay. Una sola instancia. */
let c = null;

const escenaActual = () => c.recorrido.escenas[c.escena - 1];
const pantalla = () => ({ vertical: innerWidth < 640, horizontalBajo: innerHeight < 500 });
const aqui = (valor) => valor?.[c.deps.idioma()] ?? valor?.es ?? "";

function vistaPanel() {
  const total = c.recorrido.escenas.length;
  const e = escenaActual();
  const lang = c.deps.idioma();
  return {
    titulo: aqui(c.recorrido.titulo),
    n: c.escena,
    total,
    nivel: c.nivel,
    texto: textoDeEscena(e, c.nivel, lang),
    datos: datosDeEscena(e, lang),
    referencia: e.referencia ?? null,
    terminado: c.escena === total,
    primera: c.escena === 1,
    plegado: false,
  };
}

/** RF-91: la URL lleva recorrido, escena y nivel; siempre conserva {modo:"ruta"} y no anade entradas. */
function escribirUrl() {
  const url = urlDeEscena(location.pathname, { recorrido: c.recorrido.id, escena: c.escena, nivel: c.nivel });
  history.replaceState({ modo: "ruta" }, "", url);
}

/** RF-86: exactamente las capas de sector de la escena; la primera vez guarda el estado previo (RF-82). */
function aplicarCapas() {
  const { encender, apagar } = capasDeSector(escenaActual(), SECTORES);
  const cambios = Object.fromEntries([...encender.map((s) => [s, true]), ...apagar.map((s) => [s, false])]);
  const previo = c.deps.fijarCapas(cambios);
  c.capasPrevias ??= previo;
}

/** Camara de la escena actual. RF-123 ausente -> Faja con aviso; RF-124 pendiente -> espera; RF-125 sin mapa -> espera. */
export function aplicarCamaraActual() {
  const mapa = c?.recorrido && c.deps.mapa();
  if (!mapa) return;
  let resolucion = resolverCamara(escenaActual(), c.deps.colecciones(), c.deps.ordenBusqueda);
  c.pendiente = resolucion.estado === "pendiente";
  if (resolucion.estado === "ausente") {
    if (c.avisada !== c.escena) {
      c.avisada = c.escena;
      c.deps.mostrarError(c.deps.t("ruta.errorObjetivo"));
    }
    resolucion = { estado: "ok", puntos: [], vista: "faja" };
  }
  const encuadre = encuadreDe(resolucion, RECORRIDO.camara, pantalla());
  if (encuadre) mapa.vistaEscena(encuadre);
}

/** main.js la llama cuando llega una coleccion: solo actua si la camara esperaba (RF-124). */
export function reintentarPendiente() {
  if (c?.pendiente) aplicarCamaraActual();
}

export function irAEscena(n) {
  if (!c?.recorrido) return;
  c.escena = n;
  aplicarCapas();
  escribirUrl();
  actualizarPanelRecorrido(vistaPanel());
  aplicarCamaraActual();
}

export function cambiarNivel(nivel) {
  if (!c?.recorrido || !RECORRIDO.niveles.includes(nivel)) return;
  c.nivel = nivel;
  escribirUrl();
  actualizarPanelRecorrido(vistaPanel());
}

const avanzar = () => {
  const { escena, terminado } = siguiente(c.recorrido, c.escena);
  if (terminado) salir();
  else irAEscena(escena);
};

/** RF-82/83: entrada desde la app -> atras del historial; entrada por enlace -> modo inicial por fecha. */
export function salir() {
  if (!c) return;
  if (c.entradaDesdeApp) history.back();
  else c.deps.irAInicio();
}

/** RF-90: flechas, salvo en campos de texto o en el selector de nivel. */
function alTecla(e) {
  if (!c?.recorrido || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  if (e.target instanceof Element && e.target.closest("input,textarea,select,[contenteditable],[data-nivel]")) return;
  if (e.key === "ArrowRight") avanzar();
  else irAEscena(anterior(c.recorrido, c.escena).escena);
}

const alCambiarIdioma = () => c?.recorrido && actualizarPanelRecorrido(vistaPanel());

/** Deshace todo lo que puso el recorrido; idempotente. Lo llama main.js al retirar el modo. */
export function detener() {
  if (!c) return;
  const { deps, capasPrevias } = c;
  removeEventListener("idioma:cambiado", alCambiarIdioma);
  document.removeEventListener("keydown", alTecla);
  deps.fijarSalidaPorEscape(null);
  desmontarPanelRecorrido();
  c = null;
  if (capasPrevias) deps.fijarCapas(capasPrevias);
  deps.ocultarAccesos(false);
}

/**
 * Abre el recorrido: carga el JSON (RF-105, RF-122), acota escena y nivel del enlace (RF-80),
 * monta el panel y coloca capas y camara. Si algo falla: aviso visible y se sale (mapa usable).
 */
export async function iniciarRecorrido(deps, { entradaDesdeApp }) {
  const propio = (c = { deps, entradaDesdeApp, recorrido: null, escena: 1, nivel: null, capasPrevias: null });
  deps.ocultarAccesos(true);
  deps.fijarSalidaPorEscape(salir);
  try {
    const json = await cargarRecorridos();
    if (c !== propio) return; // salio mientras cargaba
    const enlace = leerEnlaceRuta(location.search);
    propio.recorrido = json.recorridos.find((r) => r.id === enlace.recorrido) ?? json.recorridos.find((r) => r.id === RECORRIDO.porDefecto);
    Object.assign(propio, estadoInicial(propio.recorrido, enlace, RECORRIDO.niveles));
  } catch (error) {
    console.error(error);
    if (c !== propio) return;
    deps.mostrarError(deps.t(/estructura invalida/.test(error?.message) ? "ruta.errorDatos" : "ruta.errorCarga"));
    salir();
    return;
  }
  document.addEventListener("keydown", alTecla);
  addEventListener("idioma:cambiado", alCambiarIdioma);
  montarPanelRecorrido({
    vm: vistaPanel(),
    alAnterior: () => irAEscena(anterior(c.recorrido, c.escena).escena),
    alSiguiente: avanzar,
    alNivel: cambiarNivel,
    alSalir: salir,
    t: deps.t,
  });
  aplicarCapas();
  escribirUrl();
  aplicarCamaraActual();
}
