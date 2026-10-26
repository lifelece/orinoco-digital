/**
 * ui/modoCiudadBolivar.js — Cabecera con co-marca y panel del modo Ciudad
 * Bolivar (spec 001, RF-6, RF-15, RF-16; plan §3.4).
 *
 * Mismo contrato que ui.js: no importa "cesium" ni hace fetch. Es el unico
 * modulo de la interfaz que puede importar `MARCAS_MODO` (verificar-modulos):
 * los logos de la CCIEB y de ExpoFaja viven solo en esta cabecera DOM y nunca
 * sobre el mapa (docs/expofaja/02-IDENTIDAD-VISUAL.md §4).
 *
 * Sin colores de marca en clases ni estilos: la UI usa los tokens de Orinoco
 * (hi, lo, trazo, shell, elev); el color de marca llega solo en las imagenes.
 *
 * Se construye con createElement/textContent: los textos de las iniciativas
 * vienen de un tercero (la CCIEB) y no pasan nunca por innerHTML.
 */

import { t, idioma } from "../i18n/index.js";
import { MARCAS_MODO, CLASES_CIUDAD, URL_MICROSITIO } from "../config.js";
import { crearReglaRio } from "./reglaRio.js";

/**
 * @typedef {Object} DatosModo  Cada campo: null = cargando · false = fallo (la
 *   seccion se oculta; el aviso ya lo dio mostrarError) · valor.
 * @property {Array<{km: number, campos: number}>|null|false} resumenAnillos  ascendente
 * @property {number|null|false} totalCampos
 * @property {Array<{id: string, nombre: string|null, km: number, confianza: string|null}>|null|false} cercanos  desde la sede
 * @property {import("./reglaRio.js").ReglaRio|null|false} reglaRio  cauce y cruces (ADR-021); decorativa: si falta, no se pinta
 * @property {Object<string, number>|null|false} conteos  por clase de CLASES_CIUDAD
 * @property {Array<{id: string, nombre: string, fecha: string|null, fuente: string, enMapa: boolean}>|null|false} iniciativas
 */

const CLAVES_DATOS = ["resumenAnillos", "totalCampos", "cercanos", "conteos", "iniciativas", "reglaRio"];

/** Estado del modulo: las ranuras de ui.js se recrean al cambiar de idioma. */
const estado = {
  /** @type {DatosModo} */
  datos: { resumenAnillos: null, totalCampos: null, cercanos: null, conteos: null, iniciativas: null, reglaRio: null },
  montado: false,
  /** @type {(() => void) | null} */
  alSalir: null,
  /** @type {((id: string) => void) | null} */
  alVerEnMapa: null,
  /** @type {(() => void) | null} */
  alEntrar: null,
  /** Solo importa en movil: en escritorio el panel va siempre desplegado. */
  detallesAbiertos: false,
  /** La regla se dibuja una vez; los repintados por datos que llegan no la repiten. */
  reglaTrazada: false,
  /** RF-127: con recorrido activo el acceso "Ver Ciudad Bolivar" no se ofrece. */
  accesoOculto: false,
};

// --- Utilidades de DOM -------------------------------------------------------

/**
 * Crea un nodo con clases y texto (nunca HTML).
 * @param {string} etiqueta
 * @param {string} [clase]
 * @param {string} [texto]
 * @param {Object<string, string>} [atributos]
 * @returns {HTMLElement}
 */
function nodo(etiqueta, clase = "", texto = "", atributos = {}) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto) el.textContent = texto;
  for (const [k, v] of Object.entries(atributos)) el.setAttribute(k, v);
  return el;
}

