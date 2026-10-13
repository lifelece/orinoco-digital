# Spec 002 — Micrositio `/expofaja`: la vitrina unida al mapa

> Estado: BORRADOR (2026-10-12) — pasar por `/sdd-aclarar 002-micrositio-expofaja`
> Peticion de Luis (literal, mandato E2): "Una pagina ligera, con la identidad
> ExpoFaja, que cualquiera abre desde el QR en el museo y en 3 segundos sabe
> que charla hay ahora, que viene despues, quien habla, quien organiza y por
> que Ciudad Bolivar — y con un toque salta al mapa 3D de la ciudad."
> Origen: `docs/expofaja/E2-MICROSITIO-EXPOFAJA.md`; ADR-020 piezas 3, 4, 7, 8
> y 9; especificacion tecnica de Luis (Notion "04", copia del 2026-10-12)
> §3.3, §3.4, §6–§12. Autorizacion CCIEB 2026-10-12 (`AUTORIZACIONES.md`):
> **modo marcas**. Constitucion: `docs/constitution.md`.
> Relacionado: spec 001 (E1, en paralelo en la rama `expofaja-e1`).
> Fechas: vista previa miercoles 14; merge a `main` antes del jueves 15 a las
> 12:00; el evento abre el jueves 15 a las 17:00.
> Punto de partida (rama `expofaja-e2`): `b8840da` (E1 T1: ya publica
> `public/data/ciudad-bolivar-resumen.json`) + `878a8c5` (E2 T1: segunda
> entrada de Vite y esqueleto de `src/expofaja/`, sin Cesium en el build).

## 1. Contexto

El QR impreso para el Museo Soto apunta a `https://orinoco-digital.vercel.app/expofaja`.
Hoy esa ruta no existe (E1 la redirige temporalmente al mapa). El mapa pesa
(Lighthouse movil 25 por Cesium) y no dice que charla hay ni quien habla. La
web de la CCIEB no tiene agenda ni ponentes. Sin este micrositio, quien escanea
el QR en el evento espera a que cargue un globo 3D y no encuentra el programa.
El micrositio es una pagina sin Cesium, con la identidad ExpoFaja, que pone
el programa, el organizador y la evidencia de datos abiertos sobre Ciudad
Bolivar a un vistazo, con un boton al mapa.

## 2. Historias de usuario

- HU-1. Como visitante que escanea el QR en el museo, quiero ver en la primera pantalla que charla hay ahora, cual sigue, quien habla, quien organiza y por que Ciudad Bolivar, para orientarme sin buscar.
- HU-2. Como asistente, quiero la agenda por dia y agregar una sesion a mi calendario, para no perderme la que me interesa.
- HU-3. Como asistente, quiero saber quien es cada ponente y en que sesiones habla, para decidir a cual ir.
- HU-4. Como inversor o periodista, quiero ver separado lo que afirma el organizador y lo que muestran los datos abiertos, cada cosa con su fuente, para juzgar por mi cuenta.
- HU-5. Como visitante, quiero saltar con un toque al mapa 3D de Ciudad Bolivar, para ver la ciudad y la Faja.
- HU-6. Como CCIEB, quiero insertar el micrositio en mi WordPress sin doble barra de desplazamiento y que el salto al mapa salga del iframe, para completar mi pagina del evento.
- HU-7. Como aliado del evento, quiero ver mi logo en el muro y como participar, para tener visibilidad.
- HU-8. Como quien comparte el enlace en WhatsApp o lo busca en Google, quiero una tarjeta con nombre, fechas y sede, para reconocer el evento.
- HU-9. Como visitante sin JavaScript o con red muy lenta, quiero al menos leer el programa.
- HU-10. Como Luis, quiero cambiar la agenda editando la semilla y abriendo un PR, y simular "ahora" en desarrollo, para mantenerla viva durante el evento.

## 3. Definiciones

- **Micrositio**: la pagina servida en `/expofaja` y `/expofaja/` desde `expofaja/index.html`. Sin Cesium.
- **Contenido del evento**: todo texto que sale de las semillas (titulos, ejes, perfiles, afirmaciones y cifras del organizador, iniciativas, noticias, nombres de sala, de ponentes y de aliados). Es dato en espanol: no se traduce.
- **Hora del evento**: hora de Venezuela, UTC−04:00 fijo (sin horario de verano). Zona IANA `America/Caracas`.
- **Instante de una sesion**: `fecha` + `inicio` (o `fin`) de `agenda.json` interpretados en hora del evento. Ejemplo: `2026-10-16` + `09:00` = `2026-10-16T09:00:00-04:00`.
- **Sesion con hora**: sesion con `inicio` y `fin` no nulos. Hoy hay una sin hora (clausura del 17).
- **Sesion en curso**: sesion con hora cuyo intervalo `[inicio, fin)` contiene el instante actual (a las 12:00 en punto ya termino la de 11:00–12:00 y empezo la de 12:00).
- **Sala**: valor del campo `sala` de la sesion. Si falta, la sesion no tiene sala (no se rotula ninguna).
- **Estado del evento**: `antes` si el instante actual es anterior al primer inicio con hora del programa (2026-10-15 17:00); `despues` si es igual o posterior al ultimo fin con hora (2026-10-17 20:00); `durante` en otro caso.
- **Exposicion**: sesion de `tipo: "exposicion"` (08:00–20:00 los dias 16 y 17). Es el marco del dia, no una charla.
- **Modo embed**: la URL contiene el parametro `embed=1`.
- **Origenes de la CCIEB**: `https://camaradecomerciobolivar.org` y `https://www.camaradecomerciobolivar.org` (los mismos de `frame-ancestors`, ADR-020 §6).
- **Ponente visible**: ponente de `ponentes.json` con `en_programa: true` (13 hoy).
- **Aliado visible**: aliado de `aliados.json` con `nombre_confirmado: true` (4 institucionales y 49 comerciales hoy; 46 de esos 49 tienen logo publicable).
- **Resumen de Ciudad Bolivar**: `public/data/ciudad-bolivar-resumen.json`, producido por E1 con el contrato de la especificacion tecnica §3.3.
- **Placeholder**: valor entre corchetes en una semilla (`[perfil_pendiente]`, `[nombre]`...). Nunca se rellena (constitucion, principio 2).

