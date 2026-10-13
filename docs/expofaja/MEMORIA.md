# Memoria de ExpoFaja 2026 x Orinoco Digital · Record of ExpoFaja 2026 x Orinoco Digital

> Registro de lo que se pidió, se construyó y se decidió, en español e inglés
> con el mismo contenido. / Record of what was asked, built and decided, in
> Spanish and English with the same content.
>
> Fecha del registro / Date: 2026-10-13 (cierre de E3 y apertura de E4.1 /
> E3 closed, E4.1 opened). Cifras medidas por el equipo, con la fuente
> indicada; ninguna cifra de este documento viene de la CCIEB salvo donde se
> atribuye. / Figures measured by the team, source stated; none comes from the
> CCIEB unless attributed.

- [Versión en español](#versión-en-español)
- [English version](#english-version)

---

## Versión en español

### 1. Qué se pidió

El 12 de octubre de 2026 Luis Carlos Vasquez presentó Orinoco Digital, un
mapa 3D de código abierto de la industria petrolera y gasífera de Venezuela, en
un encuentro previo de la ExpoFaja, en la sede de la Cámara de Comercio e
Industrias del Estado Bolívar (CCIEB). Propuso trabajar en conjunto con la
Expo y la Cámara y planteó el eje del trabajo: que Ciudad Bolívar sea el centro
del mapa, "para poder decir en el mapa que Ciudad Bolívar existe", con lo que la
Cámara y la Expo quieren impulsar encima. La CCIEB autorizó ese mismo día el uso
de los recursos del evento y de la Cámara (`AUTORIZACIONES.md`; quién y por qué
medio queda pendiente de anotar; la evidencia no se versiona).

Petición posterior para esta etapa: "E4: memoria del evento ... que quede la
información de lo que se hizo tanto en inglés como en español". Este documento
y el modo "después" del micrositio la cumplen.

Reglas del trabajo (`00-CONTEXTO.md` §6): neutralidad (el programa se reproduce
textual y atribuido a la CCIEB; aviso fijo de independencia), fuente o nada,
marcas de terceros fuera de las licencias del proyecto, sin dependencias nuevas,
interfaz por `t()` en ES/EN y contenido del evento en español con `lang="es"`.

### 2. Qué se construyó, por etapa

| Etapa | PR | Qué entregó |
|---|---|---|
| Kit + arnés | #5 | Carpeta `docs/expofaja/` (contexto, datos del evento, identidad visual, mandatos E0–E4, semillas JSON) y el arnés de Claude Code del repo (reglas por zona, subagentes, skills) |
| E0 | (en #5) | Gobernanza y permisos: registro de autorizaciones de la CCIEB (`AUTORIZACIONES.md`) |
| E1 | #6 | Modo Ciudad Bolívar: el mapa abre en la ciudad mirando hacia la Faja; anillos geodésicos de 50/100/150/200 km con conteo de campos; capa permanente de servicios de OpenStreetMap; iniciativas de la CCIEB atribuidas a su prensa; proximidad medida a los campos más cercanos de la sede; cabecera con co-marca y botón "Ver toda la Faja"; enlaces `?modo=`, `?capa=`, `?vuelo=` e historial |
| E2 | #7 | Micrositio `/expofaja` (segunda entrada de Vite, sin Cesium): cabecera, Ahora/Siguiente con reloj del evento (UTC-04:00), agenda por días con archivo `.ics` generado en el navegador, ponentes, "¿Por qué Ciudad Bolívar?" (afirmaciones del organizador y datos abiertos en bloques separados), captura del mapa, aliados, participa, noticias y pie con fuentes y licencias; SEO e imagen OG |
| E3 | #8 | Embed para el WordPress de la CCIEB por iframe de `/expofaja/?embed=1` (sin plugin ni código de Orinoco dentro de su sitio), cabecera `frame-ancestors` solo para ese origen, página de prueba y ADR-016 aceptado |
| E4.1 | este PR | Memoria del evento: a partir del 18/10 el micrositio cambia solo de modo por la fecha (`estadoEvento`), sin despliegue; esta memoria bilingüe |

Archivos y tamaño de los PR (GitHub): #5 99 archivos (+4.447/−137), #6 45
(+6.218/−98), #7 31 (+6.288/−13), #8 3 (+69/−4).

### 3. Cifras medidas

| Cifra | Valor | Origen |
|---|---|---|
| Pruebas automáticas | 117 al cerrar E1; 165 al cerrar E2 y E3; 169 con E4.1 (más `verificar:modulos`) | `specs/001-modo-ciudad-bolivar/tasks.md`, `specs/002-micrositio-expofaja/tasks.md` (Resultado de I1) y `npm test` |
| Campos petroleros por distancia en línea recta a Ciudad Bolívar | 0 a ≤50 km · 10 a ≤100 km · 45 a ≤150 km · **63 de 105 a ≤200 km** | `public/data/ciudad-bolivar-resumen.json` (generado 2026-10-13), campos de Global Energy Monitor |
| Servicios en la capa de la ciudad (OpenStreetMap) | **95**: salud 36, hoteles 32, educación superior 12, banca 11, sede del evento 1, aeropuerto 1, puente 1, transporte 1 | `public/data/ciudad-bolivar-osm.geojson` |
| Campos más cercanos a la sede | 5 (ficha de la sede), "línea recta, no ruta vial" | `ciudad-bolivar-resumen.json` |
| JS propio del mapa | 34 kB gzip (límite 150) al cerrar E1 | `specs/001-modo-ciudad-bolivar/tasks.md` |
| JS del micrositio | 20,7 kB gzip (meta 30), sin referencia a Cesium en `dist/expofaja/index.html`; CSS 8,5 kB | `specs/002-micrositio-expofaja/tasks.md` |
| Imágenes del micrositio | `og.png` 95 KB; `mapa.webp` 111,7 KB (excepción explícita, límite 120 KB); fotos de ponentes ≤ 4,1 KB | `specs/002-micrositio-expofaja/tasks.md` |
| Datos del evento | 13 ponentes en el programa oficial; 3 días (15, 16 y 17 de octubre de 2026) | `docs/expofaja/00-CONTEXTO.md`, `public/data/expofaja/` |

Cada medida tiene tolerancia declarada en los tests (conteos ±1, distancias ±1
km). No hay cifras de asistentes, expositores ni ruedas de negocio: la CCIEB no
las ha publicado y no se inventan.

### 4. Decisiones

Todas en `docs/DECISIONS.md`, **ADR-020 "Ciudad Bolívar como eje del mapa y
micrositio ExpoFaja 2026"** (diez piezas):

1. Capa permanente `ciudadBolivar` desde OpenStreetMap, con script
   reproducible; las iniciativas de la CCIEB siempre atribuidas.
2. Proximidad medida, no declarada (haversine sobre vértices), solo a campos
   con geometría con fuente, no a bloques.
3. Micrositio como segunda entrada de Vite, sin Cesium.
4. Datos del evento estáticos y versionados; editar la agenda = PR.
5. Enlaces mínimos en el mapa (`?modo=`, `?capa=`, `?vuelo=`).
6. Embed por iframe, sin plugin; descartados widget JS y HTML subido.
7. Marcas y fotos de terceros fuera de Apache-2.0 y CC BY 4.0, con `AVISO.md`.
8. Neutralidad por diseño: textual, atribuido, sin destacar ponentes.
9. Caducidad: tras el 17/10 el micrositio pasa a memoria del evento (E4.1).
10. Modo Ciudad Bolívar como portada (`MODO_INICIAL`, reversible en una línea).

Estado en `DECISIONS.md`: piezas 1, 2, 5, 7 y 10 aceptadas el 12/10; las demás
(E2–E4) figuran como propuesta. ADR-016 (pruebas con `node:test`, sin
dependencias) quedó aceptado en #8.

Decisiones de E4.1: el contenido del evento sigue en español con `lang="es"`; la
sección "Lo que se hizo" solo se muestra en modo "después" (antes y durante el
evento la página es del evento, no de quien la construyó); sin cifras de
resumen ni galería hasta que existan datos atribuibles y fotos autorizadas.

### 5. Qué quedó pendiente

- E4.2 noticias de la CCIEB automáticas (script + Action diaria con PR).
- E4.3 mapatón "Ciudad Bolívar existe" (la CCIEB convoca; medir antes y después
  con `npm run data:ciudad-bolivar`; añadir la sede de la CCIEB a OSM).
- E4.4 directorio de afiliados con consentimiento (requiere ADR-021 antes de
  escribir código).
- E4.5 medición de visitas (requiere ADR por ser script de terceros) y E4.5-bis
  revisar la portada (`MODO_INICIAL`).
- E4.6 generalizar a `/eventos/<slug>/` si la CCIEB repite.
- E4.7 contenido de difusión del caso (sin código).
- Resumen del evento con cifras, solo si la CCIEB las publica; galería, solo
  con fotos autorizadas en `AUTORIZACIONES.md`.
- Gate en teléfono real (datos móviles, DevTools cerrado) de E1–E4.1;
  Lighthouse móvil; `.ics` en Google Calendar y en el teléfono; QR impreso.
- Anotar quién y por qué medio autorizó la CCIEB (`AUTORIZACIONES.md`).

### 6. Fuentes y licencias

- Código: Apache-2.0 (`LICENSE`). Datos originales: CC BY 4.0 (`LICENSE-DATA`).
- Mapa y servicios: © OpenStreetMap contributors (ODbL).
- Campos petroleros: Global Energy Monitor (CC BY 4.0).
- Terreno 3D: Cesium ion / Cesium World Terrain.
- Contenido del evento (programa, perfiles, cifras del organizador) y marcas:
  CCIEB, usados con su autorización; no están cubiertos por Apache-2.0 ni CC BY
  4.0. Orinoco Digital es un proyecto independiente: no organiza ni patrocina el
  evento ni respalda las posiciones de los ponentes.
- Procedencia detallada de cada dato: `docs/DATA_SOURCES.md` (secciones 16 y 17).

---

## English version

### 1. What was asked

On 12 October 2026 Luis Carlos Vasquez presented Orinoco Digital, an open-source
3D map of Venezuela's oil and gas industry, at a pre-event meeting of ExpoFaja
held at the headquarters of the Chamber of Commerce and Industries of Bolívar
State (CCIEB). He proposed working together with the Expo and the Chamber and
set the axis of the work: make Ciudad Bolívar the center of the map, "so we can
say on the map that Ciudad Bolívar exists", with what the Chamber and the Expo
want to promote layered on top. The CCIEB authorized the use of the event's and
the Chamber's resources that same day (`AUTORIZACIONES.md`; who authorized and
by what means is still to be recorded; the evidence is not versioned).

Later request for this stage: "E4: event record ... I want the information about
what was done to remain, both in English and in Spanish." This document and the
microsite's "after" mode fulfil it.

Working rules (`00-CONTEXTO.md` §6): neutrality (the program is reproduced
verbatim and attributed to the CCIEB; fixed independence notice), source or
nothing, third-party marks outside the project licenses, no new dependencies,
interface through `t()` in ES/EN and event content in Spanish with `lang="es"`.

### 2. What was built, by stage

| Stage | PR | What it delivered |
|---|---|---|
| Kit + harness | #5 | The `docs/expofaja/` folder (context, event data, visual identity, E0–E4 mandates, JSON seeds) and the repo's Claude Code harness (per-zone rules, subagents, skills) |
| E0 | (in #5) | Governance and permissions: record of the CCIEB's authorizations (`AUTORIZACIONES.md`) |
| E1 | #6 | Ciudad Bolívar mode: the map opens on the city looking toward the Faja; geodesic rings at 50/100/150/200 km with field counts; permanent OpenStreetMap services layer; CCIEB initiatives attributed to its press; measured proximity to the fields closest to the venue; header with co-branding and a "See the whole Faja" button; `?modo=`, `?capa=`, `?vuelo=` links and history |
| E2 | #7 | `/expofaja` microsite (second Vite entry, no Cesium): header, Now/Next with event clock (UTC-04:00), schedule by day with an `.ics` file generated in the browser, speakers, "Why Ciudad Bolívar?" (organizer claims and open data in separate blocks), map capture, partners, participate, news and a footer with sources and licenses; SEO and OG image |
| E3 | #8 | Embed for the CCIEB's WordPress through an iframe of `/expofaja/?embed=1` (no plugin and no Orinoco code inside their site), `frame-ancestors` header for that origin only, test page, and ADR-016 accepted |
| E4.1 | this PR | Event record: from 18/10 the microsite changes mode by itself based on the date (`estadoEvento`), with no deployment; this bilingual record |

PR size (GitHub): #5 99 files (+4,447/−137), #6 45 (+6,218/−98), #7 31
(+6,288/−13), #8 3 (+69/−4).

### 3. Measured figures

| Figure | Value | Source |
|---|---|---|
| Automated tests | 117 at the close of E1; 165 at the close of E2 and E3; 169 with E4.1 (plus `verificar:modulos`) | `specs/001-modo-ciudad-bolivar/tasks.md`, `specs/002-micrositio-expofaja/tasks.md` (Resultado de I1) and `npm test` |
| Oil fields by straight-line distance to Ciudad Bolívar | 0 within ≤50 km · 10 within ≤100 km · 45 within ≤150 km · **63 of 105 within ≤200 km** | `public/data/ciudad-bolivar-resumen.json` (generated 2026-10-13), Global Energy Monitor fields |
| Services in the city layer (OpenStreetMap) | **95**: health 36, hotels 32, higher education 12, banking 11, event venue 1, airport 1, bridge 1, transport 1 | `public/data/ciudad-bolivar-osm.geojson` |
| Fields closest to the venue | 5 (venue card), "straight line, not road route" | `ciudad-bolivar-resumen.json` |
| Map's own JS | 34 kB gzip (limit 150) at the close of E1 | `specs/001-modo-ciudad-bolivar/tasks.md` |
| Microsite JS | 20.7 kB gzip (target 30), no Cesium reference in `dist/expofaja/index.html`; CSS 8.5 kB | `specs/002-micrositio-expofaja/tasks.md` |
| Microsite images | `og.png` 95 KB; `mapa.webp` 111.7 KB (explicit exception, limit 120 KB); speaker photos ≤ 4.1 KB | `specs/002-micrositio-expofaja/tasks.md` |
| Event data | 13 speakers in the official program; 3 days (15, 16 and 17 October 2026) | `docs/expofaja/00-CONTEXTO.md`, `public/data/expofaja/` |

Each measurement has a declared tolerance in the tests (counts ±1, distances ±1
km). There are no figures for attendees, exhibitors or business meetings: the
CCIEB has not published them and none are invented.

### 4. Decisions

All in `docs/DECISIONS.md`, **ADR-020 "Ciudad Bolívar as the map's axis and the
ExpoFaja 2026 microsite"** (ten pieces):

1. Permanent `ciudadBolivar` layer from OpenStreetMap, with a reproducible
   script; CCIEB initiatives always attributed.
2. Proximity measured, not declared (haversine over vertices), only to fields
   with sourced geometry, not to blocks.
3. Microsite as a second Vite entry, without Cesium.
4. Static, versioned event data; editing the schedule = a PR.
5. Minimal map links (`?modo=`, `?capa=`, `?vuelo=`).
6. Iframe embed, no plugin; JS widget and uploaded HTML discarded.
7. Third-party marks and photos outside Apache-2.0 and CC BY 4.0, with `AVISO.md`.
8. Neutrality by design: verbatim, attributed, no speaker highlighted.
9. Expiry: after 17/10 the microsite becomes the event record (E4.1).
10. Ciudad Bolívar mode as the landing view (`MODO_INICIAL`, reversible in one line).

Status in `DECISIONS.md`: pieces 1, 2, 5, 7 and 10 accepted on 12/10; the rest
(E2–E4) are listed as proposals. ADR-016 (tests with `node:test`, no
dependencies) was accepted in #8.

E4.1 decisions: event content stays in Spanish with `lang="es"`; the "What was
built" section is shown only in "after" mode (before and during the event the
page belongs to the event, not to those who built it); no summary figures and no
gallery until attributable data and authorized photos exist.

### 5. What is still pending

- E4.2 automatic CCIEB news (script + daily Action opening a PR).
- E4.3 "Ciudad Bolívar exists" mapathon (the CCIEB convenes; measure before and
  after with `npm run data:ciudad-bolivar`; add the CCIEB headquarters to OSM).
- E4.4 affiliates directory with consent (requires ADR-021 before any code).
- E4.5 visit measurement (requires an ADR because it is a third-party script)
  and E4.5-bis review the landing view (`MODO_INICIAL`).
- E4.6 generalize to `/eventos/<slug>/` if the CCIEB repeats the event.
- E4.7 outreach content about the case (no code).
- Event summary with figures, only if the CCIEB publishes them; gallery, only
  with photos authorized in `AUTORIZACIONES.md`.
- Real-phone gate (mobile data, DevTools closed) for E1–E4.1; mobile Lighthouse;
  `.ics` in Google Calendar and on the phone; printed QR.
- Record who authorized on behalf of the CCIEB and by what means
  (`AUTORIZACIONES.md`).

### 6. Sources and licenses

- Code: Apache-2.0 (`LICENSE`). Original data: CC BY 4.0 (`LICENSE-DATA`).
- Map and services: © OpenStreetMap contributors (ODbL).
- Oil fields: Global Energy Monitor (CC BY 4.0).
- 3D terrain: Cesium ion / Cesium World Terrain.
- Event content (program, profiles, organizer figures) and marks: CCIEB, used
  with its authorization; not covered by Apache-2.0 or CC BY 4.0. Orinoco
  Digital is an independent project: it neither organizes nor sponsors the event
  and does not endorse the speakers' positions.
- Detailed provenance of each dataset: `docs/DATA_SOURCES.md` (sections 16 and 17).
