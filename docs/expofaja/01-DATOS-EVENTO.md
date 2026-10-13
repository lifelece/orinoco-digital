# 01 — Datos del evento (resumen humano)

> **La fuente maquina son `semillas/*.json`.** Este archivo existe para que
> Luis lo lea y lo revise. Claude Code no transcribe desde aqui: lee los JSON.
> Si encuentras una diferencia entre este .md y un JSON, manda el JSON y se
> corrige este archivo.

## 1. Ficha

| Campo | Valor | Fuente |
|---|---|---|
| Nombre | Expo Faja Ciudad Bolivar 2026 — "Capital Estrategica" | Brochure, web |
| Eslogan | "Conectando personas, ideas e inversiones para construir el futuro." | Brochure p.1 |
| Fechas | 15, 16 y 17 de octubre de 2026 | Programa, brochure, web |
| Sede | Museo de Arte Moderno Jesus Soto (OSM `relation/7948635`, 8.13218 N, -63.53663 O) | OSM via Nominatim |
| Organiza | CCIEB + Alcaldia de Angostura del Orinoco | Brochure p.10 |
| Apoyo institucional | Gobernacion del Estado Bolivar | Pie del programa, web |
| Proyecto paraguas | "Ciudad Bolivar: Capital Estrategica de la Faja Petrolifera del Orinoco" (2026-07-23) | Prensa CCIEB |
| Pagina oficial | https://camaradecomerciobolivar.org/expofaja/ | — |

## 2. Agenda

`semillas/agenda.json`. Horas en 24 h, America/Caracas.

**Jueves 15** — Acto de inauguracion

| Hora | Actividad |
|---|---|
| 17:00–20:00 | Corte de cinta, recorrido institucional por el area expositiva, acto cultural y brindis. Lobby del Museo |

**Viernes 16** — 1er ciclo de conferencias: Mercados internacionales.
Exposiciones 08:00–20:00.

| Hora | Sala | Tema | Ponente |
|---|---|---|---|
| 09:00–10:00 | 5 | Geoestructura petrolera internacional y el desarrollo industrial venezolano | Dr. Alfredo Ordonez Lopez |
| 10:00–11:00 | 5 | Atraccion de la inversion privada y las politicas publicas | Abg. Julio Perez Graterol |
| 11:00–12:00 | 5* | El futuro de la Faja Petrolifera del Orinoco frente a los desafios de la economia venezolana en la actualidad | Eco. Jesus Farias |
| 12:00–14:00 | — | Pausa / coffee break | — |
| 14:00–15:00 | 5* | La inteligencia artificial y la ciberseguridad en el campo comercial | Dip. Jehyson Guzman |
| 15:00–16:00 | 5* | El desafio energetico: generar valor en la industria petrolera, gerenciando los riesgos de manera inteligente | Ing. Jose Manuel Linares Gabaldon |
| 16:00–17:00 | 5* | Mesa de trabajo: la academia y las empresas petroleras | Exponentes invitados |
| 17:00–17:30 | 6 | Ponencia libre: Toxicologia del crudo extrapesado, impacto en la salud y el ambiente | Dra. Yolangel Hernandez |
| 17:30–18:00 | 6 | Ponencia libre: Estado Bolivar, epicentro de transformacion y oportunidades asociadas a la mineria no metalica | Ing. Armando Jhon Madero |
| 19:00–20:00 | — | Cierre de la jornada | — |

**Sabado 17** — 2do ciclo: Marco legal, analisis geopolitico, energetico y
mercados internacionales. Exposiciones 08:00–20:00.

| Hora | Sala | Tema | Ponente |
|---|---|---|---|
| 09:00–10:00 | 5 | Venezuela en el marco del petroleo internacional | Dr. German Jose Marquez Gil |
| 10:00–11:00 | 5 | Golpe y contragolpe de la Ley Organica de Hidrocarburos en Venezuela | Dr. Rolin Iguaran Valdeblanquez |
| 11:00–12:00 | 5 | Ciudad Bolivar petrolera: un hub estrategico desde el punto de vista logistico, operacional y economico para la Faja | Dr. Ramiro Royero |
| 12:00–14:00 | — | Pausa / coffee break | — |
| 14:00–15:00 | 5* | Sembrando el petroleo o efectos colaterales del desarrollo socioeconomico | Abg. Alejandro Teran Martinez |
| 15:00–16:00 | 5* | Agenda energetica bilateral Venezuela–EE. UU. | Econ. Carlos E. Sanchez P. |
| 16:00–17:00 | 5* | Mesa tecnica de dialogo intersectorial (ponentes, afiliados, expositores) | — |
| 17:00–17:30 | 6 | Ponencia libre: El potencial de la Faja Petrolifera del Orinoco en el estado Anzoategui | William Hernandez |
| sin hora | — | Ceremonia de clausura, acto cultural y cierre oficial | — |

