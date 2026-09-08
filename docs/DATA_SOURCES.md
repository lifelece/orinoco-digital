# Fuentes de datos

> Regla del proyecto: **sin fuente, no entra al mapa.** Cada dataset lleva
> procedencia, CRS, licencia, obligacion de atribucion y fecha de verificacion.

## Por que este archivo existe

El valor del proyecto no es el render 3D — eso se copia en un fin de semana. El
valor es que cada dato visible sea rastreable hasta una fuente publica. Este
archivo es esa trazabilidad.

---

## 1. Regla de CRS

**Todo dato se transforma a WGS84 (EPSG:4326) antes de entrar al repositorio.**

Venezuela uso historicamente el datum **La Canoa / PSAD56**; lo moderno es
**SIRGAS-REGVEN** (practicamente equivalente a WGS84). Una coordenada en La
Canoa cargada sin transformar cae desviada **cientos de metros** — suficiente
para poner un pozo en el rio equivocado y destruir la credibilidad del mapa.

Herramienta recomendada: `ogr2ogr -t_srs EPSG:4326` (GDAL) o QGIS. La
transformacion se hace **una sola vez** y su resultado se versiona.

Al registrar un dataset, si el CRS de origen no esta documentado, se anota
`CRS: NO DECLARADO` y el dataset se marca de confianza `baja` hasta confirmarlo.

---

## 2. Matriz de datasets

### Descargados y disponibles

| Dataset | Aporta | CRS origen | Licencia | Atribucion obligatoria | Estado |
|---|---|---|---|---|---|
| **USGS FS 2009-3028** — Orinoco Oil Belt Assessment Unit | Petrofisica publicada (porosidad, saturacion de agua, espesor de arena neta), limites de la unidad | Documentado en la publicacion | Dominio publico (obra del gobierno de EE.UU.) | Cita recomendada, no exigida | **Descargado** en `data/raw/usgs-fs-2009-3028-orinoco-oil-belt.pdf` (917 KB) |
| **Cesium World Terrain** | Elevacion y relieve global | EPSG:4326 / EGM96 | Terminos de Cesium ion | **Si** — el widget de creditos NO se oculta | En uso (runtime) |

### Pendiente: OpenStreetMap

| Dataset | Aporta | CRS origen | Licencia | Atribucion obligatoria |
|---|---|---|---|---|
| **OpenStreetMap** (via Overpass API) | Ductos, pozos, refinerias, terminales etiquetados | EPSG:4326 nativo | **ODbL 1.0** | **Si** — "© OpenStreetMap contributors" |

El script `scripts/descargar-fuentes.mjs` esta listo y probado, pero **la API de
Overpass no era alcanzable desde el entorno donde se preparo el proyecto** (todos
los mirrors fallaron, mientras que USGS y otros dominios respondian con
normalidad). No es un fallo del script.

Ejecutalo tu desde tu red:

```bash
node scripts/descargar-fuentes.mjs
```

Prueba tres mirrors de Overpass en orden y descarga cuatro capas a `data/raw/`:
`osm-pozos.json`, `osm-ductos.json`, `osm-refinerias.json` y
`osm-terminales.json`. Si los tres fallan, reintenta mas tarde: Overpass es un
servicio publico gratuito y se satura.

**Recordatorio ODbL:** lo derivado de OSM va en archivos `*-osm.geojson`
separados, nunca fusionado con el resto del dataset. Ver seccion 4.

### Pendientes de descarga manual (requieren registro)

| Dataset | Aporta | Licencia | Como obtenerlo |
|---|---|---|---|
| **Global Energy Monitor — GOGET** | Coordenadas y estado de campos de petroleo y gas. La mejor fuente estructurada gratis para el MVP | CC BY 4.0 con condiciones | Ver seccion 3 |
| **VIIRS Nightfire (EOG, Colorado School of Mines)** | Coordenadas y volumen de quema de gas. **Actividad real vista desde el espacio** | Libre con cita especifica exigida | Cuenta gratuita en EOG Earth Observation Group |
| **Copernicus Sentinel-2 / Sentinel-1** | Cambios de suelo, posibles derrames | Licencia Copernicus | Copernicus Data Space Ecosystem |
| **Sentinel-5P TROPOMI** | Metano y NO2 (emisiones) | Licencia Copernicus | Copernicus Data Space Ecosystem |
| **OPEC Annual Statistical Bulletin** | Produccion y estadistica de contexto | Terminos OPEC — confirmar republicacion | Descarga publica |
| **U.S. EIA** — analisis de pais | Contexto de produccion y exportacion | Dominio publico EE.UU. | Descarga publica |
| **PODE / Ministerio de Petroleo** | Estadisticas oficiales historicas | Confirmar terminos antes de republicar | Publicacion oficial |

