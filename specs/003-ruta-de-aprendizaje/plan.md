# Plan 003 — Ruta de aprendizaje (piloto R5)

> Spec: `specs/003-ruta-de-aprendizaje/spec.md` (RF-79 a RF-128; retirados 97, 98, 99, 102, 103, 104) · ADR-023 propuesto (`adr-propuesto.md`). Revision 2 tras QA.
> Rama `ruta-aprendizaje`. Todo lo de abajo esta sujeto al gate de Luis sobre spec, plan, tareas y ADR.
> Donde Notion choca con el codigo real, manda el codigo (`docs/NOTION.md`). Rutas verificadas con Glob/Grep el 2026-10-24; las marcadas "nuevo" no existen todavia.

## 1. Enfoque

- **El recorrido es un modo mas** (`ruta`) en `DEFINICION_MODOS` (`src/config.js:278`), con `?modo=ruta&recorrido=R5&escena=n&nivel=divulgacion|tecnico`. Reutiliza `aplicarModo`/`irAModo`/trampolin (`src/main.js:409-477`). Sin `modeStore` (N1).
- **`MODOS` ya incluiria "ruta" y `resolverModo` lo aceptaria siempre.** Para que RF-80 se cumpla sin descargar datos (RF-110), `config.js` declara `RUTAS_PUBLICADAS = ["R5"]` (solo ids) y `src/modos.js` (ya en el chunk inicial) gana `modoPedido(search, {modos, publicadas})`: devuelve el `?modo=` pedido, salvo `ruta` sin un `recorrido` publicado, que devuelve `null` (= modo inicial por fecha con `modoInicialEn` + `PORTADA_POR_FECHA`). `escena` y `nivel` se acotan **despues** de cargar el JSON, con `motor.js`.
- **Nucleo puro y agnostico** en `src/ruta/` (nuevo): `motor.js` y `validar.js`, sin DOM, `fetch` ni `cesium`. **Capacidad reutilizable para JARVIS (§7).** `motor.js` solo se importa con `import()` desde el chunk del recorrido (RNF-1).
- **Chunk del recorrido** (diferido, ADR-022): `src/ruta/controlador.js` (nuevo) orquesta motor + datos + panel recibiendo por parametro lo que necesita de la app (`fijarCapas`, `mapa`, `colecciones`, `t`, `idioma`, `mostrarError`, `historial`); asi `main.js` solo agrega unas lineas de pegamento y `src/ruta/` no importa `ui.js` ni `map.js`.
- **Datos**: `public/data/ruta/recorridos.json` (nuevo), no GeoJSON; lo carga `src/ruta/datos.js` (nuevo) con su `fetch`, como `src/expofaja/datos.js` (ADR-020 pieza 3). `api.js` no cambia. Cache por defecto de Vercel: `vercel.json` no se toca en P1.
- **Interfaz**: `src/ui/accesoRuta.js` (estatico, minimo: acceso, ranuras, repintado) y `src/ui/recorrido.js` (diferido: panel). Ranuras **propias** (`#ranura-ruta-acceso`, `#ranura-ruta-panel`, nombres a confirmar en T11) para no chocar con `repintarModoCiudadBolivar`, que hace `replaceChildren` de `#ranura-modo` y `#ranura-panel-modo` en cada `montarUI` (`src/ui/modoCiudadBolivar.js:358-369`).
- **Mapa**: `map.js` gana `vistaEscena(encuadre)`. **Esc**: `ui.js` ya tiene el listener global (`src/ui.js:1925-1945`: cierra fuentes, ficha, hoja de capas, tabla); no se añade un segundo en `main.js` sino un gancho exportado por `ui.js` (§3.7).

## 2. Archivos

### 2.1 Tabla

