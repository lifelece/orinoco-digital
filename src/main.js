/**
 * main.js — Punto de entrada. Solo orquesta: no contiene logica de dominio.
 */

import "./style.css";
import { conectarMapa } from "./puenteMapa.js";
import {
  montarUI,
  mostrarError,
  mostrarPanelActivo,
  fijarEstadoCapa,
  fijarDatosCapa,
  avisarCapasFallidas,
  refrescarCapas,
  montarBannerDemo,
  quitarBannerDemo,
  montarCargaInicial,
  quitarCargaInicial,
  fijarCapas,
  irAActivo,
  soltarVistas,
  fijarAccionVolarFaja,
} from "./ui.js";
import {
  montarModoCiudadBolivar,
  actualizarModoCiudadBolivar,
  desmontarModoCiudadBolivar,
  registrarAccesoCiudadBolivar,
} from "./ui/modoCiudadBolivar.js";
import {
  getCampos,
  getDuctos,
  getDownstream,
  getLimites,
  getZonaDisputada,
  getToponimia,
  getHidrografia,
  getCentrales,
  getGridProbabilidadDemo,
  getCiudadBolivar,
  getIniciativasCcieb,
  getListaIniciativasCcieb,
} from "./api.js";
// La regla del rio (ADR-021) no es una FeatureCollection, asi que no pasa por
// api.js (su contrato no cambia): se importa en el build, como la semilla de
// iniciativas. Sin fetch extra; la genera `npm run data:regla`.
import reglaRio from "../public/data/regla-rio.json";
import {
  tieneProcedencia,
  normalizarActivo,
  contarPorAnillo,
  contarPorClase,
  camposMasCercanos,
  circuloGeodesico,
  verticeMasCercano,
  posicionDe,
} from "./data.js";
import {
  DEFINICION_MODOS,
  MODOS,
  MODO_INICIAL,
  PORTADA_POR_FECHA,
  ORDEN_VUELO,
  CLASES_CIUDAD,
  ID_SEDE_EXPOFAJA,
} from "./config.js";
import { leerEnlace, resolverModo, urlDeModo, buscarActivo, modoInicialEn } from "./modos.js";
import { t, idioma } from "./i18n/index.js";

/**
 * Capas cuyo TEXTO depende del idioma, guardadas para poder redibujarlas al
 * cambiarlo sin volver a pedirlas por red. Los toponimos son dato bilingue del
 * propio GeoJSON, no cadenas de interfaz: no pasan por t().
 */
const contextoCargado = { toponimia: null, hidrografia: null };

/**
 * Colecciones ya cargadas, por clave de capa: null = cargando, false = fallo.
 * Las usan los datos del modo y `?vuelo=` (buscarActivo).
 * @type {Object<string, {features: Array<Object>}|null|false>}
 */
const colecciones = {
  campos: null,
  ductos: null,
  downstream: null,
  centrales: null,
  ciudadBolivar: null,
  iniciativasCcieb: null,
};

/**
 * Estado del modo, en un solo sitio. `capasPrevias` es lo que devolvio
 * fijarCapas al entrar: es lo que se restituye al salir. `sedeSeleccionada`
 * dice si las lineas de proximidad estan en pantalla (para re-etiquetarlas).
 * `vuelo` es el ?vuelo= pendiente (de un solo uso); `iniciativas`, la lista
 * del panel (null cargando, false fallo).
 */
const estado = {
  actual: null,
  capasPrevias: {},
  sedeSeleccionada: false,
  vuelo: null,
  iniciativas: null,
};

/**
 * Modulo `map.js`, cuando ya cargo (ADR-022). Es null mientras Cesium se
 * descarga: todo lo que dibuja en el globo espera a `mapaListo`.
 * @type {typeof import("./map.js")|null}
 */
let mapa = null;

/**
 * Promesa de `import("./map.js")`; se crea tras el primer pintado. Resuelve al
 * modulo, o a null si la descarga fallo (el error ya se mostro en la UI).
 * @type {Promise<typeof import("./map.js")|null>|null}
 */
let mapaListo = null;

