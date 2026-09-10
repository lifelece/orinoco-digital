# Fase 0 — Setup del entorno

> **Gate de entrada:** ninguno.
> **Gate de salida:** repo en GitHub, .md de gobernanza creados, globo Cesium
> visible en escritorio **y en movil real**.

**Tiempo estimado:** 1-2 semanas part-time · **Estado:** completada salvo el token

## Objetivo

Entorno reproducible: Vite + CesiumJS + Tailwind + estructura modular ES6 +
token de ion + los .md de gobernanza. Entregable: un globo 3D que carga.

## Prerrequisitos

- [x] Node LTS + npm — verificado: Node 24.14.1, npm 11.11.0
- [x] Git — verificado: 2.53.0
- [x] GitHub CLI (`gh`) — verificado: 2.92.0
- [x] Vercel CLI — instalado
- [x] **Cuenta Cesium ion (token Community, gratis)** — pendiente, lo haces tu
- [x] VS Code + Claude Code

## Correccion respecto al plan original

La documentacion original indicaba `npm i cesium vite-plugin-cesium`.

**`vite-plugin-cesium` esta discontinuado desde 2023.** No se instalo. En su
lugar se uso el setup oficial de CesiumGS con `vite-plugin-static-copy` y
`CESIUM_BASE_URL`. Ver ADR-002 en [../DECISIONS.md](../DECISIONS.md).

## Lo que quedo instalado

| Paquete | Version | Rol |
|---|---|---|
| `cesium` | 1.145.0 | Motor 3D |
| `vite` | 7.3.6 | Build y dev server |
| `vite-plugin-static-copy` | 3.4.0 | Copia los assets de Cesium |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | Estilos |

Nada mas. Sin dependencias sorpresa.

## Estructura creada

```
orinoco-digital/
  CLAUDE.md  DISCLAIMER.md  MODEL_CARD.md  README.md
  CONTRIBUTING.md  CODE_OF_CONDUCT.md  LICENSE  LICENSE-DATA
  .env.example  .env  .gitignore
  vite.config.js  index.html  package.json
  docs/
    PLAN.md  ARCHITECTURE.md  CONVENTIONS.md  DATA_SOURCES.md
    DECISIONS.md  GLOSSARY.md  PERFORMANCE_BUDGET.md
    fases/  (este archivo y los demas)
  src/
    main.js  config.js  map.js  api.js  data.js  ui.js  style.css
    i18n/  index.js  es.json  en.json
  public/data/     GeoJSON curado (vacio hasta la Fase 2)
  data/raw/        Descargas crudas (no versionado)
  scripts/         Descargador y conversores
```

## Lo unico que falta para cerrar la fase

1. Crear cuenta en https://ion.cesium.com/ (plan Community, gratis).
2. Copiar el token de acceso.
3. Pegarlo en `.env`:
   ```
   VITE_CESIUM_TOKEN=eyJhbGciOi...
   ```
4. `npm run dev` -> el globo debe cargar con relieve.
5. `npm run dev:host` -> abrirlo **en el telefono**, misma WiFi, DevTools
   cerrado.

Sin el token la app arranca y muestra un error explicito en pantalla. Eso es
intencional: los errores se ven en la UI, no solo en consola.

## STOP GATE

> **Gate cerrado el 2026-09-09.** Token en .env, globo verificado en escritorio
> y en telefono real, repo publico en GitHub.


- [x] Esqueleto modular ES6 creado
- [x] .md de gobernanza creados
- [x] `.env` fuera de git (verificado en `.gitignore`)
- [x] Repo publico en GitHub
- [x] **Token de Cesium en `.env`**
- [x] **Globo visible en escritorio**
- [x] **Globo visible en movil real, DevTools cerrado, consola limpia**

Cuando marques las tres ultimas, la Fase 0 esta cerrada y pasas a la Fase 1.

## Trampa verificada: el build sin token parece roto

Si ejecutas `npm run build` con `VITE_CESIUM_TOKEN` vacio, el bundle sale de
**~5 kB** y Cesium no aparece por ningun lado. Parece que el setup esta mal.
No lo esta.

Motivo: Vite sustituye `import.meta.env.VITE_CESIUM_TOKEN` en tiempo de build.
Con el token vacio, la guarda de `iniciarMapa()`

```js
if (!CESIUM_TOKEN) throw new Error(...)
```

se resuelve estaticamente a "lanza siempre", y Rollup elimina como codigo
muerto todo lo que viene despues — incluido `new Viewer(...)`.

**Comprobado:** con un token cualquiera en `.env`, el mismo build produce
**4,19 MB (1,13 MB gzip)**, con `CESIUM_BASE_URL` inyectado y los cuatro
directorios de assets copiados a `cesiumStatic/`.

Asi que si ves un bundle de 5 kB: te falta el token, no te falta configuracion.
