/**
 * ui.js — DOM e interfaz. No importa "cesium" ni hace fetch.
 *
 * Habla con el mapa solo a traves de las funciones que map.js exporta.
 *
 * Estructura del shell (Notion "Mejora v2", M1 — ver docs/DECISIONS.md, ADR-014):
 * - Columna superior: cabecera con buscador, banner DEMO y control de capas.
 *   En movil, el control de capas es una hoja inferior.
 * - Ficha del activo: panel lateral en escritorio, hoja inferior en movil.
 * - Pie: atribucion corta, frescura de los datos y dialogo de fuentes.
 * - Avisos y pantalla de carga viven FUERA de #ui-root. Redibujar la interfaz
 *   no puede borrarlos: antes pasaba, y el aviso de una capa rota desaparecia
 *   en el mismo instante en que se mostraba.
 */

import { t, idioma, cambiarIdioma } from "./i18n/index.js";
import {
  volarAFaja,
  volarAActivo,
  deseleccionar,
  alternarCapa,
  alternarContexto,
  alternarDemo,
  hayCapaDemo,
} from "./map.js";
import {
  COLOR_HIDROCARBURO,
  COLOR_FLUIDO,
  COLOR_TIPO,
  COLOR_AGUA,
  COLOR_CENTRAL,
  COLOR_LIMITE,
  COLOR_TOPONIMIA,
  UMBRAL_FRESCURA_DIAS,
  ESPERA_MAXIMA_CARGA,
  FUENTES,
  REPO,
  FECHA_DATOS,
} from "./config.js";
import { hidrocarburoDe } from "./data.js";

// --- Utilidades --------------------------------------------------------------

