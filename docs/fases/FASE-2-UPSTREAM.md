# Fase 2 — Capa Upstream (campos)

> **Gate de entrada:** Fase 1 cerrada.
> **Gate de salida:** campos renderizados desde GeoJSON con panel de datos al
> tocar, en movil.

**Tiempo estimado:** 2-3 semanas part-time

## Objetivo

Primera capa de datos reales: los campos petroliferos y gasiferos de Venezuela,
con estilo por estado y panel de detalle que **muestra la fuente de cada dato**.

Esta es la fase donde el proyecto deja de ser un globo bonito y empieza a valer.

## Correccion importante: son CAMPOS, no pozos

Esta fase se llamaba "capa de pozos". **Los datos publicos disponibles son de
campos (yacimientos), no de pozos.** GEM lo dice en su propia documentacion:
cada unidad abarca kilometros y su coordenada puntual es *"aproximadamente el
centro de la unidad"*.

Presentar un campo como un pozo seria falsear el dato, justo el fallo que este
proyecto no se puede permitir. Por eso: `tipo: "campo"`, `campos.geojson`,
`getCampos()`.

Un pozo es una perforacion puntual; un campo es una extension con poligono. No
se mezclan.

## Los datos ya estan listos

`public/data/campos.geojson` — generado y validado. **105 campos de Venezuela**:

- **67 con poligono real** (60 MultiPolygon + 7 Polygon)
- 38 solo con punto
- 239 KB, dentro del presupuesto de 2 MB
- Estados: 99 activo, 5 inactivo, 1 desconocido
- 54 caen dentro de `FAJA_BBOX`

Detalle, licencia y limites del dataset en
[../DATA_SOURCES.md](../DATA_SOURCES.md) seccion 10.

Los datos de OSM ya descargados (`data/raw/osm-pozos.json`, 461 pozos reales)
sirven de contraste y son la fuente para una capa de pozos de verdad mas
adelante. Recuerda: **capa OSM separada y atribuida**, por ODbL.

## Esquema del activo

```json
{
  "id": "GEM-L1000003xxxxx",
  "nombre": "Bare Oil and Gas Field (Venezuela)",
  "tipo": "campo",
  "sector": "upstream",
  "fluido": "oil and gas",
  "estado": "activo",
  "operadora": "[operadora]",
  "cuenca": "[cuenca]",
  "bloque": null,
  "fuente": "Global Energy Monitor, Global Oil and Gas Extraction Tracker, March 2026",
  "confianza": "media",
  "ultima_verificacion": "2026-09-08"
}
```

Los tres ultimos campos son obligatorios. `data.js` ya tiene `normalizarActivo()`
y `tieneProcedencia()` listos para esto.

`bloque` llega **null**: la columna `Block(s)` de GOGET esta vacia en las 138
unidades de Venezuela. No se inventa.

## Implementacion

- `api.js` — `getCampos()` ya existe y hace fetch de `/data/campos.geojson`.
- `data.js` — ya valida FeatureCollection y coordenadas, y `TIPOS` ya incluye
  `campo`. Anadir el filtro que descarta activos sin fuente antes de dibujar.
- `map.js` — `dibujarCampos()`. **Dos geometrias que resolver:**
  - Poligonos (67): relleno translucido con `PolygonGraphics`, color por estado.
  - Puntos (38): billboard. **Nunca modelos 3D**, matan el rendimiento.

  Un campo con poligono debe verse claramente distinto de uno que solo tiene
  punto: lo segundo significa "sabemos que existe, no sabemos su extension", y
  el mapa debe comunicar esa diferencia en vez de disimularla.
- `ui.js` — `mostrarPanelActivo()`: panel lateral con las propiedades. **La
  fuente y la fecha de verificacion se muestran siempre**, no en letra pequena.
- **Vista de tabla accesible** — ADR-006. Es alternativa para lectores de
  pantalla Y fallback para redes lentas. Se hace en esta fase, no despues.
- **Atribucion de GEM visible** en la interfaz. Es obligacion de la CC BY 4.0.

## Prompt de arranque

```
Lee CLAUDE.md, docs/fases/FASE-2-UPSTREAM.md, src/api.js y src/data.js.
Trabajamos la Fase 2. public/data/campos.geojson ya existe y esta validado:
105 campos, 67 con poligono y 38 solo con punto.
Implementa dibujarCampos() en map.js: los poligonos como relleno translucido
con color por estado segun COLOR_ESTADO, los puntos como billboard, y que se
distingan visualmente entre si. Anade mostrarPanelActivo() en ui.js con las
propiedades del campo seleccionado, incluyendo fuente y ultima_verificacion.
Respeta el presupuesto de rendimiento. PARA en el STOP gate.
```

## Verificacion

En movil real: tocar un campo abre el panel con sus datos y su fuente. Los
colores por estado se distinguen a simple vista. Un campo con poligono se
distingue de uno con solo punto. La tabla accesible es navegable con teclado.

## STOP GATE

> **Gate cerrado el 2026-09-09.** Verificado por Luis Carlos Vasquez en telefono
> real con DevTools cerrado. Es la atestacion del autor, no una prueba
> automatizada: si algo se rompe mas adelante, este gate se reabre.


- [x] Datos obtenidos, convertidos y validados (105 campos)
- [x] Dataset registrado en DATA_SOURCES.md (seccion 10)
- [x] Campos visibles y correctamente posicionados
- [x] Poligonos y puntos distinguibles entre si
- [x] Estilo por estado distinguible
- [x] Panel de datos al tocar, funcional en movil
- [x] **Fuente y fecha visibles en el panel**
- [x] Atribucion de GEM visible en la interfaz (CC BY 4.0)
- [x] Ningun activo sin fuente llega al mapa
- [x] Vista de tabla accesible funcionando
- [x] `api.js` sigue devolviendo FeatureCollection (contrato intacto)
