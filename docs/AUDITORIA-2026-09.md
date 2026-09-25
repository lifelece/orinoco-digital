# Auditoria de codigo, arquitectura y experiencia — septiembre 2026

> **Fechas:** 2026-09-14 y 2026-09-15.
> **Alcance:** `src/`, datos publicados en `public/data/`, documentacion,
> produccion, y los objetivos pendientes en Notion (*Mejora v2*, *Funcionalidad
> v2* y Fase 6-7).
> **Metodo:** lectura completa del codigo, build, validador de datos y **pruebas
> en navegador** (Chrome headless con WebGL por software, 1440x900 y 390x844),
> con capturas antes y despues. Lo marcado como *verificado* se reprodujo en
> navegador; lo marcado *por lectura* no.

## Resumen

| | |
|---|---|
| Errores criticos | 7 — todos corregidos, 6 verificados en navegador |
| Errores importantes | 12 — corregidos |
| Pendientes que necesitan decision del autor | 9 |
| Build | Correcto. ~69 KB de JS propio, 22 KB gzip (limite: 150 KB) |
| Validador de datos | 0 errores |

Lo mas grave, y los tres estaban en `main`: **cerrar una ficha con la X sacaba
al visitante del sitio**, **el rio Orinoco no se dibujaba** y **un error de
carga nunca llegaba a verse**. Ninguno deja rastro visible con DevTools cerrado,
que es justo como se verifica este proyecto. Eso es lo que hay que corregir en
el metodo, no solo en el codigo: ver la seccion 6.

---

## 1. Errores criticos

| # | Error | Causa | Estado |
|---|---|---|---|
| C1 | Cerrar la ficha con la X **saca al usuario del sitio** | La X llamaba dos veces a `history.back()`: una al deseleccionar la entidad y otra por el propio boton. El estado solo se anulaba en `popstate`, que llega despues | Corregido. **Verificado**: antes la pagina acababa en `about:blank`; ahora la URL se mantiene y el gesto atras cierra la ficha |
| C2 | **La capa de rios no se dibuja**: ni Orinoco, ni Caroni, ni el embalse de Guri | Los 20 rios de Natural Earth son `MultiLineString` y el codigo los trataba como `LineString`. Cesium lanzaba `DeveloperError` al primer rio y la capa entera se abortaba. Desde el commit e2715d4 | Corregido con `lineasDe()`, aplicado tambien a ductos y limites. **Verificado**: consola limpia y rios en captura |
| C3 | **Los errores de carga son invisibles** | `mostrarError` colgaba el aviso de `#ui-root`, y `cargarCapas` llamaba a `montarUI()` justo despues, que reescribe `#ui-root`. Incumple la regla 6 | Corregido: los avisos viven en `body` y ademas cada capa muestra su error en su fila. **Verificado** |
| C4 | La vista de tabla **no tiene salida visible** | La tabla y la cabecera compartian `z-20`; la tabla, posterior en el DOM, tapaba el boton "Ver mapa" | Corregido. **Verificado** en movil |
| C5 | Con la capa DEMO encendida, **cambiar de idioma borra el banner** y la capa sigue en pantalla sin aviso | El banner colgaba de `#ui-root`. Incumple MODEL_CARD | Corregido. **Verificado**: banner, aviso y casilla sobreviven al cambio |
| C6 | Abrir la tabla con una ficha abierta la vuelve a cerrar | `deseleccionar()` disparaba `history.back()` antes de apilar la tabla | Corregido con la reescritura del historial. *Por lectura*; la ruta inversa (tabla a ficha) si esta verificada |
| C7 | Tocar una frontera o la caja de la Faja abre una ficha de "Instalacion petrolera" | Cualquier entidad con propiedades abria ficha | Corregido: solo abren ficha los tipos de `data.js` y las celdas DEMO. **Verificado**. Hallazgo de la sesion paralela |

## 2. Errores importantes, corregidos

