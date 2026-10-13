/**
 * vista.js — DOM del micrositio. Sin fetch y sin cesium: los datos llegan desde
 * main.js. Todo texto entra por textContent; el contenido del evento va con
 * lang="es" y sin traducir (RF-76).
 */

import { t, idioma, cambiarIdioma } from "../i18n/index.js";
import { ORIGEN_CCIEB, REPO, URL_MAPA_CIUDAD } from "../config.js";
import { crearReglaRio } from "../ui/reglaRio.js";
import {
  cuentaRegresiva,
  diaInicial,
  enCurso,
  estadoEvento,
  exposicionEnCurso,
  generarIcs,
  horaEvento,
  proximaSesion,
  sesionActual,
} from "./agenda.js";

/** Logos del evento (kit autorizado: public/expofaja/marcas/AVISO.md). */
const LOGO_EXPOFAJA = { src: "/expofaja/marcas/expofaja-sobre-oscuro.webp", w: 686, h: 238 };
const LOGO_CCIEB = { src: "/expofaja/marcas/ccieb.webp", w: 256, h: 256 };
const LOGO_ALCALDIA = { src: "/expofaja/marcas/alcaldia-angostura-del-orinoco.webp", w: 300, h: 168 };
const MAPA_IMG = { src: "/expofaja/mapa.webp", w: 1200, h: 675 }; // Captura del modo Ciudad Bolivar (E1), 1200x675 WebP, 2026-10-13
const MAX_NOTICIAS = 4;

/** Estado de la vista montada. */
const est = { datos: null, reglaRio: null, embed: false, ahora: new Date(), dia: null, ponentes: new Map(), refs: {}, sesiones: [] };

// --- Utilidades de DOM --------------------------------------------------------

function el(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined && texto !== null) nodo.textContent = texto;
  return nodo;
}

/** Marca un nodo como contenido del evento: espanol, sin traducir. */
function contenido(nodo) {
  nodo.lang = "es";
  return nodo;
}

function textoEs(etiqueta, clase, texto) {
  return contenido(el(etiqueta, clase, texto));
}

function soloAncla(id) {
  return String(id).replace(/[^a-z0-9-]/gi, "-");
}

function reducido() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** href permitido: ruta propia, ancla, mailto o http(s). Cualquier otro -> null. */
function seguro(href) {
  if (typeof href !== "string") return null;
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:")) return href;
  try {
    const { protocol } = new URL(href);
    return protocol === "https:" || protocol === "http:" ? href : null;
  } catch {
    return null;
  }
}

/** Lleva la vista a un id y le da el foco (para teclado y lectores). */
function ir(id) {
  const destino = document.getElementById(id);
  if (!destino) return;
  destino.scrollIntoView({ behavior: reducido() ? "auto" : "smooth", block: "start" });
  if (destino.tabIndex < 0) destino.tabIndex = -1;
  destino.focus({ preventScroll: true });
}

/**
 * Enlace con las reglas de RF-62/65: ancla -> se queda en la pagina; en embed,
 * al tope; fuera de embed, los externos en pestana nueva sin opener.
 */
function enlace(href, texto, clase) {
  const a = el("a", clase, texto);
  const destino = seguro(href);
  if (!destino) return el("span", clase, texto);
  a.href = destino;
  if (destino.startsWith("#")) {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      ir(destino.slice(1));
    });
    return a;
  }
  if (destino.startsWith("mailto:")) return a;
  a.rel = "noopener noreferrer";
  if (est.embed) a.target = "_top";
  else if (new URL(destino, location.href).origin !== location.origin) a.target = "_blank";
  return a;
}

/** Texto con sus URL convertidas en enlaces (las fuentes traen la URL dentro). */
function conEnlaces(texto) {
  const frag = document.createDocumentFragment();
  for (const parte of String(texto).split(/(https?:\/\/\S+)/)) {
    if (/^https?:\/\//.test(parte)) frag.append(enlace(parte.replace(/[.,;)]+$/, ""), parte.replace(/[.,;)]+$/, ""), "ef-url"));
    else if (parte) frag.append(parte);
  }
  return frag;
}

function lugarLocal() {
  return idioma() === "en" ? "en" : "es";
}

function formatoFecha(fecha, opciones) {
  return new Intl.DateTimeFormat(lugarLocal(), { timeZone: "UTC", ...opciones }).format(new Date(`${fecha}T12:00:00Z`));
}

function nombreCompleto(p) {
  return `${p.titulo ?? ""} ${p.nombre}`.trim();
}

function iniciales(nombre) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toUpperCase())
    .join("");
}

/** "/expofaja/..." a partir de una ruta "public/expofaja/..." de las semillas. */
function rutaPublica(ruta) {
  return typeof ruta === "string" ? `/${ruta.replace(/^public\//, "")}` : null;
}

