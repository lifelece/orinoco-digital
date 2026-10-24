# Spec 003 — Ruta de aprendizaje: recorridos guiados sobre el mapa (piloto R5)

> Estado: P0 EN BORRADOR. Espera el gate de Luis (spec + plan + tareas + ADR-023 propuesto).
> Peticion de Luis (literal): "busca en Notion actualizaciones pendientes; si quedan fases por hacer, empieza a desarrollarlas".
> Origen: pagina de Notion "Orinoco Digital — Ruta de aprendizaje" (id `4011848abfa781ba8d8bee489d8ec879`, editada 2026-10-22): §2 recorrido R5, §3 fichas, §7 soporte y esquema de escena, §8 fases, §9 prompt de P0, §10 riesgos. Cifras de origen: nota privada de Notion `4011848abfa781f49dd0c0d8bd661fe4` (no se cita en producto; las fuentes publicas de cada cifra estan en §9). Sistema de Modos (`3dc1848abfa781749530cfa2e06f6f66`, N1-N3) y Mejora v2 (`3dc1848abfa78114a716f997e913b24c`, §3.4 motor de recorridos).
> Constitucion: `docs/constitution.md`. Manda el repo sobre Notion (`docs/NOTION.md`).
> Alcance de esta spec: **fase P1 = piloto R5**. Las fases P2-P6 (R1-R4, R6, R7, glosario, fichas, laboratorio, retos) tendran RF nuevos que continuen despues del RF-111; el contrato de datos de esta spec ya las prevee.
> Numeracion: la spec 001 llega a RF-23 y la 002 a RF-78 (verificado en `specs/001-modo-ciudad-bolivar/spec.md` y `specs/002-micrositio-expofaja/spec.md:105`); esta spec usa RF-79 a RF-111. Los RNF son locales de esta spec.
> Verificacion de fuentes de R5: 2026-10-24 (ver §9). Varias paginas (spglobal.com, PwC, KPMG) no abrieron en la verificacion automatica; las filas leidas por resumen se confirman en el navegador en la tarea T02.

## 1. Contexto

El mapa muestra donde estan los campos, ductos y terminales, pero no explica como se conectan. Un estudiante o un periodista ve puntos y lineas sin entender por que el crudo de la Faja necesita diluente, por que hay plantas "mejoradoras" en José o que significa "Merey 16". Sin eso, el proyecto es un mapa de puntos y no una herramienta de divulgacion.

La pagina de Notion de la Ruta de aprendizaje define 7 recorridos guiados de 5 escenas. Es el contenido que faltaba para N2 (Modo Divulgacion) y N3 (Modo Tecnico) del Sistema de Modos. Esta spec construye el **motor de recorridos** y el primer recorrido, **R5 "Del pozo extrapesado al barco en José"**, con las capas que ya existen. Cada escena mueve la camara a un lugar del dataset, enciende las capas que hacen falta y cuenta lo mismo en dos voces: Divulgacion (analogia) y Tecnico (unidades y fuente).

Regla de transformacion (Notion §1): en el producto aparecen la Faja, José, Guri; nunca el material de origen ni lugares de otros paises.

Lo que el repo ya tiene y esta spec reutiliza: modos declarativos con `?modo=` (`src/config.js:278`, `src/modos.js`), enlaces `?capa=`/`?vuelo=` (spec 001, RF-17/18), carga diferida de Cesium (ADR-022), gesto atras entre modos (`src/main.js:421-442`), `t(clave, params)` (`src/i18n/index.js:42`), `prefers-reduced-motion` (ADR-018).

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
- **Escena**: un paso del recorrido: camara, capas, texto en dos niveles, datos con fuente (esquema en plan §3.1).
- **Nivel**: `divulgacion` (por defecto) o `tecnico`. Es un estado del recorrido, no el modo global N1.
- **Dato de escena**: cifra, fecha o nombre verificable que aparece en un texto, con `valor`, `unidad`, `fuente`, `confianza` y `ultima_verificacion`.
- **Objetivo de camara**: id de un activo de `public/data/*.geojson` (o par de ids) al que apunta la escena. Nunca una coordenada escrita a mano.
- **Esquematico / ubicacion de referencia**: lo que la escena nombra pero el dataset no tiene como activo propio (por ejemplo, el trazado de un oleoducto o el terminal). Se rotula asi.
- **Placeholder**: valor entre corchetes (`[fuente_pendiente]`, `[id_pendiente]`). Nunca se rellena (constitucion, principio 2).
- **Regla de transformacion**: los textos de producto no contienen `Alberta`, `Texas`, `SAGA` ni la expresion "el curso".

