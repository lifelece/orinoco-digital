# Spec 004 — Capa "Bloques y contratos 2026" (M16 v2)

> Estado: P0 (borrador del planificador, 2026-11-12). Espera revisión QA y aprobación de Luis.
> Petición de Luis (literal, 12/11): "agregué una página en Notion sobre Orinoco Digital, porfa léela y desarrolla".
> Origen: página de Notion sobre la capa (leída por el Director): GeoJSON estático cargado en diferido, color por `capa`, relleno por `estatus_norm`, borde punteado si `tiene_licencia_ofac`, ficha, filtros, cruce con los 105 campos por punto en polígono, validador, ADR "M16 v2: polígonos en vez de campo_id".
> Fuente de los datos: Transparencia Venezuela, "Mapa del negocio petrolero en Venezuela 2026" (corte 31/10/2026, publicado 10/11/2026, extraído 11/11/2026). Polígonos: repositorio público ESRI de un tercero (datos del Ministerio de Hidrocarburos). Descripción en `data/raw/tv-2026/orinoco_capa_2026/README.md` (no versionado).
> **Gate de licencia (decisión de Luis):** la licencia de redistribución NO está confirmada. Los datos reales no entran al repo público ni a producción. Esta spec construye la capa **completa pero apagada**; se enciende en una tarea posterior al permiso (fuera de esta ejecución).
> Constitución: `docs/constitution.md` (principios 1, 2, 3, 9, 10, 12 aplican directamente).
> Numeración: la spec 003 llega a RF-128; esta spec usa RF-129 a RF-162. Los RNF son locales. `[ASI]` = suposición del planificador, a confirmar.

## 1. Contexto

El mapa muestra 105 campos (GEM GOGET) coloreados por hidrocarburo, pero no dice quién opera cada zona en 2026 ni bajo qué figura. Transparencia Venezuela publicó el 10/11/2026 un mapa con 303 bloques de petróleo y gas, su operador en 2026, el operador anterior, el estatus, la licencia OFAC registrada, el tipo de alianza y si el bloque forma parte del acuerdo EE. UU.–Venezuela, más las 4 divisiones de la Faja. Llevarlo al gemelo digital permite a un periodista o estudiante ver sobre el terreno real quién opera dónde, con la fuente a un toque.

El tema es sensible: la capa muestra hechos con fuente y fecha de corte, sin adjetivos ni veredictos (principio 9). Y es contenido de terceros: sin autorización registrada no se publica (principio 12).

Qué ya existe y se reutiliza: control de capas con estado cargando/lista/error (`src/ui.js:994`, `fijarEstadoCapa`), capas apagadas fuera del viewer (`src/map.js:613`, ADR-019), polígonos de campo con borde discontinuo (`src/map.js:757-793`), chip de frescura (`src/ui.js:609`, `UMBRAL_FRESCURA_DIAS` en `src/config.js:494`), ficha por módulo en `src/ui/` (precedente `fichaCiudad.js`), validador de GeoJSON (`scripts/validate-geojson.mjs`) con CI (`.github/workflows/validar-datos.yml`), `posicionDe` (`src/data.js:376`), i18n con paridad de claves.

Qué no existe: ninguna capa se carga hoy "al encender" (todas entran en `cargarCapas`, `src/main.js:156-179`); el campo `bloque` de `campos.geojson` viene `null`; no hay módulo de filtros por atributo.

## 2. Historias de usuario

- HU-1. Como periodista, quiero tocar un bloque y ver quién lo opera en 2026, quién lo operaba antes, bajo qué figura y con qué licencia registrada, con la fuente y la fecha de corte, para citarlo sin repetir un dato sin origen.
- HU-2. Como estudiante, quiero filtrar los bloques por empresa, estatus, licencia y acuerdo EE. UU.–Venezuela, para ver el reparto sobre el mapa.
- HU-3. Como persona daltónica o que usa lector de pantalla, quiero entender la capa sin depender del color, con leyenda en texto y la tabla accesible.
- HU-4. Como visitante con datos móviles, quiero que la capa no cueste nada si no la enciendo.
- HU-5. Como usuario que prefiere inglés, quiero la interfaz de la capa en inglés.
- HU-6. Como Luis, quiero que mientras no haya permiso de redistribución la capa no aparezca ni se filtre ningún dato real al repo, y que el día del permiso encenderla sea una tarea corta.

## 3. Definiciones

