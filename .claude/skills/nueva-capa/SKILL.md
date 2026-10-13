---
name: nueva-capa
description: Procedimiento para anadir una capa GeoJSON nueva al mapa siguiendo el patron de la capa de centrales (ADR-013). Usala al crear, cablear o revisar cualquier capa de datos nueva.
argument-hint: "[nombreCapa] [fuente]"
---

# Nueva capa: $0

Patron de referencia: la capa `centrales`. Localiza cada punto con
`Grep "centrales"` en el archivo indicado; no leas los archivos enteros.

1. **Fuente.** Seccion nueva en `docs/DATA_SOURCES.md`: origen, licencia, fecha, metodo, campos, limitaciones. Sin esto no se sigue.
2. **Script.** `scripts/<nombre>-to-geojson.mjs`, sin dependencias: descarga a `data/raw/`, convierte a `public/data/<nombre>.geojson` con `fuente`, `confianza`, `ultima_verificacion`, e imprime conteos y excluidos.
3. **Comando.** `"data:<nombre>"` en `package.json` (pide permiso: archivo protegido).
4. **Ejecutar** el script y `npm run data:validate`. Mostrar a Luis conteos, excluidos y peso del archivo. ⛔ Para hasta su OK.
5. **Ruta.** `RUTAS_DATOS.<nombre>` en `src/config.js`, y entrada en `FUENTES` para el dialogo "Fuentes y licencias".
6. **Datos.** `get<Nombre>()` en `src/api.js`, devolviendo FeatureCollection.
7. **Mapa.** `dibujar<Nombre>()` en `src/map.js` con `nuevaCapa(...)` e `indexar(...)`; iconos en `src/iconos.js` si hacen falta.
8. **Orquestacion.** Tupla `[nombre, get, dibujar]` en el array de capas de `src/main.js`.
9. **Interfaz.** Estado inicial, grupo, clave i18n, conteo y leyenda en `src/ui.js` (o en `src/ui/` si la capa trae interfaz propia).
10. **Textos.** Claves en `src/i18n/es.json` y `en.json` (capa, leyenda, fuente).
11. **Tests.** `test/rutas-datos.test.mjs` (la ruta existe y el archivo esta versionado) y tests de cualquier calculo nuevo en `data.js`.
12. **Verificar.** `npm test` y `npm run build`; peso del GeoJSON frente a `docs/PERFORMANCE_BUDGET.md`.
13. **Cierre.** Una linea en `MEMORY.md` si hubo algo que recordar; capturas para el PR; ⛔ gate de Luis en el telefono real.