/** Segmentos de cada anillo geodesico. */
const SEGMENTOS_ANILLO = 96;

/**
 * Regla del proyecto: un activo sin fuente no se dibuja.
 * @param {{features: Array<Object>}} coleccion
 * @param {string} etiqueta — para el aviso en consola
 * @returns {{type: "FeatureCollection", features: Array<Object>}}
 */
function soloConFuente(coleccion, etiqueta) {
  const features = coleccion.features.filter((f) =>
    tieneProcedencia(normalizarActivo(f.properties))
  );
  const descartados = coleccion.features.length - features.length;
  if (descartados > 0) {
    console.warn(`${descartados} de ${etiqueta} sin fuente: no se dibujan.`);
  }
  return { type: "FeatureCollection", features };
}

/**
 * Carga las capas de datos.
 *
 * El mapa arranca antes de que lleguen los datos: si la red falla, el usuario
 * se queda con un globo usable y un aviso, no con una pantalla en blanco.
 *
 * Cada capa se carga por separado a proposito: que falle una no puede dejar
 * sin las otras. Y cada una informa a la interfaz de su estado —cargando,
 * lista o con error— para que el control de capas diga cual falla en vez de
 * un aviso generico.
 */
async function cargarCapas() {
  // Los limites van primero: dan referencia espacial de inmediato aunque los
  // datos de activos tarden, y son el archivo mas ligero. La hidrografia va
  // antes que los activos porque el agua es el fondo sobre el que se lee todo.
  const capas = [
    ["limites", getLimites, (m, fc) => m.dibujarLimites(fc)],
    ["disputa", getZonaDisputada, (m, fc) => m.dibujarZonaDisputada(fc)],
    ["hidrografia", getHidrografia, (m, fc) => {
      contextoCargado.hidrografia = fc;
      // El idioma se lee al pintar, no al empezar a cargar: si el usuario lo
      // cambia mientras llega la capa, tiene que salir en el idioma nuevo.
      m.dibujarHidrografia(fc, idioma());
    }],
    ["toponimia", getToponimia, (m, fc) => {
      contextoCargado.toponimia = fc;
      m.dibujarToponimia(fc, idioma());
    }],
    ["campos", getCampos, (m, fc) => m.dibujarCampos(fc)],
    ["ductos", getDuctos, (m, fc) => m.dibujarDuctos(fc)],
    ["downstream", getDownstream, (m, fc) => m.dibujarDownstream(fc)],
    ["centrales", getCentrales, (m, fc) => m.dibujarCentrales(fc)],
    ["ciudadBolivar", getCiudadBolivar, (m, fc) => m.dibujarCiudadBolivar(fc)],
    ["iniciativasCcieb", getIniciativasCcieb, (m, fc) => m.dibujarIniciativas(fc)],
  ];

  for (const [clave] of capas) fijarEstadoCapa(clave, "cargando");

  const resultados = await Promise.allSettled(
    capas.map(async ([clave, cargar, pintar]) => {
      try {
        const coleccion = soloConFuente(await cargar(), clave);
        // La interfaz recibe los datos al llegar, sin esperar a Cesium...
        fijarDatosCapa(clave, coleccion);
        alLlegarColeccion(clave, coleccion);
        // ...y el globo los dibuja cuando map.js esta cargado (ADR-022).
        const m = await mapaListo;
        if (m) pintar(m, coleccion);
      } catch (error) {
        fijarEstadoCapa(clave, "error");
        alLlegarColeccion(clave, false);
        throw error;
      }
    })
  );

  const fallidas = [];
  resultados.forEach((resultado, i) => {
    if (resultado.status !== "rejected") return;
    console.error(resultado.reason);
    fallidas.push(capas[i][0]);
  });
  if (fallidas.length) avisarCapasFallidas(fallidas);

  abrirVueloDeEnlace();
  await cargarDemo();
  // El interruptor DEMO solo aparece si el grid llego a cargarse.
  refrescarCapas();
}

/**
 * Carga la capa demostrativa, si existe. Fase 5.
 *
 * Su ausencia es normal y NO es un error: el grid lo produce el notebook de
 * Colab (`notebooks/modelo-demo.ipynb`) y puede que aun no se haya ejecutado.
 * Por eso falla en silencio en vez de mostrar un aviso rojo.
 */