| Ruta | Accion | Que cambia | RF | Tarea |
|---|---|---|---|---|
| `specs/003-ruta-de-aprendizaje/plan.md` | Cambiar | §2.2: resultado de la auditoria de ids | 115, 123 | T01 |
| `docs/DATA_SOURCES.md` | Cambiar | Seccion 18 "Recorridos de la Ruta de aprendizaje": fuente, fecha, lectura y confianza de D1a-D9 | 94, 111, 113, 114, 118 | T02, T14 |
| `src/config.js` | Cambiar | `RUTAS_PUBLICADAS`, `RUTAS_DATOS.recorridos`, `DEFINICION_MODOS.ruta` (`MODOS` lo hereda), `RECORRIDO` (niveles, tiempos, camara, `nombresPropios`, `ejemplosForaneos`) | 79, 80, 87, 107, 117, 119 | T03 |
| `src/modos.js` | Cambiar | `modoPedido` | 80 | T03 |
| `test/modos.test.mjs` | Cambiar | Pruebas de `modoPedido` | 80 | T03 |
| `src/ruta/motor.js` | **Crear** | Funciones puras (§3.2) | 79-83, 85, 86, 90-93, 109, 123-125, 126, 128 | T04 |
| `test/ruta-motor.test.mjs` | **Crear** | Pruebas del motor, incluida `encuadreDe` | idem | T04 |
| `src/ruta/validar.js` | **Crear** | `validarRecorridos(json, contexto)` | 112-121 | T05 |
| `test/recorridos.test.mjs` | **Crear** | Validador con un fixture invalido por regla + archivo real contra `public/data/*.geojson`, `config.js` | 112-121 | T05, T06 |
| `public/data/ruta/recorridos.json` | **Crear** | R5: 5 escenas, 2 niveles, ES y EN, datos D1a-D9 | 96, 100, 101, 107, 111 | T06 |
| `src/i18n/es.json`, `src/i18n/en.json` | Cambiar | Claves `ruta.*` (§3.8) | 106, 108 | T07 |
| `src/ruta/datos.js` | **Crear** | `cargarRecorridos()`: fetch + validacion ligera | 96, 105, 122 | T08 |
| `scripts/verificar-modulos.mjs` | Cambiar | Reglas para `src/ruta/**` (§3.9) | RNF-3 | T08 |
| `test/ruta-datos.test.mjs` | **Crear** | `cargarRecorridos` con `fetch` simulado (ok, 404, JSON roto, estructura invalida) | 105, 122 | T08 |
| `src/map.js` | Cambiar | `vistaEscena(encuadre)` (§3.5) | 86-89, 109, 126 | T09 |
| `src/ui/recorrido.js` | **Crear** | Panel del recorrido (§3.6) | 84, 85, 92-95, 100, 101, 106-109, 111, 126 | T10 |
| `src/ui/accesoRuta.js` | **Crear** | Acceso, ranuras propias, repintado | 81, 110, 127 | T10 |
| `src/style.css` | Cambiar si hace falta | Solo utilidades con tokens existentes | 108, 109, 126 | T10 |
| `test/ui-recorrido.test.mjs` | **Crear** | HTML del panel: escape, niveles, fuentes, deshabilitado/terminar, sin datos, rotulos | 84, 85, 92-95, 101, 111 | T10 |
| `src/ui.js` | Cambiar (<= 40 lineas netas) | Crear las ranuras propias en `montarUI` y llamar `repintarRuta()` al final (junto a `ui.js:550`); incluirlas en la lista de `ui.js:1616`; exportar `fijarSalidaPorEscape(fn)` y llamarlo en el listener de `ui.js:1940-1944` solo si nada de `ui.js` se cerro | 81, 90, 106, 127 | T11 |
| `src/ui/modoCiudadBolivar.js` | Cambiar (minimo) | `ocultarAccesoCiudadBolivar(oculto)`; `repintarModoCiudadBolivar` lo respeta | 127 | T11 |
| `src/ruta/controlador.js` | **Crear** | Orquestacion del recorrido (§3.7) | 79-91, 105, 122-125, 128 | T12 |
| `src/main.js` | Cambiar (<= 60 lineas netas) | `CAMARAS.ruta`, `INTERFACES.ruta`, `modoPedido` en `iniciarModo`, acceso, `import()` del controlador | 79-83, 110, 125, 127, 128 | T12 |
| `docs/capturas/r5-*.png` | Crear | 1440x900, 390x844 y 844x390, ES y EN, ambos niveles | 109, 126 | T13 |
| `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `MEMORY.md`, `specs/README.md`, `spec.md` (estado) | Cambiar | Cierre | — | T14 |

No se tocan: `api.js` (contrato), `vercel.json`, `package.json`, `vite.config.js`, `index.html`, `controladorRender.js`. Si una tarea necesita alguno, se para y se pregunta.

### 2.2 Objetivos de camara de R5 (verificados el 2026-10-24; recomprobados por T01 el 2026-10-26)

| Escena | Objetivo | Id real | `referencia` | Observacion |
|---|---|---|---|---|
| 1 | Campo Junín 6 | `GEM-L100000320738` (`campos.geojson:4633`) | `ubicacion` | Centro aproximado del campo (GOGET), confianza baja. No es una macolla. Alternativa: Junin 5 `GEM-L100000309181` (`:4578`) |
| 2 | Tramo Junín-José | par `GEM-L100000320738` + `OSM-W265071557` | `esquematico` | Sin trazado: no hay oleoducto Junín-José identificable en `ductos-osm.geojson` (T01 lo confirma por geometria) |
| 3 | José | `OSM-W265071557` (`downstream-osm.geojson:83`) | `ubicacion` | "Complejo Petroquímico José Antonio Anzoátegui" (Pequiven, `tipo: petroquimica`, confianza baja). **No es un mejorador** ni el terminal |
| 4 | Terminal de José | `OSM-W265071557` (mismo) | `ubicacion` | El terminal no esta en el dataset (los `terminal` son grupos `OSM-TANQUES-nnn` derivados y sin nombre; ninguno cae cerca de José en la busqueda del 2026-10-24). `[id_pendiente: terminal de José]` |
| 5 | Salida al mercado | vista de la Faja (`volarAFaja`) | null | Sin rutas dibujadas |

**Auditoria T01 (2026-10-26, Node sobre `public/data/*.geojson`):**

- Confirmados con la misma linea: `GEM-L100000320738` Junin 6 (`campos.geojson:4633`, Polygon), `GEM-L100000309181` Junin 5 (`:4578`, Point), `OSM-W265071557` (`downstream-osm.geojson:83`, Point -64.8644, 10.0692, `petroquimica`, Pequiven). Sin correcciones a la tabla.
- Caja de +-0.25 grados alrededor de José en `downstream-osm`: solo Puerto La Cruz (refineria y auxiliares, ~35 km) y el propio complejo; ningun mejorador ni terminal. En `ductos-osm`: el tramo mas cercano esta a ~31 km (`OSM-W544846129`, sin nombre, zona de Puerto La Cruz); ninguno llega a José.
- Busqueda por nombre (mejorador/upgrader/Petropiar/Petromonagas/San Félix/terminal): sin coincidencias salvo las de abajo. No hay oleoducto Junín-José: el unico `Oleoducto` nombrado es `El Furrial - Mantecal`; los 11 tramos `Gasoducto Nororietal José Francisco Bermúdez` (grafia del dato; p. ej. `OSM-W972131980`) son gas y el "José" es una persona, no el complejo.
- **Elemento nombrado hallado (NO usado; decide Luis): `OSM-W835524371` "PETROCEDEÑO"** (`downstream-osm.geojson:336`, Point -64.7065, 8.8512, `instalacion`, confianza baja). Es el mejorador de la Faja, ~135 km al sur de José: no sirve para las escenas 3 y 4 de José.
- Terminal: los 24 `terminal` son `OSM-TANQUES-001..024`, sin nombre; los mas cercanos (`-006`, `-007`) quedan a >100 km de José.

**Falta (sigue como `[id_pendiente]`):** terminal de José (escena 4 se queda en `OSM-W265071557`, `ubicacion`); mejoradores de José (Petropiar, Petromonagas, etc.: no estan en el dataset); oleoducto Junín-José (escena 2 sigue `esquematico`, par de ids, sin trazado).

**Arsenal (`INVENTARIO.md` revisado el 2026-10-26):** la ficha 29 "Recorridos guiados" es esta misma spec (estado Spec, sin codigo reutilizable); la ficha 34 (carga diferida con `import()` y gate contra import estatico) aplica a T08/T12; la ficha 28 (presets de animacion) es privada y de otro stack. No hay motor de escenas reutilizable: se construye `src/ruta/`.

## 3. Contratos

### 3.1 Esquema del archivo y de la escena (extiende el de Notion §7)

```jsonc
{
  "version": 1,
  "ultima_verificacion": "2026-10-24",
  "recorridos": [{
    "id": "R5",
    "estado": "publicado",                       // solo "publicado" se lista; debe estar en RUTAS_PUBLICADAS
    "titulo": { "es": "...", "en": "..." },
    "pregunta": { "es": "...", "en": "..." },
    "escenas": [{
      "id": "R5-E3", "recorrido": "R5", "orden": 3,
      "camara": { "objetivo_ref": "OSM-W265071557" },       // o { "entre": [ref, ref] } o { "vista": "faja" }
      "referencia": "ubicacion",                             // "esquematico" | "ubicacion" | null (RF-101, RF-120)
      "capas": ["midstream", "downstream"],                  // solo SECTORES (RF-116)
      "texto": {
        "divulgacion": { "es": "...", "en": "..." },
        "tecnico":     { "es": "...", "en": "..." }
      },
      "datos": [{                                            // puede ser [] (escena 1)
        "id": "D4", "tipo_dato": "instalacion",              // "cifra" | "legal" | "instalacion" | "cualitativo"
        "etiqueta": { "es": "...", "en": "..." },
        "valor": "4 mejoradores",                            // puede ser cualitativo
        "unidad": null,                                      // nula si el dato es cualitativo
        "aproximado": false,                                 // obligatorio true si unidad == "°API" (RF-118)
        "fecha_dato": "2021-09-13",                          // obligatoria (RF-111, RF-112)
        "fuente": "https://...",
        "fuente_nombre": { "es": "...", "en": "..." },       // bilingue (RF-112)
        "confianza": "media", "ultima_verificacion": "2026-10-24",
        "fecha_norma": "2026-01-29",                         // obligatoria si tipo_dato == "legal" (RF-114)
        "nota": { "es": "Instalados según Platts (2021)", "en": "..." }   // obligatoria si tipo_dato == "instalacion" (RF-121)
      }],
      "interaccion": null                                    // P1: siempre null
    }]
  }]
}
```

Diferencias con el esquema de Notion: `datos[]` gana `id`, `tipo_dato`, `confianza`, `ultima_verificacion`, `fecha_dato`, `aproximado`, `fuente_nombre` (bilingue), `fecha_norma`, `nota`; `valor` puede ser cualitativo con `unidad: null`; `camara` admite `entre` y `vista`; `referencia`; `estado`. Los textos `en` no pueden ser `[pendiente]`. Es un archivo nuevo: no cambia ningun formato existente. Los ids de capa de Notion que aun no existen (`calidad-crudo`, `sistema-petrolero`, `hitos`, `mechurrios`) quedan prohibidos hasta que su fase los cree; en P1 solo valen los sectores.

### 3.2 `src/ruta/motor.js` (puro; solo por `import()`)

```js
/** @returns {{recorrido: string|null, escena: number|null, nivel: string|null}} vacios o no numericos -> null */
export function leerEnlaceRuta(search) {}
/** Acota DESPUES de cargar: escena en rango o 1; nivel valido o "divulgacion" (RF-80). */
export function estadoInicial(recorrido, enlace, niveles) {}
/** "/?modo=ruta&recorrido=R5&escena=3&nivel=tecnico" (RF-91) */
export function urlDeEscena(pathname, { recorrido, escena, nivel }) {}
/** @returns {{escena: number, terminado: boolean}} (RF-83, RF-85) */
export function siguiente(recorrido, escena) {}
export function anterior(recorrido, escena) {}               // en la 1 se queda en 1
export function textoDeEscena(escena, nivel, idioma) {}       // sin idioma cae a "es"
/** Datos listos para pintar: valor+unidad, fuente, confianza, fechas, aproximado, nota; [] si no hay (RF-94, RF-95, RF-100) */
export function datosDeEscena(escena, idioma) {}
/** Capas de sector a encender y a apagar (RF-86) */
export function capasDeSector(escena, sectores) {}
/**
 * Resuelve camara -> puntos con buscarActivo (src/modos.js). Point -> su coordenada; linea o poligono -> centro de su caja.
 * colecciones[clave]: null = cargando, false = fallo, FeatureCollection = cargada (convencion de main.js).
 * @returns {{estado: "ok", puntos: Array<{lng,lat}>, vista: "faja"|null}
 *         | {estado: "pendiente"}   // no esta y alguna capa de ordenBusqueda es null (RF-124)
 *         | {estado: "ausente"}}    // no esta y todas son coleccion o false (RF-123)
 */
