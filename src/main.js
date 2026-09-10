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
  dibujarReferenciaFaja,
  dibujarGridProbabilidad,
  registrarBannerDemo,
  alSeleccionarActivo,
} from "./map.js";
import {
  montarUI,
  mostrarError,
  mostrarPanelActivo,
  fijarCampos,
  montarBannerDemo,
  quitarBannerDemo,
} from "./ui.js";
import {
  getCampos,
  getDuctos,
  getDownstream,
  getLimites,
  getZonaDisputada,
  getGridProbabilidadDemo,
} from "./api.js";
import { tieneProcedencia, normalizarActivo } from "./data.js";
import { t } from "./i18n/index.js";

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
 * Carga las capas de datos. Fases 2 y 3.
 *
 * El mapa arranca antes de que lleguen los datos: si la red falla, el usuario
 * se queda con un globo usable y un aviso, no con una pantalla en blanco.
 *
 * Cada capa se carga por separado a proposito: que falle una no puede dejar
 * sin las otras.
 */
async function cargarCapas() {
  // Los limites van primero: dan referencia espacial de inmediato aunque los
  // datos de activos tarden, y son el archivo mas ligero.
  const capas = [
    ["limites", getLimites, dibujarLimites],
    ["zona en disputa", getZonaDisputada, dibujarZonaDisputada],
    ["campos", getCampos, (fc) => {
      dibujarCampos(fc);
      fijarCampos(fc);
    }],
    ["ductos", getDuctos, dibujarDuctos],
    ["downstream", getDownstream, dibujarDownstream],
  ];

  const resultados = await Promise.allSettled(
    capas.map(async ([etiqueta, cargar, pintar]) => {
      const coleccion = await cargar();
      pintar(soloConFuente(coleccion, etiqueta));
    })
  );

  const fallidas = resultados.filter((r) => r.status === "rejected");
  for (const r of fallidas) console.error(r.reason);
  if (fallidas.length) mostrarError(t("error.cargaDatos"));

  await cargarDemo();
  // La leyenda se rehace: el interruptor DEMO solo aparece si el grid cargo.
  montarUI();
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
  try {
    iniciarMapa();
    montarUI();
    alSeleccionarActivo(mostrarPanelActivo);
    // Se registra ANTES de cargar nada: sin banner, map.js se niega a dibujar
    // la capa DEMO. Es una condicion de codigo, no una convencion.
    registrarBannerDemo(montarBannerDemo, quitarBannerDemo);
    // No depende de red: se dibuja desde FAJA_BBOX, que es constante.
    dibujarReferenciaFaja();
    cargarCapas();
  } catch (error) {
    console.error(error);
    mostrarError(
      error.message?.includes("VITE_CESIUM_TOKEN")
        ? t("error.tokenFaltante")
        : String(error.message ?? error)
    );
  }
}

arrancar();
