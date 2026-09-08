/**
 * map.js — Todo lo que toca CesiumJS. Unico modulo que importa "cesium".
 *
 * Fase 0: inicializar el viewer con terreno mundial.
 * Fases siguientes anaden capas AQUI, sin tocar api.js ni ui.js.
 */

import {
  Ion,
  Viewer,
  Terrain,
  Cartesian3,
  Math as CesiumMath,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { CESIUM_TOKEN, VISTA_FAJA, CAMARA, PRESUPUESTO } from "./config.js";

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

  return viewer;
}

/**
 * Vuela la camara a la vista inicial de la Faja Petrolifera del Orinoco.
 * Fase 1.
 */
export function volarAFaja() {
  if (!viewer) return;

  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(
      VISTA_FAJA.lng,
      VISTA_FAJA.lat,
      VISTA_FAJA.altura
    ),
    orientation: {
      heading: CesiumMath.toRadians(0),
      pitch: CesiumMath.toRadians(VISTA_FAJA.pitch),
      roll: 0,
    },
    duration: CAMARA.duracionVuelo,
  });
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