- **Bloque**: polígono (Polygon o MultiPolygon, WGS84) con id `B` + 3 dígitos. 303 en el corte del 31/10/2026.
- **Capa del bloque** (`capa`): `nabep`, `chevron`, `acuerdo_2026`, `sin_registro`. Vocabulario de la fuente.
- **Estatus normalizado** (`estatus_norm`): `activo`, `intermitente`, `paralizado`, `en_proyecto`, `en_evaluacion`, `sin_info`, `sin_registro`.
- **Grupo de estatus** (lo que se ve en el relleno) [ASI]: `operando` = activo, intermitente; `detenido` = paralizado; `sin_operacion_registrada` = en_proyecto, en_evaluacion, sin_info, sin_registro. El estatus completo siempre se lee en texto (ficha, tabla, filtro).
- **Licencia OFAC**: texto literal de la fuente (p. ej. nombre de licencia general) o "sin licencia registrada en la fuente".
- **Acuerdo EE. UU.–Venezuela**: `convenio_eeuu_vzla = true` según la fuente.
- **División de la Faja**: uno de los 4 polígonos Boyacá, Junín, Ayacucho, Carabobo.
- **Archivo publicado**: `public/data/bloques-2026.geojson` y `public/data/faja-divisiones-2026.geojson`, en el esquema del plan §3.1. Hoy no existen en el repo.
- **Capa publicada**: la configuración dice que la capa está activa (permiso registrado, o vista previa local en modo desarrollo; plan §3.3).
- **Fixture sintético**: bloque inventado con el mismo esquema, nunca copiado de la fuente, con `fuente` que declara que no es real.
- **Corte de datos**: fecha `fecha_corte` de los registros (2026-10-31 en el corte actual).
- **Rótulos neutrales** (obligatorios en ES; EN equivalente): "Operador 2026", "Operador antes de 2026", "Sin licencia registrada en la fuente", "Parte del acuerdo EE. UU.–Venezuela (según la fuente)", "Sin dato en la fuente", "Sin registro en la fuente". Lista prohibida en textos de la capa: "desplazad", "ilegal", "saque", "régimen", "entreg", "regal" (raíces; test RF-153) [ASI].

## 4. Requisitos funcionales (EARS)

Gate de publicación y carga

- RF-129. MIENTRAS la capa no esté publicada, EL SISTEMA DEBE no mostrar su interruptor, su leyenda, sus filtros, sus filas en la tabla ni sus resultados en el buscador, y no pedir por red ningún archivo de la capa.
- RF-130. DONDE la capa esté publicada, EL SISTEMA DEBE mostrar en el control de capas el interruptor "Bloques y contratos 2026", apagado al cargar la página.
- RF-131. CUANDO el usuario enciende el interruptor por primera vez en la sesión, EL SISTEMA DEBE descargar en ese momento el archivo de bloques y el de divisiones, y no antes.
- RF-132. CUANDO el usuario apaga y vuelve a encender el interruptor, EL SISTEMA DEBE mostrar la capa sin volver a descargar sus archivos.
- RF-133. SI la capa está publicada y la descarga de cualquiera de sus archivos falla, ENTONCES EL SISTEMA DEBE poner el interruptor en estado de error con un aviso visible en la interfaz, dejar el resto del mapa usable y reintentar la descarga la próxima vez que el usuario lo encienda.

Dibujo y leyenda

- RF-134. MIENTRAS la capa está encendida, EL SISTEMA DEBE dibujar cada bloque visible con el color de relleno que corresponde a su `capa` (4 colores).
- RF-135. MIENTRAS la capa está encendida, EL SISTEMA DEBE aplicar al relleno de cada bloque un tratamiento distinto por grupo de estatus (sólido, rayado o tenue), de modo que el grupo se distinga sin depender del tono.
- RF-136. MIENTRAS la capa está encendida, EL SISTEMA DEBE dibujar con borde discontinuo los bloques con `tiene_licencia_ofac = true` y con borde continuo los demás.
- RF-137. MIENTRAS la capa está encendida, EL SISTEMA DEBE dibujar las 4 divisiones de la Faja como contorno sin relleno con su nombre, y retirarlas al apagar la capa.
- RF-138. MIENTRAS la capa está encendida, EL SISTEMA DEBE mostrar una leyenda que nombre en texto las 4 capas, los 3 tratamientos de relleno y los 2 tipos de borde, con el número de bloques visibles de cada capa.

