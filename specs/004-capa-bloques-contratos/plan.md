# Plan 004 — Capa "Bloques y contratos 2026"

> Spec: `specs/004-capa-bloques-contratos/spec.md` (pendiente de aprobación). Rutas verificadas con Glob/Grep el 2026-11-12 en `C:\dev\orinoco-contratos`; las marcadas `[ASI]` no se abrieron.

## 1. Enfoque

Capa nueva con núcleo puro en `src/bloques/` (estilo, filtros, frescura, cruce punto en polígono, validador), interfaz en `src/ui/` (ficha y panel de capa), dibujo en `map.js` y orquestación en `main.js`. Los datos se sirven como GeoJSON estático por `api.js` (contrato intacto: FeatureCollection). Tres decisiones lo sostienen:

1. **Interruptor gobernado por configuración, no por sondeo de red.** `config.js` exporta `CAPA_BLOQUES.activa = permisoRedistribucion || (MODO_DESARROLLO && VITE_CAPA_BLOQUES_LOCAL === "1")`. Sin permiso, un build de producción nunca muestra ni pide nada (RF-129); no hay 404 en consola. Precedente: `RUTAS_PUBLICADAS` (`src/config.js:310`).
2. **Carga al primer encendido**, fuera de `cargarCapas` (`src/main.js:156`). Es la primera capa bajo demanda real del mapa.
3. **Fixtures sintéticos y conversor local.** Los datos reales viven en `data/raw/tv-2026/` (ya ignorado, `.gitignore:14`); el conversor escribe por defecto en `data/raw/tv-2026/publicado/`, y solo con `--publicar` en `public/data/`, cuyos dos archivos quedan además en `.gitignore` hasta el permiso.

## 2. Archivos

| Ruta | Crear / Cambiar | Para qué |
|---|---|---|
| `docs/DECISIONS.md` | Cambiar | ADR-024 "M16 v2: polígonos en vez de campo_id, con gate de licencia" (Propuesto) |
| `docs/DATA_SOURCES.md` | Cambiar | §19 Transparencia Venezuela + polígonos: atribución, licencia NO confirmada, comandos, línea de permiso (vacía) |
| `.gitignore` | Cambiar | Excluir `public/data/bloques-2026.geojson` y `public/data/faja-divisiones-2026.geojson` hasta el permiso |
| `src/config.js` | Cambiar | `CAPA_BLOQUES`, `RUTAS_DATOS.bloques2026` y `.divisionesFaja`, vocabularios, `GRUPO_ESTATUS_BLOQUE`, `COLOR_CAPA_BLOQUE` |
| `src/bloques/validar.js` | Crear | Validador puro de bloques, divisiones y registros (lo usan conversor, CLI y tests) |
| `src/bloques/nucleo.js` | Crear | Puro: estilo por bloque, opciones de filtro, filtrado, conteos, corte/frescura |
| `src/bloques/cruce.js` | Crear | Puro: punto en polígono (con agujeros y MultiPolygon), campos ↔ bloques |
| `scripts/bloques-tv-a-geojson.mjs` | Crear | Conversor `data/raw/tv-2026/orinoco_capa_2026/` → esquema publicado; parser CSV propio |
| `scripts/validar-bloques.mjs` | Crear | CLI: valida `public/data/` si existe; verde con "capa no publicada" si no |
| `.github/workflows/validar-datos.yml` | Cambiar | Paso `node scripts/validar-bloques.mjs` y rutas `scripts/validar-bloques.mjs`, `src/bloques/**` |
| `scripts/verificar-modulos.mjs` | Cambiar | `src/bloques/*`: sin DOM, sin `fetch`, sin `cesium` |
| `src/api.js` | Cambiar | `getBloques2026()`, `getDivisionesFaja()` → FeatureCollection |
| `src/ui/fichaBloque.js` | Crear | HTML puro de la ficha (escapado), como `src/ui/fichaCiudad.js` |
| `src/ui/capaBloques.js` | Crear | Leyenda, filtros y contador: HTML puro + montaje de eventos |
| `src/map.js` | Cambiar | `dibujarBloques`, `dibujarDivisionesFaja`, `filtrarBloques`, `alternarBloques`, preferencia de selección |
| `src/main.js` | Cambiar | Carga diferida al encender, reintento, cruce, ficha, recorrido (RF-161) |
| `src/ui.js` | Cambiar | Interruptor condicional, despacho de ficha, renglón en ficha de campo, tabla, buscador, fuentes (cambios mínimos; lógica en `src/ui/`, ADR-017) |
| `src/i18n/es.json`, `src/i18n/en.json` | Cambiar | Claves `bloques.*` con paridad |
| `test/fixtures/bloques/` [ASI: no existe `test/fixtures/`] | Crear | `bloques-sinteticos.geojson`, `divisiones-sinteticas.geojson`, `registros-sinteticos.csv`, `crudo/` (forma cruda inventada) |
| `test/bloques-*.test.mjs`, `test/fichaBloque.test.mjs`, `test/capaBloques.test.mjs` | Crear | Ver §4 |
| `docs/ARCHITECTURE.md`, `specs/README.md`, `MEMORY.md` | Cambiar | Módulos, estado de la spec, decisiones |
| `specs/004-capa-bloques-contratos/solicitud-permiso.md` | Crear | Borrador del mensaje de permiso (lo envía Luis) |