## 4. Requisitos funcionales (EARS)

Entrada y salida

- RF-79. CUANDO la URL contiene `?modo=ruta&recorrido=R5`, EL SISTEMA DEBE abrir el recorrido R5 en la escena 1 con el nivel Divulgacion.
- RF-80. SI la URL trae `escena=` fuera del rango del recorrido, `nivel=` desconocido o un `recorrido=` que no esta publicado, ENTONCES EL SISTEMA DEBE ignorar ese parametro sin aviso: escena 1, nivel Divulgacion, y, si el recorrido no existe, abrir el mapa como si no hubiera `?modo=ruta`.
- RF-81. EL SISTEMA DEBE ofrecer, mientras no hay un recorrido abierto, un acceso visible "Ruta de aprendizaje" que, al pulsarlo, abre R5 en la escena 1.
- RF-82. CUANDO el usuario pulsa "Salir del recorrido" o usa el gesto atras del navegador, EL SISTEMA DEBE retirar el panel del recorrido, devolver las capas de sector (upstream, midstream, downstream) al estado que tenian al entrar y volver al modo anterior del historial (a la vista nacional si el recorrido se abrio directamente por enlace).
- RF-83. CUANDO el usuario pulsa "Terminar" en la ultima escena, EL SISTEMA DEBE salir del recorrido como en RF-82.

Navegacion entre escenas

- RF-84. MIENTRAS hay un recorrido abierto, EL SISTEMA DEBE mostrar el titulo del recorrido, "Escena n de N", el texto de la escena en el nivel activo y los botones "Anterior" y "Siguiente".
- RF-85. MIENTRAS la escena actual es la 1, EL SISTEMA DEBE mostrar "Anterior" deshabilitado; MIENTRAS es la ultima, EL SISTEMA DEBE rotular "Siguiente" como "Terminar".
- RF-86. CUANDO cambia la escena, EL SISTEMA DEBE mover la camara al objetivo de la nueva escena y dejar encendidas, entre las capas de sector, exactamente las que lista la escena, sin tocar las demas capas.
- RF-87. EL SISTEMA DEBE completar el vuelo de camara de una escena en 2,5 s o menos.
- RF-88. MIENTRAS el sistema operativo pide movimiento reducido, EL SISTEMA DEBE colocar la camara de la escena sin vuelo animado.
- RF-89. SI el usuario mueve la camara a mano durante un vuelo, ENTONCES EL SISTEMA DEBE cancelar el vuelo y mantener el texto y el numero de la escena.
- RF-90. CUANDO el usuario pulsa la flecha izquierda o derecha, o Esc, y el foco no esta en un campo de texto, EL SISTEMA DEBE ir a la escena anterior, a la siguiente o salir del recorrido, respectivamente.
- RF-91. CUANDO cambia la escena o el nivel, EL SISTEMA DEBE actualizar `recorrido`, `escena` y `nivel` en la URL sin anadir entradas al historial, de modo que el enlace copiado reabra esa escena y nivel.

Niveles de lectura

- RF-92. EL SISTEMA DEBE ofrecer en el panel un selector "Divulgación | Técnico" con Divulgacion por defecto y mostrar, de cada escena, solo el texto del nivel activo.
- RF-93. CUANDO el usuario cambia de nivel, EL SISTEMA DEBE conservar la escena y la camara, sin vuelo ni recarga.
- RF-94. MIENTRAS el nivel es Tecnico, EL SISTEMA DEBE mostrar bajo el texto cada dato de la escena con su etiqueta, valor, unidad, fuente (enlace), confianza y fecha de ultima verificacion.
- RF-95. EL SISTEMA DEBE ofrecer en ambos niveles un control "Fuentes de esta escena" que lista cada dato de la escena con su fuente.