function seccion(id, titulo, clase = "") {
  const s = el("section", `ef-seccion ${clase}`.trim());
  s.id = id;
  s.setAttribute("aria-labelledby", `${id}-h`);
  const h = el("h2", "ef-h2", titulo);
  h.id = `${id}-h`;
  s.append(h);
  return s;
}

function noDisponible() {
  return el("p", "ef-aviso", t("expofaja.noDisponible"));
}

// --- Seccion 2: Ahora / Siguiente ----------------------------------------------

function filaSesion({ dia, sesion }, conDia) {
  const fila = el("div", "ef-fila");
  const hora = `${sesion.inicio}–${sesion.fin}`;
  const cabecera = conDia ? `${formatoFecha(dia.fecha, { weekday: "short", day: "numeric" })} · ${hora}` : hora;
  const linea = el("p", "ef-fila-meta");
  linea.append(el("strong", "ef-hora", cabecera));
  if (sesion.sala) linea.append(" · ", textoEs("span", "", sesion.sala));
  fila.append(linea, textoEs("p", "ef-fila-titulo", sesion.titulo));
  const p = sesion.ponente_id ? est.ponentes.get(sesion.ponente_id) : null;
  if (p) fila.append(textoEs("p", "ef-fila-ponente", nombreCompleto(p)));
  return fila;
}

function bloqueEtiquetado(etiqueta, hijos) {
  const b = el("div", "ef-bloque");
  b.append(el("h3", "ef-etiqueta", etiqueta), ...hijos);
  return b;
}

function pintarAhora(ahora) {
  const { agenda } = est.datos;
  const estado = estadoEvento(agenda, ahora);
  const partes = [];
  if (estado === "antes") {
    const c = cuentaRegresiva(agenda, ahora);
    if (c) partes.push(el("p", "ef-cuenta", t("expofaja.cuentaRegresiva", { dias: c.dias, horas: c.horas, minutos: c.minutos })));
    const abre = proximaSesion(agenda, ahora);
    if (abre) partes.push(bloqueEtiquetado(t("expofaja.abreCon"), [filaSesion(abre, true)]));
  } else if (estado === "durante") {
    const actuales = sesionActual(agenda, ahora).map((s) => filaSesion(s, false));
    const expo = exposicionEnCurso(agenda, ahora);
    if (actuales.length === 0) actuales.push(el("p", "ef-vacio", t("expofaja.sinSesiones")));
    if (expo) actuales.push(el("p", "ef-expo", t("expofaja.exposicionAbierta", { hora: expo.sesion.fin })));
    partes.push(bloqueEtiquetado(t("expofaja.ahora"), actuales));
    const sig = proximaSesion(agenda, ahora);
    partes.push(bloqueEtiquetado(t("expofaja.siguiente"), [sig ? filaSesion(sig, true) : el("p", "ef-vacio", t("expofaja.sinSiguiente"))]));
  } else {
    partes.push(el("p", "ef-cuenta", t("expofaja.terminoEvento")));
  }
  est.refs.hora.textContent = t("expofaja.horaCaracas", { hora: horaEvento(ahora) });
  est.refs.cuerpoAhora.replaceChildren(...partes);
}

function crearAhora() {
  const s = el("section", "ef-ahora");
  s.id = "ahora";
  s.setAttribute("aria-labelledby", "ahora-h");
  const h = el("h2", "ef-sr", t("expofaja.ahoraSiguiente"));
  h.id = "ahora-h";
  est.refs.hora = el("p", "ef-reloj");
  est.refs.cuerpoAhora = el("div", "ef-ahora-cuerpo");
  est.refs.cuerpoAhora.setAttribute("aria-live", "polite");
  s.append(h, est.refs.hora, est.refs.cuerpoAhora);
  return s;
}

// --- Seccion 1: cabecera -------------------------------------------------------

function textoFechas(fechas) {
  const [ini, fin] = [fechas.inicio, fechas.fin];
  const mes = (f) => formatoFecha(f, { month: "long" });
  if (mes(ini) === mes(fin) && ini.slice(0, 4) === fin.slice(0, 4)) {
    return t("expofaja.fechas", {
      inicio: formatoFecha(ini, { day: "numeric" }),
      fin: formatoFecha(fin, { day: "numeric" }),
      mes: mes(ini),
      anio: ini.slice(0, 4),
    });
  }
  const completa = { day: "numeric", month: "long", year: "numeric" };
  return t("expofaja.fechasDistintas", { inicio: formatoFecha(ini, completa), fin: formatoFecha(fin, completa) });
}