`package.json` no se toca (los comandos se documentan como `node scripts/...`).

## 3. Contratos y datos

### 3.1 Esquema publicado (formato nuevo; lo decide el plan, se anota en ADR-024)

`bloques-2026.geojson`: FeatureCollection, `feature.id` = `properties.id`.

| Propiedad | Tipo | Origen en el crudo (`orinoco_bloques_2026.geojson`) |
|---|---|---|
| `id` | `"B\d{3}"` | `id` |
| `nombre` | string | `nombre` |
| `capa` | enum 4 | `capa` |
| `operadores_2026` | string[] | `operador_2026` partido por `;`, recortado; `"Sin registro en la tabla"` o `""` → `[]` |
| `operadores_antes_2026` | string[] | `operador_antes_2026`, mismas reglas |
| `estatus_fuente` | string \| null | `estatus` (`""` → null) |
| `estatus_norm` | enum 7 | `estatus_norm` |
| `licencia_ofac` | string \| null | `licencia_ofac`; `"Sin licencia registrada"` → null |
| `tiene_licencia_ofac` | boolean | `tiene_licencia_ofac` |
| `convenio_eeuu_vzla` | boolean | `convenio_eeuu_vzla` |
| `tipo_alianza`, `proyecto`, `pais_operador`, `producto`, `zona` | string \| null | homónimos (`""` → null) |
| `entidad_federal` | string \| null | `estado` — **se renombra**: `estado` es el estado operativo en el esquema del activo y `validate-geojson.mjs:111` lo rechazaría |
| `municipios` | string[] | `municipios` partido por `; ` |
| `area_km2` | number \| null | `area_km2` |
| `registros_vinculados` | integer | `registros_vinculados` |
| `confianza_cruce` | string | literal de la fuente (`Alta`, `Media`, `Sin cruce`…) |
| `confianza` | `alta`\|`media`\|`baja` | de `confianza_cruce`: Alta→alta, Media→media, resto→baja [ASI] |
| `fuente` | string | "Transparencia Venezuela, Mapa del negocio petrolero en Venezuela 2026 (corte 31/10/2026)" (del `metadata`) |
| `fuente_url` | https | `metadata.fuente` |
| `fuente_poligonos` | string | `metadata.poligonos` |
| `fecha_corte` | AAAA-MM-DD | `metadata.corte` |
| `ultima_verificacion` | AAAA-MM-DD | `metadata.extraido` [ASI] |

Se descartan (no los usa la ficha; ahorran peso; reversible): `campo_pdvsa`, `etiqueta_pdvsa`, `empresa_mixta_pdvsa`, `pais_socio_pdvsa`, `caracteristica`. Coordenadas redondeadas a 5 decimales (~1 m) y sin vértices consecutivos repetidos; anillos cerrados.

