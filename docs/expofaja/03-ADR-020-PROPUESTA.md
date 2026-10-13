# ADR-020 — Ciudad Bolivar como eje del mapa y micrositio ExpoFaja 2026

**Fecha:** 2026-10-12 · **Estado:** propuesta, pendiente de revision del autor.
Al aprobarse se copia a `docs/DECISIONS.md` como ADR-020.

**Contexto.** El 2026-10-12 Luis presento Orinoco Digital ante la CCIEB y
propuso colaborar con la ExpoFaja (15–17/10/2026). Su planteamiento: poner a
Ciudad Bolivar como eje del mapa, con lo que la Camara y la Expo quieren
impulsar encima. La CCIEB autorizo el uso de todos sus recursos el mismo dia
(`AUTORIZACIONES.md`). Hoy Ciudad Bolivar es una etiqueta de Natural Earth. El
evento empieza en tres dias. Hay que decidir donde vive lo permanente, donde
vive lo del evento y como llega a la web WordPress de la CCIEB sin romper las
reglas de `CLAUDE.md` (neutralidad, fuentes, sin dependencias, presupuesto de
rendimiento, estructura de modulos).

**Decision.** Diez piezas.

1. **Capa permanente `ciudadBolivar`, de OpenStreetMap.** Servicios que hacen
   de la ciudad una base de operaciones: sede del evento, aeropuerto, Puente
   Angostura, educacion superior, salud, hoteles y banca. Script
   reproducible `scripts/ciudad-bolivar-to-geojson.mjs` -> 
   `public/data/ciudad-bolivar-osm.geojson`. Entra por `api.js`
   (`getCiudadBolivar()`, FeatureCollection, contrato intacto) y se dibuja
   en `map.js`. Se enciende con el modo Ciudad Bolivar (pieza 10), desde el
   panel, el buscador o el deep-link. Los datos son neutrales y no dependen
   del evento: quedan cuando la ExpoFaja termine. Junto a ella,
   `iniciativas-ccieb.geojson`: lo que la CCIEB y la Expo anuncian, solo con
   ubicacion con fuente y siempre atribuido a su nota de prensa.
2. **Proximidad medida, no declarada.** `data.js` gana una funcion pura
   `distanciaMinimaKm(punto, feature)` (haversine sobre todos los vertices) y
   `camposMasCercanos(punto, campos, n)`. La ficha de la sede muestra los 5
   campos GEM mas cercanos con la etiqueta "linea recta, no ruta vial". No se
   mide a **bloques** de la Faja: no tienen geometria con fuente
   (`BLOQUES[].centro = null`).
3. **Segunda entrada de Vite: `expofaja/index.html`.** Micrositio de una
   pagina, **sin Cesium**. Modulos propios con las mismas restricciones
   duras que el mapa:
   - `src/expofaja/main.js` — orquesta, sin logica de dominio.
   - `src/expofaja/datos.js` — `fetch` y validacion de los JSON del evento;
     sin DOM. Contrato: devuelve objetos validados o lanza (no es
     FeatureCollection porque no es geodato; el contrato de `api.js` no se
     toca).
   - `src/expofaja/agenda.js` — funciones puras: `sesionActual`,
     `proximaSesion`, `generarIcs`. Testeables con `node:test`.
   - `src/expofaja/vista.js` — DOM; no hace `fetch`, no importa `cesium`.
   - `src/expofaja/expofaja.css` — Tailwind 4 + tokens `ef-*`/`cc-*`.
   - Reutiliza `src/i18n/` con claves `expofaja.*`.
   - `scripts/verificar-modulos.mjs` se amplia para fallar si algo de
   `src/expofaja/` importa `cesium` o si `vista.js` hace `fetch`.
4. **Datos del evento estaticos y versionados** en
   `public/data/expofaja/{evento,agenda,ponentes,aliados}.json`, copiados
   de `docs/expofaja/semillas/` y validados por un test. Editar la agenda =
   PR + merge = deploy. Sin Supabase (ADR-003/010 siguen vigentes).
5. **Deep-link minimo en el mapa:** `?modo=ciudadBolivar` entra al modo,
   `?capa=<id>` enciende una capa y `?vuelo=<id_activo>` abre su ficha y
   vuela a el. Se lee en `main.js`. Es
   un adelanto acotado de M2 (como ADR-018 adelanto M3/M4): no incluye
   breadcrumb ni historial completo. Necesario para el boton del micrositio y
   el QR.