export function resolverCamara(escena, colecciones, ordenBusqueda) {}
/** Encuadre abstracto: centro, radio, rumbo, inclinacion y desplazamiento segun {vertical, horizontalBajo} (RF-109, RF-126) */
export function encuadreDe(resolucion, camaraCfg, pantalla) {}
```

### 3.3 `src/ruta/validar.js` (puro)

```js
/**
 * @param {Object} json
 * @param {{idsActivos: Set<string>, sectores: string[], nombresPropios: string[], ejemplosForaneos: string[], publicadas: string[]}} contexto
 * @returns {{ok: boolean, errores: Array<{ruta: string, regla: string, detalle: string}>}}
 */
export function validarRecorridos(json, contexto) {}
```

Reglas (cada una con su prueba en `test/recorridos.test.mjs`, que ademas ejecuta el archivo real con `idsActivos` leidos de `public/data/*.geojson`): RF-112 campos obligatorios, ES/EN no vacios ni `[pendiente]`, `datos` puede ser `[]`, `unidad` nula si cualitativo; RF-113 `fuente` `https://` y sin `[fuente_pendiente]`; RF-114 `fecha_norma` en `legal`; RF-115 `objetivo_ref`/`entre` existen; RF-116 `capas` ⊂ `SECTORES`; RF-117 `ejemplosForaneos` (`Alberta`, `Texas`, `Mar del Norte`) ausentes en todo texto y `fuente_nombre`; RF-118 `°API` => `aproximado` y `fecha_dato`; RF-119 cada nombre de `nombresPropios` presente en el ES tambien esta en el EN; RF-120 `referencia` valido; RF-121 `instalacion` => `nota` ES/EN. Ademas: `orden` consecutivo desde 1, ids unicos, `interaccion` nula, el id del recorrido esta en `publicadas`. En runtime `datos.js` aplica solo una validacion ligera (estructura y tipos, RF-122).

### 3.4 `src/ruta/datos.js`

```js
/** fetch(RUTAS_DATOS.recorridos) + validacion estructural ligera. Devuelve el objeto o lanza Error con mensaje util (RF-105, RF-122). */
export async function cargarRecorridos() {}
```

### 3.5 `src/map.js`

```js
/**
 * Coloca o vuela la camara. @param {{centro:{lng,lat}|null, radioM:number, rumbo:number, inclinacion:number, desplazamiento:number, vista:"faja"|null}} encuadre
 * vista === "faja" delega en volarAFaja(). Vuelo <= RECORRIDO.duracionVueloS, cancelable por pointerdown/wheel/touchstart
 * (reutiliza volarCancelable, map.js:386); movimiento reducido: sin vuelo (ADR-018); hold de render continuo durante el vuelo (ADR-019).
 */
