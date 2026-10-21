# E1 — Modo Ciudad Bolivar: la ciudad como eje del mapa

> **Origen:** intervencion de Luis en la CCIEB, 2026-10-12: poner a Ciudad
> Bolivar como eje del mapa, con lo que la Camara y la ExpoFaja quieren
> impulsar encima ("en el mapa Ciudad Bolivar solo tiene la zona del puerto").
> **Decisiones:** ADR-020, piezas 1, 2, 5 y 10.
> **Gate de entrada:** kit instalado; Luis aprobo esas piezas.
> **Autorizacion CCIEB:** recibida el 2026-10-12 (`AUTORIZACIONES.md`): el
> modo puede llevar la co-marca.
> **Gate de salida:** telefono real, datos moviles, DevTools cerrado.
> **Fecha objetivo:** martes 13/10.

## Objetivo

Que al abrir el mapa Ciudad Bolivar sea el **centro de gravedad**: la camara
parte de la ciudad mirando al norte, hacia la Faja; anillos de distancia
salen de la ciudad y dicen cuantos campos petroleros quedan a 50, 100, 150 y
200 km; los servicios de la ciudad estan encendidos; y encima, lo que la
CCIEB y la ExpoFaja anuncian, atribuido. La vista nacional queda a un toque
("Ver toda la Faja").

```
https://orinoco-digital.vercel.app/?modo=ciudadBolivar
https://orinoco-digital.vercel.app/?modo=ciudadBolivar&vuelo=OSM-R7948635   (abre el Museo Soto)
```

## El dato que sostiene el eje (medido el 2026-10-12, reproducible)

Desde el punto de referencia de Ciudad Bolivar en OSM (relacion
`14534562`, 8.10285 N, -63.54696 O, via Nominatim), distancia en linea
recta al vertice mas cercano de cada campo GEM GOGET marzo 2026:

| Anillo | Campos GEM dentro (de 105) |
|---|---|
| 50 km | 0 |
| 100 km | 10 |
| 150 km | 45 |
| 200 km | **63** |

Frase publicable, con fuente y metodo en la ficha: **"63 de los 105 campos
petroleros del mapa estan a menos de 200 km en linea recta de Ciudad
Bolivar"**. Nunca "a 200 km de la Faja" ni "por carretera". Estos conteos
son el fixture del test (tolerancia: +-1 campo por anillo, para absorber
redondeos de geometria).

## Alcance

