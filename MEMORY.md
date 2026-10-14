# MEMORY — estado y aprendizajes

> Maximo 50 lineas. Lo actualiza la ultima tarea de cada spec y `/depurar`.
> Lo viejo se condensa, no se acumula. Historia completa: docs/PROCESO.md.

## Estado (2026-10-13)

- Produccion: orinoco-digital.vercel.app. Vercel conectado a GitHub desde 2026-09-29: merge a `main` = deploy.
- v1.0: fases 0-3 y 5 cerradas (2026-09-09); 4 saltada (ADR-010); 6-7 en curso: falta material de divulgacion, tag v1.0 y Lighthouse (rendimiento 25 el 2026-09-17, lastrado por Cesium).
- Token de Cesium restringido por dominio (2026-09-29).
- Mergeados el 2026-09-29: PR #1 shell de UI (ADR-014), #2 paquete visual (ADR-018), #3 controlador de render (ADR-019), #4 limpieza de falsos positivos OSM (downstream 97 -> 64).
- ExpoFaja 2026 (15-17/10) con la CCIEB, en produccion desde 2026-10-13: E1 modo Ciudad Bolivar (#6), E2 micrositio `/expofaja` (#7), E3 embed (#8), E4.1 memoria bilingue (#9). 2026-10-14: todo el programa en un .ics (RF-78, #17); despejar pantalla en movil y enlace "Ver agenda" del modo al micrositio (RF-22/23, #18). El 2026-10-18 00:00 (Caracas), por fecha y sin desplegar: el micrositio pasa a memoria y la portada vuelve a la vista nacional (`PORTADA_POR_FECHA`). Bitacora en Notion: "Bitacora 12-13 Oct 2026".
- Identidad visual "instrumento de cuenca" (ADR-021, #10) en produccion desde 2026-10-13: tokens `tinta`/`tinta-baja`, regla del rio (`public/data/regla-rio.json`, `npm run data:regla`).
- Datos automaticos (#12): workflow `datos-semanal` (lunes) y `noticias-ccieb` (diario) abren PR; GEM sigue manual. `FECHA_DATOS` lo pone `npm run data:actualizar`.
- Abierto: carga diferida de Cesium (ADR-022, #11), no mergear antes del 18/10. FCP medido 7,6 s -> 1,0 s (aprox., 4G lenta).

## Decisiones abiertas de Luis

- Gates cerrados el 2026-10-13 (Luis en telefono + QR): M1, E1, E2, E3 (codigo). ADR-020 aceptado completo. El 2026-10-14: `.ics` en telefono, RF-78 (#17) y RF-22/23 (#18).
- Pendientes de Luis: nombre y medio de quien autorizo en `AUTORIZACIONES.md` (cargo: director de la CCIEB); mensaje de seguimiento E0; PDF al webmaster y ver el embed en su web.
- Pendiente tecnico: Lighthouse movil de `/expofaja` y del mapa (cuota de PageSpeed agotada el 13/10); tag v1.0 tras #11.

## Decisiones vigentes (no reabrir sin ADR)

- Static-first; Supabase saltado (ADR-003, ADR-010).
- Campos coloreados por hidrocarburo (ADR-012); centrales apagadas por defecto (ADR-013).
- Tests con `node:test` sin dependencias (ADR-016); gate de modulos dentro de `npm test` (ADR-019).
- Identidad (ADR-021): `tinta` nunca en marcadores ni capas de datos; colores de marca ExpoFaja/CCIEB solo en cabecera DOM y micrositio; la regla del rio sin ejes (no es un grafico).
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