## 4. Requisitos funcionales (EARS)

Datos y carga
- RF-1. EL SISTEMA DEBE tomar todo el contenido del evento solo de los archivos de `public/data/expofaja/` y las cifras de Ciudad Bolivar solo de `public/data/ciudad-bolivar-resumen.json`.
- RF-2. EL SISTEMA DEBE publicar en `public/data/expofaja/` una copia de las semillas `evento`, `agenda`, `ponentes`, `aliados`, `marcas-manifiesto`, `iniciativas-ccieb` y `noticias-ccieb` (esta ultima como `noticias.json`), identica a la semilla salvo las claves `_nota`.
- RF-3. SI `evento.json`, `agenda.json` o `ponentes.json` no se pueden cargar o no superan la validacion, ENTONCES EL SISTEMA DEBE mostrar un mensaje de error visible, un enlace a la pagina oficial del evento en la web de la CCIEB y un boton "Reintentar".
- RF-4. SI `aliados.json`, `marcas-manifiesto.json`, `noticias.json` o `iniciativas-ccieb.json` no se pueden cargar o no superan la validacion, ENTONCES EL SISTEMA DEBE mostrar en la seccion que los usa "Esta seccion no esta disponible en este momento" y presentar el resto de la pagina.
- RF-5. EL SISTEMA DEBE considerar invalida una agenda con una fecha fuera de 2026-10-15…2026-10-17, una hora que no sea `HH:MM` ni nula, un `tipo` fuera de {protocolo, exposicion, ponencia, mesa, pausa} o un `ponente_id` que no exista en `ponentes.json`.
- RF-6. EL SISTEMA DEBE considerar invalido un `evento.json` en el que alguno de sus bloques de contenido del organizador (sede, cada organizador, ccieb, contactos_evento, por_que_ciudad_bolivar, cada cifra del organizador, espacios, patrocinio, cada iniciativa anunciada) no tenga fuente.
- RF-7. EL SISTEMA DEBE considerar invalido un `noticias.json` con alguna URL fuera de `https://camaradecomerciobolivar.org/`.
- RF-8. EL SISTEMA DEBE referenciar solo fotos y logos que existen como archivo bajo `public/expofaja/`.

Cabecera y primera pantalla (seccion 1)
- RF-9. EL SISTEMA DEBE mostrar en la cabecera, sobre fondo `ef-petroleo`, la co-marca "Orinoco Digital ×" seguida del logo ExpoFaja para fondo oscuro, las fechas del evento, la sede y la linea "Organizan:" con los organizadores de `evento.json`.
- RF-10. EL SISTEMA DEBE ofrecer en la cabecera el boton "Ver agenda", que lleva a la seccion Agenda, y el boton "Ver Ciudad Bolívar en 3D", que abre `/?modo=ciudadBolivar` en la misma pestana.
- RF-11. DONDE el resumen de Ciudad Bolivar esta disponible, EL SISTEMA DEBE mostrar en la cabecera la frase "<n> de los <total> campos petroleros del mapa están a menos de <km> km en línea recta de Ciudad Bolívar", tomada del anillo de mayor radio del resumen, con un enlace a la seccion "¿Por qué Ciudad Bolívar?".
- RF-12. EL SISTEMA DEBE mostrar sin desplazamiento, en una pantalla de 390×844 px fuera del modo embed: logo, fechas, sede, linea "Organizan", el bloque Ahora/Siguiente con su primera entrada (o la cuenta regresiva, o "El evento terminó") y el boton "Ver Ciudad Bolívar en 3D".

