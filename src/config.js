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

  /**
   * Encuadre en pantalla vertical (telefono).
   *
   * Con la vista de escritorio, un telefono en vertical dedicaba el tercio
   * superior al cielo y cortaba la Faja por los lados: el campo de vision
   * horizontal de una pantalla alta es la mitad que el de una ancha. Mas
   * cenital y mas lejos, la franja entera cabe y el cielo desaparece.
   */
  inclinacionVertical: -60,
  // Medido en captura a 390x844: con 3.2 los bordes este y oeste de la caja
  // de la Faja quedaban justo fuera de pantalla.
  margenVertical: 3.6,

  /** Vuelo a un activo desde el buscador o la tabla. Notion "Mejora v2" §1.3. */
  duracionVueloActivo: 1.2,
  inclinacionActivo: -45,
  /**
   * Distancia a la que se queda la camara de un activo puntual, en metros.
   * Un punto no tiene extension: sin esto Cesium se acerca a 100 m, su minimo,
   * y el simbolo llena la pantalla sin ningun contexto alrededor.
   */
  distanciaActivoPuntual: 18000,
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
  zonaDisputada: "/data/zona-disputada.geojson",
  // Contexto cartografico: sin esto el mapa es geometria correcta pero muda.
  toponimia: "/data/toponimia.geojson",
  hidrografia: "/data/hidrografia.geojson",
  // Energia electrica: NO es cadena de hidrocarburos, por eso va aparte.
  // Ver docs/DECISIONS.md -> ADR-013.
  centrales: "/data/centrales.geojson",
  probGrid: "/data/prob_grid.geojson", // Fase 5 (DEMO)
};

/**
 * Color por hidrocarburo del campo.
 *
 * Los campos se colorean por lo que producen, NO por su estado operativo. El
 * motivo esta en el propio dato: 99 de los 105 campos de GOGET estan "activo",
 * asi que colorear por estado pinta un mapa de un solo color y no informa de
 * nada. El hidrocarburo si reparte: 64 petroleo, 35 ambos, 6 gas.
 * Ver docs/DECISIONS.md -> ADR-012.
 *
 * Los tonos son los mismos que COLOR_FLUIDO usa en los ductos —ambar el crudo,
 * azul el gas— para que el mapa se lea como un solo sistema: si un ducto azul
 * sale de un campo azul, se entiende sin leer la leyenda.
 */
export const COLOR_HIDROCARBURO = {
  petroleo: "#f59e0b",
  gas: "#38bdf8",
  // Ni ambar ni azul: violeta se distingue de ambos tambien con los tipos de
  // daltonismo mas frecuentes, cosa que un verde intermedio no lograria.
  mixto: "#c084fc",
  desconocido: "#94a3b8",
};

/** Color por fluido transportado. Fase 3. */
export const COLOR_FLUIDO = {
  oil: "#f59e0b",
  hydrocarbons: "#fb923c",
  gas: "#38bdf8",
  fuel: "#a78bfa",
  desconocido: "#94a3b8",
};

/**
 * Color por clase de central electrica.
 *
 * Turquesa el agua que mueve una turbina, rosa la combustion. Se eligieron
 * fuera de las familias ya ocupadas —ambar el crudo, azul el gas, rojo las
 * refinerias— para que una termica no se lea como una refineria ni una represa
 * como un puerto. El simbolo (presa o rayo) hace el resto del trabajo.
 */
export const COLOR_CENTRAL = {
  hidro: "#2dd4bf",
  termo: "#fb7185",
  otro: "#94a3b8",
};

/**
 * Escala del simbolo de una central segun su capacidad instalada.
 *
 * Los mapas de referencia dibujan Guri mas grande que una termica de 20 MW, y
 * hacen bien: 8.851 MW y 20 MW no son la misma cosa y un mapa que los pinta
 * igual esconde el dato mas importante de la capa. Se usa raiz cuadrada y no
 * proporcion directa porque Guri es 440 veces mayor que la menor: en lineal, o
 * Guri no cabe en pantalla o el resto es invisible.
 */
export const ESCALA_CENTRAL = { minima: 0.85, maxima: 1.4, referenciaMw: 3000 };

/** Color de los rotulos, por clase de toponimo. */
export const COLOR_TOPONIMIA = {
  pais: "#e2e8f0",
  estado: "#a8b6c8",
  ciudad: "#f1f5f9",
  /** Punto que acompana al nombre de la ciudad. */
  marca: "#cbd5e1",
};