| Pieza | Archivo | Que hace |
|---|---|---|
| Descarga y conversion | `scripts/ciudad-bolivar-to-geojson.mjs` (nuevo) + `npm run data:ciudad-bolivar` | Overpass -> `data/raw/osm-ciudad-bolivar.json` -> `public/data/ciudad-bolivar-osm.geojson` |
| Iniciativas | mismo script, desde `docs/expofaja/semillas/iniciativas-ccieb.json` | `public/data/iniciativas-ccieb.geojson`: **solo** las que tienen ubicacion con fuente. Las demas no se dibujan |
| Resumen | mismo script -> `public/data/ciudad-bolivar-resumen.json` | Conteos por clase, conteo por anillo y 5 campos mas cercanos (~2 KB). Lo usa el micrositio (E2) para no bajar `campos.geojson` (245 KB). Calculado con `src/data.js`: el script corre con `node --import ./test/entorno.mjs` |
| Configuracion | `src/config.js` | `RUTAS_DATOS.ciudadBolivar`, `RUTAS_DATOS.iniciativasCcieb`, `CIUDAD_BOLIVAR_CAJA`, `CENTRO_CIUDAD_BOLIVAR` (OSM rel 14534562, con comentario de fuente), `ANILLOS_KM = [50, 100, 150, 200]`, `CLASES_CIUDAD`, `COLOR_CIUDAD`, `MODOS`, `MODO_INICIAL` |
| Datos | `src/api.js` | `getCiudadBolivar()`, `getIniciativasCcieb()` -> FeatureCollection |
| Calculo | `src/data.js` | Puras: `distanciaMinimaKm()`, `camposMasCercanos()`, `contarPorAnillo()`, `circuloGeodesico(centro, km, n)` |
| Mapa | `src/map.js` | `vistaCiudadBolivar()` (camara), `dibujarAnillos()`, `dibujarCiudadBolivar()`, `dibujarIniciativas()`, lineas de proximidad bajo demanda |
| Iconos | `src/iconos.js` | museo, avion, puente, birrete, cruz, cama, banco, bus, y un simbolo "iniciativa" (estrella de contorno) |
| Interfaz | `src/ui/modoCiudadBolivar.js` (nuevo, ADR-017) | Cabecera del modo con co-marca, panel "Ciudad Bolivar, eje de la Faja", conmutador "Ver toda la Faja" / "Ver Ciudad Bolivar" |
| Orquestacion | `src/main.js` | Cargar las capas nuevas (patron `centrales`, ADR-013); leer `?modo=`, `?capa=`, `?vuelo=`; aplicar `MODO_INICIAL` |
| Marcas | `public/expofaja/marcas/` (ya en el kit) | Logos WebP autorizados + `AVISO.md` |
| Textos | `src/i18n/es.json`, `en.json` | `modo.ciudadBolivar.*`, `capa.ciudadBolivar`, `capa.iniciativas`, `ciudad.*` |
| Redireccion temporal | `vercel.json` | `/expofaja` -> `/?modo=ciudadBolivar` (`permanent: false`). E2 la retira |
| Fuentes | `docs/DATA_SOURCES.md` | Seccion 16 (contenido del organizador) y 17 (capa Ciudad Bolivar, OSM) |
| Decision | `docs/DECISIONS.md` | ADR-020 copiado desde `docs/expofaja/` |
| Tests | `test/ciudadBolivar.test.mjs` (nuevo), `test/rutas-datos.test.mjs` | Ver "Verificacion" |

## Que hace el modo, paso a paso

1. **Camara:** centro en `CENTRO_CIUDAD_BOLIVAR`, rumbo 0 (norte arriba),
   inclinacion oblicua, a una altura que deje ver el anillo de 150 km en
   escritorio y el de 100 km en telefono vertical (medir con captura, como
   se hizo con `margenVertical`). La ciudad queda abajo y la Faja hacia el
   horizonte: ese es el "eje".
2. **Anillos:** 4 circulos geodesicos discontinuos, color `--color-lo`,
   etiqueta "100 km · 10 campos" en el borde norte de cada uno. Se apagan al
   salir del modo.
3. **Capas encendidas:** `ciudadBolivar` (servicios), `iniciativasCcieb`,
   `campos`. Las demas como el usuario las tenga.
4. **Cabecera del modo** (DOM, no mapa): "Ciudad Bolivar · Capital
   Estrategica de la Faja" + "En alianza con" [sello CCIEB] [logo ExpoFaja]
   (WebP de `public/expofaja/marcas/`), y boton "Ver toda la Faja".
5. **Panel del modo:** conteo por anillo, 5 campos mas cercanos, conteo de
   servicios por clase, y "Lo que impulsa la CCIEB" (iniciativas, con fecha y
   enlace a la nota de prensa). Cifras del organizador: **no** en el mapa;
   viven en el micrositio (E2).
6. **Salir del modo** ("Ver toda la Faja") vuelve a `volarAFaja()` y apaga
   anillos y cabecera. El gesto atras tambien.

**`MODO_INICIAL = "ciudadBolivar"`** desde el merge de E1 (decision de Luis:
la ciudad es el eje). Es una sola constante: si mas adelante quiere que la
portada vuelva a la vista nacional, se cambia ahi (revisar en E4).

## Datos: servicios (OSM)

**Caja de trabajo** (no es limite oficial; anotarlo asi en `config.js`):
`sur 8.03, oeste -63.72, norte 8.20, este -63.42`. **Mirrors:** reutilizar
`OVERPASS_MIRRORS` de `scripts/descargar-fuentes.mjs` (kumi.systems respondio
el 2026-10-12; overpass-api.de corto la conexion).

