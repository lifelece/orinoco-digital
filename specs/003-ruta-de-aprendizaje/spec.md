# Spec 003 — Ruta de aprendizaje: recorridos guiados sobre el mapa (piloto R5)

> Estado: P1 implementada (T01, T03-T14 hechas; T02 queda con D3b pendiente de Luis), esperando el gate de Luis en su telefono real. P2-P6 sin empezar. PR contra `main` sin merge (merge = deploy).
> Peticion de Luis (literal): "busca en Notion actualizaciones pendientes; si quedan fases por hacer, empieza a desarrollarlas".
> Origen: pagina "Ruta de aprendizaje" de Notion (indice en `docs/NOTION.md`), editada 2026-10-22: §2 recorrido R5, §3 fichas, §7 soporte y esquema de escena, §8 fases, §9 prompt de P0, §10 riesgos; paginas "Sistema de Modos" (N1-N3) y "Mejora v2" (§3.4 motor de recorridos). Las fuentes publicas de cada cifra estan en §9.
> Constitucion: `docs/constitution.md`. Manda el repo sobre Notion (`docs/NOTION.md`).
> Alcance de esta spec: **fase P1 = piloto R5**. Las fases P2-P6 (R1-R4, R6, R7, glosario, fichas, laboratorio, retos) tendran RF nuevos despues del RF-128; el contrato de datos ya las prevee.
> Numeracion: la spec 001 llega a RF-23 y la 002 a RF-78 (`specs/002-micrositio-expofaja/spec.md:105`); esta spec usa RF-79 a RF-128. Los RF no se reutilizan: RF-97, RF-98, RF-99, RF-102, RF-103 y RF-104 estan **(retirados)** y sustituidos por los de la seccion "Reglas del validador" y por RF-123 a RF-125. Los RNF son locales.
> Verificacion de fuentes de R5: 2026-10-24 (ver §9). Varias paginas (spglobal.com, PwC, KPMG) no abrieron en la verificacion automatica; las filas leidas por resumen se confirman en el navegador en la tarea T02.

## 1. Contexto

El mapa muestra donde estan los campos, ductos y terminales, pero no explica como se conectan. Un estudiante o un periodista ve puntos y lineas sin entender por que el crudo de la Faja necesita diluente, por que hay plantas "mejoradoras" en José o que significa "Merey 16". Sin eso, el proyecto es un mapa de puntos y no una herramienta de divulgacion.

La pagina de Notion define 7 recorridos guiados de 5 escenas. Es el contenido que faltaba para N2 (Modo Divulgacion) y N3 (Modo Tecnico) del Sistema de Modos. Esta spec construye el **motor de recorridos** y el primer recorrido, **R5 "Del pozo extrapesado al barco en José"**, con las capas que ya existen. Cada escena mueve la camara a un lugar del dataset, enciende las capas de sector que hacen falta y cuenta lo mismo en dos voces: Divulgacion (analogia) y Tecnico (unidades y fuente).

Regla de transformacion (Notion §1): en el producto aparecen la Faja, José, Guri; no aparecen lugares de otros paises usados como ejemplo.

Lo que el repo ya tiene y esta spec reutiliza: modos declarativos con `?modo=` (`src/config.js:278`, `src/modos.js`), enlaces `?capa=`/`?vuelo=` (spec 001, RF-17/18), carga diferida de Cesium (ADR-022), gesto atras entre modos (`src/main.js:421-442`), `t(clave, params)` (`src/i18n/index.js:42`), `prefers-reduced-motion` (ADR-018), listener global de `Esc` (`src/ui.js:1925-1945`).

Lo que **no** existe y condiciona el alcance (verificado el 2026-10-24): no hay `modeStore` ni conmutador de modos (N1); no hay capa de mechurrios, de calidad de crudo, ni modo Financiero; en `public/data/` no hay mejoradores de José, ni terminal de José, ni oleoducto Junin-José identificables por nombre (el unico activo de José es `OSM-W265071557`, ver plan §2.2).

## 2. Historias de usuario

- HU-1. Como estudiante de bachillerato, quiero seguir un recorrido de 5 escenas con la camara guiada y texto sin jerga, para entender como llega el crudo de la Faja a un barco.
- HU-2. Como estudiante de ingenieria, quiero cambiar la misma escena al nivel Tecnico, con unidades, fecha y fuente de cada cifra, para citarla.
- HU-3. Como periodista, quiero ver de donde sale cada cifra y que tan segura es, para no repetir un dato dudoso.
- HU-4. Como docente, quiero compartir un enlace que abra el recorrido en una escena y nivel concretos, para usarlo en clase.
- HU-5. Como visitante con telefono y datos moviles, quiero que el recorrido no retrase la carga del mapa si no lo uso.
- HU-6. Como usuario que prefiere ingles, quiero el recorrido completo en ingles.
- HU-7. Como Luis, quiero que el motor sirva para los otros 6 recorridos y para otros proyectos sin reescribirlo.