Contenido y trazabilidad

- RF-96. EL SISTEMA DEBE tomar el texto, los datos y la camara de cada escena de un archivo de datos estatico versionado, sin texto de escena en el codigo.
- RF-97. EL SISTEMA DEBE considerar invalida una escena a la que le falte `id`, `orden`, `camara`, `capas`, el texto en ES y EN de ambos niveles, o cualquier dato sin `valor`, `unidad`, `fuente`, `confianza` o `ultima_verificacion`.
- RF-98. SI un dato tiene `fuente` igual a `[fuente_pendiente]` o que no es una URL `https://`, ENTONCES EL SISTEMA DEBE considerar invalido el archivo y no publicarlo.
- RF-99. DONDE un dato es de caracter legal (regalia, impuesto), EL SISTEMA DEBE exigirle `fecha_norma` y mostrarla junto al dato.
- RF-100. EL SISTEMA DEBE mostrar los °API de crudos y mezclas como aproximados, con el año del dato y el aviso "varía con el diluente y el lote".
- RF-101. DONDE la camara o el dibujo de una escena no corresponde a un activo propio del dataset, EL SISTEMA DEBE rotularlo "esquemático" o "ubicación de referencia" en el panel.
- RF-102. EL SISTEMA DEBE considerar invalida una escena cuyo objetivo de camara no existe entre los ids de `public/data/*.geojson` o cuya lista de capas incluye un id que no es un interruptor de capa existente.
- RF-103. SI en el navegador el objetivo de camara de una escena no se puede resolver, ENTONCES EL SISTEMA DEBE mostrar el texto de la escena, usar la vista de la Faja y avisar con un mensaje visible.
- RF-104. EL SISTEMA DEBE considerar invalido un texto de escena que contenga `Alberta`, `Texas`, `SAGA` o "el curso".
- RF-105. SI falla la carga del archivo de recorridos o del modulo del recorrido, ENTONCES EL SISTEMA DEBE avisar con `mostrarError` y dejar el mapa usable.

Idioma y accesibilidad

- RF-106. EL SISTEMA DEBE mostrar los textos de interfaz del recorrido y el texto de cada escena en el idioma activo (ES o EN), con las mismas claves en ambos idiomas, y, CUANDO el usuario cambia de idioma, DEBE repintar el panel conservando escena y nivel.
- RF-107. EL SISTEMA DEBE mostrar sin traducir los nombres propios (Merey 16, Petropiar, Petrocedeño, Petromonagas, Petro San Félix, Special Hamaca Blend, Zuata Sweet, Junín, José).
- RF-108. CUANDO cambia la escena, EL SISTEMA DEBE anunciarla en una region `aria-live` educada; los controles del panel DEBEN medir al menos 44 px y no depender de hover.
- RF-109. EN pantallas de menos de 640 px, EL SISTEMA DEBE limitar el panel a 45 % de la altura de la ventana, permitir plegarlo hasta "Escena n de N" y los botones, y encuadrar el objetivo de modo que quede visible por encima del panel desplegado.
- RF-110. EL SISTEMA DEBE descargar el modulo, la interfaz y los datos del recorrido solo cuando el usuario inicia un recorrido (acceso o URL de RF-79).
- RF-111 (añadido tras la verificacion de fuentes). DONDE un dato describe lo que hay instalado o en funcionamiento en una instalacion (los mejoradores de José), EL SISTEMA DEBE mostrar la fecha de su fuente junto al dato y redactar el texto sin afirmar que la instalacion opera hoy.

## 5. Requisitos no funcionales

