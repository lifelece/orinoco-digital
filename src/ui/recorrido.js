/**
 * ui/recorrido.js — Panel del recorrido guiado (chunk diferido).
 * Spec 003, plan §3.6. RF-81, 84, 85, 92-95, 100, 101, 106, 108-111, 126, 127.
 *
 * `htmlPanel` es pura (sin DOM, sin i18n importado: recibe `util.t`) y por eso
 * testeable en Node. Sin `fetch` ni `cesium`. Importa accesoRuta.js, nunca al
 * reves. Es una region NO modal: no mueve el foco ni lo atrapa; la hoja
 * inferior se pliega (plan §3.6, nota H-03).
 */

import { fijarRepintadoPanel } from "./accesoRuta.js";

const BOTON =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-trazo bg-elev px-3 " +
  "text-center text-[13px] font-medium leading-tight text-hi transition hover:bg-white/10 " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-elev";

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c]);

/** Solo https: una fuente que no lo sea no se vuelve enlace (RF-93, RF-113). */
function urlHttps(url) {
  try {
    const u = new URL(String(url ?? ""));
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const NIVELES = ["divulgacion", "tecnico"];

function htmlDato(d, t) {
  const valor = [d.valor, d.unidad].filter((x) => x !== null && x !== undefined && x !== "").join(" ");
  const href = urlHttps(d.fuente);
  const nombre = esc(d.fuenteNombre ?? d.fuente ?? "");
  const fuente = href
    ? `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="underline decoration-trazo underline-offset-2 hover:text-hi">${nombre}</a>`
    : nombre;
  const meta = [
    d.fechaDato ? `${esc(t("ruta.fechaDato"))}: ${esc(d.fechaDato)}` : "",
    d.fechaNorma ? esc(t("ruta.normaDel", { fecha: d.fechaNorma })) : "",
    d.confianza ? `${esc(t("ruta.confianza"))}: ${esc(d.confianza)}` : "",
    d.ultimaVerificacion ? `${esc(t("ruta.verificado"))}: ${esc(d.ultimaVerificacion)}` : "",
  ].filter(Boolean);
  const aviso = d.aproximado ? ` <span class="text-lo">(${esc(t("ruta.aproximado"))})</span>` : "";
  return `
    <li class="border-t border-trazo py-2 first:border-t-0">
      <p class="text-hi">${esc(d.etiqueta ?? "")}: <strong class="font-semibold">${d.aproximado ? "≈ " : ""}${esc(valor)}</strong>${aviso}</p>
      ${d.nota ? `<p class="text-lo">${esc(d.nota)}</p>` : ""}
      <p class="text-lo">${esc(t("ruta.fuente"))}: ${fuente}</p>
      <p class="font-mono text-[11px] text-lo">${meta.join(" · ")}</p>
    </li>`;
}

/**
 * @param {{titulo:string, n:number, total:number, nivel:string, texto:string, datos:Array<Object>,
 *          referencia:"ubicacion"|"esquematico"|null, terminado:boolean, primera:boolean, plegado:boolean}} vm
 * @param {{t:(clave:string, params?:Object)=>string}} util
 * @returns {string} HTML del contenido del panel (sin la region de anuncio)
 */
export function htmlPanel(vm, util) {
  const { t } = util;
  const rotulo =
    vm.referencia === "esquematico" ? t("ruta.esquematico") : vm.referencia === "ubicacion" ? t("ruta.ubicacionReferencia") : "";
  const niveles = NIVELES.map(
    (n) => `<button type="button" data-nivel="${n}" aria-pressed="${vm.nivel === n}"
        class="${BOTON} flex-1 aria-pressed:border-hi aria-pressed:bg-white/10">${esc(t(`ruta.nivel.${n}`))}</button>`
  ).join("");
  // Selector de nivel en la fila de cabecera: debajo del titulo en ancho normal y en la misma fila
  // con alto < 500 px (style.css, .ruta-niveles). Plegado no se pinta.
  const grupoNiveles = vm.plegado
    ? ""
    : `<div role="group" aria-label="${esc(t("ruta.nivel.divulgacion"))} / ${esc(t("ruta.nivel.tecnico"))}" class="ruta-niveles flex gap-2">${niveles}</div>`;
  const fuentes = vm.datos.length
    ? `<details class="rounded-lg border border-trazo px-3 text-xs">
        <summary class="flex min-h-11 cursor-pointer items-center font-medium text-hi">${esc(t("ruta.fuentes"))}</summary>
        <ul class="pb-2">${vm.datos.map((d) => htmlDato(d, t)).join("")}</ul>
      </details>`
    : "";
  const etiquetaRotulo = rotulo
    ? `<p class="ruta-rotulo w-fit rounded border border-trazo px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-lo">${esc(rotulo)}</p>`
    : "";
  const cuerpo = vm.plegado
    ? ""
    : `<div class="ruta-cuerpo flex min-h-0 flex-col gap-2 overflow-y-auto">
        ${etiquetaRotulo}
        <p class="ruta-texto text-sm leading-relaxed text-hi">${esc(vm.texto)}</p>
        ${fuentes}
      </div>`;
  return `
    <div class="ruta-cabecera flex flex-wrap items-start gap-2">
      <div class="ruta-titulo min-w-0 flex-1">
        <h2 class="truncate text-sm font-semibold text-hi">${esc(vm.titulo)}</h2>
        <p class="font-mono text-[11px] text-lo">${esc(t("ruta.escenaDe", { n: vm.n, total: vm.total }))}</p>
      </div>
      ${grupoNiveles}
      <button type="button" data-accion="plegar" aria-expanded="${!vm.plegado}"
        class="${BOTON}">${esc(vm.plegado ? t("ruta.desplegar") : t("ruta.plegar"))}</button>
    </div>
    ${cuerpo}
    <div class="ruta-nav flex flex-wrap gap-2">
      <button type="button" data-accion="anterior" class="${BOTON} min-w-fit flex-1 basis-20 gap-1"${vm.primera ? " disabled" : ""}><span aria-hidden="true">‹</span>${esc(t("ruta.anterior"))}</button>
      <button type="button" data-accion="siguiente" class="${BOTON} min-w-fit flex-1 basis-20 gap-1">${esc(vm.terminado ? t("ruta.terminar") : t("ruta.siguiente"))}<span aria-hidden="true">${vm.terminado ? "✓" : "›"}</span></button>
      <button type="button" data-accion="salir" class="${BOTON} min-w-fit flex-1 basis-32 gap-1"><span aria-hidden="true">✕</span>${esc(t("ruta.salir"))}</button>
    </div>`;
}

// --- DOM ---------------------------------------------------------------------

const estado = { raiz: null, contenido: null, anuncio: null, vm: null, opciones: null, plegado: false, ultimaEscena: null };

function selectorDe(el) {
  if (el.dataset.accion) return `[data-accion="${el.dataset.accion}"]`;
  if (el.dataset.nivel) return `[data-nivel="${el.dataset.nivel}"]`;
  return null;
}

/** Repinta el contenido conservando el foco en el mismo control (no lo mueve). */
function pintar() {
  if (!estado.contenido || !estado.vm) return;
  const activo = document.activeElement;
  const clave = activo instanceof HTMLElement && estado.contenido.contains(activo) ? selectorDe(activo) : null;
  estado.contenido.innerHTML = htmlPanel({ ...estado.vm, plegado: estado.plegado }, { t: estado.opciones.t });
  if (!clave) return;
  const destino = estado.contenido.querySelector(`${clave}:not([disabled])`) ?? estado.contenido.querySelector('[data-accion="siguiente"]');
  destino?.focus({ preventScroll: true });
}

function anunciar() {
  const { vm, opciones } = estado;
  const clave = `${vm.n}|${vm.titulo}`;
  if (clave === estado.ultimaEscena) return; // cambio de nivel o de idioma no es cambio de escena
  estado.ultimaEscena = clave;
  if (estado.anuncio) estado.anuncio.textContent = opciones.t("ruta.anuncioEscena", { n: vm.n, total: vm.total, titulo: vm.titulo });
}

function alClic(e) {
  const boton = e.target instanceof Element ? e.target.closest("button") : null;
  if (!boton || boton.disabled) return;
  const { alAnterior, alSiguiente, alNivel, alSalir } = estado.opciones;
  if (boton.dataset.nivel) return alNivel?.(boton.dataset.nivel);
  switch (boton.dataset.accion) {
    case "anterior":
      return alAnterior?.();
    case "siguiente":
      return alSiguiente?.();
    case "salir":
      return alSalir?.();
    case "plegar":
      estado.plegado = !estado.plegado;
      return pintar();
  }
}

function crearRaiz() {
  const raiz = document.createElement("section");
  raiz.id = "panel-recorrido";
  raiz.className =
    "ruta-panel pointer-events-auto flex flex-col gap-2 rounded-xl border border-trazo bg-shell/95 p-3 shadow-lg shadow-black/30 backdrop-blur";
  raiz.setAttribute("aria-label", estado.vm.titulo);
  const contenido = document.createElement("div");
  contenido.className = "flex min-h-0 flex-col gap-2";
  const anuncio = document.createElement("div");
  anuncio.className = "sr-only";
  anuncio.setAttribute("role", "status");
  anuncio.setAttribute("aria-live", "polite");
  raiz.append(contenido, anuncio);
  raiz.addEventListener("click", alClic);
  Object.assign(estado, { raiz, contenido, anuncio });
}

/** (Re)coloca el panel en la ranura: montarUI la recrea al cambiar de idioma. */
function adjuntar() {
  const ranura = document.getElementById("ranura-ruta-panel");
  if (!ranura || !estado.raiz) return;
  if (estado.raiz.parentElement !== ranura) ranura.replaceChildren(estado.raiz);
  pintar();
}

/** Monta el panel en #ranura-ruta-panel. `t` viene del llamador (el controlador). */
export function montarPanelRecorrido({ vm, alAnterior, alSiguiente, alNivel, alSalir, t }) {
  estado.vm = vm;
  estado.opciones = { alAnterior, alSiguiente, alNivel, alSalir, t };
  estado.plegado = Boolean(vm.plegado);
  estado.ultimaEscena = null;
  crearRaiz();
  fijarRepintadoPanel(adjuntar);
  adjuntar();
  anunciar();
}

export function actualizarPanelRecorrido(vm) {
  if (!estado.raiz) return;
  estado.vm = vm;
  estado.raiz.setAttribute("aria-label", vm.titulo);
  pintar();
  anunciar();
}

export function desmontarPanelRecorrido() {
  fijarRepintadoPanel(null);
  estado.raiz?.remove();
  Object.assign(estado, { raiz: null, contenido: null, anuncio: null, vm: null, opciones: null, ultimaEscena: null });
}