## 3. Definiciones

- **Recorrido**: secuencia ordenada de escenas con titulo y pregunta (R1-R7). Hoy solo R5 esta publicado.
- **Recorridos publicados**: lista corta de ids (sin escenas) que vive en la configuracion y se conoce sin descargar los datos del recorrido.
- **Escena**: un paso del recorrido: camara, capas, texto en dos niveles, datos con fuente (esquema en plan §3.1).
- **Nivel**: `divulgacion` (por defecto) o `tecnico`. Es un estado del recorrido, no el modo global N1.
- **Dato de escena**: cifra, fecha, nombre o hecho verificable que aparece en un texto, con `tipo_dato`, `valor`, `unidad` (puede ser nula si el dato es cualitativo), `fuente`, `confianza` y `ultima_verificacion`.
- **Capas de sector**: `upstream`, `midstream` y `downstream`; son las unicas que una escena puede fijar.
- **Objetivo de camara**: id de un activo de `public/data/*.geojson` (o par de ids) al que apunta la escena. Nunca una coordenada escrita a mano.
- **Referencia**: marca de una escena cuyo objetivo no es el activo que el texto nombra: `esquematico` (no hay activo, p. ej. el oleoducto) o `ubicacion` (un activo cercano o un centro aproximado hace de referencia).
- **Objetivo pendiente**: el id no esta en las capas cargadas pero alguna capa en la que podria estar sigue cargando. **Objetivo ausente**: todas las capas en las que podria estar ya cargaron (o fallaron) y no esta.
- **Placeholder**: valor entre corchetes (`[fuente_pendiente]`, `[id_pendiente]`). Nunca se rellena (constitucion, principio 2).
- **Regla de transformacion**: los textos de producto no contienen ejemplos de lugares de otros paises (por ejemplo `Alberta`, `Texas`, `Mar del Norte`).

## 4. Requisitos funcionales (EARS)

Entrada y salida

- RF-79. CUANDO la URL contiene `?modo=ruta&recorrido=R5`, EL SISTEMA DEBE abrir el recorrido R5 en la escena 1 con el nivel Divulgacion.
- RF-80. SI la URL pide un recorrido que no esta publicado, ENTONCES EL SISTEMA DEBE abrir el mapa como si no hubiera `?modo=` (modo inicial segun la fecha), sin aviso y sin descargar los datos del recorrido. SI la URL trae `escena=` fuera del rango del recorrido o `nivel=` desconocido, ENTONCES EL SISTEMA DEBE ignorar ese parametro sin aviso (escena 1, nivel Divulgacion) una vez cargado el recorrido.
- RF-81. EL SISTEMA DEBE ofrecer, mientras no hay un recorrido abierto, un acceso visible "Ruta de aprendizaje" que, al pulsarlo, abre R5 en la escena 1.
- RF-82. CUANDO el usuario pulsa "Salir del recorrido" o usa el gesto atras del navegador, EL SISTEMA DEBE retirar el panel del recorrido, devolver las capas de sector al estado que tenian al entrar y volver al estado anterior de la app (modo y vista desde donde entro); si el recorrido se abrio directamente por enlace, EL SISTEMA DEBE pasar al modo inicial que corresponde a la fecha.
- RF-83. CUANDO el usuario pulsa "Terminar" en la ultima escena, EL SISTEMA DEBE salir del recorrido como en RF-82.
- RF-127. MIENTRAS hay un recorrido abierto, EL SISTEMA DEBE no mostrar los accesos ni los paneles de otros modos (por ejemplo "Ver Ciudad Bolívar") ni el acceso "Ruta de aprendizaje".
- RF-128. CUANDO la URL contiene `?modo=ruta` junto con `?capa=` o `?vuelo=`, EL SISTEMA DEBE aplicar las capas de sector de la escena (sin que `?capa=` las cambie) e ignorar `?vuelo=`.

Navegacion entre escenas

