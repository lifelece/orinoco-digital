/**
 * map.js — Todo lo que toca CesiumJS. Unico modulo que importa "cesium".
 *
 * Fase 0: inicializar el viewer con terreno mundial.
 * Fases siguientes anaden capas AQUI, sin tocar api.js ni ui.js.
 */

import { Ion, Viewer, Terrain, Rectangle } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { CESIUM_TOKEN, FAJA_BBOX, CAMARA, PRESUPUESTO } from "./config.js";

/** @type {Viewer | null} */
let viewer = null;

/**
 * Crea el Cesium Viewer sobre #cesiumContainer.
 * @returns {Viewer}
 */
export function iniciarMapa() {
  if (!CESIUM_TOKEN) {
    throw new Error(
      "Falta VITE_CESIUM_TOKEN. Copia .env.example a .env y pega tu token de Cesium ion."
    );
  }

  Ion.defaultAccessToken = CESIUM_TOKEN;

  viewer = new Viewer("cesiumContainer", {
    // Terreno topografico real global (gratis con Cesium ion Community).
    terrain: Terrain.fromWorldTerrain(),

    // Presupuesto de rendimiento: solo redibujar cuando algo cambia.
    // Critico en laptop de 8GB y en moviles. Ver docs/PERFORMANCE_BUDGET.md.
    requestRenderMode: PRESUPUESTO.requestRenderMode,
    maximumRenderTimeChange: Infinity,

    // Widgets que no aportan a este proyecto: fuera (menos peso y menos ruido).
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    baseLayerPicker: false,
    fullscreenButton: false,
  });

  // Evitar que el usuario se pierda en el espacio o atraviese el suelo.
  const controlador = viewer.scene.screenSpaceCameraController;
  controlador.maximumZoomDistance = CAMARA.alturaMaxima;
  controlador.minimumZoomDistance = CAMARA.alturaMinima;

  // Ocultar el creditContainer por defecto no: la atribucion de Cesium y de los
  // proveedores de terreno es OBLIGATORIA por licencia. Ver DATA_SOURCES.md.

  // La aplicacion abre directamente sobre la Faja, no sobre el globo entero.
  encuadrarFaja();

  return viewer;
}

/**
 * Rectangulo de la Faja, listo para Cesium.
 * @returns {Rectangle}
 */
function rectanguloFaja() {
  return Rectangle.fromDegrees(
    FAJA_BBOX.oeste,
    FAJA_BBOX.sur,
    FAJA_BBOX.este,
    FAJA_BBOX.norte
  );
}

/**
 * Vuela la camara para encuadrar la Faja Petrolifera del Orinoco completa.
 *
 * Se usa un Rectangle en vez de punto + altura: asi Cesium calcula la
 * distancia necesaria y la franja entera entra en cuadro sea cual sea la
 * relacion de aspecto de la pantalla. Con punto + altura, un telefono en
 * vertical recortaria los extremos este y oeste.
 *
 * Contrapartida: el vuelo a un Rectangle es cenital, no admite pitch.
 * Fase 1.
 */
export function volarAFaja() {
  if (!viewer) return;

  viewer.camera.flyTo({
    destination: rectanguloFaja(),
    duration: CAMARA.duracionVuelo,
  });
}

/**
 * Coloca la camara sobre la Faja sin animacion. Para la vista de arranque.
 */
export function encuadrarFaja() {
  if (!viewer) return;
  viewer.camera.setView({ destination: rectanguloFaja() });
}

/** @returns {Viewer | null} */
export function obtenerViewer() {
  return viewer;
}

// --- Pendiente por fase ------------------------------------------------------
// Fase 2: dibujarPozos(featureCollection)
// Fase 3: dibujarDuctos(featureCollection), dibujarDownstream(featureCollection)
// Fase 3: alternarCapa(sector, visible)
// Fase 5: dibujarGridProbabilidad(featureCollection)  <- SIEMPRE con banner DEMO
