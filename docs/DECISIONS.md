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

---

## ADR-017 — Dividir `ui.js` en `src/ui/`, por caracteristica, en dos pasos

**Fecha:** 2026-09-29 · **Estado:** propuesta, pendiente de revision del autor

**Contexto.** `ui.js` tiene 1.742 lineas. Notion (C3 de `docs/NOTION.md`) lo
senala igual que `docs/AUDITORIA-2026-09.md` (P4): "nada de archivos de 800
lineas", y pide decidir antes de M2 porque cada hito lo agranda mas — M2 trae
jerarquia de navegacion y deep-links, que tocan justamente el shell y el
historial. ADR-016 ya choco con esto: el historial de vistas (C1, C6) no se
pudo testear porque vive dentro de `ui.js`, que al importarse toca el DOM y
`window`.

El propio ADR-014 dejo la puerta abierta: "Dividir `ui.js` en submodulos: con
unas 1.100 lineas tendria sentido, pero cambia la estructura de modulos y
necesita aprobacion explicita; queda propuesto en la auditoria." Esta es esa
aprobacion.

**Restriccion dura que cualquier opcion debe respetar** (`CLAUDE.md`):
`ui.js` —y lo que salga de el— no importa `cesium` ni hace `fetch`. Solo
`map.js` importa Cesium; solo `api.js` hace red.

**Opciones evaluadas.**

**A. Todo junto ahora: dividir por caracteristica en `src/ui/`.** Un archivo
por seccion, ya delimitadas por los comentarios `// ---` que el archivo ya
tiene: `shell.js`, `capas.js` (control de capas + leyenda), `buscador.js`,
`ficha.js`, `tabla.js`, `fuentes.js`, `demo.js`, `carga.js`, `errores.js`,
`teclado.js`, mas `estado.js` (los `Map` y las banderas compartidas de la
seccion "Estado de la interfaz") e `historial.js` (la pila de vistas de
ADR-016). `src/ui/index.js` queda como fachada delgada: reexporta las 11
funciones que hoy importa `main.js` (`montarUI`, `fijarEstadoCapa`,
`fijarDatosCapa`, `refrescarCapas`, `avisarCapasFallidas`,
`mostrarPanelActivo`, `montarBannerDemo`, `quitarBannerDemo`,
`montarCargaInicial`, `quitarCargaInicial`, `mostrarError`) y no anade logica
propia.

- *Coste:* alto. Mueve las 1.742 lineas de una sola vez; hay que decidir que
  queda privado a cada archivo y que se comparte —`estadoCapas`,
  `datosCapas`, `panelAbierto` y el resto de banderas de "Estado de la
  interfaz" las tocan casi todas las secciones.
- *Riesgo:* alto, y del tipo que ya costo caro antes. El error 6 de
  `docs/PROCESO.md` fue exactamente esto: un simbolo que parecia importado y
  no lo estaba, dado por bueno porque `grep` encontraba la cadena. En un
  refactor mecanico de este tamano el mismo fallo es facil de repetir, y la
  pieza mas fragil —la pila de historial que causo C1 y C6— es la que mas
  modulos van a compartir.
- *Beneficio:* resuelve P4/C3 de un golpe; cada archivo queda muy por debajo
  de las ~200 lineas.

**B. Extraer solo lo que ADR-016 necesita: `estado.js` + `historial.js`.**
Las dos secciones ya estan delimitadas (`// --- Estado de la interfaz` y
`// --- Integracion con el historial del navegador`, lineas 188-340) y son
las unicas que ADR-016 senala como bloqueadas por no ser importables sin DOM.
El resto de `ui.js` sigue como esta.

- *Coste:* bajo. Unas 150 lineas movidas, limites ya claros en el propio
  archivo.
- *Riesgo:* bajo. Es la pieza mas fragil de `ui.js`, pero tambien la mas
  aislada: no dibuja nada y no importa nada externo.
- *Beneficio:* desbloquea de inmediato los tests que ADR-016 dejo pendientes
  para `apilarVista`/`desapilarVista`. No resuelve P4/C3: `ui.js` se queda en
  unas 1.600 lineas y sigue creciendo con M2.

**C. No dividir ahora.**