- RF-84. MIENTRAS hay un recorrido abierto, EL SISTEMA DEBE mostrar el titulo del recorrido, "Escena n de N", el texto de la escena en el nivel activo y los botones "Anterior" y "Siguiente".
- RF-85. MIENTRAS la escena actual es la 1, EL SISTEMA DEBE mostrar "Anterior" deshabilitado; MIENTRAS es la ultima, EL SISTEMA DEBE rotular "Siguiente" como "Terminar".
- RF-86. CUANDO cambia la escena, EL SISTEMA DEBE mover la camara al objetivo de la nueva escena y dejar encendidas, entre las capas de sector, exactamente las que lista la escena, sin tocar las demas capas.
- RF-87. EL SISTEMA DEBE completar el vuelo de camara de una escena en 2,5 s o menos, medidos desde el clic en "Siguiente" hasta el fin del vuelo de camara (sin contar la carga de teselas).
- RF-88. MIENTRAS el sistema operativo pide movimiento reducido, EL SISTEMA DEBE colocar la camara de la escena sin vuelo animado.
- RF-89. SI el usuario mueve la camara a mano durante un vuelo, ENTONCES EL SISTEMA DEBE cancelar el vuelo y mantener el texto y el numero de la escena.
- RF-90. CUANDO el usuario pulsa la flecha izquierda o derecha y el foco no esta en un campo de texto ni en el selector de nivel, EL SISTEMA DEBE ir a la escena anterior o a la siguiente. CUANDO el usuario pulsa Esc, EL SISTEMA DEBE cerrar la ficha, la tabla, las fuentes o la hoja de capas si alguna esta abierta (y solo esa); si ninguna lo esta, DEBE salir del recorrido.
- RF-91. CUANDO cambia la escena o el nivel, EL SISTEMA DEBE actualizar `recorrido`, `escena` y `nivel` en la URL sin anadir entradas al historial y sin perder el estado del modo, de modo que el enlace copiado reabra esa escena y nivel.

Niveles de lectura

- RF-92. EL SISTEMA DEBE ofrecer en el panel un selector "Divulgación | Técnico" con Divulgacion por defecto y mostrar, de cada escena, solo el texto del nivel activo.
- RF-93. CUANDO el usuario cambia de nivel, EL SISTEMA DEBE conservar la escena y la camara, sin vuelo ni recarga.
- RF-94. MIENTRAS el nivel es Tecnico, EL SISTEMA DEBE mostrar bajo el texto cada dato de la escena con su etiqueta, valor, unidad (si la tiene), fuente (enlace), confianza, fecha del dato, fecha de ultima verificacion y, en los datos legales, la fecha de la norma.
- RF-95. DONDE la escena tiene datos, EL SISTEMA DEBE ofrecer en ambos niveles un control "Fuentes de esta escena" que lista cada dato con su fuente; DONDE la escena no tiene datos, EL SISTEMA DEBE no mostrarlo.

Contenido

- RF-96. EL SISTEMA DEBE tomar el texto, los datos y la camara de cada escena de un archivo de datos estatico versionado, sin texto de escena en el codigo.
- RF-97 (retirado). Pasa a RF-112.
- RF-98 (retirado). Pasa a RF-113.
- RF-99 (retirado). La validacion pasa a RF-114; la muestra de la fecha de la norma, a RF-94.
- RF-100. EL SISTEMA DEBE mostrar los °API de crudos y mezclas como aproximados, con el año del dato y el aviso "varía con el diluente y el lote".
- RF-101. DONDE una escena tiene `referencia` `esquematico`, EL SISTEMA DEBE rotularla "esquemático"; DONDE tiene `referencia` `ubicacion`, EL SISTEMA DEBE rotularla "ubicación de referencia".
- RF-102 (retirado). Pasa a RF-115 y RF-116.
- RF-103 (retirado). Pasa a RF-123, RF-124 y RF-125.
- RF-104 (retirado). Pasa a RF-117.
- RF-105. SI falla la carga del archivo de recorridos o del modulo del recorrido, ENTONCES EL SISTEMA DEBE mostrar un mensaje de error visible y dejar el mapa usable.
- RF-122. SI el archivo de recorridos se carga pero no supera la validacion estructural en el navegador, ENTONCES EL SISTEMA DEBE mostrar un mensaje de error visible y no arrancar el recorrido.
- RF-111. EL SISTEMA DEBE mostrar junto a cada dato su fecha del dato y, en los datos de instalaciones (los mejoradores de José), la nota que lleva esa fecha ("instalados según Platts, 2021"); ningun texto de escena debe afirmar en presente que esas instalaciones operan.

Camara y objetivos (comportamiento en el navegador)

- RF-123. SI el objetivo de camara de una escena esta ausente, ENTONCES EL SISTEMA DEBE mostrar el texto de la escena, usar la vista de la Faja y avisar con un mensaje visible.
- RF-124. SI el objetivo de camara de una escena esta pendiente, ENTONCES EL SISTEMA DEBE mostrar el texto de la escena y esperar a que cargue la capa, sin aviso; CUANDO la capa termina de cargar, DEBE aplicar la camara de la escena actual (y, si la capa fallo, tratar el objetivo como ausente, RF-123).
- RF-125. SI el mapa 3D aun no se ha cargado cuando se abre una escena, ENTONCES EL SISTEMA DEBE mostrar el texto y, CUANDO el mapa termine de cargar, aplicar la camara y las capas de la escena en la que este el recorrido en ese momento.

Idioma y accesibilidad

