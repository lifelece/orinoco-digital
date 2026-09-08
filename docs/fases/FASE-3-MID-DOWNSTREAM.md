# Fase 3 — Midstream + Downstream

> **Gate de entrada:** Fase 2 cerrada.
> **Gate de salida:** ductos y activos mid/downstream con filtros por sector,
> en movil.

**Tiempo estimado:** 2-3 semanas part-time

## Objetivo

Completar la cadena de valor: ductos como polilineas, refinerias, mejoradores,
puertos y rutas de exportacion. Filtros de capa y leyenda.

**Al cerrar esta fase tienes el MVP.** Es el punto en que el proyecto ya vale
por si solo, aunque nunca hagas las fases 4 y 5.

## Datos

| Capa | Geometria | Fuente sugerida |
|---|---|---|
| Ductos | LineString | GEM pipeline tracker + OSM (`data/raw/osm-ductos.json`) |
| Refinerias y mejoradores | Point | GEM + OSM (`data/raw/osm-refinerias.json`) |
| Puertos y terminales | Point | OSM (`data/raw/osm-terminales.json`) |

Activos venezolanos que deberian aparecer: CRP Amuay y Cardon, Puerto La Cruz,
El Palito, el complejo de Jose, los mejoradores de la Faja.

**Recordatorio ODbL:** lo derivado de OSM va en archivos `*-osm.geojson`
separados, con su atribucion. No se fusiona con el resto.

## Implementacion

- `api.js` — `getDuctos()` y `getDownstream()` ya existen.
- `map.js` — `PolylineGraphics` para ductos, con estilo por tipo (oleoducto vs
  gasoducto). Nodos para refinerias y puertos, con icono distinto al de pozo.
- `ui.js` — `montarFiltrosSector()` con checkbox por sector, y
  `montarLeyenda()`. Los filtros alternan visibilidad **sin recargar datos**.
- Rendimiento: carga perezosa por capa. Solo upstream carga al inicio.
- Si un LineString pasa de 1.000 vertices, simplificarlo.

## Prompt de arranque

```
Lee CLAUDE.md y docs/fases/FASE-3-MID-DOWNSTREAM.md.
Trabajamos la Fase 3. Anade dibujarDuctos() y dibujarDownstream() en map.js.
Los ductos como polilineas con estilo por tipo; refinerias y puertos como
nodos con icono propio. En ui.js anade filtros por sector que alternen
visibilidad sin recargar, mas una leyenda legible en movil.
Carga perezosa: solo upstream al inicio. PARA en el STOP gate.
```

## Verificacion

En movil real: los tres sectores se ven y se distinguen, los filtros ocultan y
muestran al instante, la leyenda es legible sin zoom.

## STOP GATE

- [ ] Ductos como lineas, con estilo por tipo
- [ ] Refinerias, mejoradores y puertos como nodos
- [ ] Filtros por sector funcionales
- [ ] Leyenda clara en pantalla de telefono
- [ ] Carga perezosa: no se descarga todo al inicio
- [ ] Capas OSM separadas y atribuidas
- [ ] Presupuesto de rendimiento respetado
- [ ] **MVP navegable de punta a punta**