`faja-divisiones-2026.geojson`: `id` (`id_fpo`), `nombre` (`division` en mayúscula inicial), `area_km2`, `bloques_que_toca`, más `fuente`, `fuente_url`, `fuente_poligonos`, `confianza: "media"` [ASI], `fecha_corte`, `ultima_verificacion`.

Ningún archivo publicado contiene los registros de contratos (fuera de alcance).

### 3.2 Piezas puras (firmas)

- `src/bloques/nucleo.js`
  - `grupoEstatus(estatusNorm) → "operando"|"detenido"|"sin_operacion_registrada"`
  - `estiloBloque(props) → { colorClave: capa, relleno: "solido"|"rayado"|"tenue", borde: "continuo"|"discontinuo" }`
  - `opcionesFiltro(features) → { empresas: string[], estatus: string[], licencias: (string|null)[], convenio: [true,false] }` (ordenadas, `localeCompare("es")`)
  - `filtrarBloques(features, filtros) → Set<id>`; `filtros = { empresas:Set, estatus:Set, licencias:Set, convenio: true|false|null }`; vacío = sin filtro en esa dimensión
  - `conteoPorCapa(features, idsVisibles) → {nabep,chevron,acuerdo_2026,sin_registro}`
  - `corteDeDatos(features) → "AAAA-MM-DD"|null` (la más antigua)
- `src/bloques/cruce.js`
  - `puntoEnPoligono([lng,lat], geometry) → boolean` (ray casting, agujeros, MultiPolygon; plano lon/lat)
  - `cruzarCamposConBloques(campos, bloques, posicionDe) → { porBloque: Map<idBloque, idCampo[]>, porCampo: Map<idCampo, idBloque[]> }` (posicionDe se inyecta: `src/bloques/` no importa `data.js` si no hace falta)
- `src/bloques/validar.js`
  - `validarBloques(fc) → { errores: string[], avisos: string[] }`
  - `validarDivisiones(fc) → {errores, avisos}`
  - `validarRegistros(filas, idsBloque) → {errores, avisos, sinBloque: number}`
- `src/ui/fichaBloque.js`: `htmlFichaBloque(bloque, { campos, frescura }, { esc, t, enlaceSeguro, numero }) → string`
- `src/ui/capaBloques.js`: `htmlLeyendaBloques(conteos, t)`, `htmlFiltrosBloques(opciones, filtros, visibles, total, t)`, `montarFiltrosBloques(nodo, alCambiar)`
- `src/map.js`: `dibujarBloques(fc, estilos)`, `dibujarDivisionesFaja(fc)`, `filtrarBloques(idsVisibles)` (cambia `show` por entidad, `pedirRenderPuntual`), `alternarBloques(visible)` (vía `sincronizarEnViewer`, ADR-019)
- `src/api.js`: `getBloques2026()`, `getDivisionesFaja()` → `cargarGeoJSON(RUTAS_DATOS.…)`

### 3.3 Configuración

```
CAPA_BLOQUES = {
  permisoRedistribucion: false,      // se cambia SOLO en la tarea post-permiso (ADR-024)
  activa: <permiso || (MODO_DESARROLLO && env.VITE_CAPA_BLOQUES_LOCAL === "1")>,
  archivos: ["bloques-2026.geojson", "faja-divisiones-2026.geojson"],
}
COLOR_CAPA_BLOQUE = { nabep, chevron, acuerdo_2026, sin_registro }  // SIN VERIFICAR — paleta a aprobar por Luis
GRUPO_ESTATUS_BLOQUE = { operando: [...], detenido: [...], sin_operacion_registrada: [...] }
```
`config.js` sigue siendo el único que lee `import.meta.env`. El test de RF-160 lee `permisoRedistribucion` y `.gitignore`.

### 3.4 Validador: reglas

