/**
 * ui.js — DOM e interfaz. No importa "cesium" ni hace fetch.
 *
 * Habla con el mapa solo a traves de las funciones que map.js exporta.
 */

import { t, idioma, cambiarIdioma } from "./i18n/index.js";
import { volarAFaja } from "./map.js";
import { COLOR_ESTADO } from "./config.js";

/** Ultima coleccion recibida, para poder redibujar al cambiar de idioma. */
let campos = { type: "FeatureCollection", features: [] };
let tablaVisible = false;

/** Escapa texto antes de meterlo en innerHTML. */
function esc(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/**
 * Monta la barra superior. Fase 0-1.
 */
export function montarUI() {
  const raiz = document.getElementById("ui-root");
  if (!raiz) return;

  raiz.innerHTML = `
    <header class="pointer-events-none fixed inset-x-0 top-0 z-20 p-3 sm:p-4">
      <div class="pointer-events-auto mx-auto flex max-w-5xl items-center gap-2
                  rounded-xl bg-slate-900/80 px-4 py-2.5 backdrop-blur
                  ring-1 ring-white/10 sm:gap-3">
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-sm font-semibold text-white sm:text-base">
            ${esc(t("app.titulo"))}
          </h1>
          <p class="truncate text-xs text-slate-400">${esc(t("app.subtitulo"))}</p>
        </div>

        <button id="btn-faja" type="button"
          class="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium
                 text-white transition hover:bg-emerald-500
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-emerald-400
                 sm:text-sm">
          ${esc(t("boton.volarFaja"))}
        </button>

        <button id="btn-tabla" type="button"
          class="shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300
                 transition hover:bg-white/10 hover:text-white
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-slate-400">
          ${esc(t(tablaVisible ? "boton.verMapa" : "boton.verTabla"))}
        </button>

        <button id="btn-idioma" type="button"
          class="shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300
                 transition hover:bg-white/10 hover:text-white
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-slate-400">
          ${esc(t("boton.idioma"))}
        </button>
      </div>
    </header>

    <div id="panel-activo" hidden></div>
    <div id="leyenda"></div>
    <div id="vista-tabla" hidden></div>

    <p class="pointer-events-none fixed bottom-8 left-1/2 z-10 w-full max-w-md
              -translate-x-1/2 px-3 text-center text-[10px] leading-tight
              text-slate-300/70 sm:bottom-9 sm:text-[11px]">
      ${esc(t("atribucion.datos"))}
    </p>
  `;

  document.getElementById("btn-faja")?.addEventListener("click", volarAFaja);
  document.getElementById("btn-tabla")?.addEventListener("click", alternarTabla);
  document.getElementById("btn-idioma")?.addEventListener("click", () => {
    cambiarIdioma(idioma() === "es" ? "en" : "es");
  });

  montarLeyenda();
  if (tablaVisible) montarTabla();
}

// --- Leyenda -----------------------------------------------------------------

function montarLeyenda() {
  const nodo = document.getElementById("leyenda");
  if (!nodo) return;

  const estados = ["activo", "inactivo", "abandonado", "desconocido"];

  nodo.className =
    "pointer-events-none fixed bottom-16 left-3 z-10 rounded-lg " +
    "bg-slate-900/80 px-3 py-2.5 text-xs backdrop-blur ring-1 ring-white/10 " +
    "sm:bottom-20 sm:left-4";

  nodo.innerHTML = `
    <p class="mb-1.5 font-medium text-slate-200">${esc(t("leyenda.titulo"))}</p>
    <ul class="space-y-1">
      ${estados
        .map(
          (e) => `
        <li class="flex items-center gap-2 text-slate-300">
          <span class="inline-block h-2.5 w-2.5 rounded-sm"
                style="background:${COLOR_ESTADO[e]}99;border:1px solid ${COLOR_ESTADO[e]}"></span>
          ${esc(t(`estado.${e}`))}
        </li>`
        )
        .join("")}
    </ul>
    <hr class="my-2 border-white/10">
    <ul class="space-y-1">
      <li class="flex items-center gap-2 text-slate-300">
        <span class="inline-block h-2.5 w-3.5 rounded-sm"
              style="background:#94a3b899;border:1px solid #94a3b8"></span>
        ${esc(t("leyenda.conPoligono"))}
      </li>
      <li class="flex items-center gap-2 text-slate-300">
        <span class="inline-block h-2.5 w-2.5 rounded-full"
              style="background:#94a3b826;border:2px solid #94a3b8"></span>
        ${esc(t("leyenda.soloPunto"))}
      </li>
    </ul>
  `;
}

// --- Panel de detalle --------------------------------------------------------

/**
 * Muestra el panel con las propiedades del activo seleccionado.
 * @param {Object | null} activo
 */
export function mostrarPanelActivo(activo) {
  const nodo = document.getElementById("panel-activo");
  if (!nodo) return;

  if (!activo) {
    nodo.hidden = true;
    nodo.innerHTML = "";
    return;
  }

  const dato = (valor) =>
    valor
      ? `<span class="text-slate-100">${esc(valor)}</span>`
      : `<span class="italic text-slate-500">${esc(t("panel.sinDato"))}</span>`;

  const fila = (clave, valor) => `
    <div class="flex gap-3 py-1.5">
      <dt class="w-32 shrink-0 text-slate-400">${esc(t(clave))}</dt>
      <dd class="min-w-0 flex-1 break-words">${valor}</dd>
    </div>`;

  const color = COLOR_ESTADO[activo.estado] ?? COLOR_ESTADO.desconocido;

  // Aviso honesto sobre la calidad de la ubicacion.
  const aviso = activo.tieneExtension
    ? `<p class="mt-3 rounded-md bg-emerald-950/60 px-2.5 py-1.5 text-xs
                 text-emerald-200 ring-1 ring-emerald-500/30">
         ${esc(t("panel.extensionReal"))}
       </p>`
    : `<p class="mt-3 rounded-md bg-amber-950/60 px-2.5 py-1.5 text-xs
                 text-amber-200 ring-1 ring-amber-500/30">
         ${esc(t("panel.soloPunto"))}
       </p>`;

  nodo.hidden = false;
  nodo.className =
    "fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto " +
    "rounded-t-2xl bg-slate-900/95 p-4 backdrop-blur ring-1 ring-white/10 " +
    "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-96 " +
    "sm:rounded-l-2xl sm:rounded-tr-none";
  nodo.setAttribute("role", "dialog");
  nodo.setAttribute("aria-label", String(activo.nombre ?? ""));

  nodo.innerHTML = `
    <div class="mb-3 flex items-start gap-3">
      <span class="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-sm"
            style="background:${color}99;border:1px solid ${color}"></span>
      <h2 class="min-w-0 flex-1 text-base font-semibold leading-snug text-white">
        ${esc(activo.nombre ?? activo.id ?? "")}
      </h2>
      <button id="btn-cerrar-panel" type="button"
        aria-label="${esc(t("panel.cerrar"))}"
        class="shrink-0 rounded-md px-2 py-1 text-slate-400 transition
               hover:bg-white/10 hover:text-white
               focus-visible:outline focus-visible:outline-2
               focus-visible:outline-offset-2 focus-visible:outline-slate-400">
        &#10005;
      </button>
    </div>

    ${aviso}

    <dl class="mt-3 divide-y divide-white/5 text-sm">
      ${fila("panel.estado", dato(t(`estado.${activo.estado ?? "desconocido"}`)))}
      ${fila("panel.fluido", dato(activo.fluido))}
      ${fila("panel.operadora", dato(activo.operadora))}
      ${fila("panel.propietarios", dato(activo.propietarios))}
      ${fila("panel.cuenca", dato(activo.cuenca))}
      ${fila("panel.bloque", dato(activo.bloque))}
      ${fila("panel.inicioProduccion", dato(activo.inicio_produccion))}
      ${fila("panel.descubrimiento", dato(activo.descubrimiento))}
    </dl>

    <div class="mt-4 rounded-lg bg-slate-950/60 p-3 text-xs ring-1 ring-white/5">
      <dl class="space-y-1.5">
        ${fila("panel.fuente", dato(activo.fuente))}
        ${fila("panel.confianza", dato(t(`confianza.${activo.confianza ?? "baja"}`)))}
        ${fila("panel.ultimaVerificacion", dato(activo.ultima_verificacion))}
      </dl>
    </div>

    ${
      activo.notas
        ? `<a href="${esc(activo.notas)}" target="_blank" rel="noopener noreferrer"
             class="mt-3 inline-block text-xs text-emerald-400 underline
                    hover:text-emerald-300">${esc(t("panel.masInfo"))}</a>`
        : ""
    }
  `;

  document
    .getElementById("btn-cerrar-panel")
    ?.addEventListener("click", () => mostrarPanelActivo(null));
}

// --- Vista de tabla accesible (ADR-006) --------------------------------------

/**
 * Guarda los campos para la tabla. La llama main.js tras cargarlos.
 * @param {{features: Array<Object>}} featureCollection
 */
export function fijarCampos(featureCollection) {
  campos = featureCollection;
  if (tablaVisible) montarTabla();
}

function alternarTabla() {
  tablaVisible = !tablaVisible;
  montarUI();
}

/**
 * Tabla HTML semantica: alternativa al globo 3D para lectores de pantalla y
 * respaldo ligero en redes lentas. Ver docs/DECISIONS.md -> ADR-006.
 */
function montarTabla() {
  const nodo = document.getElementById("vista-tabla");
  if (!nodo) return;

  nodo.hidden = false;
  nodo.className =
    "fixed inset-0 z-20 overflow-y-auto bg-slate-950 px-3 pb-8 pt-24 sm:px-6";

  const filas = campos.features
    .map((f) => {
      const p = f.properties ?? {};
      return `
      <tr class="border-b border-white/5 align-top">
        <th scope="row" class="py-2 pr-3 text-left font-medium text-slate-100">
          ${esc(p.nombre ?? p.id ?? "")}
        </th>
        <td class="py-2 pr-3 text-slate-300">${esc(t(`estado.${p.estado ?? "desconocido"}`))}</td>
        <td class="py-2 pr-3 text-slate-300">${esc(p.fluido ?? "-")}</td>
        <td class="py-2 pr-3 text-slate-300">${esc(p.operadora ?? "-")}</td>
        <td class="py-2 pr-3 text-slate-300">${esc(p.cuenca ?? "-")}</td>
        <td class="py-2 pr-3 text-slate-400">${esc(t(`confianza.${p.confianza ?? "baja"}`))}</td>
        <td class="py-2 text-slate-400">${esc(p.ultima_verificacion ?? "-")}</td>
      </tr>`;
    })
    .join("");

  nodo.innerHTML = `
    <div class="mx-auto max-w-5xl">
      <h2 class="text-lg font-semibold text-white">${esc(t("tabla.titulo"))}</h2>
      <p class="mt-1 text-sm text-slate-400">${esc(t("tabla.descripcion"))}</p>
      <p class="mt-1 text-sm text-slate-500">
        ${campos.features.length} ${esc(t("tabla.total"))}
      </p>

      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[52rem] border-collapse text-sm">
          <caption class="sr-only">${esc(t("tabla.titulo"))}</caption>
          <thead>
            <tr class="border-b border-white/20 text-left text-xs uppercase tracking-wide text-slate-400">
              <th scope="col" class="py-2 pr-3">${esc(t("panel.nombre"))}</th>
              <th scope="col" class="py-2 pr-3">${esc(t("panel.estado"))}</th>
              <th scope="col" class="py-2 pr-3">${esc(t("panel.fluido"))}</th>
              <th scope="col" class="py-2 pr-3">${esc(t("panel.operadora"))}</th>
              <th scope="col" class="py-2 pr-3">${esc(t("panel.cuenca"))}</th>
              <th scope="col" class="py-2 pr-3">${esc(t("panel.confianza"))}</th>
              <th scope="col" class="py-2">${esc(t("panel.ultimaVerificacion"))}</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>

      <p class="mt-6 text-xs text-slate-500">${esc(t("atribucion.datos"))}</p>
    </div>
  `;
}

// --- Errores -----------------------------------------------------------------

/**
 * Muestra un error visible al usuario, no solo en consola.
 * La verificacion del proyecto se hace con DevTools CERRADO: un error que
 * solo vive en la consola es un error invisible.
 *
 * @param {string} mensaje
 */
export function mostrarError(mensaje) {
  const raiz = document.getElementById("ui-root");
  if (!raiz) return;

  const aviso = document.createElement("div");
  aviso.setAttribute("role", "alert");
  aviso.className =
    "fixed inset-x-3 bottom-3 z-50 rounded-lg bg-red-950/95 px-4 py-3 text-sm " +
    "text-red-100 ring-1 ring-red-500/40 backdrop-blur sm:mx-auto sm:max-w-md";
  aviso.textContent = mensaje;
  raiz.appendChild(aviso);
}

// Redibujar la UI cuando cambie el idioma.
window.addEventListener("idioma:cambiado", montarUI);

// --- Pendiente por fase ------------------------------------------------------
// Fase 3: montarFiltrosSector()
// Fase 5: montarBannerDemo()  — permanente mientras la capa este activa
// Fase 6: montarIndicadorFrescura(fecha)