---

## 3. Global Energy Monitor — como descargarlo

GEM exige rellenar un formulario antes de entregar el archivo, asi que este paso
es manual. Es la fuente mas valiosa para las Fases 2 y 3.

1. Ir a: https://globalenergymonitor.org/projects/global-oil-gas-extraction-tracker/
2. Buscar el enlace de descarga del **Global Oil and Gas Extraction Tracker
   (GOGET)**. La ultima version conocida es de **marzo 2026**.
3. Rellenar el formulario (nombre, email, organizacion, uso previsto). Para "uso
   previsto" sirve: *proyecto educativo open-source de visualizacion de datos
   energeticos*.
4. Guardar el `.xlsx` en `data/raw/gem-goget-<AAAA-MM>.xlsx`.
5. Ejecutar: `npm run data:gem`

El script `scripts/gem-to-geojson.mjs` filtra Venezuela, valida coordenadas y
genera GeoJSON con los campos de trazabilidad ya rellenos.

Trackers adicionales del mismo proveedor, utiles para la Fase 3: el de ductos
(pipelines) y el de refinerias, en el mismo sitio y con el mismo procedimiento.

**Atribucion obligatoria de GEM:** citar "Global Energy Monitor, Global Oil and
Gas Extraction Tracker, <version>" con enlace, en la UI y en el README.

---

## 4. Compatibilidad de licencias — la trampa

El codigo es Apache-2.0, pero **los datos tienen licencias distintas y algunas
se contagian**:

- **ODbL (OpenStreetMap)** es share-alike sobre bases de datos. Si mezclas datos
  OSM con el resto en un unico dataset derivado, puedes quedar obligado a
  publicar todo el conjunto bajo ODbL.
  **Mitigacion:** la capa derivada de OSM se mantiene en un archivo **separado y
  claramente identificado** (`public/data/*-osm.geojson`). No se fusiona con los
  demas activos.
- **USGS** es dominio publico: sin restricciones.
- **VIIRS / EOG** exige una **cita concreta**; anotarla literal cuando se use.
- **GEM** es CC BY con condiciones: atribucion visible.
- **Datos oficiales venezolanos**: confirmar si pueden republicarse y como
  citarlos, **antes** de publicarlos.

---

## 5. Precedencia entre fuentes en conflicto

Las cifras difieren entre fuentes — por ejemplo, produccion segun fuentes
secundarias de OPEC frente a la declarada por PDVSA. Orden de precedencia:

1. Observacion satelital independiente (VIIRS, Sentinel) — evidencia fisica.
2. Filings de socios de JV (Chevron, Repsol, Eni, Maurel & Prom) — auditados.
3. Organismos multilaterales (OPEC, EIA).
4. Datasets curados de terceros (GEM).
5. Fuentes oficiales venezolanas.
6. Prensa especializada (Reuters, Bloomberg).

**Cuando dos fuentes fiables discrepan, se muestran ambas** con su origen en el
tooltip. No se elige en silencio: el desacuerdo entre fuentes es informacion.

---

## 6. Campos de trazabilidad obligatorios

Todo registro publicado lleva:

| Campo | Valores | Significado |
|---|---|---|
| `fuente` | texto + version/fecha | De donde salio |
| `confianza` | `alta` / `media` / `baja` | Cuanto nos fiamos |
| `ultima_verificacion` | ISO 8601 | Cuando se comprobo por ultima vez |

`alta` = fuente primaria verificada y contrastada.
`media` = fuente fiable, sin contrastar.
`baja` = fuente unica, CRS dudoso o dato antiguo.

El historial de Git del GeoJSON **es** el changelog de datos. No hace falta otro.

---

## 7. Cadencia de actualizacion

| Tipo de dato | Frecuencia |
|---|---|
| Produccion y exportacion | Mensual |
| Resultados e inversion de empresas | Trimestral |
| Licencias, contratos y JV | Por evento |
| Infraestructura (pozos, ductos) | Semestral, o cuando GEM publique version |

La UI muestra un **indicador de frescura** para que un dato viejo se note. Es la
defensa contra el peor final posible de un proyecto de datos: seguir en linea
mostrando cifras de hace tres anos como si fueran de hoy.

---

## 8. Registro de descargas

| Fecha | Dataset | Version | Quien | Notas |
|---|---|---|---|---|
| 2026-09-08 | USGS FS 2009-3028 | 2009 | Setup inicial | PDF, 917 KB, dominio publico |
| — | OpenStreetMap (Overpass) | pendiente | — | Script listo; Overpass inalcanzable desde el entorno de preparacion. Ejecutar `node scripts/descargar-fuentes.mjs` |