Ficha

- RF-139. CUANDO el usuario toca un bloque, EL SISTEMA DEBE abrir una ficha con: nombre e id; operador 2026 y operador antes de 2026, en ese orden; tipo de alianza; estatus de la fuente y estatus normalizado; licencia OFAC; si forma parte del acuerdo EE. UU.–Venezuela; zona, entidad federal y municipios; área en km²; número de registros vinculados; chip de frescura; enlace a la fuente.
- RF-140. SI un dato de la ficha está vacío o nulo, ENTONCES EL SISTEMA DEBE mostrar el renglón con "Sin dato en la fuente" (o "Sin registro en la fuente" para operador), sin ocultarlo y sin rellenarlo.
- RF-141. SI un bloque tiene varios operadores en un mismo campo de la fuente, ENTONCES EL SISTEMA DEBE mostrarlos como lista, uno por renglón.
- RF-142. CUANDO se abre la ficha de un bloque, EL SISTEMA DEBE listar los campos del mapa cuyo punto representativo cae dentro del bloque, con su nombre, o el texto "Ningún campo del mapa dentro de este bloque".
- RF-143. MIENTRAS los bloques están cargados, EL SISTEMA DEBE mostrar en la ficha de un campo el nombre y el operador 2026 de cada bloque que contiene su punto representativo; si no cae en ninguno, EL SISTEMA DEBE no añadir el renglón.
- RF-144. EL SISTEMA DEBE mostrar en la ficha del bloque y en el panel de fuentes la atribución a Transparencia Venezuela y al autor de los polígonos, con la fecha de corte.
- RF-145. CUANDO se abre la ficha de un bloque, EL SISTEMA DEBE mostrar un chip "Corte de datos: <fecha>" cuyo color sigue los mismos umbrales de antigüedad que el chip de frescura del mapa; SI los registros cargados tienen fechas de corte distintas, ENTONCES EL SISTEMA DEBE usar la más antigua.

Filtros

- RF-146. MIENTRAS la capa está encendida, EL SISTEMA DEBE ofrecer filtros por empresa (cada operador 2026, también los de bloques compartidos), por estatus normalizado (7 valores), por licencia OFAC (valores presentes en los datos más "Sin licencia registrada en la fuente") y por acuerdo EE. UU.–Venezuela (sí, no, todos), con las opciones generadas a partir de los datos cargados.
- RF-147. CUANDO el usuario cambia un filtro, EL SISTEMA DEBE dejar visibles solo los bloques que cumplen todas las dimensiones filtradas (cualquier valor marcado dentro de una dimensión) y mostrar "n de N bloques", con N el total cargado.
- RF-148. SI ningún bloque cumple los filtros, ENTONCES EL SISTEMA DEBE mostrar "Ningún bloque cumple los filtros" y un botón "Quitar filtros" que devuelve todos los bloques.
- RF-149. CUANDO el usuario apaga y vuelve a encender la capa en la misma sesión, EL SISTEMA DEBE conservar los filtros elegidos.

Accesibilidad, búsqueda, idioma y neutralidad

- RF-150. MIENTRAS los bloques están cargados, EL SISTEMA DEBE incluir en la vista de tabla una sección de bloques con nombre, capa, operador 2026, estatus, licencia OFAC y acuerdo EE. UU.–Venezuela en texto, respetando los filtros activos.
- RF-151. MIENTRAS los bloques están cargados, EL SISTEMA DEBE encontrar bloques en el buscador por nombre o id y, al elegir uno, encender la capa si estaba apagada, llevar la cámara al bloque y abrir su ficha.
- RF-152. EL SISTEMA DEBE mostrar todos los textos de interfaz de la capa en ES y EN, traducir los valores normalizados (capa, estatus normalizado, grupo) y mostrar sin traducir los valores literales de la fuente (empresas, estatus de la fuente, licencia, tipo de alianza, municipios).
- RF-153. EL SISTEMA DEBE usar en la capa los rótulos neutrales de §3 y ningún texto de interfaz de la capa DEBE contener una raíz de la lista prohibida.
- RF-161. MIENTRAS hay un recorrido abierto (spec 003), EL SISTEMA DEBE retirar del mapa la capa de bloques, su leyenda y sus filtros, y al salir del recorrido DEBE devolverlos al estado que tenían.
- RF-162. CUANDO la aplicación arranca con la capa publicada y sin un recorrido abierto, EL SISTEMA DEBE encender la capa de bloques sin que el usuario lo pida, después de cargar las capas base; SI arranca dentro de un recorrido, DEBE encenderla al salir de él. El interruptor sigue disponible para apagarla. (Decisión del autor del 2026-11-12: como capa aparte y apagada, el mapa abría pobre de información. El primer encendido de RF-131 pasa a ser este.)

