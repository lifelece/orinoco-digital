---
paths:
  - "public/data/**"
  - "scripts/**"
  - "data/**"
  - "docs/DATA_SOURCES.md"
---

# Reglas de datos

- `public/data/*.geojson` se regenera con su script (`npm run data:*`), nunca a mano. Despues: `npm run data:validate`.
- Cada feature lleva `fuente`, `confianza` (`alta`/`media`/`baja`), `ultima_verificacion` (AAAA-MM-DD) y `geom_precision` cuando la geometria es aproximada.
- IDs: `OSM-N…`/`OSM-W…`/`OSM-R…` para OpenStreetMap (como en `scripts/osm-to-geojson.mjs`); el resto, MAYUSCULAS con guiones.
- Todo en WGS84 (EPSG:4326) antes de entrar. Si la fuente no declara CRS: `confianza: baja` hasta confirmarlo.
- Fuente nueva = seccion nueva en `docs/DATA_SOURCES.md` con licencia y atribucion (OSM es ODbL).
- Leer la documentacion del dataset antes que los datos (un campo no es un pozo).
- OSM: la ausencia no prueba inexistencia; contrastar con activos conocidos. Filtrar por evidencia y **imprimir los excluidos** para revision humana (seccion 11).
- Overpass: rotar `OVERPASS_MIRRORS` de `scripts/descargar-fuentes.mjs`; overpass-api.de corta conexiones.
- Presupuesto (`docs/PERFORMANCE_BUDGET.md`): <= 2.000 entidades por capa, <= 2 MB por GeoJSON. Capas nuevas pequenas: objetivo <= 200 KB.
- `data/raw/` no se versiona. `data/raw/expofaja/privado/` jamas sale del equipo de Luis.
- Sin nombre en la fuente: `nombre: null`. Nunca inventar nombres, coordenadas ni conteos.