Errores: sin `fuente`; id que no casa `^B\d{3}$` o duplicado; `capa`/`estatus_norm` fuera de vocabulario; geometría no Polygon/MultiPolygon, anillo con < 4 posiciones o sin cerrar; alguna posición fuera de `LIMITES` de `validate-geojson.mjs:25` (todas, no solo la primera); fechas no ISO; tipos del §3.1; registro con `id_bloque` no vacío e inexistente; registro sin `referencia`. Avisos: `registros_vinculados` distinto del número de filas del CSV para ese bloque; más de 2.000 entidades.

### 3.5 Carga y estado en `main.js`

`estadoBloques: "sin_cargar" | "cargando" | "lista" | "error"`. Al encender: si `sin_cargar` o `error` → `fijarEstadoCapa("bloques","cargando")`, `Promise.all([getBloques2026(), getDivisionesFaja()])`, `soloConFuente`, cruce con `colecciones.campos` (si los campos aún no llegaron, el cruce se hace al llegar), `fijarDatosCapa`, `await mapaListo`, dibujar. Fallo → `fijarEstadoCapa("bloques","error")` + `avisarCapasFallidas(["bloques"])` y `estadoBloques = "error"`. Recorrido: guardar visibilidad al entrar, apagar, restituir al salir (mismo sitio donde hoy se guardan `capasPrevias`, `src/main.js:105`).

## 4. Trazabilidad