/** Escapa texto antes de meterlo en innerHTML. */
function esc(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

/**
 * Devuelve la URL solo si es http o https.
 *
 * `notas` llega de fuentes externas y termina en un href. Escapar el HTML no
 * basta: un `javascript:` bien escapado sigue ejecutandose al tocar el enlace.
 *
 * @param {unknown} url
 * @returns {string | null}
 */
function enlaceSeguro(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

/** Texto comparable, sin tildes ni mayusculas: "carupano" encuentra "Carúpano". */
function normalizar(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Dias transcurridos desde una fecha ISO (AAAA-MM-DD).
 * @param {string | null | undefined} fechaIso
 * @returns {number | null} null si no es una fecha
 */
function diasDesde(fechaIso) {
  const inicio = Date.parse(`${fechaIso}T00:00:00Z`);
  if (!Number.isFinite(inicio)) return null;
  return Math.max(0, Math.floor((Date.now() - inicio) / 86400000));
}

/** "hoy", "ayer" o "hace N dias", en el idioma activo. */
function textoAntiguedad(dias) {
  if (dias === null) return "";
  if (dias === 0) return t("tiempo.hoy");
  if (dias === 1) return t("tiempo.ayer");
  return t("tiempo.haceDias").replace("{n}", String(dias));
}

/** Numero con los separadores del idioma activo. */
function numero(valor, opciones = {}) {
  return new Intl.NumberFormat(idioma() === "en" ? "en" : "es", {
    useGrouping: "always",
    ...opciones,
  }).format(valor);
}

/** Iconos de trazo. SVG en linea: cero peticiones y heredan el color del texto. */
const svg = (trazo, tamano = 18) =>
  `<svg viewBox="0 0 24 24" width="${tamano}" height="${tamano}" fill="none" ` +
  `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ` +
  `stroke-linejoin="round" aria-hidden="true" focusable="false">${trazo}</svg>`;

const ICONO = {
  buscar: svg('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', 16),
  capas: svg('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 13 9 5 9-5"/>'),
  faja: svg(
    '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/>' +
      '<path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'
  ),
  tabla: svg(
    '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/>' +
      '<path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10"/>'
  ),
  mapa: svg(
    '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4z"/><path d="M9 4v14M15 6v14"/>'
  ),
  cerrar: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  plegar: svg('<path d="m15 6-6 6 6 6"/>'),
  flecha: svg('<path d="m9 6 6 6-6 6"/>', 14),
  externo: svg('<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>', 13),
};

// --- Color y vocabulario de cada activo --------------------------------------

/**
 * Color con el que el mapa esta pintando este activo.
 *
 * El punto de color del panel tiene que coincidir con lo que el usuario acaba
 * de tocar. Cada capa colorea con un criterio distinto —los campos por
 * hidrocarburo, los ductos por fluido, las centrales por tecnologia, las
 * instalaciones por tipo— asi que se replica esa misma logica.
 *
 * @param {Object} activo
 * @returns {string} color CSS
 */
function colorDeActivo(activo) {
  if (activo.tipo === "campo" || activo.tipo === "pozo") {
    const clave = activo.hidrocarburo ?? hidrocarburoDe(activo.fluido);
    return COLOR_HIDROCARBURO[clave] ?? COLOR_HIDROCARBURO.desconocido;
  }
  if (activo.tipo === "ducto") {
    return COLOR_FLUIDO[activo.fluido] ?? COLOR_FLUIDO.desconocido;
  }
  if (activo.tipo === "central") {
    return COLOR_CENTRAL[activo.clase] ?? COLOR_CENTRAL.otro;
  }
  // El mismo ambar del banner DEMO (amber-500): la celda se reconoce como
  // parte del modelo antes de leer nada.
  if (activo.tipo === "demo") return "#f59e0b";
  return COLOR_TIPO[activo.tipo] ?? COLOR_TIPO.instalacion;
}

/** Fluidos de ducto que el proyecto sabe nombrar en los dos idiomas. */
const FLUIDOS_CONOCIDOS = ["oil", "gas", "hydrocarbons", "fuel"];

/**
 * Etiqueta traducida de lo que un activo produce o transporta.
 *
 * El valor crudo de la fuente viene en ingles ("oil and gas") y no puede salir
 * a pantalla tal cual: regla 9 del proyecto, todo texto visible pasa por t().
 * Y solo se etiqueta lo que se sabe traducir: escupir la clave sin traducir es
 * peor que no mostrar la fila.
 *
 * @param {Object} activo
 * @returns {string | null}
 */
function etiquetaFluido(activo) {
  if (!activo.fluido) return null;

  if (activo.tipo === "campo" || activo.tipo === "pozo") {
    const clave = activo.hidrocarburo ?? hidrocarburoDe(activo.fluido);
    return clave === "desconocido" ? null : t(`hidrocarburo.${clave}`);
  }

  if (activo.tipo === "ducto" && FLUIDOS_CONOCIDOS.includes(activo.fluido)) {
    return t(`fluido.${activo.fluido}`);
  }

  // Para el resto, `fluido` es el tag `product` de OSM en crudo y no describe
  // un fluido: no se muestra.
  return null;
}

// --- Estado de la interfaz ---------------------------------------------------

/** Por encima de este ancho la interfaz es de escritorio. Es el `sm:` de Tailwind. */
const pantallaAncha = window.matchMedia("(min-width: 640px)");
const esPequena = () => !pantallaAncha.matches;

/** Sectores visibles. */
const sectores = { upstream: true, midstream: true, downstream: true };

/**
 * Capas de contexto visibles.
 *
 * Las centrales nacen apagadas: no son cadena de hidrocarburos (ADR-013) y el
 * mapa ya carga con dos centenares de simbolos. Coincide con map.js, que las
 * dibuja ocultas.
 */
const contexto = {
  toponimia: true,
  hidrografia: true,
  limites: true,
  disputa: true,
  faja: true,
  centrales: false,
};

const SECTORES = ["upstream", "midstream", "downstream"];
/** Orden en el control de capas: del fondo del mapa hacia arriba. */
const CAPAS_CONTEXTO = ["toponimia", "hidrografia", "limites", "disputa", "faja", "centrales"];

/** Capas de datos de las que depende cada interruptor. */
const CAPAS_DE_INTERRUPTOR = {
  upstream: ["campos"],
  // Los parques de tanques son midstream pero viajan en la capa downstream.
  midstream: ["ductos", "downstream"],
  downstream: ["downstream"],
  toponimia: ["toponimia"],
  hidrografia: ["hidrografia"],
  limites: ["limites"],
  disputa: ["disputa"],
  faja: [],
  centrales: ["centrales"],
};

/** Nombre visible de cada capa de datos, para los avisos de error. */
const ETIQUETA_CAPA = {
  campos: "capa.upstream",
  ductos: "capa.midstream",
  downstream: "capa.downstream",
  limites: "contexto.limites",
  disputa: "contexto.disputa",
  hidrografia: "contexto.hidrografia",
  toponimia: "contexto.toponimia",
  centrales: "contexto.centrales",
};

/** Clase de acento del interruptor: el color de su sector. */
const ACENTO = {
  upstream: "accent-crudo",
  midstream: "accent-gas",
  downstream: "accent-refino",
};

/** @type {Map<string, "cargando" | "lista" | "error">} */
const estadoCapas = new Map();
/** @type {Map<string, {features: Array<Object>}>} */
const datosCapas = new Map();

/** La capa DEMO nace apagada: se enciende a proposito, nunca por defecto. */
let demoActiva = false;
let bannerDemoVisible = false;
let leyendaAbierta = false;
/** En escritorio el control de capas empieza abierto; en movil ocuparia medio mapa. */
let capasAbiertas = pantallaAncha.matches;
let tablaVisible = false;
let panelAbierto = false;
let fuentesAbiertas = false;
/** Ultimo activo mostrado, para repintar la ficha al cambiar de idioma. */
let activoActual = null;
/** Elemento que tenia el foco al abrir el dialogo, para devolverselo. */
let origenFoco = null;

// --- Integracion con el historial del navegador ------------------------------
//
// En movil, el gesto de retroceso es la forma natural de cerrar cualquier cosa
// que se abre encima. Sin esto, el retroceso saca al usuario de la aplicacion
// entera en vez de cerrar el panel, que es justo lo que no espera.

/** @type {"panel" | "tabla" | "capas" | "fuentes" | null} */
let vistaApilada = null;
/** Mientras es true, cerrar una vista no toca el historial: se esta cambiando de una a otra. */
let historialSuspendido = false;
/** El proximo popstate lo provoca nuestro propio history.back(). */
let retrocesoPropio = false;

/**
 * Da a la vista abierta una entrada de historial. Si ya habia otra vista
 * encima, reutiliza su entrada: cambiar de la tabla a una ficha no puede
 * costar dos gestos de retroceso.
 * @param {"panel" | "tabla" | "capas" | "fuentes"} vista
 */
function apilarVista(vista) {
  if (vistaApilada) history.replaceState({ orinoco: vista }, "");
  else history.pushState({ orinoco: vista }, "");
  vistaApilada = vista;
}

/**
 * Retira la entrada de historial de una vista que se acaba de cerrar.
 *
 * `vistaApilada` se anula ANTES de retroceder. Antes se anulaba en el
 * popstate, que llega despues: cerrar la ficha con la X pasaba por aqui dos
 * veces seguidas —una al deseleccionar la entidad y otra por el propio
 * boton—, las dos veian la vista aun apilada y retrocedian dos pasos. El
 * segundo sacaba al usuario del sitio. Reproducido en navegador el 2026-09-14.
 *
 * @param {"panel" | "tabla" | "capas" | "fuentes"} vista
 */
function desapilarVista(vista) {
  if (historialSuspendido || vistaApilada !== vista) return;
  vistaApilada = null;
  retrocesoPropio = true;
  history.back();
}

/** Ejecuta cambios de vista sin tocar el historial. */
function sinHistorial(accion) {
  const previo = historialSuspendido;
  historialSuspendido = true;
  try {
    accion();
  } finally {
    historialSuspendido = previo;
  }
}

/** Cierra todo lo que se superpone al mapa. */
function cerrarVistas() {
  cerrarPanel();
  cerrarTabla();
  cerrarFuentes();
  if (esPequena()) cerrarHojaCapas();
}

window.addEventListener("popstate", () => {
  if (retrocesoPropio) {
    retrocesoPropio = false;
    return;
  }
  if (!vistaApilada) return;
  vistaApilada = null;
  sinHistorial(cerrarVistas);
});

// --- Shell -------------------------------------------------------------------

const CLASE_CAPAS =
  "pointer-events-auto overflow-y-auto overscroll-contain bg-shell/95 backdrop-blur " +
  "[scrollbar-width:thin] [scrollbar-color:var(--color-trazo)_transparent] " +
  "max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:max-h-[75vh] " +
  "max-sm:rounded-t-2xl max-sm:border-t max-sm:border-trazo max-sm:shadow-2xl " +
  "max-sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-sm:animate-subir " +
  "sm:max-h-full sm:w-64 sm:rounded-xl sm:border sm:border-trazo sm:shadow-lg " +
  "sm:shadow-black/30 lg:w-72";

const CLASE_PANEL =
  "fixed inset-x-0 bottom-0 z-30 max-h-[45vh] overflow-y-auto overscroll-contain " +
  "rounded-t-2xl border-t border-trazo bg-shell/95 px-4 pt-2 shadow-2xl backdrop-blur " +
  "[scrollbar-width:thin] [scrollbar-color:var(--color-trazo)_transparent] " +
  "pb-[max(1rem,env(safe-area-inset-bottom))] animate-subir " +
  "sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-80 " +
  "sm:rounded-xl sm:border sm:pt-3 sm:animate-entrar lg:w-96";

const BOTON_FLOTANTE =
  "grid h-11 w-11 place-items-center rounded-full border border-trazo bg-shell/90 " +
  "text-hi shadow-lg shadow-black/30 backdrop-blur transition hover:bg-elev";

const ENLACE_PIE = "py-1 underline decoration-lo/40 underline-offset-2 hover:text-hi";

/**
 * Monta el shell de la interfaz. Se rehace entero al cambiar de idioma; lo que
 * estaba abierto (ficha, tabla, dialogo) se vuelve a pintar en el idioma nuevo.
 */
export function montarUI() {
  const raiz = document.getElementById("ui-root");
  if (!raiz) return;

  // index.html declara "es". Sin esto, quien entra con el navegador en ingles
  // recibe la interfaz en ingles y el lector de pantalla la lee con voz espanola.
  document.documentElement.lang = idioma();

  raiz.innerHTML = `
    <div id="columna" class="pointer-events-none fixed inset-0 z-20 flex flex-col gap-2
         p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:py-3 sm:pl-3">
      <header class="pointer-events-auto relative flex items-center gap-2 rounded-xl border
                     border-trazo bg-shell/90 py-1.5 pl-3 pr-1.5 shadow-lg shadow-black/30
                     backdrop-blur sm:gap-3">
        <div class="shrink-0">
          <h1 class="text-[13px] font-semibold leading-tight tracking-tight text-hi sm:text-sm">
            ${esc(t("app.titulo"))}
          </h1>
          <p class="hidden max-w-72 truncate text-[11px] leading-tight text-lo lg:block xl:max-w-none">
            ${esc(t("app.subtitulo"))}
          </p>
        </div>

        <div class="min-w-0 flex-1 sm:relative sm:ml-2 sm:max-w-sm">
          <div class="relative">
            <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-lo">
              ${ICONO.buscar}
            </span>
            <input id="busqueda" type="search" role="combobox" aria-autocomplete="list"
              aria-expanded="false" aria-controls="resultados" autocomplete="off"
              spellcheck="false" enterkeyhint="search"
              aria-label="${esc(t("buscar.etiqueta"))}"
              placeholder="${esc(t("buscar.placeholder"))}"
              class="h-10 w-full rounded-lg border border-trazo bg-elev pl-8 pr-2 text-base
                     text-hi placeholder:text-lo focus:border-gas/60 focus:outline-none
                     sm:h-9 sm:pr-8 sm:text-[13px]">
            <kbd aria-hidden="true"
              class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2
                     rounded border border-trazo px-1.5 font-mono text-[10px] leading-4
                     text-lo sm:block">/</kbd>
          </div>
          <ul id="resultados" role="listbox" aria-label="${esc(t("buscar.etiqueta"))}" hidden
            class="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[60vh] overflow-y-auto
                   rounded-xl border border-trazo bg-shell/95 py-1 shadow-2xl
                   shadow-black/40 backdrop-blur"></ul>
        </div>

        <div class="flex shrink-0 items-center gap-0.5 sm:ml-auto sm:gap-1">
          <button id="btn-faja" type="button"
            aria-label="${esc(t("boton.volarFaja"))}" title="${esc(t("boton.volarFaja"))}"
            class="hidden h-9 items-center gap-2 rounded-lg bg-hi px-2.5 text-[13px]
                   font-medium text-shell transition hover:bg-white sm:inline-flex lg:px-3">
            ${ICONO.faja}<span class="hidden lg:inline">${esc(t("boton.volarFaja"))}</span>
          </button>
          <button id="btn-tabla" type="button"
            class="${tablaVisible ? "inline-flex" : "hidden"} h-10 items-center gap-2
                   rounded-lg px-2.5 text-[13px] text-lo transition hover:bg-white/5
                   hover:text-hi sm:inline-flex sm:h-9"></button>
          <button id="btn-idioma" type="button" lang="${idioma() === "es" ? "en" : "es"}"
            aria-label="${esc(t("boton.idioma"))}" title="${esc(t("boton.idioma"))}"
            class="grid h-10 min-w-10 place-items-center rounded-lg px-2 font-mono text-xs
                   font-semibold text-lo transition hover:bg-white/5 hover:text-hi
                   sm:h-9 sm:min-w-9">${esc(t("boton.idiomaCorto"))}</button>
        </div>
      </header>

      <div id="ranura-banner"></div>

      <div class="flex min-h-0 flex-1 items-start gap-2">
        <aside id="capas" aria-label="${esc(t("capa.titulo"))}" class="${CLASE_CAPAS}"></aside>
        <button id="btn-abrir-capas" type="button" hidden
          class="pointer-events-auto hidden h-9 items-center gap-2 rounded-lg border
                 border-trazo bg-shell/90 px-3 text-[13px] font-medium text-hi shadow-lg
                 shadow-black/30 backdrop-blur transition hover:bg-elev sm:inline-flex">
          ${ICONO.capas}<span>${esc(t("boton.capas"))}</span>
        </button>
      </div>
    </div>

    <div class="pointer-events-none fixed inset-x-0 z-10 flex items-center justify-between
                px-3 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] sm:hidden">
      <button id="btn-capas-movil" type="button" aria-expanded="false" aria-controls="capas"
        class="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full border
               border-trazo bg-shell/90 pl-3.5 pr-4 text-sm font-medium text-hi shadow-lg
               shadow-black/30 backdrop-blur">
        ${ICONO.capas}<span>${esc(t("boton.capas"))}</span>
      </button>
      <div class="pointer-events-auto flex gap-2">
        <button id="btn-faja-movil" type="button" aria-label="${esc(t("boton.volarFaja"))}"
          class="${BOTON_FLOTANTE}">${ICONO.faja}</button>
        <button id="btn-tabla-movil" type="button" class="${BOTON_FLOTANTE}"></button>
      </div>
    </div>

    <footer id="pie"
      class="pointer-events-none fixed inset-x-0 z-10 px-3 text-center text-[10px] leading-snug
             text-lo [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]
             bottom-[calc(env(safe-area-inset-bottom)+1.85rem)] sm:bottom-1.5 sm:left-auto
             sm:max-w-[min(42rem,60%)] sm:px-0 sm:text-right sm:text-[11px]">
      <p>${esc(t("pie.atribucionCorta"))}</p>
      <p class="pointer-events-auto">
        ${chipFrescura()}
        <span aria-hidden="true"> · </span>
        <button id="btn-fuentes" type="button" class="${ENLACE_PIE}">${esc(t("pie.fuentes"))}</button>
        <span aria-hidden="true"> · </span>
        <a href="${REPO}/blob/main/DISCLAIMER.md" target="_blank" rel="noopener noreferrer"
           class="${ENLACE_PIE}">${esc(t("pie.disclaimer"))}</a>
        <span aria-hidden="true" class="max-sm:hidden"> · </span>
        <a href="${REPO}" target="_blank" rel="noopener noreferrer"
           class="${ENLACE_PIE} max-sm:hidden">${esc(t("pie.codigo"))}</a>
      </p>
    </footer>

    <div id="panel-activo" hidden></div>
    <div id="vista-tabla" hidden></div>
    <div id="dialogo-fuentes" hidden></div>
  `;

  document.getElementById("btn-faja")?.addEventListener("click", volarAFaja);
  document.getElementById("btn-faja-movil")?.addEventListener("click", volarAFaja);
  document.getElementById("btn-tabla")?.addEventListener("click", alternarTabla);
  document.getElementById("btn-tabla-movil")?.addEventListener("click", alternarTabla);
  document.getElementById("btn-idioma")?.addEventListener("click", () => {
    cambiarIdioma(idioma() === "es" ? "en" : "es");
  });
  document.getElementById("btn-capas-movil")?.addEventListener("click", () => {
    if (capasAbiertas) cerrarHojaCapas();
    else abrirHojaCapas();
  });
  document.getElementById("btn-abrir-capas")?.addEventListener("click", () => {
    abrirHojaCapas();
    document.getElementById("btn-cerrar-capas")?.focus();
  });
  document.getElementById("btn-fuentes")?.addEventListener("click", abrirFuentes);

  conectarBuscador();
  pintarBotonesTabla();
  montarCapas();
  pintarBannerDemo();
  aplicarHuecoPanel();
  pintarPanel();
  montarTabla();
  pintarFuentes();
}

/**
 * Deja sitio a la ficha en escritorio: la cabecera y el pie se encogen en vez
 * de quedar tapados. Antes la ficha se montaba encima de los botones de la
 * cabecera y no habia forma de cambiar de idioma con ella abierta.
 */
function aplicarHuecoPanel() {
  const alternar = (id, cerrado, abierto) => {
    const nodo = document.getElementById(id);
    if (!nodo) return;
    for (const clase of cerrado) nodo.classList.toggle(clase, !panelAbierto);
    for (const clase of abierto) nodo.classList.toggle(clase, panelAbierto);
  };
  alternar("columna", ["sm:pr-3"], ["sm:pr-[21.25rem]", "lg:pr-[25.25rem]"]);
  alternar("pie", ["sm:right-3"], ["sm:right-[21.25rem]", "lg:right-[25.25rem]"]);
}

/**
 * Indicador de frescura de los datos.
 *
 * Cambia de color cuando el dato envejece: un proyecto de datos que sigue en
 * linea mostrando cifras viejas como si fueran de hoy es peor que uno caido.
 */
function chipFrescura() {
  const dias = diasDesde(FECHA_DATOS);
  const color =
    dias === null
      ? "bg-lo"
      : dias > UMBRAL_FRESCURA_DIAS.caducado
        ? "bg-alerta"
        : dias > UMBRAL_FRESCURA_DIAS.aviso
          ? "bg-crudo"
          : "bg-activo";
  const antiguedad = textoAntiguedad(dias);
  const completo = t("frescura.chip").replace("{t}", antiguedad);

  return `<a href="${REPO}/blob/main/docs/DATA_SOURCES.md" target="_blank"
      rel="noopener noreferrer"
      aria-label="${esc(`${completo} (${FECHA_DATOS})`)}"
      title="${esc(`${t("frescura.etiqueta")} ${FECHA_DATOS}`)}"
      class="inline-flex items-center gap-1.5 py-1 hover:text-hi">
      <span class="h-1.5 w-1.5 shrink-0 rounded-full ${color}" aria-hidden="true"></span>
      <span class="max-sm:hidden">${esc(completo)}</span>
      <span class="sm:hidden">${esc(antiguedad)}</span>
    </a>`;
}

// --- Control de capas y leyenda ----------------------------------------------

/** @returns {"cargando" | "lista" | "error"} */
function estadoInterruptor(interruptor) {
  const estados = CAPAS_DE_INTERRUPTOR[interruptor].map(
    (clave) => estadoCapas.get(clave) ?? "cargando"
  );
  if (estados.includes("error")) return "error";
  if (estados.includes("cargando")) return "cargando";
  return "lista";
}

const esTerminal = (feature) => feature.properties?.tipo === "terminal";

/** Elementos de una capa que cumplen un filtro. */
function contar(clave, filtro = () => true) {
  return datosCapas.get(clave)?.features.filter(filtro).length ?? 0;
}

/**
 * Cuantos activos controla un interruptor. Null en las capas de contexto que
 * no son activos: "105 lineas de limite" no le dice nada a nadie.
 * @returns {number | null}
 */
function conteo(interruptor) {
  switch (interruptor) {
    case "upstream":
      return contar("campos");
    case "midstream":
      return contar("ductos") + contar("downstream", esTerminal);
    case "downstream":
      return contar("downstream", (f) => !esTerminal(f));
    case "centrales":
      return contar("centrales");
    default:
      return null;
  }
}

const punto = (color) =>
  `<span class="h-2 w-2 rounded-full" style="background:${color}"></span>`;
const raya = (color, discontinua = false) =>
  `<span class="h-0 w-3 border-t-2 ${discontinua ? "border-dashed" : ""}" ` +
  `style="border-color:${color}"></span>`;

/**
 * Muestras de color junto a cada interruptor: la leyenda minima que siempre
 * esta a la vista. Sin ella el mapa es decoracion (Notion "Mejora v2", §1.3).
 */
const MUESTRAS = {
  upstream: () =>
    [COLOR_HIDROCARBURO.petroleo, COLOR_HIDROCARBURO.mixto, COLOR_HIDROCARBURO.gas]
      .map(punto)
      .join(""),
  midstream: () => raya(COLOR_FLUIDO.oil) + raya(COLOR_FLUIDO.gas),
  downstream: () =>
    [COLOR_TIPO.refineria, COLOR_TIPO.petroquimica, COLOR_TIPO.puerto].map(punto).join(""),
  toponimia: () => punto(COLOR_TOPONIMIA.marca),
  hidrografia: () => raya(COLOR_AGUA.rio),
  limites: () => raya(COLOR_LIMITE.estado),
  disputa: () => raya(COLOR_LIMITE.disputa, true),
  faja: () => raya(COLOR_LIMITE.faja, true),
  centrales: () => [COLOR_CENTRAL.hidro, COLOR_CENTRAL.termo].map(punto).join(""),
};

/**
 * Una fila del control de capas: interruptor, muestras y estado.
 *
 * El estado de carga vive en la propia fila. Si una capa falla, el usuario ve
 * cual, en vez de un aviso generico que no dice que parte del mapa falta.
 *
 * @param {string} interruptor
 * @param {boolean} marcado
 * @param {"sector" | "contexto"} grupo
 */
function filaInterruptor(interruptor, marcado, grupo) {
  const estado = estadoInterruptor(interruptor);
  const n = conteo(interruptor);
  const etiqueta = t(grupo === "sector" ? `capa.${interruptor}` : `contexto.${interruptor}`);

  let indicador = "";
  if (estado === "cargando") {
    indicador =
      '<span class="h-1 w-6 shrink-0 animate-pulse rounded-full bg-lo/40" aria-hidden="true"></span>' +
      `<span class="sr-only">${esc(t("capa.cargando"))}</span>`;
  } else if (estado === "error") {
    indicador =
      `<span class="shrink-0 font-mono text-[11px] text-alerta" ` +
      `title="${esc(t("capa.errorDetalle"))}">${esc(t("capa.error"))}</span>`;
  } else if (n !== null) {
    indicador =
      `<span class="min-w-7 shrink-0 text-right font-mono text-[11px] tabular-nums ` +
      `${marcado ? "text-lo" : "text-lo/50"}">${numero(n)}</span>`;
  }

  return `
    <label class="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-2
                  transition-colors hover:bg-white/5 sm:min-h-8">
      <input type="checkbox" data-${grupo}="${interruptor}" ${marcado ? "checked" : ""}
             class="h-4 w-4 shrink-0 ${ACENTO[interruptor] ?? "accent-lo"}">
      <span class="min-w-0 flex-1 text-[13px] leading-tight ${marcado ? "text-hi" : "text-lo"}">
        ${esc(etiqueta)}
      </span>
      <span class="flex shrink-0 items-center gap-1" aria-hidden="true">
        ${MUESTRAS[interruptor]()}
      </span>
      ${indicador}
    </label>`;
}

/** Leyenda completa, desplegable. */
function detalleLeyenda() {
  const titulo = (clave, primero = false) =>
    `<p class="${primero ? "" : "mt-3"} mb-1 text-[10px] font-medium uppercase
               tracking-wider text-lo">${esc(t(clave))}</p>`;
  const item = (color, clave, forma = "rounded-sm") => `
    <li class="flex items-center gap-2">
      <span class="inline-block h-2.5 w-2.5 shrink-0 ${forma}" aria-hidden="true"
            style="background:${color}99;border:1px solid ${color}"></span>
      <span class="leading-tight">${esc(t(clave))}</span>
    </li>`;
  // Muestra apagada y de borde discontinuo: el segundo canal visual con el que
  // el mapa marca lo que no esta en produccion, sin gastar un color en ello.
  const discontinuo = (color, clave) => `
    <li class="flex items-center gap-2">
      <span class="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" aria-hidden="true"
            style="background:${color}33;border:1px dashed ${color}"></span>
      <span class="leading-tight">${esc(t(clave))}</span>
    </li>`;
  const lista = (html) => `<ul class="space-y-1 text-xs text-hi/90">${html}</ul>`;
  const nota = (clave) =>
    `<p class="mt-1.5 text-[11px] leading-snug text-lo">${esc(t(clave))}</p>`;

  return [
    titulo("capa.upstream", true),
    lista(
      ["petroleo", "mixto", "gas"]
        .map((h) => item(COLOR_HIDROCARBURO[h], `hidrocarburo.${h}`))
        .join("") +
        item(COLOR_HIDROCARBURO.desconocido, "leyenda.soloPunto", "rounded-full") +
        discontinuo(COLOR_HIDROCARBURO.desconocido, "leyenda.noActivo")
    ),
    titulo("capa.midstream"),
    lista(
      ["oil", "gas", "hydrocarbons"].map((f) => item(COLOR_FLUIDO[f], `fluido.${f}`)).join("") +
        item(COLOR_TIPO.terminal, "tipo.terminal", "rounded-full")
    ),
    titulo("capa.downstream"),
    lista(
      ["refineria", "petroquimica", "planta_gas", "puerto", "instalacion"]
        .map((k) => item(COLOR_TIPO[k], `tipo.${k}`, "rounded-full"))
        .join("")
    ),
    titulo("leyenda.energia"),
    lista(
      ["hidro", "termo"]
        .map((c) => item(COLOR_CENTRAL[c], `central.${c}`, "rounded-full"))
        .join("")
    ),
    nota("leyenda.tamanoCapacidad"),
    titulo("leyenda.contexto"),
    lista(item(COLOR_AGUA.rio, "leyenda.rio") + item(COLOR_AGUA.lago, "leyenda.lago")),
    nota("leyenda.rioVsGasoducto"),
  ].join("");
}

/** Pinta el control de capas. Se llama cada vez que cambia algo que muestra. */
function montarCapas() {
  const nodo = document.getElementById("capas");
  if (!nodo) return;

  nodo.hidden = !capasAbiertas || tablaVisible;
  const abrir = document.getElementById("btn-abrir-capas");
  if (abrir) abrir.hidden = capasAbiertas || tablaVisible;
  document
    .getElementById("btn-capas-movil")
    ?.setAttribute("aria-expanded", String(capasAbiertas));

  const encabezado = (clave, extra = "pt-2") =>
    `<p class="px-2 pb-0.5 ${extra} text-[10px] font-medium uppercase tracking-wider
               text-lo">${esc(t(clave))}</p>`;

  nodo.innerHTML = `
    <div class="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true"></div>
    <div class="flex items-center justify-between gap-2 pl-3.5 pr-1.5 pt-1 sm:pt-1.5">
      <h2 class="text-[13px] font-semibold text-hi">${esc(t("capa.titulo"))}</h2>
      <button id="btn-cerrar-capas" type="button"
        aria-label="${esc(t("capa.ocultar"))}" title="${esc(t("capa.ocultar"))}"
        class="grid h-11 w-11 place-items-center rounded-lg text-lo transition
               hover:bg-white/5 hover:text-hi sm:h-8 sm:w-8">
        <span class="sm:hidden">${ICONO.cerrar}</span>
        <span class="hidden sm:inline">${ICONO.plegar}</span>
      </button>
    </div>

    <div class="px-1.5 pb-1">
      ${encabezado("capa.grupoCadena", "pt-0")}
      ${SECTORES.map((s) => filaInterruptor(s, sectores[s], "sector")).join("")}
      ${encabezado("capa.grupoContexto")}
      ${CAPAS_CONTEXTO.map((c) => filaInterruptor(c, contexto[c], "contexto")).join("")}
      ${
        // El interruptor DEMO solo existe si el grid llego a cargarse. Sin
        // notebook ejecutado no hay capa, y un interruptor que no hace nada
        // solo confunde.
        hayCapaDemo()
          ? `${encabezado("capa.grupoModelo")}
             <label class="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md
                           px-2 transition-colors hover:bg-white/5 sm:min-h-8">
               <input type="checkbox" id="chk-demo" ${demoActiva ? "checked" : ""}
                      class="h-4 w-4 shrink-0 accent-amber-500">
               <span class="min-w-0 flex-1 truncate text-[13px] text-amber-300">
                 ${esc(t("capa.demo"))}
               </span>
             </label>`
          : ""
      }
    </div>

    <button id="btn-leyenda" type="button" aria-expanded="${leyendaAbierta}"
      aria-controls="leyenda-detalle"
      class="flex min-h-11 w-full items-center justify-between gap-2 border-t border-trazo
             px-3.5 text-left text-[13px] font-medium text-hi transition hover:bg-white/5
             sm:min-h-9">
      <span>${esc(t("leyenda.titulo"))}</span>
      <span class="text-lo transition-transform ${leyendaAbierta ? "rotate-90" : ""}">
        ${ICONO.flecha}
      </span>
    </button>
    ${
      leyendaAbierta
        ? `<div id="leyenda-detalle" class="border-t border-trazo px-3.5 py-2.5">
             ${detalleLeyenda()}
           </div>`
        : ""
    }
  `;

  nodo.querySelectorAll("input[data-sector]").forEach((entrada) => {
    entrada.addEventListener("change", () => {
      const sector = entrada.dataset.sector;
      sectores[sector] = entrada.checked;
      alternarCapa(sector, entrada.checked);
      montarCapas();
      nodo.querySelector(`input[data-sector="${sector}"]`)?.focus();
    });
  });

  nodo.querySelectorAll("input[data-contexto]").forEach((entrada) => {
    entrada.addEventListener("change", () => {
      const clave = entrada.dataset.contexto;
      contexto[clave] = entrada.checked;
      alternarContexto(clave, entrada.checked);
      montarCapas();
      nodo.querySelector(`input[data-contexto="${clave}"]`)?.focus();
    });
  });

  document.getElementById("chk-demo")?.addEventListener("change", (ev) => {
    demoActiva = ev.target.checked;
    alternarDemo(demoActiva);
  });

  document.getElementById("btn-leyenda")?.addEventListener("click", () => {
    leyendaAbierta = !leyendaAbierta;
    montarCapas();
    document.getElementById("btn-leyenda")?.focus();
  });

  document.getElementById("btn-cerrar-capas")?.addEventListener("click", () => {
    cerrarHojaCapas();
    document.getElementById(esPequena() ? "btn-capas-movil" : "btn-abrir-capas")?.focus();
  });
}

function abrirHojaCapas() {
  // En movil la hoja ocupa la mitad inferior: una sola cosa encima del mapa.
  if (esPequena()) {
    sinHistorial(() => {
      cerrarPanel();
      cerrarFuentes();
    });
    capasAbiertas = true;
    apilarVista("capas");
  } else {
    capasAbiertas = true;
  }
  montarCapas();
}

function cerrarHojaCapas() {
  if (!capasAbiertas) return;
  capasAbiertas = false;
  montarCapas();
  desapilarVista("capas");
}

// Girar el telefono o ensanchar la ventana cambia que tipo de control toca.
pantallaAncha.addEventListener("change", () => {
  capasAbiertas = pantallaAncha.matches;
  montarCapas();
});

/**
 * Anota el estado de carga de una capa de datos. La llama main.js.
 * @param {string} clave — "campos", "ductos", "hidrografia"...
 * @param {"cargando" | "lista" | "error"} estado
 */
export function fijarEstadoCapa(clave, estado) {
  estadoCapas.set(clave, estado);
  montarCapas();
}

/**
 * Recibe una capa ya dibujada: actualiza sus contadores, el indice del
 * buscador y la tabla. La llama main.js.
 * @param {string} clave
 * @param {{features: Array<Object>}} featureCollection
 */
export function fijarDatosCapa(clave, featureCollection) {
  datosCapas.set(clave, featureCollection);
  estadoCapas.set(clave, "lista");
  if (["campos", "ductos", "downstream", "centrales"].includes(clave)) {
    construirIndice();
  }
  if (clave === "campos") montarTabla();
  montarCapas();
}

/** Repinta el control de capas. Tras cargar la capa DEMO, por ejemplo. */
export function refrescarCapas() {
  montarCapas();
}

/**
 * Avisa de las capas que no se pudieron cargar, por su nombre.
 * @param {Array<string>} claves
 */
export function avisarCapasFallidas(claves) {
  const nombres = [...new Set(claves.map((c) => t(ETIQUETA_CAPA[c] ?? c)))];
  mostrarError(t("error.cargaCapas").replace("{capas}", nombres.join(", ")));
}

// --- Buscador ----------------------------------------------------------------

/**
 * @typedef {Object} EntradaBusqueda
 * @property {string} capa — capa de map.js donde vive el activo
 * @property {Array<string>} ids
 * @property {string} nombre
 * @property {string} normal — nombre normalizado para comparar
 * @property {string} tipo
 * @property {string} color
 * @property {string | null} sector — null si es una capa de contexto
 */

/** @type {Array<EntradaBusqueda>} */
let indiceBusqueda = [];
/** @type {Array<EntradaBusqueda>} */
let resultados = [];
let resultadoActivo = -1;

/** Rehace el indice del buscador con las capas cargadas hasta ahora. */
function construirIndice() {
  const entradas = [];
  const agregar = (capa, props, sector) => {
    if (!props?.id || !props.nombre) return;
    entradas.push({
      capa,
      ids: [props.id],
      nombre: props.nombre,
      normal: normalizar(props.nombre),
      tipo: props.tipo,
      color: colorDeActivo(props),
      sector,
    });
  };

  for (const f of datosCapas.get("campos")?.features ?? []) {
    agregar("campos", f.properties, "upstream");
  }
  for (const f of datosCapas.get("downstream")?.features ?? []) {
    agregar("downstream", f.properties, esTerminal(f) ? "midstream" : "downstream");
  }
  for (const f of datosCapas.get("centrales")?.features ?? []) {
    agregar("centrales", f.properties, null);
  }

  // OpenStreetMap trocea las lineas: un mismo oleoducto con nombre son varios
  // tramos. Se agrupan por nombre para que buscarlo encuadre la linea entera y
  // no un tramo suelto, y para no llenar la lista de resultados repetidos.
  const ductos = new Map();
  for (const f of datosCapas.get("ductos")?.features ?? []) {
    const p = f.properties ?? {};
    if (!p.id || !p.nombre) continue;
    const previa = ductos.get(p.nombre);
    if (previa) {
      previa.ids.push(p.id);
      continue;
    }
    ductos.set(p.nombre, {
      capa: "ductos",
      ids: [p.id],
      nombre: p.nombre,
      normal: normalizar(p.nombre),
      tipo: "ducto",
      color: colorDeActivo(p),
      sector: "midstream",
    });
  }

  indiceBusqueda = [...entradas, ...ductos.values()];
}

/**
 * Busca activos por nombre. Todas las palabras tienen que aparecer, en
 * cualquier orden; primero los que empiezan por lo escrito.
 * @param {string} consulta
 * @returns {Array<EntradaBusqueda>}
 */
function buscar(consulta) {
  const q = normalizar(consulta).trim();
  if (q.length < 2) return [];
  const palabras = q.split(/\s+/);
  return indiceBusqueda
    .filter((e) => palabras.every((p) => e.normal.includes(p)))
    .map((e) => ({
      e,
      peso: e.normal.startsWith(q) ? 0 : e.normal.includes(` ${palabras[0]}`) ? 1 : 2,
    }))
    .sort((a, b) => a.peso - b.peso || a.e.nombre.length - b.e.nombre.length)
    .slice(0, 8)
    .map(({ e }) => e);
}

function pintarResultados() {
  const entrada = document.getElementById("busqueda");
  const lista = document.getElementById("resultados");
  if (!entrada || !lista) return;

  const consulta = normalizar(entrada.value).trim();
  const abierta = document.activeElement === entrada && consulta.length >= 2;
  lista.hidden = !abierta;
  entrada.setAttribute("aria-expanded", String(abierta));
  if (!abierta) {
    entrada.removeAttribute("aria-activedescendant");
    lista.innerHTML = "";
    return;
  }

  if (!resultados.length) {
    lista.innerHTML = `<li role="presentation" class="px-3 py-2.5 text-[13px] text-lo">
      ${esc(t("buscar.sinResultados"))}</li>`;
    entrada.removeAttribute("aria-activedescendant");
    return;
  }

  lista.innerHTML = resultados
    .map(
      (r, i) => `
      <li id="resultado-${i}" role="option" aria-selected="${i === resultadoActivo}"
          data-i="${i}"
          class="flex min-h-11 cursor-pointer items-center gap-2.5 px-3 sm:min-h-9
                 ${i === resultadoActivo ? "bg-white/10" : "hover:bg-white/5"}">
        <span class="h-2 w-2 shrink-0 rounded-full" style="background:${r.color}"
              aria-hidden="true"></span>
        <span class="min-w-0 flex-1 truncate text-[13px] text-hi">${esc(r.nombre)}</span>
        <span class="shrink-0 text-[11px] text-lo">${esc(t(`tipo.${r.tipo}`))}</span>
      </li>`
    )
    .join("");

  if (resultadoActivo >= 0) {
    entrada.setAttribute("aria-activedescendant", `resultado-${resultadoActivo}`);
  }
}

function conectarBuscador() {
  const entrada = document.getElementById("busqueda");
  const lista = document.getElementById("resultados");
  if (!entrada || !lista) return;

  const consultar = () => {
    resultados = buscar(entrada.value);
    resultadoActivo = resultados.length ? 0 : -1;
    pintarResultados();
  };

  entrada.addEventListener("input", consultar);
  entrada.addEventListener("focus", consultar);
  // El cierre espera un instante: tocar un resultado quita el foco del campo
  // antes de que llegue el click.
  entrada.addEventListener("blur", () => setTimeout(pintarResultados, 150));

  entrada.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      if (!resultados.length) return;
      ev.preventDefault();
      const paso = ev.key === "ArrowDown" ? 1 : -1;
      resultadoActivo = (resultadoActivo + paso + resultados.length) % resultados.length;
      pintarResultados();
      document.getElementById(`resultado-${resultadoActivo}`)?.scrollIntoView({
        block: "nearest",
      });
    } else if (ev.key === "Enter") {
      const elegido = resultados[resultadoActivo];
      if (!elegido) return;
      ev.preventDefault();
      irAResultado(elegido);
    } else if (ev.key === "Escape") {
      // No debe cerrar tambien la ficha que haya abierta detras.
      ev.preventDefault();
      ev.stopPropagation();
      if (entrada.value) {
        entrada.value = "";
        consultar();
      } else {
        entrada.blur();
      }
    }
  });

  lista.addEventListener("mousedown", (ev) => ev.preventDefault());
  lista.addEventListener("click", (ev) => {
    const opcion = ev.target.closest("[data-i]");
    if (opcion) irAResultado(resultados[Number(opcion.dataset.i)]);
  });
}

