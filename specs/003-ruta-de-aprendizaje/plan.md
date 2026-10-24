# Plan 003 — Ruta de aprendizaje (piloto R5)

> Spec: `specs/003-ruta-de-aprendizaje/spec.md` (RF-79 a RF-111) · ADR-023 propuesto (`adr-propuesto.md`).
> Rama `ruta-aprendizaje`. Todo lo de abajo esta sujeto al gate de Luis sobre spec, plan, tareas y ADR.
> Donde Notion choca con el codigo real, manda el codigo (`docs/NOTION.md`). Rutas verificadas con Glob/Grep el 2026-10-24; las marcadas "nuevo" no existen todavia.

## 1. Enfoque

- **El recorrido es un modo mas** (`ruta`) en `DEFINICION_MODOS` (`src/config.js:278`), con `?modo=ruta&recorrido=R5&escena=n&nivel=divulgacion|tecnico`. Reutiliza la mecanica de ADR-020 pieza 10: `aplicarModo`/`irAModo`/trampolin de historial (`src/main.js:409-477`). Sin `modeStore` (N1): el nivel es un estado del recorrido, absorbible despues.
- **Nucleo puro y agnostico** en `src/ruta/` (nuevo): `motor.js` (estado, navegacion, URL, seleccion de texto, resolucion de objetivos a coordenadas) y `validar.js` (esquema + reglas de trazabilidad). Sin DOM, sin `fetch`, sin `cesium`. **Es la capacidad reutilizable para JARVIS (§7).**
- **Datos**: `public/data/ruta/recorridos.json` (nuevo), no GeoJSON. Los carga `src/ruta/datos.js` (nuevo) con su propio `fetch` y validacion, como `src/expofaja/datos.js` (precedente ADR-020 pieza 3). El contrato de `api.js` ("devuelve siempre FeatureCollection") no se toca.
- **Interfaz** en `src/ui/recorrido.js` y `src/ui/accesoRuta.js` (nuevos, bajo las reglas de `src/ui/**`: sin `cesium`, sin `fetch`). El HTML se genera con funciones puras testeables.
- **Mapa**: `map.js` gana una sola funcion, `vistaEscena(encuadre)`, que recibe puntos ya resueltos. `map.js` no sabe de escenas ni de i18n.
- **Carga diferida** (ADR-022): `main.js` hace `import()` de `src/ruta/datos.js` y `src/ui/recorrido.js` solo al iniciar un recorrido. En el chunk inicial solo vive el acceso (`accesoRuta.js`, minimo).
- Orden: contratos y pruebas primero (T03-T05), contenido (T06), pegamento (T08-T11), medicion (T12).

## 2. Archivos

### 2.1 Tabla