export function vistaEscena(encuadre) {}
```

Encuadre como `vistaCiudadBolivar` (plan 001 §3.8): esfera que contiene los puntos + margen; el `desplazamiento` baja el centro para que el punto del objetivo quede en el 60 % superior de la parte visible del mapa con el panel desplegado (RF-109). Los numeros (margen, inclinacion, desplazamiento) van en `RECORRIDO.camara` con `// SIN VERIFICAR` y se miden en T13.

### 3.6 Interfaz

```js
// src/ui/accesoRuta.js — chunk inicial, minimo
export function registrarAccesoRuta(alEntrar) {}            // callback del boton (RF-81)
export function ocultarAccesoRuta(oculto) {}                 // RF-127
export function repintarRuta() {}                            // la llama montarUI(): recrea acceso y, si hay panel, lo repinta
export function fijarRepintadoPanel(fn) {}                   // lo registra recorrido.js al montar
// src/ui/recorrido.js — chunk diferido; sin fetch ni cesium; importa accesoRuta.js (no al reves)
export function htmlPanel(vm, util) {}        // vm: {titulo, n, total, nivel, texto, datos, referencia, terminado, primera, plegado}; pura, testeable
export function montarPanelRecorrido({ vm, alAnterior, alSiguiente, alNivel, alSalir }) {}
export function actualizarPanelRecorrido(vm) {}
export function desmontarPanelRecorrido() {}
```

