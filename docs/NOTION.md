# Notion y el repositorio: indice, estado y contradicciones

> **Fecha:** 2026-09-17.
> Notion es donde se investiga y se planifica; el repositorio es donde se
> decide y se construye. **Cuando chocan, manda `CLAUDE.md`** y la diferencia
> se anota aqui hasta que un ADR la resuelva. Leer esto antes de ejecutar el
> *Prompt maestro* de Notion: varias de sus reglas contradicen decisiones ya
> tomadas en el repo.

---

## 1. Indice de paginas (IDs para el MCP de Notion)

Todas cuelgan del hub *Proyecto Orinoco Digital — Documentacion Tecnica*.

| Pagina | page_id | Ultima edicion |
|---|---|---|
| Hub — Documentacion Tecnica | `3d51848a-bfa7-814f-9ae9-f1472b06955f` | 2026-09-17 |
| Gobernanza & Anti-alucinacion | `3d51848a-bfa7-81a0-86d2-fa9e793752ca` | 2026-09-08 |
| Mejora v2 — UX, navegacion, animacion y render | `3dc1848a-bfa7-8114-a716-f997e913b24c` | 2026-09-17 |
| Sistema de Modos | `3dc1848a-bfa7-8174-9530-cfa2e06f6f66` | 2026-09-15 |
| Activos 3D sin Blender | `3dc1848a-bfa7-8105-9d83-fc15d560a687` | 2026-09-15 |
| Funcionalidad v2 — De mapa a monitor | `3dc1848a-bfa7-817d-8928-e381c5ef398a` | 2026-09-15 |
| Skillstack de diseno | `3dc1848a-bfa7-81d7-8326-ca3f0465169e` | 2026-09-15 |
| Prompt maestro para Claude Code v2 | `3dc1848a-bfa7-817e-b9c4-f817a7bfcd68` | 2026-09-17 |
| **Bitacora — estado real al 17/09/2026** | `3de1848a-bfa7-816e-a413-c05a2af0da04` | 2026-09-17 |
| Blueprint estrategico | `3d51848a-bfa7-8158-9007-dee5e48ffe4f` | 2026-09-08 |
| Antes de vibe-codear — Puntos ciegos | `3d51848a-bfa7-815c-ba8e-df7c76214db1` | 2026-09-08 |
| Soluciones practicas a los puntos ciegos | `3d51848a-bfa7-8137-ac0f-e7684a72bdc1` | 2026-09-08 |
| Sector Empresarial | `3d51848a-bfa7-81b4-a6bb-c3068e041a94` | 2026-09-08 |
| Empresas del sector (base de datos) | `fad3ac1e-ccab-4a43-a963-8027dfeab678` | 2026-09-08 |
| Fases 0 a 6-7 (planes originales) | ver hub | 2026-09-08 |

Las paginas de fase de Notion son los planes **de partida**. Los guiones
vigentes, con lo que de verdad paso, estan en `docs/fases/`.

---

## 2. Estado real frente al plan de Notion

El *Prompt maestro* §4 tenia todo como "Pendiente" y las fases 0-1 como
"verificar si estan implementadas". Esto es lo que hay:

| Bloque | Estado en el repo | Falta | Depende de |
|---|---|---|---|
| Fases 0, 1, 2, 3, 5 | **Cerradas** 2026-09-09 | — | — |
| Fase 4 (Supabase) | **Saltada**, ADR-010 | — | — |
| Fase 6-7 | Publicada | Token restringido, Lighthouse, material, tag `v1.0` | Autor |
| M1 Shell de UI | **Implementado** (ADR-014), capturas hechas | Gate en telefono real | Autor |
| M2 Navegacion | Adelantado: `/` busca, `Esc` cierra, limites de zoom | Jerarquia, breadcrumb, deep-links | Gate de M1 |
| M3 Animacion | Adelantado (ADR-018, 2026-09-29): entrada de ficha 180 ms; `countUp` de contadores del panel de capas, entrada escalonada de sus filas y `drawLine` en las muestras de linea y en el diagrama de cadena de valor, todo CSS y `prefers-reduced-motion` | Tabla de easing | M2 |
| M4 Render | `requestRenderMode` activo desde la Fase 0. Adelantado (ADR-018, 2026-09-29): base oscura por ajuste de la ImageryLayer actual, sin proveedor nuevo (resuelve C8) | Iluminacion, AO, LOD | Gate de M1 |
| M5 a M7 | Pendientes | Todo | M3 y M4 |
| N1 a N5 Modos | Pendientes | Todo | M2 |
| M8 Contrato de datos | **Validador en CI** (ADR-015) | Contrato ampliado: ver C10 | Decision |
| M9 Pipeline vivo | Pendiente | Todo | M8 |
| M10 Pulso FIRMS | Pendiente | `MAP_KEY` de FIRMS | M9 |
| M11 Capa de confianza | Adelantado: chip de frescura (M1) | Pagina `/estado-datos`, estilo por precision | M8 |
| M12 Gobernanza OSS | LICENSE, LICENSE-DATA, CONTRIBUTING, CODE_OF_CONDUCT y DCO ya existian. **Anadidos** `CITATION.cff` y plantilla de dato incorrecto (ADR-015) | DOI de Zenodo | Tag `v1.0` |
| M13 a M15 | Pendientes | Todo | Ver C1 |