| Ruta | Accion | Que cambia | RF | Tarea |
|---|---|---|---|---|
| `specs/003-ruta-de-aprendizaje/plan.md` | Cambiar | §2.2: resultado de la auditoria de ids | 102, 103 | T01 |
| `docs/DATA_SOURCES.md` | Cambiar | Seccion 18 "Recorridos de la Ruta de aprendizaje": fuente, fecha, lectura y confianza de D1-D10 | 94, 98, 99, 100, 111 | T02, T13 |
| `src/config.js` | Cambiar | Mover aqui `CAPAS_DE_INTERRUPTOR` (hoy `src/ui.js:233`); `IDS_INTERRUPTOR`; `RUTAS_DATOS.recorridos`; `DEFINICION_MODOS.ruta`; `MODOS` lo hereda; `RECORRIDO` (tiempos, niveles, recorrido por defecto) | 79, 80, 86, 87 | T03 |
| `src/ui.js` | Cambiar (minimo) | Importar `CAPAS_DE_INTERRUPTOR` de `config.js` en vez de definirla | 86, 102 | T03 |
| `src/ruta/motor.js` | **Crear** | Funciones puras (§3.2) | 79-83, 85, 86, 90-93, 103, 106 | T04 |
| `test/ruta-motor.test.mjs` | **Crear** | Pruebas del motor | idem | T04 |
| `src/ruta/validar.js` | **Crear** | `validarRecorridos(json, contexto)` | 96-99, 102, 104, 106, 111 | T05 |
| `test/recorridos.test.mjs` | **Crear** | Validador con fixtures invalidos + archivo real contra `public/data/*.geojson`, `config.js` y `es.json`/`en.json` | 96-99, 102, 104, 106, 107 | T05, T06 |
| `public/data/ruta/recorridos.json` | **Crear** | R5: 5 escenas, 2 niveles, ES y EN, datos D1-D9 | 96-101, 106, 107, 111 | T06 |
| `src/i18n/es.json`, `src/i18n/en.json` | Cambiar | Claves `ruta.*` (§3.8) | 106, 108 | T07 |
| `src/ruta/datos.js` | **Crear** | `cargarRecorridos()`: fetch + validar | 96, 105, 110 | T08 |
| `scripts/verificar-modulos.mjs` | Cambiar | Reglas para `src/ruta/**` (§3.9) | RNF-3 | T08 |
| `test/ruta-datos.test.mjs` | **Crear** | `cargarRecorridos` con `fetch` simulado (ok, 404, JSON roto, invalido) | 105 | T08 |
| `src/map.js` | Cambiar | `vistaEscena(encuadre)` (§3.5) | 86-89, 109 | T09 |
| `src/ui/recorrido.js` | **Crear** | Panel del recorrido (§3.6) | 84, 85, 92-95, 100, 101, 106-109, 111 | T10 |
| `src/ui/accesoRuta.js` | **Crear** | Boton "Ruta de aprendizaje" | 81, 110 | T10 |
| `src/style.css` | Cambiar si hace falta | Solo utilidades con tokens existentes | 108, 109 | T10 |
| `test/ui-recorrido.test.mjs` | **Crear** | HTML del panel: escape, niveles, fuentes, deshabilitado/terminar, sin placeholders | 84, 85, 92-95 | T10 |
| `src/main.js` | Cambiar | `CAMARAS.ruta`, `INTERFACES.ruta`, enlace, historial, teclado (§3.7) | 79-83, 86-91, 103, 105, 110 | T11 |
| `docs/capturas/r5-*.png` | Crear | 1440x900 y 390x844, ES y EN, ambos niveles | 109 | T12 |
| `docs/DECISIONS.md`, `docs/ARCHITECTURE.md`, `MEMORY.md`, `specs/README.md`, `spec.md` (estado) | Cambiar | Cierre | — | T13 |

No se tocan: `api.js` (contrato), `vercel.json`, `package.json`, `vite.config.js`, `index.html`, `controladorRender.js`. Si una tarea necesita alguno, se para y se pregunta.

### 2.2 Objetivos de camara de R5 (verificados el 2026-10-24; T01 los recomprueba)

| Escena | Objetivo | Id real | Observacion |
|---|---|---|---|
| 1 | Campo Junín 6 | `GEM-L100000320738` (`campos.geojson:4633`) | Centro aproximado del campo (GOGET), confianza baja. No es una macolla. Alternativa: Junin 5 `GEM-L100000309181` (`:4578`) |
| 2 | Tramo Junín-José | par `GEM-L100000320738` + `OSM-W265071557` | Sin trazado: no hay oleoducto Junín-José identificable en `ductos-osm.geojson` (T01 lo confirma por geometria). Rotulo "esquemático" |
| 3 | José | `OSM-W265071557` (`downstream-osm.geojson:83`) | "Complejo Petroquímico José Antonio Anzoátegui" (Pequiven, `tipo: petroquimica`, confianza baja). **No es un mejorador** ni el terminal: "ubicación de referencia" |
| 4 | Terminal de José | `OSM-W265071557` (mismo) | El terminal no esta en el dataset (los `terminal` son grupos `OSM-TANQUES-nnn` derivados y sin nombre; ninguno cae cerca de José en la busqueda del 2026-10-24). `[id_pendiente: terminal de José]` |
| 5 | Salida al mercado | vista de la Faja (`volarAFaja`) | Sin rutas dibujadas |

