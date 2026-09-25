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

---

## ADR-010 — La Fase 4 (Supabase) se salta

**Fecha:** 2026-09-09 · **Estado:** aceptada · **Aplica** ADR-003

ADR-003 dejo la Fase 4 como opcional y fijo cuatro criterios. Se evaluaron:

| Criterio | Resultado |
|---|---|
| Algun GeoJSON supera 2 MB | **No.** El mayor es `ductos-osm.geojson`, 847 KB. Total servido: 1,4 MB en 4 archivos |
| Hace falta consulta espacial dinamica | **No.** Ninguna funcion de `api.js` la necesita |
| Series temporales de produccion | **No.** El esquema modela estado actual |
| Escrituras desde la web | **No.** Los aportes entran por Pull Request |

**Decision:** no se hace la Fase 4. Se pasa directamente a la Fase 5.

**Por que importa:** anadir un backend que nadie necesita seria una pieza mas
que puede caerse o pausarse, mas superficie de ataque y mas mantenimiento, a
cambio de nada. La arquitectura static-first ya cubre lo que hace falta.

**Cuando reconsiderar:** en cuanto se cumpla cualquiera de los cuatro criterios.
El candidato mas probable es la primera serie temporal de produccion, o que
`ductos-osm.geojson` crezca al anadir mas trackers.

---

## ADR-011 — `prob_grid.geojson` SI se versiona

**Fecha:** 2026-09-09 · **Estado:** aceptada · **Supersede** la decision tomada
al cerrar la Fase 5

Al montar la Fase 5 se puso `public/data/prob_grid.geojson` en `.gitignore`
razonando que es salida de un modelo y no un dato de fuente, y que versionarlo
lo haria parecer un dato heredado sin procedencia.

**El problema:** Vercel despliega desde el repositorio. Un archivo ignorado no
llega a produccion. La consecuencia real de aquella decision es que **la capa
DEMO no existiria en la web publica** — solo en la maquina de quien ejecutase
el notebook. Se pierde la pieza que da nombre a la fase.

**Decision:** se versiona.

**Por que ya no aplica el razonamiento anterior:** el artefacto se describe a si
mismo. Cada una de sus 1.254 celdas lleva `demo: true`, `confianza: "baja"` y un
campo `fuente` que dice literalmente que procede de un modelo sobre datos
sinteticos y que no es un dato observado. Ademas el codigo se niega a dibujarlo
sin banner (ADR de la Fase 5, garantia en `dibujarGridProbabilidad`).

Nadie puede "heredarlo sin saber de donde sale": lo dice el propio archivo, dato
por dato.

**Condicion:** si alguna vez se regenera el grid con otro modelo o con otros
datos, se actualiza `MODEL_CARD.md` en el mismo commit. El archivo y su ficha
viajan juntos o no viajan.

---

## ADR-012 — Los campos se colorean por hidrocarburo, no por estado

**Fecha:** 2026-09-09 · **Estado:** aceptada · **Supersede** el criterio de
color de la Fase 2

La Fase 2 pinto los campos con `COLOR_ESTADO`: verde activo, amarillo inactivo,
rojo abandonado, gris sin datos.

**El problema esta en el propio dato.** De los 105 campos de GOGET:

| Estado | Campos |
|---|---|
| activo | 99 (94%) |
| inactivo | 5 |
| desconocido | 1 |

Un canal visual que reparte 94-5-1 no informa de nada: el mapa sale verde entero
y el usuario no puede leer diferencia alguna entre un campo y el de al lado.

El hidrocarburo si reparte, y ademas es lo que un mapa de esta industria tiene
que decir: **64 petroleo, 35 petroleo y gas, 6 gas**.

**Decision:** el relleno de los campos codifica el hidrocarburo. El estado pasa
a un segundo canal —relleno mas apagado y borde discontinuo cuando el campo no
esta en produccion— y sigue completo en el panel y en la tabla.

**Por que estos tonos:** ambar el petroleo y azul el gas, exactamente los mismos
que `COLOR_FLUIDO` ya usaba para los ductos. Asi el mapa se lee como un solo
sistema: un ducto azul saliendo de un campo azul se entiende sin abrir la
leyenda. Para "petroleo y gas" se usa violeta y no un verde intermedio, porque
un verde entre ambar y azul se confunde con el ambar en los tipos de daltonismo
mas frecuentes.

