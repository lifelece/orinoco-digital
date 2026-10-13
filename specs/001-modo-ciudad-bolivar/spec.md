# Spec 001 — Modo Ciudad Bolivar: la ciudad como eje del mapa

> Estado: CERRADA (2026-10-13). En produccion (PR #6); gate de Luis en telefono real superado.
> Validada por el revisor (cambios aplicados) y en navegador headless a 1440x900
> y 390x844. Dudas 1 y 2 resueltas; la 3 (D10) aplicada.
> Peticion de Luis (literal): "poner a ciudad Bolivar como eje del mapa y las
> cosas que quiere hacer la camara de comercio y la Expo"
> Origen: `docs/expofaja/E1-MODO-CIUDAD-BOLIVAR.md` (mandato con datos medidos),
> ADR-020 piezas 1, 2, 5, 7 y 10 (aceptadas el 2026-10-12). Autorizacion CCIEB: 2026-10-12.
> Constitucion: `docs/constitution.md`. Fecha objetivo: martes 2026-10-13.

## 1. Contexto

En el mapa, Ciudad Bolivar es apenas un punto. La CCIEB la impulsa como
"Capital Estrategica de la Faja". Con datos abiertos se puede mostrar su
cercania a los campos y sus servicios, y poner encima lo que la Camara y la
ExpoFaja (15-17/10) anuncian, atribuido. Sin esto, el QR del evento lleva a
una vista nacional donde la ciudad no aparece.

## 2. Historias de usuario

- HU-1. Como asistente que escanea el QR de la ExpoFaja, quiero que el mapa
  abra en Ciudad Bolivar mirando hacia la Faja, para ver lo cerca que esta.
- HU-2. Como representante de la CCIEB, quiero ver sobre el mapa lo que la
  Camara impulsa, atribuido, para usarlo como evidencia.
- HU-3. Como inversor o periodista, quiero ver aeropuerto, puente,
  universidades, salud, hoteles, banca y transporte de la ciudad.
- HU-4. Como usuario habitual, quiero volver a la vista nacional de un toque.

## 3. Definiciones

- **Modo Ciudad Bolivar**: estado de la app con camara, anillos, capas,
  cabecera y panel descritos aqui. Lo contrario es la **vista nacional**
  actual (`volarAFaja()`).
- **Centro**: punto de referencia de Ciudad Bolivar en OSM, relacion
  `14534562` (8.10285 N, -63.54696 O, via Nominatim).
- **Distancia a un campo**: linea recta desde el centro (o la sede) al
  vertice mas cercano de la geometria GEM del campo, en km.
- **Anillo**: circulo geodesico de radio 50, 100, 150 o 200 km desde el centro.
- **Servicio**: elemento OSM de las clases `sede_evento`, `aeropuerto`,
  `puente`, `educacion_superior`, `salud`, `hotel`, `banca`, `transporte`
  (seleccion exacta en el mandato E1, tabla "Datos: servicios").
- **Iniciativa**: entrada de `docs/expofaja/semillas/iniciativas-ccieb.json`
  con nota de prensa y fecha. **Con ubicacion** = punto con fuente.

## 4. Requisitos funcionales (EARS)

Entrada y salida del modo
- RF-1. CUANDO la URL contiene `?modo=ciudadBolivar`, EL SISTEMA DEBE abrir en el modo Ciudad Bolivar.
- RF-2. CUANDO la URL no contiene `?modo=` y `MODO_INICIAL` vale `ciudadBolivar`, EL SISTEMA DEBE abrir en el modo Ciudad Bolivar.
- RF-3. CUANDO la URL contiene `?modo=nacional`, EL SISTEMA DEBE abrir en la vista nacional.
- RF-4. CUANDO el modo se activa, EL SISTEMA DEBE colocar la camara sobre el centro con rumbo norte e inclinacion oblicua, de modo que se vea completo el anillo de 150 km en escritorio (1440x900) y el de 100 km en telefono vertical (390x844).
- RF-5. CUANDO el usuario pulsa "Ver toda la Faja" o usa el gesto atras del navegador, EL SISTEMA DEBE volar a la vista nacional y retirar anillos, cabecera y panel del modo.
- RF-6. CUANDO el usuario pulsa "Ver Ciudad Bolivar" desde la vista nacional, EL SISTEMA DEBE volver a activar el modo.

Anillos y cercania
- RF-7. MIENTRAS el modo esta activo, EL SISTEMA DEBE dibujar los 4 anillos con la etiqueta "<radio> km · <n> campos" en su borde norte.
- RF-8. EL SISTEMA DEBE obtener los conteos por anillo calculandolos desde `campos.geojson`, nunca escritos a mano. Fixture de test: 0 / 10 / 45 / 63, con tolerancia de +-1 por anillo.
- RF-9. CUANDO el usuario abre la ficha de la sede del evento (OSM `relation/7948635`, Museo Soto), EL SISTEMA DEBE listar los 5 campos mas cercanos con su distancia y dibujar hacia cada uno una linea discontinua rotulada "linea recta". Fixture (+-1 km): Dobokubi 57,2 · Melones 73,8 · Cerro Negro (Anzoategui) 74,4 · Cerro Negro (Monagas) 74,4 · Hamaca 76,8.
- RF-10. CUANDO se cierra esa ficha, EL SISTEMA DEBE retirar las lineas de proximidad.

Servicios
- RF-11. MIENTRAS el modo esta activo, EL SISTEMA DEBE mostrar encendidas las capas de servicios, iniciativas y campos, sin cambiar el estado de las demas capas.
- RF-12. EL SISTEMA DEBE generar la capa de servicios con un script desde OSM, con `fuente`, `confianza` y `ultima_verificacion` en cada feature, y listar en consola los elementos excluidos por el filtro.
- RF-13. SI un servicio no tiene nombre en OSM, ENTONCES EL SISTEMA DEBE mostrar "Sin nombre en OpenStreetMap" con enlace al elemento.

Lo que impulsan la CCIEB y la ExpoFaja
- RF-14. EL SISTEMA DEBE dibujar en el mapa solo las iniciativas con ubicacion.
- RF-15. MIENTRAS el modo esta activo, EL SISTEMA DEBE listar todas las iniciativas en el panel "Lo que impulsa la CCIEB", cada una con su fecha y el enlace a su nota de prensa.
- RF-16. MIENTRAS el modo esta activo, EL SISTEMA DEBE mostrar una cabecera (DOM, no sobre el terreno) con "Ciudad Bolivar · Capital Estrategica de la Faja", "En alianza con", los logos de la CCIEB y de la ExpoFaja y el boton "Ver toda la Faja".

Enlaces y errores
- RF-17. CUANDO la URL contiene `?vuelo=<id>` de una feature existente, EL SISTEMA DEBE volar a ella y abrir su ficha.
- RF-18. SI `?vuelo=` o `?capa=` nombran algo que no existe, ENTONCES EL SISTEMA DEBE ignorar el parametro y abrir con normalidad.
- RF-19. CUANDO se visita `/expofaja`, EL SISTEMA DEBE redirigir de forma temporal (no permanente) a `/?modo=ciudadBolivar`.
- RF-20. SI falla la carga de una capa del modo, ENTONCES EL SISTEMA DEBE mostrar el aviso con `mostrarError` y mantener el resto del mapa usable.
- RF-21. EL SISTEMA DEBE mostrar todos los textos del modo en ES y EN, sin traducir nombres propios ni titulos de iniciativas.

## 5. Requisitos no funcionales

- RNF-1. Cada GeoJSON nuevo: <= 200 KB y <= 300 features.
- RNF-2. JS propio por debajo de 150 KB gzip.
- RNF-3. Marcadores de la ciudad en `COLOR_CIUDAD`; cian y naranja de la marca ExpoFaja prohibidos en marcadores (chocan con gas y crudo). La co-marca solo en la cabecera.
- RNF-4. Sin dependencias nuevas; la interfaz del modo sin `cesium` ni `fetch` (lo comprueba `verificar:modulos`).
- RNF-5. Frase publicable, exacta: "63 de los 105 campos petroleros del mapa estan a menos de 200 km en linea recta de Ciudad Bolivar". Nunca "de la Faja" ni "por carretera".
- RNF-6. Ninguna distancia a bloques: no tienen geometria con fuente.

## 6. Casos limite

| Caso | Comportamiento esperado | RF |
|---|---|---|
| Datos moviles lentos | El modo se ve con anillos y campos aunque servicios tarde | RF-20 |
| Capa de servicios no carga | Aviso visible; anillos y campos siguen | RF-20 |
| `?vuelo=` con id inexistente | Abre el modo sin error | RF-18 |
| Telefono vertical 390x844 | Anillo de 100 km completo; cabecera sin tapar el mapa | RF-4, RF-16 |
| Dos campos con el mismo nombre (Cerro Negro) | Se listan ambos, sin deduplicar | RF-9 |
| Iniciativa sin ubicacion | Solo en el panel | RF-14, RF-15 |
| Idioma EN | Interfaz traducida; nombres e iniciativas intactos | RF-21 |
| `prefers-reduced-motion` | Sin vuelo animado (ADR-018) | RF-4, RF-5 |

## 7. Fuera de alcance

- Micrositio ExpoFaja (E2), insercion en WordPress (E3), post-evento (E4).
- Sede de la CCIEB en el mapa: no esta en OSM (`[coord_sede_ccieb]`).
- Cifras del organizador en el mapa (van en E2).
- Medicion de visitas.

## 8. Criterios de aceptacion

- [ ] Tests: distancia minima (Point, Polygon, MultiPolygon), conteo por anillo (fixture RF-8), 5 mas cercanos (fixture RF-9), circulo geodesico (radio +-0,5 %), sede a menos de 300 m de la verificacion, procedencia en toda feature nueva.
- [ ] `npm test`, `npm run data:validate` y `npm run build` en verde.
- [ ] RNF-1 y RNF-2 medidos y anotados en el PR.
- [ ] Capturas antes/despues en `docs/capturas/e1-*` (escritorio y movil).
- [ ] Luis: telefono real, datos moviles, DevTools cerrado: carga, modo, anillos, ficha, lineas, salir, gesto atras, `/expofaja`, QR.

## 9. Dudas abiertas

1. [RESUELTA 2026-10-12: ADR-020 aceptado para las piezas 1, 2, 5, 7 y 10 (prompt de E1 de Luis). Se copia a `docs/DECISIONS.md` en la tarea C6.]
2. [RESUELTA 2026-10-12: Luis: los textos de las iniciativas se publican tal cual estan en la semilla, atribuidos a la CCIEB con fecha y enlace a su nota de prensa.]
3. [NECESITA ACLARACION: el panel lista las 6 iniciativas (RF-15), pero `iniciativas-ccieb.geojson` solo trae las 2 con ubicacion (RF-14), y `api.js` solo puede devolver FeatureCollection (constitucion 4). Propuesta del plan (D10): `api.js` importa la semilla en el build y la devuelve como FeatureCollection sin geometria; sin archivo nuevo en `public/data/`, ~4 KB en el bundle. Alternativa: GeoJSON aparte servido como estatico, con excepcion en el validador. Se implementa la propuesta (decision tecnica del coordinador, 2026-10-12; Luis puede vetarla).]
