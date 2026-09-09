# Orinoco Digital — Contexto para Claude Code

> Lee este archivo COMPLETO al inicio de cada sesion. Es la memoria del proyecto
> y la principal defensa contra alucinaciones.

## Que es

Gemelo digital 3D open-source de la industria petrolera y gasifera de Venezuela:
Faja Petrolifera del Orinoco, midstream y downstream, sobre terreno topografico
real. Incluye un modulo de IA **demostrativo**, claramente etiquetado.

Proyecto personal, en solitario, tiempo parcial. Autor: Luis Carlos Vasquez.

**Encuadre honesto:** es una plataforma de divulgacion con datos publicos
verificables, mas una demo de IA. NO es un sistema de prediccion de perforacion
de produccion — esos datos son propietarios de PDVSA/JV y no son publicos.

## Stack (NO cambiar sin aprobacion explicita)

- **Frontend:** Vanilla JS ES6 (modulos nativos), Vite 7, Tailwind CSS 4
- **3D:** CesiumJS 1.145 + Cesium ion Community (terreno mundial gratis)
- **Datos:** GeoJSON versionado en Git -> (Fase 4) Supabase PostgreSQL + PostGIS
- **IA texto/datos:** Gemini API (Flash) — extrae y estructura, NO predice
- **IA predictiva:** Python + scikit-learn en Google Colab — DEMO
- **Deploy:** Vercel + GitHub

**Prohibido sin aprobacion:** React, Vue, Svelte u otro framework; cualquier
dependencia nueva; cambiar la estructura de modulos.

### Trampa conocida del stack

`vite-plugin-cesium` esta **discontinuado desde 2023**. No lo instales ni lo
sugieras. El setup correcto es `vite-plugin-static-copy` con `CESIUM_BASE_URL`,
que es el ejemplo oficial de CesiumGS. Ya esta configurado en `vite.config.js`.
Ver `docs/DECISIONS.md` -> ADR-002.

## Arquitectura modular

Una responsabilidad por modulo. Imports ES6 nativos. Sin dependencias circulares.

| Modulo | Responsabilidad | Restriccion dura |
|---|---|---|
| `main.js` | Punto de entrada, orquesta | Sin logica de dominio |
| `config.js` | Constantes y entorno | Sin logica. Unico que lee `import.meta.env` |
| `map.js` | Todo CesiumJS | Unico modulo que importa `cesium` |
| `api.js` | De donde vienen los datos | Devuelve SIEMPRE FeatureCollection |
| `data.js` | Validacion y normalizacion | Sin red, sin DOM, sin Cesium |
| `ui.js` | DOM e interfaz | No importa `cesium`, no hace `fetch` |
| `i18n/` | Diccionarios ES/EN + `t(clave)` | Sin librerias |

El contrato de `api.js` (siempre FeatureCollection) es lo que permite migrar a
Supabase en la Fase 4 sin tocar `map.js` ni `ui.js`. **No lo rompas.**

## Decision de arquitectura de mayor palanca

**Static-first.** El GeoJSON canonico vive versionado en Git y se sirve como
archivo estatico desde el CDN de Vercel. Supabase solo para lo que de verdad
necesita consulta dinamica.

Esto resuelve de una sola vez: persistencia (Git es la fuente de verdad, no
dependemos de que Supabase no se pause), limites de free tier (el CDN absorbe
la lectura), rendimiento (archivos cacheados) y superficie de escritura.

## Reglas de trabajo

1. **Un STOP gate por fase.** Al terminar una fase, PARA y espera revision.
   No encadenes fases por iniciativa propia.
2. **No inventes datos, coordenadas, variables ni nombres de columnas.**
   Si falta un dato usa un placeholder visible (`[lat_pozo]`, `[operadora]`) o
   preguntalo en UNA frase. Un placeholder es correcto; un dato inventado es un
   fallo grave en un proyecto cuyo valor ES la credibilidad.
3. **Todo dato lleva fuente.** Sin entrada en `docs/DATA_SOURCES.md`, no entra
   al mapa. Cada registro lleva `fuente`, `confianza` y `ultima_verificacion`.
4. **CRS:** todo se transforma a WGS84 (EPSG:4326) ANTES de entrar. Venezuela
   uso historicamente La Canoa / PSAD56; sin transformar, las coordenadas caen
   desviadas cientos de metros.
5. **La capa predictiva es DEMO.** Banner permanente e imposible de ignorar
   siempre que este activa. Ver `MODEL_CARD.md`.
6. **Verificacion = dispositivo real con DevTools cerrado.** No basta localhost
   en escritorio. Un error que solo vive en la consola es un error invisible:
   los fallos se muestran en la UI (`mostrarError`).
7. **Sin dependencias nuevas** sin listarlas y justificarlas primero.
8. **Neutralidad.** Describir la industria con datos y fuentes, sin postura
   politica. Protege la credibilidad del proyecto y a su autor.
9. **i18n desde el primer commit.** Todo texto visible pasa por `t(clave)`.
   Nunca escribas cadenas sueltas en la UI.
10. **Presupuesto de rendimiento.** Respeta `docs/PERFORMANCE_BUDGET.md`:
    laptop de 8 GB y redes moviles venezolanas son el objetivo real.

## Secretos

- Tokens en `.env` con prefijo `VITE_`. `.env` esta en `.gitignore`.
- La `service_role` key de Supabase **NUNCA** en el frontend. Solo la `anon`
  key, protegida por RLS con politica SELECT y sin politicas de escritura.
- En produccion, token de Cesium restringido por dominio.

## Estado actual

**Fase 3 en curso.** Tres capas dibujadas: 105 campos (GEM GOGET), 346 ductos y
97 activos downstream incluidos 25 parques de tanques (OSM, ODbL). Filtros por
sector, leyenda desplegable y tabla accesible.

**Pendiente:** verificacion en movil de las fases 2 y 3. Los STOP gates de ambas
siguen abiertos hasta que se haga en dispositivo real con DevTools cerrado.

El plan completo esta en `docs/PLAN.md`; cada fase tiene su archivo en
`docs/fases/`.

## Al empezar una sesion

1. Lee este archivo y `docs/PLAN.md`.
2. Lee el archivo de la fase activa en `docs/fases/`.
3. Confirma en una frase que fase vas a trabajar antes de escribir codigo.