async function cargarDemo() {
  try {
    const grid = await getGridProbabilidadDemo();
    (await mapaListo)?.dibujarGridProbabilidad(grid);
  } catch {
    console.info(
      "Capa DEMO no disponible. Es normal si aun no has ejecutado " +
        "notebooks/modelo-demo.ipynb en Colab."
    );
  }
}

// --- Modos (ADR-020) ---------------------------------------------------------
//
// Cada modo es un objeto de config.js (DEFINICION_MODOS). Aqui solo se aplica:
// las tablas CAMARAS e INTERFACES traducen los nombres de la definicion a
// funciones, y nada pregunta "en que modo estamos". El calculo (distancias,
// conteos, circulos) es de data.js; main.js lo llama y compone las etiquetas.

/** Los dos modos a los que llevan los botones; el resto sale de la definicion. */
const MODO_NACIONAL = "nacional";
const MODO_CIUDAD = "ciudadBolivar";

/**
 * Camaras de los modos. En el arranque, la vista nacional ya la lleva el
 * vuelo de entrada de iniciarMapa(): no se vuela dos veces. La de la ciudad
 * cancela ese vuelo en el mismo tick (plan 001, §3.8).
 */
const CAMARAS = {
  faja: (arranque) => {
    if (!arranque) mapa?.volarAFaja();
  },
  ciudadBolivar: () => mapa?.vistaCiudadBolivar(),
};

/** Interfaces de los modos: montar con los datos, actualizarlos, desmontar. */
const INTERFACES = {
  ciudadBolivar: {
    montar: (datos) =>
      montarModoCiudadBolivar({
        ...datos,
        alSalir: () => irAModo(DEFINICION_MODOS[estado.actual].vueltaAtras ?? MODO_NACIONAL),
        alVerEnMapa: (id) => irAActivo({ capa: "iniciativasCcieb", ids: [id] }),
      }),
    actualizar: actualizarModoCiudadBolivar,
    desmontar: desmontarModoCiudadBolivar,
  },
};

/** Numeros con el formato del idioma activo (RNF-5). */
const formatoNumero = () => new Intl.NumberFormat(idioma(), { maximumFractionDigits: 1 });

/** null (cargando) y false (fallo) pasan tal cual; si hay coleccion, se calcula. */
const conDatos = (coleccion, calcular) => (coleccion ? calcular(coleccion) : coleccion);

/** La sede se toma de la capa, nunca de coordenadas escritas a mano. */
function sedeDeLaCapa() {
  return buscarActivo(ID_SEDE_EXPOFAJA, colecciones, ["ciudadBolivar"])?.feature ?? null;
}

/**
 * Campos mas cercanos a la sede. null = faltan datos por llegar; false = no se
 * pueden calcular (una capa fallo o la sede no esta en la capa).
 * @returns {Array<Object>|null|false}
 */
function cercanosDeSede() {
  const { campos, ciudadBolivar } = colecciones;
  if (campos === false || ciudadBolivar === false) return false;
  if (!campos || !ciudadBolivar) return null;
  const sede = posicionDe(sedeDeLaCapa());
  if (!sede) {
    console.warn(`La sede ${ID_SEDE_EXPOFAJA} no esta en la capa de Ciudad Bolivar.`);
    return false;
  }
  return camposMasCercanos(sede, campos);
}

/** Datos que la interfaz del modo activo necesita, con su estado de carga. */
function datosDelModo() {
  const anillos = DEFINICION_MODOS[estado.actual]?.anillos;
  return {
    resumenAnillos: anillos
      ? conDatos(colecciones.campos, (c) => contarPorAnillo(anillos.centro, c, anillos.radiosKm))
      : null,
    totalCampos: conDatos(colecciones.campos, (c) => c.features.length),
    cercanos: cercanosDeSede(),
    conteos: conDatos(colecciones.ciudadBolivar, (c) => contarPorClase(c.features, CLASES_CIUDAD)),
    iniciativas: estado.iniciativas,
    reglaRio: anillos ? reglaRio : null,
  };
}

