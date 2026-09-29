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
  HorizontalOrigin,
  LabelStyle,
  Cartesian2,
  PolylineDashMaterialProperty,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { icono, iconoAproximado } from "./iconos.js";
import { hidrocarburoDe, TIPOS } from "./data.js";
import {
  instalarControladorRender,
  pedirRenderContinuo,
  liberarRenderContinuo,
  pedirRenderPuntual,
} from "./controladorRender.js";

import {
  CESIUM_TOKEN,
  FAJA_BBOX,
  CAMARA,
  PRESUPUESTO,
  COLOR_HIDROCARBURO,
  COLOR_FLUIDO,
  COLOR_TIPO,
  COLOR_LIMITE,
  COLOR_TOPONIMIA,
  COLOR_AGUA,
  COLOR_CENTRAL,
  ESCALA_CENTRAL,
  ZOOM_ETIQUETA,
  TAMANO_ICONO,
} from "./config.js";

/** @type {Viewer | null} */
let viewer = null;

/** Numera los vuelos de camara para que cada uno tenga su propio hold (ADR-019). */
let secuenciaVuelos = 0;

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

  // Antes de cualquier vuelo: sin esto, iniciarVistaConVuelo() de abajo
  // pediria un hold que nadie aplica. Ver docs/DECISIONS.md -> ADR-019.
  instalarControladorRender(viewer);

  aplicarEstiloOscuro();
  ajustarCalidad(false);
  conectarCalidadAdaptativa();

  // Ocultar el creditContainer por defecto no: la atribucion de Cesium y de los
  // proveedores de terreno es OBLIGATORIA por licencia. Ver DATA_SOURCES.md.

  // La aplicacion abre directamente sobre la Faja, no sobre el globo entero.
  // (adelanto de M4: vuelo de entrada, ver iniciarVistaConVuelo mas abajo).
  iniciarVistaConVuelo();
  conectarSeleccion();

  return viewer;
}

/**
 * Oscurece la capa de imagenes por defecto para un aspecto de "instrumento
 * tecnico oscuro" (adelanto de M4). Ver docs/DECISIONS.md -> ADR-018.
 *
 * CONDICION DURA (C8 de docs/NOTION.md): NINGUN proveedor de teselas nuevo.
 * Se ajustan brillo, contraste, saturacion y gamma de la ImageryLayer que
 * Cesium ya carga por defecto, mas el color base del globo y el fondo de la
 * escena, para que combinen con `--color-shell` de style.css. Los colores por
 * sector (COLOR_HIDROCARBURO, COLOR_FLUIDO...) siguen leyendose: son mas
 * saturados que el fondo oscurecido y no se tocan (ADR-014, punto 3).
 */
function aplicarEstiloOscuro() {
  if (!viewer) return;

  const capaBase = viewer.imageryLayers.get(0);
  if (capaBase) {
    capaBase.brightness = 0.55;
    capaBase.contrast = 1.15;
    capaBase.saturation = 0.55;
    capaBase.gamma = 0.85;
  }

  // Bajo la imagen (huecos de cobertura, mar abierto) y el fondo del espacio:
  // el mismo tono que --color-shell, para que el globo no "salte" al chrome.
  viewer.scene.globe.baseColor = Color.fromCssColorString("#0b0f14");
  viewer.scene.backgroundColor = Color.fromCssColorString("#05080b");

  // Atmosfera sutil, no un halo azul brillante que desentone con el resto
  // oscurecido. La niebla (fog.enabled) ya se controla en ajustarCalidad.
  viewer.scene.skyAtmosphere.brightnessShift = -0.35;
  viewer.scene.skyAtmosphere.saturationShift = -0.25;
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
      pedirRenderPuntual("calidad-en-reposo");
    }, PRESUPUESTO.esperaReposo);
  });

  // Girar el telefono cambia el ancho y con el, el perfil aplicable.
  window.addEventListener("resize", () => ajustarCalidad(false));
}

/**
 * Avisa una sola vez cuando el terreno visible termina de cargar.
 *
 * Es lo que retira la pantalla de carga. Se espera a que la cola de teselas
 * haya tenido trabajo y se vacie: al arrancar la cola empieza en cero, y
 * darla por buena en ese instante retiraria la pantalla antes de dibujar nada.
 *
 * @param {() => void} callback
 */
export function alTerminarCargaInicial(callback) {
  if (!viewer) return;
  let huboCarga = false;
  const quitar = viewer.scene.globe.tileLoadProgressEvent.addEventListener(
    (pendientes) => {
      if (pendientes > 0) {
        huboCarga = true;
        return;
      }
      if (!huboCarga) return;
      quitar();
      callback();
    }
  );
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
  // En pantalla vertical el campo de vision horizontal es la mitad: la vista
  // de escritorio cortaba la Faja por los lados y llenaba de cielo el tercio
  // superior. Ver CAMARA.inclinacionVertical en config.js.
  const vertical = window.innerHeight > window.innerWidth;
  const offset = new HeadingPitchRange(
    CesiumMath.toRadians(CAMARA.rumbo),
    CesiumMath.toRadians(
      vertical ? CAMARA.inclinacionVertical : CAMARA.inclinacion
    ),
    esfera.radius * (vertical ? CAMARA.margenVertical : CAMARA.margen)
  );
  return { esfera, offset };
}