function botonIdioma() {
  const otro = idioma() === "es" ? "en" : "es";
  const b = el("button", "ef-idioma", otro.toUpperCase());
  b.type = "button";
  b.lang = otro;
  b.setAttribute("aria-label", t("expofaja.idioma"));
  b.addEventListener("click", () => {
    cambiarIdioma(otro);
    est.alCambiarIdioma?.(otro);
  });
  return b;
}

function fraseCampos() {
  const r = est.datos.resumen;
  if (!r) return null;
  const mayor = r.anillos.reduce((a, b) => (b.km > a.km ? b : a));
  const p = el("p", "ef-frase", `${t("modo.frasePrincipal", { n: mayor.campos, total: r.total_campos, km: mayor.km })}. `);
  p.append(enlace("#ciudad-bolivar", t("expofaja.irDatos"), "ef-enlace-claro"));
  return p;
}

function crearCabecera() {
  const { evento } = est.datos;
  const h = el("header", "ef-hero ef-oscuro");
  const barra = el("div", "ef-barra");
  barra.append(el("span", "ef-orinoco", "Orinoco Digital ×"), botonIdioma());
  const h1 = el("h1", "ef-logo");
  const img = el("img");
  Object.assign(img, { src: LOGO_EXPOFAJA.src, width: LOGO_EXPOFAJA.w, height: LOGO_EXPOFAJA.h, alt: evento.nombre });
  img.lang = "es";
  h1.append(img);
  const orgs = evento.organizadores.map((o) => o.sigla ?? o.nombre).join(" · ");
  const organizan = el("p", "ef-organizan", `${t("expofaja.organizan")} `);
  organizan.append(textoEs("span", "", orgs));
  const botones = el("div", "ef-botones");
  botones.append(enlace(URL_MAPA_CIUDAD, t("expofaja.ver3d"), "ef-btn ef-btn-primario"), enlace("#agenda", t("expofaja.verAgenda"), "ef-btn ef-btn-secundario"));
  h.append(
    barra,
    h1,
    el("p", "ef-fechas", textoFechas(evento.fechas)),
    textoEs("p", "ef-sede", `${evento.sede.nombre}, ${evento.sede.ciudad}`),
    organizan,
    crearAhora(),
    botones,
  );
  const frase = fraseCampos();
  if (frase) h.append(frase);
  return h;
}

// --- Seccion 3: agenda ---------------------------------------------------------

function descargarIcs(dia, sesion) {
  const p = sesion.ponente_id ? est.ponentes.get(sesion.ponente_id) : undefined;
  const ics = generarIcs(sesion, dia, p, new Date(), est.datos.evento);
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = el("a");
  a.href = url;
  a.download = `expofaja-${dia.fecha}-${sesion.inicio.replace(":", "")}.ics`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function idSesion(dia, i) {
  return `sesion-${dia.fecha}-${i}`;
}

function crearSesion(dia, sesion, i) {
  const li = el("li", `ef-sesion ef-tipo-${soloAncla(sesion.tipo)}`);
  li.id = idSesion(dia, i);
  const meta = el("p", "ef-sesion-meta");
  const hora = sesion.inicio ? `${sesion.inicio}–${sesion.fin}` : t("expofaja.horaPorConfirmar");
  const badge = el("span", "ef-ahora-etiqueta", t("expofaja.ahora"));
  badge.hidden = true;
  meta.append(el("strong", "ef-hora", hora), " ", badge);
  const sub = el("p", "ef-sesion-sub");
  const tipo = el("span", "ef-tipo", t(`expofaja.tipo.${sesion.tipo}`));
  sub.append(tipo);
  if (sesion.sala) sub.append(" · ", textoEs("span", "", sesion.sala));
  li.append(meta, sub, textoEs("p", "ef-sesion-titulo", sesion.titulo));
  const p = sesion.ponente_id ? est.ponentes.get(sesion.ponente_id) : null;
  if (p) {
    const linea = el("p", "ef-sesion-ponente");
    linea.append(enlace(`#ponente-${soloAncla(p.id)}`, nombreCompleto(p), "ef-enlace"));
    contenido(linea);
    li.append(linea);
  }
  if (sesion.inicio) {
    const b = el("button", "ef-btn ef-btn-calendario", t("expofaja.agregarCalendario"));
    b.type = "button";
    b.setAttribute("aria-label", t("expofaja.agregarCalendarioAria", { titulo: sesion.titulo }));
    b.addEventListener("click", () => descargarIcs(dia, sesion));
    li.append(b);
  }
  est.sesiones.push({ dia, sesion, badge });
  return li;
}

function seleccionarDia(i, foco) {
  est.dia = i;
  est.refs.pestanas.forEach((tab, k) => {
    const activa = k === i;
    tab.setAttribute("aria-selected", String(activa));
    tab.tabIndex = activa ? 0 : -1;
    est.refs.paneles[k].hidden = !activa;
  });
  if (foco) est.refs.pestanas[i].focus();
}

function alTeclearPestana(e) {
  const n = est.refs.pestanas.length;
  const claves = { ArrowRight: (est.dia + 1) % n, ArrowLeft: (est.dia + n - 1) % n, Home: 0, End: n - 1 };
  if (!(e.key in claves)) return;
  e.preventDefault();
  seleccionarDia(claves[e.key], true);
}

function crearAgenda() {
  const { agenda } = est.datos;
  const s = seccion("agenda", t("expofaja.agenda.titulo"));
  const lista = el("div", "ef-pestanas");
  lista.setAttribute("role", "tablist");
  lista.setAttribute("aria-label", t("expofaja.agenda.dias"));
  est.refs.pestanas = [];
  est.refs.paneles = [];
  const paneles = [];
  agenda.dias.forEach((dia, i) => {
    const tab = el("button", "ef-pestana", formatoFecha(dia.fecha, { weekday: "short", day: "numeric" }));
    Object.assign(tab, { type: "button", id: `ef-tab-${i}` });
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", `ef-panel-${i}`);
    tab.addEventListener("click", () => seleccionarDia(i, false));
    tab.addEventListener("keydown", alTeclearPestana);
    const panel = el("div", "ef-panel");
    Object.assign(panel, { id: `ef-panel-${i}` });
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tab.id);
    const cab = el("div", "ef-panel-cab");
    cab.append(textoEs("h3", "ef-h3", dia.nombre));
    if (dia.eje) cab.append(textoEs("p", "ef-eje", dia.eje));
    const ul = el("ul", "ef-sesiones");
    ul.append(...dia.sesiones.map((ses, k) => crearSesion(dia, ses, k)));
    panel.append(cab, ul);
    lista.append(tab);
    est.refs.pestanas.push(tab);
    est.refs.paneles.push(panel);
    paneles.push(panel);
  });
  const pie = el("p", "ef-nota", t("expofaja.agenda.nota"));
  const fuente = el("p", "ef-nota");
  fuente.append(t("expofaja.agenda.fuente", { fuente: agenda.fuente, fecha: agenda.ultima_verificacion }));
  contenido(fuente);
  s.append(lista, ...paneles, pie, fuente);
  seleccionarDia(Math.min(est.dia ?? diaInicial(agenda, est.ahora), agenda.dias.length - 1), false);
  return s;
}