/** @param {EntradaBusqueda} resultado */
function irAResultado(resultado) {
  const entrada = document.getElementById("busqueda");
  if (entrada) {
    entrada.value = "";
    entrada.blur();
  }
  resultados = [];
  resultadoActivo = -1;
  pintarResultados();
  irAActivo(resultado);
}

/**
 * Lleva el mapa hasta un activo y abre su ficha.
 *
 * Si su capa estaba apagada se enciende, y el interruptor lo refleja: volar a
 * un activo invisible parece un fallo del buscador.
 *
 * @param {{capa: string, ids: Array<string>, sector: string | null}} destino
 */
function irAActivo({ capa, ids, sector }) {
  if (capa === "centrales" && !contexto.centrales) {
    contexto.centrales = true;
    alternarContexto("centrales", true);
  }
  if (sector && !sectores[sector]) {
    sectores[sector] = true;
    alternarCapa(sector, true);
  }
  // Se cierra sin tocar el historial: la ficha que se abre a continuacion
  // reutiliza la entrada de la tabla o de la hoja de capas.
  sinHistorial(() => {
    cerrarTabla();
    if (esPequena()) cerrarHojaCapas();
  });
  montarCapas();
  if (!volarAActivo(capa, ids)) mostrarError(t("buscar.noEnMapa"));
}

