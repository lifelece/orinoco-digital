# 00 — Contexto: ExpoFaja 2026 x Orinoco Digital

> Leer completo antes de cualquier etapa. Todo lo que aqui se afirma tiene
> fuente en `semillas/` o en la seccion "Fuentes" al final.

---

## 1. Que paso el 12/10/2026

Luis asistio como **invitado en calidad de creador de contenido y medios** a
un encuentro previo de la ExpoFaja en la sede de la CCIEB (sala con el
backing institucional de la Camara y microfonos de medios). Ahi expuso
Orinoco Digital y propuso trabajar en conjunto con la Expo y la Camara.
`[confirmar_formato: rueda de prensa / encuentro con medios]`

Ideas textuales de su intervencion (transcripcion automatica, revisada; el
archivo crudo esta en `data/raw/expofaja/referencias/`):

- "Yo tengo ya un proyecto relacionado con la Faja Petrolifera del Orinoco,
  un mapa 3D."
- "Trabajaremos mucho con la Camara de Comercio para poder utilizar sus
  recursos y hagamos un intercambio fructifero, ya que ese programa es open
  source."
- "En el mapa, Ciudad Bolivar solo tiene la zona del puerto. A mi me gustaria
  agregar todo lo que estamos poniendo alrededor de la Faja Petrolifera del
  Orinoco, no solo para impulsar las cosas que esta haciendo la ciudad o la
  Camara de Comercio, sino para poder decir en el mapa que Ciudad Bolivar
  existe."
- "Muchas veces viajamos y uno dice que es de Ciudad Bolivar y le preguntan:
  ¿donde es eso?"

**Ese es el norte de todo este paquete: Ciudad Bolivar como eje del mapa,
con lo que la Camara y la Expo quieren impulsar encima.** (Precision de Luis,
12/10, 15:23.) La CCIEB autorizo ese mismo dia el uso de todos sus recursos
(`AUTORIZACIONES.md`).

## 2. La tesis

La CCIEB tiene una narrativa ("Ciudad Bolivar: Capital Estrategica de la Faja
Petrolifera del Orinoco", presentada el 2026-07-23) y una vitrina (la
ExpoFaja). Orinoco Digital tiene lo que a esa narrativa le falta: **evidencia
navegable con datos publicos**. La union no es poner logos en un mapa; es que
cada afirmacion de la vitrina tenga al lado lo que los datos abiertos
muestran, con fuente.

| Parte | Que aporta | Que gana |
|---|---|---|
| CCIEB / ExpoFaja | Contenido del evento, red de aliados, legitimidad institucional, canal de prensa | Vitrina digital interactiva, agenda viva el dia del evento, evidencia verificable para inversionistas, contenido para medios |
| Orinoco Digital (Luis) | Mapa 3D, datos trazables, desarrollo, criterio editorial | Caso de uso real, alianza institucional, visibilidad, portafolio (administracion + geociencias), contactos del sector |
| Ciudad Bolivar | — | Aparece en el mapa con sus servicios reales, no solo como un punto |

## 3. Quien es quien (solo informacion publica de la CCIEB)

| Persona / entidad | Rol | Por que importa aqui |
|---|---|---|
| CCIEB | Organizador. Fundada el 5 de febrero de 1900 | Duena del contenido del evento y de la marca |
| Alcaldia de Angostura del Orinoco | Co-organizador (brochure p.10) | Segunda marca institucional en "Organizado por" |
| Dr. Wuilfredo Carrasco | Presidente CCIEB | Decide la colaboracion |
| Ilich Oviedo | Segundo vicepresidente CCIEB | Presento las proyecciones economicas del proyecto paraguas |
| Doris Mendoza | Directora CCIEB | Presento la marca e imagen oficial: **contacto natural para logos y uso de marca** |
| Rosmary Torres | Directora CCIEB | Participacion, patrocinio y unidades de negocio |
| Prensa CCIEB | Publica en el WordPress de la Camara | Fuente de noticias (REST API publica, ver E4) |

