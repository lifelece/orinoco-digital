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
  Rectangle,
  BoundingSphere,
  HeadingPitchRange,
  Matrix4,
  Math as CesiumMath,
  Color,
  Cartesian3,
  PolygonHierarchy,
  CustomDataSource,
  HeightReference,
  NearFarScalar,
  JulianDate,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import {
  CESIUM_TOKEN,
  FAJA_BBOX,
  CAMARA,
  PRESUPUESTO,
  COLOR_ESTADO,
} from "./config.js";

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

    // El panel de datos lo construye ui.js: asi controlamos que la fuente y la
    // fecha de verificacion se vean siempre, cosa que el infoBox por defecto
    // no garantiza.
    infoBox: false,
  });

  // Evitar que el usuario se pierda en el espacio o atraviese el suelo.
  const controlador = viewer.scene.screenSpaceCameraController;
  controlador.maximumZoomDistance = CAMARA.alturaMaxima;
  controlador.minimumZoomDistance = CAMARA.alturaMinima;

  // Ocultar el creditContainer por defecto no: la atribucion de Cesium y de los
  // proveedores de terreno es OBLIGATORIA por licencia. Ver DATA_SOURCES.md.

  // La aplicacion abre directamente sobre la Faja, no sobre el globo entero.
  encuadrarFaja();
  conectarSeleccion();

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
 * Esfera envolvente de la Faja y el angulo desde el que se mira.
 *
 * Se usa `flyToBoundingSphere` en vez de volar a un Rectangle porque el vuelo
 * a un rectangulo es CENITAL: mirando en vertical desde cientos de kilometros,
 * el relieve del terreno no se percibe aunque este cargado. Con la esfera
 * envolvente se conserva el encuadre garantizado —el radio manda la distancia,
 * asi que la franja entera entra en cuadro en cualquier pantalla— y ademas se
 * puede inclinar la camara.
 *
 * @returns {{esfera: BoundingSphere, offset: HeadingPitchRange}}
 */
function vistaFaja() {
  const esfera = BoundingSphere.fromRectangle3D(rectanguloFaja());
  const offset = new HeadingPitchRange(
    CesiumMath.toRadians(CAMARA.rumbo),
    CesiumMath.toRadians(CAMARA.inclinacion),
    esfera.radius * CAMARA.margen
  );
  return { esfera, offset };
}

/**
 * Vuela la camara para encuadrar la Faja Petrolifera del Orinoco completa,
 * en vista oblicua. Fase 1.
 */
export function volarAFaja() {
  if (!viewer) return;
  const { esfera, offset } = vistaFaja();
  viewer.camera.flyToBoundingSphere(esfera, {
    offset,
    duration: CAMARA.duracionVuelo,
  });
}

/**
 * Coloca la camara sobre la Faja sin animacion. Para la vista de arranque.
 */
export function encuadrarFaja() {
  if (!viewer) return;
  const { esfera, offset } = vistaFaja();
  viewer.camera.viewBoundingSphere(esfera, offset);
  // viewBoundingSphere deja la camara anclada al sistema de referencia de la
  // esfera. Sin esto, el usuario no puede desplazarse libremente despues.
  viewer.camera.lookAtTransform(Matrix4.IDENTITY);
}

/** @returns {Viewer | null} */
export function obtenerViewer() {
  return viewer;
}

// --- Capa de campos (Fase 2) -------------------------------------------------

/** @type {CustomDataSource | null} */
let capaCampos = null;

/** @type {((activo: Object | null) => void) | null} */
let alSeleccionar = null;

/**
 * Registra el callback que se invoca al seleccionar un campo en el mapa.
 * Es lo que permite que ui.js muestre el panel sin importar cesium.
 * @param {(activo: Object | null) => void} callback
 */
export function alSeleccionarActivo(callback) {
  alSeleccionar = callback;
}

/**
 * Convierte un anillo GeoJSON [[lng, lat], ...] a posiciones de Cesium.
 * @param {Array<Array<number>>} anillo
 * @returns {Array<Cartesian3>}
 */
function aPosiciones(anillo) {
  return anillo.map(([lng, lat]) => Cartesian3.fromDegrees(lng, lat));
}