- *Coste:* cero hoy.
- *Riesgo:* M2 (deep-links, jerarquia de navegacion) toca shell e historial
  de lleno y anadiria lineas justo donde el archivo ya es mas largo; la
  decision que se pidio cerrar antes de M2 quedaria sin cerrar.
- Se descarta: no responde lo que se pidio decidir.

**Decision.** Combinar A y B en dos pasos, no en una sola pieza:

1. **Paso 1 (ahora; riesgo bajo; no requiere repetir el gate de M1):**
   extraer `src/ui/estado.js` y `src/ui/historial.js` como en la opcion B.
   Escribir primero sus tests — lo que ADR-016 ya dejo marcado como el
   primer paso para cuando se tomara esta decision.
2. **Paso 2 (despues de cerrar el gate de M1 en telefono real; antes de
   empezar M2):** extraer el resto por caracteristica como en la opcion A,
   dejando `src/ui/index.js` como fachada. `main.js` cambia una sola linea
   (`from "./ui.js"` pasa a `from "./ui/index.js"`); su lista de imports no
   cambia.

**Por que no todo de una vez.** El gate de M1 en telefono real —punto 3 del
Paso 0— todavia no se ha hecho. Repartir capas, buscador, ficha, tabla,
fuentes, demo, carga y errores en ocho archivos nuevos justo antes de una
verificacion pendiente mezclaria dos cosas que conviene mantener separadas:
si algo falla en el telefono, asi se sabe de entrada que no es el refactor,
porque el refactor todavia no existe. La regla 4 del estandar comun de
portafolio —"commit pequeno y frecuente"— pide lo mismo: un cambio mecanico
de 1.700 lineas no es un commit pequeno.

**Lo que esta decision NO hace.** No cambia ningun comportamiento visible, ni
toca `map.js` —la separacion de `lineasDe()`, tambien pendiente por
ADR-016, es una decision aparte. No es una refactorizacion en si: es la
aprobacion de la estructura para ejecutarla en el Paso 2, conforme a la
regla de que el codigo no se reestructura sin aprobacion explicita.

**Consecuencias.** `src/ui.js` desaparece y se convierte en el directorio
`src/ui/`, igual que ya existe `src/i18n/`. Cada archivo nuevo hereda la
restriccion dura sin excepcion: ninguno importa `cesium` ni hace `fetch`. El
presupuesto de 150 KB de JS propio no cambia: dividir en archivos no cambia
lo que sale en el bundle.

**Cuando reconsiderar.** Si al hacer el Paso 2 alguna seccion resulta mas
acoplada al estado compartido de lo que parece desde aqui —por ejemplo si
`ficha.js` y `tabla.js` terminan necesitando las mismas funciones privadas de
formato—, fusionar esas dos en vez de forzar la separacion por el nombre de
la seccion original.

---

## ADR-018 — Paquete visual: base oscura por ajuste de la capa actual (C8),
animaciones CSS (M3) y vuelo de entrada

**Fecha:** 2026-09-29 · **Estado:** propuesta, pendiente de revision del autor

**Contexto.** Luis reviso la vista previa del M1 el 2026-09-29, le gusto, y
pidio anadir cosas visualmente atractivas antes de pasar a produccion, sin
esperar al gate en telefono real ni a que M2/M3/M4 empiecen formalmente. Esto
es un adelanto acotado de dos hitos ya descritos en `docs/PLAN.md` y en
`docs/NOTION.md` (M3 Animacion, M4 Render), mas una pieza nueva —el diagrama
de cadena de valor— y el vuelo de entrada, todo dentro de las restricciones ya
vigentes: sin dependencias nuevas (regla 7 de `CLAUDE.md`), sin GSAP (C4 de
`docs/NOTION.md`), sin proveedor de teselas nuevo para la base oscura (C8), y
sin tocar la estructura de modulos mas alla de lo que ADR-014 ya dejaba
abierto para `ui.js` (el codigo nuevo va en `src/ui/`, no en el propio
`ui.js`).

**Decision.** Cuatro piezas:

