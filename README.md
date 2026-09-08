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

- **Upstream** — pozos y bloques de la Faja (Boyaca, Junin, Ayacucho, Carabobo)
- **Midstream** — oleoductos, gasoductos, mejoradores y terminales
- **Downstream** — refinerias, puertos y rutas de exportacion
- **Capa empresarial** — operadoras, empresas mixtas, inversion y arbitrajes
- **Capa de IA** — modelo demostrativo, siempre etiquetado como tal

Todo dato visible es rastreable hasta una fuente publica documentada.

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

**Fase 0 — esqueleto y globo.** Ver [docs/PLAN.md](docs/PLAN.md) para la hoja
de ruta completa.

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
