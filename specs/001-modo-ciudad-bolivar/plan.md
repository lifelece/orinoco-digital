# Plan 001 — Modo Ciudad Bolivar

> Spec: `specs/001-modo-ciudad-bolivar/spec.md` · ADR-020 piezas 1, 2, 5, 7 y 10
> aceptadas (2026-10-12). Rama `expofaja-e1`. Objetivo: martes 2026-10-13.
> Base de contratos: especificacion tecnica de Notion ("04 — Especificacion
> tecnica", copia del 2026-10-12 19:41 UTC). **Donde choca con el codigo real,
> manda el codigo** y se anota en §7. Donde choca con la spec, manda la spec.

## 1. Enfoque

- **El modo es un objeto declarativo** (`DEFINICION_MODOS` en `config.js`:
  camara, capas que enciende, anillos, interfaz, a que modo vuelve el gesto
  atras). `main.js` lo aplica con una sola funcion generica y guarda el estado
  en un unico sitio. Ni `map.js` ni la interfaz preguntan "en que modo
  estamos". Es el minimo que el Sistema de Modos (N1) puede absorber sin
  reescribir; no hay modeStore.
- Calculo en `data.js` (T1 + tres funciones puras), dibujo en `map.js`, DOM en
  `src/ui/` (ADR-017) con pegamento minimo en `ui.js`, orquestacion en
  `main.js` y la parte pura de URL/modos en `src/modos.js` (nuevo, testeable).
- `map.js` sigue sin i18n: recibe las etiquetas ya compuestas por `main.js` con
  `t(clave, params)`, como hoy recibe `lang` para la toponimia.
- Paralelismo: dos tareas previas comunes (T2 i18n, T3 config) fijan claves y
  constantes; despues A (mapa), B (interfaz) y C (orquestacion y docs) trabajan
  sobre archivos disjuntos contra las firmas de §3; I1 integra.

## 2. Archivos

Paquete = dueno del archivo. Nadie toca un archivo de otro paquete.

| Ruta | Accion | Que cambia | RF | Paquete |
|---|---|---|---|---|
| `src/data.js` | Cambiar | 4 funciones de proximidad + export `haversineKm` | 8, 9 | T1 (en curso) |
| `src/config.js` | Cambiar | Constantes Ciudad Bolivar, `ID_SEDE_EXPOFAJA` | — | T1 (en curso) |
| `scripts/ciudad-bolivar-to-geojson.mjs`, `package.json`, `test/ciudadBolivar.test.mjs`, `docs/DATA_SOURCES.md` §17, `public/data/{ciudad-bolivar-osm.geojson, iniciativas-ccieb.geojson, ciudad-bolivar-resumen.json}` | Crear | Datos de la capa e iniciativas | 8, 12, 14 | T1 (en curso) |
| `src/i18n/interpolar.js` | **Crear** | `interpolar(texto, params)` pura | 7, 21 | T2 |
| `src/i18n/index.js` | Cambiar | `t(clave, params?)`; sin `params` devuelve lo mismo que hoy | 21 | T2 |
| `src/i18n/es.json`, `en.json` | Cambiar | Las 39 claves de §3.5 | 21 | T2, despues B |
| `test/i18n.test.mjs` | Cambiar | Tests de `interpolar`; mismos `{marcadores}` en ES y EN; la regex de uso acepta `t("x", {...})` | 21 | T2 |
| `src/config.js` | Cambiar | Constantes de §3.6 | 1-4, 11, 16, 17 | T3, despues A (solo valores medidos) |
| `test/rutas-datos.test.mjs` | Cambiar | Cada ruta de `MARCAS_MODO` existe en `public/` | 16 | T3 |
| `scripts/verificar-modulos.mjs` | Cambiar | Regla nueva: `/expofaja/marcas/` solo en `config.js`; `MARCAS_MODO` solo lo importa `src/ui/modoCiudadBolivar.js` | RNF-3 | T3 |
| `src/iconos.js` | Cambiar | `iconoCiudad(clave, color)` (8 clases + `iniciativa`); `envolver` acepta color de trazo sin cambiar la salida de `icono`/`iconoAproximado` | 11, 14, RNF-3 | A |
| `test/iconos.test.mjs` | **Crear** | Ver A1 | 11, 14, RNF-3 | A |
| `src/controladorRender.js` | Cambiar (aditivo) | `sostenerHastaListo(id, listo)` | 7, 9 | A |
| `test/controladorRender.test.mjs` | Cambiar | Tests de `sostenerHastaListo` | 7, 9 | A |
| `src/map.js` | Cambiar | §3.3 | 4, 5, 7, 9-14 | A |
| `src/ui/fichaCiudad.js` | **Crear** | HTML de la ficha de servicio o iniciativa y lista de cercanos | 9, 13, 21 | A (es interfaz: reglas de `interfaz.md`) |
| `src/ui/modoCiudadBolivar.js` | **Crear** | Cabecera, panel, acceso "Ver Ciudad Bolivar", repintado | 5, 6, 15, 16, 21 | B |
| `src/ui.js` | Cambiar | Solo pegamento (objetivo <= 120 lineas netas): ranuras, grupo de capas, `fijarCapas`, `irAActivo` exportado, buscador, ficha con `extra`, `soltarVistas`, `fijarAccionVolarFaja` | 5, 6, 9, 11, 13, 17, 20 | B |
| `src/style.css` | Cambiar si hace falta | Solo tokens/utilidades nuevas; sin colores de marca | 16 | B |
| `src/data.js` | Cambiar (tras T1) | `verticeMasCercano`, `contarPorClase`, `iniciativasSinGeometria` | 9, 15 | C |
| `test/data.test.mjs` | Cambiar | Tests de esas tres | 9, 15 | C |
| `src/api.js` | Cambiar | `getCiudadBolivar`, `getIniciativasCcieb`, `getListaIniciativasCcieb` | 12, 14, 15, 20 | C |
| `src/modos.js` | **Crear** | `leerEnlace`, `resolverModo`, `urlDeModo`, `buscarActivo` (puras, sin DOM) | 1-3, 17, 18 | C |
| `test/modos.test.mjs` | **Crear** | Ver C2 | 1-3, 11, 17, 18 | C |
| `src/main.js` | Cambiar | §3.7 y §3.9 | 1-11, 15, 17, 18, 20 | C |
| `vercel.json` | Cambiar | `redirects` temporal | 19 | C |
| `docs/DECISIONS.md` | Cambiar | ADR-020 copiado | — | C |
| `docs/DATA_SOURCES.md` | Cambiar (tras T1) | Seccion 16, antes de la 17 de T1 | — | C |
| `LICENSE-DATA` | Cambiar | Aviso de marcas y contenido del organizador | — | C |
| `docs/ARCHITECTURE.md` | Cambiar | `modos.js`, `ui/modoCiudadBolivar.js`, `ui/fichaCiudad.js` en la lista de modulos | — | C |
| `docs/capturas/e1-antes-{escritorio,movil}.png` | Crear | Produccion actual, 1440x900 y 390x844 | — | C |
| `docs/capturas/e1-despues-{escritorio,movil}.png`, `e1-ficha-sede-movil.png` | Crear | Rama, mismos tamanos | 4, 9, 16 | I1 |
| `MEMORY.md`, `specs/README.md`, `spec.md` (estado) | Cambiar | Cierre | — | I2 |

No se tocan: `index.html`, `vite.config.js`, `package.json` (T1 ya anade
`data:ciudad-bolivar`), el contrato de `api.js`, las firmas existentes de
`controladorRender.js`.

## 3. Contratos

### 3.1 Lo que entrega T1 (no se toca; codigo real de la rama)

```js
// src/data.js — gana sobre Notion (ver §7)
export function haversineKm(a, b)                        // no la usa ningun paquete
export function distanciaMinimaKm(punto, feature)        // km | Infinity
export function camposMasCercanos(punto, campos, n = 5)  // Array<{feature, km}> ascendente
export function contarPorAnillo(punto, campos, anillosKm) // {"50": 0, "100": 10, ...} acumulado
export function circuloGeodesico(centro, km, n = 96)     // n+1 [lng, lat]; el primero es el NORTE
// punto/centro = {lng, lat}; campos = Array de features (no la coleccion)

// src/config.js (T1)
RUTAS_DATOS.ciudadBolivar, RUTAS_DATOS.iniciativasCcieb,
CENTRO_CIUDAD_BOLIVAR /* {lng, lat} */, CIUDAD_BOLIVAR_CAJA, ANILLOS_KM, CLASES_CIUDAD, ID_SEDE_EXPOFAJA
```

GeoJSON (Notion §3.1 y §3.2): servicios con `id` `OSM-N|W|R…`, `nombre`
(o `null`), `clase` en `CLASES_CIUDAD`, `sector`, `osm_url`, `fuente`,
`confianza`, `ultima_verificacion`, `geom_precision`; Point salvo `puente`
(LineString). Iniciativas con `id` `INI-…`, `nombre`, `tipo` (evento,
iniciativa, ...), `resumen`, `fechas?`, `fuente` (URL de la nota),
`fecha_fuente`, `ubicacion_osm`, `confianza`, `ultima_verificacion`; solo las
que tienen ubicacion (hoy 2, ambas en el Museo Soto).

Si T1 cierra con otra forma de retorno, solo cambia el adaptador de `main.js`
(C3). Los contratos hacia `map.js` y la interfaz (abajo) no cambian.

### 3.2 `data.js` y `api.js` nuevos (C1)

```js
/** Vertice de la feature mas cercano al punto. @returns {{posicion: [number, number], km: number} | null} */
export function verticeMasCercano(punto, feature) {}
/** Elementos por `properties.clase`; 0 para las clases sin elementos. @returns {Object<string, number>} */
export function contarPorClase(features, clases) {}
/**
 * Semilla de iniciativas -> FeatureCollection SIN geometria (RFC 7946 §3.2),
 * una feature por iniciativa: {id, nombre, fecha (fechas ?? fecha_fuente),
 * fecha_fuente, fuente, en_mapa (ubicacion.osm != null), ultima_verificacion}.
 * Solo para listas: no pasa por validarFeatureCollection ni llega a map.js.
 */
export function iniciativasSinGeometria(semilla) {}

// api.js — todas devuelven FeatureCollection (constitucion 4)
export async function getCiudadBolivar()          // cargarGeoJSON(RUTAS_DATOS.ciudadBolivar)
export async function getIniciativasCcieb()       // cargarGeoJSON(RUTAS_DATOS.iniciativasCcieb)
export async function getListaIniciativasCcieb()  // iniciativasSinGeometria(semilla); la semilla se
// importa en build: import semilla from "../docs/expofaja/semillas/iniciativas-ccieb.json"
// (decision D10, pendiente de la Duda 3; sin fetch extra, ~4 KB en el bundle)
```

### 3.3 `map.js` (A): lo que llama `main.js`

```js
/** RF-4. Encuadra el anillo de CAMARA_CIUDAD_BOLIVAR segun orientacion (§3.8). Vuela, o salta con movimiento reducido. */
export function vistaCiudadBolivar() {}

/** RF-7. Reemplaza los anillos. Capa "anillos": polilinea discontinua COLOR_ANILLO pegada al suelo + rotulo en coordenadas[0] (borde norte). */
export function dibujarAnillos(anillos) {} // anillos: Array<{km: number, campos: number, coordenadas: Array<[number, number]>, etiqueta: string}>
export function quitarAnillos() {}

/** RF-11..13. Capa "ciudadBolivar", nace apagada (ADR-013). Iconos iconoCiudad(clase, COLOR_CIUDAD); puente = linea 3 px. @returns {number} dibujadas */
export function dibujarCiudadBolivar(featureCollection) {}
/** RF-14. Capa "iniciativasCcieb", nace apagada; solo features con geometria; las que comparten coordenada se separan con pixelOffset (la coordenada no se toca). @returns {number} */
export function dibujarIniciativas(featureCollection) {}

/** RF-9. Reemplaza las lineas: discontinuas COLOR_CIUDAD, sede -> cada destino, rotulo en el punto medio. */
export function mostrarLineasProximidad(origen, destinos) {} // origen {lng, lat}; destinos Array<{lng, lat, etiqueta: string}>
/** RF-10 */
export function ocultarLineasProximidad() {}
```

Cambios en lo existente de `map.js`:

- `volarAFaja()`: con `prefers-reduced-motion: reduce` llama a `encuadrarFaja()`
  en vez de volar (ADR-018; caso limite de RF-5).
- `conectarSeleccion()`: abre ficha tambien si `props.capa` es
  `"ciudadBolivar"` o `"iniciativasCcieb"`. Las entidades de esas capas llevan
  `properties: {...props, capa: "<nombre de capa>"}`. **No** se pisa
  `props.tipo` (las iniciativas traen su propio `tipo`).
- `indexar("ciudadBolivar" | "iniciativasCcieb", id, entidad)`: `volarAActivo`
  funciona con esas capas sin cambiar su codigo; se amplia su JSDoc y el de
  `alternarContexto` (union de nombres).
- Visibilidad por distancia (`ZOOM_CIUDAD`): las clases de
  `ZOOM_CIUDAD.clasesHito` se ven siempre; el resto con
  `DistanceDisplayCondition(...ZOOM_CIUDAD.detalle)`; rotulo de nombre (si no
  es `null`) con `ZOOM_CIUDAD.etiqueta`, reutilizando `estiloRotulo`. Los
  rotulos de anillos y lineas no llevan condicion de distancia (solo existen
  dentro del modo o con la ficha abierta). `ZOOM_ETIQUETA` no cambia.
- Ayudante privado `volarCancelable(esfera, offset, holdId)` extraido de
  `iniciarVistaConVuelo()`: vuelo con hold, cancelable por `pointerdown`,
  `wheel` o `touchstart`. Lo usan la vista de entrada y `vistaCiudadBolivar`.
- Geometria pegada al suelo en modo reposo: Cesium la construye de forma
  asincrona y solo avanza en frames renderizados (comprobado en
  `DataSourceDisplay.update`: solo pide render la primera vez que esta lista).
  Anillos y lineas usan `sostenerHastaListo(id, listo)` con
  `listo = () => entidades.every(e => viewer.dataSourceDisplay.getBoundingSphere(e, false, tmp) !== BoundingSphereState.PENDING)`.
  Ids de hold: `anillos`, `lineas-proximidad`, `vista-ciudad-<n>`.

```js
// src/controladorRender.js (A) — aditivo, duck-typing sobre viewer.scene.postRender
/**
 * Render continuo hasta que listo() devuelva true, comprobado tras cada frame.
 * Llamarla de nuevo con el mismo id reemplaza la anterior.
 * @param {string} id
 * @param {() => boolean} listo
 * @returns {() => void} cancelar: libera el hold y quita el listener
 */
export function sostenerHastaListo(id, listo) {}
```

```js
// src/iconos.js (A)
/** Disco COLOR_CIUDAD con trazo oscuro #0b0f14 (= --color-shell): el blanco de envolver() no se veria sobre el disco claro. */
export function iconoCiudad(clave, color) {} // clave: una de CLASES_CIUDAD o "iniciativa"
// simbolos: sede_evento museo · aeropuerto avion · puente puente · educacion_superior birrete ·
// salud cruz · hotel cama · banca banco · transporte bus · iniciativa estrella de contorno
```

### 3.4 Interfaz (B y A5): lo que llama `main.js`

```js
// src/ui/modoCiudadBolivar.js (B). Sin fetch ni cesium; sin colores de marca (solo los logos).
/**
 * @typedef {Object} DatosModo  Cada campo: null = cargando · false = fallo (la seccion se oculta;
 *   el aviso ya lo dio mostrarError) · valor. En actualizar(), undefined = sin cambios.
 * @property {Array<{km: number, campos: number}>|null|false} resumenAnillos  ascendente
 * @property {number|null|false} totalCampos
 * @property {Array<{id: string, nombre: string|null, km: number, confianza: string|null}>|null|false} cercanos  desde la sede
 * @property {Object<string, number>|null|false} conteos  por clase de CLASES_CIUDAD
 * @property {Array<{id: string, nombre: string, fecha: string|null, fuente: string, enMapa: boolean}>|null|false} iniciativas  las 6
 */
/** Monta cabecera (RF-16) y panel (RF-15) en las ranuras de ui.js; quita el acceso. */
export function montarModoCiudadBolivar({ resumenAnillos, totalCampos, cercanos, conteos, iniciativas, alSalir, alVerEnMapa }) {}
/** Datos que llegan tarde (capas por red). */
export function actualizarModoCiudadBolivar(parcial) {}
/** Quita cabecera y panel; si hay acceso registrado, muestra "Ver Ciudad Bolivar". */
export function desmontarModoCiudadBolivar() {}
/** RF-6. Registra el callback del boton "Ver Ciudad Bolivar" (vista nacional). Una vez, al arrancar. */
export function registrarAccesoCiudadBolivar(alEntrar) {}
/** La llama ui.js al final de montarUI(): las ranuras se recrean al cambiar de idioma. */
export function repintarModoCiudadBolivar() {}
// Callbacks hacia main.js: alSalir() · alVerEnMapa(id) · alEntrar(). Sin eventos globales.

// src/ui/fichaCiudad.js (A5). Recibe las utilidades de ui.js por parametro; no importa ui.js.
/** @returns {boolean} si el activo es de "ciudadBolivar" o "iniciativasCcieb" (props.capa) */
export function esFichaCiudad(activo) {}
/**
 * @param {Object} activo  props de la entidad, con `capa`
 * @param {{cercanos?: DatosModo["cercanos"]}} extra
 * @param {{esc: Function, numero: Function, enlaceSeguro: Function}} util
 * @returns {{tipo: string, titulo: string, aviso: string, cuerpo: string, enlaces: string}}  HTML ya escapado
 */
export function partesFichaCiudad(activo, extra, util) {}

// src/ui.js (B): exports nuevos o cambiados
export function mostrarPanelActivo(activo, extra = {}) {}  // extra.cercanos solo para la sede; se guarda para repintar
/** Enciende/apaga interruptores como si los tocara el usuario (estado, mapa, repintado). @returns estado previo de los ids reconocidos; los desconocidos se ignoran y no aparecen */
export function fijarCapas(cambios) {}  // Record<idInterruptor, boolean> -> Record<idInterruptor, boolean>
/** Hoy privada. sector opcional: si falta, lo deduce de capa (y de esTerminal en downstream). Enciende la capa si estaba apagada. @returns {boolean} */
export function irAActivo({ capa, ids, sector }) {}
/** Cierra ficha, tabla, fuentes y hoja de capas SIN tocar el historial y olvida la entrada apilada. @returns {boolean} si habia una */
export function soltarVistas() {}
/** Lo que hacen #btn-faja y #btn-faja-movil. Por defecto volarAFaja (comportamiento actual). */
export function fijarAccionVolarFaja(accion) {}
```

Ids de interruptor (vocabulario de `fijarCapas` y de `?capa=`): `upstream`,
`midstream`, `downstream`, `toponimia`, `hidrografia`, `limites`, `disputa`,
`faja`, `centrales` (existentes) y **nuevos** `ciudadBolivar` e `iniciativas`
(capas de mapa `ciudadBolivar` e `iniciativasCcieb`; `CAPAS_DE_INTERRUPTOR`
hace la correspondencia). `demo` no es enlazable: se enciende a proposito.

Disposicion (B): `#ranura-modo` en `#columna` tras la cabecera y antes de
`#ranura-banner` (cabecera del modo o boton de acceso); `#ranura-panel-modo` en
la fila flexible, a la derecha (`sm:ml-auto`). A 390x844: cabecera <= 2
lineas y <= 96 px; panel plegado por defecto (`modo.verDetalles`), desplegado
max 45vh con scroll; no tapa los botones inferiores ni los creditos de
Cesium. A 1440x900: panel desplegado, `w-80`. Logo ExpoFaja >= 120 px de
ancho (02-IDENTIDAD §8), sello CCIEB completo, `width`/`height` declarados.
Logos: `MARCAS_MODO.expofaja` (version sobre oscuro) y `MARCAS_MODO.ccieb`.
Frase principal: `t("modo.frasePrincipal", {n, total, km})` con el anillo
mayor; numeros con el `Intl` del idioma activo.

### 3.5 Claves i18n (T2 crea todas; A y C no tocan los JSON)

Notion = de la especificacion de Notion; **nueva** = la anade este plan.

| Clave | ES | EN | Usa | Origen |
|---|---|---|---|---|
| `modo.ciudadBolivar.titulo` | Ciudad Bolívar · Capital Estratégica de la Faja | Ciudad Bolívar · Strategic Capital of the Orinoco Belt | B | Notion |
| `modo.ciudadBolivar.alianza` | En alianza con | In partnership with | B | Notion |
| `modo.verFaja` | Ver toda la Faja | View the whole Belt | B | Notion |
| `modo.verCiudad` | Ver Ciudad Bolívar | View Ciudad Bolívar | B | Notion |
| `modo.anillo` | {km} km · {n} campos | {km} km · {n} fields | C | Notion |
| `modo.frasePrincipal` | {n} de los {total} campos petroleros del mapa están a menos de {km} km en línea recta de Ciudad Bolívar | {n} of the {total} oil fields on the map lie within {km} km (straight line) of Ciudad Bolívar | B | Notion |
| `modo.impulsaCcieb` | Lo que impulsa la CCIEB | What CCIEB is promoting | B | Notion, texto de la spec (D12) |
| `capa.ciudadBolivar` | Ciudad Bolívar (servicios) | Ciudad Bolívar (services) | B | Notion |
| `capa.iniciativas` | Iniciativas CCIEB y ExpoFaja | CCIEB and ExpoFaja initiatives | B | Notion |
| `ciudad.clase.sede_evento` … `transporte` (8) | Sede del evento · Aeropuerto · Puente · Educación superior · Salud · Hotel · Banca · Transporte | Event venue · Airport · Bridge · Higher education · Health · Hotel · Banking · Transport | A5, B | Notion |
| `ciudad.lineaRecta` | Línea recta, no ruta vial | Straight line, not road distance | A5, B | Notion |
| `ciudad.sinNombre` | Sin nombre en OpenStreetMap | Unnamed in OpenStreetMap | A5, B | Notion |
| `ciudad.agregarOsm` | ¿Falta algo? Agrégalo en OpenStreetMap | Something missing? Add it to OpenStreetMap | A5 | Notion |
| `capa.grupoCiudad` | Ciudad Bolívar | Ciudad Bolívar | B | nueva |
| `modo.panelTitulo` | Ciudad Bolívar, eje de la Faja | Ciudad Bolívar, hub of the Orinoco Belt | B | nueva |
| `modo.cercanosSede` | Campos más cercanos a la sede de la ExpoFaja | Fields closest to the ExpoFaja venue | A5, B | nueva |
| `modo.distancia` | {km} km | {km} km | A5, B | nueva |
| `ciudad.kmLineaRecta` | {km} km en línea recta | {km} km in a straight line | C | nueva |
| `modo.servicios` | Servicios de la ciudad (OpenStreetMap) | City services (OpenStreetMap) | B | nueva |
| `modo.metodo` | Línea recta al vértice más cercano de cada campo de Global Energy Monitor (GOGET, marzo 2026). No es distancia por carretera. | Straight line to the nearest vertex of each Global Energy Monitor field (GOGET, March 2026). Not road distance. | A5, B | nueva |
| `modo.notaPrensa` | Nota de prensa | Press release | A5, B | nueva |
| `modo.altCcieb` | Sello de la CCIEB | CCIEB seal | B | nueva |
| `modo.altExpofaja` | Logo de ExpoFaja Ciudad Bolívar 2026 | ExpoFaja Ciudad Bolívar 2026 logo | B | nueva |
| `modo.verDetalles` | Ver detalles | Show details | B | nueva |
| `modo.ocultarDetalles` | Ocultar detalles | Hide details | B | nueva |
| `ciudad.verEnOsm` | Ver en OpenStreetMap | View in OpenStreetMap | A5 | nueva |
| `ciudad.iniciativa` | Iniciativa anunciada por la CCIEB | Initiative announced by CCIEB | A5, B | nueva |
| `ciudad.contenidoOrganizador` | Contenido anunciado por la CCIEB y atribuido a su nota de prensa. Orinoco Digital no lo verifica. | Content announced by CCIEB, attributed to its press release. Orinoco Digital does not verify it. | A5, B | nueva |
| `ciudad.fecha` | Fecha | Date | A5 | nueva |
| `ciudad.centroAproximado` | Punto central aproximado del elemento de OpenStreetMap | Approximate centre point of the OpenStreetMap element | A5 | nueva |
| `fuente.ccieb` | Iniciativas y logos del evento — Cámara de Comercio e Industrias del Estado Bolívar (CCIEB) | Event initiatives and logos — Cámara de Comercio e Industrias del Estado Bolívar (CCIEB) | dialogo de fuentes (via `FUENTES`) | nueva |
| `licencia.autorizadaCcieb` | Uso autorizado por la CCIEB (2026-10-12); fuera de las licencias del proyecto | Used with CCIEB permission (2026-10-12); not covered by the project licences | idem | nueva |

Se reutilizan sin cambios: `capa.cargando`, `capa.errorDetalle`,
`tabla.verEnMapa`, `panel.fuente`, `panel.confianza`, `panel.ultimaVerificacion`.
Las claves `expofaja.*` de Notion son de E2: no se crean ahora.
`t(clave, params)`: sustituye `{nombre}` por `params.nombre`; un marcador sin
valor queda visible; sin `params`, igual que hoy (los `.replace("{n}", ...)`
existentes siguen funcionando).

### 3.6 `config.js` (T3)

```js
/** Mismo valor que --color-hi. Los colores de marca ExpoFaja/CCIEB NO van en el mapa (02-IDENTIDAD §4). */
export const COLOR_CIUDAD = "#e6edf3";
/** Anillos de distancia: mismo valor que --color-lo (E1, "Estilo"). */
export const COLOR_ANILLO = "#8b98a5";
/** Distancias de camara (m). SIN VERIFICAR — medir en captura (A3/I1). */
export const ZOOM_CIUDAD = { clasesHito: ["sede_evento", "aeropuerto", "puente"], detalle: [0, 80000], etiqueta: [0, 30000] };
/** RF-4: anillo que debe verse completo segun orientacion; margen sobre el encuadre geometrico. */
export const CAMARA_CIUDAD_BOLIVAR = { anilloEscritorioKm: 150, anilloVerticalKm: 100, margen: 1.15 }; // margen SIN VERIFICAR
/** Logos autorizados (public/expofaja/marcas/AVISO.md). Solo los usa la cabecera DOM del modo. */
export const MARCAS_MODO = { ccieb: "/expofaja/marcas/ccieb.webp", expofaja: "/expofaja/marcas/expofaja-sobre-oscuro.webp" };
/** Modos del mapa: definicion declarativa (adelanto minimo del Sistema de Modos, N1). La aplica main.js. */
export const DEFINICION_MODOS = {
  nacional:      { id: "nacional",      camara: "faja",          capasEncendidas: [], anillos: null, interfaz: null, vueltaAtras: null },
  ciudadBolivar: { id: "ciudadBolivar", camara: "ciudadBolivar", capasEncendidas: ["upstream", "ciudadBolivar", "iniciativas"],
                   anillos: { centro: CENTRO_CIUDAD_BOLIVAR, radiosKm: ANILLOS_KM }, interfaz: "ciudadBolivar", vueltaAtras: "nacional" },
};
export const MODOS = Object.keys(DEFINICION_MODOS); // ["nacional", "ciudadBolivar"] (ADR-020)
/** Decision de Luis (2026-10-12): la portada abre en Ciudad Bolivar. Revisar en E4. */
export const MODO_INICIAL = "ciudadBolivar";
/** Orden en que ?vuelo=<id> busca el id entre las capas cargadas. */
export const ORDEN_VUELO = ["ciudadBolivar", "iniciativasCcieb", "campos", "downstream", "centrales", "ductos"];
// FUENTES: + { clave: "ccieb", url: "https://camaradecomerciobolivar.org/", licencia: "licencia.autorizadaCcieb" }
//          (comprobar que la URL responde, como el resto de FUENTES)
```

### 3.7 Historial y URL (RF-1, 2, 3, 5, 6, 17, 18)

Pura en `src/modos.js` (C2):

```js
/** @returns {{modo: string|null, capa: string|null, vuelo: string|null}}  valores vacios -> null */
export function leerEnlace(search) {}
/** ?modo= valido gana; ausente o desconocido -> inicial. */
export function resolverModo(pedido, modos, inicial) {}
/** "/?modo=<id>": cambiar de modo descarta vuelo y capa (son de un solo uso). */
export function urlDeModo(pathname, modo) {}
/** Primera capa de `orden` cuya coleccion (no null/false) contiene una feature con ese id. @returns {{capa: string, feature: Object} | null} */
export function buscarActivo(id, colecciones, orden) {}
```

En `main.js` (C4). Dos duenos del historial con reglas que no se pisan:
`ui.js` sigue apilando sus vistas con `{orinoco: vista}` y una sola entrada;
`main.js` escribe entradas con `{modo: id}` y nunca en un `popstate`.

1. **Arranque.** `modo = resolverModo(leerEnlace(location.search).modo, MODOS, MODO_INICIAL)`.
   Si `DEFINICION_MODOS[modo].vueltaAtras` existe: `replaceState({modo: vueltaAtras}, "", urlDeModo(pathname, vueltaAtras))`
   y `pushState({modo}, "", hrefOriginal)` (entrada trampolin: el gesto atras
   lleva a la vista nacional, no fuera del sitio). Si no:
   `replaceState({modo}, "", hrefOriginal)`. Despues `aplicarModo(modo)`.
2. **Boton** (`alSalir`, `alEntrar`, accion de "Volar a la Faja"):
   `irAModo(destino)`. Si `destino` es el modo actual: solo la camara del modo
   (lo que hacia "Volar a la Faja"). Si no: `habia = soltarVistas()`; si
   `habia`, `replaceState({modo: actual}, "", location.href)` (la entrada
   huerfana de la vista vuelve a ser del modo de origen); `pushState({modo: destino}, "", urlDeModo(pathname, destino))`; `aplicarModo(destino)`.
3. **`popstate`** (se registra despues del de `ui.js`, que corre primero y
   cierra sus vistas): `destino = ev.state?.modo`; si falta o es el actual, nada;
   si no, `aplicarModo(destino)`. Idempotente.
4. **`aplicarModo(id)`**, generico: retirar el saliente (`quitarAnillos()` si
   tenia `anillos`; `INTERFACES[saliente.interfaz]?.desmontar()`;
   `fijarCapas(estado.capasPrevias)`), aplicar el entrante
   (`estado.capasPrevias = fijarCapas(capasEncendidas -> true)`;
   `CAMARAS[entrante.camara]()`; `INTERFACES[...]?.montar(...)`; anillos si
   ya hay campos). Tablas en `main.js`:
   `CAMARAS = {faja: volarAFaja, ciudadBolivar: vistaCiudadBolivar}`,
   `INTERFACES = {ciudadBolivar: {montar, actualizar, desmontar}}`.
5. **`?capa=<id>`**: tras `aplicarModo`, `fijarCapas({[id]: true})`; si
   devuelve `{}` el id no existe: se ignora (RF-18), `console.info`, sin aviso.
6. **`?vuelo=<id>`**: al terminar `cargarCapas()`,
   `buscarActivo(id, colecciones, ORDEN_VUELO)`; si existe,
   `irAActivo({capa, ids: [id]})` (enciende la capa, vuela y abre la ficha:
   RF-17); si no, se ignora igual que `?capa=` (RF-18). El vuelo cancela el de
   la camara del modo si aun dura (Cesium `flyTo` llama a `cancelFlight`).

| URL | Resultado |
|---|---|
| `/` | Modo Ciudad Bolivar (`MODO_INICIAL`), RF-2 |
| `/?modo=ciudadBolivar` | Modo, RF-1 |
| `/?modo=nacional` | Vista nacional, sin trampolin, RF-3 |
| `/?modo=xyz` | Como `/` (desconocido = ausente) |
| `/?modo=ciudadBolivar&vuelo=OSM-R7948635` | Modo + ficha del Museo Soto con cercanos y lineas, RF-17 |
| `/?vuelo=NOEXISTE` · `/?capa=noexiste` | Abre con normalidad, sin aviso, RF-18 |
| `/?modo=nacional&capa=ciudadBolivar` | Vista nacional con servicios encendidos |
| `/expofaja` | 307 a `/?modo=ciudadBolivar` (vercel.json), RF-19 |

### 3.8 Camara (RF-4)

Sin altura magica: se encuadra una **esfera** que contiene el anillo y la
distancia sale del campo de vision real de la camara.

- `vertical = innerHeight > innerWidth` (mismo criterio que `vistaFaja()`).
  `km = vertical ? anilloVerticalKm (100) : anilloEscritorioKm (150)`.
- `esfera = new BoundingSphere(Cartesian3.fromDegrees(centro.lng, centro.lat), km * 1000)`.
- `rango = margen * radio / min(tanθ, tanφ)`, con `tanφ = tan(frustum.fovy / 2)`
  y `tanθ = frustum.aspectRatio * tanφ`. Es la formula de Cesium 1.145
  (`distanceToBoundingSphere3D` en `@cesium/engine/Source/Scene/Camera.js`,
  la que usa `flyToBoundingSphere` con `range = 0`) mas el `margen` por los
  paneles. La dimension limitante (vertical en escritorio, horizontal en
  telefono vertical) recibe el diametro justo a la profundidad del centro; la
  inclinacion comprime el eje norte-sur, asi que el borde sur, el mas cercano,
  cae dentro. Calculado con margen 1: 1440x900, sur a ~16° de 20° de
  semiangulo vertical; 390x844, este-oeste a 15° de 15° (justo: de ahi el
  margen) y sur a ~15° de 30°.
- Rumbo `CAMARA.rumbo` (0), inclinacion `CAMARA.inclinacion` (-35) o
  `CAMARA.inclinacionVertical` (-60) en vertical: las mismas de la vista
  nacional, que en vertical ya evitan el cielo.
- Movimiento reducido: `viewBoundingSphere` + `lookAtTransform(Matrix4.IDENTITY)`
  como `encuadrarFaja()`. Si no: `volarCancelable(..., "vista-ciudad-<n>")`.
- Al arrancar en el modo, `iniciarMapa()` lanza el vuelo de entrada y
  `vistaCiudadBolivar()` lo cancela en el mismo tick: el vuelo sale de la
  vista de continente hacia la ciudad. No hace falta cambiar `iniciarMapa()`.
- `margen` se mide en I1 con captura a 1440x900 y 390x844 (los cuatro bordes
  del anillo visibles y no tapados por cabecera, panel ni capas).
  Girar el telefono dentro del modo no reencuadra (fuera de alcance).

### 3.9 Integracion con lo que existe

- **Capa en el panel (B2).** En `ui.js`: estado `ciudad = {ciudadBolivar: false, iniciativas: false}`
  (nacen apagadas, como `centrales`); `CAPAS_DE_INTERRUPTOR.ciudadBolivar = ["ciudadBolivar"]`,
  `.iniciativas = ["iniciativasCcieb"]`; `ETIQUETA_CAPA.ciudadBolivar = "capa.ciudadBolivar"`,
  `.iniciativasCcieb = "capa.iniciativas"` (lo usa `avisarCapasFallidas`: RF-20);
  `MUESTRAS` con `punto(COLOR_CIUDAD)`; `conteo()` con `contar(...)`; grupo
  nuevo con `encabezado("capa.grupoCiudad")`, `data-ciudad` y
  `alternarContexto(CAPAS_DE_INTERRUPTOR[id][0], visible)`.
- **Carga (C3).** Tuplas `["ciudadBolivar", getCiudadBolivar, dibujarCiudadBolivar]` y
  `["iniciativasCcieb", getIniciativasCcieb, dibujarIniciativas]` en `cargarCapas()`;
  el `try/catch` por capa y `avisarCapasFallidas` ya dan RF-20. `main.js` guarda
  cada coleccion en `colecciones[clave]` (o `false` si fallo) y recalcula los
  datos del modo cuando llegan `campos` o `ciudadBolivar`.
- **Ficha.** `conectarSeleccion` (map.js) -> callback de `alSeleccionarActivo`
  -> `main.alSeleccionar(activo)`: si `activo?.id === ID_SEDE_EXPOFAJA`,
  `mostrarPanelActivo(activo, {cercanos})` y `mostrarLineasProximidad(sede, destinos)`;
  si no, `mostrarPanelActivo(activo)` y `ocultarLineasProximidad()`. `null`
  (cerrar) siempre oculta las lineas: RF-10 tambien al salir del modo, porque
  `soltarVistas()` y el `popstate` de `ui.js` deseleccionan. En `ui.js`,
  `contenidoPanel` delega en `partesFichaCiudad` cuando `esFichaCiudad(activo)`.
- **Buscador (B2).** `fijarDatosCapa` reconstruye el indice tambien para
  `ciudadBolivar` e `iniciativasCcieb`; entradas con `sector: null`, color
  `COLOR_CIUDAD` y etiqueta de tipo `ciudad.clase.<clase>` o `ciudad.iniciativa`.
  Sin nombre no se indexan (regla actual de `agregar`). `irAActivo` enciende
  esas capas si estaban apagadas.
- **Holds.** `pedirRenderContinuo(id)` / `liberarRenderContinuo(id)` con id
  unico por vuelo (`secuenciaVuelos`); `sostenerHastaListo` para geometria;
  `pedirRenderPuntual(motivo)` tras anadir o quitar anillos y lineas.
- **`mostrarError`.** Solo por la via existente (`avisarCapasFallidas` y el
  `catch` de `cargarCapas`). Los parametros de URL invalidos no avisan
  (RF-18 pide abrir con normalidad).
- **Idioma.** El listener `idioma:cambiado` de `main.js` vuelve a componer las
  etiquetas y llama a `dibujarAnillos` y, si la sede esta seleccionada, a
  `mostrarLineasProximidad`. La interfaz del modo se repinta por
  `repintarModoCiudadBolivar()` dentro de `montarUI()`.
- **Adaptador (C3).** `resumenAnillos = ANILLOS_KM.map(km => ({km, campos: conteo[km]}))`;
  `cercanos` = `camposMasCercanos(sede, campos.features)` -> `{id, nombre, km, confianza}`
  de `feature.properties`; `destinos` con `verticeMasCercano(sede, feature).posicion`
  y `etiqueta = t("ciudad.kmLineaRecta", {km: numeroFormateado})`; la sede es
  la feature `ID_SEDE_EXPOFAJA` de `colecciones.ciudadBolivar` (nunca una
  coordenada escrita a mano); `iniciativas` desde `getListaIniciativasCcieb()`.

## 4. Trazabilidad

| RF | Donde | Como se prueba |
|---|---|---|
| RF-1, RF-2, RF-3 | `modos.js` `resolverModo`; `main.js` arranque | `test/modos.test.mjs` (`// RF-1..3`); I1 abre las 3 URL |
| RF-4 | `map.js` `vistaCiudadBolivar`; `CAMARA_CIUDAD_BOLIVAR` | I1: capturas 1440x900 (anillo 150 entero) y 390x844 (anillo 100 entero); emulacion `prefers-reduced-motion` sin vuelo |
| RF-5 | `main.js` `irAModo`/`popstate`; `ui.js` `soltarVistas`, `fijarAccionVolarFaja`; `map.js` `volarAFaja` | I1: boton y `history.back()` desde el modo, con y sin ficha abierta; telefono (Luis) |
| RF-6 | `ui/modoCiudadBolivar.js` acceso; `main.js` `irAModo` | I1 |
| RF-7 | `map.js` `dibujarAnillos`; `main.js` etiquetas; `t()` | `test/i18n.test.mjs` (interpolacion); I1 captura |
| RF-8 | `data.js` `contarPorAnillo` (T1) | `test/ciudadBolivar.test.mjs` (T1, fixture 0/10/45/63 +-1) |
| RF-9 | T1 `camposMasCercanos`; C1 `verticeMasCercano`; A4 lineas; A5 lista | T1 fixture +-1 km; `test/data.test.mjs` (`verticeMasCercano`); I1 |
| RF-10 | `main.js` `alSeleccionar(null)`; `map.js` `ocultarLineasProximidad` | I1: cerrar ficha, Esc, gesto atras, salir del modo |
| RF-11 | `DEFINICION_MODOS.ciudadBolivar.capasEncendidas`; `ui.js` `fijarCapas` | `test/modos.test.mjs`; I1 (las demas capas no cambian) |
| RF-12 | script de T1 | T1 (procedencia, excluidos por consola) |
| RF-13 | `ui/fichaCiudad.js` | I1: un hotel sin nombre muestra `ciudad.sinNombre` y enlace OSM |
| RF-14 | T1 (GeoJSON solo con ubicacion); `map.js` descarta sin geometria | T1; `validarFeatureCollection`; I1 (2 marcadores) |
| RF-15 | `ui/modoCiudadBolivar.js`; `api.js` `getListaIniciativasCcieb`; `data.js` `iniciativasSinGeometria` | `test/data.test.mjs` (6 de la semilla, 2 `en_mapa`); I1 |
| RF-16 | `ui/modoCiudadBolivar.js`; `MARCAS_MODO` | `test/rutas-datos.test.mjs` (logos existen); `verificar:modulos` (marcas solo ahi); I1 captura movil |
| RF-17, RF-18 | `modos.js` `buscarActivo`/`leerEnlace`; `main.js`; `ui.js` `irAActivo`/`fijarCapas` | `test/modos.test.mjs`; I1 con ids validos e invalidos |
| RF-19 | `vercel.json` | JSON valido (`node -e`); vista previa: `curl.exe -I <preview>/expofaja` -> 307 |
| RF-20 | `main.js` `cargarCapas`; `ui.js` `ETIQUETA_CAPA` | I1: bloquear `ciudad-bolivar-osm.geojson` en DevTools -> aviso con el nombre; anillos y campos siguen |
| RF-21 | `t()`; claves §3.5 | `test/i18n.test.mjs`; I1 en EN (nombres e iniciativas intactos) |
| RNF-1 | T1 | I1 mide tamano y features |
| RNF-2 | build | I1: gzip del JS propio < 150 KB |
| RNF-3 | `iconos.js`, `config.js`, `verificar-modulos` | `test/iconos.test.mjs` (contraste, sin hex de marca); `verificar:modulos` |
| RNF-4 | — | `verificar:modulos`; revision del diff |
| RNF-5 | `modo.frasePrincipal` | I1 compara el texto renderizado con la frase exacta |
| RNF-6 | sin codigo que mida a `BLOQUES` | revision del diff |

## 5. Resto

- **`vercel.json` (C5).** Clave nueva al nivel superior, JSON estricto, sin
  comentarios (MEMORY error 8; el porque va en el ADR y en el PR):
  `"redirects": [{ "source": "/expofaja", "destination": "/?modo=ciudadBolivar", "permanent": false }]`.
  `permanent: false` = 307. E2 lo retira. En la vista previa comprobar tambien
  `/expofaja/`; si da 404, anadir una segunda regla igual con esa `source`.
- **`docs/DATA_SOURCES.md` §16 (C6)**, "Contenido del organizador ExpoFaja":
  logos de `public/expofaja/marcas/` (titulares, autorizacion CCIEB
  2026-10-12, `AVISO.md`, `semillas/marcas-manifiesto.json`), iniciativas de
  `semillas/iniciativas-ccieb.json` (notas de prensa, fecha de consulta, solo
  se dibujan las que tienen ubicacion OSM), licencia: fuera de Apache-2.0 y CC
  BY 4.0. Va antes de la §17 de T1.
- **ADR-020 (C6).** Copia literal de `docs/expofaja/03-ADR-020-PROPUESTA.md`
  al final de `docs/DECISIONS.md`, con estado: "aceptada (2026-10-12) piezas
  1, 2, 5, 7 y 10; piezas 3, 4, 6, 8 y 9 en propuesta (E2-E4)". Nota al pie
  con las decisiones de este plan que lo concretan (D2, D5, D10).
- **`LICENSE-DATA` (C6).** Seccion "Marcas y contenido del organizador":
  `public/expofaja/marcas/` y `public/expofaja/ponentes/` son de sus titulares,
  usadas con autorizacion de la CCIEB; los textos de iniciativas son de la
  CCIEB y se citan atribuidos; nada de eso esta bajo CC BY 4.0 ni Apache-2.0.
- **Capturas.** `e1-antes-*` (C6) de produccion antes del merge;
  `e1-despues-*` y `e1-ficha-sede-movil.png` (I1) de la rama. 1440x900 y
  390x844, con Chrome DevTools MCP. No sustituyen el telefono de Luis.

## 6. Riesgos

| Riesgo | Mitigacion |
|---|---|
| T1 cierra con formas de retorno distintas (o como Notion) | Solo cambia el adaptador de `main.js` (C3); contratos A/B intactos |
| Dos duenos del historial (`ui.js` y el modo) se pisan | Reglas de §3.7: estados distintos (`orinoco`/`modo`), `soltarVistas()`, saneo de la entrada huerfana, `popstate` idempotente y sin escrituras. I1 recorre la secuencia boton/atras con y sin ficha |
| Chrome Android salta entradas creadas sin gesto (intervencion de manipulacion del historial): el trampolin y la ficha de `?vuelo=` pueden saltarse con el gesto atras si el usuario aun no toco la pagina | Aceptable: tras el primer toque funciona. En el gate de Luis, probar el gesto atras despues de interactuar; anotar en el PR |
| Polilineas pegadas al suelo sin terminar en modo reposo | `sostenerHastaListo` con `BoundingSphereState`; se libera tambien al quitar |
| Paneles tapan parte del anillo | `margen` medido en captura; panel plegado en movil; restricciones de §3.4 |
| `ui.js` crece (ADR-017) | Solo pegamento; HTML nuevo en `src/ui/`. B informa las lineas netas |
| `docs/expofaja/` sin versionar (hoy `??`): el import de la semilla rompe el build de Vercel | El fallo es ruidoso (build rojo), no silencioso. Incluir `docs/expofaja/` en el PR de E1 (MEMORY error 7) |
| M2 usara `#/activo/<ID>`; E1 usa `?vuelo=` | M2 debe aceptar ambos; `?vuelo=` queda en el QR y en el micrositio. Anotar en ADR-020 |
| Icono blanco invisible sobre `COLOR_CIUDAD` | Trazo oscuro; test de contraste >= 4,5:1 |
| Museo Soto y sus 2 iniciativas en el mismo punto | `pixelOffset` por orden; la coordenada no cambia |
| 95 servicios apilados en la vista del modo | Solo hitos de lejos (`ZOOM_CIUDAD`); el resto al acercarse |
| Build roto mientras A, B y C estan a medias en el mismo arbol | Cada paquete exporta primero sus firmas con cuerpo real; `npm test` no importa `map.js`/`ui.js`/`main.js`; el build verde completo es criterio de I1 |
| Lema "Capital Estrategica de la Faja" es de la CCIEB, no del proyecto (constitucion 9 y 12) | Va junto a "En alianza con" y los logos; la frase medida (RNF-5) es la unica afirmacion propia |
| Overpass o conteos OSM cambian | T1: tests sobre ids y procedencia, no conteos |
| Portada en el modo con Cesium pesado | El modo no anade dependencias; RNF-2 medido en I1 |

## 7. Decisiones tomadas en el plan

- D1. Interfaz en `src/ui/modoCiudadBolivar.js` (manda el mandato E1 sobre
  `00-CONTEXTO`, que decia `ciudadBolivar.js`) mas `src/ui/fichaCiudad.js`
  para no engordar `ui.js` (ADR-017). Reversible: si.
- D2. Modo declarativo en `config.js` (`DEFINICION_MODOS`, `MODOS` derivado)
  y logica pura en `src/modos.js`; el estado vive solo en `main.js`
  (`estadoModo = {actual, capasPrevias}`). Reversible: si (N1 lo absorbe).
- D3. Formas de `data.js`: gana el codigo de T1 sobre Notion
  (`camposMasCercanos` -> `{feature, km}`, `contarPorAnillo` -> objeto por km,
  `circuloGeodesico` n = 96 en vez de 128, `haversineKm(a {lng,lat}, b [lng,lat])`).
  Reversible: si (adaptador en `main.js`).
- D4. Firmas de Notion ampliadas: `dibujarAnillos` recibe `etiqueta`;
  `mostrarLineasProximidad(origen, destinos)` recibe destinos con posicion y
  etiqueta (Notion: `cercanos`); `montarModoCiudadBolivar` anade
  `totalCampos` y `alVerEnMapa`. Motivo: `map.js` sin i18n y sin calculo.
- D5. Hold de anillos y lineas **solo hasta que la geometria esta lista**
  (`sostenerHastaListo`), no mientras la ficha esta abierta como dicen E1 y
  Notion: ADR-019 y `mapa.md` reservan el render continuo para lo que se
  anima; una ficha abierta no anima nada y en el telefono gastaria bateria.
  Reversible: si.
- D6. Salir del modo devuelve las 3 capas que el modo encendio a su estado
  previo; las demas no se tocan (RF-11). Reversible: si.
- D7. "Volar a la Faja" (`#btn-faja`) = ir a la vista nacional: desde el modo
  sale de el, igual que "Ver toda la Faja". Evita dos botones casi iguales
  con efectos distintos. Reversible: si.
- D8. Historial con trampolin al arrancar en un modo con `vueltaAtras`;
  cambios por boton con `pushState`; `popstate` aplica sin escribir.
- D9. `?modo=` desconocido = ausente. `?capa=` usa ids de interruptor; `demo`
  no es enlazable. `?vuelo=` busca en `ORDEN_VUELO`. Ninguno avisa si falla.
- D10. Lista de iniciativas del panel: semilla importada en build por
  `api.js` como FeatureCollection sin geometria. **Pendiente de la Duda 3**;
  si Luis elige otra via, solo cambian C1 y C3.
- D11. Iconos de la ciudad: disco `COLOR_CIUDAD` con trazo `#0b0f14`.
- D12. Titulo del bloque de iniciativas: "Lo que impulsa la CCIEB" (spec
  RF-15) y no "Lo que impulsa la Camara de Comercio" (Notion).
- D13. Los anillos se dibujan cuando llega `campos` (la etiqueta lleva el
  conteo); si `campos` falla no hay anillos y el aviso lo explica.
- D14. Los 5 cercanos del panel y de la ficha se miden desde la sede (Museo
  Soto), como el fixture de RF-9.