- RNF-1. JS propio por debajo de 150 KB gzip (`docs/PERFORMANCE_BUDGET.md`). Presupuesto propuesto de esta spec: el acceso "Ruta de aprendizaje" suma <= 2 KB gzip al chunk inicial; el chunk del recorrido (motor + panel + validacion ligera) <= 20 KB gzip. Se mide en T12 y se anota en el PR.
- RNF-2. `recorridos.json` con R5 <= 30 KB; con los 7 recorridos <= 200 KB (mismo criterio que RNF-1 de la spec 001).
- RNF-3. Sin dependencias nuevas. El motor es puro (sin DOM, sin `fetch`, sin `cesium`) y testeable con `node:test`. La interfaz del recorrido sin `cesium` ni `fetch` (`verificar:modulos`).
- RNF-4. Identidad (ADR-021): `tinta` nunca en marcadores ni capas de datos; el recorrido no introduce colores de marca ni de tercero en el mapa.
- RNF-5. Neutralidad (constitucion 9): texto descriptivo; ninguna escena de R5 emite veredicto ni postura politica; cada dato legal lleva la fecha de su norma (Notion §10).
- RNF-6. Repo publico: ningun texto del producto ni de `specs/` nombra negocios del autor ni su busqueda de empleo.
- RNF-7. Funciona en el objetivo del proyecto: laptop de 8 GB y redes moviles venezolanas (constitucion 10); gate en telefono real con DevTools cerrado.

## 6. Casos limite

| Caso | Comportamiento esperado | RF |
|---|---|---|
| `?modo=ruta` sin `recorrido=` | Abre el mapa como si no hubiera `?modo=ruta` | RF-80 |
| `?modo=ruta&recorrido=R5&escena=9` | Escena 1 | RF-80 |
| `?modo=ruta&recorrido=R5&nivel=experto` | Divulgacion | RF-80 |
| Recarga a mitad del recorrido | Reabre la misma escena y nivel (la URL los lleva) | RF-91 |
| Gesto atras desde la escena 3 | Sale del recorrido (no va a la escena 2) | RF-82, RF-91 |
| Ficha de activo abierta y Esc | Esc cierra la ficha primero (comportamiento actual); un segundo Esc sale del recorrido | RF-90 |
| El usuario enciende o apaga capas durante el recorrido | La siguiente escena vuelve a fijar las de sector | RF-86 |
| Capa de campos aun cargando al iniciar | Texto visible; la camara espera al objetivo o usa la vista de la Faja con aviso | RF-103 |
| Sin red al pedir `recorridos.json` | Aviso visible; mapa usable | RF-105 |
| Escena con `[fuente_pendiente]` | El archivo no pasa `npm test`; no se publica | RF-98 |
| `prefers-reduced-motion` | Sin vuelo | RF-88 |
| Telefono vertical 390x844 | Panel <= 45 vh, plegable, objetivo visible | RF-109 |
| Cambio de idioma a mitad | Repinta; misma escena y nivel | RF-106 |
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
- La afirmacion "transferencia de custodia = medicion fiscal" (sin fuente publica hallada; D10): no entra en P1.
- Medicion de uso, cuentas, progreso guardado, insignias.
- Embeber el recorrido en otras webs.

## 8. Criterios de aceptacion

- [ ] Tests: motor (enlace, navegacion, niveles, resolucion de objetivos con fixture), validador (casos invalidos de RF-97/98/99/102/104), archivo real de R5 (ids existen en los GeoJSON, capas validas, ES/EN completos, sin placeholders, sin palabras prohibidas), claves i18n iguales en ES y EN.
- [ ] `npm test`, `npm run data:validate` y `npm run build` en verde.
- [ ] RNF-1 y RNF-2 medidos y anotados en el PR.
- [ ] Capturas antes/despues en `docs/capturas/r5-*` (escritorio y movil, ES y EN, ambos niveles).
- [ ] Toda cifra de las 5 escenas trazable a una fuente abierta y verificada en el navegador, o retirada del texto (RF-98).
- [ ] Luis: telefono real, datos moviles, DevTools cerrado: acceso, 5 escenas en los dos niveles, enlaces con `escena=`, atras, Esc, EN, reduced-motion, y una persona ajena al tema que entienda el recorrido sin explicacion (gate de N2).

## 9. Contenido propuesto de R5 (anexo para aprobar)

Textos de Notion §2 (R5) con las correcciones que impuso la verificacion de fuentes (2026-10-24). La traduccion al ingles se redacta en la tarea T06 y Luis la revisa en el gate. Los textos Tecnico citan los datos D1-D9 de la tabla siguiente.

