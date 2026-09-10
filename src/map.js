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
  DistanceDisplayCondition,
  VerticalOrigin,
  PolylineDashMaterialProperty,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { icono, iconoAproximado } from "./iconos.js";

import {
  CESIUM_TOKEN,
  FAJA_BBOX,
  CAMARA,
  PRESUPUESTO,
  COLOR_ESTADO,
  COLOR_FLUIDO,
  COLOR_TIPO,
  COLOR_LIMITE,
  TAMANO_ICONO,
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

  ajustarCalidad(false);
  conectarCalidadAdaptativa();

  // Ocultar el creditContainer por defecto no: la atribucion de Cesium y de los
  // proveedores de terreno es OBLIGATORIA por licencia. Ver DATA_SOURCES.md.

  // La aplicacion abre directamente sobre la Faja, no sobre el globo entero.
  encuadrarFaja();
  conectarSeleccion();

  return viewer;
}

/** @returns {boolean} pantalla pequena = presupuesto de movil */
function esMovil() {
  return window.innerWidth < PRESUPUESTO.umbralMovil;
}

/** @type {number | undefined} */
let temporizadorReposo;

/**
 * Calidad adaptativa: fluidez mientras la camara se mueve, nitidez al parar.
 *
 * Un unico `maximumScreenSpaceError` obliga a elegir entre un mapa borroso o
 * uno con tirones. Con dos valores no hay que elegir: el ojo no aprecia el
 * detalle mientras algo se mueve, asi que se baja la calidad solo durante el
 * movimiento y se recupera 350 ms despues de soltar.
 *
 * Ver docs/PERFORMANCE_BUDGET.md.
 *
 * @param {boolean} enMovimiento
 */
function ajustarCalidad(enMovimiento = false) {
  if (!viewer) return;
  const escena = viewer.scene;
  const movil = esMovil();
  const perfil = movil
    ? PRESUPUESTO.errorTerreno.movil
    : PRESUPUESTO.errorTerreno.escritorio;

  escena.globe.maximumScreenSpaceError = enMovimiento
    ? perfil.enMovimiento
    : perfil.enReposo;

  // La atmosfera y la niebla dan profundidad y casi no cuestan en reposo.
  // Solo se apagan en movil mientras hay movimiento.
  const efectos = !(movil && enMovimiento);
  escena.globe.showGroundAtmosphere = efectos;
  escena.fog.enabled = efectos;
  escena.skyAtmosphere.show = true;
}