Ahora / Siguiente (seccion 2)
- RF-13. EL SISTEMA DEBE interpretar toda hora del programa como hora del evento y comparar instantes, de modo que ningun resultado dependa de la zona horaria configurada en el dispositivo.
- RF-14. EL SISTEMA DEBE mostrar junto al bloque la hora actual en hora del evento ("Hora en Ciudad Bolívar: HH:MM").
- RF-15. MIENTRAS el estado del evento es `antes`, EL SISTEMA DEBE mostrar una cuenta regresiva en dias, horas y minutos hasta el primer inicio con hora del programa, y la sesion con la que abre.
- RF-16. MIENTRAS el estado es `durante`, EL SISTEMA DEBE mostrar bajo "Ahora" cada sesion en curso que no sea exposicion, una por sala, con hora, sala, titulo y ponente.
- RF-17. MIENTRAS el estado es `durante` y no hay ninguna sesion en curso que no sea exposicion, EL SISTEMA DEBE mostrar "No hay sesiones en este momento" bajo "Ahora".
- RF-18. MIENTRAS el estado es `durante`, EL SISTEMA DEBE mostrar bajo "Siguiente" la sesion con hora, que no sea exposicion, de inicio mas proximo posterior al instante actual; si varias empatan, la primera en el orden del programa.
- RF-19. SI durante el evento no queda ninguna sesion con hora posterior al instante actual, ENTONCES EL SISTEMA DEBE mostrar "No quedan sesiones con hora en el programa" bajo "Siguiente".
- RF-20. MIENTRAS una exposicion esta en curso, EL SISTEMA DEBE mostrar "Exposición abierta hasta las <fin>".
- RF-21. MIENTRAS el estado es `despues`, EL SISTEMA DEBE mostrar "El evento terminó" en lugar de Ahora/Siguiente y mantener visible el resto de la pagina.
  - Ampliado en E4.1 (docs/expofaja/E4-POST-EVENTO.md): en `despues` la cabecera dice "Se celebró del 15 al 17 de octubre de 2026", la franja se titula "Resumen" (sin cifras salvo las que publique la CCIEB), la agenda queda como archivo sin "Agregar a mi calendario" ni etiqueta "Ahora", y aparece la seccion "Lo que se hizo" (`presentacionEvento` en `agenda.js`).
- RF-22. MIENTRAS la pagina esta abierta, EL SISTEMA DEBE recalcular estado, Ahora, Siguiente, hora actual y cuenta regresiva al menos una vez por minuto, sin recargar.
- RF-23. DONDE la pagina se sirve desde el servidor de desarrollo, CUANDO la URL contiene `?ahora=AAAA-MM-DDTHH:MM`, EL SISTEMA DEBE usar ese instante, en hora del evento, como instante actual de todos los calculos de tiempo.
- RF-24. SI la pagina se sirve desde un build de produccion o el valor de `?ahora=` no es una fecha y hora validas, ENTONCES EL SISTEMA DEBE ignorar el parametro y usar el reloj del dispositivo.

Agenda (seccion 3)
- RF-25. EL SISTEMA DEBE mostrar la agenda con una pestana por dia del programa, expuesta como lista de pestanas accesible (rol, estado seleccionado y panel asociado) y operable con flechas, Inicio y Fin.
- RF-26. CUANDO se carga la pagina, EL SISTEMA DEBE seleccionar la pestana del dia actual en hora del evento si es un dia del programa, y la del primer dia en cualquier otro caso.
- RF-27. EL SISTEMA DEBE mostrar cada sesion en el orden del programa con hora de inicio y fin, sala si la tiene, tipo, titulo textual y, si tiene `ponente_id`, el ponente con su titulo, enlazado a su tarjeta.
- RF-28. SI una sesion no tiene hora, ENTONCES EL SISTEMA DEBE mostrar "Hora por confirmar" y no ofrecer el boton de calendario.
- RF-29. MIENTRAS una sesion esta en curso, EL SISTEMA DEBE marcarla en la agenda con la etiqueta "Ahora".
- RF-30. EL SISTEMA DEBE mostrar al pie de la agenda "Programa oficial de la CCIEB. Horarios y salas sujetos a cambios del organizador." con la fuente y la fecha de ultima verificacion de `agenda.json`.
- RF-31. CUANDO el usuario pulsa "Agregar a mi calendario" en una sesion con hora, EL SISTEMA DEBE descargar un archivo `.ics` generado en el navegador, sin peticiones de red.
- RF-32. EL SISTEMA DEBE generar el `.ics` conforme a RFC 5545: lineas terminadas en CRLF y plegadas a 75 octetos; un VCALENDAR con VERSION 2.0, PRODID `-//Orinoco Digital//ExpoFaja 2026//ES` y un VTIMEZONE `America/Caracas` (UTC−04:00); y un VEVENT con DTSTAMP en UTC, DTSTART y DTEND con `TZID=America/Caracas`, SUMMARY (titulo), LOCATION (nombre de la sede y ciudad de `evento.json`) y DESCRIPTION (ponente si lo hay, sala si la hay y "Programa oficial de la CCIEB").
- RF-33. EL SISTEMA DEBE asignar a cada sesion con hora un UID estable derivado de su fecha, hora de inicio y sala, con dominio `@orinoco-digital`, distinto para cada sesion del programa.
- RF-34. EL SISTEMA DEBE escapar en el `.ics` las barras invertidas, comas, puntos y coma y saltos de linea de los textos.