// --- Ficha del activo --------------------------------------------------------

/** Campos que la fuente de cada tipo deberia traer, para decir cuales faltan. */
const CAMPOS_ESPERADOS = {
  campo: [
    ["operadora", "panel.operadora"],
    ["propietarios", "panel.propietarios"],
    ["cuenca", "panel.cuenca"],
    ["bloque", "panel.bloque"],
    ["inicio_produccion", "panel.inicioProduccion"],
    ["descubrimiento", "panel.descubrimiento"],
  ],
  central: [
    ["operadora", "panel.operadora"],
    ["inicio_operacion", "panel.inicioOperacion"],
  ],
};

/** Color del punto de confianza. Baja no es rojo: rojo se lee como error. */
const PUNTO_CONFIANZA = { alta: "bg-activo", media: "bg-lo", baja: "bg-crudo" };

/**
 * Muestra la ficha del activo seleccionado, o la cierra con null.
 * La registra main.js como callback de seleccion del mapa.
 * @param {Object | null} activo
 */
export function mostrarPanelActivo(activo) {
  if (!activo) {
    cerrarPanel();
    return;
  }
  // Una sola cosa encima del mapa a la vez.
  sinHistorial(() => {
    cerrarTabla();
    cerrarFuentes();
    if (esPequena()) cerrarHojaCapas();
  });
  activoActual = activo;
  panelAbierto = true;
  apilarVista("panel");
  pintarPanel();
  aplicarHuecoPanel();
}