Mejoradores de José: `[id_pendiente]`. Si T01 encuentra un elemento nombrado en el dataset, se anota aqui y se pregunta a Luis antes de usarlo.

## 3. Contratos

### 3.1 Esquema del archivo y de la escena (extiende el de Notion §7)

```jsonc
{
  "version": 1,
  "ultima_verificacion": "2026-10-24",
  "recorridos": [{
    "id": "R5",
    "estado": "publicado",                       // solo "publicado" se lista
    "titulo": { "es": "...", "en": "..." },
    "pregunta": { "es": "...", "en": "..." },
    "escenas": [{
      "id": "R5-E3", "recorrido": "R5", "orden": 3,
      "camara": { "objetivo_ref": "OSM-W265071557" },       // o { "entre": [ref, ref] } o { "vista": "faja" }
      "referencia": true,                                    // activo de referencia, no el real (RF-101)
      "capas": ["midstream", "downstream"],                  // ids de interruptor existentes (§3.7)
      "texto": {
        "divulgacion": { "es": "...", "en": "..." },
        "tecnico":     { "es": "...", "en": "..." }
      },
      "datos": [{
        "id": "D3", "etiqueta": { "es": "...", "en": "..." },
        "valor": "16", "unidad": "°API", "aproximado": true,
        "fecha_dato": "2026-03-31",                          // anio del dato (RF-100, RF-111)
        "fuente": "https://...", "fuente_nombre": "S&P Global Platts, nota del 31/03/2026",
        "confianza": "media", "ultima_verificacion": "2026-10-24",
        "fecha_norma": "2026-01-29",                         // solo datos legales (RF-99)
        "nota": { "es": "...", "en": "..." }                 // opcional
      }],
      "interaccion": null                                    // P1: siempre null
    }]
  }]
}
```

Diferencias con el esquema de Notion: `datos[]` gana `id`, `confianza`, `ultima_verificacion`, `fecha_dato`, `aproximado`, `fuente_nombre`, `fecha_norma`; `camara` admite `entre` y `vista`; `referencia`; `estado`. Los textos `en` no pueden ser `[pendiente]`. Es un archivo nuevo: no cambia ningun formato existente. Los ids de capa de Notion que aun no existen (`calidad-crudo`, `sistema-petrolero`, `hitos`, `mechurrios`) quedan prohibidos hasta que su fase los cree.

### 3.2 `src/ruta/motor.js` (puro)

```js
/** @returns {{recorrido: string|null, escena: number|null, nivel: string|null}} valores invalidos o vacios -> null (RF-80) */
export function leerEnlaceRuta(search, { recorridos, niveles }) {}
/** "/?modo=ruta&recorrido=R5&escena=3&nivel=tecnico" (RF-91) */
export function urlDeEscena(pathname, { recorrido, escena, nivel }) {}
/** Estado inicial: escena en rango o 1; nivel valido o "divulgacion". */
export function estadoInicial(recorrido, enlace) {}
/** @returns {{escena: number, terminado: boolean}} clamp; siguiente en la ultima = terminado (RF-83, RF-85) */
export function siguiente(recorrido, escena) {}
export function anterior(recorrido, escena) {}               // en la 1 se queda en 1 (RF-85)
/** Texto del nivel en el idioma; sin idioma cae a "es". */
export function textoDeEscena(escena, nivel, idioma) {}
/** Datos listos para pintar: valor+unidad, fuente, confianza, fechas, "aproximado" (RF-94, RF-95, RF-100) */
export function datosDeEscena(escena, idioma) {}
/** Capas de sector que deja encendidas la escena y las que apaga (RF-86) */
export function capasDeSector(escena, sectores) {}
/**
 * Resuelve camara -> puntos. Usa buscarActivo de src/modos.js. Un Point da su coordenada; una linea o poligono, el centro de su caja.
 * @returns {{puntos: Array<{lng:number,lat:number}>, vista: "faja"|null, referencia: boolean} | null}  null si no se resuelve (RF-103)
 */
export function resolverCamara(escena, colecciones, ordenBusqueda) {}
/** Encuadre abstracto para el mapa: centro, radio, rumbo, inclinacion (valores de config.js RECORRIDO.camara) */
export function encuadreDe(resolucion, camaraCfg, { vertical }) {}
```

