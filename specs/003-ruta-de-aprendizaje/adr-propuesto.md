## ADR-023 — Ruta de aprendizaje: recorridos guiados como modo del mapa, con datos propios y nucleo puro

**Fecha:** 2026-10-24 · **Estado:** Propuesto (espera el gate de Luis sobre la spec 003; se copia a `docs/DECISIONS.md` en la tarea T13). El numero 023 es el siguiente libre despues de ADR-022; si otra rama lo toma, se renumera.

**Contexto.** Notion define una "Ruta de aprendizaje" de 7 recorridos guiados de 5 escenas que es el contenido de N2 (Divulgacion) y N3 (Tecnico) del Sistema de Modos. Sus dependencias declaradas son `modeStore` (N1) y el motor de escenas de "Mejora v2" (§3.4), y ninguno existe. El repo si tiene: modos declarativos con `?modo=` y gesto atras entre modos (ADR-020 pieza 10), enlaces `?capa=`/`?vuelo=`, carga diferida de Cesium (ADR-022), `src/ui/` (ADR-017), contrato de procedencia `fuente`/`confianza`/`ultima_verificacion` (ADR-015), i18n ES/EN con igualdad de claves (ADR-005) y datos estaticos versionados (ADR-003, ADR-010). El contenido tiene dos riesgos propios: cifras sin fuente publica verificable y marco legal en movimiento. La verificacion del 2026-10-24 mostro dos correcciones en R5 (diluente "bajo un acuerdo de suministro", no "bajo licencias"; el impuesto integrado se calcula sobre ingresos brutos, no sobre volumen) y una afirmacion sin fuente publica ("transferencia de custodia = medicion fiscal").

**Decision.**

1. **El recorrido es un modo mas** (`ruta`) de `DEFINICION_MODOS` (`src/config.js`), con `?modo=ruta&recorrido=<id>&escena=<n>&nivel=<divulgacion|tecnico>`. **No se espera a `modeStore`**: el nivel de lectura es un estado del recorrido y N1 podra absorberlo (mismo criterio que ADR-020 pieza 10, "adelanto minimo de N1"). Cambiar de escena o de nivel usa `replaceState`; el gesto atras sale del recorrido.
2. **Contenido en un archivo de datos propio**, `public/data/ruta/recorridos.json` (no GeoJSON), cargado por `src/ruta/datos.js` con su propio `fetch` y validacion, como `src/expofaja/datos.js` (ADR-020 pieza 3). El contrato de `api.js` ("devuelve siempre FeatureCollection") no cambia. El texto de las escenas vive en el JSON, bilingue, y no en `es.json`/`en.json`; las claves de interfaz si van en i18n con igualdad de claves.
3. **Contrato de escena** (spec 003 / plan §3.1): extiende el de Notion §7 con procedencia por dato (`fuente` URL `https://`, `confianza`, `ultima_verificacion`, `fecha_dato`, `fecha_norma` para lo legal, `aproximado`), `camara` por referencia a ids del dataset (`objetivo_ref`, `entre`, `vista`; nunca coordenadas escritas a mano), `referencia` para lo que no es el activo real, e `interaccion` (null en P1). Un placeholder `[fuente_pendiente]` hace invalido el archivo: no se publica.
4. **Nucleo puro y agnostico** en `src/ruta/` (`motor.js`, `validar.js`): sin DOM, `fetch` ni `cesium`; `datos.js` es el unico que hace red. `verificar-modulos` se amplia. La interfaz va en `src/ui/recorrido.js` y `src/ui/accesoRuta.js`; `map.js` gana solo `vistaEscena`. Para que el validador de CI conozca los ids de capa, `CAPAS_DE_INTERRUPTOR` pasa de `src/ui.js` a `src/config.js`.
5. **Validacion en `npm test`**, sin tocar `package.json`: estructura, ES/EN completos, ids de camara existentes en `public/data/*.geojson`, capas validas, fuente obligatoria, `fecha_norma` en lo legal y lista negra de la regla de transformacion (`Alberta`, `Texas`, `SAGA`, "el curso").
6. **Carga diferida** (ADR-022): modulo, interfaz y datos del recorrido se descargan con `import()` solo al iniciarlo. En el chunk inicial vive el acceso. Presupuesto propuesto: acceso <= 2 KB gzip; chunk del recorrido <= 20 KB gzip; R5 <= 30 KB de JSON.
7. **Alcance P1**: solo R5, con las capas existentes, sin interacciones que dependan de piezas inexistentes (mechurrios, animacion de flujo, ficha del mejorador, simulador de descuento). Lo que el dataset no tiene (mejoradores, terminal y oleoducto de José) se rotula "ubicacion de referencia"/"esquematico" y se cubre despues con una tarea de datos con fuente y coordenada citadas.
8. **Honestidad del contenido**: las cifras de mezclas de crudo se muestran aproximadas y con año; lo instalado en una planta se fecha y no se afirma que opere hoy; lo legal lleva la fecha de su norma; ninguna escena emite veredicto (constitucion 9).

**Alternativas.**

- *Esperar a N1 (`modeStore`) y construir los cuatro modos antes:* es la dependencia de Notion; retrasa todo el contenido y multiplica el QA por cuatro. Rechazada para P1; el diseño (nivel local, mismo vocabulario de modos) deja la migracion barata.
- *Recorrido como superposicion fuera del sistema de modos:* evita tocar `config.js`, pero duplica el historial, el gesto atras y la restauracion de capas que ADR-020 ya resolvio. Rechazada.
- *Texto de escenas en `es.json`/`en.json`:* reutiliza i18n, pero mezcla contenido con datos de procedencia y obliga a una clave por frase y dato. Rechazada para las escenas; se mantiene para la interfaz.
- *Importar el JSON en el build (`import()` de un `.json` de `src/`):* sin `fetch` ni excepcion al contrato; pero el contenido sale del patron `public/data/` + validador de CI y se vuelve parte del bundle. Queda como alternativa si Luis prefiere no tener un segundo cargador de datos.
- *Anadir esquema JSON y una libreria de validacion:* dependencia nueva sin justificar (CLAUDE.md). Rechazada; el validador es codigo propio con pruebas.

**Consecuencias.**

- (+) El motor y el validador son reutilizables (capacidad JARVIS: spec + pruebas, sin Cesium ni DOM).
- (+) Toda cifra visible es trazable; el CI impide publicar contenido sin fuente.
- (+) Los otros 6 recorridos son datos, no codigo (nuevas capas y interacciones entran con su fase).
- (-) Un modo mas en `DEFINICION_MODOS` y mas logica de historial en `main.js`.
- (-) Segundo cargador de datos fuera de `api.js` (precedente: micrositio).
- (-) Un movimiento de constante entre `ui.js` y `config.js`.
- (-) El nivel de lectura vive dos veces hasta que exista `modeStore`; la migracion es una tarea de N1.
- (-) Hasta que el dataset tenga mejoradores y terminal de José, las escenas 3 y 4 usan una ubicacion de referencia.

**Como se mide.** `npm test` (motor, validador, archivo real, i18n, `verificar:modulos`); `npm run build` y gzip del chunk inicial y del chunk del recorrido; capturas 1440x900 y 390x844 en ES y EN; Chrome DevTools MCP para URLs, historial y red; gate: Luis en telefono real con DevTools cerrado y una persona ajena al tema que entienda R5 sin explicacion.
