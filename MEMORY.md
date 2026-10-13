# MEMORY — estado y aprendizajes

> Maximo 50 lineas. Lo actualiza la ultima tarea de cada spec y `/depurar`.
> Lo viejo se condensa, no se acumula. Historia completa: docs/PROCESO.md.

## Estado (2026-10-12)

- Produccion: orinoco-digital.vercel.app. Vercel conectado a GitHub desde 2026-09-29: merge a `main` = deploy.
- v1.0: fases 0-3 y 5 cerradas (2026-09-09); 4 saltada (ADR-010); 6-7 en curso: falta material de divulgacion, tag v1.0 y Lighthouse (rendimiento 25 el 2026-09-17, lastrado por Cesium).
- Token de Cesium restringido por dominio (2026-09-29).
- Mergeados el 2026-09-29: PR #1 shell de UI (ADR-014), #2 paquete visual (ADR-018), #3 controlador de render (ADR-019), #4 limpieza de falsos positivos OSM (downstream 97 -> 64).
- En curso: ExpoFaja 2026 (15-17/10) con la CCIEB -> `specs/001-modo-ciudad-bolivar/`. Mandatos de origen en `docs/expofaja/` (kit en el repo desde 2026-10-12). Notion tiene ademas "04 Especificacion tecnica" (firmas, contratos, consulta OSM probada): sin copiar al repo hasta que Luis la apruebe.

## Decisiones abiertas de Luis

- ADR-017, 018 y 019 aceptados por Luis el 2026-10-12. ADR-016 (node:test) sigue "propuesta" aunque se mergeo en el PR #1: [Luis: aceptarlo o no].
- `docs/fases/README.md` dice M1 "pendiente del gate"; se mergeo tras vista previa: [Luis: confirmar gate en telefono].
- ADR-020 (ExpoFaja y modo Ciudad Bolivar): propuesta.

## Decisiones vigentes (no reabrir sin ADR)

- Static-first; Supabase saltado (ADR-003, ADR-010).
- Campos coloreados por hidrocarburo (ADR-012); centrales apagadas por defecto (ADR-013).
- Tests con `node:test` sin dependencias (ADR-016); gate de modulos dentro de `npm test` (ADR-019).
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