| Esc. | Objetivo de camara | Capas | Divulgacion | Tecnico |
|---|---|---|---|---|
| 1 | `GEM-L100000320738` (Junin 6; centro aproximado del campo, no una macolla) | upstream | «Del pozo, el crudo llega a una "estación de flujo", donde se separa del agua y del gas.» | Separador trifasico por gravedad y medicion; el gas va a recoleccion o al mechurrio. (Concepto de ingenieria, sin cifra.) |
| 2 | Encuadre entre `GEM-L100000320738` y `OSM-W265071557`; sin trazado (esquematico) | upstream, midstream | «Para viajar por tubería hay que mezclarlo con un líquido más ligero: el diluente.» | Diluente = nafta, casi toda importada de EE.UU. (en enero de 2026 llegó el primer cargamento bajo un acuerdo de suministro con el gobierno estadounidense), o crudos livianos como Mesa y Santa Bárbara en la mezcla final. D1, D2 |
| 3 | `OSM-W265071557` (Complejo Petroquimico José Antonio Anzoategui, **ubicacion de referencia**: no es un mejorador) | midstream, downstream | «En José hay dos caminos: mezclarlo y venderlo como Merey 16, o "mejorarlo" en plantas gigantes que lo vuelven más liviano.» | Merey 16: ≈16° API y ≈3,4 % de azufre (Platts, 2026). En José hay cuatro mejoradores instalados: Petropiar, Petrocedeño, Petromonagas y Petro San Félix. En 2021 PDVSA ofrecía Special Hamaca Blend (17,2° API) y Zuata Sweet (≈22° API, frente a ≈32° de diseño). D3, D4, D5, D6 |
| 4 | `OSM-W265071557` (ubicacion de referencia: el terminal no esta en el dataset) | midstream, downstream | «Del terminal sale en tanqueros hacia refinerías de otros países.» (si se nombra el terminal: "terminal de José, en el Complejo Industrial José Antonio Anzoátegui", hasta confirmar su nombre oficial) | Desde la reforma de la Ley Orgánica de Hidrocarburos (Gaceta Oficial Extraordinaria N.º 6.978, 29/01/2026), el Estado cobra una regalía de hasta 30 % sobre los volúmenes extraídos (art. 51) y un impuesto integrado de hasta 15 % sobre los ingresos brutos; el Ejecutivo fija el porcentaje por proyecto. D7, D8 (con `fecha_norma`) |
| 5 | Vista de la Faja (`vista: faja`), sin rutas dibujadas | upstream, midstream, downstream | «Un crudo pesado y con azufre se paga más barato: cuesta más refinarlo.» | Desde el 31/03/2026 Platts publica una evaluación diaria del Merey 16 entregado en la Costa del Golfo de EE.UU. (DAP USGC), en precio absoluto y como diferencial contra Brent y WTI. D9 |

Cambios sobre Notion: (a) diluente: "bajo un acuerdo de suministro con el gobierno estadounidense" y no "bajo licencias" (la fuente no menciona licencia para ese envio); (b) escena 4: la regalia va sobre volumenes y el impuesto integrado sobre ingresos brutos, no ambos sobre el "volumen fiscalizado"; se retira "transferencia de custodia = medicion fiscal" (D10) y la oracion no se reemplaza; (c) escena 5: Platts cotiza en precio absoluto y como diferencial; (d) escena 3: los mejoradores se presentan como instalados en José, con la fecha de la fuente, sin afirmar que operan hoy (RF-111); (e) la interaccion de las escenas 1, 2, 3 y 5 no se implementa en P1 (pregunta 3); (f) cuando exista el enlace "detalle tecnico", se escribe "¿Quieres…" y no "¿Querés…" (tuteo).

Datos de R5 y su fuente (verificacion del 2026-10-24; "directa" = pagina leida; "resumen" = leida en un resumen de busqueda porque la pagina no abrio, cita parafraseada). Todos pasan por T02 (confirmar en navegador las filas "resumen" y copiar a `docs/DATA_SOURCES.md` §18).