Ponentes (seccion 4)
- RF-35. EL SISTEMA DEBE mostrar una tarjeta por cada ponente visible, en el orden en que aparece por primera vez en el programa, y ninguna para los demas ponentes.
- RF-36. EL SISTEMA DEBE mostrar en cada tarjeta la foto del ponente si su `foto` no es nula, o un avatar con sus iniciales si lo es.
- RF-37. SI la foto de un ponente no carga, ENTONCES EL SISTEMA DEBE sustituirla por el avatar con sus iniciales.
- RF-38. EL SISTEMA DEBE mostrar en cada tarjeta titulo y nombre, el perfil tal como esta en `ponentes.json` con la atribucion "Perfil según materiales de la CCIEB" y sus fuentes, y la lista de sus sesiones (dia, hora, titulo).
- RF-39. SI el perfil de un ponente vale `[perfil_pendiente]`, ENTONCES EL SISTEMA DEBE mostrar "Perfil por confirmar" y ningun otro texto de perfil.
- RF-40. CUANDO el usuario pulsa una sesion en la tarjeta de un ponente, EL SISTEMA DEBE seleccionar la pestana de ese dia y llevar la vista a esa sesion.
- RF-41. EL SISTEMA DEBE dar a todas las tarjetas de ponente el mismo tamano, estilo y nivel de encabezado.

¿Por que Ciudad Bolivar? (seccion 5)
- RF-42. EL SISTEMA DEBE presentar la seccion en dos bloques separados y rotulados, "Lo que plantea el organizador" y "Lo que muestran los datos abiertos": en dos columnas en pantallas anchas y apilados, el del organizador primero, en telefono.
- RF-43. EL SISTEMA DEBE mostrar en "Lo que plantea el organizador" las afirmaciones de `por_que_ciudad_bolivar`, textuales, agrupadas por su clave, rotuladas como afirmaciones del organizador y con su fuente.
- RF-44. EL SISTEMA DEBE mostrar en la columna del organizador, en un bloque propio rotulado "Cifras del organizador (CCIEB)", cada cifra con su etiqueta, valor y fuente, y la advertencia de que Orinoco Digital no las ha verificado.
- RF-45. DONDE una cifra del organizador trae `contraste`, EL SISTEMA DEBE mostrarlo junto a esa cifra, rotulado "Contraste", con su texto completo.
- RF-46. DONDE el resumen esta disponible, EL SISTEMA DEBE mostrar en "Lo que muestran los datos abiertos": la frase de RF-11, el conteo de campos por anillo, los 5 campos mas cercanos a la sede con distancia y confianza y la nota "Línea recta, no ruta vial", los servicios OSM por clase, el metodo, las fuentes y la fecha de calculo del resumen.
- RF-47. SI el resumen no existe o no supera la validacion, ENTONCES EL SISTEMA DEBE mostrar en ese bloque "Los datos abiertos de Ciudad Bolívar no están disponibles en este momento." y un enlace al mapa, sin ninguna cifra.
- RF-48. EL SISTEMA DEBE mostrar bajo ambos bloques "Lo que impulsa la CCIEB": cada iniciativa de `iniciativas-ccieb.json` con su nombre y resumen textuales, la fecha de su fuente y un enlace a la nota de prensa.

El mapa (seccion 6)
- RF-49. EL SISTEMA DEBE mostrar la captura estatica del mapa con texto alternativo y un boton "Ver la sede y los campos cercanos en 3D" que abre `/?modo=ciudadBolivar&vuelo=<id de la sede>`, sin cargar el motor 3D en el micrositio.
- RF-50. SI la captura del mapa no carga, ENTONCES EL SISTEMA DEBE ocultar la imagen y mantener el boton.

Aliados (seccion 7)
- RF-51. EL SISTEMA DEBE mostrar primero los aliados institucionales visibles con su logo y despues los aliados comerciales visibles en el orden de `aliados.json`, cada logo con el nombre del aliado como texto alternativo.
- RF-52. SI un aliado tiene `nombre_confirmado: false`, ENTONCES EL SISTEMA DEBE omitir su nombre y su logo.
- RF-53. SI un aliado visible no tiene logo publicable en el manifiesto, ENTONCES EL SISTEMA DEBE mostrarlo como tarjeta de texto con su nombre, del mismo tamano que las de logo.

Participa (seccion 8)
- RF-54. EL SISTEMA DEBE mostrar cuatro tarjetas con datos de `evento.json`: Asistir (formulario de registro de la pagina de la CCIEB), Proponer una ponencia (correo de propuestas), Patrocinio (correo de patrocinio y pagina de la CCIEB) y la Bolsa de Empleo Energetica (nota de prensa de la CCIEB).
- RF-55. EL SISTEMA DEBE indicar en la seccion que Orinoco Digital no recoge datos ni vende espacios y que los enlaces llevan a la CCIEB, sin formularios propios ni precios.

Noticias (seccion 9)
- RF-56. EL SISTEMA DEBE mostrar las 4 noticias mas recientes de `noticias.json`, de la mas nueva a la mas antigua, con titulo textual y fecha, cada una enlazada a su URL en la web de la CCIEB.

Pie (seccion 10)
- RF-57. EL SISTEMA DEBE mostrar como primer elemento del pie el aviso "Contenido del evento provisto por la CCIEB. Orinoco Digital es un proyecto independiente y no respalda las posiciones de los ponentes."
- RF-58. EL SISTEMA DEBE mostrar en el pie "Organizan:" con el sello de la CCIEB y el logo de la Alcaldia de Angostura del Orinoco, las fuentes y licencias (CCIEB; OpenStreetMap, ODbL; Global Energy Monitor, CC BY 4.0; codigo Apache-2.0 con enlace al repositorio) y el aviso de marcas.
- RF-59. EL SISTEMA DEBE presentar a Orinoco Digital solo como autor del micrositio y del mapa, nunca como organizador ni patrocinador del evento.