6. **Embed para WordPress por iframe** de `/expofaja/?embed=1` (sin cabecera
   ni pie propios, altura enviada por `postMessage`). Cabecera en
   `vercel.json` solo para `/expofaja/(.*)`:
   `Content-Security-Policy: frame-ancestors 'self'
   https://camaradecomerciobolivar.org https://www.camaradecomerciobolivar.org`.
   Sin plugin ni JavaScript de Orinoco dentro del WordPress de la CCIEB.
7. **Marcas y fotos de terceros fuera de las licencias del proyecto.** Viven
   en `public/expofaja/marcas/` y `public/expofaja/ponentes/` con
   `AVISO.md`; nueva seccion 16 en `docs/DATA_SOURCES.md` ("Contenido del
   organizador ExpoFaja") y una linea en `LICENSE-DATA` que las excluye.
   Autorizadas por la CCIEB el 2026-10-12 (`AUTORIZACIONES.md`); procedencia
   de cada archivo en `semillas/marcas-manifiesto.json`.
8. **Neutralidad por diseno.** Agenda y perfiles textuales y atribuidos;
   aviso fijo de independencia; cifras del organizador en un bloque propio
   rotulado; nada de destacados editoriales de ponentes.
9. **Caducidad.** Despues del 2026-10-17 el micrositio pasa a modo "memoria
   del evento" (E4). La capa `ciudadBolivar`, el modo y el deep-link quedan.
10. **Modo Ciudad Bolivar: la ciudad como eje.** Un modo del mapa (primer
    modo real; adelanta la idea del *Sistema de Modos* de Notion, N1) que:
    centra la camara en Ciudad Bolivar (OSM rel `14534562`) mirando al norte
    hacia la Faja; dibuja anillos geodesicos de 50/100/150/200 km con el
    conteo de campos GEM dentro (0/10/45/63 de 105, medido el 2026-10-12);
    enciende servicios, iniciativas y campos; y muestra una cabecera DOM con
    la co-marca CCIEB + ExpoFaja y el boton "Ver toda la Faja".
    `MODO_INICIAL = "ciudadBolivar"` en `config.js`: la portada abre en la
    ciudad (decision de Luis). Una constante, reversible; se revisa en E4.
    La co-marca vive en la cabecera DOM, nunca en los marcadores, y la
    semantica de colores del mapa no cambia.

**Alternativas descartadas.**

| Alternativa | Por que no |
|---|---|
| Iframe del mapa 3D completo en el WordPress | Cesium dentro de un iframe en una pagina de Elementor ya pesada: lento en movil y Lighthouse aun peor. El embed es la version ligera con boton al mapa |
| Plugin de WordPress o widget JS inyectado en su sitio | Ejecuta codigo nuestro en el sitio de un aliado: superficie de seguridad y mantenimiento que no les corresponde |
| Exportar HTML estatico y subirlo a su WordPress | Duplica la fuente de verdad; cada cambio de agenda serian dos trabajos |
| Subdominio `expofaja.camaradecomerciobolivar.org` desde ya | Requiere su DNS y anadir el dominio al token de Cesium. Queda como opcion C de E3 |
| Agenda en Supabase | Static-first: 30 sesiones no justifican una base de datos |
| Mantener la portada en la vista nacional y dejar Ciudad Bolivar como capa apagada | Era la primera version de este ADR. Luis pidio la ciudad como eje: el modo lo cumple sin tocar los datos ni su semantica |
| Colorear la capa con la marca ExpoFaja | Choca con la semantica `gas`/`crudo` (ver `02-IDENTIDAD-VISUAL.md` §4) |
| React/Vue para el micrositio | ADR-004 |

**Consecuencias.**

- `vite.config.js` pasa a `build.rollupOptions.input` con dos entradas
  (`index.html`, `expofaja/index.html`). El `manualChunks` de Cesium no
  cambia; el micrositio no debe arrastrar ese chunk (se verifica en el build).
- `README.md` y `docs/ARCHITECTURE.md` documentan la segunda entrada.
- `docs/DATA_SOURCES.md` gana las secciones 16 (organizador) y 17 (capa
  Ciudad Bolivar, OSM).
- Presupuesto del micrositio: JS propio <= 30 KB gzip, cada imagen <= 60 KB,
  LCP <= 2,5 s en 4G simulada.

**Criterios de reconsideracion.**

- Si la CCIEB pide alojarlo en su dominio: opcion C de E3.
- Si la colaboracion continua con mas eventos: generalizar `/expofaja` a
  `/eventos/<slug>` en vez de copiar carpetas.
- Si el micrositio supera 30 KB gzip de JS propio: sobra codigo.