| # | Error | Correccion |
|---|---|---|
| I1 | Capa de centrales a medias y sin commitear: codigo y GeoJSON sin entrada en `DATA_SOURCES.md` (regla 3), ADR-013 citado pero inexistente, sin cablear, 404 en produccion | Cableada, apagada por defecto, con ficha propia. `DATA_SOURCES.md` seccion 15 y ADR-013 los escribio la sesion paralela |
| I2 | **Licencia de geoBoundaries mal escrita**: CC BY 4.0 en los dos niveles | La API oficial dice ADM0 dominio publico (Natural Earth) y ADM1 CC BY 3.0 IGO (OCHA Venezuela, INE). Corregidos script, GeoJSON regenerado, interfaz y `LICENSE-DATA`. Verificado contra la API |
| I3 | geoBoundaries sin atribucion en la interfaz; `LICENSE-DATA` sin Natural Earth, geoBoundaries ni WRI | Atribucion corta en el pie y dialogo de fuentes con licencia y enlace |
| I4 | 27 centrales con confianza `media` pese a que WRI no declara CRS; la seccion 1 de `DATA_SOURCES.md` exige `baja` | Script con `CRS_DECLARADO = false`: las 43 pasan a `baja` hasta confirmar el datum |
| I5 | `notas` terminaba en un `href` sin validar el esquema: un `javascript:` seria ejecutable | Solo se enlazan URL `http(s)` |
| I6 | `<html lang>` fijo en `es` aunque la interfaz arrancara en ingles: el lector de pantalla leia ingles con voz espanola | Se fija en cada montaje |
| I7 | Encuadre inicial en movil vertical: un tercio de cielo y la Faja cortada | Inclinacion y distancia propias para pantalla vertical |
| I8 | En movil, el pie de atribuciones se montaba sobre el panel de capas y la leyenda | Nuevo shell: hoja inferior, barra de acciones y pie en capas separadas |
| I9 | Apagar una capa mientras cargaba no se respetaba: aparecia igual | `map.js` anota la visibilidad pedida y la aplica al dibujar |
| I10 | Ficha: "La fuente no publica: cuenca, bloque..." en refinerias de OSM, que no tienen ese esquema; "Ficha en GEM.wiki" en activos que no son de GEM | Los datos ausentes se piden segun el tipo; el enlace se rotula segun la fuente |
| I11 | Los estilos propios del indicador de seleccion y de los creditos perdian contra `widgets.css`, que se carga despues | Selectores colgados del id del contenedor. Detectado en captura |
| I12 | Deriva documental: `noscript` apuntaba a un `/tabla.html` inexistente; el README hablaba de "pozos" y de una "capa empresarial" que el mapa no tiene; `ARCHITECTURE.md` y `fases/README.md` desactualizados; interfaz en espanol sin tildes | Todo corregido |

## 3. Pendientes que necesitan decision del autor

| # | Pendiente | Por que no se hizo aqui | Recomendacion |
|---|---|---|---|
| P1 | **Token de Cesium sin restriccion de dominio** | Es una accion manual en ion.cesium.com | Lo primero de la lista. Pasos en `FASE-6-7-DEPLOY.md` |
| P2 | El presupuesto dice "1 capa al inicio" y se cargan 8, mas el grid DEMO (715 KB) aunque la capa DEMO nace apagada | Toca el flujo de la garantia DEMO: merece ADR | Pedir el grid al encender la capa; diferir el contexto |
| P3 | Cesium (1,13 MB gzip) va antes que cualquier interfaz | Cambia el arranque | `import()` dinamico de `map.js` despues de montar el shell |
| P4 | `ui.js` ronda las 1.100 lineas | Cambiar la estructura de modulos requiere aprobacion | Dividir en capas, ficha, buscador y tabla |
| P5 | Sin tests ni CI | Infraestructura nueva | `node --test` (sin dependencias) para `data.js` y el historial; `validate-geojson` en GitHub Actions. Es M8 de Notion |
| P6 | Sin Content-Security-Policy | Cesium ion usa varios dominios y romper produccion es facil | CSP en modo `Report-Only` primero |
| P7 | Codigo muerto: `SECTORES`, `VISTA_FAJA`, `VACIA`, `SUPABASE_*`, `usarClustering` | Algunos son marcadores deliberados | Borrar lo de la Fase 4 (saltada) y el clustering que nunca se uso |
| P8 | Datum de WRI | No lo publica ninguna fuente primaria | Preguntar a WRI o aceptar `baja` como definitivo |
| P9 | Dos sesiones de Claude implementaron M1 a la vez sobre el mismo arbol | Proceso | Una sesion por hito, o una rama o worktree por sesion |