---

## 3. Contradicciones que hay que resolver

Ordenadas por lo pronto que muerden. "Manda hoy" es lo que un agente debe
seguir mientras no haya ADR nuevo.

| # | Notion dice | El repo dice | Manda hoy | Propuesta |
|---|---|---|---|---|
| C1 | **Supabase + PostGIS** es stack "no negociable" (*Prompt maestro*); consultas por radio con `ST_DWithin` (*Modos* §6, *Funcionalidad v2* §4) | Static-first (ADR-003) y Fase 4 saltada (ADR-010) | Repo | Reabrir solo en M13 o N5, y medir antes: con unos 590 activos publicados, una consulta por radio en el navegador no necesita base de datos |
| C2 | "Todo string visible al usuario, en espanol" (*Prompt maestro*, regla 4) | i18n ES/EN desde el primer commit (regla 9, ADR-005) | Repo | Leerlo como "espanol primero" y corregir el prompt |
| C3 | Modulos `viewer.js`, `camera.js`, `layers.js`, `ui/*.js`, `modes/*.js`; "nada de archivos de 800 lineas" | Estructura de modulos fija sin aprobacion. Hoy `ui.js` tiene 1.742 lineas y `map.js` 1.285 | Repo | **Decidir antes de M2.** Cada hito agranda `ui.js`. Un ADR que los divida manteniendo las restricciones duras: solo el modulo del mapa importa `cesium`, la interfaz no hace `fetch` |
| C4 | GSAP + ScrollTrigger y anime.js aprobados (*Skillstack*, *Prompt maestro*) | Ninguna dependencia nueva sin listarla y justificarla (regla 7). `package.json` no tiene ninguna | Repo | M3 con CSS, que basta para lo que pide. GSAP solo si M6 lo necesita, con ADR, peso medido y `THIRD-PARTY.md`: su licencia no es OSI (*Skillstack* §4) |
| C5 | Presupuesto de menos de 250 KB de JS propio mas librerias (*Skillstack* §4) | 150 KB comprimidos de JS propio (`PERFORMANCE_BUDGET.md`) | Repo | Miden cosas distintas. Unificar cuando entre la primera libreria. Hoy: 69 KB, 22 KB gzip |
| C6 | Inter o Geist + JetBrains Mono | Sin fuentes web, pila del sistema (ADR-014) | Repo, **resuelto** | Aviso anadido en *Mejora v2* el 2026-09-17 |
| C7 | Creditos de Cesium ocultos y reubicados en un footer propio (*Mejora v2* §1.1) | Armonizados en su sitio, no reubicados (ADR-014) | Repo, **resuelto** | Aviso anadido en *Mejora v2* el 2026-09-17 |
| C8 | Base oscura con Stadia Alidade Smooth Dark (*Mejora v2* §1.4) | **Resuelto** (ADR-018, 2026-09-29): se oscurece la ImageryLayer actual (brillo/contraste/saturacion/gamma) + color base del globo y atmosfera atenuada, sin proveedor nuevo | Repo, resuelto | Un proveedor nuevo seguiria siendo una fuente nueva: `DATA_SOURCES.md`, atribucion y condiciones de uso verificadas antes |
| C9 | El modulo de IA pasa a **clasificador de estado operativo** sobre senal termica publica (hub §9-bis, *Funcionalidad v2* §2.1) | La capa DEMO sigue siendo el grid sintetico de la Fase 5 (`MODEL_CARD.md`) | Repo, con su banner | Es M14. Al sustituirlo: `MODEL_CARD` nuevo y ADR. El grid actual no se retira antes de tener reemplazo |
| C10 | Contrato de datos con `fuente_url`, `fecha_dato`, `fecha_ingesta`, `nivel_confianza`, `geom_precision`, `verificado_por` (*Funcionalidad v2* §6.3) | `fuente`, `confianza`, `ultima_verificacion`, ya usados por 9 GeoJSON, el validador y la ficha | Repo | En M8, conservar los nombres existentes y anadir solo lo nuevo. `geom_precision` es inmediato para los campos: GOGET declara la coordenada como centro aproximado de la unidad |
| C11 | Generadores 3D con `trimesh` y `pygltflib`, ETL en Python (*Activos 3D*, *Funcionalidad v2*) | Python no esta instalado en la laptop (`PLAN.md` §1.5) | — | No es contradiccion, es bloqueo: M5 y M9 tendrian que correr en GitHub Actions o Colab. `gltf-transform` y `gltfpack` serian dependencias nuevas |
| C12 | Hub §5: flujo via Supabase. Hub §10 y Fase 0: instalar `vite-plugin-cesium`. Fase 2: capa de "pozos" | Static-first; `vite-plugin-static-copy` (ADR-002); **campos**, no pozos | Repo | Marcados como superados el 2026-09-17 el hub (§5 y §10) y *Mejora v2* (§1.1 y tipografia), sin reescribirlos. Las paginas de fase originales quedan como historico |