| RF | Dónde | Cómo se prueba |
|---|---|---|
| RF-129 | `config.js`, `ui.js`, `main.js` | `test/bloques-licencia.test.mjs` (flag); DevTools Red en build de producción (0 peticiones) |
| RF-130 | `ui.js` | DevTools + captura 390x844 con vista previa local |
| RF-131, RF-132 | `main.js` | DevTools Red: 0 peticiones antes de encender, 1 por archivo al encender, 0 al reencender |
| RF-133 | `main.js`, `ui.js` | DevTools: bloquear la URL del archivo → interruptor en error y aviso; desbloquear y reencender → carga |
| RF-134, RF-135, RF-136 | `nucleo.js` (`estiloBloque`), `map.js` | `test/bloques-nucleo.test.mjs` + captura |
| RF-137 | `map.js`, `main.js` | captura encendida/apagada |
| RF-138 | `capaBloques.js` | `test/capaBloques.test.mjs` (texto de las 9 entradas y conteos de fixture) |
| RF-139, RF-140, RF-141, RF-144, RF-145 | `fichaBloque.js`, `nucleo.js` | `test/fichaBloque.test.mjs` |
| RF-142, RF-143 | `cruce.js`, `fichaBloque.js`, `ui.js` | `test/bloques-cruce.test.mjs` (geometrías inventadas: dentro, borde, agujero, MultiPolygon, solape) |
| RF-146, RF-147, RF-148, RF-149 | `nucleo.js`, `capaBloques.js`, `main.js` | `test/bloques-nucleo.test.mjs`, `test/capaBloques.test.mjs` + DevTools |
| RF-150, RF-151 | `ui.js` | DevTools (tabla y buscador) |
| RF-152, RF-153 | `i18n/*.json`, `fichaBloque.js` | `test/i18n.test.mjs` (paridad, existente) + `test/bloques-i18n.test.mjs` (raíces prohibidas, valores literales sin traducir) |
| RF-154, RF-155 | `scripts/bloques-tv-a-geojson.mjs` | `test/bloques-conversor.test.mjs` sobre `test/fixtures/bloques/crudo/` |
| RF-156, RF-157 | `src/bloques/validar.js` | `test/bloques-validar.test.mjs` |
| RF-158 | `scripts/validar-bloques.mjs`, workflow | `test/bloques-validar.test.mjs` (spawn con y sin archivo, como `test/validador.test.mjs`) |
| RF-159 | fixtures | `test/bloques-fixtures.test.mjs` |
| RF-160 | `.gitignore`, `config.js`, DATA_SOURCES | `test/bloques-licencia.test.mjs` |
| RF-161 | `main.js` | DevTools: encender capa → abrir R5 → salir |
| RNF-1/2/3/4 | build, conversor, teléfono | T16: gzip del chunk, tamaños impresos, traza de rendimiento, Lighthouse |

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Fuga de datos reales al repo público (licencia) | Datos en `data/raw/` (ignorado); salida por defecto fuera de `public/`; archivos publicados en `.gitignore`; test RF-160; fixtures declarados sintéticos (RF-159); ni la spec ni los tests copian registros |
| Despliegue manual desde la carpeta local con el archivo ignorado | La capa no se activa en build de producción sin `permisoRedistribucion` (flag solo en `MODO_DESARROLLO`); aunque el archivo viaje, nada lo pide. Recordatorio en DATA_SOURCES §19 |
| 303 polígonos sobre terreno: TBT ya en 34 s (MEMORY) | Nada al inicio (RNF-1); geometría estática por entidad (Cesium la agrupa en primitivas de suelo); bordes con `distanceDisplayCondition` como los campos (`src/map.js:788`); medir en T16; si falla RNF-3, spec de cambio con simplificación propia |
| Relleno rayado no soportado en polígonos sobre terreno en Cesium 1.145 | Verificar `StripeMaterialProperty` en polígonos `clampToGround` con Context7 o `node_modules/cesium` antes de T13; alternativa: 3 niveles de opacidad (sólido / tenue / sin relleno con borde) — sigue sin depender del tono |
| Los bordes solo se ven de cerca y codifican la licencia | La licencia también está en ficha, tabla y filtro; la leyenda lo dice ("borde visible al acercarse") |
| Toque ambiguo campo/bloque | `map.js` prioriza la entidad no-bloque en la selección (drillPick o orden de capas) [ASI: verificar cómo selecciona `alSeleccionarActivo`, `src/map.js:642`] |
| Bloques costa afuera fuera de `LIMITES` | Se detecta en T16 con datos reales; si pasa, ventana propia para esta capa en `validar.js` (documentada) |
| Tema políticamente sensible | Rótulos neutrales fijados en spec §3, test de raíces prohibidas, sin agregados ni comentarios propios |
| `colecciones.campos` aún sin llegar al cargar bloques | El cruce se recalcula cuando llegan los campos (`alLlegarColeccion`) |
| Hook bloquea escritura en worktrees | Ya rodeado: esta spec se escribió en `C:\dev\specs\` y la mueve el Director |

## 6. Decisiones tomadas en el plan

- Flag de configuración en vez de sondeo HEAD/fetch — sin 404 en consola, sin coste en producción. Reversible: sí.
- Vista previa local solo con `MODO_DESARROLLO` + variable `.env` — permite el gate en teléfono vía `dev:host` sin publicar. Reversible: sí (pregunta 3 a Luis).
- Esquema publicado propio (arrays de operadores y municipios, `entidad_federal`, `confianza` del proyecto, campos PDVSA descartados) — evita choque con el validador y reduce peso. Reversible: sí.
- Cruce campos↔bloques en tiempo de ejecución, no en el conversor — no acopla el archivo de terceros con `campos.geojson`; 105 × 303 es barato. Reversible: sí.
- Relleno = tono por `capa` + tratamiento por grupo de estatus (3 grupos); borde = licencia — el borde solo se ve de cerca, así que la dimensión principal (capa) va en el relleno. Reversible: sí.
- Registros de contratos solo en validación local, no publicados — menos superficie de licencia y de peso. Reversible: sí (pregunta 4).
- Sin cambios en `package.json` ni dependencias.
- ADR-024 nace "Propuesto"; pasa a "Aceptado" con la aprobación de Luis; la activación post-permiso añade una constancia.

## 7. Tarea posterior al permiso (no se ejecuta en esta spec)

Rama propia: `permisoRedistribucion: true`; quitar las dos líneas de `.gitignore`; `node scripts/bloques-tv-a-geojson.mjs --publicar`; línea de permiso con fecha y alcance en DATA_SOURCES §19; `npm test` (RF-160 exige archivos válidos); constancia en ADR-024; PR. Luis mergea.