/**
 * Color del agua.
 *
 * OJO con la coincidencia: el gas de los ductos es `#38bdf8`, un azul cian.
 * Los rios usan un azul mas frio y translucido y una linea mas ancha y suave
 * para no confundirse con un gasoducto, que es fino y saturado. Es la unica
 * pareja de colores del mapa que se parece, y esta puesta a proposito: el agua
 * tiene que leerse como agua.
 */
export const COLOR_AGUA = {
  rio: "#60a5fa",
  lago: "#3b82f6",
  etiqueta: "#93c5fd",
};

/**
 * Distancias de camara, en metros, entre las que se ve cada rotulo.
 *
 * Es el mecanismo que evita que el mapa se convierta en una sopa de letras:
 * los paises se ven de lejos y desaparecen al acercarse, las ciudades hacen lo
 * contrario, y cada ciudad aparece segun el `rango` que trae del SCALERANK de
 * Natural Earth. Es lo mismo que hace un atlas al cambiar de escala.
 */
export const ZOOM_ETIQUETA = {
  pais: [400000, 25000000],
  estado: [80000, 2500000],
  ciudad: {
    1: [0, 2000000],
    2: [0, 500000],
    3: [0, 160000],
  },
  agua: [0, 2500000],
};

/** Tamano en pixeles de los simbolos del mapa. */
export const TAMANO_ICONO = 34;

/** Color de los limites administrativos. */
export const COLOR_LIMITE = {
  pais: "#f8fafc",
  estado: "#cbd5e1",
  faja: "#facc15",
  // Naranja: se distingue del amarillo de la Faja y del blanco de la
  // frontera, y no es un color que se lea como "error".
  disputa: "#fb923c",
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
export const FECHA_DATOS = "2026-09-15";

// --- Interfaz ---------------------------------------------------------------

/**
 * Antiguedad de los datos, en dias, a partir de la cual el indicador de
 * frescura cambia de color. La cadencia de la infraestructura es semestral
 * (docs/DATA_SOURCES.md, seccion 7): pasados 180 dias toca revisar.
 */
export const UMBRAL_FRESCURA_DIAS = { aviso: 90, caducado: 180 };

/**
 * Tiempo maximo con la pantalla de carga puesta, en milisegundos, aunque el
 * terreno no haya terminado. En red movil lenta, un mapa a medio cargar es
 * mas util que una espera sin fin.
 */
export const ESPERA_MAXIMA_CARGA = 8000;

/**
 * Fuentes que se listan en el dialogo "Fuentes y licencias".
 *
 * Cada URL se comprobo que responde el 2026-09-14. La licencia es la que
 * declara la propia fuente; el detalle y el metodo, en docs/DATA_SOURCES.md.
 * Nombre y licencia son claves i18n: llevan fechas y textos que se traducen.
 */
export const FUENTES = [
  {
    clave: "gem",
    url: "https://globalenergymonitor.org/projects/global-oil-gas-extraction-tracker/",
    licencia: "licencia.ccby4",
  },
  {
    clave: "osm",
    url: "https://www.openstreetmap.org/copyright",
    licencia: "licencia.odbl",
  },
  {
    clave: "geoboundaries",
    url: "https://www.geoboundaries.org/",
    // Dos licencias: el pais es dominio publico y los estados CC BY 3.0 IGO,
    // segun la API de geoBoundaries (2026-09-15). No es CC BY 4.0.
    licencia: "licencia.geoboundaries",
  },
  {
    clave: "naturalEarth",
    url: "https://www.naturalearthdata.com/",
    licencia: "licencia.dominioPublico",
  },
  {
    clave: "wri",
    url: "https://github.com/wri/global-power-plant-database",
    licencia: "licencia.ccby4",
  },
  {
    clave: "usgs",
    url: "https://pubs.usgs.gov/fs/2009/3028/",
    licencia: "licencia.dominioPublico",
  },
  {
    clave: "cesium",
    url: "https://cesium.com/platform/cesium-ion/content/cesium-world-terrain/",
    licencia: "licencia.cesium",
  },
];

// --- Idioma -----------------------------------------------------------------

export const IDIOMA_POR_DEFECTO = "es";
export const IDIOMAS = ["es", "en"];