- RF-106. EL SISTEMA DEBE mostrar los textos de interfaz del recorrido y el texto de cada escena en el idioma activo (ES o EN), con las mismas claves de interfaz en ambos idiomas, y, CUANDO el usuario cambia de idioma, DEBE repintar el panel conservando escena y nivel.
- RF-107. EL SISTEMA DEBE mostrar sin traducir los nombres propios (Merey 16, Petropiar, Petrocedeño, Petromonagas, Petro San Félix, Special Hamaca Blend, Zuata Sweet, Junín, José).
- RF-108. CUANDO cambia la escena, EL SISTEMA DEBE anunciarla a los lectores de pantalla sin mover el foco; los controles del panel DEBEN medir al menos 44 px y no depender de hover.
- RF-109. EN pantallas de menos de 640 px de ancho, EL SISTEMA DEBE limitar el panel a 45 % de la altura de la ventana, permitir plegarlo hasta "Escena n de N" y los botones, y encuadrar el objetivo de modo que su punto quede dentro del 60 % superior de la parte visible del mapa con el panel desplegado.
- RF-126. EN pantallas de menos de 500 px de alto (telefono horizontal), EL SISTEMA DEBE presentar el panel como hoja inferior plegable, con el mismo criterio de encuadre que RF-109.
- RF-110. EL SISTEMA DEBE descargar el modulo, la interfaz y los datos del recorrido solo cuando el usuario inicia un recorrido (acceso o URL de RF-79).

## 4b. Reglas del validador (CI)

El validador es codigo del repo que corre en `npm test` sobre `public/data/ruta/recorridos.json`. Cada regla tiene su prueba (plan §3.3).

- RF-112. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar una escena a la que le falte `id`, `orden`, `camara`, `capas`, `referencia`, el texto en ES y EN de ambos niveles, o cualquier dato sin `tipo_dato`, `valor`, `fuente`, `fuente_nombre` en ES y EN, `confianza`, `ultima_verificacion` o `fecha_dato`. El `valor` puede ser cualitativo y la `unidad`, nula; `datos` puede ser una lista vacia.
- RF-113. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar un dato cuya `fuente` sea `[fuente_pendiente]` o no sea una URL `https://`.
- RF-114. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar un dato con `tipo_dato` `legal` que no traiga `fecha_norma`.
- RF-115. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar una escena cuyo objetivo de camara (`objetivo_ref` o `entre`) no exista entre los ids de `public/data/*.geojson`.
- RF-116. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar una escena cuya lista de `capas` incluya algo distinto de las capas de sector.
- RF-117. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar un texto de escena que contenga `Alberta`, `Texas` o `Mar del Norte`.
- RF-118. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar un dato con unidad `°API` que no sea `aproximado` o no traiga `fecha_dato`.
- RF-119. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar un texto en ingles que omita un nombre propio de la lista de RF-107 que aparece en su version en español.
- RF-120. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar una escena cuyo `referencia` no sea `esquematico`, `ubicacion` o nulo.
- RF-121. CUANDO se ejecute `npm test`, EL VALIDADOR DEBE rechazar un dato con `tipo_dato` `instalacion` que no traiga `nota` en ES y EN.

## 5. Requisitos no funcionales

- RNF-1. JS propio por debajo de 150 KB gzip (`docs/PERFORMANCE_BUDGET.md`). Presupuesto propuesto de esta spec: el codigo del acceso (lista de recorridos publicados, acceso y ranuras) suma <= 2 KB gzip al chunk inicial; el chunk del recorrido (motor, controlador, panel, validacion ligera) <= 20 KB gzip. Se mide en T13 y se anota en el PR.
- RNF-2. `recorridos.json` con R5 <= 30 KB; con los 7 recorridos <= 200 KB (mismo criterio que RNF-1 de la spec 001).
- RNF-3. Sin dependencias nuevas. El motor y el validador son puros (sin DOM, sin `fetch`, sin `cesium`) y testeables con `node:test`. La interfaz del recorrido sin `cesium` ni `fetch` (`verificar:modulos`).
- RNF-4. Identidad (ADR-021): `tinta` nunca en marcadores ni capas de datos; el recorrido no introduce colores de marca ni de tercero en el mapa.
- RNF-5. Neutralidad (constitucion 9): texto descriptivo; ninguna escena de R5 emite veredicto ni postura politica; cada dato legal lleva la fecha de su norma (Notion §10).
- RNF-6. Repo publico: ningun texto del producto ni de `specs/` nombra negocios del autor ni su busqueda de empleo.
- RNF-7. Funciona en el objetivo del proyecto: laptop de 8 GB y redes moviles venezolanas (constitucion 10); gate en telefono real con DevTools cerrado.
- RNF-8. El texto de las escenas vive en el archivo de datos, bilingue, y no pasa por `t(clave)`: es una excepcion al principio 7 de la constitucion que declara ADR-023 (los textos de interfaz si pasan por `t(clave)`). La igualdad ES/EN la exige el validador.

## 6. Casos limite

