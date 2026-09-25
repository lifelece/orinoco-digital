# Arquitectura

## Principio rector: static-first

El GeoJSON canonico vive **versionado en Git** y se sirve como archivo estatico
desde el CDN. Es la fuente de verdad. Cualquier base de datos es un espejo o una
cache, nunca el original.

Esto resuelve cuatro problemas a la vez: persistencia (no dependemos de que un
free tier no se pause), limites de cuota (el CDN absorbe la lectura), rendimiento
(archivos cacheados y ligeros) y superficie de escritura reducida.

## Flujo de datos

```
Fuentes publicas (USGS, GEM, OSM, VIIRS, filings)
        |
        v
Limpieza y transformacion a WGS84  (scripts/ + QGIS/ogr2ogr, manual)
        |
        v
GeoJSON curado en public/data/     <-- FUENTE DE VERDAD, versionada en Git
        |
        v
api.js   -> devuelve FeatureCollection
        |
        v
data.js  -> valida, descarta lo invalido, normaliza propiedades
        |
        v
map.js   -> Cesium renderiza entidades
        |
        v
ui.js    -> paneles, filtros, leyenda, banner DEMO
```

En la Fase 4 (si se hace) solo cambia el cuerpo de `api.js`: pasa a consultar
Supabase y sigue devolviendo el mismo GeoJSON. Nada mas se toca.

## Modulos

```
src/
  main.js       Punto de entrada. Solo orquesta.
  config.js     Constantes y entorno. Sin logica.
  map.js        CesiumJS. Unico modulo que importa "cesium".
  api.js        Origen de datos. Devuelve siempre FeatureCollection.
  data.js       Validacion y normalizacion. Sin red, sin DOM, sin Cesium.
  iconos.js     Simbolos SVG del mapa como data URI. Sin red, sin DOM, sin Cesium.
  ui.js         DOM: shell, control de capas, buscador, ficha, tabla y avisos.
                No importa cesium, no hace fetch.
  style.css     Tailwind 4 + tokens de diseno (ADR-014) + estilos del viewer.
  i18n/
    index.js    Helper t(clave) y cambio de idioma.
    es.json     Diccionario espanol.
    en.json     Diccionario ingles.
```

### Grafo de dependencias real

Actualizado el 2026-09-15: el anterior no incluia `iconos.js` ni las
importaciones de `config.js` y `data.js` desde `map.js` y `ui.js`.

```
main.js   -> map.js, ui.js, api.js, data.js, i18n, style.css
map.js    -> cesium, config.js, data.js, iconos.js
ui.js     -> i18n, map.js, config.js, data.js
api.js    -> config.js, data.js
data.js   -> config.js
iconos.js -> (nada)
i18n      -> config.js
```

Reglas que no se rompen:

- `data.js` no importa nada de red, DOM ni Cesium. Es puro y testeable.
- `ui.js` nunca importa `cesium`. Si necesita algo del mapa, lo pide a `map.js`.
- `config.js` es el unico que lee `import.meta.env`.
- Sin dependencias circulares.

## El contrato de `api.js`

Toda funcion de `api.js` devuelve una `FeatureCollection` GeoJSON valida, o
lanza. Nunca devuelve `null`, ni un array suelto, ni la respuesta cruda de un
proveedor.

Ese contrato es lo que hace la Fase 4 barata. Si se rompe, migrar a Supabase
obliga a tocar toda la UI.

## Estructura de datos

```
public/data/          GeoJSON curado. Versionado. Se sirve al navegador.
  campos.geojson
  ductos.geojson
  downstream.geojson
  prob_grid.geojson   Fase 5. DEMO.

data/raw/             Descargas crudas. NO versionado (.gitignore).
                      Se conserva local para poder reproducir la transformacion.

scripts/              Conversores y validadores en Node. Se ejecutan a mano.
```

## Esquema del activo

```json
{
  "id": "POZO-JUN-001",
  "tipo": "pozo",
  "sector": "upstream",
  "bloque": "Junin",
  "estado": "activo",
  "operadora": "[operadora]",
  "notas": "[historial]",
  "fuente": "GEM GOGET 2026-03",
  "confianza": "media",
  "ultima_verificacion": "2026-09-08"
}
```

`id` es estable y no se reutiliza. Esa estabilidad es la que permite anadir mas
adelante una tabla `produccion_historica` sin romper nada: hoy modelamos estado
actual, manana series temporales colgando del mismo `id`.

Los tres ultimos campos son obligatorios por politica. Un activo sin `fuente`
no se dibuja.

## Rendimiento

`requestRenderMode: true` — Cesium solo redibuja cuando algo cambia. Es la
optimizacion de mayor impacto en laptops modestas y en moviles.

El resto de limites esta en [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md).

## Accesibilidad

Un globo 3D es invisible para un lector de pantalla. La vista de tabla HTML no
es un extra: es la alternativa accesible **y** el fallback ligero para redes
lentas. Se construye en la Fase 2, junto con la primera capa de datos.