**Referencia externa:** es el mismo criterio que usan los mapas de divulgacion
del sector — El Orden Mundial separa "area de extraccion de petroleo" de "area
de extraccion de gas" y no cartografia el estado operativo.

**Consecuencia:** el estado deja de verse de un vistazo para los 6 campos que no
producen. Se acepta: se sigue viendo en el borde discontinuo, y se gana la
distincion que aplica a los 105.

**Cuando reconsiderar:** si una fuente futura trae estados repartidos de verdad
(por ejemplo un historico con campos cerrados), volver a evaluar cual de los dos
merece el canal principal — o permitir que el usuario elija.

---

## ADR-013 — Centrales electricas: capa propia y apagada por defecto

**Fecha:** 2026-09-10 · **Estado:** aceptada · **Registrada:** 2026-09-15 ·
**Complementa** la exclusion de `power=plant` en la Fase 3

La Fase 3 dejo las centrales electricas (`power=plant`) fuera de la capa de
OpenStreetMap: estan etiquetadas como industria, pero no son cadena de
hidrocarburos (`docs/DATA_SOURCES.md` seccion 11).

**El hueco:** sin ellas el mapa no deja ver a donde va parte de la energia del
pais. Segun la fuente usada, las 34 centrales termicas de Venezuela declaran gas
como combustible principal, y el 57% de la capacidad instalada registrada es
hidroelectrica. La cadena de hidrocarburos sola no muestra ninguno de los dos
datos.

**Decision:** entran como **contexto energetico**, no como un sector mas.

| Aspecto | Decision | Por que |
|---|---|---|
| Fuente | WRI Global Power Plant Database v1.3.0 (CC BY 4.0), no OSM | Trae tecnologia y capacidad instalada por central. Detalle en `DATA_SOURCES.md` seccion 15 |
| Capa | Propia: `centrales`, archivo `public/data/centrales.geojson`, `sector: "energia"` | Mezclada con refinerias y puertos pasaria por cadena de hidrocarburos |
| Visibilidad inicial | **Apagada** | Es contexto que se pide, no ruido que hay que apartar: el mapa ya dibuja 105 campos y 97 instalaciones |
| Color | Por tecnologia: hidroelectrica `#2dd4bf`, termica `#fb7185` | Fuera de las familias ya ocupadas —ambar el crudo, azul el gas, rojo las refinerias— para que una termica no se lea como refineria |
| Simbolo | Presa (hidroelectrica) y rayo (termica) | La tecnologia se reconoce sin abrir la ficha |
| Tamano | Raiz cuadrada de la capacidad: `ESCALA_CENTRAL` minima 0,85, maxima 1,4, referencia 3.000 MW | Ver abajo |
| Estado | Siempre `desconocido` | WRI no publica estado operativo |

**Por que raiz cuadrada.** Guri (8.851 MW) es unas 440 veces la central mas
pequena de la capa (Santa Barbara, 20 MW). En proporcion lineal, o Guri no cabe
en pantalla o el resto es invisible; con raiz cuadrada las dos se leen y el
orden se conserva. Una central sin capacidad declarada se dibuja al tamano
minimo: no se le supone un valor. En v1.3.0 las 43 traen capacidad.

**Por que el estado no se deduce.** Inferirlo del ano de puesta en marcha seria
inventar, y en el sistema electrico venezolano el estado es justamente lo mas
dudoso. Ademas WRI declara en su README que no mantiene la base desde
principios de 2022. La ficha lo advierte con `panel.centralSinEstado`: la capa
dice capacidad instalada, no si la central opera hoy.

**Lo que no se toca del dato:**
- Dos pares de centrales comparten coordenada (Planta Camejo y Punto Fijo;
  Termozulia y Termozulia II). **No se fusionan:** desde el dato no se puede
  saber si es un sitio listado dos veces o dos unidades del mismo complejo, y
  fusionar seria decidir por la fuente.
- La confianza la fija el origen de la coordenada que declara WRI, no un juicio
  propio. El CRS y el techo de confianza se discuten en `DATA_SOURCES.md`
  seccion 15.

**Como se regenera:** `npm run data:centrales`
(`scripts/centrales-to-geojson.mjs`). Con esta capa `FECHA_DATOS` paso a
2026-09-10.

**Consecuencia:** una capa mas con datos congelados. Se acepta porque la
infraestructura pesada no se mueve —una represa sigue donde estaba— y porque el
aviso de frescura va en la propia ficha.