Modo embed
- RF-60. CUANDO la URL contiene `embed=1`, EL SISTEMA DEBE ocultar la cabecera y el pie propios y mostrar al final un enlace "Abrir en pantalla completa" a `/expofaja/`.
- RF-61. MIENTRAS el modo embed esta activo, EL SISTEMA DEBE mostrar el aviso de RF-57 al final del contenido.
- RF-62. MIENTRAS el modo embed esta activo, EL SISTEMA DEBE abrir todo enlace en la ventana superior (`target="_top"`).
- RF-63. MIENTRAS el modo embed esta activo y la pagina esta dentro de un iframe, CUANDO cambia la altura del documento, EL SISTEMA DEBE enviar a la ventana padre `{ tipo: "expofaja:altura", altura }` dirigido solo a los origenes de la CCIEB, nunca a cualquier origen, con al menos 150 ms entre mensajes y enviando siempre la altura final.
- RF-64. MIENTRAS el modo embed esta activo, EL SISTEMA DEBE marcar la pagina como `noindex`.
- RF-65. MIENTRAS el modo embed no esta activo, EL SISTEMA DEBE abrir los enlaces externos en una pestana nueva sin acceso a la ventana de origen y los internos en la misma pestana.

Servidor y rutas
- RF-66. CUANDO se visita `/expofaja` (URL del QR) o `/expofaja/`, EL SISTEMA DEBE servir el micrositio con todas sus imagenes y datos, sin redirigir al mapa.
- RF-67. EL SISTEMA DEBE servir las rutas `/expofaja/(.*)` con la cabecera `Content-Security-Policy: frame-ancestors 'self' https://camaradecomerciobolivar.org https://www.camaradecomerciobolivar.org` y no anadirla a ninguna otra ruta.
- RF-68. EL SISTEMA DEBE servir `/data/expofaja/*.json` con `Cache-Control: public, max-age=300, stale-while-revalidate=3600`.
- RF-69. EL SISTEMA DEBE servir `/expofaja` sin referenciar el chunk de Cesium ni ningun recurso de `/cesiumStatic/`.

SEO y redes
- RF-70. EL SISTEMA DEBE titular la pagina "ExpoFaja Ciudad Bolívar 2026 — agenda, ponentes y mapa" y darle una meta descripcion con fechas y sede.
- RF-71. EL SISTEMA DEBE declarar Open Graph y Twitter (`summary_large_image`) con imagen `%SITIO_URL%/expofaja/og.png` de 1200×630 px y URL `%SITIO_URL%/expofaja/`, y `canonical` a `%SITIO_URL%/expofaja/`.
- RF-72. EL SISTEMA DEBE incluir JSON-LD `schema.org/Event` con `name`, `startDate` `2026-10-15T17:00-04:00`, `endDate` `2026-10-17T20:00-04:00`, `eventAttendanceMode` Offline, `eventStatus` Scheduled, `location` (el museo, con direccion y `geo`) y `organizer` (CCIEB con `url`, y la Alcaldia), sin `offers`, coherente con `evento.json` y `agenda.json`.
- RF-73. SI el navegador no ejecuta JavaScript, ENTONCES EL SISTEMA DEBE mostrar la agenda completa en texto (por dia: hora, sala, titulo y ponente de cada sesion) y un enlace a la pagina oficial de la CCIEB.

Idioma, neutralidad y movimiento
- RF-74. EL SISTEMA DEBE mostrar los textos de interfaz en el idioma activo del sitio (ES o EN, la misma preferencia que el mapa) y ofrecer en la cabecera un control para cambiarlo.
- RF-75. CUANDO cambia el idioma, EL SISTEMA DEBE volver a presentar la pagina en el nuevo idioma sin recargar, conservando la pestana de dia seleccionada.
- RF-76. EL SISTEMA DEBE marcar con `lang="es"` el contenido del evento y mostrarlo sin traducir, tambien con la interfaz en ingles.
- RF-77. MIENTRAS el sistema operativo pide movimiento reducido, EL SISTEMA DEBE mostrar la pagina sin animaciones ni transiciones de entrada y sin desplazamiento suave.

## 5. Requisitos no funcionales