/** Empuja los datos al modo activo (las capas llegan por red, en cualquier orden). */
function refrescarInterfaz() {
  const def = DEFINICION_MODOS[estado.actual];
  INTERFACES[def?.interfaz]?.actualizar(datosDelModo());
}

/** Anota una coleccion recien cargada (o false si fallo) y refresca el modo. */
function alLlegarColeccion(clave, coleccion) {
  if (!Object.hasOwn(colecciones, clave)) return;
  colecciones[clave] = coleccion;
  // D13: los anillos esperan a los campos porque su etiqueta lleva el conteo.
  if (clave === "campos") pintarAnillos();
  refrescarInterfaz();
}

/** Lista de iniciativas del panel: semilla del build, sin red (D10). */
async function cargarListaIniciativas() {
  try {
    const lista = await getListaIniciativasCcieb();
    estado.iniciativas = lista.features.map(({ properties: p }) => ({
      id: p.id,
      nombre: p.nombre,
      fecha: p.fecha,
      fuente: p.fuente,
      enMapa: p.en_mapa,
    }));
  } catch (error) {
    console.error(error);
    estado.iniciativas = false;
  }
  refrescarInterfaz();
}

/** Dibuja los anillos del modo activo, si tiene y ya hay campos. */
function pintarAnillos() {
  const anillos = DEFINICION_MODOS[estado.actual]?.anillos;
  if (!mapa || !anillos || !colecciones.campos) return;
  const formato = formatoNumero();
  const resumen = contarPorAnillo(anillos.centro, colecciones.campos, anillos.radiosKm);
  mapa.dibujarAnillos(
    resumen.map(({ km, campos }) => ({
      km,
      campos,
      coordenadas: circuloGeodesico(anillos.centro, km, SEGMENTOS_ANILLO),
      etiqueta: t("modo.anillo", { km: formato.format(km), n: formato.format(campos) }),
    }))
  );
}

/** Lineas de la sede a cada uno de sus campos cercanos, hasta el vertice medido. */
function mostrarLineasDeSede() {
  const sede = posicionDe(sedeDeLaCapa());
  const cercanos = cercanosDeSede();
  if (!sede || !Array.isArray(cercanos)) return;
  const formato = formatoNumero();
  const destinos = cercanos.flatMap(({ id }) => {
    const campo = colecciones.campos.features.find((f) => f.properties?.id === id);
    const vertice = verticeMasCercano(sede, campo);
    if (!vertice) return [];
    return [
      {
        lng: vertice.posicion[0],
        lat: vertice.posicion[1],
        etiqueta: t("ciudad.kmLineaRecta", { km: formato.format(vertice.km) }),
      },
    ];
  });
  mapa?.mostrarLineasProximidad(sede, destinos);
}

/**
 * Seleccion en el mapa. La ficha de la sede lleva los campos cercanos y sus
 * lineas; cualquier otra cosa, o cerrar (null), las quita (RF-9, RF-10).
 * @param {Object|null} activo
 */
function alSeleccionar(activo) {
  const cercanos = activo?.id === ID_SEDE_EXPOFAJA ? cercanosDeSede() : null;
  estado.sedeSeleccionada = Array.isArray(cercanos);
  if (estado.sedeSeleccionada) {
    mostrarPanelActivo(activo, { cercanos });
    mostrarLineasDeSede();
    return;
  }
  mostrarPanelActivo(activo);
  mapa?.ocultarLineasProximidad();
}

/** Deshace lo que el modo saliente puso: anillos, interfaz y capas. */
function retirarModo(def) {
  if (def.anillos) mapa?.quitarAnillos();
  INTERFACES[def.interfaz]?.desmontar();
  fijarCapas(estado.capasPrevias);
}

/**
 * Aplica un modo: retira el anterior y pone camara, capas, interfaz y anillos
 * del nuevo. No toca el historial: eso es de iniciarModo, irAModo y popstate.
 * @param {string} id — clave de DEFINICION_MODOS
 * @param {{arranque?: boolean}} [opciones]
 */