/**
 * Vuela la camara para encuadrar la Faja Petrolifera del Orinoco completa,
 * en vista oblicua. Fase 1.
 *
 * Sostiene el render continuo mientras dura el vuelo (ADR-019): sin esto, en
 * modo reposo Cesium solo redibuja ante input de camara y el vuelo se ve a
 * tirones en vez de fluido.
 */
export function volarAFaja() {
  if (!viewer) return;
  const { esfera, offset } = vistaFaja();
  // Un id por vuelo: si un vuelo nuevo cancela al anterior, el `cancel` del
  // viejo no debe soltar el hold del nuevo.
  const hold = `volar-faja-${++secuenciaVuelos}`;
  pedirRenderContinuo(hold);
  viewer.camera.flyToBoundingSphere(esfera, {
    offset,
    duration: CAMARA.duracionVuelo,
    complete: () => liberarRenderContinuo(hold),
    cancel: () => liberarRenderContinuo(hold),
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

/**
 * Vista de arranque con vuelo de entrada (adelanto de M4/M3, punto 4 del
 * paquete visual). Ver docs/DECISIONS.md -> ADR-018.
 *
 * La camara arranca en una vista de continente/globo y vuela hasta el
 * encuadre normal de la Faja en `CAMARA.duracionVuelo` (~3 s), la misma
 * duracion que ya usa "Volar a la Faja". Se omite:
 * - con `prefers-reduced-motion: reduce` (directo al encuadre final, sin vuelo);
 * - si el usuario toca el mapa mientras el vuelo esta en curso: se cancela y
 *   el gesto pasa a manejar la camara con normalidad. Un vuelo a medio
 *   terminar que el usuario no puede interrumpir es peor que no volar.
 */
export function iniciarVistaConVuelo() {
  if (!viewer) return;
  const { esfera, offset } = vistaFaja();

  const reducido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reducido) {
    encuadrarFaja();
    return;
  }

  // Vista de partida: mismo rumbo e inclinacion que el encuadre final, mucho
  // mas lejos -a escala de continente/globo-, para que el vuelo tenga a donde
  // ir. El multiplicador es un detalle de esta animacion, no un encuadre
  // reutilizable, por eso no vive en config.js junto a CAMARA.margen.
  const lejos = new HeadingPitchRange(offset.heading, offset.pitch, esfera.radius * 35);
  viewer.camera.viewBoundingSphere(esfera, lejos);
  viewer.camera.lookAtTransform(Matrix4.IDENTITY);

  const canvas = viewer.scene.canvas;
  const eventosInteraccion = ["pointerdown", "wheel", "touchstart"];
  const cancelarPorInteraccion = () => {
    viewer.camera.cancelFlight();
    quitarListeners();
  };
  const quitarListeners = () => {
    for (const ev of eventosInteraccion) {
      canvas.removeEventListener(ev, cancelarPorInteraccion);
    }
  };
  for (const ev of eventosInteraccion) {
    canvas.addEventListener(ev, cancelarPorInteraccion, { once: true, passive: true });
  }

  // Sostiene el render continuo mientras dura el vuelo de entrada (ADR-019):
  // es la animacion mas larga de la app (~3 s) y la primera que ve el
  // usuario, justo donde un tironeo se nota mas.
  const HOLD = "vuelo-entrada";
  pedirRenderContinuo(HOLD);
  const terminar = () => {
    quitarListeners();
    liberarRenderContinuo(HOLD);
  };

  viewer.camera.flyToBoundingSphere(esfera, {
    offset,
    duration: CAMARA.duracionVuelo,
    complete: terminar,
    cancel: terminar,
  });
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

// --- Registro de capas -------------------------------------------------------

/** Capas por nombre, para poder encenderlas y apagarlas. */
const capas = new Map();

/**
 * Visibilidad que el usuario ha pedido para cada capa o sector.
 *
 * El interruptor de la interfaz existe desde el primer instante, pero la capa
 * llega por red segundos despues. Sin este registro, apagar una capa mientras
 * cargaba no hacia nada: la capa aparecia igual y el interruptor mentia.
 *
 * @type {Map<string, boolean>}
 */
const visibilidadPedida = new Map();

/**
 * Entidades de cada activo, por capa y por id estable.
 *
 * Es lo que permite al buscador y a la tabla volar a un activo sin recorrer
 * las colecciones de Cesium. Un campo MultiPolygon tiene varias entidades, una
 * por parte: se guardan todas para encuadrarlo entero.
 *
 * @type {Map<string, Map<string, Array<Object>>>}
 */
const indice = new Map();

/**
 * Crea (o reemplaza) una capa con nombre y la registra.
 *
 * @param {string} nombre
 * @param {boolean} [visiblePorDefecto=true] — si nadie ha pedido otra cosa
 * @returns {CustomDataSource}
 */
function nuevaCapa(nombre, visiblePorDefecto = true) {
  const previa = capas.get(nombre);
  // Redibujar una capa NO puede volver a encenderla. Pasa al cambiar de idioma
  // con la toponimia apagada: sin esto, reaparecia sola y el interruptor de la
  // leyenda se quedaba mintiendo.
  const visible =
    visibilidadPedida.get(nombre) ?? previa?.show ?? visiblePorDefecto;
  if (previa && viewer) viewer.dataSources.remove(previa, true);
  indice.delete(nombre);
  const capa = new CustomDataSource(nombre);
  capa.show = visible;
  capas.set(nombre, capa);
  return capa;
}

/**
 * Registra una entidad bajo el id de su activo.
 * @param {string} capa
 * @param {string | null | undefined} id
 * @param {Object} entidad
 */
function indexar(capa, id, entidad) {
  if (!id) return;
  let porId = indice.get(capa);
  if (!porId) {
    porId = new Map();
    indice.set(capa, porId);
  }
  porId.set(id, [...(porId.get(id) ?? []), entidad]);
}

/**
 * Anade o retira un DataSource del viewer segun su visibilidad, en vez de
 * limitarse a `capa.show = visible`. Ver docs/DECISIONS.md -> ADR-019.
 *
 * Por que: Cesium recorre cada DataSource del viewer en cada frame aunque
 * tenga `show = false` (la misma observacion que hace, sobre su propia capa
 * de cables submarinos, bilawalsidhu/gods-eye-view — ver THIRD-PARTY.md). Con
 * 105-346 entidades por capa el coste hoy es marginal, pero es la practica
 * correcta desde ya, antes de que una capa crezca (PERFORMANCE_BUDGET.md ya
 * anticipa clustering "al pasar de ~300 puntos visibles").
 *
 * `destroy=false` al retirar conserva las entidades ya parseadas dentro del
 * CustomDataSource (que sigue vivo en el Map `capas`): volver a encenderla
 * las vuelve a anadir al viewer sin pedir el GeoJSON por red otra vez.
 *
 * NO se usa para la capa "downstream": mezcla dos sectores (refinerias/
 * puertos y terminales de midstream) en un mismo DataSource, con visibilidad
 * decidida entidad por entidad en `aplicarSectoresMixtos()`. Retirar el
 * DataSource entero apagaria tambien el sector que si deberia verse, asi que
 * esa capa se queda con `show` siempre `true` a nivel de DataSource y el
 * `show` de cada entidad es lo que manda.
 *
 * @param {CustomDataSource} capa
 * @param {boolean} visible
 */
function sincronizarEnViewer(capa, visible) {
  capa.show = visible;
  if (!viewer) return;
  const presente = viewer.dataSources.contains(capa);
  if (visible && !presente) viewer.dataSources.add(capa);
  else if (!visible && presente) viewer.dataSources.remove(capa, false);
}

/**
 * Anota la visibilidad pedida y la aplica si la capa ya existe.
 * @param {string} nombre
 * @param {boolean} visible
 */
function fijarVisible(nombre, visible) {
  visibilidadPedida.set(nombre, visible);
  const capa = capas.get(nombre);
  if (capa) sincronizarEnViewer(capa, visible);
}

// --- Capa de campos (Fase 2) -------------------------------------------------

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
 * Devuelve las lineas de una geometria, cada una como [[lng, lat], ...].
 * Unifica LineString y MultiLineString, y descarta tramos de menos de dos
 * vertices, que no son una linea.
 *
 * Existe por un fallo real: los 20 rios de Natural Earth llegan como
 * MultiLineString —un rio con brazos, o cortado por la ventana del mapa— y el
 * codigo los trataba como LineString. Cesium recibia un array donde esperaba
 * una longitud, la capa entera fallaba al primer rio y el Orinoco, que da
 * nombre al proyecto, nunca llego a dibujarse.
 *
 * @param {Object} geometria
 * @returns {Array<Array<Array<number>>>}
 */
function lineasDe(geometria) {
  const lineas =
    geometria?.type === "LineString"
      ? [geometria.coordinates]
      : geometria?.type === "MultiLineString"
        ? geometria.coordinates
        : [];
  return lineas.filter((linea) => Array.isArray(linea) && linea.length >= 2);
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
 * @returns {number} campos dibujados
 */
export function dibujarCampos(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("campos");
  let dibujados = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const hidrocarburo = hidrocarburoDe(props.fluido);
    const cssColor =
      COLOR_HIDROCARBURO[hidrocarburo] ?? COLOR_HIDROCARBURO.desconocido;
    const color = Color.fromCssColorString(cssColor);

    // Segundo canal visual, independiente del color: un campo que no esta en
    // produccion se dibuja mas apagado y con el borde discontinuo. Son solo 6
    // de 105, pero perderlos al pasar a colorear por hidrocarburo habria sido
    // cambiar un dato por otro en vez de anadir uno.
    const enProduccion = props.estado === "activo";

    const comun = {
      name: props.nombre ?? props.id ?? "",
      // Las propiedades viajan con la entidad para que el panel las lea sin
      // volver a consultar el GeoJSON. `hidrocarburo` se normaliza una sola
      // vez aqui y viaja con ellas: ui.js no repite la clasificacion.
      properties: {
        ...props,
        hidrocarburo,
        tieneExtension: feature.geometry.type !== "Point",
      },
    };

    if (feature.geometry.type === "Point") {
      const [lng, lat] = feature.geometry.coordinates;
      const entidad = capa.entities.add({
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
      indexar("campos", props.id, entidad);
      dibujados += 1;
      continue;
    }

    // Polygon o MultiPolygon: una entidad por parte.
    let partes = 0;
    for (const [exterior, ...agujeros] of poligonosDe(feature.geometry)) {
      if (!exterior || exterior.length < 4) continue;

      const entidad = capa.entities.add({
        ...comun,
        polygon: {
          hierarchy: new PolygonHierarchy(
            aPosiciones(exterior),
            agujeros.map((a) => new PolygonHierarchy(aPosiciones(a)))
          ),
          material: color.withAlpha(enProduccion ? 0.45 : 0.2),
          // Sin altura ni extrusion: Cesium lo drapea sobre el terreno.
          // `outline` NO se usa: los contornos de poligono sobre terreno no
          // estan soportados y Cesium avisa en consola. El borde se dibuja
          // como polilinea pegada al suelo, en la misma entidad.
          outline: false,
        },
        polyline: {
          positions: aPosiciones(exterior),
          width: 2,
          // Discontinuo = no esta en produccion. Misma convencion que ya usan
          // los limites en disputa y la caja de referencia de la Faja.
          material: enProduccion
            ? color
            : new PolylineDashMaterialProperty({ color, dashLength: 14 }),
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
      indexar("campos", props.id, entidad);
      partes += 1;
    }
    if (partes > 0) dibujados += 1;
  }

  sincronizarEnViewer(capa, capa.show);

  if (capa.entities.values.length > PRESUPUESTO.maxEntidadesPorCapa) {
    console.warn(
      `Capa de campos: ${capa.entities.values.length} entidades, por encima ` +
        `del presupuesto (${PRESUPUESTO.maxEntidadesPorCapa}). ` +
        "Ver docs/PERFORMANCE_BUDGET.md."
    );
  }

  return dibujados;
}

/**
 * Conecta la seleccion de entidades con el callback registrado.
 *
 * Solo abren ficha los activos —los tipos de data.js— y las celdas DEMO. Las
 * fronteras y la caja de la Faja llevan propiedades para trazar su fuente,
 * pero no son activos: tocarlas abria una ficha de "Instalacion petrolera".
 * Ahora tocarlas se comporta como tocar el mapa vacio.
 */
function conectarSeleccion() {
  if (!viewer) return;
  viewer.selectedEntityChanged.addEventListener((entidad) => {
    if (!alSeleccionar) return;
    // PropertyBag.getValue exige un instante; los valores son constantes,
    // asi que cualquiera sirve.
    const props = entidad?.properties?.getValue(JulianDate.now());
    const esActivo = Boolean(
      props && (TIPOS.includes(props.tipo) || props.tipo === "demo")
    );
    if (entidad && !esActivo) {
      // Vuelve a entrar en este manejador con undefined, y eso cierra la ficha.
      viewer.selectedEntity = undefined;
      return;
    }
    alSeleccionar(esActivo ? props : null);
  });
}

// --- Capas midstream y downstream (Fase 3) -----------------------------------

/**
 * Dibuja los ductos como polilineas pegadas al terreno. Fase 3.
 *
 * Color por fluido transportado, no por estado: OSM no publica el estado
 * operativo de los ductos y fingir que si lo hace seria inventar.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @returns {number} ductos dibujados
 */
export function dibujarDuctos(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("ductos");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const lineas = lineasDe(feature.geometry);
    if (!lineas.length) continue;

    const color = Color.fromCssColorString(
      COLOR_FLUIDO[props.fluido] ?? COLOR_FLUIDO.desconocido
    );

    for (const linea of lineas) {
      const entidad = capa.entities.add({
        name: props.nombre ?? props.id ?? "",
        properties: { ...props },
        polyline: {
          positions: aPosiciones(linea),
          width: 2.5,
          material: color,
          clampToGround: true,
        },
      });
      indexar("ductos", props.id, entidad);
    }
    n += 1;
  }

  sincronizarEnViewer(capa, capa.show);
  return n;
}

/**
 * Dibuja refinerias, petroquimicas, plantas de gas, puertos y parques de
 * tanques. Fase 3.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @returns {number} instalaciones dibujadas
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

    const entidad = capa.entities.add({
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
    indexar("downstream", props.id, entidad);
    n += 1;
  }

  // Sin sincronizarEnViewer() a proposito: esta capa mezcla dos sectores
  // (downstream y midstream-terminales) en un mismo DataSource, visibles o no
  // entidad por entidad via aplicarSectoresMixtos(). Retirarla del viewer
  // cuando SOLO uno de los dos sectores este apagado tambien esconderia al
  // otro. Se queda siempre anadida; el show de cada entidad es lo que manda.
  // Ver docs/DECISIONS.md -> ADR-019.
  viewer.dataSources.add(capa);
  aplicarSectoresMixtos();
  return n;
}

/**
 * Aplica la visibilidad por sector a la capa "downstream", entidad a entidad.
 *
 * Esa capa mezcla dos sectores: refinerias, petroquimicas y puertos son
 * downstream, pero los parques de tanques son midstream. Por eso no basta con
 * el interruptor de la capa: apagar un sector esconderia activos del otro.
 */
function aplicarSectoresMixtos() {
  const mixta = capas.get("downstream");
  if (!mixta) return;
  const ahora = JulianDate.now();
  for (const entidad of mixta.entities.values) {
    const tipo = entidad.properties?.tipo?.getValue?.(ahora);
    const suSector = tipo === "terminal" ? "midstream" : "downstream";
    entidad.show = visibilidadPedida.get(`sector:${suSector}`) ?? true;
  }
}

/**
 * Enciende o apaga una capa por sector.
 *
 * Puede llamarse antes de que la capa haya llegado por red: la peticion queda
 * anotada y se respeta al dibujarla.
 *
 * @param {"upstream" | "midstream" | "downstream"} sector
 * @param {boolean} visible
 */
export function alternarCapa(sector, visible) {
  visibilidadPedida.set(`sector:${sector}`, visible);
  if (sector === "upstream") fijarVisible("campos", visible);
  if (sector === "midstream") fijarVisible("ductos", visible);
  aplicarSectoresMixtos();
  pedirRenderPuntual(`sector:${sector}`);
}

// --- Contexto geografico -----------------------------------------------------

/**
 * Dibuja fronteras y limites estatales.
 *
 * Dan referencia espacial: sin ellos, un pozo flota sobre una mancha verde y
 * no se sabe en que estado esta.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @returns {number} limites dibujados
 */
export function dibujarLimites(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("limites");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const lineas = lineasDe(feature.geometry);
    if (!lineas.length) continue;

    const esPais = props.nivel === "pais";
    const esDisputa = props.nivel === "disputa";

    // La zona en disputa se dibuja discontinua y en color propio. El trazo
    // discontinuo es la convencion cartografica para "limite no acordado", y
    // aqui ademas evita que se lea como una frontera mas del mapa.
    const material = esDisputa
      ? new PolylineDashMaterialProperty({
          color: Color.fromCssColorString(COLOR_LIMITE.disputa).withAlpha(0.9),
          dashLength: 22,
        })
      : Color.fromCssColorString(
          esPais ? COLOR_LIMITE.pais : COLOR_LIMITE.estado
        ).withAlpha(esPais ? 0.85 : 0.5);

    for (const linea of lineas) {
      capa.entities.add({
        name: props.nombre ?? "",
        properties: { ...props },
        polyline: {
          positions: aPosiciones(linea),
          width: esDisputa ? 2.5 : esPais ? 2.5 : 1.2,
          material,
          clampToGround: true,
        },
      });
    }
    n += 1;
  }

  sincronizarEnViewer(capa, capa.show);
  return n;
}

/**
 * Dibuja la Guayana Esequiba, territorio en disputa entre Venezuela y Guyana.
 *
 * Va en su propia capa, no mezclada con las fronteras, por dos razones: se
 * puede apagar por separado, y sobre todo no es lo mismo que un limite
 * acordado. Confundir ambas cosas en una sola capa seria justo el descuido que
 * la regla de neutralidad del proyecto trata de evitar.
 *
 * Ver docs/DATA_SOURCES.md seccion 13.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @returns {number}
 */
export function dibujarZonaDisputada(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("disputa");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const lineas = lineasDe(feature.geometry);
    if (!lineas.length) continue;

    for (const linea of lineas) {
      capa.entities.add({
        name: props.nombre ?? "",
        properties: { ...props },
        polyline: {
          positions: aPosiciones(linea),
          width: 2.5,
          // Discontinua: convencion cartografica para "limite no acordado".
          material: new PolylineDashMaterialProperty({
            color: Color.fromCssColorString(COLOR_LIMITE.disputa).withAlpha(0.9),
            dashLength: 22,
          }),
          clampToGround: true,
        },
      });
    }
    n += 1;
  }

  sincronizarEnViewer(capa, capa.show);
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

  sincronizarEnViewer(capa, capa.show);
}

/**
 * Enciende o apaga una capa de contexto por nombre.
 *
 * Como `alternarCapa`, admite llamarse antes de que la capa exista.
 *
 * @param {"limites" | "disputa" | "faja" | "toponimia" | "hidrografia" | "centrales"} nombre
 * @param {boolean} visible
 */
export function alternarContexto(nombre, visible) {
  fijarVisible(nombre, visible);
  pedirRenderPuntual(`contexto:${nombre}`);
}

// --- Toponimia e hidrografia -------------------------------------------------

/**
 * Nombre a mostrar segun el idioma activo.
 *
 * Los toponimos son DATO, no cadenas de interfaz: no pasan por t(). Natural
 * Earth ya trae la version de cada idioma, asi que se elige aqui. Si falta la
 * inglesa se usa la local, que es lo que hace cualquier atlas serio: no se
 * traduce a la fuerza lo que no tiene exonimo.
 *
 * @param {Object} props
 * @param {string} lang
 * @returns {string}
 */
function nombreSegunIdioma(props, lang) {
  return (lang === "en" ? props.nombre_en : props.nombre) ?? props.nombre ?? "";
}

/**
 * Estilo comun de todos los rotulos.
 *
 * El contorno oscuro no es decoracion: el mapa se dibuja sobre terreno real,
 * que puede ser arena clara o selva oscura en la misma pantalla. Sin contorno,
 * la mitad de los nombres desaparece.
 *
 * @param {string} fuente — font CSS
 * @param {string} color
 * @param {[number, number]} rango — [cerca, lejos] en metros
 * @returns {Object}
 */
function estiloRotulo(fuente, color, rango) {
  return {
    font: fuente,
    fillColor: Color.fromCssColorString(color),
    outlineColor: Color.fromCssColorString("#0f172a").withAlpha(0.9),
    outlineWidth: 3,
    style: LabelStyle.FILL_AND_OUTLINE,
    verticalOrigin: VerticalOrigin.CENTER,
    horizontalOrigin: HorizontalOrigin.CENTER,
    heightReference: HeightReference.CLAMP_TO_GROUND,
    // Los rotulos no los tapa el relieve: un nombre medio escondido detras de
    // una montana es peor que no ponerlo.
    disableDepthTestDistance: Number.POSITIVE_INFINITY,
    distanceDisplayCondition: new DistanceDisplayCondition(rango[0], rango[1]),
    // Se desvanecen en el ultimo tramo en vez de desaparecer de golpe, para
    // que cambiar de escala no sea un parpadeo.
    translucencyByDistance: new NearFarScalar(rango[1] * 0.75, 1, rango[1], 0.15),
  };
}

/**
 * Dibuja los nombres de paises, estados y ciudades.
 *
 * Es la diferencia mas grande entre este mapa y los mapas 2D de divulgacion
 * del sector: alli se sabe siempre en que estado esta cada cosa. Aqui, hasta
 * ahora, un campo flotaba sobre una mancha verde sin nombre.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @param {string} lang — idioma activo
 * @returns {number} rotulos dibujados
 */
export function dibujarToponimia(featureCollection, lang = "es") {
  if (!viewer) return 0;
  const capa = nuevaCapa("toponimia");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const texto = nombreSegunIdioma(props, lang);
    if (!texto) continue;

    const esCiudad = props.clase === "ciudad";
    const rango = esCiudad
      ? (ZOOM_ETIQUETA.ciudad[props.rango] ?? ZOOM_ETIQUETA.ciudad[3])
      : ZOOM_ETIQUETA[props.clase];
    if (!rango) continue;

    // Paises y estados en mayusculas: son areas, no lugares. Es la convencion
    // cartografica de siempre, y ahorra explicar en la leyenda que un rotulo
    // suelto sin punto nombra un territorio y no un sitio concreto.
    const entidad = {
      name: texto,
      position: Cartesian3.fromDegrees(coords[0], coords[1]),
      label: {
        ...estiloRotulo(
          props.clase === "pais"
            ? "600 13px system-ui, -apple-system, sans-serif"
            : props.clase === "estado"
              ? "500 11px system-ui, -apple-system, sans-serif"
              : "500 12px system-ui, -apple-system, sans-serif",
          COLOR_TOPONIMIA[props.clase] ?? COLOR_TOPONIMIA.ciudad,
          rango
        ),
        text: esCiudad ? texto : texto.toUpperCase(),
        // La ciudad lleva punto, asi que su nombre se aparta para no taparlo.
        ...(esCiudad
          ? {
              pixelOffset: new Cartesian2(0, -11),
              verticalOrigin: VerticalOrigin.BOTTOM,
            }
          : {}),
      },
    };

    if (esCiudad) {
      entidad.point = {
        // La capital se marca algo mas grande. Lo declara la fuente en
        // FEATURECLA; no lo decidimos nosotros.
        pixelSize: props.capital ? 5 : 4,
        color: Color.fromCssColorString(COLOR_TOPONIMIA.marca),
        outlineColor: Color.fromCssColorString("#0f172a"),
        outlineWidth: 1.5,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new DistanceDisplayCondition(rango[0], rango[1]),
      };
    }

    capa.entities.add(entidad);
    n += 1;
  }

  sincronizarEnViewer(capa, capa.show);
  return n;
}

/**
 * Centro medio de un anillo, solo para colocar un rotulo.
 *
 * No es un centroide de area ni pretende serlo: los cuatro lagos de esta capa
 * son convexos y la media de sus vertices cae dentro del agua. Si algun dia
 * entra uno con forma de herradura, su rotulo caera en el hueco y habra que
 * calcular el punto de inaccesibilidad de verdad.
 *
 * @param {Array<Array<number>>} anillo
 * @returns {[number, number]}
 */
function centroDe(anillo) {
  let lng = 0;
  let lat = 0;
  for (const [x, y] of anillo) {
    lng += x;
    lat += y;
  }
  return [lng / anillo.length, lat / anillo.length];
}

/**
 * Dibuja rios, lagos y embalses.
 *
 * El rio Orinoco da nombre al proyecto y no estaba en el mapa. Y no es solo
 * simbolico: la Faja se llama asi porque bordea el rio, los puertos de
 * exportacion estan donde estan por el, y el embalse de Guri —que entra en
 * esta misma capa— es lo que da electricidad al oriente del pais.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @param {string} lang — idioma activo
 * @returns {number} elementos dibujados
 */
export function dibujarHidrografia(featureCollection, lang = "es") {
  if (!viewer) return 0;
  const capa = nuevaCapa("hidrografia");
  const rango = ZOOM_ETIQUETA.agua;
  let n = 0;

  /** Anade el rotulo de un elemento de agua, si la fuente le da nombre. */
  const rotular = (texto, lng, lat) => {
    if (!texto) return;
    capa.entities.add({
      name: texto,
      position: Cartesian3.fromDegrees(lng, lat),
      label: {
        ...estiloRotulo(
          "italic 500 11px system-ui, -apple-system, sans-serif",
          COLOR_AGUA.etiqueta,
          rango
        ),
        text: texto,
      },
    });
  };

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const geometria = feature.geometry;
    if (!geometria?.coordinates) continue;

    const texto = nombreSegunIdioma(props, lang);

    if (props.clase === "rio") {
      const lineas = lineasDe(geometria);
      if (!lineas.length) continue;

      for (const linea of lineas) {
        capa.entities.add({
          name: texto,
          polyline: {
            positions: aPosiciones(linea),
            // Mas ancho y mas translucido que un ducto: asi el agua se lee
            // como agua y no como infraestructura. Ver COLOR_AGUA en config.js.
            width: 3,
            material: Color.fromCssColorString(COLOR_AGUA.rio).withAlpha(0.55),
            clampToGround: true,
          },
        });
      }

      // El nombre va en el vertice central del tramo mas largo, que es lo mas
      // parecido a "sobre el rio" que se puede hacer sin texto curvado. Los
      // dos rios que la fuente deja sin nombre se dibujan igual: la linea
      // informa aunque no se pueda rotular, y no se les inventa uno.
      const principal = lineas.reduce((a, b) => (b.length > a.length ? b : a));
      const medio = principal[Math.floor(principal.length / 2)];
      rotular(texto, medio[0], medio[1]);
      n += 1;
      continue;
    }

    // Lagos y embalses.
    const partes = poligonosDe(geometria);
    for (const [exterior, ...agujeros] of partes) {
      if (!exterior || exterior.length < 4) continue;

      capa.entities.add({
        name: texto,
        polygon: {
          hierarchy: new PolygonHierarchy(
            aPosiciones(exterior),
            agujeros.map((a) => new PolygonHierarchy(aPosiciones(a)))
          ),
          material: Color.fromCssColorString(COLOR_AGUA.lago).withAlpha(0.5),
          outline: false,
        },
      });
      n += 1;
    }

    const anillo = partes[0]?.[0];
    if (anillo?.length) {
      const [lng, lat] = centroDe(anillo);
      rotular(texto, lng, lat);
    }
  }

  sincronizarEnViewer(capa, capa.show);
  return n;
}

// --- Centrales electricas ----------------------------------------------------

/**
 * Dibuja las centrales electricas.
 *
 * El tamano del simbolo dice la capacidad instalada, como en los mapas de
 * referencia: Guri (8.851 MW) tiene que verse distinto de una termica de
 * 20 MW, porque esa diferencia ES el dato.
 *
 * Nace apagada. No es cadena de hidrocarburos (ADR-013): es contexto que se
 * pide, no ruido que se aparta. Un mapa que ya tiene 97 instalaciones y 105
 * campos no necesita 43 simbolos mas por defecto.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @returns {number} centrales dibujadas
 */
export function dibujarCentrales(featureCollection) {
  if (!viewer) return 0;
  const capa = nuevaCapa("centrales", false);
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;

    const clase = props.clase ?? "otro";
    const cssColor = COLOR_CENTRAL[clase] ?? COLOR_CENTRAL.otro;

    // Raiz cuadrada, no proporcion directa: Guri es 440 veces la central mas
    // pequena y en lineal una de las dos seria invisible. Sin capacidad
    // declarada se usa el tamano minimo, que es lo honesto: no se supone.
    const mw = props.capacidad_mw ?? 0;
    const fraccion = Math.min(1, Math.sqrt(mw / ESCALA_CENTRAL.referenciaMw));
    const escala =
      ESCALA_CENTRAL.minima +
      (ESCALA_CENTRAL.maxima - ESCALA_CENTRAL.minima) * fraccion;

    const entidad = capa.entities.add({
      name: props.nombre ?? props.id ?? "",
      properties: { ...props },
      position: Cartesian3.fromDegrees(coords[0], coords[1]),
      billboard: {
        image: icono(clase, cssColor),
        width: TAMANO_ICONO * escala,
        height: TAMANO_ICONO * escala,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        verticalOrigin: VerticalOrigin.BOTTOM,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(1.0e4, 1.1, 2.5e6, 0.45),
      },
    });
    indexar("centrales", props.id, entidad);
    n += 1;
  }

  sincronizarEnViewer(capa, capa.show);
  return n;
}

// --- Navegacion a un activo --------------------------------------------------

/**
 * Vuela hasta un activo y lo selecciona, lo que abre su ficha.
 *
 * Lo usan el buscador y la tabla. Un punto no tiene extension: sin distancia
 * explicita Cesium se acerca a 100 m, su minimo, y el simbolo llena la
 * pantalla sin ningun contexto. Los poligonos y las lineas se encuadran
 * enteros, con todas sus partes.
 *
 * Quien llama es responsable de que la capa este encendida: volar a una
 * entidad oculta no encuadra nada.
 *
 * @param {string} capa — "campos", "ductos", "downstream" o "centrales"
 * @param {string | Array<string>} ids — id estable del activo, o varios
 * @returns {boolean} si habia algo a lo que volar
 */
export function volarAActivo(capa, ids) {
  if (!viewer) return false;
  const porId = indice.get(capa);
  const entidades = [ids]
    .flat()
    .flatMap((id) => porId?.get(id) ?? []);
  if (!entidades.length) return false;

  const puntual = !entidades[0].polygon && !entidades[0].polyline;
  // Sostiene el render continuo mientras dura el vuelo (ADR-019). viewer.flyTo
  // devuelve una promesa que resuelve en true al completar y false al
  // cancelar; cualquiera de los dos desenlaces libera el hold.
  const HOLD = `volar-activo-${++secuenciaVuelos}`;
  pedirRenderContinuo(HOLD);
  viewer
    .flyTo(entidades, {
      duration: CAMARA.duracionVueloActivo,
      offset: new HeadingPitchRange(
        0,
        CesiumMath.toRadians(CAMARA.inclinacionActivo),
        puntual ? CAMARA.distanciaActivoPuntual : 0
      ),
    })
    .finally(() => liberarRenderContinuo(HOLD));
  viewer.selectedEntity = entidades[0];
  return true;
}

// --- Capa demostrativa (Fase 5) ----------------------------------------------

/** @type {(() => void) | null} */
let mostrarBannerDemo = null;
/** @type {(() => void) | null} */
let ocultarBannerDemo = null;

/**
 * Registra como mostrar y ocultar el banner DEMO.
 * ui.js las provee; map.js las exige antes de dibujar nada.
 *
 * @param {() => void} mostrar
 * @param {() => void} ocultar
 */
export function registrarBannerDemo(mostrar, ocultar) {
  mostrarBannerDemo = mostrar;
  ocultarBannerDemo = ocultar;
}

/** Rampa de color del score: azul frio (0) a rojo (1). */
function colorScore(score) {
  const s = Math.max(0, Math.min(1, score));
  // Interpolacion en HSL de 220 grados (azul) a 0 (rojo).
  return Color.fromHsl((220 * (1 - s)) / 360, 0.75, 0.5, 0.55);
}

/**
 * Dibuja el grid de probabilidad DEMO. Fase 5.
 *
 * CONDICION INNEGOCIABLE: esta capa NO se dibuja si no hay un banner DEMO
 * registrado. La comprobacion vive en el codigo, no en la buena voluntad de
 * quien la use: un descuido futuro que quite el banner deja la capa apagada
 * en vez de publicar un modelo sintetico sin avisar.
 *
 * Ver MODEL_CARD.md.
 *
 * @param {{features: Array<Object>}} featureCollection
 * @returns {number} celdas dibujadas
 */
export function dibujarGridProbabilidad(featureCollection) {
  if (!viewer) return 0;

  if (!mostrarBannerDemo || !ocultarBannerDemo) {
    console.error(
      "Capa DEMO no dibujada: falta registrar el banner con registrarBannerDemo(). " +
        "Es deliberado. Ver MODEL_CARD.md."
    );
    return 0;
  }

  const capa = nuevaCapa("demo");
  let n = 0;

  for (const feature of featureCollection.features) {
    const props = feature.properties ?? {};
    const anillo = feature.geometry?.coordinates?.[0];
    if (!Array.isArray(anillo) || anillo.length < 4) continue;

    capa.entities.add({
      name: props.id ?? "",
      properties: { ...props },
      polygon: {
        hierarchy: new PolygonHierarchy(aPosiciones(anillo)),
        material: colorScore(props.score ?? 0),
        outline: false,
      },
    });
    n += 1;
  }

  // La capa nace apagada: el usuario la enciende a proposito, y encenderla
  // levanta el banner. No entra al viewer hasta entonces (ADR-019).
  sincronizarEnViewer(capa, false);
  return n;
}

/**
 * Enciende o apaga la capa DEMO, arrastrando el banner con ella.
 * @param {boolean} visible
 */
export function alternarDemo(visible) {
  const capa = capas.get("demo");
  if (!capa) return;

  sincronizarEnViewer(capa, visible);
  if (visible) mostrarBannerDemo?.();
  else ocultarBannerDemo?.();

  pedirRenderPuntual("demo");
}

/** @returns {boolean} si la capa DEMO llego a cargarse */
export function hayCapaDemo() {
  return capas.has("demo") && capas.get("demo").entities.values.length > 0;
}