Contactos del evento y de la Camara: `semillas/evento.json` -> `ccieb` y
`contactos_evento`.

## 4. ExpoFaja en 6 lineas

- **Expo Faja Ciudad Bolivar 2026 — "Capital Estrategica"**. 15, 16 y 17 de
  octubre de 2026, Museo de Arte Moderno Jesus Soto, Ciudad Bolivar.
- Jueves 15: acto inaugural 17:00–20:00 (lobby del museo).
- Viernes 16 y sabado 17: exposicion 08:00–20:00 y dos ciclos de
  conferencias (Salas 5 y 6). 13 ponentes en el programa oficial (14 con el afiche).
- Pilares: ruedas de negocio B2B, foros tecnicos, exposicion comercial.
- Lanzamiento de la **Bolsa de Empleo Energetica** (petroleo, electricidad y
  mineria) durante la Expo.
- Detalle completo: `01-DATOS-EVENTO.md` y `semillas/`.

## 5. Estado del repo que condiciona esto

| Hecho | Consecuencia para ExpoFaja |
|---|---|
| Produccion en https://orinoco-digital.vercel.app; merge a `main` = deploy | Cada etapa pasa por vista previa de Vercel y PR antes de `main` |
| Ciudad Bolivar hoy es solo una etiqueta de Natural Earth (`toponimia.geojson`, -63.6, 8.1) | E1 la convierte en el eje: modo Ciudad Bolivar como portada, anillos de distancia, servicios e iniciativas |
| `BLOQUES` de la Faja tienen `centro: null` (sin fuente verificada) | **No** dibujar "distancia a Junin/Ayacucho..." como bloque. Se mide a **campos** GEM, que si tienen geometria |
| Lighthouse movil 25: Cesium bloquea la interfaz | El micrositio `/expofaja` **no carga Cesium**. El mapa se abre con un boton |
| `ui.js` 1.787 lineas; ADR-017 manda codigo nuevo a `src/ui/` | Lo nuevo del mapa va en `src/ui/ciudadBolivar.js`; el micrositio en `src/expofaja/` |
| Gate de M1 en telefono real sigue pendiente | E1 y E2 tienen su propio gate en telefono real; no cierran el de M1 |
| Token de Cesium restringido por dominio desde 2026-09-29 | Un subdominio de la CCIEB (E3, opcion C) exigiria anadirlo al token |

## 6. Reglas no negociables para esta integracion

1. **Neutralidad (regla 8 de `CLAUDE.md`).** El programa incluye diputados,
   politica petrolera y la agenda Venezuela–EE. UU. Se reproduce **textual y
   atribuido a la CCIEB**, sin comentario, sin destacar a nadie por encima del
   orden del programa. Aviso fijo: "Contenido del evento provisto por la
   CCIEB. Orinoco Digital es un proyecto independiente y no respalda las
   posiciones de los ponentes."
2. **Fuente o nada (regla 3).** Las cifras del brochure (303 mil millones de
   barriles, 5.000 pozos, 1.800 millones de USD...) se muestran como **"Cifras
   del organizador"**, nunca mezcladas con datos de Orinoco. Si una cifra del
   organizador choca con una fuente del repo, se muestran ambas con su fuente.
3. **Marcas y fotos de terceros no son Apache-2.0 ni CC BY.** Logos de la
   CCIEB, ExpoFaja, Alcaldia y aliados, y fotos de ponentes, estan
   **autorizados** (12/10, `AUTORIZACIONES.md`) y entran al repo con su
   `AVISO.md`. Lo que la autorizacion no cubre esta listado en ese archivo.
4. **Sin dependencias nuevas (regla 7).** Nada de GSAP, Swiper, librerias de
   calendario o de QR en runtime. El QR ya esta generado como archivo.
5. **i18n (regla 9).** La interfaz pasa por `t()` en ES/EN. El **contenido**
   del evento (titulos de ponencias, perfiles) es dato en espanol: se muestra
   con `lang="es"` aunque la UI este en ingles. No se traduce automaticamente.
