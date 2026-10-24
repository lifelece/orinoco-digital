# 🛢️ Orinoco Digital

**Gemelo digital 3D open-source de la industria petrolera y gasifera de
Venezuela.** Faja Petrolifera del Orinoco, midstream y downstream, sobre terreno
topografico real, con datos publicos y trazables.

> Un ciudadano haciendo visible y transparente el mayor recurso de su pais.

[![Licencia codigo: Apache 2.0](https://img.shields.io/badge/codigo-Apache--2.0-blue.svg)](LICENSE)
[![Licencia datos: CC BY 4.0](https://img.shields.io/badge/datos-CC%20BY%204.0-green.svg)](LICENSE-DATA)

---

## Que es

Un mapa 3D navegable que muestra la cadena de valor completa de los
hidrocarburos venezolanos:

- **Upstream** — 105 campos de petroleo y gas (Global Energy Monitor). Campos,
  no pozos: el historial por pozo no es publico
- **Midstream** — 346 ductos y 24 parques de tanques (OpenStreetMap)
- **Downstream** — refinerias, petroquimicas, plantas de gas y puertos
  (OpenStreetMap)
- **Contexto** — limites, rios, toponimia, la Guayana Esequiba como zona en
  disputa y 43 centrales electricas (WRI)
- **Capa de IA** — modelo demostrativo, siempre etiquetado como tal
- **Investigacion** — operadoras, empresas mixtas, inversion y arbitrajes, en
  [docs/investigacion/](docs/investigacion/)

Todo dato visible es rastreable hasta una fuente publica documentada.

## Ciudad Bolivar y ExpoFaja 2026

El mapa abre en la vista nacional (desde el 2026-10-18; antes abria en
Ciudad Bolivar). El modo **Ciudad Bolivar** sigue disponible por enlace
(`/?modo=ciudadBolivar`): anillos de distancia a los campos petroleros (63 de 105 a menos de 200 km en linea recta),
95 servicios de OpenStreetMap y los 5 campos mas cercanos a la sede. Para la
ExpoFaja 2026 de la CCIEB hay ademas un micrositio de agenda (`/expofaja/`) y un
embed para su web. Que se pidio, que se construyo, cifras, decisiones y
pendientes, en espanol e ingles: [docs/expofaja/MEMORIA.md](docs/expofaja/MEMORIA.md).

## Que NO es

No es una fuente oficial, no es asesoria de inversion, no contiene informacion
propietaria ni filtrada, y la capa predictiva es una **demostracion**, no un
sistema real. Lee [DISCLAIMER.md](DISCLAIMER.md) — es corto y va en serio.

## Stack

| Capa | Tecnologia |
|---|---|
| 3D | CesiumJS 1.145 + Cesium ion Community |
| Build | Vite 7 + Vanilla JS ES6 |
| Estilos | Tailwind CSS 4 |
| Datos | GeoJSON versionado en Git |
| Backend *(opcional, Fase 4)* | Supabase PostgreSQL + PostGIS |
| Deploy | Vercel |

## Arrancar

Necesitas Node LTS y un token gratuito de [Cesium ion](https://ion.cesium.com/).

```bash
git clone https://github.com/lifelece/orinoco-digital.git
cd orinoco-digital
npm install

cp .env.example .env
# Abre .env y pega tu token en VITE_CESIUM_TOKEN

npm run dev
```

Para probarlo en el telefono (verificacion obligatoria del proyecto):

```bash
npm run dev:host
# Abre la URL de red que imprime, desde tu telefono en la misma WiFi
```

## Estructura

```
src/
  main.js     Punto de entrada
  config.js   Constantes y entorno
  map.js      CesiumJS (unico modulo que lo importa)
  api.js      Origen de datos -> siempre FeatureCollection
  data.js     Validacion y normalizacion
  ui.js       DOM e interfaz
  i18n/       Diccionarios ES/EN

public/data/  GeoJSON curado (fuente de verdad, versionada)
data/raw/     Descargas crudas (no versionadas)
scripts/      Conversores y descargadores
docs/         Arquitectura, decisiones, fuentes, fases
```

## Documentacion

| Archivo | Que contiene |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | **Empieza aqui.** Plan de trabajo por fases |
| [CLAUDE.md](CLAUDE.md) | Contexto para asistentes de codigo |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modulos y flujo de datos |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Registro de decisiones (ADR) |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | Procedencia, CRS y licencia de cada dataset |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | Estilo y nomenclatura |
| [docs/GLOSSARY.md](docs/GLOSSARY.md) | Terminos del dominio |
| [docs/PERFORMANCE_BUDGET.md](docs/PERFORMANCE_BUDGET.md) | Limites de rendimiento |
| [MODEL_CARD.md](MODEL_CARD.md) | Ficha del modelo demostrativo |

## Estado

**Al 2026-10-24.** Fases 0-3 y 5 cerradas; la 4 se salto
(ADR-010). En produccion: mapa 3D con 105 campos, 346 ductos, downstream y
centrales, modos, enlaces profundos (`?modo=&capa=&vuelo=`), carga diferida de
Cesium (ADR-022) y datos que se verifican cada semana. ExpoFaja 2026 (CCIEB)
cerrada: memoria en [docs/expofaja/MEMORIA.md](docs/expofaja/MEMORIA.md). En curso:
la Ruta de aprendizaje (recorridos guiados, glosario, laboratorio). Falta el tag
v1.0 y medir Lighthouse movil. Hoja de ruta: [docs/PLAN.md](docs/PLAN.md); estado
al dia: [MEMORY.md](MEMORY.md).

## Contribuir

Se aceptan aportes de codigo y, sobre todo, **correcciones de datos con
fuente**. Lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Atribuciones

Este proyecto usa datos de terceros con licencias propias:

- **Terreno 3D** — Cesium ion / Cesium World Terrain
- **Infraestructura** — © OpenStreetMap contributors (ODbL)
- **Geologia** — U.S. Geological Survey, Fact Sheet 2009-3028 (dominio publico)

La lista completa, con obligaciones de atribucion, esta en
[docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## Licencia

Codigo bajo [Apache-2.0](LICENSE). Datos originales bajo
[CC BY 4.0](LICENSE-DATA). Los datos de terceros conservan su licencia de origen.

---

Hecho en Venezuela por Luis Carlos Vasquez.

---

## English summary

**Orinoco Digital** is an open-source 3D digital twin of Venezuela's oil and gas
industry (Orinoco Belt, midstream, downstream) on real terrain, built only on
public, traceable data. It is not an official source or investment advice; read
[DISCLAIMER.md](DISCLAIMER.md).

- **Layers:** upstream (105 oil and gas fields, Global Energy Monitor), midstream
  (346 pipelines and 24 tank farms, OpenStreetMap), downstream (refineries,
  petrochemical and gas plants, terminals), context (borders, rivers, place
  names, 43 power plants from WRI) and a clearly labeled **DEMO** AI layer.
- **Stack:** Vanilla JS (ES modules), Vite 7, Tailwind CSS 4, CesiumJS with Cesium
  ion, static GeoJSON versioned in Git, deployed on Vercel. Tests with
  `node:test`, no extra dependencies. UI in Spanish and English.
- **Ciudad Bolivar and ExpoFaja 2026:** the map opens on the national view
  (since 2026-10-18; it used to open on Ciudad Bolivar). The Ciudad Bolivar mode
  stays available by link (`/?modo=ciudadBolivar`) with distance rings (63 of 105 fields within 200 km in
  a straight line), 95 OpenStreetMap services and the 5 fields closest to the
  venue. For the CCIEB's ExpoFaja 2026 there is also a schedule microsite
  (`/expofaja/`) and an embed for the CCIEB website. What was asked, built,
  measured and decided, in Spanish and English:
  [docs/expofaja/MEMORIA.md](docs/expofaja/MEMORIA.md).
- **Licenses:** code under [Apache-2.0](LICENSE); original data under
  [CC BY 4.0](LICENSE-DATA); third-party data (OpenStreetMap ODbL, Global Energy
  Monitor CC BY 4.0, Cesium terrain) keeps its own license, listed in
  [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md). Third-party marks used at the
  event are not covered by either license.
- **Links:** [live site](https://orinoco-digital.vercel.app) ·
  [docs/PLAN.md](docs/PLAN.md) · [CONTRIBUTING.md](CONTRIBUTING.md) ·
  [docs/expofaja/MEMORIA.md](docs/expofaja/MEMORIA.md)