### Decisiones abiertas que siguen en Notion

- **Estetica** (*Prompt maestro* §5.1): de hecho se aplico la consola tecnica
  oscura (ADR-014). Falta la confirmacion del autor.
- **AIS**: con etiqueta de cobertura parcial o pospuesto. Bloquea N5 y M15.
- **Uso comercial futuro**: Cesium ion Community es no comercial; el propio
  pie del mapa lo recuerda.
- **Descuento del crudo pesado**: parametro fijo o slider. Bloquea N4.
- **Modo por defecto** y **directorio de empresas publico** (*Modos* §9).
- **Alertas**: RSS primero (*Funcionalidad v2* §9).

---

## 4. Lighthouse movil, 2026-09-17

Lighthouse 12.8 con perfil movil simulado (4G lenta, CPU x4), Chrome headless
con WebGL **por software**. Ese ultimo detalle infla la evaluacion de script de
Cesium: el rendimiento absoluto es pesimista frente a un telefono con GPU. Las
causas, en cambio, son reales.

| | Produccion (v1, `e2715d4`) | Build local con M1 |
|---|---|---|
| Rendimiento | 25 | 26 |
| Accesibilidad | 96 | **100** |
| Buenas practicas | 93 | 75 (ver nota) |
| SEO | 100 | 92 (ver nota) |
| First Contentful Paint | 9,3 s | 6,8 s |
| Texto legible, 12 px o mas | 43 % | **11 %** |

Nota: `vite preview` no sirve HTTPS, gzip ni `robots.txt`. Esas bajadas son
del entorno local, no de M1.

**Lo que dice:**

1. **El item "Lighthouse movil en verde" de la Fase 6-7 no se cumple**, y no
   se va a cumplir con ajustes finos. Mas del 90 % del trabajo del hilo principal es
   `cesium.js`, y la interfaz no pinta hasta que Cesium descarga. Es P3 de la
   auditoria: `import()` dinamico del mapa despues de montar el shell. Hasta
   entonces, conviene decidir si el criterio de v1.0 es "verde" o "medido y
   documentado".
2. **M1 arreglo el unico fallo de contraste** de produccion: el boton verde de
   "Volar a la Faja".
3. **M1 empeoro la legibilidad**: casi el 90 % del texto queda por debajo de 12 px,
   sobre todo por `text-[10px]` y los creditos de Cesium a 10 px. ADR-014 ya
   preve reconsiderarlo si el telefono lo confirma: **es lo primero que mirar
   en el gate de M1**.

Los informes JSON no se versionan (pesan cerca de 1 MB cada uno). Se regeneran
con:

```bash
npx lighthouse@12 https://orinoco-digital.vercel.app --form-factor=mobile --output=json --output-path=lh.json
```

---

## 5. Bitacora en Notion

El *Prompt maestro* (regla 9) pide una bitacora en Notion al cerrar cada fase.
No se habia escrito ninguna. La primera, con todo lo hecho hasta el
2026-09-17, esta como subpagina del hub: *Bitacora — estado real al
17/09/2026* (`3de1848a-bfa7-816e-a413-c05a2af0da04`). El §4 del *Prompt
maestro* se actualizo con el estado real y lleva un aviso de conflictos antes
del prompt.