function aplicarModo(id, { arranque = false } = {}) {
  const entrante = DEFINICION_MODOS[id];
  if (estado.actual) retirarModo(DEFINICION_MODOS[estado.actual]);
  estado.actual = id;
  estado.capasPrevias = fijarCapas(
    Object.fromEntries(entrante.capasEncendidas.map((capa) => [capa, true]))
  );
  CAMARAS[entrante.camara](arranque);
  INTERFACES[entrante.interfaz]?.montar(datosDelModo());
  pintarAnillos();
}

/**
 * Cambio de modo por boton: entrada nueva en el historial. Si ya se esta en
 * ese modo, solo se repite su camara (lo que hacia "Volar a la Faja").
 * @param {string} destino
 */
function irAModo(destino) {
  if (destino === estado.actual) {
    CAMARAS[DEFINICION_MODOS[destino].camara](false);
    return;
  }
  // La vista apilada de ui.js deja una entrada propia: vuelve a ser del modo de origen.
  if (soltarVistas()) history.replaceState({ modo: estado.actual }, "", location.href);
  history.pushState({ modo: destino }, "", urlDeModo(location.pathname, destino));
  aplicarModo(destino);
}

/** Atras/adelante: aplica el modo de la entrada. Idempotente y sin escribir historial. */
function alVolverEnHistorial(evento) {
  const destino = evento.state?.modo;
  if (!MODOS.includes(destino) || destino === estado.actual) return;
  aplicarModo(destino);
}

/**
 * Arranque del modo: lo resuelve del enlace, deja el historial listo (con una
 * entrada trampolin si el modo tiene vuelta atras, para que el gesto atras
 * lleve a la vista nacional y no fuera del sitio) y lo aplica. Despues,
 * ?capa=; ?vuelo= espera a las capas (abrirVueloDeEnlace). Un id que no existe
 * se ignora sin aviso (RF-18).
 */
function iniciarModo() {
  const enlace = leerEnlace(location.search);
  estado.vuelo = enlace.vuelo;
  const inicial = modoInicialEn(new Date(), MODO_INICIAL, PORTADA_POR_FECHA);
  const modo = resolverModo(enlace.modo, MODOS, inicial);
  const origen = location.href;
  const atras = DEFINICION_MODOS[modo].vueltaAtras;
  // Recarga (o reapertura en la misma pestana): el navegador conserva el
  // estado y el trampolin ya existe. Crearlo otra vez duplicaria entradas y
  // "atras" necesitaria varios gestos (RF-5).
  if (history.state?.modo === modo) {
    // historial ya listo
  } else if (atras) {
    history.replaceState({ modo: atras }, "", urlDeModo(location.pathname, atras));
    history.pushState({ modo }, "", origen);
  } else {
    history.replaceState({ modo }, "", origen);
  }
  // Despues del popstate de ui.js (se registra al importarlo), que corre primero.
  window.addEventListener("popstate", alVolverEnHistorial);
  registrarAccesoCiudadBolivar(() => irAModo(MODO_CIUDAD));
  fijarAccionVolarFaja(() => irAModo(MODO_NACIONAL));
  aplicarModo(modo, { arranque: true });
  if (enlace.capa && Object.keys(fijarCapas({ [enlace.capa]: true })).length === 0) {
    console.info(`?capa=${enlace.capa}: no es una capa conocida, se ignora.`);
  }
}

/** ?vuelo=<id>: con las capas cargadas, busca el id, vuela y abre su ficha (RF-17). */
function abrirVueloDeEnlace() {
  const id = estado.vuelo;
  estado.vuelo = null;
  if (!id) return;
  const hallado = buscarActivo(id, colecciones, ORDEN_VUELO);
  if (!hallado || !irAActivo({ capa: hallado.capa, ids: [id] })) {
    console.info(`?vuelo=${id}: no se encontro, se ignora.`);
  }
}

/** Resuelve tras el primer pintado del shell: doble rAF + un tick. */
function trasPrimerPintado() {
  return new Promise((resolver) => {
    const fin = () => setTimeout(resolver, 0);
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => requestAnimationFrame(fin));
    } else {
      fin();
    }
  });
}