| Clase (`clase`) | Seleccion OSM | Geometria |
|---|---|---|
| `sede_evento` | **por id**: `relation(7948635)` (Museo Soto) | Punto (centro) |
| `aeropuerto` | `aeroway=aerodrome` en la caja | Punto (centro) |
| `puente` | **por id**: `way(1485676372)` (Puente Angostura) | **LineString** |
| `educacion_superior` | `amenity=university`; `amenity=college` excluyendo nombres que empiezan por `I.E.E.`, `E.T.`, `U.E.`, `Academia` | Punto |
| `salud` | `amenity=hospital\|clinic` y `healthcare=hospital\|clinic` | Punto |
| `hotel` | `tourism=hotel\|motel\|guest_house` | Punto |
| `banca` | `amenity=bank` | Punto |
| `transporte` | `amenity=bus_station` | Punto |

El script imprime **los excluidos** para revision humana (como el filtro de
`DATA_SOURCES.md` §11). Propiedades con la convencion del repo (ID
`OSM-N…`/`OSM-W…`/`OSM-R…`, `fuente`, `confianza: "media"`,
`ultima_verificacion`, `geom_precision: "centro_aproximado"` cuando aplique).
Sin nombre en OSM: `nombre: null`, la ficha dice "Sin nombre en
OpenStreetMap" y enlaza al elemento. **No inventar nombres.**

Control (2026-10-12, no es dato): hoteles 31, salud 33, university+college
14 antes de filtrar, bancos 10.

## Datos: iniciativas de la CCIEB y la ExpoFaja

Fuente: `docs/expofaja/semillas/iniciativas-ccieb.json` (cada una con nota de
prensa y fecha). Regla: **solo se dibuja la que tiene ubicacion con fuente**.

| Iniciativa | Ubicacion | En el mapa |
|---|---|---|
| ExpoFaja Ciudad Bolivar 2026 (15–17/10) | Museo Soto, OSM `relation/7948635` | Si |
| Lanzamiento de la Bolsa de Empleo Energetica | En la ExpoFaja (Museo Soto) | Si, mismo punto, ficha propia |
| Proyecto "Ciudad Bolivar: Capital Estrategica de la FPO" | Sede CCIEB, Av. San Cristobal: **no esta en OSM** `[coord_sede_ccieb]` | No, hasta que la sede exista en OSM (tarea de E4.3: la agrega Luis) |
| Punto de auxilio vial, km 50 autopista Ciudad Bolivar–Puerto Ordaz | Km 50 sin hito en los datos | No; solo en el panel |
| Catering y proveedores para el Bloque Ayacucho (Camara Gastronomica) | Sin punto | No; solo en el panel |

## Proximidad (ficha del Museo Soto)

- 5 campos mas cercanos, fixture +-1 km: Dobokubi 57,2 · Melones 73,8 ·
  Cerro Negro (Anzoategui) 74,4 · Cerro Negro (Monagas) 74,4 · Hamaca 76,8.
  Los dos Cerro Negro son registros GEM distintos: no deduplicar.
- Polilineas discontinuas sede -> vertice mas cercano, **solo con la ficha
  abierta** (hold del `controladorRender`, ADR-019), etiqueta "linea recta".
- Rotular "Faja" solo si la ficha GEM del campo (enlace en `notas`) lo dice.
  **Nunca** "distancia al Bloque X": los bloques no tienen geometria con
  fuente (`BLOQUES[].centro = null`).

## Estilo

- Datos del mapa: `COLOR_CIUDAD = "#e6edf3"` e iconos por clase. **Cian y
  naranja de la marca ExpoFaja prohibidos en marcadores**: chocan con `gas` y
  `crudo` (`02-IDENTIDAD-VISUAL.md` §4).
- La co-marca va en la **cabecera DOM del modo**, no sobre el terreno.
- Puente: linea de 3 px, mismo color. Etiquetas solo bajo `ZOOM_ETIQUETA`.

