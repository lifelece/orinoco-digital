/**
 * config.js — Constantes y configuracion. Sin logica.
 *
 * REGLA: ningun otro modulo lee import.meta.env directamente. Todo pasa por aqui.
 */

// --- Secretos / entorno -----------------------------------------------------

export const CESIUM_TOKEN = import.meta.env.VITE_CESIUM_TOKEN ?? "";

// Fase 4. Vacios hasta entonces.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// --- Sistema de referencia --------------------------------------------------

/**
 * CRS unico del proyecto. TODO dato entra ya transformado a WGS84 (EPSG:4326).
 * Venezuela uso historicamente La Canoa / PSAD56: coordenadas de esa epoca sin
 * transformar caen desviadas cientos de metros. Ver docs/DATA_SOURCES.md.
 */
export const CRS = "EPSG:4326";

// --- Vista inicial ----------------------------------------------------------

/**
 * Centro aproximado de la Faja Petrolifera del Orinoco.
 *
 * SIN VERIFICAR — valor de trabajo tomado de la documentacion del proyecto.
 * Antes de cerrar la Fase 1: confirmar contra el poligono del USGS Orinoco Oil
 * Belt Assessment Unit (FS 2009-3028) y registrar la fuente en DATA_SOURCES.md.
 */
export const VISTA_FAJA = {
  lng: -64.5,
  lat: 8.5,
  altura: 400000, // metros sobre el terreno
  pitch: -45, // grados
};

/** Limites de camara: evita que el usuario se pierda en el espacio. */
export const CAMARA = {
  alturaMaxima: 12000000,
  alturaMinima: 500,
  duracionVuelo: 3, // segundos
};

/**
 * Los 4 bloques de la Faja. Coordenadas PENDIENTES de fuente verificada.
 * No inventar: se rellenan en la Fase 1 desde el shapefile del USGS.
 */
export const BLOQUES = [
  { id: "boyaca", nombre: "Boyaca", centro: null },
  { id: "junin", nombre: "Junin", centro: null },
  { id: "ayacucho", nombre: "Ayacucho", centro: null },
  { id: "carabobo", nombre: "Carabobo", centro: null },
];

// --- Presupuesto de rendimiento ---------------------------------------------
// Ver docs/PERFORMANCE_BUDGET.md. Estos numeros son limites duros, no sugerencias.

export const PRESUPUESTO = {
  maxEntidadesPorCapa: 2000,
  distanciaClustering: 40, // pixeles
  usarClustering: true,
  requestRenderMode: true, // Cesium solo redibuja cuando algo cambia
};

// --- Capas ------------------------------------------------------------------

export const SECTORES = ["upstream", "midstream", "downstream"];

/** Color por estado del activo. Fase 2. */
export const COLOR_ESTADO = {
  activo: "#22c55e",
  inactivo: "#eab308",
  abandonado: "#ef4444",
  desconocido: "#94a3b8",
};

// --- Rutas de datos ---------------------------------------------------------

export const RUTAS_DATOS = {
  pozos: "/data/pozos.geojson",
  ductos: "/data/ductos.geojson",
  downstream: "/data/downstream.geojson",
  probGrid: "/data/prob_grid.geojson", // Fase 5 (DEMO)
};

// --- Idioma -----------------------------------------------------------------

export const IDIOMA_POR_DEFECTO = "es";
export const IDIOMAS = ["es", "en"];