Disposicion: ranuras propias creadas por `montarUI` (T11): escritorio, tarjeta lateral; ancho <640 px o alto <500 px, hoja inferior plegable <= 45 vh sin tapar los creditos de Cesium. Mientras hay recorrido, `ocultarAccesoCiudadBolivar(true)` y `ocultarAccesoRuta(true)` (RF-127). Botones >= 44 px; region de anuncio educada que no mueve el foco. Las ranuras nuevas se suman a la lista de `ui.js:1616` para que "Despejar pantalla" (spec 001, RF-23) las trate igual.

### 3.7 Config, controlador, Esc, URL e historial

```js
// src/config.js
export const RUTAS_PUBLICADAS = ["R5"];                       // solo ids; el JSON trae el resto
export const RUTAS_DATOS = { ..., recorridos: "/data/ruta/recorridos.json" };
export const RECORRIDO = {
  porDefecto: "R5", niveles: ["divulgacion", "tecnico"],
  duracionVueloS: 2.0,                                         // <= 2,5 (RF-87); SIN VERIFICAR hasta medir en T13
  camara: { /* margen, inclinacion, desplazamiento: SIN VERIFICAR */ },
  nombresPropios: ["Merey 16", "Petropiar", "Petrocedeño", "Petromonagas", "Petro San Félix", "Special Hamaca Blend", "Zuata Sweet", "Junín", "José"],
  ejemplosForaneos: ["Alberta", "Texas", "Mar del Norte"],
};
DEFINICION_MODOS.ruta = { id: "ruta", camara: "ruta", capasEncendidas: [], anillos: null, interfaz: "ruta", vueltaAtras: "nacional" };
```

`src/ruta/controlador.js` (chunk diferido): `iniciarRecorrido(deps, { id, escena, nivel, entradaDesdeApp })`, `irAEscena(n)`, `cambiarNivel(n)`, `aplicarCamaraActual()`, `salir()`, `detener()`. Recibe `deps` = `{fijarCapas, mapa: () => modulo|null, colecciones: () => ({...}), t, idioma, mostrarError, historial, ordenBusqueda}`. Guarda **la escena actual**, de modo que `CAMARAS.ruta` (que `main.js:542` reaplica sin argumentos al conectar el mapa) llama `aplicarCamaraActual()` (RF-125); cuando llega una coleccion (`campos`, `downstream`, `ductos`) se reintenta (RF-124). Escucha `idioma:cambiado` (el evento que ya usa `main.js`) y repinta el panel (RF-106); las ranuras las repinta `montarUI` via `repintarRuta()`.