1. **Base oscura ajustando la ImageryLayer actual.** `map.js` ->
   `aplicarEstiloOscuro()`: baja `brightness` (0.55), sube `contrast` (1.15),
   baja `saturation` (0.55) y `gamma` (0.85) de `viewer.imageryLayers.get(0)`
   —la capa que Cesium ya carga por defecto, la misma de siempre—, fija
   `globe.baseColor` y `scene.backgroundColor` al mismo tono que
   `--color-shell` de `style.css`, y atenua el brillo/saturacion de
   `skyAtmosphere` para que el halo de la atmosfera no desentone. La niebla
   (`scene.fog`) sigue como ya la controlaba `ajustarCalidad()` (Fase 0): no
   se ha tocado su logica de activarse/desactivarse segun movimiento y
   dispositivo, solo el color de fondo sobre el que se ve. Los colores por
   sector (`COLOR_HIDROCARBURO`, `COLOR_FLUIDO`, `COLOR_TIPO`...) no se tocan:
   siguen mas saturados que el fondo oscurecido, asi que se leen mejor, no
   peor.
2. **Animaciones de interfaz con CSS, en `src/ui/animar.js`.** `countUp` de
   los contadores del panel de capas (105 campos, 346+ ductos/terminales, 97
   instalaciones, 43 centrales) al cargar los datos, una sola vez por capa;
   entrada escalonada (`fadeUp` + `stagger` de 30 ms) de las filas del panel
   al montarse por primera vez; `drawLine` (CSS `scaleX` con
   `transform-origin: left`) en las muestras de linea de la leyenda del panel
   de capas. Todo `<=600ms` por elemento. El `countUp` es el unico que anima
   por JS (interpolar un numero no se puede hacer solo con `@keyframes` sin
   `@property`, que no todos los navegadores del publico objetivo soportan);
   respeta `prefers-reduced-motion` a mano. Lo demas es CSS puro con
   `@keyframes` en el `@theme` de `style.css`, y por eso hereda gratis la regla
   `prefers-reduced-motion` que ya existia ahi desde ADR-014.
3. **Diagrama "cadena de valor", en `src/ui/cadena.js`.** SVG en linea,
   compacto, encima de las tres filas de sector del panel de capas: tres
   nodos (Upstream, Midstream, Downstream) con el mismo color de acento que ya
   usa cada interruptor (`ACENTO` en `ui.js`: crudo, gas, refino) y su
   contador, unidos por trazo que se dibuja con `stroke-dashoffset` al
   montarse. **Decorativo** (`aria-hidden="true"`): la forma accesible de
   saber que hay tres sectores y cuantos activos tiene cada uno sigue siendo
   las tres filas de interruptores que ya existian, justo debajo. Los nombres
   de los nodos son claves i18n nuevas (`cadena.upstream/midstream/downstream`).
4. **Vuelo de entrada, en `map.js` -> `iniciarVistaConVuelo()`.** Sustituye la
   llamada a `encuadrarFaja()` (sin animacion) al arrancar por una que parte
   de una vista de continente/globo —mismo rumbo e inclinacion que el
   encuadre final, `esfera.radius * 35` de distancia— y vuela hasta el
   encuadre normal de la Faja en `CAMARA.duracionVuelo` (~3 s, la misma
   duracion que ya usa el boton "Volar a la Faja"). Se omite con
   `prefers-reduced-motion` (directo al encuadre final). Si el usuario toca el
   mapa mientras el vuelo esta en curso (`pointerdown`/`wheel`/`touchstart` en
   el canvas), se cancela con `camera.cancelFlight()` y el gesto pasa a
   manejar la camara con normalidad: un vuelo que no se puede interrumpir es
   peor que no volar. `encuadrarFaja()` se conserva tal cual, como el camino
   sin animacion (reduced motion) y porque sigue siendo la base de la que
   parte el vuelo.

**Alternativas descartadas.**

- **Proveedor de teselas oscuro nuevo (Stadia Alidade Smooth Dark, la
  propuesta original de Notion en C8 de `docs/NOTION.md`).** Un proveedor
  nuevo es una fuente nueva: entrada en `DATA_SOURCES.md`, atribucion propia y
  condiciones de uso que verificar, y una dependencia de red mas en el camino
  critico del primer render. Ajustar `brightness`/`contrast`/`saturation`/
  `gamma` de la capa que ya se carga consigue el mismo objetivo —"instrumento
  tecnico oscuro"— sin nada de eso, y es exactamente lo que C8 ya proponia
  como alternativa antes de este ADR.