// --- Seccion 4: ponentes ---------------------------------------------------------

/** Ponentes visibles en el orden de su primera aparicion en el programa (RF-35). */
function ponentesEnOrden() {
  const vistos = new Set();
  const salida = [];
  for (const dia of est.datos.agenda.dias) {
    for (const s of dia.sesiones) {
      const p = s.ponente_id ? est.ponentes.get(s.ponente_id) : null;
      if (p && p.en_programa === true && !vistos.has(p.id)) {
        vistos.add(p.id);
        salida.push(p);
      }
    }
  }
  return salida;
}

function avatar(p) {
  const a = el("div", "ef-avatar", iniciales(p.nombre));
  a.setAttribute("aria-hidden", "true");
  return a;
}

function fotoPonente(p) {
  const ruta = rutaPublica(p.foto);
  if (!ruta) return avatar(p);
  const img = el("img", "ef-foto");
  Object.assign(img, { src: ruta, width: 96, height: 96, loading: "lazy", alt: t("expofaja.fotoDe", { nombre: p.nombre }) });
  img.addEventListener("error", () => img.replaceWith(avatar(p)), { once: true });
  return img;
}

function sesionesDePonente(p) {
  const ul = el("ul", "ef-lista-sesiones");
  est.datos.agenda.dias.forEach((dia, i) => {
    dia.sesiones.forEach((s, k) => {
      if (s.ponente_id !== p.id) return;
      const li = el("li");
      const b = el("button", "ef-sesion-enlace");
      b.type = "button";
      const dc = formatoFecha(dia.fecha, { weekday: "short", day: "numeric" });
      b.append(el("strong", "", `${dc} · ${s.inicio ?? t("expofaja.horaPorConfirmar")}`), " ", textoEs("span", "", s.titulo));
      b.addEventListener("click", () => {
        seleccionarDia(i, false);
        ir(idSesion(dia, k));
      });
      li.append(b);
      ul.append(li);
    });
  });
  return ul;
}