/** Mensaje de la UI para un fallo al arrancar el mapa. */
function mensajeDeFallo(error) {
  return error?.message?.includes("VITE_CESIUM_TOKEN")
    ? t("error.tokenFaltante")
    : String(error?.message ?? error);
}

/**
 * Trae `map.js` (y con el, Cesium) tras el primer pintado, sin bloquearlo
 * (ADR-022). Resuelve al modulo, o a null si no se pudo: el error se muestra
 * en la UI y la pantalla de carga se retira para no dejar un spinner eterno.
 * @returns {Promise<typeof import("./map.js")|null>}
 */
async function cargarMapa() {
  try {
    await trasPrimerPintado();
    return await import("./map.js");
  } catch (error) {
    console.error(error);
    quitarCargaInicial();
    mostrarError(t("error.mapaNoCargo"));
    return null;
  }
}

/** Arranca Cesium con el modulo ya cargado y conecta todo lo que lo espera. */
function arrancarMapa(modulo) {
  try {
    modulo.iniciarMapa();
    mapa = modulo;
    modulo.alSeleccionarActivo(alSeleccionar);
    modulo.alTerminarCargaInicial(quitarCargaInicial);
    // Se registra ANTES de dibujar nada: sin banner, map.js se niega a dibujar
    // la capa DEMO. Es una condicion de codigo, no una convencion.
    modulo.registrarBannerDemo(montarBannerDemo, quitarBannerDemo);
    // No depende de red: se dibuja desde FAJA_BBOX, que es constante.
    modulo.dibujarReferenciaFaja();
    // Ordenes de la interfaz que llegaron antes que el mapa (capas, vuelos).
    conectarMapa(modulo);
    // La camara del modo de arranque (la nacional ya la lleva el vuelo de entrada).
    CAMARAS[DEFINICION_MODOS[estado.actual].camara](true);
    pintarAnillos();
    return true;
  } catch (error) {
    mapa = null;
    console.error(error);
    quitarCargaInicial();
    mostrarError(mensajeDeFallo(error));
    return false;
  }
}

function arrancar() {
  // Antes que nada: sin esto, lo primero que ve el usuario es un lienzo negro
  // mientras Cesium arranca, que es justo lo que hace parecer roto un mapa 3D.
  montarCargaInicial();
  try {
    montarUI();
    iniciarModo();
    cargarListaIniciativas();
  } catch (error) {
    console.error(error);
    quitarCargaInicial();
    mostrarError(mensajeDeFallo(error));
  }

  // Cesium se descarga en paralelo a los datos. Resuelve a null si algo falla.
  mapaListo = cargarMapa().then((modulo) => (modulo && arrancarMapa(modulo) ? modulo : null));

  // Con catch explicito: una promesa rechazada sin manejar no llega a la
  // interfaz, y un error que solo vive en la consola es invisible. Es la
  // leccion del import que falto en produccion (docs/PROCESO.md, error 6).
  cargarCapas().catch((error) => {
    console.error(error);
    mostrarError(String(error?.message ?? error));
  });
}

/**
 * Al cambiar de idioma, los rotulos del mapa se redibujan con el otro nombre.
 *
 * Se hace desde aqui y no desde ui.js porque ui.js no puede tocar el mapa, y
 * no desde map.js porque map.js no decide cuando se cargan los datos. Es
 * orquestacion, que es justo lo que main.js hace.
 *
 * No hay peticion de red: las colecciones ya estan en memoria.
 */
window.addEventListener("idioma:cambiado", (evento) => {
  const lang = evento.detail ?? idioma();
  if (!mapa) return; // al llegar el mapa se dibuja con el idioma de ese momento
  if (contextoCargado.hidrografia) {
    mapa.dibujarHidrografia(contextoCargado.hidrografia, lang);
  }
  if (contextoCargado.toponimia) {
    mapa.dibujarToponimia(contextoCargado.toponimia, lang);
  }
  // Las etiquetas de anillos y lineas las compone main.js con t(): se rehacen.
  pintarAnillos();
  if (estado.sedeSeleccionada) mostrarLineasDeSede();
});

arrancar();