Datos, conversión y validación

- RF-154. CUANDO Luis ejecuta el conversor sobre `data/raw/tv-2026/`, EL SISTEMA DEBE producir los dos archivos en el esquema del plan §3.1 y escribirlos en `data/raw/tv-2026/publicado/`; DONDE se pase la opción explícita de publicar, EL SISTEMA DEBE escribirlos en `public/data/`.
- RF-155. SI el validador encuentra un error en la salida del conversor, ENTONCES EL SISTEMA DEBE no escribir ningún archivo y terminar con código distinto de 0, listando cada error.
- RF-156. EL validador DEBE fallar si un bloque no tiene `fuente`, tiene id duplicado o fuera del patrón, tiene `capa` o `estatus_norm` fuera de vocabulario, geometría que no es Polygon/MultiPolygon o fuera de la ventana de Venezuela, o `fecha_corte`/`ultima_verificacion` que no son AAAA-MM-DD.
- RF-157. EL validador DEBE fallar si un registro de contratos referencia un `id_bloque` que no existe en los bloques o no tiene `referencia`; los registros sin bloque (campo `id_bloque` vacío) DEBEN aceptarse y contarse aparte.
- RF-158. CUANDO corre `npm test` o el CI de datos, EL SISTEMA DEBE validar los fixtures sintéticos (casos buenos y malos) y, si existe el archivo publicado en `public/data/`, validarlo también; si no existe, DEBE terminar en verde con el mensaje "capa no publicada".
- RF-159. Todos los bloques de los fixtures DEBEN declarar en `fuente` que son sintéticos; el test DEBE fallar si alguno no lo hace.
- RF-160. MIENTRAS el permiso de redistribución no esté registrado en la configuración, `.gitignore` DEBE excluir los dos archivos publicados y el test DEBE fallar si no lo hace; DONDE el permiso esté registrado, el test DEBE exigir que ambos archivos existan, pasen el validador y que `docs/DATA_SOURCES.md` tenga la línea de permiso con fecha.

## 5. Requisitos no funcionales

- RNF-1. Coste cero apagada: con la capa no publicada o apagada, 0 peticiones de red de la capa y como máximo 2 KB gzip añadidos al chunk inicial (medido con `npm run build`).
- RNF-2. Peso: cada archivo publicado ≤ 2 MB (límite duro, `docs/PERFORMANCE_BUDGET.md`); objetivo ≤ 200 KB servido comprimido [ASI: la regla de datos no dice si el objetivo es crudo o gzip; la página de Notion estima 418 KB crudo]. El conversor imprime ambos tamaños.
- RNF-3. Fluidez: con la capa encendida y todos los bloques visibles, la interacción en el teléfono de Luis se mantiene por encima de 30 FPS y el tiempo de encender a ver los polígonos es ≤ 3 s en 4G [ASI].
- RNF-4. Lighthouse móvil del mapa con la capa apagada no baja de la medición del 2026-11-12 (60).
- RNF-5. Accesibilidad: el color nunca es el único canal (relleno, borde, leyenda en texto, ficha, tabla); filtros operables con teclado y lector de pantalla; objetivos táctiles ≥ 44 px [ASI: convención del proyecto]; contraste del contorno legible sobre la base oscura (ADR-018).
- RNF-6. Sin dependencias nuevas; CSV y punto en polígono con código propio.
- RNF-7. Neutralidad y atribución: ningún texto propio interpreta los datos; toda cifra y nombre viene del archivo publicado.
- RNF-8. Ningún dato real en el repo, en los tests ni en la spec mientras no haya permiso.

## 6. Casos límite

