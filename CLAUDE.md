# Orinoco Digital — contexto para Claude Code

> Corto a proposito: este archivo se carga entero en cada sesion y en cada
> subagente. El detalle vive en `docs/` y en `.claude/rules/`, que se cargan
> solo al tocar los archivos de su zona.

@docs/constitution.md
@MEMORY.md

## Que es

Gemelo digital 3D open-source de la industria petrolera y gasifera de
Venezuela (Faja del Orinoco, midstream, downstream) sobre terreno real, con
datos publicos verificables y una capa de IA **DEMO**. Proyecto personal de
Luis Carlos Vasquez. En produccion: https://orinoco-digital.vercel.app

## Stack (no cambiar sin ADR)

Vanilla JS ES6 (modulos nativos) · Vite 7 · Tailwind CSS 4 · CesiumJS 1.145 +
Cesium ion · GeoJSON estatico en `public/data/` · Vercel. Tests: `node:test`.
Trampa: `vite-plugin-cesium` esta muerto; se usa `vite-plugin-static-copy` con
`CESIUM_BASE_URL` (ADR-002). No lo sugieras.

## Modulos

| Modulo | Responsabilidad | Restriccion dura |
|---|---|---|
| `main.js` | Orquesta | Sin logica de dominio |
| `config.js` | Constantes y entorno | Unico que lee `import.meta.env` |
| `map.js` | Todo CesiumJS | Unico que importa `cesium` |
| `controladorRender.js` | Render bajo demanda, holds | No importa `cesium` (ADR-019) |
| `api.js` | Origen de datos | Devuelve SIEMPRE FeatureCollection |
| `data.js` | Validacion y calculo puro | Sin red, sin DOM, sin Cesium |
| `ui.js`, `ui/` | DOM e interfaz | Sin `cesium`, sin `fetch` |
| `i18n/` | ES/EN y `t(clave)` | Sin librerias; mismas claves en ES y EN |

## Comandos

- `npm test` — tests + `verificar:modulos`. Verde antes de dar algo por hecho.
- `npm run build` — comprobar que el bundle trae Cesium (ver MEMORY, error 2).
- `npm run data:validate` — validar GeoJSON de `public/data/`.
- `npm run dev:host` — servir en la red local para probar en el telefono.

## Como se trabaja

- Al empezar: este archivo (ya trae constitucion y MEMORY) y la spec activa
  en `specs/`. Nada mas por defecto. `docs/PLAN.md` y `docs/fases/` son
  historia: solo si la tarea lo pide.
- Feature (3 o mas archivos, o decisiones abiertas): SDD en
  `specs/NNN-nombre/` con `/sdd-spec`, `/sdd-plan`, `/sdd-tareas`,
  `/sdd-implementar`, `/sdd-validar`. Cambio pequeno: directo.
- Una rama por trabajo, PR contra `main`. Luis mergea: merge = deploy.
- Gate de interfaz: Luis en su telefono real, datos moviles, DevTools cerrado.

## Limites

**Siempre:** fuente en `docs/DATA_SOURCES.md` para todo dato nuevo; textos
por `t(clave)` en ES y EN; tests antes de cerrar; errores visibles en la UI
(`mostrarError`), no solo en consola.

**Preguntar antes:** dependencias nuevas; cambiar el formato de un GeoJSON o
el contrato de `api.js`; tocar `vercel.json` o `package.json`; archivos
nuevos fuera del plan; borrar archivos.

**Nunca:** editar a mano `public/data/*.geojson` (se regeneran con
`npm run data:*`); inventar datos, coordenadas, nombres o columnas (usar
`[placeholder]`); push o merge a `main`; secretos en el repo; postura
politica; datos de negocios de Luis o datos privados de la CCIEB en el repo.

## Reglas por zona (`.claude/rules/`)

`datos.md` (public/data, scripts, DATA_SOURCES) · `mapa.md` (map.js,
controladorRender.js, iconos.js, vite.config.js) · `interfaz.md` (ui, i18n,
estilos, index.html, expofaja) · `codigo.md` (todo `src/`) · `tests.md`.

## Secretos

`.env` con prefijo `VITE_`, fuera de Git. Token de Cesium restringido por
dominio. La `service_role` de Supabase nunca en el frontend.
