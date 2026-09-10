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
  /**
   * Navegacion libre: se puede salir de Venezuela y dar la vuelta al globo.
   *
   * Antes habia un tope de 12.000 km que anclaba la vista a la zona y hacia
   * que el mapa se sintiera enjaulado. El proyecto puede crecer a otros paises
   * y rubros, asi que la camara no debe presuponer que la Faja es el mundo.
   * "Volar a la Faja" sigue estando a un toque.
   */
  alturaMaxima: 50000000,
  // Se mantiene un minimo para no atravesar el terreno.
  alturaMinima: 120,
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
   *
   * Se usan DOS valores por dispositivo en vez de uno: mientras la camara se
   * mueve manda `enMovimiento` (fluidez) y al detenerse se baja a `enReposo`
   * (nitidez). Antes habia un solo valor alto y el mapa se veia siempre
   * borroso; un solo valor bajo daba tirones. El ojo no aprecia el detalle
   * mientras algo se mueve, asi que no hay que pagarlo entonces.
   */
  errorTerreno: {
    escritorio: { enMovimiento: 2.5, enReposo: 1.2 },
    movil: { enMovimiento: 5, enReposo: 2 },
  },

  /** Milisegundos sin mover la camara para considerarla en reposo. */
  esperaReposo: 350,

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
  // El sufijo -osm no es decorativo: marca las capas derivadas de
  // OpenStreetMap, que van bajo ODbL (share-alike) y por eso se mantienen
  // separadas del resto. Ver docs/DATA_SOURCES.md seccion 4.
  ductos: "/data/ductos-osm.geojson",
  downstream: "/data/downstream-osm.geojson",
  limites: "/data/limites-venezuela.geojson",
  probGrid: "/data/prob_grid.geojson", // Fase 5 (DEMO)
};

/** Color por fluido transportado. Fase 3. */
export const COLOR_FLUIDO = {
  oil: "#f59e0b",
  hydrocarbons: "#fb923c",
  gas: "#38bdf8",
  fuel: "#a78bfa",
  desconocido: "#94a3b8",
};

/** Tamano en pixeles de los simbolos del mapa. */
export const TAMANO_ICONO = 34;

/** Color de los limites administrativos. */
export const COLOR_LIMITE = {
  pais: "#f8fafc",
  estado: "#cbd5e1",
  faja: "#facc15",
};

/** Color por tipo de instalacion downstream. Fase 3. */
export const COLOR_TIPO = {
  refineria: "#ef4444",
  petroquimica: "#a855f7",
  planta_gas: "#38bdf8",
  puerto: "#14b8a6",
  terminal: "#f59e0b",
  instalacion: "#94a3b8",
};

// --- Proyecto ---------------------------------------------------------------

export const REPO = "https://github.com/lifelece/orinoco-digital";

/**
 * Fecha de la ultima actualizacion de los datos.
 *
 * Se muestra en el pie para que un dato viejo se NOTE. Es la defensa contra el
 * peor final de un proyecto de datos: seguir en linea mostrando cifras de hace
 * anos como si fueran de hoy.
 *
 * Actualizar en el mismo commit en que se actualicen los GeoJSON.
 */
export const FECHA_DATOS = "2026-09-09";

// --- Idioma -----------------------------------------------------------------

export const IDIOMA_POR_DEFECTO = "es";
export const IDIOMAS = ["es", "en"];
