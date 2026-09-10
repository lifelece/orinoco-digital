/**
 * ui.js — DOM e interfaz. No importa "cesium" ni hace fetch.
 *
 * Habla con el mapa solo a traves de las funciones que map.js exporta.
 */

import { t, idioma, cambiarIdioma } from "./i18n/index.js";
import {
  volarAFaja,
  deseleccionar,
  alternarCapa,
  alternarContexto,
  alternarDemo,
  hayCapaDemo,
} from "./map.js";
import { COLOR_ESTADO, COLOR_FLUIDO, COLOR_TIPO } from "./config.js";

/** Ultima coleccion recibida, para poder redibujar al cambiar de idioma. */
let campos = { type: "FeatureCollection", features: [] };
let tablaVisible = false;

// --- Integracion con el historial del navegador ------------------------------
//
// En movil, el gesto de retroceso es la forma natural de cerrar cualquier cosa
// que se abre encima. Sin esto, el retroceso saca al usuario de la aplicacion
// entera en vez de cerrar el panel, que es justo lo que no espera.

/** @type {"panel" | "tabla" | null} */
let vistaApilada = null;
/** Evita que cerrar desde popstate vuelva a tocar el historial. */
let cerrandoPorHistorial = false;

/** @param {"panel" | "tabla"} vista */
function apilarVista(vista) {
  if (vistaApilada) history.replaceState({ orinoco: vista }, "");
  else history.pushState({ orinoco: vista }, "");
  vistaApilada = vista;
}

/** Cierra la vista apilada usando el historial, para que el gesto sea coherente. */
function desapilarVista() {
  if (vistaApilada && !cerrandoPorHistorial) history.back();
}