function cerrarPanel() {
  if (!panelAbierto) return;
  panelAbierto = false;
  activoActual = null;
  pintarPanel();
  aplicarHuecoPanel();
  // Cerrar deselecciona tambien en el mapa: si la entidad sigue seleccionada,
  // volver a tocarla no dispara ningun evento y parece que se ha bloqueado.
  deseleccionar();
  desapilarVista("panel");
}

function pintarPanel() {
  const nodo = document.getElementById("panel-activo");
  if (!nodo) return;

  if (!panelAbierto || !activoActual) {
    nodo.hidden = true;
    nodo.className = "";
    nodo.innerHTML = "";
    nodo.removeAttribute("role");
    return;
  }

  nodo.hidden = false;
  nodo.className = CLASE_PANEL;
  nodo.setAttribute("role", "dialog");
  nodo.setAttribute("aria-labelledby", "panel-titulo");
  nodo.innerHTML = contenidoPanel(activoActual);
  nodo.scrollTop = 0;
  document.getElementById("btn-cerrar-panel")?.addEventListener("click", cerrarPanel);
}

/**
 * HTML de la ficha.
 * @param {Object} activo
 * @returns {string}
 */
function contenidoPanel(activo) {
  const esCampo = activo.tipo === "campo" || activo.tipo === "pozo";
  const esCentral = activo.tipo === "central";
  const esDemo = activo.tipo === "demo";
  const color = colorDeActivo(activo);
  const tipo = t(`tipo.${activo.tipo ?? "instalacion"}`);

  const dato = (valor, mono = false) =>
    `<span class="${mono ? "font-mono text-[13px] tabular-nums" : ""} text-hi">${esc(valor)}</span>`;
  const fila = (clave, html) => `
    <div class="grid grid-cols-[7.25rem_minmax(0,1fr)] gap-3 py-2">
      <dt class="text-lo">${esc(t(clave))}</dt>
      <dd class="min-w-0 break-words">${html}</dd>
    </div>`;
  /**
   * Fila que solo aparece si hay dato. Los datos de GEM son desiguales: la
   * operadora esta en el 63% de los campos, la cuenca en el 42% y el bloque en
   * el 9%. Lo que falta se resume abajo, contado, en vez de ocupar una linea.
   */
  const filaSiHay = (clave, valor, mono = false) =>
    valor !== null && valor !== undefined && valor !== "" ? fila(clave, dato(valor, mono)) : "";

  const aviso = (clave, tono) => {
    const estilos = {
      ok: "border-activo/30 bg-activo/10 text-hi",
      cautela: "border-amber-500/30 bg-amber-500/10 text-amber-100",
      demo: "border-amber-300 bg-amber-500 font-semibold text-amber-950",
    };
    return `<p class="mt-3 rounded-lg border px-3 py-2 text-xs leading-relaxed ${estilos[tono]}">
      ${esc(t(clave))}</p>`;
  };

  // Aviso honesto sobre la naturaleza del dato. El caso mas delicado es el
  // parque de tanques: no existe como entidad en ninguna fuente, lo hemos
  // agrupado nosotros. Decirlo es obligatorio.
  let avisoHtml = "";
  if (esDemo) avisoHtml = aviso("panel.demo", "demo");
  else if (activo.derivado) avisoHtml = aviso("panel.derivado", "cautela");
  else if (esCampo) {
    avisoHtml = activo.tieneExtension
      ? aviso("panel.extensionReal", "ok")
      : aviso("panel.soloPunto", "cautela");
  } else if (esCentral) avisoHtml = aviso("panel.centralSinEstado", "cautela");

  const filas = [
    activo.estado && activo.estado !== "desconocido"
      ? fila("panel.estado", dato(t(`estado.${activo.estado}`)))
      : "",
    esDemo && Number.isFinite(activo.score)
      ? fila("panel.score", dato(numero(activo.score, { style: "percent" }), true))
      : "",
    filaSiHay(esCampo ? "panel.hidrocarburo" : "panel.fluido", etiquetaFluido(activo)),
    esCentral && activo.clase ? fila("panel.clase", dato(t(`central.${activo.clase}`))) : "",
    esCentral && Number.isFinite(activo.capacidad_mw)
      ? fila("panel.capacidad", dato(`${numero(activo.capacidad_mw)} MW`, true))
      : "",
    filaSiHay("panel.nTanques", activo.n_tanques, true),
    filaSiHay("panel.diametro", activo.diametro, true),
    filaSiHay("panel.operadora", activo.operadora),
    filaSiHay("panel.propietarios", activo.propietarios),
    filaSiHay("panel.cuenca", activo.cuenca),
    filaSiHay("panel.bloque", activo.bloque),
    filaSiHay("panel.inicioProduccion", activo.inicio_produccion, true),
    filaSiHay("panel.descubrimiento", activo.descubrimiento, true),
    filaSiHay("panel.inicioOperacion", activo.inicio_operacion, true),
  ].join("");

  // Solo se echa en falta lo que la fuente de ESE tipo deberia publicar. A una
  // refineria de OpenStreetMap no se le reclama la cuenca sedimentaria.
  const ausentes = (CAMPOS_ESPERADOS[esCampo ? "campo" : activo.tipo] ?? [])
    .filter(([campo]) => !activo[campo])
    .map(([, clave]) => t(clave));

  const confianza = PUNTO_CONFIANZA[activo.confianza] ? activo.confianza : "baja";
  const dias = diasDesde(activo.ultima_verificacion);
  const url = enlaceSeguro(activo.notas);

  return `
    <div class="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden="true"></div>

    <div class="flex items-start gap-3">
      <span class="mt-2 h-3 w-3 shrink-0 rounded-sm" aria-hidden="true"
            style="background:${color}99;border:1px solid ${color}"></span>
      <div class="min-w-0 flex-1">
        <p class="text-[10px] font-medium uppercase tracking-wider text-lo">${esc(tipo)}</p>
        <h2 id="panel-titulo" class="text-base font-semibold leading-snug text-hi">
          ${esc(activo.nombre ?? activo.id ?? "")}
        </h2>
      </div>
      <button id="btn-cerrar-panel" type="button" aria-label="${esc(t("panel.cerrar"))}"
        class="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lo
               transition hover:bg-white/5 hover:text-hi">${ICONO.cerrar}</button>
    </div>

    ${avisoHtml}

    ${filas ? `<dl class="mt-2 divide-y divide-trazo text-[13px]">${filas}</dl>` : ""}

    ${
      ausentes.length
        ? `<p class="mt-2 text-xs leading-relaxed text-lo">
             ${esc(t("panel.noPublicado"))}: ${esc(ausentes.join(", "))}.
           </p>`
        : ""
    }

    <div class="mt-4 rounded-lg border border-trazo bg-elev/70 px-3 text-xs">
      <dl class="divide-y divide-trazo">
        ${fila("panel.fuente", dato(activo.fuente))}
        ${fila(
          "panel.confianza",
          `<span class="inline-flex items-center gap-1.5 text-hi">
             <span class="h-1.5 w-1.5 rounded-full ${PUNTO_CONFIANZA[confianza]}" aria-hidden="true"></span>
             ${esc(t(`confianza.${confianza}`))}
           </span>`
        )}
        ${fila(
          "panel.ultimaVerificacion",
          `${dato(activo.ultima_verificacion ?? "—", true)}
           ${dias !== null ? `<span class="text-lo"> · ${esc(textoAntiguedad(dias))}</span>` : ""}`
        )}
      </dl>
    </div>

    ${
      url
        ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"
             class="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[13px] text-gas
                    underline decoration-gas/40 underline-offset-2 hover:text-hi sm:min-h-8">
             ${esc(t(esCampo ? "panel.masInfo" : "panel.documentoFuente"))}${ICONO.externo}
           </a>`
        : ""
    }
  `;
}

// --- Vista de tabla accesible (ADR-006) --------------------------------------

function abrirTabla() {
  sinHistorial(() => {
    cerrarPanel();
    cerrarFuentes();
    if (esPequena()) cerrarHojaCapas();
  });
  tablaVisible = true;
  apilarVista("tabla");
  montarTabla();
  pintarBotonesTabla();
  montarCapas();
  document.getElementById("tabla-titulo")?.focus();
}

function cerrarTabla() {
  if (!tablaVisible) return;
  tablaVisible = false;
  montarTabla();
  pintarBotonesTabla();
  montarCapas();
  desapilarVista("tabla");
}

function alternarTabla() {
  if (tablaVisible) cerrarTabla();
  else abrirTabla();
}

/**
 * Actualiza los botones de tabla/mapa sin rehacer la cabecera, que borraria lo
 * que el usuario este escribiendo en el buscador.
 */
function pintarBotonesTabla() {
  const icono = tablaVisible ? ICONO.mapa : ICONO.tabla;
  const texto = t(tablaVisible ? "boton.verMapa" : "boton.verTabla");

  const cabecera = document.getElementById("btn-tabla");
  if (cabecera) {
    cabecera.innerHTML = `${icono}<span class="hidden lg:inline">${esc(texto)}</span>`;
    cabecera.setAttribute("aria-label", texto);
    cabecera.title = texto;
    // En movil este boton solo aparece con la tabla abierta: la tabla tapa la
    // barra inferior, y sin el no habria forma visible de volver al mapa.
    cabecera.classList.toggle("hidden", !tablaVisible);
    cabecera.classList.toggle("inline-flex", tablaVisible);
  }

  const movil = document.getElementById("btn-tabla-movil");
  if (movil) {
    movil.innerHTML = icono;
    movil.setAttribute("aria-label", texto);
  }
}

/**
 * Tabla HTML semantica: alternativa al globo 3D para lectores de pantalla y
 * respaldo ligero en redes lentas. Ver docs/DECISIONS.md -> ADR-006.
 *
 * Cada fila lleva a su campo en el mapa: la tabla deja de ser un callejon sin
 * salida y pasa a ser otra forma de navegar.
 */
function montarTabla() {
  const nodo = document.getElementById("vista-tabla");
  if (!nodo) return;

  if (!tablaVisible) {
    nodo.hidden = true;
    nodo.className = "";
    nodo.innerHTML = "";
    return;
  }

  const campos = datosCapas.get("campos")?.features ?? [];
  const celda = "py-2.5 pr-3";

  const filas = campos
    .map((f) => {
      const p = f.properties ?? {};
      const nombre = p.nombre ?? p.id ?? "";
      return `
      <tr class="border-b border-trazo align-top">
        <th scope="row" class="sticky left-0 bg-shell ${celda} text-left font-medium text-hi">
          ${esc(nombre)}
        </th>
        <td class="${celda} text-hi/90">${esc(t(`estado.${p.estado ?? "desconocido"}`))}</td>
        <td class="${celda} text-hi/90">
          <span class="inline-flex items-center gap-1.5">
            <span class="h-2 w-2 shrink-0 rounded-full" aria-hidden="true"
                  style="background:${colorDeActivo({ tipo: "campo", fluido: p.fluido })}"></span>
            ${esc(t(`hidrocarburo.${hidrocarburoDe(p.fluido)}`))}
          </span>
        </td>
        <td class="${celda} text-hi/90">${esc(p.operadora ?? "—")}</td>
        <td class="${celda} text-hi/90">${esc(p.cuenca ?? "—")}</td>
        <td class="${celda} text-lo">${esc(t(`confianza.${p.confianza ?? "baja"}`))}</td>
        <td class="${celda} font-mono text-xs tabular-nums text-lo">${esc(p.ultima_verificacion ?? "—")}</td>
        <td class="py-1.5">
          ${
            p.id
              ? `<button type="button" data-ir="${esc(p.id)}"
                   aria-label="${esc(`${t("tabla.verEnMapa")}: ${nombre}`)}"
                   class="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-lg
                          border border-trazo px-2.5 text-xs text-hi transition hover:bg-white/5">
                   ${ICONO.faja}<span>${esc(t("tabla.verEnMapa"))}</span>
                 </button>`
              : ""
          }
        </td>
      </tr>`;
    })
    .join("");

  const cabecera = (clave, extra = "") =>
    `<th scope="col" class="py-2 pr-3 ${extra}">${esc(t(clave))}</th>`;

  nodo.hidden = false;
  nodo.className =
    "fixed inset-0 z-[15] overflow-y-auto bg-shell px-3 pb-10 pt-[4.5rem] sm:px-6 sm:pt-20";
  nodo.innerHTML = `
    <div class="mx-auto max-w-6xl">
      <h2 id="tabla-titulo" tabindex="-1" class="text-lg font-semibold text-hi focus:outline-none">
        ${esc(t("tabla.titulo"))}
      </h2>
      <p class="mt-1 text-sm text-lo">${esc(t("tabla.descripcion"))}</p>
      <p class="mt-1 font-mono text-xs text-lo">${numero(campos.length)} ${esc(t("tabla.total"))}</p>

      <div class="mt-4 overflow-x-auto rounded-xl border border-trazo">
        <table class="w-full min-w-[60rem] border-collapse text-[13px]">
          <caption class="sr-only">${esc(t("tabla.titulo"))}</caption>
          <thead>
            <tr class="border-b border-trazo bg-elev text-left text-[10px] uppercase tracking-wider text-lo">
              ${cabecera("panel.nombre", "sticky left-0 bg-elev pl-3")}
              ${cabecera("panel.estado")}
              ${cabecera("panel.hidrocarburo")}
              ${cabecera("panel.operadora")}
              ${cabecera("panel.cuenca")}
              ${cabecera("panel.confianza")}
              ${cabecera("panel.ultimaVerificacion")}
              ${cabecera("tabla.columnaMapa")}
            </tr>
          </thead>
          <tbody class="[&_th]:pl-3">${filas}</tbody>
        </table>
      </div>

      <p class="mt-6 text-xs text-lo">${esc(t("pie.atribucionCorta"))}</p>
    </div>
  `;

  // Asignacion y no addEventListener: la tabla se repinta al llegar datos y
  // no puede acumular manejadores.
  nodo.onclick = (ev) => {
    const boton = ev.target.closest("[data-ir]");
    if (boton) irAActivo({ capa: "campos", ids: [boton.dataset.ir], sector: "upstream" });
  };
}

// --- Dialogo de fuentes y licencias ------------------------------------------

function abrirFuentes() {
  sinHistorial(() => {
    cerrarPanel();
    if (esPequena()) cerrarHojaCapas();
  });
  origenFoco = document.activeElement;
  fuentesAbiertas = true;
  apilarVista("fuentes");
  pintarFuentes();
  document.getElementById("btn-cerrar-fuentes")?.focus();
}

function cerrarFuentes() {
  if (!fuentesAbiertas) return;
  fuentesAbiertas = false;
  pintarFuentes();
  desapilarVista("fuentes");
  if (origenFoco instanceof HTMLElement && origenFoco.isConnected) origenFoco.focus();
  origenFoco = null;
}

/**
 * Lista completa de fuentes con su licencia.
 *
 * El pie solo cabe una atribucion corta. Esta es la version completa, a un
 * toque, con enlace a cada fuente y al metodo: CC BY y ODbL piden atribucion
 * "razonable", y un nombre sin enlace ni licencia no lo es del todo.
 */
function pintarFuentes() {
  const nodo = document.getElementById("dialogo-fuentes");
  if (!nodo) return;

  if (!fuentesAbiertas) {
    nodo.hidden = true;
    nodo.className = "";
    nodo.innerHTML = "";
    return;
  }

  nodo.hidden = false;
  nodo.className = "fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center sm:p-6";
  nodo.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="fuentes-titulo"
      class="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-trazo bg-shell px-5 pt-4
             pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-subir
             sm:max-w-lg sm:rounded-xl sm:animate-entrar">
      <div class="flex items-start gap-3">
        <h2 id="fuentes-titulo" class="min-w-0 flex-1 pt-2 text-base font-semibold text-hi">
          ${esc(t("fuentes.titulo"))}
        </h2>
        <button id="btn-cerrar-fuentes" type="button" aria-label="${esc(t("aviso.cerrar"))}"
          class="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lo transition
                 hover:bg-white/5 hover:text-hi">${ICONO.cerrar}</button>
      </div>
      <p class="mt-1 text-sm leading-relaxed text-lo">${esc(t("fuentes.intro"))}</p>

      <ul class="mt-3 divide-y divide-trazo text-[13px]">
        ${FUENTES.map(
          (f) => `
          <li class="py-2.5">
            <a href="${esc(f.url)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-start gap-1.5 text-hi underline decoration-trazo
                      underline-offset-2 hover:decoration-hi">
              <span>${esc(t(`fuente.${f.clave}`))}</span>
              <span class="mt-0.5 shrink-0 text-lo">${ICONO.externo}</span>
            </a>
            <p class="mt-0.5 font-mono text-[11px] text-lo">${esc(t(f.licencia))}</p>
          </li>`
        ).join("")}
      </ul>

      <a href="${REPO}/blob/main/docs/DATA_SOURCES.md" target="_blank" rel="noopener noreferrer"
         class="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[13px] text-gas underline
                decoration-gas/40 underline-offset-2 hover:text-hi">
        ${esc(t("fuentes.metodo"))}${ICONO.externo}
      </a>
    </div>
  `;

  document.getElementById("btn-cerrar-fuentes")?.addEventListener("click", cerrarFuentes);
  // Tocar fuera del cuadro lo cierra.
  nodo.onclick = (ev) => {
    if (ev.target === nodo) cerrarFuentes();
  };
}

