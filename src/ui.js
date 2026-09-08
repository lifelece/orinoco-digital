/**
 * ui.js — DOM e interfaz. No importa "cesium" ni hace fetch.
 *
 * Habla con el mapa solo a traves de las funciones que map.js exporta.
 */

import { t, idioma, cambiarIdioma } from "./i18n/index.js";
import { volarAFaja } from "./map.js";

/**
 * Monta la barra superior. Fase 0-1.
 */
export function montarUI() {
  const raiz = document.getElementById("ui-root");
  if (!raiz) return;

  raiz.innerHTML = `
    <header class="pointer-events-none fixed inset-x-0 top-0 z-10 p-3 sm:p-4">
      <div class="pointer-events-auto mx-auto flex max-w-5xl items-center gap-3
                  rounded-xl bg-slate-900/80 px-4 py-2.5 backdrop-blur
                  ring-1 ring-white/10">
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-sm font-semibold text-white sm:text-base">
            ${t("app.titulo")}
          </h1>
          <p class="truncate text-xs text-slate-400">${t("app.subtitulo")}</p>
        </div>

        <button id="btn-faja" type="button"
          class="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium
                 text-white transition hover:bg-emerald-500
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-emerald-400
                 sm:text-sm">
          ${t("boton.volarFaja")}
        </button>

        <button id="btn-idioma" type="button"
          class="shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-300
                 transition hover:bg-white/10 hover:text-white
                 focus-visible:outline focus-visible:outline-2
                 focus-visible:outline-offset-2 focus-visible:outline-slate-400">
          ${t("boton.idioma")}
        </button>
      </div>
    </header>
  `;

  document.getElementById("btn-faja")?.addEventListener("click", volarAFaja);

  document.getElementById("btn-idioma")?.addEventListener("click", () => {
    cambiarIdioma(idioma() === "es" ? "en" : "es");
  });

  // Redibujar la UI cuando cambie el idioma.
  window.addEventListener("idioma:cambiado", montarUI);
}

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

// --- Pendiente por fase ------------------------------------------------------
// Fase 2: mostrarPanelActivo(activo)  — panel lateral con propiedades + fuente
// Fase 3: montarFiltrosSector(), montarLeyenda()
// Fase 5: montarBannerDemo()          — permanente mientras la capa este activa
// Fase 6: montarIndicadorFrescura(fecha)