- RNF-1. JS propio del micrositio (todo lo que carga `/expofaja`, incluidos los diccionarios i18n compartidos) <= 30 KB gzip.
- RNF-2. Imagenes: cada una <= 60 KB; logos <= 40 KB; `mapa.webp` <= 120 KB (excepcion explicita del mandato, seccion 6); `og.png` 1200×630 <= 300 KB (objetivo conservador para vistas previas de mensajeria, SIN VERIFICAR como limite exacto). Todas con `width`/`height`; `loading="lazy"` salvo el logo de la cabecera.
- RNF-3. LCP <= 2,5 s en 4G simulada; Lighthouse movil de `/expofaja/` >= 90 en rendimiento y en accesibilidad (anotados en el PR).
- RNF-4. Contrastes de `02-IDENTIDAD-VISUAL.md` §3: texto >= 4,5:1; `ef-cian`, `ef-naranja` y `ef-gris` nunca como texto sobre fondo claro; `ef-verde` solo texto grande; en cuerpo claro, las variantes `-texto`.
- RNF-5. Objetivos tactiles >= 44×44 px; foco visible en todo elemento interactivo; un unico `h1` (tambien en modo embed, aunque sea visualmente oculto); jerarquia de encabezados sin saltos.
- RNF-6. Sin scroll horizontal desde 360 px de ancho; diseno movil primero, comprobado a 390×844.
- RNF-7. Sin dependencias nuevas (nada de GSAP, Swiper, librerias de calendario, fechas o QR); sin fuentes web; sin cambios en `package.json`.
- RNF-8. Modulos: nada de `src/expofaja/` importa `cesium` ni modulos fuera de `src/expofaja/`, `src/config.js` y `src/i18n/index.js`; dentro de `src/expofaja/` solo `datos.js` hace `fetch`; `agenda.js` y `datos.js` no tocan el DOM; ningun `postMessage` con destino `"*"`. Lo comprueba `npm test` (`verificar:modulos`).
- RNF-9. Privacidad: sin cookies, sin analitica, sin formularios ni peticiones a terceros; el unico almacenamiento es la preferencia de idioma que ya usa el mapa.
- RNF-10. Neutralidad (ADR-020 pieza 8): agenda y perfiles textuales y atribuidos; ningun ponente ni sesion destacado por encima del orden del programa; aviso de independencia siempre presente; cifras del organizador en bloque propio y rotulado.
- RNF-11. Marcas (ADR-020 pieza 7, 02 §8): solo archivos de `public/expofaja/marcas/` y `public/expofaja/ponentes/`, tal cual (no se re-descargan, re-comprimen ni recolorean); logo ExpoFaja >= 120 px de ancho en pantalla.
- RNF-12. Un cambio de agenda (semilla -> copia -> PR -> merge) se ve en produccion en <= 5 minutos despues del deploy (cache de 300 s).

## 6. Casos limite

| Caso | Comportamiento esperado | RF |
|---|---|---|
| Telefono con zona horaria distinta (p. ej. Madrid) a las 11:59 del 16 en Caracas | Ahora: Farias (Sala 5); igual que en Caracas | RF-13, RF-16 |
| 11:59 / 12:00 del 16 | 11:59: Ahora Farias, Siguiente la pausa; 12:00: Ahora la pausa | RF-16, RF-18 |
| 08:00 del 15 | Estado `antes`: cuenta regresiva al 15 17:00, abre con el acto inaugural; Ahora vacio | RF-15 |
| 15 17:00 en punto | Estado `durante`; Ahora: acto inaugural | RF-16 |
| 16 03:00 (entre dias) | `durante`; "No hay sesiones en este momento"; Siguiente: 09:00 del 16 | RF-17, RF-18 |
| 16 18:30 (hueco 18:00–19:00) | Ahora vacio + "Exposición abierta hasta las 20:00"; Siguiente: cierre de la jornada 19:00 | RF-17, RF-20 |
| 17 17:45 | Ahora vacio; exposicion abierta hasta 20:00; Siguiente: "No quedan sesiones con hora" (la clausura no tiene hora) | RF-19, RF-20 |
| 17 20:00 en punto y 21:00 | `despues`: "El evento terminó"; agenda visible | RF-21 |
| Pagina abierta mientras cambia la sesion | En <= 1 min se actualiza sin recargar | RF-22 |
| `?ahora=2026-10-16T10:30` en `npm run dev` | Ahora: Perez Graterol | RF-23 |
| `?ahora=` en la vista previa o produccion | Ignorado: hora real | RF-24 |
| `?ahora=manana` en desarrollo | Ignorado: hora real | RF-24 |
| Clausura del 17 (sin hora) | "Hora por confirmar", sin boton de calendario, nunca en Ahora/Siguiente | RF-28, RF-19 |
| Sesion sin sala (inauguracion, pausas, exposicion) | Sin rotulo de sala; en Ahora se lista sin sala | RF-16, RF-27 |
| Mesa sin `ponente_id` | Sin linea de ponente (no "Exponentes invitados": la semilla no lo trae) | RF-27 |
| Ponente sin foto (6) | Avatar con iniciales | RF-36 |
| Foto que falla al cargar | Avatar con iniciales | RF-37 |
| Perfil `[perfil_pendiente]` (5) | "Perfil por confirmar" | RF-39 |
| Ponente con `titulo: ""` (William Hernandez) | Solo el nombre; no se inventa titulo | RF-38 |
| Alvaro Silva Calderon (`en_programa: false`) | No aparece en ninguna parte | RF-35 |
| Aliado con `nombre_confirmado: false` (4) | No aparece | RF-52 |
| Aliado confirmado sin logo (3) | Tarjeta de texto | RF-53 |
| Resumen de E1 ausente o con otra forma | Bloque "datos abiertos" con el aviso y enlace al mapa, sin cifras; la frase de la cabecera no aparece | RF-47, RF-11 |
| `noticias.json` no carga | Seccion Noticias con "no disponible"; el resto intacto | RF-4 |
| `agenda.json` no carga (error de red) | Mensaje de error, enlace a la CCIEB, "Reintentar" | RF-3 |
| Sin JavaScript | Agenda completa en texto | RF-73 |
| `mapa.webp` ausente | Solo el boton al mapa | RF-50 |
| `/expofaja` sin barra final (QR) | Micrositio completo, imagenes y datos incluidos | RF-66 |
| `?embed=1` abierto fuera de un iframe | Sin cabecera ni pie, con "Abrir en pantalla completa"; no envia mensajes | RF-60, RF-63 |
| Iframe en un dominio que no es la CCIEB ni Vercel | El navegador lo bloquea por `frame-ancestors` | RF-67 |
| Interfaz en ingles | Interfaz traducida; contenido del evento en espanol con `lang="es"` | RF-74, RF-76 |
| Telefono 360 px | Sin scroll horizontal; pestanas y botones >= 44 px | RNF-5, RNF-6 |
| `prefers-reduced-motion` | Sin animaciones ni scroll suave | RF-77 |
| Navegador embebido (WhatsApp, Instagram) que no descarga `.ics` | El resto funciona; se anota en la verificacion de Luis | RF-31 |