| Caso | Comportamiento esperado | RF |
|---|---|---|
| `?modo=ruta` sin `recorrido=` o con `recorrido=R9` | Abre el modo inicial segun la fecha, sin descargar datos del recorrido | RF-80, RF-110 |
| `?modo=ruta&recorrido=R5&escena=9` | Escena 1 | RF-80 |
| `?modo=ruta&recorrido=R5&nivel=experto` | Divulgacion | RF-80 |
| `?modo=ruta&recorrido=R5&vuelo=OSM-R7948635&capa=ciudadBolivar` | Capas de sector de la escena; `vuelo` ignorado | RF-128 |
| Recarga a mitad del recorrido | Reabre la misma escena y nivel (la URL los lleva) | RF-91 |
| Gesto atras desde la escena 3 | Sale del recorrido (no va a la escena 2) | RF-82, RF-91 |
| Recorrido abierto desde "Ver Ciudad Bolívar" y luego salir | Vuelve al modo Ciudad Bolívar | RF-82 |
| Ficha abierta y Esc | Cierra solo la ficha; un segundo Esc sale del recorrido | RF-90 |
| Foco en el selector de nivel y flecha | La flecha no cambia de escena | RF-90 |
| El usuario enciende o apaga capas durante el recorrido | La siguiente escena vuelve a fijar las de sector | RF-86 |
| Cambio de idioma con el recorrido abierto | Repinta el panel y las ranuras; misma escena y nivel | RF-106 |
| Capa de campos aun cargando al abrir una escena | Texto visible; la camara espera a la capa, sin aviso | RF-124 |
| Capa de campos fallo o id inexistente | Texto visible; vista de la Faja y aviso | RF-123 |
| Cesium aun no cargado al abrir por URL | Texto visible; camara y capas al conectar el mapa, de la escena actual | RF-125 |
| Sin red o JSON roto al pedir `recorridos.json` | Aviso visible; mapa usable | RF-105, RF-122 |
| Escena con `[fuente_pendiente]` | El archivo no pasa `npm test`; no se publica | RF-113 |
| Escena sin datos (escena 1) | No se muestra "Fuentes de esta escena" | RF-95 |
| `prefers-reduced-motion` | Sin vuelo | RF-88 |
| Telefono vertical 390x844 | Panel <= 45 vh, plegable, objetivo en el 60 % superior | RF-109 |
| Telefono horizontal 844x390 | Hoja inferior plegable | RF-126 |
| Dato de escena con rango o mezcla | Se muestra "≈", año y aviso de variacion | RF-100 |
| Mejoradores de José | Se muestran con la fecha de la fuente (2021) y sin decir que operan hoy | RF-111 |

## 7. Fuera de alcance

- R1-R4, R6 y R7 (fases P2-P6) y sus 30 escenas.
- Glosario en linea y bloque "Por que importa" de las fichas (P3).
- Laboratorio y `petro.js` (P2); `crudos.json` y capa de calidad de crudo (P2); `hitos.geojson` (P4); esquema 3D de macolla y comparador de bombas (P5); capa de mechurrios y los 8 retos (P6).
- `modeStore`, conmutador global de modos y los modos Tecnico/Financiero/Operativo (N1-N5). El nivel del recorrido es local y se podra absorber despues (ADR-023).
- Interacciones de R5 que dependen de piezas inexistentes: capa de mechurrios (E1), animacion del flujo con trazado de oleoducto (E2), ficha del mejorador (E3), simulador de descuento del Modo Financiero (E5). Ver pregunta 3.
- Incorporar al dataset mejoradores, terminal u oleoducto de José (tarea de datos propia, con fuente y coordenada citadas; ver pregunta 2).
- Rutas de exportacion maritimas dibujadas; ninguna geometria sin fuente.
- La afirmacion "transferencia de custodia = medicion fiscal" (sin fuente publica hallada; D10) y la de que la nafta es "casi toda importada" (D1b, sin fecha verificada): no entran en P1.
- Cambios en `vercel.json`: `/data/ruta/recorridos.json` usa la cache por defecto de Vercel (sin regla `Cache-Control` propia) en P1.
- Medicion de uso, cuentas, progreso guardado, insignias.
- Embeber el recorrido en otras webs.

## 8. Criterios de aceptacion

- [ ] Tests: motor (enlace, navegacion, niveles, resolucion de objetivos con estados ok/pendiente/ausente, encuadre), validador (un caso invalido por regla RF-112 a RF-121), archivo real de R5 (ids existen en los GeoJSON, capas de sector, ES/EN completos, sin placeholders, sin ejemplos foraneos, nombres propios), `modoPedido`, claves i18n iguales en ES y EN.
- [ ] `npm test`, `npm run data:validate` y `npm run build` en verde.
- [ ] RNF-1 y RNF-2 medidos y anotados en el PR; RF-87 medido segun su definicion.
- [ ] Capturas antes/despues en `docs/capturas/r5-*` (escritorio, movil vertical y horizontal, ES y EN, ambos niveles).
- [ ] Toda cifra de las 5 escenas trazable a una fuente abierta y verificada en el navegador, o retirada del texto (RF-113).
- [ ] Luis: telefono real, datos moviles, DevTools cerrado: acceso, 5 escenas en los dos niveles, enlaces con `escena=`, atras, Esc, EN, reduced-motion, y una persona ajena al tema que entienda el recorrido sin explicacion (gate de N2).