### 3.3 `src/ruta/validar.js` (puro)

```js
/**
 * @param {Object} json  contenido de recorridos.json
 * @param {{idsActivos: Set<string>, idsInterruptor: string[], sectores: string[]}} contexto
 * @returns {{ok: boolean, errores: Array<{ruta: string, regla: string, detalle: string}>}}
 */
export function validarRecorridos(json, contexto) {}
```

Reglas (cada una con su prueba): RF-97 campos obligatorios y ES/EN no vacios y distintos de `[pendiente]`; RF-98 `fuente` URL `https://`, sin `[fuente_pendiente]`; RF-99 `fecha_norma` en datos con `tipo_dato: "legal"`; RF-102 `objetivo_ref`/`entre` existen en `idsActivos`, `capas` dentro de `idsInterruptor`; RF-104 lista negra `/\bAlberta\b|\bTexas\b|\bSAGA\b|\bel curso\b/i` sobre todo texto; `orden` consecutivo desde 1; ids unicos; `interaccion` null en P1; RF-111 todo dato con `fecha_dato`. La prueba del archivo real arma `idsActivos` leyendo los GeoJSON de `public/data/`.

### 3.4 `src/ruta/datos.js`

```js
/** fetch(RUTAS_DATOS.recorridos) + validarRecorridos. Devuelve el objeto o lanza Error con mensaje util (RF-105). */
export async function cargarRecorridos(contexto) {}
```

El contexto (ids de activos, interruptores) lo arma `main.js` con las colecciones ya cargadas; en runtime la validacion es ligera (estructura y ids), la completa corre en `npm test`.

### 3.5 `src/map.js`

```js
/**
 * Coloca o vuela la camara. @param {{centro:{lng,lat}|null, radioM:number, rumbo:number, inclinacion:number, vista:"faja"|null}} encuadre
 * vista === "faja" delega en volarAFaja(). Vuelo <= RECORRIDO.duracionVueloS, cancelable por pointerdown/wheel/touchstart
 * (reutiliza volarCancelable, map.js:386); movimiento reducido: sin vuelo (ADR-018); hold de render continuo durante el vuelo (ADR-019).
 */
export function vistaEscena(encuadre) {}
```

Encuadre como `vistaCiudadBolivar` (plan 001 §3.8): esfera que contiene los puntos + margen; en vertical el centro se desplaza para que el objetivo quede sobre el panel (RF-109). Los numeros (margen, inclinacion, desplazamiento) van en `RECORRIDO.camara` con `// SIN VERIFICAR` y se miden en T12.

### 3.6 Interfaz

```js
// src/ui/recorrido.js — sin fetch ni cesium
export function htmlPanel(vm, util) {}        // vm: {titulo, n, total, nivel, texto, datos, referencia, terminado, primera}; util: {esc, enlaceSeguro}. Pura, testeable.
export function montarPanelRecorrido({ vm, alAnterior, alSiguiente, alNivel, alFuentes, alSalir }) {}
export function actualizarPanelRecorrido(vm) {}
export function desmontarPanelRecorrido() {}
// src/ui/accesoRuta.js — pegado al chunk inicial, minimo
export function registrarAccesoRuta(alEntrar) {}
```

Disposicion (a confirmar en T10 contra `ui.js`): el panel ocupa la ranura del panel de modo (`#ranura-panel-modo`, plan 001 §3.4) porque solo hay un modo activo; en telefono, hoja inferior plegable <= 45 vh sin tapar los creditos de Cesium. Botones >= 44 px; region `aria-live="polite"` con "Escena n de N: …".