\* Sala inferida por la maquetacion del PDF (la columna derecha continua la
Sala 5 hasta el encabezado "Sala 6"). Confirmar con la CCIEB.

Erratas del PDF corregidas en la semilla: "11:00 AM – 12:00 AM" y "12:00 AM
– 2:00 PM" (deberia ser PM). Quedan anotadas en el campo `nota`.

## 3. Ponentes

`semillas/ponentes.json`: 14 personas (13 del programa + 1 solo del afiche).

| Ponente | En programa | En afiche | Perfil |
|---|---|---|---|
| Dr. Alfredo Ordonez Lopez | Si | Si | Internacionalista, Dr. en Estudios del Desarrollo, coordinador de la Especializacion en Politica y Comercio Petrolero Internacional (UCV) |
| Abg. Julio Perez Graterol | Si | Si | CEO de Universitas Legal; Derecho Administrativo y Gestion Publica |
| Eco. Jesus Farias | Si | Si | Presidente de la Comision de Economia, Finanzas y Desarrollo Nacional (AN) |
| Dip. Jehyson Guzman | Si | Si | Presidente de comision de la AN (nombre de la comision a confirmar) |
| Ing. Jose Manuel Linares Gabaldon | Si | No | `[perfil_pendiente]` |
| Dra. Yolangel Hernandez | Si | No | `[perfil_pendiente]` |
| Ing. Armando Jhon Madero | Si | No | `[perfil_pendiente]` |
| Dr. German Jose Marquez Gil | Si | Si | Ing. de petroleo, MSc. geologia petrolera, Dr. en ciencias gerenciales; docente UCV y LUZ |
| Dr. Rolin Iguaran Valdeblanquez | Si | ¿? | Director de la Catedra Libre Petrolera "Dr. Gumersindo Torres" (LUZ) |
| Dr. Ramiro Royero | Si | Si | Analisis logistico, operacional y economico; docente de la Universidad Venezolana de los Hidrocarburos |
| Abg. Alejandro Teran Martinez | Si | Si | Director ejecutivo de Alepe (Texas) |
| Econ. Carlos E. Sanchez P. | Si | No | `[perfil_pendiente]` |
| William Hernandez | Si | No | `[perfil_pendiente]` |
| Dr. Alvaro Silva Calderon | **No** | Si | Dr. en Derecho (UCV), referente historico de la politica energetica |

**Discrepancias que no se resuelven adivinando:**

1. El afiche repite "Dr. Alfredo Ordonez Lopez" en dos tarjetas con fotos y
   perfiles distintos. El perfil de la segunda (legislacion de hidrocarburos)
   encaja con el tema de Iguaran Valdeblanquez, **pero no se asume**.
2. Silva Calderon esta en el afiche y no en el programa.
3. Seis ponentes del programa no tienen foto ni perfil.

## 4. Aliados

`semillas/aliados.json`: 4 institucionales + 53 comerciales (4
por confirmar) + 9 logos de la web sin identificar. Autorizados el 12/10:
46 logos comerciales + 4 institucionales ya descargados de su WordPress y
optimizados a WebP en `public/expofaja/marcas/` (procedencia de cada uno en
`semillas/marcas-manifiesto.json`). Los 9 sin identificar quedan solo como
referencia en `data/raw/` hasta saber de quien son.

## 5. Espacios y patrocinio (para la seccion "Participa")

| Espacio | Puestos | USD |
|---|---|---|
| Gold y Fundadores | 10 (3 Fundadores / 7 Gold) | 1.800 |
| Vehiculos y Concesionarios | Exterior priorizado | 1.700 |
| Stand comercial estandar | 24 | 900 |
| Emprendedores | 10 seleccionados | 300 |

| Plan de patrocinio (+ IVA) | USD | Pases VIP |
|---|---|---|
| Impulso (Impulso Logistico) | 400 | 2 |
| Estrategico (Socio operativo) | 800 | 4 |
| Faja Capital (Aliado Energetico) | 1.600 | 8 |

Orinoco Digital **no vende** espacios: enlaza a la pagina y al formulario de
la CCIEB (`https://camaradecomerciobolivar.org/expofaja/#formregexpofaja2026`).

## 6. Contactos

