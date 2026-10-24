# MEMORY — estado y aprendizajes

> Maximo 50 lineas. Lo actualiza la ultima tarea de cada spec y `/depurar`.
> Lo viejo se condensa, no se acumula. Historia completa: docs/PROCESO.md.

## Estado (2026-10-24)

- Produccion: orinoco-digital.vercel.app (main `aa108df`). Merge a `main` = deploy. Nada abierto en GitHub (0 PR, 0 issues).
- v1.0: fases 0-3 y 5 cerradas (2026-09-09); 4 saltada (ADR-010). Tag `v1.0` el 2026-10-24 (21bb20f); falta el DOI de Zenodo (M12): enlazar el repo en Zenodo y publicar la release.
- ExpoFaja 2026 (15-17/10) con la CCIEB: E1 modo Ciudad Bolivar, E2 micrositio `/expofaja`, E3 embed, E4.1 memoria; .ics (RF-78, #17); despejar pantalla en movil y "Ver agenda" (RF-22/23, #18); UI movil 390 px (#21). Desde el 2026-10-18 la portada vuelve a la vista nacional (`PORTADA_POR_FECHA`, `src/config.js:309`); el modo sigue en `/?modo=ciudadBolivar`.
- Identidad "instrumento de cuenca" (ADR-021) y carga diferida de Cesium (ADR-022, #11, #22): FCP 7,6 s -> 1,0 s aprox. en 4G lenta.
- Datos: `datos-semanal` (lunes, abre PR; el #20 fijo `FECHA_DATOS = "2026-10-19"`) y `noticias-ccieb` (diario). GEM sigue manual.
- `npm test`: 196/196 y `verificar:modulos` sin violaciones (2026-10-24).
- En curso: Ruta de aprendizaje (7 recorridos guiados, glosario, laboratorio; fases P0-P6). P0 cerrada el 2026-10-24: spec 003 en main (#23) con QA, gate aprobado y ADR-023 aceptado. Siguiente: P1 (piloto R5).
- Bitacoras en Notion: "Bitacora 12-13 Oct 2026" y "Bitacora 24 Oct 2026".

## Abierto (del autor)

- Gates M1, E1, E2, E3 (2026-10-13) y .ics, RF-78, RF-22/23 (2026-10-14): cerrados. ADR-020 y ADR-022 aceptados.
- Pendientes: Lighthouse movil oficial (PageSpeed sin cuota el 24/10; medido por CDP con 4G lenta y CPU x4, una carga: mapa FCP y LCP 4,48 s, `/expofaja` FCP 1,45 s y LCP 3,07 s); nombre y medio de quien autorizo en `AUTORIZACIONES.md`; mensaje E0 y PDF al webmaster (a decidir tras el evento).
- Refactor C3 (ADR-017): `src/ui/` tiene 5 modulos, pero `src/ui.js` sigue en 1.943 lineas y `src/map.js` en 1.831.

## Decisiones vigentes (no reabrir sin ADR)

- Static-first; Supabase saltado (ADR-003, ADR-010).
- Campos coloreados por hidrocarburo (ADR-012); centrales apagadas por defecto (ADR-013).
- Tests con `node:test` sin dependencias (ADR-016); gate de modulos dentro de `npm test` (ADR-019).
- Identidad (ADR-021): `tinta` nunca en marcadores ni capas de datos; colores de marca ExpoFaja/CCIEB solo en cabecera DOM y micrositio; la regla del rio sin ejes (no es un grafico).
- Carga diferida (ADR-022): el shell de UI pinta primero y `map.js` entra por `import()`.
- El "Prompt maestro" de Notion choca con el repo (Supabase, GSAP, otra estructura): manda el repo (docs/NOTION.md).

## Errores a evitar (sintoma -> causa -> como se evita)

1. Dependencia muerta en el plan -> doc de partida vieja -> verificar cada dependencia antes de escribirla.
2. Build de 5 kB -> token vacio vuelve muerto el codigo tras `if (!TOKEN) throw` -> comprobar que el bundle trae Cesium.
3. Campo llamado "pozo" -> no se leyo la doc del dataset -> leer la doc antes que los datos.
4. Refinerias ausentes en OSM -> etiquetado distinto -> contrastar con lista de activos conocidos.
5. Fluidez contra calidad -> un solo valor -> buscar la dimension que falta (camara en movimiento vs quieta).
6. Sitio caido por import faltante -> grep vio el uso, no el import -> verificar la propiedad, no una cadena.
7. Capa ausente en produccion -> archivo en .gitignore -> lo que produccion necesita se versiona.
8. `vercel.json` es JSON estricto: sin comentarios; explicar en ADR o PR.
9. Overpass: overpass-api.de corta conexiones -> rotar `OVERPASS_MIRRORS` de `scripts/descargar-fuentes.mjs`.
10. Falsos positivos OSM (fabrica de velas como instalacion petrolera) -> filtro por evidencia de hidrocarburos (DATA_SOURCES.md seccion 11).
11. "Desborde" en movil que no existe -> `msedge --headless --window-size=390,...` no emula movil (la ventana tiene ancho minimo) -> medir con CDP `Emulation.setDeviceMetricsOverride` (mobile: true).
12. La regla del rio parecia un grafico de tendencia -> eje y guias verticales -> sin ejes, marcas cortas y leyenda.
13. Medir rendimiento sin token -> Vite elimina Cesium (13 kB) -> construir con `VITE_CESIUM_TOKEN` (real o ficticio) por entorno.