// --- Banner de la capa DEMO (Fase 5) -----------------------------------------

/**
 * Banner permanente de la capa demostrativa.
 *
 * No se puede cerrar: la unica forma de quitarlo es apagar la capa. Es
 * deliberado. Un aviso que el usuario descarta y luego olvida convierte un
 * modelo sintetico en algo que parece un dato real. Ver MODEL_CARD.md.
 *
 * Vive en una ranura de la columna superior y se repinta con ella. Antes se
 * colgaba de #ui-root: cambiar de idioma con la capa encendida lo borraba y
 * la capa DEMO seguia en pantalla sin aviso, justo lo que MODEL_CARD prohibe.
 */
export function montarBannerDemo() {
  bannerDemoVisible = true;
  pintarBannerDemo();
}

/** Quita el banner. Solo la llama map.js al apagar la capa. */
export function quitarBannerDemo() {
  bannerDemoVisible = false;
  pintarBannerDemo();
}

function pintarBannerDemo() {
  const ranura = document.getElementById("ranura-banner");
  if (!ranura) return;
  ranura.innerHTML = bannerDemoVisible
    ? `<div id="banner-demo" role="alert"
         class="pointer-events-auto mx-auto w-full max-w-3xl rounded-lg bg-amber-500 px-3 py-2
                text-center text-xs font-semibold text-amber-950 shadow-lg ring-2 ring-amber-300
                sm:text-sm">
         <span>${esc(t("demo.banner"))}</span>
         <a href="${REPO}/blob/main/MODEL_CARD.md" target="_blank" rel="noopener noreferrer"
            class="ml-1 whitespace-nowrap underline hover:text-amber-800">${esc(t("demo.masInfo"))}</a>
       </div>`
    : "";
}