function perfilPonente(p) {
  const bloque = el("div", "ef-perfil");
  if (p.perfil === "[perfil_pendiente]") {
    bloque.append(el("p", "ef-perfil-texto ef-suave", t("expofaja.perfilPendiente")));
    return bloque;
  }
  bloque.append(textoEs("p", "ef-perfil-texto", p.perfil), el("p", "ef-atribucion", t("expofaja.perfilAtribucion")));
  if (Array.isArray(p.fuentes) && p.fuentes.length > 0) {
    const det = el("details", "ef-fuentes");
    det.append(el("summary", "", t("expofaja.fuentes")));
    const ul = el("ul");
    for (const f of p.fuentes) {
      const li = contenido(el("li"));
      li.append(conEnlaces(f));
      ul.append(li);
    }
    det.append(ul);
    bloque.append(det);
  }
  return bloque;
}

function tarjetaPonente(p) {
  const a = el("article", "ef-tarjeta-ponente");
  a.id = `ponente-${soloAncla(p.id)}`;
  const cab = el("div", "ef-ponente-cab");
  cab.append(fotoPonente(p), textoEs("h3", "ef-h3", nombreCompleto(p)));
  const sesiones = sesionesDePonente(p);
  a.append(cab, perfilPonente(p), el("p", "ef-etiqueta", t("expofaja.sesiones")), sesiones);
  return a;
}

function crearPonentes() {
  const s = seccion("ponentes", t("expofaja.ponentes.titulo"));
  s.append(el("p", "ef-nota", t("expofaja.ponentes.orden")));
  const rejilla = el("div", "ef-rejilla-ponentes");
  rejilla.append(...ponentesEnOrden().map(tarjetaPonente));
  s.append(rejilla);
  return s;
}

// --- Seccion 5: por que Ciudad Bolivar -----------------------------------------

function claveGrupo(clave) {
  const k = `expofaja.ciudad.grupo.${clave}`;
  const texto = t(k);
  return texto === k ? clave.replaceAll("_", " ") : texto;
}

function columnaOrganizador() {
  const { evento } = est.datos;
  const col = el("div", "ef-col");
  col.append(el("h3", "ef-h3", t("expofaja.ciudad.organizador")), el("p", "ef-atribucion", t("expofaja.ciudad.afirmaciones")));
  const por = evento.por_que_ciudad_bolivar;
  for (const [clave, lista] of Object.entries(por)) {
    if (!Array.isArray(lista)) continue;
    const grupo = el("div", "ef-grupo");
    grupo.append(el("h4", "ef-h4", claveGrupo(clave)));
    const ul = el("ul", "ef-lista");
    ul.append(...lista.map((x) => textoEs("li", "", x)));
    grupo.append(ul);
    col.append(grupo);
  }
  col.append(textoEs("p", "ef-fuente", t("expofaja.ciudad.fuente", { fuente: por.fuente })), cifrasOrganizador());
  return col;
}

function cifrasOrganizador() {
  const { cifras_organizador: c } = est.datos.evento;
  const caja = el("div", "ef-cifras");
  caja.append(el("h4", "ef-h4", t("expofaja.cifras.titulo")), el("p", "ef-aviso", t("expofaja.cifras.aviso")));
  const lista = el("dl", "ef-cifras-lista");
  for (const it of c.items) {
    const item = el("div", "ef-cifra");
    item.append(textoEs("dt", "ef-cifra-etiqueta", it.etiqueta), textoEs("dd", "ef-cifra-valor", it.valor));
    const f = contenido(el("dd", "ef-fuente"));
    f.append(conEnlaces(t("expofaja.ciudad.fuente", { fuente: it.fuente })));
    item.append(f);
    if (it.contraste) {
      const cc = el("dd", "ef-contraste");
      cc.append(el("strong", "", `${t("expofaja.cifras.contraste")}: `), textoEs("span", "", it.contraste));
      item.append(cc);
    }
    lista.append(item);
  }
  caja.append(lista);
  return caja;
}

function anillosBarras(r) {
  const ul = el("ul", "ef-anillos");
  for (const a of r.anillos) {
    const li = el("li", "ef-anillo");
    const barra = el("span", "ef-barra-anillo");
    barra.style.width = `${Math.round((a.campos / r.total_campos) * 100)}%`;
    barra.setAttribute("aria-hidden", "true");
    li.append(el("span", "ef-anillo-texto", t("modo.anillo", { km: a.km, n: a.campos })), barra);
    ul.append(li);
  }
  return ul;
}

function camposCercanos(r) {
  const ul = el("ul", "ef-lista ef-cercanos");
  for (const c of r.campos_mas_cercanos.slice(0, 5)) {
    const li = el("li");
    const nivel = t(`expofaja.confianza.${c.confianza}`);
    li.append(textoEs("strong", "", c.nombre), ` — ${t("ciudad.kmLineaRecta", { km: c.km })}`);
    if (c.confianza) li.append(el("span", "ef-suave", ` · ${t("expofaja.datos.confianza", { nivel })}`));
    ul.append(li);
  }
  return ul;
}