- **GSAP + ScrollTrigger para las animaciones de M3 (tambien C4).** Ninguna
  de las tres piezas de animacion —`countUp`, entrada escalonada, `drawLine`—
  necesita una libreria: `@keyframes` + una interpolacion de \\~15 lineas
  cubren las tres. GSAP no es OSI (`Skillstack` §4) y anadiria peso al
  presupuesto de 150 KB comprimidos justo para lo que CSS ya resuelve.
  Reconsiderar solo si M6 (si llega a existir con ese alcance) pide una
  coreografia que CSS no pueda expresar razonablemente.
- **`countUp` tambien en CSS puro, con `@property` + `counter-reset`/
  `content`.** Tecnicamente posible en navegadores que soportan
  `@property` (Chrome/Edge recientes), pero no en todo el parque de moviles
  gama media de la red venezolana que `docs/PERFORMANCE_BUDGET.md` toma como
  objetivo real, y sin libreria de feature-detection el fallback silencioso
  seria "el numero no cuenta", peor que la solucion JS elegida.
- **Vuelo de entrada sin posibilidad de cancelar.** Un `flyToBoundingSphere`
  de 3 s que ignora al usuario mientras dura se siente como una camara
  secuestrada, justo lo contrario del tono de "instrumento" que busca el
  paquete. Cancelar al primer gesto cuesta ~10 lineas y evita ese problema
  por completo.

**Consecuencias.**

- El JS propio del bundle pasa de 68,93 KB (22,18 KB gzip) a 72,61 KB
  (23,49 KB gzip): +3,68 KB (+1,31 KB gzip). Sigue muy por debajo del limite
  de 150 KB comprimidos de `docs/PERFORMANCE_BUDGET.md`.
- Dos archivos nuevos bajo `src/ui/` (`animar.js`, `cadena.js`), enchufados
  desde `ui.js` con el minimo de cambios: import, dos claves de estado
  (`capasAnimadasUnaVez`, indices de fila) y las llamadas a las funciones que
  exportan. No es el refactor de ADR-017 ni lo sustituye: `ui.js` sigue siendo
  el unico duenio del DOM del shell.
- 10 tests nuevos en `test/animar.test.mjs` para la logica pura de
  `ui/animar.js` (`easeSalida`, `valorCountUp`, `entradaFila`,
  `claseDibujarLinea`), siguiendo el patron de ADR-016. `cadena.js` no se
  prueba en Node por la misma razon que `ui.js` no se prueba entera: importa
  `i18n/index.js`, que toca `localStorage`/`navigator` al cargarse.
  `test/i18n.test.mjs` ahora recorre `src/` de forma recursiva (antes solo el
  nivel superior) para que las claves nuevas usadas en `src/ui/*.js` tambien
  se verifiquen contra los diccionarios.
- Tres claves i18n nuevas (`cadena.upstream`, `cadena.midstream`,
  `cadena.downstream`) en `es.json` y `en.json`.
- No cambia el contrato de `api.js` ni la estructura de datos. No repite el
  gate de M1 en telefono real: sigue pendiente, y este paquete se suma encima,
  no lo sustituye.

**Cuando reconsiderar.** Si el gate en telefono real muestra que la base
oscura deja los marcadores o las etiquetas dificiles de leer sobre alguna
zona del terreno, o que el vuelo de entrada se siente lento en redes moviles
reales (los 3 s se miden en duracion de animacion, no en tiempo de descarga de
teselas, que puede solaparse). Si M3 llega formalmente y trae una tabla de
easing propia, esta base queda como punto de partida, no como version final.

---

## ADR-019 — Controlador de render con holds, capas apagadas fuera del
viewer, gate de modulos en CI y nota de licencia de datos

**Fecha:** 2026-09-29 · **Estado:** propuesta, pendiente de revision del autor