// --- Pantalla de carga -------------------------------------------------------

/**
 * Pantalla de carga inicial.
 *
 * Mientras Cesium arranca, el contenedor es un lienzo negro, y eso es lo que
 * hace parecer roto un mapa 3D. No bloquea nada (pointer-events-none) y se
 * retira sola pasado ESPERA_MAXIMA_CARGA aunque el terreno no termine: en una
 * red lenta, un mapa a medio cargar es mas util que una espera sin fin.
 */
export function montarCargaInicial() {
  if (document.getElementById("carga-inicial")) return;

  const nodo = document.createElement("div");
  nodo.id = "carga-inicial";
  nodo.setAttribute("role", "status");
  nodo.className =
    "pointer-events-none fixed inset-0 z-[5] grid place-items-center bg-shell " +
    "transition-opacity duration-500";
  nodo.innerHTML = `
    <div class="w-60 px-4 text-center">
      <p class="text-sm font-semibold tracking-tight text-hi">${esc(t("app.titulo"))}</p>
      <p class="mt-1 text-xs text-lo">${esc(t("carga.terreno"))}</p>
      <div class="mt-4 h-0.5 overflow-hidden rounded-full bg-trazo">
        <div class="h-full w-1/3 rounded-full bg-gas animate-indeterminada"></div>
      </div>
    </div>`;
  document.body.appendChild(nodo);
  setTimeout(quitarCargaInicial, ESPERA_MAXIMA_CARGA);
}