## 9. Contenido propuesto de R5 (anexo para aprobar)

Textos de Notion §2 (R5) con las correcciones que impuso la verificacion de fuentes (2026-10-24) y la revision de la spec. La traduccion al ingles se redacta en la tarea T06 y Luis la revisa en el gate. Los textos Tecnico citan los datos de la segunda tabla.

| Esc. | Objetivo de camara y `referencia` | Capas | Divulgacion | Tecnico |
|---|---|---|---|---|
| 1 | `GEM-L100000320738` (Junin 6; centro aproximado del campo, no una macolla). `referencia: ubicacion`. Sin datos | upstream | «Del pozo, el crudo llega a una "estación de flujo", donde se separa del agua y del gas.» | Separador trifásico por gravedad y medición; el gas va a recolección o al mechurrio. |
| 2 | Encuadre entre `GEM-L100000320738` y `OSM-W265071557`; sin trazado. `referencia: esquematico` | upstream, midstream | «Para viajar por tubería hay que mezclarlo con un líquido más ligero: el diluente.» | Diluente = nafta (en enero de 2026 se cargó el primer cargamento bajo un acuerdo de suministro con el gobierno estadounidense) o crudos livianos como Mesa y Santa Bárbara en la mezcla final. D1a, D2 |
| 3 | `OSM-W265071557` (Complejo Petroquimico José Antonio Anzoategui; no es un mejorador). `referencia: ubicacion` | midstream, downstream | «En José hay dos caminos: mezclarlo y venderlo como Merey 16, o "mejorarlo" en plantas gigantes que lo vuelven más liviano. Según Platts (2021), allí están instaladas cuatro plantas de este tipo.» | Merey 16: ≈16° API y ≈3,4 % de azufre (Platts, 2026). Según Platts (2021), en José hay cuatro mejoradores instalados: Petropiar, Petrocedeño, Petromonagas y Petro San Félix. Entonces PDVSA ofrecía Special Hamaca Blend (17,2° API) y Zuata Sweet (≈22° API). D3, D3b, D4, D5, D6 |
| 4 | `OSM-W265071557` (el terminal no esta en el dataset). `referencia: ubicacion` | midstream, downstream | «Del terminal sale en tanqueros hacia refinerías de otros países.» (si se nombra el terminal: "terminal de José, en el Complejo Industrial José Antonio Anzoátegui", hasta confirmar su nombre oficial) | Desde la reforma de la Ley Orgánica de Hidrocarburos (Gaceta Oficial Extraordinaria N.º 6.978, 29/01/2026), la ley establece una regalía de hasta 30 % sobre los volúmenes extraídos (art. 51) y un impuesto integrado de hasta 15 % sobre la base imponible (sus artículos entran en vigor 60 días después de la publicación); el Ejecutivo fija el porcentaje por proyecto. D7, D8 |
| 5 | Vista de la Faja (`vista: faja`), sin rutas dibujadas. `referencia: null` | upstream, midstream, downstream | «Un crudo pesado y con azufre se paga más barato: cuesta más refinarlo.» | Desde el 31/03/2026 Platts publica una evaluación diaria del Merey 16 entregado en la Costa del Golfo de EE.UU. (DAP USGC), en precio absoluto y como diferencial contra Brent y WTI. D9 |

Cambios sobre Notion: (a) diluente: "bajo un acuerdo de suministro con el gobierno estadounidense" y no "bajo licencias" (la fuente no menciona licencia para ese envio), y se retira "casi toda importada" (D1b); (b) escena 4: la regalia va sobre volumenes y el impuesto integrado sobre la base imponible, no ambos sobre el "volumen fiscalizado", con la vigencia del impuesto; se retira "transferencia de custodia = medicion fiscal" (D10) y la oracion no se reemplaza; (c) escena 5: Platts cotiza en precio absoluto y como diferencial; (d) escena 3: los mejoradores se presentan como instalados segun Platts (2021) en ambos niveles (se añade una frase a la Divulgacion de Notion) y se retira la cifra de diseño de Zuata Sweet por no tener fuente en esta spec; (e) la interaccion de las escenas 1, 2, 3 y 5 no se implementa en P1 (pregunta 3); (f) cuando exista el enlace "detalle tecnico", se escribe "¿Quieres…" y no "¿Querés…" (tuteo).

Datos de R5 y su fuente (verificacion del 2026-10-24; "directa" = pagina leida; "resumen" = leida en un resumen de busqueda porque la pagina no abrio, cita parafraseada). Todos pasan por T02 (confirmar en navegador las filas "resumen" y copiar a `docs/DATA_SOURCES.md` §18). `tipo_dato`: cifra, legal, instalacion o cualitativo.

