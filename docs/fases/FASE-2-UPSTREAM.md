# Fase 2 — Capa Upstream (pozos)

> **Gate de entrada:** Fase 1 cerrada.
> **Gate de salida:** pozos renderizados desde GeoJSON con panel de datos al
> tocar, en movil.

**Tiempo estimado:** 2-3 semanas part-time

## Objetivo

Primera capa de datos reales. Nodos de pozos desde un GeoJSON local, con estilo
por estado y panel de detalle que **muestra la fuente de cada dato**.

Esta es la fase donde el proyecto deja de ser un globo bonito y empieza a valer.

## Antes de codear: conseguir los datos

1. Descargar el **Global Oil and Gas Extraction Tracker** de Global Energy
   Monitor. Requiere formulario. Instrucciones paso a paso en
   [../DATA_SOURCES.md](../DATA_SOURCES.md) seccion 3.
2. Guardarlo en `data/raw/gem-goget-<AAAA-MM>.xlsx`.
3. `npm run data:gem` -> genera `public/data/pozos.geojson`.
4. Revisar el resultado a mano. **Revisar, no confiar.**
5. Registrar el dataset en `DATA_SOURCES.md` con version, CRS y fecha.

Los datos de OSM ya descargados (`data/raw/osm-pozos.json`) sirven de contraste.
Recuerda: **capa OSM separada**, por ODbL.

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

Los tres ultimos campos son obligatorios. `data.js` ya tiene `normalizarActivo()`
y `tieneProcedencia()` listos para esto.

## Implementacion

- `api.js` — `getPozos()` ya existe y hace fetch de `/data/pozos.geojson`.
- `data.js` — ya valida FeatureCollection y coordenadas. Anadir el filtro que
  descarta activos sin fuente antes de dibujar.
- `map.js` — `dibujarPozos()`. **Billboards, no modelos 3D.** Color por estado
  usando `COLOR_ESTADO` de `config.js`. Clustering al pasar de ~300 visibles.
- `ui.js` — `mostrarPanelActivo()`: panel lateral con las propiedades. **La
  fuente y la fecha de verificacion se muestran siempre**, no en letra pequena.
- **Vista de tabla accesible** — ADR-006. Es alternativa para lectores de
  pantalla Y fallback para redes lentas. Se hace en esta fase, no despues.

## Prompt de arranque

```
Lee CLAUDE.md, docs/fases/FASE-2-UPSTREAM.md, src/api.js y src/data.js.
Trabajamos la Fase 2. Ya tengo public/data/pozos.geojson generado desde GEM.
Implementa dibujarPozos() en map.js usando billboards con color por estado
segun COLOR_ESTADO. Anade mostrarPanelActivo() en ui.js que muestre las
propiedades del pozo seleccionado, incluyendo fuente y ultima_verificacion.
Respeta el presupuesto de rendimiento. PARA en el STOP gate.
```

## Verificacion

En movil real: tocar un pozo abre el panel con sus datos y su fuente. Los
colores por estado se distinguen a simple vista. La tabla accesible es navegable
con teclado.

## STOP GATE

- [ ] Pozos visibles y correctamente posicionados
- [ ] Estilo por estado distinguible
- [ ] Panel de datos al tocar, funcional en movil
- [ ] **Fuente y fecha visibles en el panel**
- [ ] Ningun activo sin fuente llega al mapa
- [ ] Vista de tabla accesible funcionando
- [ ] `api.js` sigue devolviendo FeatureCollection (contrato intacto)
- [ ] Dataset registrado en DATA_SOURCES.md