function serviciosPorClase(r) {
  const ul = el("ul", "ef-servicios");
  for (const [clase, n] of Object.entries(r.servicios_por_clase)) {
    const k = `ciudad.clase.${clase}`;
    const rotulo = t(k) === k ? clase : t(k);
    ul.append(el("li", "", `${rotulo}: ${n}`));
  }
  return ul;
}

function columnaDatos() {
  const r = est.datos.resumen;
  const col = el("div", "ef-col");
  col.append(el("h3", "ef-h3", t("expofaja.datos.titulo")));
  if (!r) {
    col.append(el("p", "ef-aviso", t("expofaja.datos.noDisponible")), enlace(URL_MAPA_CIUDAD, t("expofaja.ver3d"), "ef-btn ef-btn-azul"));
    return col;
  }
  const mayor = r.anillos.reduce((a, b) => (b.km > a.km ? b : a));
  col.append(
    el("p", "ef-frase-dato", t("modo.frasePrincipal", { n: mayor.campos, total: r.total_campos, km: mayor.km })),
    el("h4", "ef-h4", t("expofaja.datos.anillos")),
    anillosBarras(r),
    el("h4", "ef-h4", t("modo.cercanosSede")),
    camposCercanos(r),
    el("p", "ef-nota", t("ciudad.lineaRecta")),
    el("h4", "ef-h4", t("modo.servicios")),
    serviciosPorClase(r),
    el("h4", "ef-h4", t("expofaja.datos.metodo")),
    textoEs("p", "ef-nota", r.metodo),
    el("h4", "ef-h4", t("expofaja.datos.fuentes")),
  );
  const fuentes = el("ul", "ef-lista");
  fuentes.append(...r.fuentes.map((f) => textoEs("li", "", f)));
  col.append(fuentes, el("p", "ef-nota", t("expofaja.datos.calculado", { fecha: r.generado ?? "" })));
  return col;
}

function iniciativasCcieb() {
  const caja = el("div", "ef-iniciativas");
  caja.append(el("h3", "ef-h3", t("modo.impulsaCcieb")), el("p", "ef-atribucion", t("ciudad.contenidoOrganizador")));
  const { iniciativas } = est.datos;
  if (!iniciativas) {
    caja.append(noDisponible());
    return caja;
  }
  const ul = el("ul", "ef-tarjetas");
  for (const i of iniciativas.iniciativas) {
    const li = el("li", "ef-tarjeta");
    li.append(textoEs("h4", "ef-h4", i.nombre), textoEs("p", "", i.resumen));
    if (i.fecha_fuente) li.append(el("p", "ef-nota", `${t("ciudad.fecha")}: ${formatoFecha(i.fecha_fuente, { day: "numeric", month: "long", year: "numeric" })}`));
    li.append(enlace(i.fuente, t("modo.notaPrensa"), "ef-enlace"));
    ul.append(li);
  }
  caja.append(ul);
  return caja;
}

/**
 * Separador entre secciones (ADR-021): la regla del rio en ef-azul, nunca en la
 * tinta del mapa. Decorativo; sin regla (null) no se pinta nada.
 * @returns {HTMLElement|null}
 */
function crearSeparadorRegla() {
  if (!est.reglaRio) return null;
  const caja = el("div", "ef-regla");
  caja.append(crearReglaRio(est.reglaRio));
  return caja;
}

function crearCiudad() {
  const s = seccion("ciudad-bolivar", t("expofaja.ciudad.titulo"));
  const dos = el("div", "ef-dos-columnas");
  dos.append(columnaOrganizador(), columnaDatos());
  s.append(dos, iniciativasCcieb());
  return s;
}

// --- Seccion 6: el mapa ----------------------------------------------------------

function crearMapa() {
  const s = seccion("mapa", t("expofaja.mapa.titulo"));
  s.append(el("p", "", t("expofaja.mapa.intro")));
  const img = el("img", "ef-mapa-img");
  Object.assign(img, { src: MAPA_IMG.src, width: MAPA_IMG.w, height: MAPA_IMG.h, loading: "lazy", alt: t("expofaja.mapa.alt") });
  img.addEventListener("error", () => img.remove(), { once: true });
  const idSede = est.datos.evento.sede.id_mapa;
  const href = idSede ? `${URL_MAPA_CIUDAD}&vuelo=${encodeURIComponent(idSede)}` : URL_MAPA_CIUDAD;
  s.append(img, enlace(href, t("expofaja.mapa.boton"), "ef-btn ef-btn-azul"));
  return s;
}

// --- Seccion 7: aliados ----------------------------------------------------------

/** Logo publicable de un aliado segun el manifiesto, o null. */
function logoDe(nombre, manifiesto, base) {
  if (base) return base;
  const m = manifiesto.items.find((x) => x.nombre === nombre && typeof x.publicable === "string");
  if (!m) return null;
  const [w, h] = m.publicable_px ?? [120, 80];
  return { src: rutaPublica(m.publicable), w, h };
}

