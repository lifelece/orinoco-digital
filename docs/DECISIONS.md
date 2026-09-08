# Registro de decisiones (ADR)

Cada decision de arquitectura queda aqui con su fecha y su razon. Si una
decision cambia, se anade un ADR nuevo que la supersede; **no se reescribe el
anterior**. El historial es el valor.

---

## ADR-001 — CesiumJS como motor de render

**Fecha:** 2026-09-08 · **Estado:** aceptada

Se evaluo Google Maps Photorealistic 3D Tiles frente a CesiumJS.

**Decision:** CesiumJS + Cesium ion Community.

**Por que:**
- Desde marzo 2025 los 3D Tiles fotorrealistas de Google son SKU Enterprise:
  1.000 eventos gratis al mes y luego se paga.
- Su cobertura fotorrealista prioriza zonas pobladas. La Faja del Orinoco es
  terreno remoto: ahi aporta poco.
- Cesium World Terrain da relieve topografico global gratis, que es exactamente
  lo que el proyecto necesita.
- CesiumJS es Apache-2.0 y es el estandar de facto de gemelos digitales
  geoespaciales.

**Consecuencia:** Google Geocoding/Places queda como ayuda opcional menor, nunca
como base del mapa.

---

## ADR-002 — `vite-plugin-static-copy`, no `vite-plugin-cesium`

**Fecha:** 2026-09-08 · **Estado:** aceptada · **Corrige** la documentacion original

La documentacion de la Fase 0 indicaba `npm i cesium vite-plugin-cesium`.

**Problema:** `vite-plugin-cesium` (nshen) esta **discontinuado desde finales de
2023**. Poner una dependencia sin mantenimiento en el cimiento del build es
deuda tecnica desde el minuto cero.

**Decision:** seguir el ejemplo oficial de CesiumGS (`cesium-vite-example`):
`vite-plugin-static-copy` copiando `ThirdParty`, `Workers`, `Assets` y `Widgets`
a `cesiumStatic/`, con `CESIUM_BASE_URL` definido via `define`.

**Consecuencia:** el `vite.config.js` es algo mas explicito, a cambio de
depender solo de plugins vivos y del patron que Cesium documenta y prueba.

---

## ADR-003 — Static-first: Supabase deja de ser obligatorio para el MVP

**Fecha:** 2026-09-08 · **Estado:** aceptada · **Matiza** el roadmap original

El roadmap situaba Supabase como Fase 4 obligatoria antes del deploy.

**Decision:** el GeoJSON versionado en Git es la **fuente de verdad** y se sirve
estatico desde el CDN. Supabase entra solo cuando exista una necesidad real:
consulta espacial dinamica, series temporales, o escrituras.

**Por que:** resuelve cuatro problemas de un golpe — los proyectos gratuitos de
Supabase pueden pausarse por inactividad; el CDN absorbe el trafico de lectura
casi gratis; los archivos cacheados rinden mejor en redes moviles; y se reduce
la superficie de escritura.

**Consecuencia:** la Fase 4 pasa a ser **opcional**. Si al llegar los datos
siguen siendo pequenos y de solo lectura, se salta y se va directo a deploy.

---

## ADR-004 — Vanilla ES6, no React

**Fecha:** 2026-09-08 · **Estado:** aceptada

**Decision:** Vanilla JS ES6 con modulos nativos + Vite.

**Por que:** coherente con el stack que el autor ya domina; menos peso en redes
moviles; una capa menos entre el codigo y Cesium, que ya es complejo por si
solo.

**Cuando reconsiderar:** si el estado de la UI se vuelve genuinamente complejo
(multiples paneles sincronizados, filtros combinados con historial navegable),
evaluar React + Resium. Sera un ADR nuevo, con su justificacion.

---

## ADR-005 — i18n desde el primer commit

**Fecha:** 2026-09-08 · **Estado:** aceptada · **Anade** lo que faltaba en Fase 0

**Decision:** `src/i18n/` con `es.json`, `en.json` y un helper `t(clave)`, sin
libreria externa, presente desde el esqueleto inicial.

**Por que:** el proyecto es bilingue ES/EN por diseno (alcance local e
internacional). Retro-adaptar i18n despues de escribir toda la UI obliga a tocar
cada cadena del proyecto. El coste hoy es de minutos; en la Fase 3, de dias.

---

## ADR-006 — La vista de tabla es accesibilidad Y fallback

**Fecha:** 2026-09-08 · **Estado:** aceptada

**Decision:** ofrecer una vista de tabla HTML semantica como alternativa al
globo 3D, construida en la Fase 2 junto con la primera capa de datos.

**Por que:** un globo 3D es completamente invisible para un lector de pantalla.
Y la misma tabla sirve de fallback ligero para conexiones lentas, que es el
escenario real de buena parte del publico objetivo. Un solo trabajo, dos
problemas resueltos.

---

## ADR-007 — Autoria con nombre real

**Fecha:** 2026-09-08 · **Estado:** aceptada

**Decision:** el proyecto se publica bajo el nombre real del autor, Luis Carlos
Vasquez, con licencia Apache-2.0 para el codigo.

**Por que:** el retorno principal del proyecto es de portafolio y marca
personal — acredita al autor ante universidades, empleadores y la comunidad
tecnica, y une su formacion en Administracion con su futura Ingenieria
Geologica. Un seudonimo anularia ese retorno.

**Condiciones que hacen aceptable el riesgo:**
- Solo se publica informacion que **ya es publica**.
- Tono tecnico y neutral: se describe la industria con datos y fuentes, sin
  postura politica.
- Nada filtrado ni propietario de PDVSA.

**Cuando reconsiderar:** si el contexto cambia de forma que la exposicion deje
de ser aceptable, un ADR nuevo puede mover el proyecto a una organizacion de
GitHub y separar la identidad. Es reversible a futuro, pero no borra lo ya
publicado: por eso la regla de "solo lo ya publico" es la proteccion real.

---

## ADR-008 — Licencias separadas para codigo y datos

**Fecha:** 2026-09-08 · **Estado:** aceptada

**Decision:** codigo bajo **Apache-2.0**; datos originales del proyecto bajo
**CC BY 4.0**; los datasets de terceros conservan su licencia de origen,
documentada dataset por dataset en `DATA_SOURCES.md`.

**Por que:** son cosas distintas con obligaciones distintas. Apache-2.0 anade
concesion expresa de patentes frente a MIT. Y mezclar datos ODbL (OpenStreetMap,
share-alike) con dominio publico (USGS) bajo una sola licencia global seria
incorrecto: ODbL impone condiciones sobre las bases de datos derivadas.

**Consecuencia:** la capa derivada de OSM se mantiene **separada e identificada**
para que su condicion share-alike no contamine el resto del dataset.

---

## ADR-009 — Contribuciones por DCO, no por CLA

**Fecha:** 2026-09-08 · **Estado:** aceptada

**Decision:** los aportes se firman con `git commit -s` (Developer Certificate of
Origin). Sin CLA.

**Por que:** un CLA exige infraestructura y friccion legal que un proyecto en
solitario no puede sostener. El DCO deja constancia de la procedencia de cada
aporte con cero infraestructura, y es lo que usan el kernel de Linux y buena
parte del ecosistema.

**Limite honesto:** el DCO no cede derechos de relicencia. Si algun dia se
quisiera relicenciar o comercializar el proyecto, habria que pedir permiso a
cada contribuyente. Se acepta ese limite a cambio de la simplicidad.
