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

*(GOGET ya no esta aqui: descargado y convertido, ver seccion 10.)*

| Dataset | Aporta | Licencia | Como obtenerlo |
|---|---|---|---|
| **VIIRS Nightfire (EOG, Colorado School of Mines)** | Coordenadas y volumen de quema de gas. **Actividad real vista desde el espacio** | Libre con cita especifica exigida | Cuenta gratuita en EOG Earth Observation Group |
| **Copernicus Sentinel-2 / Sentinel-1** | Cambios de suelo, posibles derrames | Licencia Copernicus | Copernicus Data Space Ecosystem |
| **Sentinel-5P TROPOMI** | Metano y NO2 (emisiones) | Licencia Copernicus | Copernicus Data Space Ecosystem |
| **OPEC Annual Statistical Bulletin** | Produccion y estadistica de contexto | Terminos OPEC — confirmar republicacion | Descarga publica |
| **U.S. EIA** — analisis de pais | Contexto de produccion y exportacion | Dominio publico EE.UU. | Descarga publica |
| **PODE / Ministerio de Petroleo** | Estadisticas oficiales historicas | Confirmar terminos antes de republicar | Publicacion oficial |

---

## 3. Global Energy Monitor — como actualizarlo

**Ya descargado y convertido.** Ver seccion 10 para el resultado. Este
procedimiento sirve para la proxima version del tracker.

GEM exige rellenar un formulario antes de entregar el archivo, asi que este paso
es manual.

1. Ir a: https://globalenergymonitor.org/projects/global-oil-gas-extraction-tracker/
2. Descargar el **Global Oil and Gas Extraction Tracker (GOGET)**. La version en
   uso es la de **marzo de 2026**.
3. Rellenar el formulario (nombre, email, organizacion, uso previsto). Para "uso
   previsto" sirve: *proyecto educativo open-source de visualizacion de datos
   energeticos*.
4. Abrir el `.xlsx` y guardar **la hoja `Field-level main data`** — no la hoja
   `About`, que es solo documentacion — como **CSV UTF-8** en
   `data/raw/gem-goget.csv`.
5. Ejecutar: `npm run data:gem`
6. Ejecutar: `npm run data:validate`

El libro trae 7 hojas. La que lleva las unidades con coordenadas y poligonos es
`Field-level main data` (7.673 filas, 27 columnas). Las de reservas y produccion
son tablas largas por ano, utiles mas adelante.

El script `scripts/gem-to-geojson.mjs` filtra Venezuela, prefiere el poligono
WKT al punto, valida el rango de coordenadas y rellena los campos de
trazabilidad.

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
| 2026-09-08 | GEM GOGET | marzo 2026 | Setup inicial | 105 campos de Venezuela, 67 con poligono. CC BY 4.0 |
| 2026-09-08 | OpenStreetMap (Overpass) | snapshot | Setup inicial | 461 pozos, 490 ductos, 51 refinerias, 1.860 terminales. Via mirror kumi.systems |
| 2026-09-08 | OpenStreetMap (2a consulta) | snapshot | Fase 3 | 79 elementos. Recupera Amuay, El Palito y Punta Cardon, ausentes en la 1a |

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

---

## 10. Global Energy Monitor — GOGET, descargado y convertido

**Version:** Global Oil and Gas Extraction Tracker, **release de marzo de 2026**.
**Licencia:** Creative Commons Attribution 4.0 International (CC BY 4.0),
declarada en la hoja *About* del propio libro.
**Contacto del proyecto:** Scott Zimmerman, GOGET Project Manager, GEM.
**CRS:** WGS84 (EPSG:4326), longitud primero tanto en las columnas de
coordenadas como en los poligonos WKT. Sin transformacion necesaria.
**Confianza:** media / baja segun registro. **Verificado:** 2026-09-08.

### Atribucion obligatoria

> Global Energy Monitor, *Global Oil and Gas Extraction Tracker*, marzo 2026.
> Distribuido bajo licencia CC BY 4.0.

Debe aparecer en la interfaz y en el README.

### Lo que este dataset ES y lo que NO es

**Son CAMPOS (yacimientos), no pozos.** Es la aclaracion mas importante y viene
de la propia documentacion de GEM: cada unidad abarca kilometros y la coordenada
puntual es *"aproximadamente el centro de la unidad"*. Presentarlos como pozos
seria falsear el dato.

Por eso el activo lleva `tipo: "campo"` y la salida se llama `campos.geojson`.

**No es un inventario completo.** GEM solo incluye unidades con produccion de
1 millon de boe/ano o mas, o reservas de 25 millones de boe, o que ya estaban en
versiones anteriores. Los campos pequenos no aparecen. La ausencia de un campo
en el mapa **no significa que no exista**.

### Resultado de la conversion

`npm run data:gem` -> `public/data/campos.geojson`

| | |
|---|---|
| Unidades de Venezuela en el tracker | 138 |
| Escritas al GeoJSON | **105** |
| Con poligono real (WKT) | 67 (60 MultiPolygon + 7 Polygon) |
| Solo con punto | 38 |
| Descartadas por no tener geometria | 33 |
| Fuera del rango de Venezuela | 0 |
| Peso | 239 KB (presupuesto: 2 MB) |