| Id | Esc. | `tipo_dato` | Dato | Fuente (medio, fecha) y URL | Lectura | Estado |
|---|---|---|---|---|---|---|
| D1a | 2 | cualitativo | Primer cargamento de nafta (diluente) bajo un acuerdo de suministro con el gobierno de EE.UU., cargado el 11/01/2026 | Reuters via Hydrocarbon Processing, 12/01/2026: `https://hydrocarbonprocessing.com/news/2026/01/vitol-to-load-first-diluent-cargo-under-venezuela-supply-deal-last-weekend/` | directa | confirmado. La parte "bajo licencias" no se confirma y se retira |
| D1b | 2 | cualitativo | La nafta es casi toda importada de EE.UU. | Argus: `https://www.argusmedia.com/es/news/1936642-pdv-to-tap-fractionator-to-replace-imported-naphtha` | resumen; fecha del articulo no verificada | **retirado** hasta que T02 verifique su fecha; entonces pasa a dato con su `fecha_dato` |
| D2 | 2 | cualitativo | Mesa y Santa Bárbara como livianos usados en la mezcla en José | Argus, 2019: `https://www.argusmedia.com/en/news/1900583-pdv-halts-upgrading-plots-shift-to-blending` | resumen | confirmado como mezcla en José (no necesariamente diluente del oleoducto): el texto dice "en la mezcla final" |
| D3 | 3 | cifra | Merey 16 ≈16 °API (aproximado, 2026) | S&P Global Platts, nota 31/03/2026: `https://www.spglobal.com/energy/en/pricing-benchmarks/our-methodology/subscriber-notes/033126-platts-launches-assessments-of-merey-16-dap-usgc`; refuerzo: Argus 2019 ("16°API Merey") | resumen (spglobal dio 403) | confirmado, por verificar en navegador |
| D3b | 3 | cifra | Merey 16 ≈3,4 % de azufre | Platts, misma nota que D3 | resumen | confirmado, por verificar en navegador |
| D4 | 3 | instalacion | Cuatro mejoradores instalados en José: Petropiar, Petrocedeño, Petromonagas, Petro San Félix (fecha del dato: 2021) | S&P Global Platts, 13/09/2021 (copia en Hellenic Shipping News): `https://www.hellenicshippingnews.com/?p=886251`; Argus 2019: `https://www.argusmedia.com/pt/news-and-insights/latest-market-news/1883734-two-pdv-upgraders-to-restart-by-tomorrow` | directa (Hellenic); resumen (Argus) | confirmado como instalados; **estado operativo actual NO confirmado** (Argus 2019: tres se reconvirtieron a mezcla; Platts 2021: Petrocedeño reinicio el 29/06/2021). La `nota` visible lo dice con su fecha (RF-111) |
| D5 | 3 | cifra | Special Hamaca Blend 17,2 °API (aproximado, 2021) | Platts 13/09/2021, misma URL de D4: "17.2 degree API Special Hamaca Blend (SHB) crude" | directa | confirmado |
| D6 | 3 | cifra | Zuata Sweet ≈22 °API (aproximado, 2021) | Platts 13/09/2021, misma URL de D4: "22 degree API synthetic crude called Zuata Sweet" | directa | confirmado. Sin cifra de diseño: no tiene fuente en esta spec |
| D7 | 4 | legal | Regalía de hasta 30 % sobre los volúmenes extraídos (art. 51, antes 44); `fecha_norma` 2026-01-29, Gaceta Oficial Extraordinaria N.º 6.978 | Acceso a la Justicia (texto de la ley): `https://accesoalajusticia.org/ley-de-reforma-de-la-ley-organica-de-hidrocarburos/`; Finanzas Digital, 03/02/2026: `https://finanzasdigital.com/reforma-ley-hidrocarburos-2026/`; PwC Venezuela (resumen) | directa; resumen (PwC) | confirmado |
| D8 | 4 | legal | Impuesto integrado de hasta 15 % sobre la base imponible; `fecha_norma` 2026-01-29; vigencia de sus articulos: 60 dias despues de la publicacion (arts. 55 a 57 segun el texto de la ley; Finanzas Digital cita 55 a 59) | Acceso a la Justicia y Finanzas Digital (mismas URL de D7). Finanzas Digital parafrasea "ingresos brutos"; el texto de la ley dice "base imponible" y es el que se usa | directa | confirmado; articulos por unificar en T02 (el texto de escena no cita articulos del impuesto) |
| D9 | 5 | cualitativo | Platts publica el Merey 16 DAP USGC desde 31/03/2026, en precio absoluto y como diferencial contra Brent y WTI | Platts, nota 31/03/2026 (misma URL de D3) | resumen | confirmado, por verificar en navegador |
| D10 | 4 | — | "Transferencia de custodia = medición fiscal" en José | [fuente_pendiente] (sin fuente publica hallada; lo mas cercano, Argus 2018 y Forvis Mazars, no habla de medicion fiscal en José) | — | **no confirmado: no se publica** |