| Id | Esc. | Dato | Fuente (medio, fecha) y URL | Lectura | Estado |
|---|---|---|---|---|---|
| D1 | 2 | Diluente = nafta casi toda importada de EE.UU.; primer cargamento bajo acuerdo de suministro (460.000 bl cargados el 11/01/2026 en Pasadena rumbo a José) | Reuters via Hydrocarbon Processing, 12/01/2026: `https://hydrocarbonprocessing.com/news/2026/01/vitol-to-load-first-diluent-cargo-under-venezuela-supply-deal-last-weekend/`; Argus (historico, "almost all imported from the US"): `https://www.argusmedia.com/es/news/1936642-pdv-to-tap-fractionator-to-replace-imported-naphtha` | directa (HP); resumen (Argus) | confirmado. La parte "bajo licencias" no se confirma y se retira (RF-98) |
| D2 | 2 | Mesa y Santa Bárbara como livianos usados en la mezcla en José | Argus, 2019: `https://www.argusmedia.com/en/news/1900583-pdv-halts-upgrading-plots-shift-to-blending` | resumen | confirmado como mezcla en José (no necesariamente diluente del oleoducto): el texto dice "en la mezcla final" |
| D3 | 3 | Merey 16 ≈16 °API y ≈3,4 % de azufre | S&P Global Platts, nota 31/03/2026: `https://www.spglobal.com/energy/en/pricing-benchmarks/our-methodology/subscriber-notes/033126-platts-launches-assessments-of-merey-16-dap-usgc`; refuerzo: Argus 2019 ("16°API Merey") | resumen (spglobal dio 403) | confirmado, por verificar en navegador |
| D4 | 3 | Cuatro mejoradores en José: Petropiar, Petrocedeño, Petromonagas, Petro San Félix | S&P Global Platts, 13/09/2021 (copia en Hellenic Shipping News): `https://www.hellenicshippingnews.com/?p=886251`; Argus 2019: `https://www.argusmedia.com/pt/news-and-insights/latest-market-news/1883734-two-pdv-upgraders-to-restart-by-tomorrow` | directa (Hellenic); resumen (Argus) | confirmado como instalados; **estado operativo actual NO confirmado** (Argus 2019: tres se reconvirtieron a mezcla; Platts 2021: Petrocedeño reinició el 29/06/2021): RF-111 |
| D5 | 3 | Special Hamaca Blend 17,2 °API (2021) | Platts 13/09/2021, misma URL de D4: "17.2 degree API Special Hamaca Blend (SHB) crude" | directa | confirmado |
| D6 | 3 | Zuata Sweet ≈22 °API en 2021 (diseño original ≈32°) | Platts 13/09/2021, misma URL de D4: "22 degree API synthetic crude called Zuata Sweet" | directa | confirmado |
| D7 | 4 | Regalía de hasta 30 % sobre los volúmenes (art. 51, antes 44); LOH reformada, Gaceta Oficial Extraordinaria N.º 6.978, 29/01/2026 | Acceso a la Justicia (texto de la ley): `https://accesoalajusticia.org/ley-de-reforma-de-la-ley-organica-de-hidrocarburos/`; Finanzas Digital, 03/02/2026: `https://finanzasdigital.com/reforma-ley-hidrocarburos-2026/`; PwC Venezuela (resumen) | directa; resumen (PwC) | confirmado; `fecha_norma` 2026-01-29 |
| D8 | 4 | Impuesto integrado de hasta 15 % sobre los ingresos brutos / base imponible (arts. 55 a 57 según el texto de la ley; Finanzas Digital cita 55 a 59) | Acceso a la Justicia y Finanzas Digital (mismas URL de D7) | directa | confirmado; articulos por unificar en T02 (el texto de escena no cita articulos del impuesto) |
| D9 | 5 | Platts publica el Merey 16 DAP USGC desde 31/03/2026, en precio absoluto y como diferencial contra Brent y WTI | Platts, nota 31/03/2026 (misma URL de D3) | resumen | confirmado, por verificar en navegador |
| D10 | 4 | "Transferencia de custodia = medición fiscal" en José | [fuente_pendiente] (sin fuente publica hallada; lo mas cercano, Argus 2018 y Forvis Mazars, no habla de medicion fiscal en José) | — | **no confirmado: no se publica** |