6. **Verificacion en telefono real, DevTools cerrado, datos moviles (regla 6).**
7. **Nada de los negocios propios de Luis entra al repo** (regla personal del
   autor). La vitrina es de la CCIEB y sus aliados.
8. **El evento no se come el proyecto.** El modo Ciudad Bolivar (eje,
   anillos, servicios) es permanente y se apoya en datos con fuente; lo
   especifico de la ExpoFaja vive en `/expofaja` y caduca a "memoria del
   evento" despues del 17/10 (E4). Las iniciativas de la CCIEB se muestran
   como lo que son: anuncios atribuidos a su prensa, con fecha.

## 7. Riesgos

| Riesgo | Prob. | Impacto | Mitigacion |
|---|---|---|---|
| Plazo: 3 dias hasta el evento | Alta | Alto | Permiso ya resuelto. Alcance minimo y STOP gates en cada mandato; nada se mergea despues del jueves 15 a las 12:00 |
| La CCIEB no responde a tiempo | — | — | **Resuelto**: autorizacion recibida el 12/10 |
| La portada en Ciudad Bolivar se lee como "mapa de la Camara" y no como proyecto nacional | Media | Medio | Datos con su fuente y semantica intactas; co-marca solo en la cabecera; "Ver toda la Faja" a un toque; `MODO_INICIAL` reversible en una linea |
| OSM subrepresenta Ciudad Bolivar (hace "parecer vacia" la ciudad) | Alta | Medio | Mostrar conteo OSM **junto** a lo que declara la CCIEB, y proponer un mapaton (E4) en vez de esconder el hueco |
| Co-branding con un evento con figuras politicas | Media | Alto (credibilidad) | Regla 1 de la seccion 6; ADR-020 lo deja por escrito |
| Erratas en materiales del organizador (horas "12:00 AM", afiche con nombre duplicado) | Cierta | Bajo | Se corrigen las evidentes con nota en la semilla; las dudosas se preguntan, no se adivinan |
| Cambios de agenda durante el evento | Media | Medio | Agenda en JSON: editar + PR + merge = 1 minuto de deploy |
| Iframe pesado en el WordPress de la CCIEB | Media | Medio | El embed es la version sin Cesium (`?embed=1`) |

## 8. Preguntas abiertas (Luis / CCIEB)

1. ¿La colaboracion quedo aceptada de palabra el 12/10? ¿Con quien se hablo?
2. ~~¿Quien autoriza el uso de marca y fotos?~~ Autorizado el 12/10: falta
   anotar nombre, cargo y medio en `AUTORIZACIONES.md`.
3. Afiche: la segunda tarjeta "Dr. Alfredo Ordonez Lopez" (perfil de
   legislacion de hidrocarburos), ¿quien es realmente?
4. ¿Alvaro Silva Calderon participa? Esta en el afiche, no en el programa.
5. Comision de Jehyson Guzman: ¿"Ciencia, Tecnologia e Innovacion" o
   "Educacion, Salud, Ciencia, Tecnologia e Innovacion"?
6. ¿Quien administra el WordPress (Elementor) de la CCIEB?
7. ¿La CCIEB puede compartir su directorio de afiliados con direcciones,
   con consentimiento de cada empresa? (E4)

## Fuentes

- Programacion oficial (PDF, 2 p.), brochure (PDF, 10 p.), afiche de
  ponentes y video de la intervencion: recibidos de Luis el 2026-10-12.
- https://camaradecomerciobolivar.org/expofaja/ (consultada 2026-10-12).
- Prensa CCIEB 2026-07-23, 2026-08-10, 2026-10-08 y 2026-10-12 (URLs en
  `semillas/noticias-ccieb.json`).
- OpenStreetMap (ODbL) via Nominatim y Overpass, consultado 2026-10-12.
- Global Energy Monitor, GOGET marzo 2026 (ya en el repo).