/**
 * Devuelve la lista de poligonos de una geometria, cada uno como
 * [anilloExterior, ...agujeros]. Unifica Polygon y MultiPolygon.
 * @param {Object} geometria
 * @returns {Array<Array<Array<Array<number>>>>}
 */
function poligonosDe(geometria) {
  if (geometria.type === "Polygon") return [geometria.coordinates];
  if (geometria.type === "MultiPolygon") return geometria.coordinates;
  return [];
}

/**
 * Dibuja los campos petroliferos y gasiferos. Fase 2.
 *
 * Dos geometrias con significados distintos, y el mapa lo dice:
 * - Poligono: se conoce la extension real del campo -> area rellena.
 * - Punto: solo se conoce su ubicacion aproximada -> marcador hueco.
 *
 * Disimular esa diferencia seria presentar como precisa una ubicacion que no
 * lo es. Ver docs/DATA_SOURCES.md seccion 10.
 *
 * @param {{features: Array<Object>}} featureCollection
 */
export function dibujarCampos(featureCollection) {
  if (!viewer) return;

  if (capaCampos) viewer.dataSources.remove(capaCampos, true);
  capaCampos = new CustomDataSource("campos");

  let dibujados = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const color = Color.fromCssColorString(
      COLOR_ESTADO[props.estado] ?? COLOR_ESTADO.desconocido
    );

    const comun = {
      name: props.nombre ?? props.id ?? "",
      // Las propiedades viajan con la entidad para que el panel las lea sin
      // volver a consultar el GeoJSON.
      properties: { ...props, tieneExtension: feature.geometry.type !== "Point" },
    };

    if (feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates;
      capaCampos.entities.add({
        ...comun,
        position: Cartesian3.fromDegrees(lng, lat),
        point: {
          pixelSize: 9,
          // Relleno casi transparente y borde marcado: lee como "hueco", que
          // es justamente el mensaje —no sabemos su extension.
          color: color.withAlpha(0.15),
          outlineColor: color,
          outlineWidth: 2,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          // Se encoge al alejar para no saturar la vista general.
          scaleByDistance: new NearFarScalar(1.0e4, 1.4, 1.5e6, 0.5),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });
      dibujados += 1;
      continue;
    }

    // Polygon o MultiPolygon: una entidad por parte.
    for (const partes of poligonosDe(feature.geometry)) {
      const [exterior, ...agujeros] = partes;
      if (!exterior || exterior.length < 4) continue;

      capaCampos.entities.add({
        ...comun,
        polygon: {
          hierarchy: new PolygonHierarchy(
            aPosiciones(exterior),
            agujeros.map((a) => new PolygonHierarchy(aPosiciones(a)))
          ),
          material: color.withAlpha(0.45),
          // Sin altura ni extrusion: Cesium lo drapea sobre el terreno.
          // `outline` NO se usa: los contornos de poligono sobre terreno no
          // estan soportados y Cesium avisa en consola. El borde se dibuja
          // como polilinea pegada al suelo, en la misma entidad.
          outline: false,
        },
        polyline: {
          positions: aPosiciones(exterior),
          width: 2,
          material: color,
          clampToGround: true,
        },
      });
      dibujados += 1;
    }
  }

  viewer.dataSources.add(capaCampos);

  if (dibujados > PRESUPUESTO.maxEntidadesPorCapa) {
    console.warn(
      `Capa de campos: ${dibujados} entidades, por encima del presupuesto ` +
        `(${PRESUPUESTO.maxEntidadesPorCapa}). Ver docs/PERFORMANCE_BUDGET.md.`
    );
  }

  return dibujados;
}

/** Conecta la seleccion de entidades con el callback registrado. */
function conectarSeleccion() {
  if (!viewer) return;
  viewer.selectedEntityChanged.addEventListener((entidad) => {
    if (!alSeleccionar) return;
    if (!entidad?.properties) {
      alSeleccionar(null);
      return;
    }
    // PropertyBag.getValue exige un instante; los valores son constantes,
    // asi que cualquiera sirve.
    alSeleccionar(entidad.properties.getValue(JulianDate.now()));
  });
}

// --- Pendiente por fase ------------------------------------------------------
// Fase 3: dibujarDuctos(featureCollection), dibujarDownstream(featureCollection)
// Fase 3: alternarCapa(sector, visible)
// Fase 5: dibujarGridProbabilidad(featureCollection)  <- SIEMPRE con banner DEMO
