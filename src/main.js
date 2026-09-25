/**
 * main.js — Punto de entrada. Solo orquesta: no contiene logica de dominio.
 */

import "./style.css";
import {
  iniciarMapa,
  dibujarCampos,
  dibujarDuctos,
  dibujarDownstream,
  dibujarLimites,
  dibujarZonaDisputada,
  dibujarToponimia,
  dibujarHidrografia,
  dibujarCentrales,
  dibujarReferenciaFaja,
  dibujarGridProbabilidad,
  registrarBannerDemo,
  alSeleccionarActivo,
  alTerminarCargaInicial,
} from "./map.js";
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
} from "./ui.js";
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
} from "./api.js";
import { tieneProcedencia, normalizarActivo } from "./data.js";
import { t, idioma } from "./i18n/index.js";

/**
 * Capas cuyo TEXTO depende del idioma, guardadas para poder redibujarlas al
 * cambiarlo sin volver a pedirlas por red. Los toponimos son dato bilingue del
 * propio GeoJSON, no cadenas de interfaz: no pasan por t().
 */
const contextoCargado = { toponimia: null, hidrografia: null };

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
    ["limites", getLimites, dibujarLimites],
    ["disputa", getZonaDisputada, dibujarZonaDisputada],
    ["hidrografia", getHidrografia, (fc) => {
      contextoCargado.hidrografia = fc;
      // El idioma se lee al pintar, no al empezar a cargar: si el usuario lo
      // cambia mientras llega la capa, tiene que salir en el idioma nuevo.
      dibujarHidrografia(fc, idioma());
    }],
    ["toponimia", getToponimia, (fc) => {
      contextoCargado.toponimia = fc;
      dibujarToponimia(fc, idioma());
    }],
    ["campos", getCampos, dibujarCampos],
    ["ductos", getDuctos, dibujarDuctos],
    ["downstream", getDownstream, dibujarDownstream],
    ["centrales", getCentrales, dibujarCentrales],
  ];

  for (const [clave] of capas) fijarEstadoCapa(clave, "cargando");

  const resultados = await Promise.allSettled(
    capas.map(async ([clave, cargar, pintar]) => {
      try {
        const coleccion = soloConFuente(await cargar(), clave);
        pintar(coleccion);
        fijarDatosCapa(clave, coleccion);
      } catch (error) {
        fijarEstadoCapa(clave, "error");
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
    dibujarGridProbabilidad(grid);
  } catch {
    console.info(
      "Capa DEMO no disponible. Es normal si aun no has ejecutado " +
        "notebooks/modelo-demo.ipynb en Colab."
    );
  }
}

function arrancar() {
  // Antes que nada: sin esto, lo primero que ve el usuario es un lienzo negro
  // mientras Cesium arranca, que es justo lo que hace parecer roto un mapa 3D.
  montarCargaInicial();
  try {
    iniciarMapa();
    montarUI();
    alSeleccionarActivo(mostrarPanelActivo);
    alTerminarCargaInicial(quitarCargaInicial);
    // Se registra ANTES de cargar nada: sin banner, map.js se niega a dibujar
    // la capa DEMO. Es una condicion de codigo, no una convencion.
    registrarBannerDemo(montarBannerDemo, quitarBannerDemo);
    // No depende de red: se dibuja desde FAJA_BBOX, que es constante.
    dibujarReferenciaFaja();
    // Con catch explicito: una promesa rechazada sin manejar no llega a la
    // interfaz, y un error que solo vive en la consola es invisible. Es la
    // leccion del import que falto en produccion (docs/PROCESO.md, error 6).
    cargarCapas().catch((error) => {
      console.error(error);
      mostrarError(String(error?.message ?? error));
    });
  } catch (error) {
    console.error(error);
    quitarCargaInicial();
    mostrarError(
      error.message?.includes("VITE_CESIUM_TOKEN")
        ? t("error.tokenFaltante")
        : String(error.message ?? error)
    );
  }
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
  if (contextoCargado.hidrografia) {
    dibujarHidrografia(contextoCargado.hidrografia, lang);
  }
  if (contextoCargado.toponimia) {
    dibujarToponimia(contextoCargado.toponimia, lang);
  }
});

arrancar();