Opcional (no entra en P1 salvo que Luis lo pida): desde 05/10/2026 Platts tambien publica Merey 16 FOB Venezuela (nota `.../100526-platts-launches-additional-assessments-of-venezuelan-crude-oct-5`).

Regla de T02: un dato cuya fuente no se pueda abrir y leer en el navegador se **retira del texto de la escena** (el texto se reescribe sin la cifra) y se anota en `docs/DATA_SOURCES.md` §18; no se publica con placeholder (RF-113). Confianza propuesta (segun `docs/DATA_SOURCES.md` §6): `media` para D1a-D9 (prensa especializada o resumen legal, no el texto oficial de la Gaceta ni el sitio del operador); ninguna es `alta`.

## 10. Preguntas para el gate

Cada una con la recomendacion del planificador primero.

1. **Textos que se publican.** Recomendado: aprobar los textos de la tabla §9 (con las correcciones de fuentes ya aplicadas, la frase añadida a la Divulgacion de la escena 3 y el tuteo) y que la traduccion al ingles la redacte el implementador y la revises tu en el gate, con los nombres propios sin traducir. Alternativa: reescribir tu algunos textos antes de P1.
2. **José sin activos propios en el dataset.** `public/data/` no tiene mejoradores, terminal ni oleoducto de José; solo el Complejo Petroquimico José Antonio Anzoategui (OSM, Pequiven, confianza baja), que no es el "Complejo Industrial José Antonio Anzoátegui" donde estan el terminal y los mejoradores segun la prensa. Recomendado: P1 usa ese complejo como "ubicación de referencia" rotulada en las escenas 3 y 4, no dibuja trazado en la escena 2 y deja la carga de mejoradores/terminal/oleoducto desde OSM como tarea de datos aparte (su propia spec). Alternativa: ampliar P1 con esa tarea de datos y retrasar el gate.
3. **Interacciones de R5 sin base todavia.** Recomendado: no implementar en P1 la capa de mechurrios, la animacion del flujo, la ficha del mejorador ni el simulador de descuento (dependen de piezas que no existen o de la decision abierta del descuento, `Sistema de Modos` §9); en P1 la unica interaccion es encender capas por escena y cambiar de nivel. Alternativa: construir alguna ahora y alargar P1.
4. **Acceso y apariencia.** Recomendado: acceso "Ruta de aprendizaje" como boton junto a los accesos de modo existentes (mismo estilo que "Ver Ciudad Bolívar"), y panel del recorrido como tarjeta lateral en escritorio y hoja inferior plegable en telefono, con los tokens actuales (sin color nuevo). Alternativa: otra ubicacion o un estilo propio para divulgacion (la estetica clara y didactica sigue como decision abierta en Notion).

Decisiones tecnicas tomadas por el planificador y aprobadas por el Director; Luis puede vetarlas: (a) P1 **no** espera a `modeStore` (la dependencia que Notion §8 anota): el recorrido es un modo mas de `DEFINICION_MODOS` y su nivel de lectura es un estado propio, que N1 podra absorber; (b) **excepcion declarada al principio 7 de la constitucion** (todo texto visible por `t(clave)`): el texto de las escenas vive en el archivo de datos, bilingue y con su procedencia, porque cada frase va unida a datos con fuente; la igualdad ES/EN la fuerza el validador y los textos de interfaz si usan `t(clave)`. Aprobar ADR-023 es aprobar ambas.

**Respuesta de Luis (2026-10-24):** aprobadas las 4 recomendaciones y ADR-023 (P1 sin `modeStore` y excepcion declarada al principio 7). P1 puede empezar.

## 11. Dudas abiertas

1. [NECESITA ACLARACION: nombre oficial del terminal de José (la prensa usa "Complejo Industrial José Antonio Anzoátegui"; aparece la sigla TAECJAA sin fuente primaria leida). Hasta confirmarlo con PDVSA o una fuente primaria, el texto usa "terminal de José, en el Complejo Industrial José Antonio Anzoátegui" o no lo nombra.]
2. [NECESITA ACLARACION: ¿existe en OpenStreetMap un elemento nombrado para el terminal de José o para los mejoradores? T01 lo busca sin escribir datos; si existe, sigue siendo una tarea de datos aparte (pregunta 2).]
3. [NECESITA ACLARACION: fuente publica de "transferencia de custodia = medicion fiscal" en José (D10). Hasta tenerla (por ejemplo el Reglamento, Decreto 5.381, GOE 7.052, 07/07/2026, o un documento de PDVSA) la frase no se publica.]
4. [NECESITA ACLARACION: fecha de publicacion del articulo de Argus de D1b. Si T02 no la verifica, "casi toda importada" queda fuera.]
