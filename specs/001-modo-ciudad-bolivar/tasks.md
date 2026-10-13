# Tareas 001 — Modo Ciudad Bolivar

> Plan: `specs/001-modo-ciudad-bolivar/plan.md` · Una tarea por sesion de
> implementador · test primero · marcar `[x]` al terminar · rama `expofaja-e1`.
> Firmas, claves y constantes: plan §3. Si una tarea necesita algo que no esta
> en el plan, se para y se pregunta (no se inventa).

## Reglas de trabajo en paralelo

- Cada archivo tiene un solo dueno (tabla de abajo). Nadie edita, formatea ni
  "arregla" un archivo de otro paquete: se avisa al coordinador.
- A, B y C pueden empezar a escribir codigo en cuanto exista su firma en el
  plan; dan la tarea por hecha cuando se cumplen sus dependencias.
- Orden dentro de cada paquete: primero las funciones exportadas del contrato
  (con su cuerpo real), para que los otros paquetes compilen cuanto antes.
- `npm test` (no importa `map.js`, `ui.js` ni `main.js`) debe quedar verde en
  cada tarea. `npm run build` verde completo es criterio de I1; antes, una
  tarea puede cerrar con el build rojo **solo** por exports de otro paquete
  aun no entregados, listandolos.
- **Vueltas de correccion:** cada tarea lleva `vueltas: n/2`. El revisor
  devuelve `VEREDICTO: APROBADO` o `CAMBIOS NECESARIOS`; tras la 2.ª vuelta
  fallida la tarea se para y sube al coordinador / Luis.

| Dueno | Archivos |
|---|---|
| T1 (en curso, otro agente) | `src/data.js` (funciones de proximidad), `src/config.js` (constantes CB + `ID_SEDE_EXPOFAJA`), `scripts/ciudad-bolivar-to-geojson.mjs`, `package.json`, `test/ciudadBolivar.test.mjs`, `docs/DATA_SOURCES.md` §17, `public/data/{ciudad-bolivar-osm.geojson, iniciativas-ccieb.geojson, ciudad-bolivar-resumen.json}` |
| P0 (T2, T3) | `src/i18n/*`, `test/i18n.test.mjs` · `src/config.js` (tras T1), `test/rutas-datos.test.mjs`, `scripts/verificar-modulos.mjs` |
| A | `src/map.js`, `src/iconos.js`, `src/controladorRender.js`, `src/ui/fichaCiudad.js`, `test/iconos.test.mjs`, `test/controladorRender.test.mjs`; tras T3, `src/config.js` solo para valores medidos (`CAMARA_CIUDAD_BOLIVAR`, `ZOOM_CIUDAD`, `COLOR_ANILLO`) |
| B | `src/ui.js`, `src/ui/modoCiudadBolivar.js`, `src/style.css`; tras T2, `src/i18n/es.json` y `en.json` (claves nuevas que pida A o C, tambien) |
| C | `src/main.js`, `src/modos.js`, `src/api.js`, `src/data.js` (tras T1), `test/modos.test.mjs`, `test/data.test.mjs`, `vercel.json`, `docs/DECISIONS.md`, `docs/DATA_SOURCES.md` §16 (tras T1), `LICENSE-DATA`, `docs/ARCHITECTURE.md`, `docs/capturas/e1-antes-*` |
| I1/I2 | `docs/capturas/e1-despues-*`, `MEMORY.md`, `specs/README.md`, `specs/001-modo-ciudad-bolivar/spec.md` (estado) |

## T1 — en curso (no reasignar)