### 3.7 Config, capas y URL

```js
// src/config.js
export const CAPAS_DE_INTERRUPTOR = { /* movida desde ui.js:233, sin cambios */ };
export const IDS_INTERRUPTOR = Object.keys(CAPAS_DE_INTERRUPTOR);   // upstream, midstream, downstream, toponimia, hidrografia, limites, disputa, faja, centrales, ciudadBolivar, iniciativas
export const RUTAS_DATOS = { ..., recorridos: "/data/ruta/recorridos.json" };
export const RECORRIDO = { porDefecto: "R5", niveles: ["divulgacion", "tecnico"], duracionVueloS: 2.0, /* <= 2,5 (RF-87); SIN VERIFICAR */ camara: { /* SIN VERIFICAR: medir en T12 */ } };
DEFINICION_MODOS.ruta = { id: "ruta", camara: "ruta", capasEncendidas: [], anillos: null, interfaz: "ruta", vueltaAtras: "nacional" };
```

Las capas de sector que fija una escena son `SECTORES` (`config.js:160`); las demas no se tocan.

Historial (extiende plan 001 §3.7): entrar por boton = `irAModo("ruta")` con `pushState({modo:"ruta"})` y la URL de la escena 1; entrar por enlace = `iniciarModo` (trampolin a `nacional` ya existente). **Cambiar de escena o de nivel = `history.replaceState`** (RF-91): el gesto atras sale del recorrido (RF-82). Al montar, `INTERFACES.ruta.montar` guarda con `fijarCapas` el estado previo de los 3 sectores y `desmontar` lo restaura; no se usa `capasPrevias` de `aplicarModo` (el modo no declara capas, las fija la escena).

### 3.8 Claves i18n (T07; mismas claves en ES y EN, `test/i18n.test.mjs`)

`ruta.acceso` (Ruta de aprendizaje / Learning path) · `ruta.escenaDe` ("Escena {n} de {total}" / "Scene {n} of {total}") · `ruta.anterior` · `ruta.siguiente` · `ruta.terminar` · `ruta.salir` · `ruta.nivel.divulgacion` · `ruta.nivel.tecnico` · `ruta.fuentes` ("Fuentes de esta escena") · `ruta.fuente` · `ruta.confianza` · `ruta.verificado` · `ruta.normaDel` ("Norma del {fecha}") · `ruta.aproximado` ("≈ varía con el diluente y el lote") · `ruta.datoDe` ("Dato de {anio}") · `ruta.esquematico` · `ruta.referencia` ("Ubicación de referencia: no es el activo mencionado") · `ruta.plegar` · `ruta.desplegar` · `ruta.cargando` · `ruta.errorCarga` · `ruta.errorObjetivo` · `ruta.regionAnuncio`. El texto de escena no va en i18n: va en `recorridos.json`.

### 3.9 `verificar-modulos`

Reglas nuevas: `src/ruta/**` no importa `cesium`; `src/ruta/motor.js` y `validar.js` no usan `fetch(`, `document` ni `window`; `fetch(` en `src/ruta/` solo en `datos.js`; `src/ui/recorrido.js` y `accesoRuta.js` ya quedan cubiertos por la regla de `src/ui/**`; `main.js` solo importa `src/ruta/datos.js` y `src/ui/recorrido.js` con `import()` dinamico (como `map.js`, ADR-022); `accesoRuta.js` no importa `recorrido.js`.

## 4. Trazabilidad