- Bloque MultiPolygon: una entidad por parte, todas con el mismo id para selección y filtro.
- Bloques que se solapan: un campo puede caer en dos bloques; RF-143 lista todos.
- Campo con geometría de polígono: se usa su punto representativo (`posicionDe`), no el polígono entero [ASI: `src/data.js:376` devuelve un `[lng, lat]` representativo].
- Toque sobre un campo dentro de un bloque: gana el campo (más pequeño); el bloque se abre tocando fuera del campo (plan §5).
- Bloque costa afuera fuera de la ventana de Venezuela del validador (`lngMin -74`, `lngMax -59`): el validador falla; se decide con datos reales en T16 si la capa necesita ventana propia [ASI].
- Operador "Sin registro en la tabla", estatus vacío, operador anterior vacío: el conversor los vuelve `[]`/`null` y la ficha aplica RF-140.
- Operador con coma interna ("X, subsidiaria de Y"): solo se separa por `;`.
- Cambio de idioma con la ficha abierta: se repinta en el idioma nuevo; los valores literales no cambian.
- Filtro activo y búsqueda de un bloque oculto por filtro: RF-151 quita los filtros que lo ocultan [ASI] y lo muestra.
- Nuevo corte de la fuente: se reejecuta el conversor; el chip cambia solo; ids que desaparecen no se reutilizan.
- Capa publicada pero archivo ausente en el despliegue: RF-133 en la interfaz y RF-160 en CI lo impiden antes.
- Recorrido abierto con la capa encendida: RF-161.

## 7. Fuera de alcance

- Publicar los datos reales (requiere permiso; tarea posterior, plan §7).
- Mostrar el detalle de los registros de contratos (fechas, cambios, accionistas, producción estimada) en la ficha: solo el número de registros vinculados y el enlace a la fuente.
- El CSV de empresas (categorías activa/desplazada/evaluando).
- Enlaces `?capa=bloques` y `?vuelo=B###`.
- Historia de operadores anterior a la columna "antes de 2026", líneas de tiempo, rankings o agregados por país.
- Rellenar `campos.geojson` → `bloque` con el cruce (el cruce es en tiempo de ejecución).
- Simplificación de geometrías salvo que la medición de T16 la exija (entonces, spec de cambio).
- Enviar el mensaje de permiso: lo envía Luis.

## 8. Criterios de aceptación

1. `npm test` en verde con fixtures sintéticos; `verificar:modulos` sin violaciones; `npm run build` trae Cesium.
2. En un build de producción sin permiso: ningún interruptor, ninguna petición a `bloques-2026.geojson` (Chrome DevTools, pestaña Red).
3. En vista previa local con datos reales (no versionados): las 33 comprobaciones de RF pasan en 390x844 y 1440x900, ES y EN.
4. ADR-024 y `docs/DATA_SOURCES.md` §19 escritos; borrador de solicitud de permiso entregado a Luis.
5. ⛔ Gate: Luis en su teléfono real (vista previa local por `npm run dev:host`, DevTools cerrado) enciende la capa, filtra, abre fichas y la entiende sin explicación.

## 9. Preguntas para Luis (recomendación primero)

1. ¿Qué pasa si Transparencia Venezuela da permiso y el autor de los polígonos no? **Recomiendo no publicar la capa** (sin geometría no hay mapa; una tabla sola es otra feature). Alternativa: publicar solo la tabla de bloques sin polígonos.
2. Paleta de las 4 capas (estética): **recomiendo 4 tonos que no repitan el ámbar del crudo ni el azul del gas** (los campos quedan debajo), sin `tinta` ni ámbar de aviso (ADR-021, reglas de interfaz), y aprobarlos en el gate con captura. ¿O prefieres que los proponga el Director antes de implementar?
3. Vista previa con datos reales en tu teléfono antes del permiso: **recomiendo sí, solo en modo desarrollo** (`npm run dev:host` con una variable local), nunca en un build de producción. ¿De acuerdo?
4. ¿El detalle de los 119 registros de contratos va en una spec posterior (recomendado) o lo quieres ya en la ficha cuando haya permiso?

## 10. Dudas abiertas

- [NECESITA ACLARACIÓN: datos de contacto de Transparencia Venezuela y del autor de los polígonos para el borrador de permiso; quedan como `[contacto_tv]` y `[contacto_autor_poligonos]`.]
- [NECESITA ACLARACIÓN: ¿el objetivo de 200 KB de `.claude/rules/datos.md` es crudo o comprimido? Si es crudo y el archivo real lo supera tras redondear coordenadas, ¿se acepta con nota o se simplifican geometrías?]
- [NECESITA ACLARACIÓN: semántica de `registros_vinculados` frente a las 182 filas / 119 registros del CSV; mientras tanto la discrepancia es aviso, no error (plan §3.4).]