/** Devuelve la URL solo si es http o https (misma regla que enlaceSeguro de ui.js). */
function urlSegura(url) {
  try {
    const u = new URL(String(url ?? ""));
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const formatoNumero = (valor, maximo = 1) =>
  new Intl.NumberFormat(idioma(), { maximumFractionDigits: maximo }).format(valor);

const BOTON =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-trazo bg-elev " +
  "px-3 text-center text-xs font-medium leading-tight text-hi transition hover:bg-white/10 " +
  "sm:min-h-9 sm:text-[13px]";

// --- Cabecera ----------------------------------------------------------------

/** Cabecera del modo: titulo, "En alianza con", logos y boton "Ver toda la Faja". */
function crearCabecera() {
  const cab = nodo(
    "section",
    "pointer-events-auto flex flex-col gap-1 rounded-xl border border-trazo bg-shell/90 px-3 py-1.5 " +
      "shadow-lg shadow-black/30 backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:py-2",
    "",
    { "aria-label": t("modo.ciudadBolivar.titulo") }
  );
  // Movil (390 px): fila 1 = titulo + boton; fila 2 = "En alianza con" + logos.
  // Todo junto no cabe: el boton se cortaba. En sm+ `sm:contents` disuelve la
  // fila 1 y los tres bloques quedan en linea, con el boton al final.
  const filaTitulo = nodo("div", "flex min-w-0 items-center gap-2 sm:contents");
  filaTitulo.append(
    nodo(
      "p",
      "min-w-0 flex-1 truncate text-xs font-semibold leading-tight text-hi sm:flex-none sm:text-sm",
      t("modo.ciudadBolivar.titulo"),
      { title: t("modo.ciudadBolivar.titulo") }
    )
  );
  cab.append(filaTitulo);

  const fila = nodo("div", "flex min-w-0 items-center gap-2 sm:ml-auto sm:gap-3");
  fila.append(
    // Se parte en dos lineas si hace falta: a 360 px, en ingles, con el enlace a
    // la agenda en la misma fila, desbordaba la tarjeta.
    nodo("span", "min-w-0 text-[10px] leading-none text-lo sm:shrink-0 sm:text-[11px]", t("modo.ciudadBolivar.alianza"))
  );

  // El sello lleva aro azul oscuro: sobre el tema oscuro se pierde, asi que va
  // sobre un disco blanco neutro (no es un color de marca).
  const sello = nodo("span", "grid shrink-0 place-items-center rounded-full bg-white p-px");
  sello.append(
    nodo("img", "h-8 w-8 sm:h-9 sm:w-9", "", {
      src: MARCAS_MODO.ccieb,
      alt: t("modo.altCcieb"),
      width: "256",
      height: "256",
      decoding: "async",
    })
  );
  // 686x238: a 42 px de alto mide 121 px de ancho (minimo 120, 02-IDENTIDAD §8).
  const logo = nodo("img", "h-[42px] w-auto shrink-0", "", {
    src: MARCAS_MODO.expofaja,
    alt: t("modo.altExpofaja"),
    width: "686",
    height: "238",
    decoding: "async",
  });
  // Unico camino del mapa al micrositio; en movil queda al final de la fila 2.
  const agenda = nodo("a", `${BOTON} shrink-0 max-sm:ml-auto`, t("modo.verAgenda"), {
    href: URL_MICROSITIO,
    "aria-label": t("modo.verAgendaAria"),
    id: "enlace-micrositio",
  });
  fila.append(sello, logo, agenda);

  const volver = nodo("button", `${BOTON} shrink-0 sm:order-last`, t("modo.verFaja"), { type: "button", id: "btn-ver-faja" });
  volver.addEventListener("click", () => estado.alSalir?.());
  filaTitulo.append(volver);

  cab.append(fila);
  return cab;
}

// --- Panel -------------------------------------------------------------------

/** Texto de "cargando" de una seccion cuyo dato aun no llego. */
const cargando = () => nodo("p", "text-xs text-lo", t("capa.cargando"));

/**
 * Seccion con titulo. Devuelve null si su dato fallo (false): se oculta.
 * @param {string} titulo
 * @param {*} dato
 * @param {() => HTMLElement} cuerpo — solo se llama si hay dato
 * @returns {HTMLElement|null}
 */
function seccion(titulo, dato, cuerpo) {
  if (dato === false) return null;
  const sec = nodo("section", "mt-3 border-t border-trazo pt-3");
  sec.append(nodo("h3", "mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-tinta", titulo));
  sec.append(dato === null || dato === undefined ? cargando() : cuerpo());
  return sec;
}

/** Frase principal con el anillo mayor (RNF-5). */
function crearFrase() {
  const { resumenAnillos: anillos, totalCampos: total } = estado.datos;
  if (anillos === false || total === false) return null;
  if (!anillos || total === null || !anillos.length) return cargando();
  const mayor = anillos[anillos.length - 1];
  return nodo(
    "p",
    "text-sm leading-snug text-hi",
    t("modo.frasePrincipal", {
      n: formatoNumero(mayor.campos, 0),
      total: formatoNumero(total, 0),
      km: formatoNumero(mayor.km, 0),
    })
  );
}

/**
 * La regla del rio entre la frase y los anillos (ADR-021). Decorativa: cada
 * marca es un anillo de la lista de debajo, que lleva la distancia en texto.
 * @returns {HTMLElement|null}
 */
function crearRegla() {
  const regla = estado.datos.reglaRio;
  if (!regla) return null;
  const trazar = !estado.reglaTrazada;
  const svg = crearReglaRio(regla, { trazar });
  if (trazar) svg.addEventListener("animationend", () => { estado.reglaTrazada = true; }, { once: true });
  const marco = nodo("div", "mt-2.5");
  marco.append(svg, nodo("p", "regla-leyenda", t("regla.leyenda")));
  return marco;
}

/**
 * Anillos como escala: etiqueta de km en tinta y cifra en monoespaciada
 * tabular. El nombre accesible es la frase completa de siempre.
 */
function crearAnillos(anillos) {
  const lista = nodo("ul", "mt-2 grid grid-cols-4 rounded-md border border-trazo");
  for (const a of anillos) {
    const celda = nodo("li", "grid gap-0.5 border-l border-trazo px-2 py-1.5 first:border-l-0", "", {
      "aria-label": t("modo.anillo", { km: formatoNumero(a.km, 0), n: formatoNumero(a.campos, 0) }),
    });
    celda.append(
      nodo("span", "font-mono text-[10px] uppercase tracking-[0.08em] text-tinta", t("modo.distancia", { km: formatoNumero(a.km, 0) }), { "aria-hidden": "true" }),
      nodo("span", "font-mono text-base tabular-nums text-hi", formatoNumero(a.campos, 0), { "aria-hidden": "true" })
    );
    lista.append(celda);
  }
  return lista;
}

function crearCercanos(cercanos) {
  const cuerpo = nodo("div");
  const lista = nodo("ol", "divide-y divide-trazo text-[13px]");
  for (const c of cercanos) {
    const fila = nodo("li", "flex items-baseline justify-between gap-3 py-1.5");
    fila.append(
      nodo("span", "min-w-0 break-words text-hi", c.nombre ?? t("ciudad.sinNombre")),
      nodo("span", "shrink-0 font-mono text-[12px] tabular-nums text-tinta", t("modo.distancia", { km: formatoNumero(c.km) }))
    );
    lista.append(fila);
  }
  cuerpo.append(lista, nodo("p", "mt-1.5 text-[11px] leading-snug text-lo", `${t("ciudad.lineaRecta")}. ${t("modo.metodo")}`));
  return cuerpo;
}

function crearServicios(conteos) {
  const lista = nodo("ul", "grid grid-cols-2 gap-x-3 text-[13px]");
  for (const clase of CLASES_CIUDAD) {
    const n = conteos[clase] ?? 0;
    if (!n) continue;
    const fila = nodo("li", "flex items-baseline justify-between gap-2 py-0.5");
    fila.append(
      nodo("span", "min-w-0 truncate text-lo", t(`ciudad.clase.${clase}`)),
      nodo("span", "font-mono text-[12px] tabular-nums text-hi", formatoNumero(n, 0))
    );
    lista.append(fila);
  }
  return lista;
}

function crearIniciativas(iniciativas) {
  const cuerpo = nodo("div");
  const lista = nodo("ul", "divide-y divide-trazo");
  for (const ini of iniciativas) {
    const item = nodo("li", "py-2");
    // El texto es de la CCIEB, en espanol, tal cual la semilla: no se traduce.
    item.append(nodo("p", "text-[13px] leading-snug text-hi", ini.nombre, { lang: "es" }));
    const pie = nodo("div", "mt-0.5 flex flex-wrap items-center gap-x-3");
    if (ini.fecha) pie.append(nodo("span", "font-mono text-[11px] text-lo", ini.fecha, { lang: "es" }));
    const url = urlSegura(ini.fuente);
    if (url) {
      pie.append(
        nodo(
          "a",
          "inline-flex min-h-11 items-center text-xs text-hi underline decoration-lo/50 underline-offset-2 sm:min-h-8",
          t("modo.notaPrensa"),
          { href: url, target: "_blank", rel: "noopener noreferrer" }
        )
      );
    }
    if (ini.enMapa) {
      const ver = nodo("button", "inline-flex min-h-11 items-center text-xs text-hi underline decoration-lo/50 underline-offset-2 sm:min-h-8", t("tabla.verEnMapa"), { type: "button" });
      ver.addEventListener("click", () => estado.alVerEnMapa?.(ini.id));
      pie.append(ver);
    }
    item.append(pie);
    lista.append(item);
  }
  cuerpo.append(lista, nodo("p", "mt-1.5 text-[11px] leading-snug text-lo", t("ciudad.contenidoOrganizador")));
  return cuerpo;
}

/** Panel del modo: plegado en movil (frase + boton), desplegado en escritorio. */
function crearPanel() {
  const d = estado.datos;
  const panel = nodo(
    "section",
    "pointer-events-auto w-full overflow-y-auto overscroll-contain rounded-xl border border-trazo " +
      "bg-shell/90 px-3 py-2.5 shadow-lg shadow-black/30 backdrop-blur " +
      "[scrollbar-width:thin] [scrollbar-color:var(--color-trazo)_transparent] " +
      "max-sm:max-h-[45vh] sm:max-h-full sm:w-80 sm:ml-auto",
    "",
    { "aria-labelledby": "modo-panel-titulo" }
  );

  const cabecera = nodo("div", "flex items-start justify-between gap-2");
  cabecera.append(nodo("h2", "text-[13px] font-semibold text-hi", t("modo.panelTitulo"), { id: "modo-panel-titulo" }));
  const alternar = nodo(
    "button",
    "-mr-1 -mt-1 inline-flex min-h-11 shrink-0 items-center rounded-lg px-2 text-xs text-lo transition hover:bg-white/5 hover:text-hi sm:hidden",
    estado.detallesAbiertos ? t("modo.ocultarDetalles") : t("modo.verDetalles"),
    { type: "button", id: "btn-detalles-modo", "aria-expanded": String(estado.detallesAbiertos), "aria-controls": "modo-detalles" }
  );
  alternar.addEventListener("click", () => {
    estado.detallesAbiertos = !estado.detallesAbiertos;
    repintarModoCiudadBolivar();
    document.getElementById("btn-detalles-modo")?.focus();
  });
  cabecera.append(alternar);
  panel.append(cabecera);

  const frase = crearFrase();
  if (frase) panel.append(frase);

  // Plegado (movil): solo titulo, frase y boton. En escritorio siempre visible.
  // La regla va dentro: plegada en movil haria crecer el panel y taparia el
  // anillo de 100 km que encuadra CAMARA_CIUDAD_BOLIVAR.
  const detalles = nodo("div", estado.detallesAbiertos ? "" : "max-sm:hidden", "", { id: "modo-detalles" });
  const regla = crearRegla();
  if (regla) detalles.append(regla);
  if (d.resumenAnillos) detalles.append(crearAnillos(d.resumenAnillos));
  const partes = [
    seccion(t("modo.cercanosSede"), d.cercanos, () => crearCercanos(d.cercanos)),
    seccion(t("modo.servicios"), d.conteos, () => crearServicios(d.conteos)),
    seccion(t("modo.impulsaCcieb"), d.iniciativas, () => crearIniciativas(d.iniciativas)),
  ];
  for (const parte of partes) if (parte) detalles.append(parte);
  panel.append(detalles);
  return panel;
}

// --- Acceso desde la vista nacional ------------------------------------------

function crearAcceso() {
  const boton = nodo(
    "button",
    `${BOTON} pointer-events-auto bg-shell/90 shadow-lg shadow-black/30 backdrop-blur self-start`,
    t("modo.verCiudad"),
    { type: "button", id: "btn-ver-ciudad" }
  );
  boton.addEventListener("click", () => estado.alEntrar?.());
  return boton;
}

// --- API ---------------------------------------------------------------------

/**
 * La llama ui.js al final de montarUI(): las ranuras se recrean al cambiar de
 * idioma. Pinta cabecera y panel si el modo esta montado; si no, el acceso
 * "Ver Ciudad Bolivar" si hay callback registrado. Sin ranuras, no hace nada.
 */
export function repintarModoCiudadBolivar() {
  const ranura = document.getElementById("ranura-modo");
  const ranuraPanel = document.getElementById("ranura-panel-modo");
  ranura?.replaceChildren();
  ranuraPanel?.replaceChildren();
  if (estado.montado) {
    ranura?.append(crearCabecera());
    ranuraPanel?.append(crearPanel());
  } else if (estado.alEntrar && !estado.accesoOculto) {
    ranura?.append(crearAcceso());
  }
}

/**
 * Monta cabecera (RF-16) y panel (RF-15) en las ranuras de ui.js; quita el acceso.
 * @param {DatosModo & {alSalir: () => void, alVerEnMapa: (id: string) => void}} opciones
 */
export function montarModoCiudadBolivar({ resumenAnillos = null, totalCampos = null, cercanos = null, conteos = null, iniciativas = null, reglaRio = null, alSalir, alVerEnMapa }) {
  estado.datos = { resumenAnillos, totalCampos, cercanos, conteos, iniciativas, reglaRio };
  estado.alSalir = alSalir ?? null;
  estado.alVerEnMapa = alVerEnMapa ?? null;
  estado.montado = true;
  repintarModoCiudadBolivar();
}

/**
 * Datos que llegan tarde (capas por red). `undefined` = sin cambios.
 * @param {Partial<DatosModo>} parcial
 */
export function actualizarModoCiudadBolivar(parcial) {
  for (const clave of CLAVES_DATOS) {
    if (parcial?.[clave] !== undefined) estado.datos[clave] = parcial[clave];
  }
  if (estado.montado) repintarModoCiudadBolivar();
}

/** Quita cabecera y panel; si hay acceso registrado, muestra "Ver Ciudad Bolivar". */
export function desmontarModoCiudadBolivar() {
  estado.montado = false;
  repintarModoCiudadBolivar();
}

/**
 * RF-6. Registra el callback del boton "Ver Ciudad Bolivar" (vista nacional).
 * Una vez, al arrancar.
 * @param {() => void} alEntrar
 */
export function registrarAccesoCiudadBolivar(alEntrar) {
  estado.alEntrar = alEntrar;
  repintarModoCiudadBolivar();
}

/** RF-127. Oculta (o devuelve) "Ver Ciudad Bolivar" mientras hay recorrido. */
export function ocultarAccesoCiudadBolivar(oculto) {
  estado.accesoOculto = Boolean(oculto);
  repintarModoCiudadBolivar();
}