/** Conecta la calidad adaptativa a los eventos de camara. */
function conectarCalidadAdaptativa() {
  if (!viewer) return;

  viewer.camera.moveStart.addEventListener(() => {
    clearTimeout(temporizadorReposo);
    ajustarCalidad(true);
  });

  viewer.camera.moveEnd.addEventListener(() => {
    clearTimeout(temporizadorReposo);
    temporizadorReposo = setTimeout(() => {
      ajustarCalidad(false);
      viewer?.scene.requestRender();
    }, PRESUPUESTO.esperaReposo);
  });

  // Girar el telefono cambia el ancho y con el, el perfil aplicable.
  window.addEventListener("resize", () => ajustarCalidad(false));
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

/**
 * Quita la seleccion actual.
 *
 * Es imprescindible al cerrar el panel: si la entidad sigue seleccionada,
 * volver a tocarla no dispara selectedEntityChanged y parece que el mapa se
 * ha quedado bloqueado.
 */
export function deseleccionar() {
  if (viewer) viewer.selectedEntity = undefined;
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
      const cssColor = COLOR_ESTADO[props.estado] ?? COLOR_ESTADO.desconocido;
      capaCampos.entities.add({
        ...comun,
        position: Cartesian3.fromDegrees(lng, lat),
        billboard: {
          // Torre de perforacion en disco casi transparente: se reconoce de un
          // vistazo, y lo translucido comunica "ubicacion aproximada" sin
          // tener que abrir el panel.
          image: iconoAproximado("campo", cssColor),
          width: TAMANO_ICONO,
          height: TAMANO_ICONO,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          verticalOrigin: VerticalOrigin.BOTTOM,
          scaleByDistance: new NearFarScalar(1.0e4, 1.1, 2.5e6, 0.42),
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
          // Solo de cerca: cada polilinea pegada al terreno es una primitiva
          // de clasificacion, y son caras. En la vista general no aportan
          // nada y penalizan la fluidez en movil.
          distanceDisplayCondition: new DistanceDisplayCondition(
            0,
            PRESUPUESTO.distanciaBordes
          ),
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

// --- Capas midstream y downstream (Fase 3) -----------------------------------

/** Capas por sector, para poder encenderlas y apagarlas. */
const capas = new Map();

/**
 * Crea (o reemplaza) una capa con nombre y la registra.
 * @param {string} nombre
 * @returns {CustomDataSource}
 */
function nuevaCapa(nombre) {
  const previa = capas.get(nombre);
  if (previa && viewer) viewer.dataSources.remove(previa, true);
  const capa = new CustomDataSource(nombre);
  capas.set(nombre, capa);
  return capa;
}

/**
 * Dibuja los ductos como polilineas pegadas al terreno. Fase 3.
 *
 * Color por fluido transportado, no por estado: OSM no publica el estado
 * operativo de los ductos y fingir que si lo hace seria inventar.
 *
 * @param {{features: Array<Object>}} featureCollection
 */
export function dibujarDuctos(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("ductos");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const color = Color.fromCssColorString(
      COLOR_FLUIDO[props.fluido] ?? COLOR_FLUIDO.desconocido
    );

    capa.entities.add({
      name: props.nombre ?? props.id ?? "",
      properties: { ...props },
      polyline: {
        positions: aPosiciones(coords),
        width: 2.5,
        material: color,
        clampToGround: true,
      },
    });
    n += 1;
  }

  viewer.dataSources.add(capa);
  return n;
}

/**
 * Dibuja refinerias, petroquimicas, plantas de gas, puertos y parques de
 * tanques. Fase 3.
 *
 * @param {{features: Array<Object>}} featureCollection
 */
export function dibujarDownstream(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("downstream");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const cssColor = COLOR_TIPO[props.tipo] ?? COLOR_TIPO.instalacion;

    // Las refinerias y los grandes parques de tanques son los hitos de la
    // cadena: se dibujan mas grandes para que se distingan del resto.
    const destacado = props.tipo === "refineria" || (props.n_tanques ?? 0) > 50;
    const escala = destacado ? 1.25 : 1;

    capa.entities.add({
      name: props.nombre ?? props.id ?? "",
      properties: { ...props },
      position: Cartesian3.fromDegrees(coords[0], coords[1]),
      billboard: {
        image: icono(props.tipo, cssColor),
        width: TAMANO_ICONO * escala,
        height: TAMANO_ICONO * escala,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(1.0e4, 1.1, 2.5e6, 0.45),
      },
    });
    n += 1;
  }

  viewer.dataSources.add(capa);
  return n;
}

/**
 * Enciende o apaga una capa por sector.
 * @param {"upstream" | "midstream" | "downstream"} sector
 * @param {boolean} visible
 */
export function alternarCapa(sector, visible) {
  if (sector === "upstream" && capaCampos) capaCampos.show = visible;

  if (sector === "midstream") {
    const ductos = capas.get("ductos");
    if (ductos) ductos.show = visible;
  }

  // La capa "downstream" mezcla dos sectores: refinerias, petroquimicas y
  // puertos son downstream, pero los parques de tanques son midstream. Por eso
  // se controla entidad por entidad y no con el interruptor de la capa: si no,
  // apagar un sector escondería activos del otro.
  const mixta = capas.get("downstream");
  if (mixta) {
    const ahora = JulianDate.now();
    for (const entidad of mixta.entities.values) {
      const tipo = entidad.properties?.tipo?.getValue?.(ahora);
      const suSector = tipo === "terminal" ? "midstream" : "downstream";
      if (suSector === sector) entidad.show = visible;
    }
  }

  viewer?.scene.requestRender();
}

// --- Contexto geografico -----------------------------------------------------

/**
 * Dibuja fronteras y limites estatales.
 *
 * Dan referencia espacial: sin ellos, un pozo flota sobre una mancha verde y
 * no se sabe en que estado esta.
 *
 * @param {{features: Array<Object>}} featureCollection
 */
export function dibujarLimites(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("limites");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const esPais = props.nivel === "pais";

    capa.entities.add({
      name: props.nombre ?? "",
      properties: { ...props },
      polyline: {
        positions: aPosiciones(coords),
        width: esPais ? 2.5 : 1.2,
        material: Color.fromCssColorString(
          esPais ? COLOR_LIMITE.pais : COLOR_LIMITE.estado
        ).withAlpha(esPais ? 0.85 : 0.5),
        clampToGround: true,
      },
    });
    n += 1;
  }

  viewer.dataSources.add(capa);
  return n;
}

/**
 * Dibuja la caja de referencia de la Faja.
 *
 * IMPORTANTE: es la caja envolvente medida sobre la figura del USGS, NO el
 * contorno real. La Faja es sinuosa y solo ocupa el 52% de esta caja. Se
 * dibuja discontinua y con etiqueta explicita para que nadie la lea como el
 * limite oficial. Ver docs/DATA_SOURCES.md seccion 9.
 */
export function dibujarReferenciaFaja() {
  if (!viewer) return;
  const capa = nuevaCapa("faja");
  const { oeste, este, sur, norte } = FAJA_BBOX;

  capa.entities.add({
    name: "faja-referencia",
    properties: { tipo: "referencia", nivel: "faja" },
    polyline: {
      positions: aPosiciones([
        [oeste, sur],
        [este, sur],
        [este, norte],
        [oeste, norte],
        [oeste, sur],
      ]),
      width: 2,
      material: new PolylineDashMaterialProperty({
        color: Color.fromCssColorString(COLOR_LIMITE.faja).withAlpha(0.9),
        dashLength: 18,
      }),
      clampToGround: true,
    },
  });

  viewer.dataSources.add(capa);
}

/**
 * Enciende o apaga una capa de contexto por nombre.
 * @param {"limites" | "faja"} nombre
 * @param {boolean} visible
 */
export function alternarContexto(nombre, visible) {
  const capa = capas.get(nombre);
  if (capa) capa.show = visible;
  viewer?.scene.requestRender();
}

// --- Pendiente por fase ------------------------------------------------------
// Fase 5: dibujarGridProbabilidad(featureCollection)  <- SIEMPRE con banner DEMO