window.addEventListener("popstate", () => {
  if (!vistaApilada) return;
  cerrandoPorHistorial = true;
  vistaApilada = null;

  ocultarPanel();
  deseleccionar();
  if (tablaVisible) {
    tablaVisible = false;
    montarUI();
  }

  cerrandoPorHistorial = false;
});

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

    <div class="pointer-events-none fixed bottom-7 left-1/2 z-10 w-full max-w-lg
                -translate-x-1/2 space-y-0.5 px-3 text-center text-[10px]
                leading-tight text-slate-300/70 sm:bottom-9 sm:text-[11px]">
      <p>${esc(t("atribucion.datos"))}</p>
      <p>${esc(t("atribucion.osm"))}</p>
    </div>
  `;

  document.getElementById("btn-faja")?.addEventListener("click", volarAFaja);
  document.getElementById("btn-tabla")?.addEventListener("click", alternarTabla);
  document.getElementById("btn-idioma")?.addEventListener("click", () => {
    cambiarIdioma(idioma() === "es" ? "en" : "es");
  });

  montarLeyenda();
  if (tablaVisible) montarTabla();
}

// --- Filtros por sector y leyenda --------------------------------------------

/** Sectores visibles. Fase 3. */
const sectores = { upstream: true, midstream: true, downstream: true };

/** Capas de contexto geografico visibles. */
const contexto = { limites: true, faja: true };

/** La capa DEMO nace apagada: se enciende a proposito, nunca por defecto. */
let demoActiva = false;

/** Leyenda desplegable: en movil ocupa demasiado si esta siempre abierta. */
let leyendaAbierta = false;

function montarLeyenda() {
  const nodo = document.getElementById("leyenda");
  if (!nodo) return;

  nodo.className =
    "fixed bottom-16 left-3 z-10 max-w-[15rem] rounded-lg bg-slate-900/85 " +
    "text-xs backdrop-blur ring-1 ring-white/10 sm:bottom-20 sm:left-4";

  const interruptor = (sector) => `
    <label class="flex cursor-pointer items-center gap-2 py-1 text-slate-200">
      <input type="checkbox" data-sector="${sector}"
             ${sectores[sector] ? "checked" : ""}
             class="h-3.5 w-3.5 shrink-0 accent-emerald-500">
      <span>${esc(t(`capa.${sector}`))}</span>
    </label>`;

  const item = (color, texto, forma = "rounded-sm") => `
    <li class="flex items-center gap-2 text-slate-300">
      <span class="inline-block h-2.5 w-2.5 shrink-0 ${forma}"
            style="background:${color}99;border:1px solid ${color}"></span>
      <span class="leading-tight">${esc(texto)}</span>
    </li>`;

  const interruptorContexto = (clave) => `
    <label class="flex cursor-pointer items-center gap-2 py-1 text-slate-300">
      <input type="checkbox" data-contexto="${clave}"
             ${contexto[clave] ? "checked" : ""}
             class="h-3.5 w-3.5 shrink-0 accent-slate-400">
      <span>${esc(t(`contexto.${clave}`))}</span>
    </label>`;

  nodo.innerHTML = `
    <div class="px-3 py-2.5">
      ${["upstream", "midstream", "downstream"].map(interruptor).join("")}
      <div class="my-1.5 border-t border-white/10"></div>
      ${["limites", "faja"].map(interruptorContexto).join("")}
      ${
        // El interruptor DEMO solo existe si el grid llego a cargarse. Sin
        // notebook ejecutado no hay capa, y un interruptor que no hace nada
        // solo confunde.
        hayCapaDemo()
          ? `<div class="my-1.5 border-t border-white/10"></div>
             <label class="flex cursor-pointer items-center gap-2 py-1 text-amber-300">
               <input type="checkbox" id="chk-demo" ${demoActiva ? "checked" : ""}
                      class="h-3.5 w-3.5 shrink-0 accent-amber-500">
               <span>${esc(t("capa.demo"))}</span>
             </label>`
          : ""
      }
    </div>

    <button id="btn-leyenda" type="button"
      aria-expanded="${leyendaAbierta}"
      class="flex w-full items-center justify-between gap-2 border-t
             border-white/10 px-3 py-2 text-left font-medium text-slate-200
             transition hover:bg-white/5">
      <span>${esc(t("leyenda.titulo"))}</span>
      <span aria-hidden="true">${leyendaAbierta ? "&#9662;" : "&#9656;"}</span>
    </button>

    ${
      leyendaAbierta
        ? `<div class="max-h-[40vh] overflow-y-auto border-t border-white/10 px-3 py-2">
             <p class="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
               ${esc(t("capa.upstream"))}
             </p>
             <ul class="space-y-1">
               ${["activo", "inactivo", "abandonado", "desconocido"]
                 .map((e) => item(COLOR_ESTADO[e], t(`estado.${e}`)))
                 .join("")}
               ${item("#94a3b8", t("leyenda.soloPunto"), "rounded-full")}
             </ul>

             <p class="mb-1 mt-2.5 text-[11px] uppercase tracking-wide text-slate-500">
               ${esc(t("capa.midstream"))}
             </p>
             <ul class="space-y-1">
               ${["oil", "gas", "hydrocarbons"]
                 .map((f) => item(COLOR_FLUIDO[f], t(`fluido.${f}`)))
                 .join("")}
               ${item(COLOR_TIPO.terminal, t("tipo.terminal"), "rounded-full")}
             </ul>

             <p class="mb-1 mt-2.5 text-[11px] uppercase tracking-wide text-slate-500">
               ${esc(t("capa.downstream"))}
             </p>
             <ul class="space-y-1">
               ${["refineria", "petroquimica", "planta_gas", "puerto", "instalacion"]
                 .map((k) => item(COLOR_TIPO[k], t(`tipo.${k}`), "rounded-full"))
                 .join("")}
             </ul>
           </div>`
        : ""
    }
  `;

  nodo.querySelectorAll("input[data-sector]").forEach((entrada) => {
    entrada.addEventListener("change", (ev) => {
      const sector = ev.target.dataset.sector;
      sectores[sector] = ev.target.checked;
      alternarCapa(sector, ev.target.checked);
    });
  });

  nodo.querySelectorAll("input[data-contexto]").forEach((entrada) => {
    entrada.addEventListener("change", (ev) => {
      const clave = ev.target.dataset.contexto;
      contexto[clave] = ev.target.checked;
      alternarContexto(clave, ev.target.checked);
    });
  });

  document.getElementById("chk-demo")?.addEventListener("change", (ev) => {
    demoActiva = ev.target.checked;
    alternarDemo(demoActiva);
  });

  document.getElementById("btn-leyenda")?.addEventListener("click", () => {
    leyendaAbierta = !leyendaAbierta;
    montarLeyenda();
  });
}

// --- Panel de detalle --------------------------------------------------------

/** Oculta el panel sin tocar el historial. Para cambios internos de vista. */
function ocultarPanel() {
  const nodo = document.getElementById("panel-activo");
  if (!nodo) return;
  nodo.hidden = true;
  nodo.innerHTML = "";
}

/**
 * Muestra el panel con las propiedades del activo seleccionado.
 * @param {Object | null} activo
 */
export function mostrarPanelActivo(activo) {
  const nodo = document.getElementById("panel-activo");
  if (!nodo) return;

  if (!activo) {
    ocultarPanel();
    desapilarVista();
    return;
  }

  apilarVista("panel");

  const dato = (valor) =>
    `<span class="text-slate-100">${esc(valor)}</span>`;

  const fila = (clave, valor) => `
    <div class="flex gap-3 py-1.5">
      <dt class="w-32 shrink-0 text-slate-400">${esc(t(clave))}</dt>
      <dd class="min-w-0 flex-1 break-words">${valor}</dd>
    </div>`;

  /**
   * Fila que solo aparece si hay dato.
   *
   * Los datos de GEM son desiguales: la operadora esta en el 63% de los campos,
   * la cuenca en el 42% y el bloque en el 9%. Una retahila de "sin dato" hace
   * que el panel parezca vacio y esconde lo que si sabemos. Lo que falta se
   * resume abajo, contado, en vez de ocupar una linea cada uno.
   */
  const filaSiHay = (clave, valor) => (valor ? fila(clave, dato(valor)) : "");

  const color = COLOR_ESTADO[activo.estado] ?? COLOR_ESTADO.desconocido;

  // Aviso honesto sobre la naturaleza del dato.
  // El caso mas delicado es el parque de tanques: no existe como entidad en
  // ninguna fuente, lo hemos agrupado nosotros. Decirlo es obligatorio.
  const aviso = activo.derivado
    ? `<p class="mt-3 rounded-md bg-amber-950/60 px-2.5 py-1.5 text-xs
                 text-amber-200 ring-1 ring-amber-500/30">
         ${esc(t("panel.derivado"))}
       </p>`
    : activo.tipo === "campo"
      ? activo.tieneExtension
        ? `<p class="mt-3 rounded-md bg-emerald-950/60 px-2.5 py-1.5 text-xs
                     text-emerald-200 ring-1 ring-emerald-500/30">
             ${esc(t("panel.extensionReal"))}
           </p>`
        : `<p class="mt-3 rounded-md bg-amber-950/60 px-2.5 py-1.5 text-xs
                     text-amber-200 ring-1 ring-amber-500/30">
             ${esc(t("panel.soloPunto"))}
           </p>`
      : "";

  // Cuenta lo que la fuente no trae, para decirlo una vez en vez de repetirlo.
  const ausentes = [
    ["panel.operadora", activo.operadora],
    ["panel.propietarios", activo.propietarios],
    ["panel.cuenca", activo.cuenca],
    ["panel.bloque", activo.bloque],
    ["panel.inicioProduccion", activo.inicio_produccion],
    ["panel.descubrimiento", activo.descubrimiento],
  ]
    .filter(([, v]) => !v)
    .map(([clave]) => t(clave));

  nodo.hidden = false;
  // Altura contenida en movil: el panel no puede comerse el mapa, o se vuelve
  // imposible tocar otro campo sin cerrarlo antes.
  nodo.className =
    "fixed inset-x-0 bottom-0 z-30 max-h-[48vh] overflow-y-auto " +
    "rounded-t-2xl bg-slate-900/95 px-4 pb-4 pt-2 backdrop-blur " +
    "ring-1 ring-white/10 sm:inset-y-0 sm:left-auto sm:right-0 " +
    "sm:max-h-none sm:w-96 sm:rounded-l-2xl sm:rounded-tr-none sm:pt-4";
  nodo.setAttribute("role", "dialog");
  nodo.setAttribute("aria-label", String(activo.nombre ?? ""));

  nodo.innerHTML = `
    <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 sm:hidden"></div>

    <div class="mb-3 flex items-start gap-2">
      <span class="mt-1.5 inline-block h-3 w-3 shrink-0 rounded-sm"
            style="background:${color}99;border:1px solid ${color}"></span>
      <h2 class="min-w-0 flex-1 text-base font-semibold leading-snug text-white">
        ${esc(activo.nombre ?? activo.id ?? "")}
      </h2>
      <button id="btn-cerrar-panel" type="button"
        aria-label="${esc(t("panel.cerrar"))}"
        class="-mr-1 shrink-0 rounded-lg px-3 py-2 text-lg leading-none
               text-slate-300 transition hover:bg-white/10 hover:text-white
               focus-visible:outline focus-visible:outline-2
               focus-visible:outline-offset-2 focus-visible:outline-slate-400">
        &#10005;
      </button>
    </div>

    ${aviso}

    <dl class="mt-3 divide-y divide-white/5 text-sm">
      ${fila("panel.tipo", dato(t(`tipo.${activo.tipo ?? "instalacion"}`)))}
      ${
        activo.estado && activo.estado !== "desconocido"
          ? fila("panel.estado", dato(t(`estado.${activo.estado}`)))
          : ""
      }
      ${filaSiHay("panel.fluido", activo.fluido)}
      ${filaSiHay("panel.nTanques", activo.n_tanques)}
      ${filaSiHay("panel.diametro", activo.diametro)}
      ${filaSiHay("panel.operadora", activo.operadora)}
      ${filaSiHay("panel.propietarios", activo.propietarios)}
      ${filaSiHay("panel.cuenca", activo.cuenca)}
      ${filaSiHay("panel.bloque", activo.bloque)}
      ${filaSiHay("panel.inicioProduccion", activo.inicio_produccion)}
      ${filaSiHay("panel.descubrimiento", activo.descubrimiento)}
    </dl>

    ${
      ausentes.length
        ? `<p class="mt-2 text-xs leading-relaxed text-slate-500">
             ${esc(t("panel.noPublicado"))}: ${esc(ausentes.join(", "))}.
           </p>`
        : ""
    }

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

  // Cerrar deselecciona tambien en el mapa: si la entidad sigue seleccionada,
  // volver a tocarla no dispara ningun evento y parece que se ha bloqueado.
  document.getElementById("btn-cerrar-panel")?.addEventListener("click", () => {
    deseleccionar();
    mostrarPanelActivo(null);
  });
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
  if (tablaVisible) {
    // Cerrar por el historial, para que coincida con el gesto de retroceso.
    desapilarVista();
    tablaVisible = false;
    montarUI();
    return;
  }
  // Abrir la tabla cierra el panel: una sola cosa encima del mapa a la vez.
  // Se cierra en silencio y apilarVista() reutiliza la entrada del historial
  // con replaceState, para no acumular pasos de retroceso.
  deseleccionar();
  ocultarPanel();
  tablaVisible = true;
  apilarVista("tabla");
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