| Para | Contacto |
|---|---|
| Registro de asistentes | registroexpofajacbo@gmail.com |
| Propuestas de ponencia | comite.tecnicoexpofajacbo@gmail.com |
| Patrocinio | comercial@expofajacbo.com |
| Camara (general) | camaradecomerciobolivar@gmail.com · +58 424-9221126 |
| Redes | IG @camaradecomerciobolivar · X @camcomerciobol |

## 7. Cifras del organizador (siempre atribuidas)

| Cifra | Valor | Contraste |
|---|---|---|
| Reservas probadas (pais) | 303 mil millones de barriles | Coherente con el orden de magnitud de OPEP (ASB). Sin fuente en el repo todavia |
| Petroleo estimado en la Faja | > 1 billon de barriles | El repo usa USGS FS 2009-3028 (recursos **recuperables**, concepto distinto). No comparar sin explicar la diferencia |
| Produccion (pais) | 1,1 millones b/d | OPEP fuentes secundarias: ~903 mil b/d en feb. 2026. Si se muestra, ambas con fuente |
| Produccion Faja | > 500.000 b/d | Sin fuente en el repo |
| Area de la Faja | ~55.000 km² | El repo mide la caja USGS con +-5 km de precision; no es area oficial |
| Plan del proyecto paraguas | 26 MM bbl/ano, 5.000 pozos, > 1.800 MM USD/ano | Proyeccion del organizador |
| Ciudad Bolivar (presidente CCIEB) | +21 hoteles, 12 clinicas privadas, 9 instituciones financieras, +7 IES, +200 empresas de servicios industriales, 224 supermercados y tiendas | E1 muestra al lado lo que ve OSM |

## 8. Lo que OSM ve hoy en Ciudad Bolivar

Consulta Overpass del 2026-10-12, caja de trabajo `8.03,-63.72,8.20,-63.42`
(no es limite oficial):

| Clase OSM | Elementos | Declarado por la CCIEB |
|---|---|---|
| `tourism=hotel\|motel\|guest_house` | 31 | +21 hoteles |
| `amenity=hospital\|clinic` | 33 | 12 clinicas privadas |
| `amenity=university\|college` | 14 (incluye institutos que no son IES) | +7 IES |
| `amenity=bank` | 10 | 9 instituciones financieras |
| `shop=supermarket` | 16 | 224 supermercados y tiendas |

Lectura: OSM cubre razonablemente hoteles, salud y banca, y **subrepresenta
fuertemente el comercio**. Es el argumento del mapaton de E4.

## 9. Ciudad Bolivar como eje: anillos de distancia (dato propio, reproducible)

Desde el punto de referencia de Ciudad Bolivar en OSM (relacion `14534562`,
8.10285 N, -63.54696 O), linea recta al vertice mas cercano de cada campo GEM:

| Anillo | Campos GEM dentro (de 105) |
|---|---|
| 50 km | 0 |
| 100 km | 10 |
| 150 km | 45 |
| 200 km | 63 |

Frase publicable: "63 de los 105 campos petroleros del mapa estan a menos de
200 km en linea recta de Ciudad Bolivar".

## 9-bis. Distancia de la sede a los campos petroleros mas cercanos (dato propio, reproducible)

Linea recta (haversine) desde el Museo Soto al punto mas cercano de cada
campo GEM GOGET marzo 2026. **No es distancia por carretera.** El dato GEM
del repo no dice que campo pertenece a la Faja (`bloque` vacio): no afirmarlo
en la interfaz salvo que la ficha GEM lo diga.

| Campo (GEM) | Km | Operadora (GEM) | Confianza del registro |
|---|---|---|---|
| Dobokubi | 57,2 | Petroleos de Venezuela | baja |
| Melones | 73,8 | Petroleos de Venezuela | media |
| Cerro Negro (Anzoategui) | 74,4 | Petroleos de Venezuela | baja |
| Cerro Negro (Monagas) | 74,4 | Petroleos de Venezuela | baja |
| Hamaca | 76,8 | Petropiar | baja |

Los dos Cerro Negro son registros GEM distintos con la misma distancia (misma
coordenada aproximada): **no deduplicar** sin fuente. Siguiente en la lista:
Adas, 81,7 km.

E1 debe recalcularlo en `data.js` y usar estos valores como fixture de test
(tolerancia +-1 km).

## 10. Hallazgos en materiales de la CCIEB

Hay una lista de erratas y mejoras para la web y los PDF de la CCIEB. **No
vive en este repo publico** (es material de la conversacion con un aliado):
esta en `data/raw/expofaja/privado/PROPUESTA-CCIEB.md`, que no se versiona.