**Contexto.** Se hizo un analisis de ingenieria inversa de
`bilawalsidhu/gods-eye-view` (MIT), un globo Cesium mucho mas grande que
Orinoco (satelites/aviones/barcos en tiempo real), buscando ideas de
arquitectura, render y UX reutilizables — no datos ni funcionalidad, que no
aplican al dominio de Orinoco (ver `THIRD-PARTY.md` y el analisis completo en
`C:\dev\referencias\gods-eye-view-analisis.md`, fuera de este repositorio).
Cuatro de sus hallazgos se adoptaron, con reimplementacion propia y no copia
de codigo (la licencia MIT lo permitiria, pero el estilo y el dominio de
Orinoco son distintos):

1. Un "governor" de render con holds contados por referencia
   (`src/renderGovernor.js` de gods-eye-view).
2. Retirar del viewer, no solo ocultar, las fuentes de datos de una capa
   apagada (`src/layers/submarineCables/rendering.js` de gods-eye-view).
3. Un gate de CI sin dependencias que verifica reglas de modulos por analisis
   estatico (`scripts/check-import-directions.mjs` de gods-eye-view).
4. Una nota de licencia de datos al final del propio `LICENSE`
   (`LICENSE` de gods-eye-view).

**Decision.**

### 1. Controlador de render con holds contados por referencia

`docs/PERFORMANCE_BUDGET.md` ya documenta `requestRenderMode: true` como "la
optimizacion de mayor impacto" desde la Fase 0: sin ella, Cesium redibuja en
cada vsync aunque nadie toque el mapa. Pero un flag fijo no distingue entre
"nada se mueve" y "algo se esta animando por codigo" — el vuelo de entrada de
ADR-018, "Volar a la Faja" y volar a un activo desde el buscador necesitan
`requestRenderMode = false` mientras duran, o se ven a tirones (un frame por
evento de camara, no uno por frame de animacion). Si dos de esas animaciones
se solaparan bajo un flag booleano compartido, la que termina primero
reactivaria el modo reposo y "congelaria" a la que sigue en marcha a mitad de
vuelo — justo el problema que este ADR quiere evitar.

**Nuevo modulo `src/controladorRender.js`**, que exporta
`instalarControladorRender(viewer)`, `pedirRenderContinuo(id)`,
`liberarRenderContinuo(id)` y `pedirRenderPuntual(motivo)`. Internamente es un
`Set<string>` de ids activos: modo continuo mientras el Set no este vacio,
reposo cuando se vacia. Cada animador pide su hold al empezar y lo libera al
terminar (tanto al completar como al cancelarse), sin coordinarse con nadie
mas.

**Vive en `map.js` o en un modulo que solo `map.js` importe** (regla dura de
`CLAUDE.md`). Se opto por un archivo aparte en vez de inline: el propio modulo
NO importa `"cesium"` — opera por duck-typing sobre `viewer.scene`, asi que
`scripts/verificar-modulos.mjs` (punto 3 de este ADR) no necesita ninguna
excepcion especial para el, y se puede probar con `node:test` pasando un
objeto `{ scene: {...} }` de mentira, sin Cesium instalado ni un canvas real.
14 tests en `test/controladorRender.test.mjs`, incluido el caso de dos holds
solapados que no se pisan entre si.

**Integrado en `map.js`:** `iniciarMapa()` instala el controlador justo
despues de crear el viewer; `iniciarVistaConVuelo()`, `volarAFaja()` y
`volarAActivo()` piden un hold al iniciar su vuelo y lo liberan en `complete`
y en `cancel` (o, en `volarAActivo`, con `.finally()` sobre la promesa que
devuelve `viewer.flyTo`). Los `viewer.scene.requestRender()` sueltos que ya
existian para mutaciones puntuales (alternar una capa, asentar la calidad tras
mover la camara, alternar la capa DEMO) pasan a `pedirRenderPuntual(motivo)`,
con el motivo nombrado en vez de una llamada anonima.

**Carga de teselas: sin hold.** Cesium ya redibuja por su cuenta cuando el
terreno o la imagineria terminan de cargar, incluso en modo reposo (es como
funciona `requestRenderMode` de fabrica); anadir un hold ahi seria replicar
algo que Cesium ya hace, sin beneficio.