| RF | Donde | Como se prueba |
|---|---|---|
| 79, 80 | `motor.leerEnlaceRuta`/`estadoInicial`; `main.js` `iniciarModo` | `test/ruta-motor.test.mjs` (`// RF-79,80`: escena 9, nivel "experto", recorrido "R9", vacio); I1 abre las URL |
| 81 | `ui/accesoRuta.js`; `main.js` | I1 captura; Luis en telefono |
| 82, 83 | `main.js` `irAModo`/`popstate`; `INTERFACES.ruta.desmontar`; `motor.siguiente` | `siguiente` en la ultima = terminado (test); I1: boton, atras, restauracion de capas |
| 84, 85 | `ui/recorrido.htmlPanel`; `motor.anterior`/`siguiente` | `test/ui-recorrido.test.mjs` (Anterior deshabilitado en 1, "Terminar" en la ultima) |
| 86 | `motor.capasDeSector`; `main.js` con `fijarCapas` | test de `capasDeSector`; I1 (las capas ajenas no cambian) |
| 87 | `config.RECORRIDO.duracionVueloS`; `map.vistaEscena` | test: `duracionVueloS <= 2.5`; I1 mide el vuelo |
| 88 | `map.vistaEscena` | I1 con `prefers-reduced-motion` emulado |
| 89 | `map.vistaEscena` (cancelable) | I1; Luis en telefono |
| 90 | `main.js` teclado | I1 (flechas, Esc con y sin ficha) |
| 91 | `motor.urlDeEscena`; `main.js` `replaceState` | `urlDeEscena` (test); I1: recarga y atras |
| 92, 93 | `ui/recorrido`; `motor.textoDeEscena` | test del HTML por nivel; I1: cambio sin vuelo |
| 94, 95 | `motor.datosDeEscena`; `ui/recorrido` | `test/ui-recorrido.test.mjs` (valor, unidad, enlace `rel="noopener noreferrer"`, confianza, fecha) |
| 96, 97, 98, 99, 104 | `validar.js`; `recorridos.json` | `test/recorridos.test.mjs` (fixtures invalidos por regla + archivo real) |
| 100, 111 | `validar.js` (`fecha_dato`); `ui/recorrido` | idem; I1 captura de la escena 3 |
| 101 | `referencia`; `ui/recorrido` | test del HTML (rotulo presente si `referencia`) |
| 102 | `validar.js` con `idsActivos` real | `test/recorridos.test.mjs` |
| 103 | `motor.resolverCamara` -> null; `main.js` aviso | test con fixture sin el id; I1 (bloquear `campos.geojson`) |
| 105 | `datos.js`; `main.js` `mostrarError` | `test/ruta-datos.test.mjs`; I1 (bloquear `recorridos.json`) |
| 106, 107 | `es.json`/`en.json`; `recorridos.json`; `validar.js` | `test/i18n.test.mjs` (paridad) + `test/recorridos.test.mjs`; I1 en EN |
| 108, 109 | `ui/recorrido`, `style.css`, `map.vistaEscena` | I1 capturas 390x844 (panel <= 45 vh, objetivo visible); Luis en telefono |
| 110 | `main.js` `import()`; `accesoRuta` | `verificar:modulos`; I1: pestana de red sin `recorridos.json` ni `recorrido.js` hasta pulsar |
| RNF-1, 2 | build | T12 mide gzip y tamaño |
| RNF-3 | `verificar-modulos` | `npm test` |

## 5. Riesgos