**Esc** (`ui.js:1940-1944`): se añade en `ui.js` `export function fijarSalidaPorEscape(fn)`; en el listener, si `fuentesAbiertas`, `panelAbierto`, `capasAbiertas && esPequena()` o `tablaVisible` cierra lo que ya cerraba y **no** llama a `fn`; solo si nada estaba abierto llama `fn()` (RF-90). Flechas: el controlador registra su `keydown` solo para ArrowLeft/ArrowRight y descarta el evento si el foco esta en un campo de texto o en el selector de nivel.

**Capas de sector**: al montar, `fijarCapas` devuelve el estado previo de los 3 sectores y el controlador lo guarda para restaurarlo al `detener()`. `?capa=` no puede cambiar sectores durante el recorrido y `?vuelo=` se ignora (RF-128): en `iniciarModo` (`main.js:451-477`) esas dos lineas se saltan si el modo es `ruta`.

**Entrada**: por boton = `irAModo("ruta")` (`pushState({modo:"ruta"})`, URL de la escena 1) con `entradaDesdeApp = true`; por enlace = `iniciarModo` con `modoPedido` (trampolin existente) y `entradaDesdeApp = false`.

**Salir** (RF-82): `entradaDesdeApp` => `history.back()` (el `popstate` aplica el modo anterior y `desmontar` restaura capas); si no, `irAModo(modoInicialEn(new Date(), MODO_INICIAL, PORTADA_POR_FECHA))`. Cada cambio de escena o nivel hace `history.replaceState({modo: "ruta"}, "", urlDeEscena(...))`: siempre conserva `{modo:"ruta"}` (RF-91) para que `alVolverEnHistorial` (`main.js:438`) no pierda el modo en una recarga. Reglas del plan 001 §3.7 siguen vigentes (`popstate` idempotente, `ui.js` dueño de `{orinoco: vista}`).

### 3.8 Claves i18n (T07; mismas claves en ES y EN, `test/i18n.test.mjs`)

`ruta.acceso` (Ruta de aprendizaje / Learning path) · `ruta.escenaDe` ("Escena {n} de {total}" / "Scene {n} of {total}") · `ruta.anterior` · `ruta.siguiente` · `ruta.terminar` · `ruta.salir` · `ruta.nivel.divulgacion` · `ruta.nivel.tecnico` · `ruta.fuentes` · `ruta.fuente` · `ruta.confianza` · `ruta.verificado` · `ruta.fechaDato` · `ruta.normaDel` ("Norma del {fecha}") · `ruta.aproximado` ("varía con el diluente y el lote") · `ruta.esquematico` · `ruta.ubicacionReferencia` · `ruta.plegar` · `ruta.desplegar` · `ruta.cargando` · `ruta.errorCarga` · `ruta.errorDatos` · `ruta.errorObjetivo` · `ruta.anuncioEscena`. El texto de escena no va en i18n (excepcion declarada en ADR-023).

### 3.9 `verificar-modulos`

Reglas nuevas: `src/ruta/**` no importa `cesium`; `src/ruta/motor.js` y `validar.js` no usan `fetch(`, `document` ni `window`; `fetch(` en `src/ruta/` solo en `datos.js`; `controlador.js` no usa `fetch(` ni importa `ui.js` ni `map.js`; `src/ui/recorrido.js` y `accesoRuta.js` ya quedan cubiertos por la regla de `src/ui/**` (sin `fetch`, sin `cesium`); `accesoRuta.js` no importa `recorrido.js`; `main.js` y `ui.js` no importan `src/ruta/**` ni `ui/recorrido.js` de forma estatica (solo `import()`), salvo `ui/accesoRuta.js`.

## 4. Trazabilidad