## 7. Datos que faltan (placeholders y huecos de las semillas)

Ninguno se rellena. Asi se muestran:

| Dato | Donde (semilla) | Como se muestra | RF |
|---|---|---|---|
| `perfil: "[perfil_pendiente]"` de Linares Gabaldon, Y. Hernandez, Jhon Madero, Sanchez P. y W. Hernandez | `ponentes.json` | "Perfil por confirmar" | RF-39 |
| `foto: null` de esos 5 y de Iguaran Valdeblanquez | `ponentes.json` | Avatar con iniciales | RF-36 |
| `titulo: ""` de William Hernandez | `ponentes.json` | Solo el nombre | RF-38 |
| Comision de Jehyson Guzman (afiche y prensa difieren; `nota`) | `ponentes.json` | El `perfil` tal cual, atribuido; la `nota` no se muestra | RF-38 |
| `inicio`/`fin` nulos de la clausura del 17 | `agenda.json` | "Hora por confirmar"; sin `.ics`; fuera de Ahora/Siguiente | RF-28 |
| `sala` ausente (7 sesiones) | `agenda.json` | Sin rotulo de sala | RF-27 |
| Sala inferida por la maquetacion (7 sesiones, en `nota`) | `agenda.json` | La sala tal cual + aviso general "Horarios y salas sujetos a cambios del organizador"; las `nota` no se muestran (decision por defecto, duda 4) | RF-30 |
| Lugar del acto inaugural ("Lobby", solo en `nota`) | `agenda.json` | No se muestra (las `nota` no se publican) | RF-27 |
| Mesas sin ponente ("Exponentes invitados" solo en el `.md`) | `agenda.json` | Sin linea de ponente | RF-27 |
| Ponente fuera del programa (Alvaro Silva Calderon) | `ponentes.json` | No aparece | RF-35 |
| Recorte duplicado del afiche ("Alfredo Ordonez Lopez", fila 3) | solo `data/raw/` | No existe en `public/`; no aparece | RF-8 |
| `[ALI — nombre por confirmar]`, `[logo circular 'C' — ...]`, `Naviera`, `Don Ventura (por confirmar)` | `aliados.json` | No aparecen | RF-52 |
| 9 logos `sin_identificar_en_web` | `aliados.json`, manifiesto | No aparecen | RF-51 |
| Aliados confirmados sin logo: Cauchos DV Store 4Wheels, Parke 52 (Puerto Ordaz), Ledezma Asesores Inmobiliarios & Financieros | `aliados.json` | Tarjeta de texto (decision por defecto, duda 5) | RF-53 |
| Logo publicable de la CCIEB (`publicable: null` en su entrada; el publicable es `ccieb.webp`) | manifiesto | Se usa `public/expofaja/marcas/ccieb.webp` (listado en "Marcas del evento derivadas") | RF-51, RF-58 |
| Contraste solo en "Produccion de petroleo (pais)"; `01-DATOS-EVENTO.md` §7 menciona otros dos choques (> 1 billon vs USGS recuperables; ~55.000 km²) sin `contraste` en la semilla | `evento.json` | Solo el contraste que trae la semilla (duda 3) | RF-45 |
| `ubicacion.pendiente: "[coord_sede_ccieb]"` de dos iniciativas | `iniciativas-ccieb.json` | E2 no muestra ubicaciones: no aplica | RF-48 |
| `[nombre]`, `[cargo]`, `[medio]`, `[archivo]` de la autorizacion | `AUTORIZACIONES.md` | No van a la interfaz; el pie dice "usadas con autorizacion de la CCIEB" sin nombrar a nadie | RF-58 |
| Coordenada de la sede (`confianza: media`, "E1 debe regenerarla") | `evento.json` | Solo en el `geo` del JSON-LD, igual a la copia publicada (test) | RF-72 |
| `mapa.webp` y `og.png` | no existen | Se producen en E2 (plan); sin `mapa.webp`, RF-50 | RF-49, RF-71 |

## 8. Fuera de alcance