// --- Banner de la capa DEMO (Fase 5) -----------------------------------------

/**
 * Banner permanente de la capa demostrativa.
 *
 * No se puede cerrar: la unica forma de quitarlo es apagar la capa. Es
 * deliberado. Un aviso que el usuario descarta y luego olvida convierte un
 * modelo sintetico en algo que parece un dato real, que es exactamente el
 * fallo que este proyecto no se puede permitir. Ver MODEL_CARD.md.
 */
export function montarBannerDemo() {
  let nodo = document.getElementById("banner-demo");
  if (!nodo) {
    nodo = document.createElement("div");
    nodo.id = "banner-demo";
    document.getElementById("ui-root")?.appendChild(nodo);
  }

  nodo.setAttribute("role", "alert");
  nodo.className =
    "pointer-events-auto fixed inset-x-0 top-[4.5rem] z-40 mx-auto max-w-3xl " +
    "rounded-lg bg-amber-500 px-3 py-2 text-center text-xs font-semibold " +
    "text-amber-950 shadow-lg ring-2 ring-amber-300 sm:top-24 sm:text-sm";

  nodo.innerHTML = `
    <span>${esc(t("demo.banner"))}</span>
    <a href="https://github.com/lifelece/orinoco-digital/blob/main/MODEL_CARD.md"
       target="_blank" rel="noopener noreferrer"
       class="ml-1 whitespace-nowrap underline hover:text-amber-800">
      ${esc(t("demo.masInfo"))}
    </a>
  `;
}

/** Quita el banner. Solo la llama map.js al apagar la capa. */
export function quitarBannerDemo() {
  document.getElementById("banner-demo")?.remove();
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
