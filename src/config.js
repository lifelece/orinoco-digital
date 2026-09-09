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
 * Extension de la Orinoco Oil Belt Assessment Unit.
 *
 * VERIFICADO — medido sobre la figura 1 del USGS Fact Sheet 2009-3028
 * ("An Estimate of Recoverable Heavy Oil Resources of the Orinoco Oil Belt,
 * Venezuela"), calibrando la graticula del mapa por analisis de pixeles.
 * Metodo y cifras en docs/DATA_SOURCES.md, seccion 9.
 *
 * Precision estimada: +-0,05 grados (~5 km). Suficiente para encuadrar la
 * camara; NO usar como limite legal ni catastral.
 */
export const FAJA_BBOX = {
  oeste: -67.34,
  este: -62.08,
  sur: 7.88,
  norte: 9.37,
};

/**
 * Centro de la Faja. Derivado de FAJA_BBOX, no escrito a mano.
 *
 * El encuadre de la camara lo calcula Cesium a partir de FAJA_BBOX
 * (ver volarAFaja en map.js). Este centro queda para etiquetas, enlaces
 * de "compartir vista" y consultas por proximidad.
 */
export const VISTA_FAJA = {
  lng: (FAJA_BBOX.oeste + FAJA_BBOX.este) / 2, // -64.71
  lat: (FAJA_BBOX.sur + FAJA_BBOX.norte) / 2, //   8.63
};

/** Limites y encuadre de camara. */
export const CAMARA = {
  // Evita que el usuario se pierda en el espacio o atraviese el suelo.
  alturaMaxima: 12000000,
  alturaMinima: 500,
  duracionVuelo: 3, // segundos

  rumbo: 0, // grados. 0 = norte arriba.
  // Vista oblicua, no cenital: en vertical el relieve del terreno no se
  // percibe. Ojo, la Faja es una llanura sedimentaria y es plana de verdad;
  // el relieve fuerte esta en la Serrania del Interior, al norte.
  inclinacion: -35, // grados
  // Multiplo del radio de la esfera envolvente. Mas alto = mas margen.
  margen: 1.9,
};

/**
 * Los 4 bloques de la Faja, en orden geografico de oeste a este.
 *
 * Coordenadas PENDIENTES de fuente verificada. La figura del USGS dibuja la
 * unidad completa, no la subdivide en bloques, y el poligono oficial de la AU
 * no esta publicado como GIS (comprobado en ScienceBase, ver DATA_SOURCES.md).
 *
 * `centro: null` es la respuesta correcta hasta encontrar fuente. No inventar.
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

  /**
   * Error maximo de pantalla del terreno. Es la palanca de rendimiento mas
   * potente: cuanto mas alto, menos teselas carga Cesium y mas fluido va, a
   * costa de detalle. 2 es el valor por defecto de Cesium.
   */
  errorTerrenoEscritorio: 2,
  errorTerrenoMovil: 4,

  /** Ancho de pantalla, en px CSS, por debajo del cual aplicamos ajustes de movil. */
  umbralMovil: 820,

  /**
   * Distancia (m) por debajo de la cual se dibujan los bordes de los campos.
   * Las polilineas pegadas al terreno son primitivas de clasificacion y son
   * caras: en la vista general no aportan y si cuestan fluidez.
   */
  distanciaBordes: 400000,
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
  // Campos (yacimientos), no pozos: las fuentes publicas son de campos.
  campos: "/data/campos.geojson",
  ductos: "/data/ductos.geojson",
  downstream: "/data/downstream.geojson",
  probGrid: "/data/prob_grid.geojson", // Fase 5 (DEMO)
};

// --- Idioma -----------------------------------------------------------------

export const IDIOMA_POR_DEFECTO = "es";
export const IDIOMAS = ["es", "en"];