## 4. Objetivos de Notion: estado

### Mejora v2 — Experiencia de usuario (prioridad 1)

| Hito | Estado |
|---|---|
| M1 — Shell de UI | **Implementado, pendiente del gate** en telefono real |
| M2 — Navegacion | Pendiente. Adelantado en M1: `/` para buscar y `Esc` para cerrar |
| M3 — Animacion | Pendiente. Adelantado: entrada de la ficha en 180 ms |
| M4 — Render | Pendiente |
| M5 — Activos 3D | Pendiente. Decision abierta: modelar en Blender o adaptar modelos con licencia abierta |
| M6 — Recorridos | Pendiente |
| M7 — Subsuelo | Pendiente |

Decisiones abiertas de esa pagina: la estetica se resolvio con la propuesta
(consola tecnica oscura, ADR-014). Queda abierta la de uso comercial: Cesium ion
Community es no comercial.

### Funcionalidad v2 — De mapa a monitor (prioridad 2)

M8 a M15 pendientes. De M8 ya existe el validador (`scripts/validate-geojson.mjs`),
pero no corre en CI.

### Fase 6-7 — Deploy y divulgacion

Pendientes: token restringido (P1), Lighthouse movil, material de lanzamiento
y tag `v1.0`.

## 5. Exploracion: que conviene hacer despues

Ordenado por impacto frente a esfuerzo. Nada de esto esta construido.

1. **Restringir el token** (P1). Minutos, y el riesgo es real.
2. **Cerrar el gate de M1** en telefono real con datos moviles.
3. **Deep-link `#/activo/ID`** (M2). Poco esfuerzo: el indice de activos y
   `volarAActivo()` ya existen. Cada ficha pasa a ser compartible y citable.
4. **Base oscura por defecto** (parte de M4). Bajando brillo y saturacion de la
   capa de imagen actual: sin proveedor nuevo, sin cuota y sin dependencia. El
   satelite queda como alternativa en el control de capas.
5. **Carga diferida** (P2 y P3): el shell y los datos no tienen por que esperar
   al globo, ni el grid DEMO a nadie.
6. **Menos ruido en la vista general.** Las 60 instalaciones genericas en gris
   dominan la pantalla a escala pais. Ocultarlas por encima de cierta altura o
   agruparlas.
7. **"Descargar esta vista" en GeoJSON o CSV** (*Funcionalidad v2* §5). Con la
   arquitectura static-first sale casi gratis.
8. **Plantilla de issue "Reportar dato incorrecto"** (*Funcionalidad v2* §7).
9. **Tests y CI** (P5, M8).
10. **Pulso satelital con NASA FIRMS** (M10). Es el mayor diferencial, pero
    necesita antes el pipeline (M9) y una `MAP_KEY`.

## 6. Leccion de metodo

Los tres errores criticos que llegaron a `main` tienen algo en comun: **el
codigo parecia correcto leido y la verificacion no los podia ver**. El de la X
necesita llegar desde otro sitio; el de los rios se absorbia en un
`Promise.allSettled` cuyo aviso se borraba solo; el de los avisos era
literalmente invisible.

Lo que los detecto fue ejecutar la aplicacion de verdad y comprobar cada
propiedad que importa: la URL despues de cerrar, la consola al cargar, el DOM
despues de redibujar. La propuesta de P5 es convertir esas comprobaciones en
pruebas que corran solas.

Capturas de referencia en `docs/capturas/`.