### 2. Retirar del viewer las capas apagadas (no solo `show = false`)

`viewer.dataSources.add(capa)` se llamaba siempre, sin condicion, en cada
funcion `dibujarX()` — incluida una capa que nace apagada (`centrales`,
`demo`). Cesium recorre cada `DataSource` del viewer en cada frame aunque
tenga `show = false` (la misma observacion, sobre su propia capa de cables
submarinos, de gods-eye-view). Con 105-346 entidades por capa el coste hoy es
marginal, pero es la practica correcta desde ya — `PERFORMANCE_BUDGET.md` ya
anticipa clustering "al pasar de ~300 puntos visibles", y esta es la version
barata de esa misma idea, aplicable hoy sin esperar a ese umbral.

**Nueva funcion `sincronizarEnViewer(capa, visible)`** en `map.js`: fija
`capa.show` y ademas anade o retira el `DataSource` de
`viewer.dataSources` segun corresponda, con `destroy=false` al retirar — las
entidades ya parseadas se quedan vivas dentro del `CustomDataSource`, que
sigue en el `Map` interno `capas`; volver a encenderla la vuelve a anadir sin
pedir el GeoJSON por red otra vez. La sustituye en `fijarVisible()` (usada por
`alternarCapa`/`alternarContexto`) y en el `viewer.dataSources.add(capa)`
final de cada `dibujarX()`, salvo una excepcion documentada abajo.

**Por que no rompe seleccion, busqueda, tabla ni contadores** (verificado
leyendo el codigo real antes de tocarlo, no solo por inspeccion superficial):

- Los contadores del panel y la tabla leen `datosCapas` en `ui.js` — el
  GeoJSON crudo guardado por `fijarDatosCapa()` al cargar, independiente de si
  el `DataSource` esta o no en el viewer.
- El buscador y la tabla nunca vuelan a un activo sin antes asegurarse de que
  su capa/sector este encendido: `irAActivo()` en `ui.js` llama
  `alternarContexto`/`alternarCapa` ANTES de `volarAActivo()` si la capa
  destino estaba apagada. Como esas funciones pasan por `fijarVisible()`, la
  capa se re-anade al viewer antes de que `map.js` intente volar a una entidad
  suya — nunca se vuela a una entidad retirada del viewer.
- La seleccion por click (`conectarSeleccion`) solo puede dispararse sobre
  algo que Cesium este pintando: una entidad de una capa retirada no era
  clickeable de todas formas cuando solo tenia `show = false` (Cesium no pinta
  ni permite pickear una entidad oculta), asi que el comportamiento visible no
  cambia.

**Excepcion documentada: la capa `"downstream"`.** Mezcla dos sectores
(refinerias/petroquimicas/puertos, que son downstream, y los parques de
tanques, que son midstream) en un mismo `CustomDataSource`, con visibilidad
decidida entidad por entidad en `aplicarSectoresMixtos()` — no existe un
`fijarVisible("downstream", ...)` que apague la capa entera, porque apagar
solo el sector downstream no deberia esconder los tanques midstream, y
viceversa. Retirar el `DataSource` completo cuando solo uno de los dos
sectores estuviera apagado esconderia tambien al otro. Por eso `downstream` se
queda con `viewer.dataSources.add(capa)` incondicional, tal como estaba, con
el riesgo documentado en el propio comentario del codigo. Es exactamente el
caso que la instruccion de este trabajo pedia detectar y documentar en vez de
forzar.

### 3. `scripts/verificar-modulos.mjs`

Script de Node sin dependencias (~90 lineas, `node:fs`/`node:path`/`node:url`
nativos) que falla con codigo 1 si: (a) algun archivo de `src/` que no sea
`map.js` importa `"cesium"` (estatico o dinamico); o (b) `src/ui.js` o
cualquier archivo de `src/ui/**` usa `fetch(`. Automatiza dos filas de la
tabla "Arquitectura modular" de `CLAUDE.md` que hasta ahora solo se vigilaban
por revision humana — y que ya causaron un error real (`docs/PROCESO.md`,
error 6: un simbolo que "parecia" importado y no lo estaba, dado por bueno con
un `grep` que no distinguia import de uso). Relevante ahora mismo porque
ADR-017 (dividir `ui.js` en `src/ui/`) va a multiplicar los archivos donde esa
regla se puede romper por accidente.