- [x] T1 · Datos y calculo de Ciudad Bolivar: `distanciaMinimaKm`, `camposMasCercanos`, `contarPorAnillo`, `circuloGeodesico` (+ export `haversineKm`); constantes `RUTAS_DATOS.ciudadBolivar`, `RUTAS_DATOS.iniciativasCcieb`, `CENTRO_CIUDAD_BOLIVAR`, `CIUDAD_BOLIVAR_CAJA`, `ANILLOS_KM`, `CLASES_CIUDAD`, `ID_SEDE_EXPOFAJA`; script + `npm run data:ciudad-bolivar`; 3 archivos de `public/data/`; DATA_SOURCES §17 · archivos: ver tabla · RF: 8, 9, 12, 14 · test: `test/ciudadBolivar.test.mjs` (fixtures 0/10/45/63 +-1, 5 cercanos +-1 km, circulo +-0,5 %, sede a <300 m, procedencia; sin conteos OSM) · hecho cuando: lo cierra su agente; avisa al coordinador (desbloquea T3 y C1)

## P0 — tareas previas comunes (fijan firmas; A, B y C dependen de la firma, no del cuerpo)

- [x] T2 · `t(clave, params)` con interpolacion y las 39 claves de plan §3.5 · archivos: `src/i18n/interpolar.js` (nuevo), `src/i18n/index.js`, `src/i18n/es.json`, `src/i18n/en.json`, `test/i18n.test.mjs` · RF: 7, 15, 16, 21 · test: `test/i18n.test.mjs` — `interpolar("{km} km · {n} campos", {km: 100, n: 10})` = "100 km · 10 campos"; marcador sin valor queda visible; sin params devuelve el texto intacto; marcador repetido; **mismos `{marcadores}` en ES y EN para cada clave**; la regex de "clave usada existe" acepta `t("x", {...})` (`/\bt\(\s*["'`]([\w.]+)["'`]\s*[,)]/g`) · depende de: nada (puede empezar ya, en paralelo con T1) · hecho cuando: `npm test` verde, `t()` sin params identico al actual, los `.replace("{n}")` existentes intactos · vueltas: 0/2
- [x] T3 · Constantes de modos y gate de marcas · archivos: `src/config.js`, `test/rutas-datos.test.mjs`, `scripts/verificar-modulos.mjs` · RF: 1-4, 11, 16, 17, RNF-3 · test: `test/rutas-datos.test.mjs` (cada `MARCAS_MODO` existe en `public/`); `npm run verificar:modulos` con la regla nueva (`/expofaja/marcas/` solo en `config.js`; `MARCAS_MODO` solo importado por `src/ui/modoCiudadBolivar.js`), comprobando que falla si se mete la cadena en `map.js` y revirtiendo · depende de: T1 cerrado (comparte `config.js`) · hecho cuando: constantes exactas de plan §3.6 con JSDoc y `// SIN VERIFICAR` donde toca; URL de `FUENTES.ccieb` comprobada con `curl.exe -I`; `npm test` verde · vueltas: 0/2

## Paquete A — mapa (map.js, iconos.js, controladorRender.js, ui/fichaCiudad.js)

- [x] A1 · `iconoCiudad(clave, color)`: 8 clases + `iniciativa`, trazo `#0b0f14` sobre disco claro · archivos: `src/iconos.js`, `test/iconos.test.mjs` (nuevo) · RF: 11, 14, RNF-3 · test: cada clave de `CLASES_CIUDAD` y `iniciativa` da un data URI distinto; contraste WCAG entre `COLOR_CIUDAD` y el trazo >= 4,5:1 (calculado en el test); `icono()` e `iconoAproximado()` siguen con trazo `#ffffff`; ningun hex de marca ExpoFaja/CCIEB (02-IDENTIDAD §1-2, sin el gris) en `src/iconos.js`, `src/config.js` ni `src/map.js` · depende de: T3 para cerrar (importa `COLOR_CIUDAD`) · hecho cuando: test verde; glifos reconocibles a 34 px (captura del sprite en el PR) · vueltas: 0/2
- [x] A2 · Capas `ciudadBolivar` e `iniciativasCcieb` y su seleccion · archivos: `src/map.js` · RF: 11, 12, 13, 14 · test: `npm test` + `npm run build` (bundle con Cesium); revision: nacen apagadas (`nuevaCapa(nombre, false)`), `indexar`, `properties.capa`, `tipo` de la fuente intacto, puente como linea de 3 px, `ZOOM_CIUDAD` (hitos siempre, resto por distancia, rotulo solo con nombre), `pixelOffset` para iniciativas que comparten coordenada, `conectarSeleccion` abre ficha por `props.capa`; JSDoc de `alternarContexto` y `volarAActivo` ampliado · depende de: T3, A1 · hecho cuando: firmas de plan §3.3 exportadas con JSDoc; verificacion visual en I1 · vueltas: 0/2
- [x] A3 · Camara del modo, anillos y vuelos · archivos: `src/map.js`, `src/controladorRender.js`, `test/controladorRender.test.mjs` · RF: 4, 5, 7 · test: `test/controladorRender.test.mjs` — `sostenerHastaListo` mantiene el modo continuo hasta que `listo()` es true en un `postRender` simulado, libera al cancelar, reemplaza por id y no toca otros holds; build · implementacion: `vistaCiudadBolivar()` segun plan §3.8 (esfera + `frustum.fovy`/`aspectRatio` + `margen`, inclinaciones de `CAMARA`, movimiento reducido sin vuelo), `volarCancelable` extraido de `iniciarVistaConVuelo`, `volarAFaja()` respeta movimiento reducido, `dibujarAnillos`/`quitarAnillos` con `sostenerHastaListo("anillos", ...)` y rotulo en `coordenadas[0]` · depende de: T3 · hecho cuando: firmas exportadas; `margen` provisional; medicion final en I1 · vueltas: 0/2
- [x] A4 · Lineas de proximidad · archivos: `src/map.js` · RF: 9, 10 · test: build; revision: capa `proximidad`, discontinuas `COLOR_CIUDAD`, rotulo en el punto medio, `sostenerHastaListo("lineas-proximidad", ...)`, `ocultar` libera hold y pide render puntual, mostrar de nuevo reemplaza · depende de: A3 · hecho cuando: firmas de §3.3 exportadas; verificacion visual en I1 · vueltas: 0/2
- [x] A5 · Ficha de servicio e iniciativa · archivos: `src/ui/fichaCiudad.js` (nuevo) · RF: 9, 13, 15, 21 · test: `test/i18n.test.mjs` (claves usadas existen); `npm run verificar:modulos` (sin `cesium`, sin `fetch`) · contenido: servicio -> tipo `ciudad.clase.<clase>`, titulo = nombre o `ciudad.sinNombre`, enlace `ciudad.verEnOsm` y `ciudad.agregarOsm` a `osm_url` (por `enlaceSeguro`), aviso `ciudad.centroAproximado` si `geom_precision` lo dice, y si llegan `extra.cercanos`: lista `modo.cercanosSede` con `modo.distancia` + `ciudad.lineaRecta` y `modo.metodo`; iniciativa -> tipo `ciudad.iniciativa`, aviso `ciudad.contenidoOrganizador`, `ciudad.fecha`, resumen tal cual (no se traduce), enlace `modo.notaPrensa`. Todo escapado con `util.esc` · depende de: T2 · hecho cuando: firmas de §3.4 exportadas con JSDoc · vueltas: 0/2

## Paquete B — interfaz (ui.js, ui/modoCiudadBolivar.js, style.css, i18n tras T2)

- [x] B1 · Cabecera, panel y acceso del modo + ranuras en `ui.js` · archivos: `src/ui/modoCiudadBolivar.js` (nuevo), `src/ui.js` (solo `#ranura-modo`, `#ranura-panel-modo` y la llamada a `repintarModoCiudadBolivar()` al final de `montarUI`), `src/style.css` si hace falta · RF: 5 (boton), 6, 15, 16, 21 · test: `test/i18n.test.mjs`; `npm run verificar:modulos` (sin `fetch`/`cesium`; `MARCAS_MODO` solo aqui) · contenido: plan §3.4 (cabecera con titulo, "En alianza con", logos de `MARCAS_MODO` con alt `modo.altCcieb`/`modo.altExpofaja`, boton `modo.verFaja`; panel `modo.panelTitulo` con frase principal, anillos `modo.anillo`, cercanos, `modo.servicios` por clase, `modo.impulsaCcieb` con las 6 iniciativas, fecha, `modo.notaPrensa` y `tabla.verEnMapa` si `enMapa`, `ciudad.contenidoOrganizador`; estados null/false; acceso `modo.verCiudad`). Sin colores de marca en clases ni estilos · depende de: T2, T3 · hecho cuando: firmas exportadas; restricciones de tamano de §3.4 respetadas en I1 · vueltas: 0/2
- [x] B2 · Grupo de capas Ciudad Bolivar, `fijarCapas`, buscador e `irAActivo` exportado · archivos: `src/ui.js` · RF: 11, 17, 18, 20 · test: `npm test`; build · contenido: plan §3.9 "Capa en el panel" y "Buscador"; `fijarCapas(cambios)` devuelve el estado previo solo de ids reconocidos; `irAActivo({capa, ids, sector?})` deduce el sector si falta y enciende `ciudadBolivar`/`iniciativas` si estaban apagadas; devuelve boolean; `colorDeActivo` con `COLOR_CIUDAD` para esas capas · depende de: T2, T3 · hecho cuando: exports de §3.4 con JSDoc; `ui.js` crece solo en pegamento (informar lineas netas) · vueltas: 0/2
- [x] B3 · Ficha con `extra`, `soltarVistas` y accion de "Volar a la Faja" · archivos: `src/ui.js` · RF: 5, 9, 13 · test: `npm test`; build · contenido: `mostrarPanelActivo(activo, extra = {})` guarda `extra` para repintar al cambiar de idioma; `contenidoPanel` delega en `partesFichaCiudad` (A5) si `esFichaCiudad`; `soltarVistas()` segun §3.4 (cierra sin historial y pone `vistaApilada = null`); `fijarAccionVolarFaja(accion)` cablea `#btn-faja` y `#btn-faja-movil` (por defecto `volarAFaja`) · depende de: B2 (mismo archivo), A5 (firma) · hecho cuando: exports de §3.4; el historial de vistas existente sigue igual (cerrar con X, Esc y atras en la vista nacional) · vueltas: 0/2

## Paquete C — orquestacion, enlaces y docs (main.js, modos.js, api.js, data.js, vercel.json, docs)

- [x] C1 · Calculo y datos nuevos · archivos: `src/data.js`, `src/api.js`, `test/data.test.mjs` · RF: 9, 12, 14, 15, 20 · test: `test/data.test.mjs` — `verticeMasCercano` devuelve un vertice real de la geometria y su km coincide con `distanciaMinimaKm` (Point, Polygon, MultiPolygon; `null` sin geometria); `contarPorClase` con 0 en clases vacias; `iniciativasSinGeometria` sobre la semilla real (leida con `fs`): 6 features, todas con `fuente`, 2 con `en_mapa: true`, `geometry: null` · depende de: T1 cerrado · hecho cuando: firmas de §3.2; contrato de `api.js` intacto (todo FeatureCollection); D10 aplicada salvo respuesta de Luis a la Duda 3 · vueltas: 0/2
- [x] C2 · `src/modos.js` puro · archivos: `src/modos.js` (nuevo), `test/modos.test.mjs` (nuevo) · RF: 1, 2, 3, 11, 17, 18 · test: `resolverModo` (`ciudadBolivar` // RF-1; ausente -> `MODO_INICIAL` // RF-2; `nacional` // RF-3; desconocido -> inicial); `leerEnlace` (vacios -> null); `urlDeModo("/", "nacional")` = `/?modo=nacional`; `buscarActivo` con colecciones de fixture (encuentra por orden, ignora `null`/`false`, id inexistente -> `null` // RF-18); config: `MODOS` = `["nacional", "ciudadBolivar"]`, `MODO_INICIAL` en `MODOS`, `capasEncendidas` del modo = `upstream`, `ciudadBolivar`, `iniciativas` (// RF-11), cada `camara` en `["faja", "ciudadBolivar"]`, `vueltaAtras` en `MODOS` o null · depende de: T3 · hecho cuando: `npm test` verde; sin `window`/`document`/`history` en `modos.js` · vueltas: 0/2
- [x] C3 · `main.js`: capas nuevas, datos del modo, seleccion y proximidad, idioma · archivos: `src/main.js` · RF: 7, 8, 9, 10, 15, 20 · test: build; revision contra plan §3.9 (tuplas en `cargarCapas`, `colecciones`, adaptador, sede desde la capa y nunca escrita a mano, `alSeleccionar` con cercanos/lineas, re-etiquetado al cambiar de idioma) · depende de: C1, firmas de A2-A4 y B1-B3 · hecho cuando: ninguna logica de dominio propia (solo llamadas a `data.js`); verificacion en I1 · vueltas: 0/2
- [x] C4 · `main.js`: modos, historial y enlaces · archivos: `src/main.js` · RF: 1-6, 11, 17, 18 · test: `test/modos.test.mjs` (parte pura); revision contra plan §3.7 (trampolin, `irAModo`, `popstate` idempotente sin escrituras, `aplicarModo` generico con tablas `CAMARAS`/`INTERFACES` y sin `if (modo === ...)`, `?capa=` tras el modo, `?vuelo=` tras `cargarCapas`, `registrarAccesoCiudadBolivar` y `fijarAccionVolarFaja` cableados) · depende de: C2, C3 · hecho cuando: verificacion en I1 · vueltas: 0/2
- [x] C5 · Redireccion temporal · archivos: `vercel.json` · RF: 19 · test: `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`; en la vista previa `curl.exe -I <preview>/expofaja` -> 307 y `Location: /?modo=ciudadBolivar` (y `/expofaja/`, ver plan §5) · depende de: nada · hecho cuando: JSON estricto, sin comentarios, `permanent: false` · vueltas: 0/2
- [x] C6 · Documentacion y capturas "antes" · archivos: `docs/DECISIONS.md` (ADR-020), `docs/DATA_SOURCES.md` §16, `LICENSE-DATA`, `docs/ARCHITECTURE.md`, `docs/capturas/e1-antes-escritorio.png`, `docs/capturas/e1-antes-movil.png` · RF: — (constitucion 1 y 12) · test: revision; enlaces relativos validos; capturas de produccion a 1440x900 y 390x844 con Chrome DevTools MCP · depende de: T1 cerrado (§16 va antes de su §17) · hecho cuando: ADR-020 copiado con el estado de plan §5; §16 y aviso de `LICENSE-DATA` como plan §5 · vueltas: 0/2 *(capturas "antes" pendientes: sin Chrome DevTools MCP en la sesion)*
  - Nota 2026-10-13: capturas `e1-antes-*` tomadas de produccion por CDP (Edge headless) en I1.

## Integracion y cierre

- [x] I1 · Integracion y verificacion completa · archivos: `docs/capturas/e1-despues-escritorio.png`, `e1-despues-movil.png`, `e1-ficha-sede-movil.png`; `src/config.js` solo `margen`/`ZOOM_CIUDAD` medidos (dueno A) · RF: todos · test: `npm test`, `npm run data:validate`, `npm run build` (bundle con Cesium); RNF-1 (tamano y features de los 2 GeoJSON nuevos), RNF-2 (gzip del JS propio); Chrome DevTools MCP a 1440x900 y 390x844 con consola sin errores: `/` y `?modo=ciudadBolivar` (anillo 150 / 100 entero y sin tapar: RF-4), `?modo=nacional`, `?modo=xyz`, `?vuelo=OSM-R7948635` (ficha, 5 cercanos, lineas), `?vuelo=NOEXISTE`, `?capa=centrales`, `?capa=noexiste`, "Ver toda la Faja" y `history.back()` con y sin ficha abierta, "Ver Ciudad Bolivar", "Volar a la Faja" desde el modo, cerrar ficha (lineas fuera), un servicio sin nombre (RF-13), idioma EN (RF-21), emulacion `prefers-reduced-motion` (sin vuelo), bloqueo de `ciudad-bolivar-osm.geojson` (aviso; anillos y campos siguen: RF-20), frase renderizada = RNF-5 · depende de: todo lo anterior · hecho cuando: todo verde, capturas guardadas, medidas anotadas para el PR · vueltas: 0/2
- [x] I2 · Cierre · archivos: `MEMORY.md`, `specs/README.md`, `specs/001-modo-ciudad-bolivar/spec.md` (estado) · test: `MEMORY.md` <= 50 lineas y sin duplicados · hecho cuando: estado actualizado, texto del PR con medidas de I1, checklist de Luis listo; PR contra `main` abierto **sin** merge · vueltas: 0/2

## Verificacion de Luis (al final, telefono real, datos moviles, DevTools cerrado)

- [ ] La portada abre en el modo: la ciudad en el centro, la Faja hacia el horizonte, anillos legibles.
- [ ] "Ver toda la Faja", "Volar a la Faja" y el gesto atras (despues de tocar el mapa) llevan a la vista nacional; "Ver Ciudad Bolivar" vuelve.
- [ ] Ficha del Museo Soto: 5 campos con km y lineas discontinuas; al cerrarla, las lineas desaparecen.
- [ ] Sede, aeropuerto y puente donde deben (comparar con OSM o Google Maps).
- [ ] Logos nitidos sobre el tema oscuro; cabecera sin tapar el mapa.
- [ ] Ingles: interfaz traducida; nombres propios y titulos de iniciativas intactos.
- [ ] `<preview>/expofaja` lleva al modo; tras el merge, el QR de `docs/expofaja/qr/` hace lo mismo en dos telefonos.

Recuento: T1 en curso · P0: 2 tareas · A: 5 · B: 3 · C: 6 · integracion: 2.

## Resultado de I1 (coordinador, 2026-10-13)

- `npm test` 117/117 + `verificar:modulos`; `npm run build` verde; JS propio 34 kB gzip (RNF-2: < 150).
- RNF-1: `ciudad-bolivar-osm.geojson` 56,0 KB / 95 features; `iniciativas-ccieb.geojson` 1,7 KB / 2.
- Navegador headless (Edge + CDP, emulacion movil real): `?modo=ciudadBolivar`, "Ver toda la Faja" -> `?modo=nacional`, `history.back()` vuelve al modo, `/` abre en el modo, `?modo=nacional`, parametros desconocidos ignorados, `?vuelo=OSM-R7948635` abre la ficha con los 5 campos y las lineas; sin desborde horizontal a 390 px.
- Camara medida en captura: `margen` 1.3 (anillo de 150 km entre los paneles a 1440x900), `margenVertical` 1.8 y `desplazamientoNorteVertical` 0.5 (anillo de 100 km entero bajo el panel a 390x844).
- Revisor: CAMBIOS NECESARIOS -> aplicados: trampolin del historial no se duplica al recargar (main.js), tope de 10 s en `sostenerHastaListo`, `Object.hasOwn` en `fijarCapas`, km con un decimal en la ficha.
- Capturas: `docs/capturas/e1-antes-*`, `e1-despues-*`, `e1-ficha-sede-movil.png`.