| Riesgo | Mitigacion |
|---|---|
| Una cifra sin fuente verificable entra al texto | RF-98 bloquea el archivo; T02 antes de T06; lo no confirmado se retira (D10 ya retirada) |
| Mejoradores y terminal de José no estan en el dataset: la escena parece afirmar mas de lo que muestra | `referencia: true` + rotulo (RF-101); pregunta 2 del gate; tarea de datos aparte |
| Los mejoradores ya no funcionen como tales (fuente 2019: tres se reconvirtieron a mezcla) | RF-111: fecha visible, sin "operan hoy" |
| El °API de una mezcla cambia con el diluente y el lote | RF-100: aproximado, año, aviso |
| Marco legal en movimiento | RF-99: `fecha_norma`; el texto cita la Gaceta y la fecha; el impuesto no cita articulos (las fuentes difieren: 55-57 / 55-59) |
| Fuentes que no abrieron (spglobal 403, KPMG 404, PwC 403) | T02 las confirma en navegador; sustituto del resumen KPMG: texto de la ley (Acceso a la Justicia) y Finanzas Digital |
| `main.js` (603 lineas) y `ui.js` (1.948) crecen | Pegamento minimo en `main.js` (<= 80 lineas netas); logica en `src/ruta/`; HTML en `src/ui/`; mover `CAPAS_DE_INTERRUPTOR` es la unica edicion de `ui.js` |
| Dos duenos del historial (ui.js y modo) | Mismas reglas que el plan 001 §3.7: escenas con `replaceState`, nunca `pushState`; `popstate` idempotente |
| Cesium aun no cargado al abrir por URL (ADR-022) | `CAMARAS.ruta` espera a `mapa` como `vistaCiudadBolivar` (T11 verifica `main.js:245-250` y el arranque `:473`); si no esta, la escena muestra el texto y la camara se aplica al conectar el mapa |
| Presupuesto de JS | Chunk propio por `import()`; medicion en T12; si el acceso pasa de 2 KB, se mueve a `ui.js` y se justifica |
| `ADR-023` choca con otro numero tomado en paralelo | Renumerar al integrar |
| Textos en ingles redactados por el implementador | Gate de Luis; nombres propios sin traducir (RF-107) |

## 6. Decisiones del plan

- D1. Recorrido = modo `ruta`, sin `modeStore` (aprobada). Reversible: si.
- D2. Datos en `public/data/ruta/recorridos.json` con `datos.js` propio, fuera de `api.js` (aprobada). Reversible: si.
- D3. `CAPAS_DE_INTERRUPTOR` pasa a `config.js` para que el validador de CI conozca los ids de capa. Reversible: si.
- D4. Escenas con `replaceState`; atras sale. Reversible: si.
- D5. En P1 `interaccion` es siempre `null`; el campo ya existe para P2-P6.
- D6. Objetivo de la escena 1: Junin 6 (campo petrolero, sin gas asociado en el nombre GEM) en vez de Junin 5 ("Oil and Gas"). Reversible: si.
- D7. `confianza` de los datos: `media` (ninguna fuente de R5 es el sitio oficial ni la Gaceta). Reversible: si.

## 7. JARVIS: capacidades reutilizables

| Pieza | Capacidad | Como viaja a `arsenal` |
|---|---|---|
| `src/ruta/motor.js` + `validar.js` | **Motor de recorridos guiados**: esquema de escena, validacion de trazabilidad, navegacion, estado en la URL, niveles de lectura, resolucion de objetivos | Spec (RF-79 a RF-111 reescritos sin nombres de proyecto) + `test/ruta-motor.test.mjs` + `test/recorridos.test.mjs`. Agnostico de Cesium y DOM; candidato de consumo: sismos-ve |
| `src/ruta/petro.js` (P2, no en esta spec) | **Formulas petroleras puras** (°API/SG, clase venezolana, OOIP, EUR, RLI, energia del barril) | Spec + `test/petro.test.mjs` (los casos de Notion §7) |
| Regla de lista negra y de fuente obligatoria | Validador de "contenido trazable" | Se documenta en la ficha del motor |

Antes de P1 (T01) se comprueba `C:\dev\arsenal\INVENTARIO.md` por si ya existe un motor de escenas (jarvis-trasplante).

## 8. Hoja de ruta posterior (no son tareas)

P2 calidad de crudo + R6 + `petro.js` · P3 glosario (25 entradas ES/EN) + bloque "Por que importa" · P4 R1 y R2 (capas sistema petrolero e hitos) · P5 R3 y R4 · P6 R7 + mechurrios + 8 retos. Cada una abrira RF nuevos desde el RF-112 y su propia revision del gate. El contrato de §3.1 ya admite `interaccion`, nuevas capas y mas recorridos sin cambios.
