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

### OpenStreetMap — descargado

| Dataset | Aporta | CRS origen | Licencia | Atribucion obligatoria |
|---|---|---|---|---|
| **OpenStreetMap** (via Overpass API) | Ductos, pozos, refinerias, terminales etiquetados | EPSG:4326 nativo | **ODbL 1.0** | **Si** — "© OpenStreetMap contributors" |

Descargado con `node scripts/descargar-fuentes.mjs` el 2026-09-08:

| Archivo en `data/raw/` | Elementos | Tamano |
|---|---|---|
| `osm-pozos.json` | 461 pozos de petroleo | 91 KB |
| `osm-ductos.json` | 490 ductos (con geometria) | 1,3 MB |
| `osm-refinerias.json` | 51 instalaciones industriales de petroleo | 31 KB |
| `osm-terminales.json` | 1.860 tanques de almacenamiento y puertos | 1,3 MB |

**Nota operativa:** el mirror principal `overpass-api.de` rechazaba la conexion;
`overpass.kumi.systems` respondio sin problema. El script prueba tres mirrors en
orden, con ese ya en primer lugar. Si los tres fallan, reintenta mas tarde:
Overpass es un servicio publico gratuito y se satura.

**Antes de usar estos datos:** son crudos y sin curar. `osm-terminales.json`
trae 1.860 elementos, muy por encima del presupuesto de 2.000 por capa una vez
sumadas las demas — habra que filtrarlo a lo relevante del sector, no cargarlo
entero.

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
| 2026-09-08 | OpenStreetMap (Overpass) | snapshot | Setup inicial | 461 pozos, 490 ductos, 51 refinerias, 1.860 terminales. Via mirror kumi.systems |

---

## 9. Extension de la Faja: como se obtuvo

**Dato en uso:** `FAJA_BBOX` en `src/config.js`.

| | Valor |
|---|---|
| Oeste | -67,34 |
| Este | -62,08 |
| Sur | 7,88 |
| Norte | 9,37 |
| Centro | 8,62 N, -64,71 |
| Extension | 579 km E-O x 165 km N-S |

**Fuente:** U.S. Geological Survey, Fact Sheet 2009-3028, *An Estimate of
Recoverable Heavy Oil Resources of the Orinoco Oil Belt, Venezuela*, figura 1
(linea azul = Orinoco Oil Belt Assessment Unit). Dominio publico.
**Confianza:** media. **Verificado:** 2026-09-08.

### Por que hubo que medirlo

El poligono oficial de la AU **no esta publicado como GIS**. Se comprobo:

- El shapefile del USGS para Suramerica (`SouthAmericaConventionalAUs`,
  ScienceBase `699dc33db66b018a7ec1013f`) contiene solo assessment units
  **convencionales**. Sus 6 unidades de la cuenca de Venezuela Oriental son
  Fold and Thrust Belt, Gulf of Paria, Orinoco Delta, Trinidad Columbus,
  Maturin Sub-basin y Guarico Sub-basin. **Ninguna es la Faja**, que es una
  unidad *continua* de crudo pesado.
- Busquedas en ScienceBase por `60980182`, "Orinoco Oil Belt" y variantes de
  "continuous assessment unit boundaries" no devuelven ningun dataset con ese
  poligono.
- El texto del Fact Sheet da el area (~50.000 km2) y la geologia, pero **no da
  coordenadas**: el limite solo aparece dibujado en el mapa de la figura 1.
- OpenStreetMap no tiene la Faja ni sus bloques mapeados (consultado via
  Overpass por nombre y por `industrial=oilfield`).

### Metodo

`scripts/analisis/medir-faja-usgs.mjs`, reproducible:

1. Renderiza la pagina 1 del PDF a 6x (~137 px por grado de longitud).
2. Detecta el marco del mapa y sus marcas de graduacion.
   - Longitud: 8 marcas, espaciado 274,6 px por cada 2 grados, regular
     (274, 276, 275, 274, 274, 275, 274). Ajuste lineal.
   - Latitud: 6 marcas, espaciado **creciente** (216, 219, 223, 226, 231 px).
     El mapa no es equirectangular, asi que se interpola **entre las dos marcas
     que rodean cada valor**, no con una escala global.
3. Localiza la linea de la AU por su color exacto, `rgb(24,72,160)`, tomado de
   la propia leyenda del mapa.
4. Separa esa linea del recuadro de localizacion, que usa el mismo azul,
   mediante un perfil por filas: se toma el bloque contiguo mas denso
   (18.280 px).
5. Convierte los pixeles extremos a grados.

### Control de coherencia

La caja mide 95.680 km2 y la AU declara ~50.000 km2: la unidad ocupa el **52%**
de su caja envolvente. Es lo esperable en una franja larga y sinuosa, y
descarta un error de escala grueso.

### Limites de este dato

- Precision estimada **+-0,05 grados (~5 km)**, por el grosor de la linea
  impresa y la resolucion del render.
- Es una **caja envolvente, no el poligono**. La Faja no es rectangular.
- Sirve para encuadrar la camara. **No es un limite legal, catastral ni de
  concesion**, y no debe presentarse como tal.
- Los 4 bloques (Boyaca, Junin, Ayacucho, Carabobo) siguen **sin fuente**: la
  figura del USGS no los subdivide. En `config.js` estan como `centro: null`.

### Como mejorarlo

Sustituir esta medicion por el poligono real en cuanto se consiga: solicitandolo
al USGS Energy Resources Program, o desde mapas oficiales de PDVSA o del
Ministerio de Petroleo si publican los limites de bloques con coordenadas.
Cuando ocurra, `confianza` pasa a `alta`.