Opcional (no entra en P1 salvo que Luis lo pida): desde 05/10/2026 Platts tambien publica Merey 16 FOB Venezuela (nota `.../100526-platts-launches-additional-assessments-of-venezuelan-crude-oct-5`).

Regla de T02: un dato cuya fuente no se pueda abrir y leer en el navegador se **retira del texto de la escena** (el texto se reescribe sin la cifra) y se anota en `docs/DATA_SOURCES.md` §18; no se publica con placeholder (RF-98). Confianza propuesta (segun `docs/DATA_SOURCES.md` §6): `media` para D1-D9 (prensa especializada o resumen legal, no el texto oficial de la Gaceta ni el sitio del operador); ninguna es `alta`.

## 10. Preguntas para el gate

Cada una con la recomendacion del planificador primero.

1. **Textos que se publican.** Recomendado: aprobar los textos de la tabla §9 (con las correcciones de fuentes ya aplicadas y el tuteo) y que la traduccion al ingles la redacte el implementador y la revises tu en el gate, con los nombres propios sin traducir. Alternativa: reescribir tu algunos textos antes de P1.
2. **José sin activos propios en el dataset.** `public/data/` no tiene mejoradores, terminal ni oleoducto de José; solo el Complejo Petroquimico José Antonio Anzoategui (OSM, Pequiven, confianza baja), que no es el "Complejo Industrial José Antonio Anzoátegui" donde estan el terminal y los mejoradores segun la prensa. Recomendado: P1 usa ese complejo como "ubicacion de referencia" rotulada en las escenas 3 y 4, no dibuja trazado en la escena 2 y deja la carga de mejoradores/terminal/oleoducto desde OSM como tarea de datos aparte (su propia spec). Alternativa: ampliar P1 con esa tarea de datos y retrasar el gate.
3. **Interacciones de R5 sin base todavia.** Recomendado: no implementar en P1 la capa de mechurrios, la animacion del flujo, la ficha del mejorador ni el simulador de descuento (dependen de piezas que no existen o de la decision abierta del descuento, `Sistema de Modos` §9); en P1 la unica interaccion es encender capas por escena y cambiar de nivel. Alternativa: construir alguna ahora y alargar P1.
4. **Acceso y apariencia.** Recomendado: acceso "Ruta de aprendizaje" como boton junto a los accesos de modo existentes (mismo estilo que "Ver Ciudad Bolívar"), y panel del recorrido como tarjeta lateral en escritorio y hoja inferior plegable en telefono, con los tokens actuales (sin color nuevo). Alternativa: otra ubicacion o un estilo propio para divulgacion (la estetica clara y didactica sigue como decision abierta en Notion).

Decision tecnica tomada por el planificador y aprobada por el Director; Luis puede vetarla: P1 **no** espera a `modeStore` (la dependencia que Notion §8 anota). El recorrido es un modo mas de `DEFINICION_MODOS` y su nivel de lectura es un estado propio, que N1 podra absorber (ADR-023).

## 11. Dudas abiertas

1. [NECESITA ACLARACION: nombre oficial del terminal de José (la prensa usa "Complejo Industrial José Antonio Anzoátegui"; aparece la sigla TAECJAA sin fuente primaria leida). Hasta confirmarlo con PDVSA o una fuente primaria, el texto usa "terminal de José, en el Complejo Industrial José Antonio Anzoátegui" o no lo nombra.]
2. [NECESITA ACLARACION: ¿existe en OpenStreetMap un elemento nombrado para el terminal de José o para los mejoradores? T01 lo busca sin escribir datos; si existe, sigue siendo una tarea de datos aparte (pregunta 2).]
3. [NECESITA ACLARACION: fuente publica de "transferencia de custodia = medicion fiscal" en José (D10). Hasta tenerla (por ejemplo el Reglamento, Decreto 5.381, GOE 7.052, 07/07/2026, o un documento de PDVSA) la frase no se publica.]