Estados tras normalizar: 99 activo, 5 inactivo, 1 desconocido.
Confianza: 75 media (ubicacion *exact* segun GEM), 30 baja (*approximate*).

El techo de confianza es **media** a proposito: GOGET es una fuente curada y
fiable, pero secundaria y aqui no se ha contrastado contra una primaria.

### Comprobacion cruzada con la extension de la Faja

54 de los 105 campos caen dentro de `FAJA_BBOX` (seccion 9), y son los
orientales: Bare, Acema, Adas, Aguasay, Araibel, Boca, Bella Vista y otros. Los
51 restantes estan en Maracaibo, Falcon y costa afuera.

Es una corroboracion independiente de que la caja medida sobre la figura del
USGS esta donde debe. **Matiz necesario:** la caja abarca tambien campos
convencionales situados al norte de la Faja propiamente dicha, asi que "54
campos dentro de la caja" **no equivale a** "54 campos de la Faja".

### Lo que GOGET no aporta

La columna `Block(s)` **esta vacia en las 138 unidades de Venezuela**. No sirve
para asignar los bloques Boyaca, Junin, Ayacucho y Carabobo, que siguen sin
fuente. En `config.js` continuan como `centro: null`.

---

## 11. OpenStreetMap — capas midstream y downstream (Fase 3)

**Fuente:** OpenStreetMap contributors, consulta Overpass del 2026-09-08.
**Licencia:** **ODbL 1.0** — share-alike sobre bases de datos.
**Atribucion obligatoria:** "© OpenStreetMap contributors", visible en la
interfaz. **CRS:** EPSG:4326 nativo. **Confianza:** baja (dato colaborativo,
sin auditar). **Verificado:** 2026-09-08.

Generado con `node scripts/osm-to-geojson.mjs` a archivos **separados** con
sufijo `-osm`, por la clausula share-alike. Ver seccion 4.

### Resultado

| Capa | Archivo | Elementos | Peso |
|---|---|---|---|
| Ductos | `ductos-osm.geojson` | 346 | 847 KB |
| Downstream + terminales | `downstream-osm.geojson` | 97 | 62 KB |

Instalaciones por tipo: 5 refinerias, 2 petroquimicas, 1 planta de gas,
4 puertos, 60 instalaciones sin clasificar mejor, 25 parques de tanques.

### Lo que se descarto, y por que

**Ductos.** OSM etiqueta como `man_made=pipeline` tambien los acueductos:
**78 eran de agua o alcantarillado**. Un acueducto no es infraestructura
petrolera y pintarlo como tal seria un error de datos.

Otros **66 ductos no declaran `substance`**. Tampoco entran: un ducto sin
sustancia declarada no es *verificablemente* de hidrocarburos, y la regla del
proyecto es no afirmar lo que no se puede sostener. Se pierden ductos reales
por prudencia; es el lado correcto en el que equivocarse.

**Tanques.** De 1.856 tanques, **507 son de agua** y 645 no declaran contenido.
Quedan 704 de hidrocarburos.

**Instalaciones.** Se excluyen centrales electricas (`power=plant`) y zonas
francas: estan etiquetadas como industria pero no son cadena de hidrocarburos.
Y las 43 sin nombre, porque una instalacion sin nombre no es identificable ni
verificable.

### Dato DERIVADO: los parques de tanques

Los 704 tanques individuales se agrupan por proximidad (~1,5 km) en **25
parques de tanques**. El mayor reune 397 tanques.

**Esto no existe como entidad en OSM: lo hemos construido nosotros.** Cada
registro lleva `derivado: true`, el numero de tanques agrupados y una nota que
lo dice; el punto es el **centroide del grupo**, no la ubicacion de nada
concreto. La interfaz muestra un aviso ambar al seleccionarlo.

Se agrupa porque 704 tanques sueltos no son informativos a escala de pais y
reventarian el presupuesto de rendimiento; un parque de tanques si lo es.

### Aviso: la primera consulta se dejaba fuera las refinerias grandes

La consulta inicial (`industrial=oil`, `man_made=works`) **no devolvia Amuay,
El Palito ni Punta Cardon**, las tres mayores del pais. Estan etiquetadas como
`industrial=refinery` o solo por nombre. Hizo falta una segunda consulta
(`osm-refinerias-2.json`).

Y clasificar por el termino ingles "refiner" tampoco basta: el **Centro de
Refinacion Paraguana** se colaba como instalacion generica. El clasificador
cubre ahora "refinac" y "refineria" sin tildes.

**Leccion, anotada para las proximas capas:** en OSM, la ausencia de un activo
casi nunca significa que no exista; significa que esta etiquetado de otra
forma. Comprobar siempre contra una lista de activos conocidos antes de dar una
capa por completa.

### Limites de esta capa

- Cobertura **desigual**: OSM depende de quien haya mapeado cada zona.
- OSM **no publica el estado operativo** de los ductos. Todos van con
  `estado: "desconocido"` y se colorean por fluido, no por estado. Fingir un
  estado seria inventar.
- 60 de las 72 instalaciones quedan como `instalacion` generica porque las
  etiquetas no permiten afirmar que sean refinerias. Es preferible a
  clasificarlas mal.