function tarjetaAliado(nombre, logo, rubro) {
  const li = el("li", "ef-aliado");
  const caja = contenido(el("div", "ef-aliado-caja"));
  const texto = () => {
    const p = el("span", "ef-aliado-nombre", nombre);
    return p;
  };
  if (logo) {
    const img = el("img", "ef-aliado-logo");
    Object.assign(img, { src: logo.src, width: logo.w, height: logo.h, loading: "lazy", alt: nombre });
    img.addEventListener("error", () => img.replaceWith(texto()), { once: true });
    caja.append(img);
  } else {
    caja.append(texto());
  }
  li.append(caja);
  if (rubro) li.append(textoEs("span", "ef-aliado-rubro", rubro));
  return li;
}

function crearAliados() {
  const s = seccion("aliados", t("expofaja.aliados.titulo"));
  const { aliados, manifiesto } = est.datos;
  if (!aliados || !manifiesto) {
    s.append(noDisponible());
    return s;
  }
  const ul = el("ul", "ef-muro");
  for (const a of aliados.institucionales ?? []) {
    if (a.nombre_confirmado === false) continue;
    const base = /Cámara de Comercio/.test(a.nombre) ? LOGO_CCIEB : null;
    ul.append(tarjetaAliado(a.nombre, logoDe(a.nombre, manifiesto, base), a.rubro));
  }
  for (const a of aliados.aliados_comerciales ?? []) {
    if (a.nombre_confirmado !== true) continue;
    ul.append(tarjetaAliado(a.nombre, logoDe(a.nombre, manifiesto, null), null));
  }
  s.append(ul);
  return s;
}

// --- Seccion 8: participa --------------------------------------------------------

function tarjetaParticipa(titulo, texto, enlaces, correo) {
  const li = el("li", "ef-tarjeta");
  li.append(el("h3", "ef-h3", titulo), el("p", "", texto));
  if (correo) li.append(enlace(`mailto:${correo}`, correo, "ef-enlace ef-correo"));
  for (const [href, rotulo] of enlaces) li.append(enlace(href, rotulo, "ef-enlace"));
  return li;
}

function urlDeBolsaEmpleo(evento) {
  const it = evento.iniciativas_anunciadas.find((x) => /Bolsa de Empleo/.test(x.nombre));
  return it?.fuente.match(/https?:\/\/\S+/)?.[0] ?? null;
}

function crearParticipa() {
  const { evento } = est.datos;
  const s = seccion("participa", t("expofaja.participa.titulo"));
  s.append(el("p", "ef-aviso", t("expofaja.participa.aviso")));
  const pagina = evento.ccieb.pagina_evento;
  const ul = el("ul", "ef-tarjetas");
  ul.append(
    tarjetaParticipa(t("expofaja.participa.asistir"), t("expofaja.participa.asistirTexto"), [[`${pagina}#formregexpofaja2026`, t("expofaja.participa.asistirEnlace")]]),
    tarjetaParticipa(t("expofaja.participa.ponencia"), t("expofaja.participa.ponenciaTexto"), [], evento.contactos_evento.propuestas_ponencias),
    tarjetaParticipa(t("expofaja.participa.patrocinio"), t("expofaja.participa.patrocinioTexto"), [[pagina, t("expofaja.participa.patrocinioEnlace")]], evento.contactos_evento.patrocinio),
  );
  const empleo = urlDeBolsaEmpleo(evento);
  if (empleo) ul.append(tarjetaParticipa(t("expofaja.participa.empleo"), t("expofaja.participa.empleoTexto"), [[empleo, t("expofaja.participa.empleoEnlace")]]));
  s.append(ul);
  return s;
}

// --- Seccion 9: noticias ---------------------------------------------------------

function crearNoticias() {
  const s = seccion("noticias", t("expofaja.noticias.titulo"));
  const { noticias } = est.datos;
  if (!noticias) {
    s.append(noDisponible());
    return s;
  }
  const items = [...noticias.items].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, MAX_NOTICIAS);
  const ul = el("ul", "ef-noticias");
  for (const n of items) {
    const li = el("li", "ef-noticia");
    li.append(el("span", "ef-noticia-fecha", formatoFecha(n.fecha, { day: "numeric", month: "long", year: "numeric" })), " ");
    const a = enlace(n.url, n.titulo, "ef-enlace");
    contenido(a);
    li.append(a);
    ul.append(li);
  }
  s.append(ul);
  return s;
}

// --- Seccion 10: pie -------------------------------------------------------------

function avisoIndependencia() {
  return el("p", "ef-pie-aviso", t("expofaja.pie.aviso"));
}