**Cuando reconsiderar:** si aparece una base mantenida que publique estado
operativo por central, sustituye a WRI. Si WRI publica una version nueva, se
regenera con el mismo script.

---

## ADR-014 — Shell de interfaz propio: tokens, sin fuentes web, creditos armonizados

**Fecha:** 2026-09-15 · **Estado:** aceptada, pendiente del gate M1 en telefono
real (ver `docs/fases/M1-SHELL-UI.md`)

**Contexto.** La pagina de Notion *Mejora v2* pone como prioridad 1 arreglar la
experiencia antes de anadir funcionalidad, y abre con un hito M1 de shell de
UI. La auditoria del 2026-09-14 lo confirmo en captura: en movil el pie de
atribuciones se montaba sobre el panel de capas, el titulo salia truncado y el
control de capas tapaba un tercio del mapa.

**Decision.**

1. **Tokens en el `@theme` de Tailwind 4** (`style.css`), con la direccion
   "instrumento tecnico oscuro" que propone Notion: `shell`, `elev`, `trazo`,
   `hi`, `lo`, `crudo`, `gas`, `refino`, `activo`, `alerta`. Los nombres de
   Notion (`--bg-shell`, `--text-hi`...) pasan al espacio `--color-*`, que es
   el que Tailwind necesita para generar utilidades.
2. **Sin fuentes web.** Notion sugiere Inter o Geist y JetBrains Mono. Se usa
   la pila del sistema y `ui-monospace` para los numeros: una fuente web es una
   peticion y decenas de KB por cara, y el presupuesto de rendimiento se mide
   en red movil venezolana.
3. **Los colores del mapa no se tocan.** Los tokens son del chrome. Lo que
   pinta Cesium sigue en `config.js` con los criterios de ADR-012: la leyenda
   tiene que coincidir con el mapa, no con los botones.
4. **Creditos de Cesium armonizados, no reubicados ni ocultos.** Notion propone
   moverlos a un footer propio. Se descarta: el logo de ion es obligacion de
   licencia, y un contenedor propio dentro de `#ui-root` se destruiria en cada
   redibujado. Se recolorea el texto; el logo no se toca.
5. **Atribucion en dos niveles.** Pie con atribucion corta siempre visible, y
   dialogo "Fuentes y licencias" con enlace y licencia de cada fuente, que se
   alimenta de `FUENTES` en `config.js`.
6. **`amber` queda reservado** para la capa DEMO y los avisos de cautela sobre
   un dato. Un ambar decorativo le quitaria fuerza al banner DEMO.
7. **Lo que tiene que sobrevivir a un redibujado no cuelga de `#ui-root`.** Los
   avisos de error y la pantalla de carga van en `body`; el banner DEMO se
   repinta con la columna superior. Las dos cosas fallaban antes (auditoria,
   C3 y C5).

**Alternativas descartadas.** Un framework de componentes: prohibido por
ADR-004. Dividir `ui.js` en submodulos: con unas 1.100 lineas tendria sentido,
pero cambia la estructura de modulos y necesita aprobacion explicita; queda
propuesto en la auditoria.

**Consecuencias.** El JavaScript propio pasa de 41 KB a unos 69 KB (22 KB
gzip), dentro del limite de 150 KB. `CONVENTIONS.md` sustituye su seccion de
paleta por los tokens.

**Cuando reconsiderar:** si el gate en telefono real muestra texto de 10-11 px
ilegible sobre la imagen satelital, o cuando M4 traiga la base oscura y cambien
los contrastes.

---

## ADR-015 — Validador de datos en CI y plantillas de gobernanza, adelantados

**Fecha:** 2026-09-17 · **Estado:** aceptada

**Contexto.** Notion (*Funcionalidad v2*) ordena M8 "contrato de datos +
validador en CI" y M12 "gobernanza OSS" despues de los hitos de experiencia, y
el *Prompt maestro* marca M12 como "puede adelantarse". La auditoria de
septiembre (P5 y seccion 5, puntos 8 y 9) encontro que `validate-geojson.mjs`
ya falla con codigo 1 ante un registro sin `fuente`, pero **no corre en ningun
sitio automaticamente**, y que no existe forma guiada de reportar un dato
erroneo sin saber programar.

Ninguna de las dos cosas toca la aplicacion ni el contrato de `api.js`, y
ninguna depende del gate de M1.

**Decision.**

1. **`.github/workflows/validar-datos.yml`**: ejecuta el validador en cada push
   y PR que toque `public/data/`. Sin `npm install`: el validador solo usa
   modulos nativos de Node.