- E1: modo Ciudad Bolivar, anillos, `t(clave, params)` con interpolacion en `src/i18n/index.js`, generacion del resumen, la redireccion temporal y la seccion 16 de `docs/DATA_SOURCES.md`. E2 los consume, no los reimplementa.
- E3: `docs/expofaja/prueba-embed.html`, el codigo y los pasos para el administrador del WordPress, el PDF de entrega y la prueba en `camaradecomerciobolivar.org`.
- E4: modo "memoria del evento" tras el 17/10, noticias automaticas desde la API de WordPress, mapaton.
- Precios de espacios y planes de patrocinio, formularios propios, registro de asistentes, analitica.
- Traduccion del contenido del evento.
- Isotipo como marca de agua en la cabecera (02 §9: opcional, sin archivo en el kit).
- Generar QR (ya existe en `docs/expofaja/qr/`).
- Tocar `src/i18n/index.js`, `src/map.js`, `src/main.js`, `src/ui/`, `src/style.css`, `index.html` raiz o `package.json`.

## 9. Criterios de aceptacion

- [ ] Todos los RF con su test o comprobacion (trazabilidad en `plan.md` §4).
- [ ] `npm test` en verde (incluye `verificar:modulos` con las reglas de RNF-8).
- [ ] `npm run build` + `node scripts/verificar-build-expofaja.mjs`: sin chunk de Cesium en `/expofaja`, JS <= 30 KB gzip, imagenes dentro de RNF-2; pesos anotados en el PR.
- [ ] Lighthouse movil de `/expofaja/` (rendimiento y accesibilidad) anotado en el PR; meta >= 90.
- [ ] En la vista previa: `curl.exe -sI <preview>/expofaja` sirve el micrositio (sin 307 al mapa); `frame-ancestors` en `/expofaja/` y no en `/`; `Cache-Control` de RF-68 en `/data/expofaja/agenda.json`.
- [ ] El `.ics` se importa en Google Calendar y en el calendario del telefono con la hora correcta.
- [ ] `?ahora=` probado en `npm run dev:host` (11:59 y 12:00 del 16, antes y despues del evento).
- [ ] Diff revisado: sin dependencias, sin datos inventados, ningun placeholder rellenado, ninguna clave i18n fuera de `expofaja.*` anadida.
- [ ] Luis (STOP del mandato): telefono real, datos moviles, DevTools cerrado: cabecera, agenda, ponentes, salto al mapa 3D y vuelta atras; QR impreso escaneado con dos telefonos; logos nitidos en claro y oscuro; muro de aliados completo; avatares donde no hay foto; aviso de independencia visible al llegar al pie.
- [ ] PR abierto contra `main`; merge solo con el OK de Luis y antes del jueves 15 a las 12:00.

## 10. Decisiones tomadas

Confirmadas por Luis el 2026-10-12:
- Cargos y perfiles de ponentes: textuales, tal como estan en `ponentes.json`, y atribuidos a la CCIEB (RF-38).
- Bloque "Cifras del organizador (CCIEB)": si en E2, en la columna izquierda de la seccion 5, rotulado y separado de "Lo que muestran los datos abiertos"; si una cifra choca con una fuente del repo se muestran ambas con su fuente (campo `contraste`) (RF-44, RF-45).

Por defecto, reversibles (las que tocan a Luis estan tambien en §11):
- La frase de los anillos y la linea "Organizan" van en la cabecera para cumplir los "3 segundos" (RF-11, RF-12).
- Las `nota` de la agenda no se publican; aviso general de cambios (RF-30).
- Aliados confirmados sin logo: tarjeta de texto (RF-53).
- Sin precios de espacios ni de patrocinio (RF-55).
- Ponentes en orden del programa (RF-35).

## 11. Dudas abiertas (maximo 5, ninguna bloquea: cada una tiene valor por defecto)

1. [NECESITA ACLARACION: el QR apunta a `/expofaja` sin barra. Si en la vista previa esa URL no sirve el micrositio, ¿autorizas anadir a `vercel.json` una redireccion temporal `/expofaja` -> `/expofaja/`?] — afecta RF-66. Por defecto: se comprueba en la vista previa y solo se pide si falla.
2. [NECESITA ACLARACION: `mapa.webp` debe salir del propio mapa en modo Ciudad Bolivar (E1), con token de Cesium y WebGL. ¿La capturas tu desde tu navegador, o se acepta la seccion 6 solo con el boton hasta tenerla?] — afecta RF-49. Por defecto: sin captura, RF-50.
3. [NECESITA ACLARACION: `01-DATOS-EVENTO.md` §7 senala dos choques mas ("> 1 billon de barriles" frente a USGS recuperables; "~55.000 km²" frente a la caja USGS) que la semilla no trae como `contraste`. ¿Anades esos textos a `evento.json` o se muestran solo las cifras?] — afecta RF-45. Por defecto: solo el contraste que trae la semilla.
4. [NECESITA ACLARACION: 7 sesiones tienen sala "inferida por la maquetacion". ¿Basta el aviso general "Horarios y salas sujetos a cambios del organizador" o quieres "(por confirmar)" junto a cada una de esas salas?] — afecta RF-27, RF-30. Por defecto: aviso general.
5. [NECESITA ACLARACION: tres aliados confirmados en el brochure no tienen logo (Cauchos DV Store 4Wheels, Parke 52, Ledezma Asesores). ¿Tarjeta de texto con su nombre u omitirlos hasta tener logo?] — afecta RF-53. Por defecto: tarjeta de texto.