## Prompt de arranque (Claude Code)

```
Lee CLAUDE.md, docs/PLAN.md, docs/expofaja/README.md, 00-CONTEXTO.md,
02-IDENTIDAD-VISUAL.md, 03-ADR-020-PROPUESTA.md, AUTORIZACIONES.md y este
archivo (E1-MODO-CIUDAD-BOLIVAR.md). Rama: expofaja/e1-modo-ciudad-bolivar.

1. Copia el ADR-020 a docs/DECISIONS.md (estado: aceptado piezas 1, 2, 5,
   7 y 10; resto en propuesta).
2. Escribe scripts/ciudad-bolivar-to-geojson.mjs (servicios OSM +
   iniciativas con ubicacion + resumen), sin dependencias, reutilizando los
   mirrors de descargar-fuentes.mjs. Ejecutalo y muestrame conteos por
   clase, excluidos y conteo por anillo. PARA.
3. Despues: config, api, data (tests con los fixtures de anillos y de los 5
   campos), map (vistaCiudadBolivar, anillos, capas), iconos,
   src/ui/modoCiudadBolivar.js, i18n ES/EN, ?modo= ?capa= ?vuelo= y
   MODO_INICIAL en main.js, redireccion temporal en vercel.json, secciones
   16 y 17 de DATA_SOURCES.md.
4. npm test y npm run build. Reporta peso de los GeoJSON nuevos y del JS
   propio, y captura escritorio 1440x900 y movil 390x844 del modo.

Reglas: ninguna dependencia nueva; contrato de api.js intacto; cesium solo
en map.js; ningun nombre ni coordenada fuera del script, de GEM o de la
semilla con fuente; colores de marca solo en la cabecera DOM, nunca en
marcadores.
```

## Verificacion

Automatica:

- [ ] `npm test` verde, con tests de: `distanciaMinimaKm` (Point, Polygon,
      MultiPolygon), `contarPorAnillo` (0 / 10 / 45 / 63, +-1),
      `camposMasCercanos` (fixture +-1 km), `circuloGeodesico` (radio medido
      +-0,5 %), presencia de `OSM-R7948635` a menos de 300 m de
      `semillas/ciudad-bolivar-verificacion.geojson`, y procedencia
      (`fuente`, `confianza`, `ultima_verificacion`) en toda feature nueva.
- [ ] `npm run data:validate`, validador de CI y `verificar:modulos`
      (`src/ui/modoCiudadBolivar.js` sin `cesium` ni `fetch`).
- [ ] GeoJSON nuevos <= 200 KB y <= 300 features cada uno.
- [ ] JS propio por debajo de 150 KB gzip.

Manual (Luis):

- [ ] Vista previa: la portada abre en el modo; la ciudad abajo, la Faja al
      fondo, anillos legibles en el telefono.
- [ ] "Ver toda la Faja" y gesto atras funcionan; volver al modo tambien.
- [ ] `<url-preview>/expofaja` lleva al modo. Tras el merge, el QR de
      `docs/expofaja/qr/` hace lo mismo en dos telefonos.
- [ ] Sede, aeropuerto y puente donde deben (comparar con OSM o Google Maps).
- [ ] Logos de la cabecera nitidos sobre el tema oscuro.
- [ ] Ingles: interfaz traducida, nombres propios y titulos de iniciativas
      intactos.

## STOP GATE

- [x] Capturas antes/despues en `docs/capturas/e1-*` (escritorio y movil)
- [x] Telefono real, datos moviles, DevTools cerrado: carga, modo, anillos,
      ficha, lineas, salir del modo, gesto atras (Luis, 13/10; repetido en
      produccion con Edge + CDP a 390x844 y 1440x900)
- [x] Revisado el diff: sin dependencias nuevas, sin datos inventados,
      contrato de `api.js` intacto, sin colores de marca en marcadores
- [x] PR abierto contra `main`; **no** se mergea sin el OK de Luis (#6, mergeado por Luis el 13/10)