| RF | Donde | Como se prueba |
|---|---|---|
| 79 | `modos.modoPedido`; `main.js` `iniciarModo`; `controlador` | `test/modos.test.mjs`; I1 abre la URL |
| 80 | `modoPedido` (recorrido no publicado -> inicial por fecha); `motor.estadoInicial` | `modoPedido`: `ruta` sin recorrido, `R9`, `R5`; `estadoInicial`: escena 9, 0, "x", nivel "experto"; T13: sin peticion de `recorridos.json` |
| 81, 127 | `ui/accesoRuta`; `ocultarAccesoRuta`/`ocultarAccesoCiudadBolivar` | I1 captura con y sin recorrido; Luis en telefono |
| 82, 83 | `controlador.salir`; `main.js` `irAModo`/`popstate`; `motor.siguiente` | `siguiente` en la ultima = terminado (test); I1: boton, atras, entrada desde Ciudad Bolívar, entrada por enlace, restauracion de capas |
| 84, 85 | `ui/recorrido.htmlPanel`; `motor.anterior`/`siguiente` | `test/ui-recorrido.test.mjs` (Anterior deshabilitado en 1, "Terminar" en la ultima) |
| 86 | `motor.capasDeSector`; `controlador` con `fijarCapas` | test de `capasDeSector`; I1 (las capas ajenas no cambian) |
| 87 | `RECORRIDO.duracionVueloS`; `map.vistaEscena` | test: `duracionVueloS <= 2.5`; T13 mide del clic al fin del vuelo (cronometro en pagina sin teselas, 3 corridas) |
| 88, 89 | `map.vistaEscena` | I1 con `prefers-reduced-motion` emulado; Luis en telefono |
| 90 | `ui.js` `fijarSalidaPorEscape`; `controlador` flechas | I1: Esc con ficha abierta (cierra solo ficha), sin ficha (sale), flechas con foco en el selector |
| 91 | `motor.urlDeEscena`; `controlador` `replaceState({modo:"ruta"})` | `urlDeEscena` ida y vuelta (test); I1: recarga y atras |
| 92, 93 | `ui/recorrido`; `motor.textoDeEscena` | test del HTML por nivel; I1: cambio sin vuelo |
| 94, 95 | `motor.datosDeEscena`; `ui/recorrido` | `test/ui-recorrido.test.mjs` (valor, unidad, enlace `rel="noopener noreferrer"`, confianza, fechas, norma; sin control con `datos: []`) |
| 96 | `recorridos.json` | revision + `test/recorridos.test.mjs` (el codigo no contiene texto de escena: busqueda de frases en `src/`) |
| 100, 111 | `validar.js` (RF-118, RF-121); `ui/recorrido` | `test/recorridos.test.mjs`; I1 captura de la escena 3 |
| 101 | `referencia`; `ui/recorrido` | test del HTML (rotulo `esquemático` / `ubicación de referencia`) |
| 105, 122 | `datos.js`; `controlador` | `test/ruta-datos.test.mjs`; I1 (bloquear `recorridos.json`; servir uno roto) |
| 106, 107 | `es.json`/`en.json`; `recorridos.json`; `validar.js`; `repintarRuta` | `test/i18n.test.mjs` (paridad) + `test/recorridos.test.mjs` (RF-119); I1 en EN y cambio de idioma con el recorrido abierto |
| 108 | `ui/recorrido` | test del HTML (region de anuncio, botones con clase de 44 px); I1 |
| 109, 126 | `ui/recorrido`, `style.css`, `motor.encuadreDe`, `map.vistaEscena` | `encuadreDe` (test: desplazamiento segun pantalla); T13 capturas 390x844 y 844x390: punto del objetivo en el 60 % superior; Luis en telefono |
| 110 | `main.js` `import()`; `accesoRuta` | `verificar:modulos`; T13: pestana de red sin `recorridos.json` ni `controlador` hasta pulsar |
| 112-121 | `validar.js` | `test/recorridos.test.mjs`: un fixture invalido por regla + archivo real |
| 123, 124, 125 | `motor.resolverCamara`; `controlador.aplicarCamaraActual`; `main.js:542` | `resolverCamara` con ok/pendiente/ausente/false (test); I1: bloquear `campos.geojson`, ralentizar la red, abrir por URL antes de Cesium |
| 128 | `main.js` `iniciarModo` | I1: `?modo=ruta&recorrido=R5&capa=ciudadBolivar&vuelo=OSM-R7948635` |
| RNF-1, 2 | build | T13 mide gzip y tamaño |
| RNF-3, 8 | `verificar-modulos`; ADR-023 | `npm test` |

## 5. Riesgos