function logoPie(logo, alt, clase) {
  const img = el("img", clase);
  Object.assign(img, { src: logo.src, width: logo.w, height: logo.h, loading: "lazy", alt });
  return img;
}

function crearPie() {
  const pie = el("footer", "ef-pie ef-oscuro");
  const orgs = el("div", "ef-pie-orgs");
  orgs.append(el("span", "", t("expofaja.organizan")), logoPie(LOGO_CCIEB, "CCIEB", "ef-pie-logo ef-pie-sello"), logoPie(LOGO_ALCALDIA, "Alcaldía de Angostura del Orinoco", "ef-pie-logo"));
  const codigo = el("p", "ef-pie-texto");
  codigo.append(enlace(REPO, t("expofaja.pie.codigo"), "ef-enlace-claro"));
  pie.append(
    avisoIndependencia(),
    orgs,
    el("h2", "ef-pie-h", t("expofaja.pie.fuentes")),
    el("p", "ef-pie-texto", t("expofaja.pie.fuentesTexto")),
    codigo,
    el("p", "ef-pie-texto", t("expofaja.pie.marcas")),
    el("p", "ef-pie-texto", t("expofaja.pie.autor")),
  );
  return pie;
}

function crearFinEmbed() {
  const fin = el("div", "ef-embed-fin");
  fin.append(avisoIndependencia(), enlace("/expofaja/", t("expofaja.embed.abrir"), "ef-btn ef-btn-azul"));
  return fin;
}

// --- API -------------------------------------------------------------------------

/**
 * Pinta la pagina completa (las 10 secciones) en el contenedor. Puede llamarse
 * otra vez al cambiar de idioma: conserva la pestana de dia elegida (RF-75).
 * @param {HTMLElement} contenedor
 * @param {Object} datos resultado de cargarDatosEvento
 * @param {{embed?: boolean, alCambiarIdioma?: Function, ahora?: Date}} opciones
 * @returns {void} efecto: reemplaza el contenido del contenedor
 */
export function montarVista(contenedor, datos, { embed = false, alCambiarIdioma, ahora = new Date(), reglaRio = null } = {}) {
  est.datos = datos;
  est.reglaRio = reglaRio;
  est.embed = embed;
  est.ahora = ahora;
  est.alCambiarIdioma = alCambiarIdioma;
  est.sesiones = [];
  est.ponentes = new Map(datos.ponentes.ponentes.map((p) => [p.id, p]));
  contenedor.classList.add("ef-pagina");
  const hijos = [];
  if (embed) {
    hijos.push(el("h1", "ef-sr", t("expofaja.titulo")), crearAhora());
  } else {
    hijos.push(crearCabecera());
  }
  const main = el("div", "ef-contenido");
  main.append(crearAgenda(), crearPonentes(), crearSeparadorRegla() ?? "", crearCiudad(), crearMapa(), crearAliados(), crearParticipa(), crearNoticias());
  hijos.push(main, embed ? crearFinEmbed() : crearPie());
  contenedor.replaceChildren(...hijos);
  actualizarTiempo(ahora);
}

/**
 * Repinta lo que depende de la hora: estado, Ahora, Siguiente, hora del evento,
 * cuenta regresiva y la etiqueta "Ahora" de la agenda (RF-22).
 * @param {Date} ahora instante actual (o el simulado con ?ahora=)
 * @returns {void}
 */
export function actualizarTiempo(ahora) {
  if (!est.datos) return;
  est.ahora = ahora;
  pintarAhora(ahora);
  for (const { dia, sesion, badge } of est.sesiones) {
    badge.hidden = !(sesion.tipo !== "exposicion" && enCurso(dia, sesion, ahora));
  }
}

/**
 * Muestra el error de carga con enlace a la pagina oficial y "Reintentar" (RF-3).
 * @param {HTMLElement} contenedor
 * @param {Error} error causa (se registra en consola; no se muestra al publico)
 * @returns {void} efecto: reemplaza el contenido del contenedor
 */
export function mostrarErrorCarga(contenedor, error) {
  void error;
  const caja = el("div", "ef-error");
  caja.setAttribute("role", "alert");
  const reintentar = el("button", "ef-btn ef-btn-azul", t("expofaja.error.reintentar"));
  reintentar.type = "button";
  reintentar.addEventListener("click", () => location.reload());
  caja.append(
    el("h2", "ef-h2", t("expofaja.error.titulo")),
    el("p", "", t("expofaja.error.texto")),
    enlace(`${ORIGEN_CCIEB}/expofaja/`, t("expofaja.error.oficial"), "ef-enlace"),
    reintentar,
  );
  contenedor.classList.add("ef-pagina");
  contenedor.replaceChildren(el("h1", "ef-h1-error", t("expofaja.titulo")), caja);
}