2. **Dependencias que entran, listadas como exige la regla 7**: ninguna en
   `package.json`. En CI se usan `actions/checkout@v4` y `actions/setup-node@v4`,
   las acciones oficiales de GitHub; no se publican con el sitio.
3. **`.github/ISSUE_TEMPLATE/dato-incorrecto.yml`**: formulario con los campos
   de `CONTRIBUTING.md` (activo, que esta mal, correccion, fuente obligatoria,
   coordenadas con su CRS). Pide el **nombre** del activo y no el `id`, porque
   la ficha muestra el nombre.
4. **`CITATION.cff`** sin `version`, `date-released` ni DOI: se anaden al
   etiquetar v1.0 y, si se hace, al archivar en Zenodo. Antes serian datos
   inventados.

**Lo que NO cubre, a proposito.** El resto de M8 —el contrato de procedencia
ampliado de Notion (`fuente_url`, `fecha_dato`, `fecha_ingesta`,
`geom_precision`, `verificado_por`)— choca con los nombres que ya usa el
proyecto (`confianza`, `ultima_verificacion`) y necesita decision. Ver
`docs/NOTION.md`.

**Verificado.** Con una copia del validador y un GeoJSON de prueba sin
`fuente`, sale con codigo 1 y el mensaje `SIN FUENTE — no puede publicarse`.
Los tres YAML parsean. El workflow no se ha ejecutado en GitHub: eso ocurre al
hacer push.

**Cuando reconsiderar:** cuando llegue M9 (pipeline con cron), este workflow se
integra en el suyo en vez de duplicarse.

---

## ADR-016 — Tests con `node:test`, sin dependencias

**Fecha:** 2026-09-25 · **Estado:** propuesta, pendiente de revision del autor

**Contexto.** La auditoria de septiembre (P5) dejo el proyecto sin tests ni CI
de codigo, y su seccion 6 explica por que importa: los tres errores criticos
que llegaron a `main` parecian correctos leidos y ninguna comprobacion
automatica los podia ver. ADR-015 puso el validador de datos en CI; el codigo
seguia sin nada.

**Decision.**

1. **`node --test`**, el runner nativo de Node, con `node:assert`. Cero
   dependencias en `package.json` (regla 7). Script: `npm test`.
2. **Que se prueba ahora** (22 tests en `test/`):
   - `data.js`: `hidrocarburoDe` (el caso "oil and gas"), el filtrado de
     `validarFeatureCollection` —incluidas geometrias `Multi*`, la causa de
     C2—, `normalizarActivo` sin inventar valores y `tieneProcedencia`.
   - Diccionarios: `es.json` y `en.json` con las mismas claves, sin valores
     vacios, y toda clave literal `t("...")` del codigo definida (regla 9).
   - Toda ruta de `RUTAS_DATOS` existe en `public/data` (el 404 de I1).
   - `validate-geojson.mjs`: pasa con los datos reales y **falla** sin
     `fuente`, fuera de Venezuela, con fecha o catalogos invalidos y con JSON
     roto. Para sembrar datos malos sin tocar `public/data`, el validador
     acepta ahora un directorio opcional como argumento.
3. **`import.meta.env` en Node.** `config.js` lo lee y en Node no existe. En
   vez de cambiar codigo de produccion, `test/entorno.mjs` registra un hook
   (`module.registerHooks`, Node 22.15+) que lo sustituye por `{}` solo al
   cargar `config.js`. El bundle no cambia.
4. **`.github/workflows/tests.yml`**: `npm test` en cada push y PR, Node 24,
   sin `npm install`.

**Lo que NO cubre, y por que.** Las dos piezas donde vivieron los errores
criticos no son testeables sin cambiar la estructura de modulos:

- El historial de vistas (C1, C6) vive dentro de `ui.js`, que al importarse
  toca el DOM y `window`.
- `lineasDe()` (C2) vive en `map.js`, que importa `cesium`.

Sacar esa logica pura a modulos propios es exactamente la decision C3 de
`docs/NOTION.md` (dividir `ui.js` y `map.js`), que requiere aprobacion. Cuando
se tome, sus tests son lo primero que hay que escribir.

**Verificado.** 22 de 22 en local (Node 24.14). Prueba de mutacion: quitar la
comprobacion del caso mixto en `hidrocarburoDe` hace fallar su test. El
workflow no se ha ejecutado en GitHub: eso ocurre al hacer push.