| Riesgo | Mitigacion |
|---|---|
| Una cifra sin fuente verificable entra al texto | RF-113 bloquea el archivo; T02 antes de T06; D1b y D10 ya retiradas; ≈32° de Zuata retirado |
| Mejoradores y terminal de José no estan en el dataset: la escena parece afirmar mas de lo que muestra | `referencia` y rotulo (RF-101); pregunta 2 del gate; tarea de datos aparte |
| Los mejoradores ya no funcionen como tales (fuente 2019: tres se reconvirtieron a mezcla) | RF-111: fecha visible y nota "instalados segun Platts (2021)", sin "operan hoy" |
| El °API de una mezcla cambia con el diluente y el lote | RF-100 y RF-118 |
| Marco legal en movimiento | `fecha_norma` (RF-114); la ley dice "base imponible" y sus articulos del impuesto entran 60 dias despues; el texto no cita articulos del impuesto |
| Fuentes que no abrieron (spglobal 403, KPMG 404, PwC 403) | T02 las confirma en navegador; sustituto del resumen KPMG: texto de la ley y Finanzas Digital |
| Dos listeners de Esc cierran ficha y recorrido a la vez | Un solo listener (`ui.js:1925`) con gancho; RF-90 |
| `montarUI` borra el panel al repintar (`modoCiudadBolivar.js:358-369`) | Ranuras propias y `repintarRuta()` desde `montarUI` |
| Cesium diferido: `main.js:542` reaplica la camara sin escena | `controlador` guarda la escena actual; `CAMARAS.ruta` la lee (RF-125) |
| Capa aun cargando se confunde con objetivo inexistente | `resolverCamara` con tres estados (RF-123, RF-124) |
| `main.js` (603 lineas) y `ui.js` (1.948) crecen | Pegamento <= 60 y <= 40 lineas netas; logica en `src/ruta/`; HTML en `src/ui/` |
| Salir apila `nacional` y no vuelve a Ciudad Bolívar | `history.back()` si se entro desde la app; `replaceState` conserva `{modo:"ruta"}` |
| Presupuesto de JS | Chunk propio por `import()`; `motor.js` nunca estatico; medicion en T13; si el codigo del acceso pasa de 2 KB se justifica |
| Excepcion al principio 7 (texto de escena fuera de `t(clave)`) | Declarada en ADR-023 y en spec §10; el validador exige ES/EN |
| `ADR-023` choca con otro numero tomado en paralelo | Renumerar al integrar |
| Textos en ingles redactados por el implementador | Gate de Luis; nombres propios verificados por RF-119 |

## 6. Decisiones del plan

- D1. Recorrido = modo `ruta`, sin `modeStore` (aprobada). Reversible: si.
- D2. Datos en `public/data/ruta/recorridos.json` con `datos.js` propio, fuera de `api.js` (aprobada). Reversible: si.
- D3. Las escenas solo fijan capas de sector; el validador usa `SECTORES` (`config.js:160`) y `CAPAS_DE_INTERRUPTOR` se queda en `ui.js`. Reversible: si.
- D4. Escenas con `replaceState`; atras sale. Reversible: si.
- D5. En P1 `interaccion` es siempre `null`; el campo ya existe para P2-P6.
- D6. Objetivo de la escena 1: Junin 6 (campo petrolero, sin gas asociado en el nombre GEM) en vez de Junin 5 ("Oil and Gas"). Reversible: si.
- D7. `confianza` de los datos: `media` (ninguna fuente de R5 es el sitio oficial ni la Gaceta). Reversible: si.
- D8. `RUTAS_PUBLICADAS` en `config.js` y `modoPedido` en `modos.js` para decidir el modo sin descargar datos. Reversible: si.
- D9. Un `controlador` diferido recibe sus dependencias por parametro; `src/ruta/` no importa `ui.js` ni `map.js`. Reversible: si.
- D10. Esc por gancho en `ui.js`, ranuras propias, `ocultarAccesoCiudadBolivar`. Reversible: si.

## 7. JARVIS: capacidades reutilizables

| Pieza | Capacidad | Como viaja a `arsenal` |
|---|---|---|
| `src/ruta/motor.js` + `validar.js` | **Motor de recorridos guiados**: esquema de escena, validacion de trazabilidad, navegacion, estado en la URL, niveles de lectura, resolucion de objetivos con estados cargando/fallo/ausente | Spec (RF-79 a RF-128 reescritos sin nombres de proyecto) + `test/ruta-motor.test.mjs` + `test/recorridos.test.mjs`. Agnostico de Cesium y DOM; candidato de consumo: sismos-ve |
| `src/ruta/petro.js` (P2, no en esta spec) | **Formulas petroleras puras** (°API/SG, clase venezolana, OOIP, EUR, RLI, energia del barril) | Spec + `test/petro.test.mjs` (los casos de Notion §7) |
| Reglas de fuente obligatoria y de ejemplos foraneos | Validador de "contenido trazable" | Se documenta en la ficha del motor |

Antes de P1 (T01) se comprueba `C:\dev\arsenal\INVENTARIO.md` por si ya existe un motor de escenas (jarvis-trasplante).

## 8. Hoja de ruta posterior (no son tareas)

P2 calidad de crudo + R6 + `petro.js` · P3 glosario (25 entradas ES/EN) + bloque "Por que importa" · P4 R1 y R2 (capas sistema petrolero e hitos) · P5 R3 y R4 · P6 R7 + mechurrios + 8 retos. Cada una abrira RF nuevos desde el RF-129 y su propia revision del gate. El contrato de §3.1 ya admite `interaccion`, nuevas capas y mas recorridos sin cambios.