/** Retira la pantalla de carga con un fundido. Idempotente. */
export function quitarCargaInicial() {
  const nodo = document.getElementById("carga-inicial");
  if (!nodo || nodo.dataset.saliendo) return;
  nodo.dataset.saliendo = "1";
  nodo.classList.add("opacity-0");
  setTimeout(() => nodo.remove(), 500);
}

// --- Errores -----------------------------------------------------------------

/**
 * Muestra un error visible al usuario, no solo en consola.
 *
 * La verificacion del proyecto se hace con DevTools CERRADO: un error que solo
 * vive en la consola es un error invisible. Por eso el aviso persiste hasta
 * que el usuario lo cierra, y el mismo mensaje no se apila dos veces.
 *
 * @param {string} mensaje
 */
export function mostrarError(mensaje) {
  let contenedor = document.getElementById("avisos");
  if (!contenedor) {
    contenedor = document.createElement("div");
    contenedor.id = "avisos";
    contenedor.className =
      "pointer-events-none fixed inset-x-3 z-50 flex flex-col items-center gap-2 " +
      "bottom-[calc(env(safe-area-inset-bottom)+8rem)] sm:bottom-14";
    document.body.appendChild(contenedor);
  }
  if ([...contenedor.children].some((n) => n.dataset.mensaje === mensaje)) return;

  const aviso = document.createElement("div");
  aviso.dataset.mensaje = mensaje;
  aviso.setAttribute("role", "alert");
  aviso.className =
    "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border " +
    "border-alerta/40 bg-shell/95 py-2 pl-4 pr-1 text-sm text-hi shadow-2xl backdrop-blur";
  aviso.innerHTML = `
    <span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-alerta" aria-hidden="true"></span>
    <p class="min-w-0 flex-1 py-1 leading-relaxed"></p>
    <button type="button" aria-label="${esc(t("aviso.cerrar"))}"
      class="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-lo transition
             hover:bg-white/5 hover:text-hi">${ICONO.cerrar}</button>`;
  aviso.querySelector("p").textContent = mensaje;
  aviso.querySelector("button").addEventListener("click", () => aviso.remove());
  contenedor.appendChild(aviso);
}

// --- Teclado -----------------------------------------------------------------

/**
 * `/` enfoca el buscador; `Esc` cierra lo que este encima, de arriba abajo.
 * Notion "Mejora v2", §1.3 y §2.2.
 */
document.addEventListener("keydown", (ev) => {
  const objetivo = ev.target;
  const escribiendo =
    objetivo instanceof HTMLElement &&
    (objetivo.isContentEditable ||
      objetivo.matches("textarea, select, input:not([type=checkbox]):not([type=radio])"));

  if (ev.key === "/" && !escribiendo && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
    const entrada = document.getElementById("busqueda");
    if (!entrada) return;
    ev.preventDefault();
    entrada.focus();
    return;
  }

  if (ev.key !== "Escape" || escribiendo) return;
  if (fuentesAbiertas) cerrarFuentes();
  else if (panelAbierto) cerrarPanel();
  else if (capasAbiertas && esPequena()) cerrarHojaCapas();
  else if (tablaVisible) cerrarTabla();
});

// Redibujar la UI cuando cambie el idioma.
window.addEventListener("idioma:cambiado", montarUI);
