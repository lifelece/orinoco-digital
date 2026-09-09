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

- [x] Datos convertidos y validados (346 ductos, 97 activos downstream)
- [x] Ductos como lineas, con estilo por fluido
- [x] Refinerias, petroquimicas, puertos y parques de tanques como nodos
- [x] Filtros por sector funcionales
- [x] Capas OSM separadas y atribuidas (ODbL)
- [x] Dataset registrado en DATA_SOURCES.md (seccion 11)
- [ ] Leyenda clara en pantalla de telefono
- [ ] Carga perezosa: no se descarga todo al inicio
- [ ] Presupuesto de rendimiento respetado en movil
- [ ] **MVP navegable de punta a punta, verificado en dispositivo real**

## Decisiones tomadas en esta fase

- **Color de ductos por fluido, no por estado.** OSM no publica el estado
  operativo de los ductos; colorearlos por estado seria inventarlo.
- **Los 66 ductos sin `substance` no entran.** No son verificablemente de
  hidrocarburos. Se pierden ductos reales por prudencia, que es el lado
  correcto en el que equivocarse.
- **704 tanques agrupados en 25 parques.** Dato derivado, marcado como tal en
  el registro y con aviso ambar en el panel. Ver DATA_SOURCES.md seccion 11.
- **60 instalaciones quedan como tipo generico** en vez de llamarlas
  refinerias sin que conste que lo sean.

## Queda abierto

- Carga perezosa por capa: hoy se cargan las tres al arrancar.
- `ductos-osm.geojson` pesa 847 KB. Dentro del presupuesto de 2 MB por
  archivo, pero es el candidato numero uno a simplificar geometrias si el
  rendimiento en movil no cuadra.
- Rutas de exportacion: no hay fuente publica localizada todavia.