Se anadio a `npm test` (`npm test` ahora encadena
`node --test ... && npm run verificar:modulos`), que ya corre en
`.github/workflows/tests.yml` en cada push/PR — no se creo un workflow nuevo:
es la misma familia de comprobacion sin dependencias que ya vive ahi
(ADR-016). Tambien queda como comando suelto: `npm run verificar:modulos`.

**Verificado en rojo:** con un archivo temporal en `src/` con
`import { Color } from "cesium";` y otro en `src/ui/` con
`fetch("http://x")`, el script sale con codigo 1 y ambas violaciones
listadas; revertido antes de terminar (no queda archivo temporal en el
repositorio).

### 4. Nota de licencia de datos en `LICENSE`

Antes, la separacion entre licencia de codigo (Apache-2.0) y de datos (CC BY
4.0 propia + licencias de terceros) vivia en ADR-008 y en `LICENSE-DATA`,
correcta pero invisible para quien solo abre el archivo `LICENSE` — el primer
sitio donde alguien busca la licencia de un repositorio. Se anadieron unas
lineas al FINAL de `LICENSE`, despues de todo el texto Apache-2.0 (que no se
toca), remitiendo a `LICENSE-DATA` y `docs/DATA_SOURCES.md`. Reduce el riesgo
de que alguien reutilice `ductos-osm.geojson` (ODbL 1.0, share-alike) como si
fuera Apache-2.0.

**Atribucion de las ideas 1 y 3:** nuevo `THIRD-PARTY.md` en la raiz,
documentando que la idea de holds contados por referencia y la idea del gate
de modulos en CI vienen de gods-eye-view (MIT) aunque el codigo sea una
reimplementacion propia, no una copia.

**Alternativas descartadas.**

- **Copiar el codigo de gods-eye-view en vez de reimplementarlo.** Su
  licencia MIT lo permitiria conservando el aviso de copyright, pero
  `renderGovernor.js` trae diagnosticos (`recentRequests`) que Orinoco no
  necesita y `check-import-directions.mjs` analiza direcciones de import
  entre `server`/`portable`/`renderer` que no existen en un proyecto
  static-first sin backend. Reimplementar en el estilo de Orinoco (espanol,
  Vanilla ES6, sin las piezas que no aplican) da un resultado mas simple y
  mas facil de mantener por quien ya mantiene el resto del repo.
- **Aplicar `sincronizarEnViewer` tambien a `"downstream"`.** Descartado y
  documentado arriba: rompería la independencia de los dos sectores que
  comparten esa capa.
- **Anadir el chequeo de modulos como workflow de CI aparte.** Descartado:
  ya existe `tests.yml` con el mismo perfil (sin dependencias, Node nativo);
  duplicar el workflow solo anadiria mantenimiento sin beneficio.

**Consecuencias.**

- Un archivo nuevo en `src/` (`controladorRender.js`) y uno en `scripts/`
  (`verificar-modulos.mjs`), mas `THIRD-PARTY.md` en la raiz. 14 tests nuevos
  en `test/controladorRender.test.mjs`.
- `map.js` cambia como usa `requestRenderMode` y `viewer.dataSources`, pero
  no cambia ningun comportamiento visible: el vuelo de entrada, "Volar a la
  Faja" y volar a un activo se ven igual (mejor, si algo, sin tirones); las
  capas se encienden y apagan igual desde la interfaz.
- No cambia el contrato de `api.js` ni la estructura de datos. No repite el
  gate de M1 en telefono real, que sigue pendiente — el autor no pudo
  verificar el globo visualmente en esta sesion (token de Cesium en
  rotacion), asi que esta rama se revisa por diff y por los tests/build antes
  de la vista previa.

**Cuando reconsiderar.** Si una fuente futura hace crecer alguna capa mas
alla del presupuesto de entidades y hace falta LOD con presupuesto e
histeresis (la pieza B2 del analisis de gods-eye-view, `localGeojsonLod.js`),
eso es una decision de arquitectura aparte y mayor, con su propio ADR — no una
extension de este.
