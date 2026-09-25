# Historia del sector, upstream a downstream

**Verificado:** 2026-09-10

> **Antes de leer:** el historial **por pozo** no existe en fuentes publicas.
> Perforaciones, intervenciones y produccion mensual viven en archivos de PDVSA
> y las empresas mixtas. Lo que sigue es historia **por campo, por empresa y por
> sector**, que si es documentable. Ver [README.md](README.md).

---

## 1. La curva que lo explica casi todo

Esto no viene de ningun libro: sale de los datos del propio proyecto. De los
105 campos venezolanos del tracker de Global Energy Monitor, **96 traen ano de
descubrimiento**. Agrupados por decada:

| Decada | Campos | En la Faja |
|---|---|---|
| 1910s | 2 | 0 |
| 1920s | 6 | 0 |
| 1930s | 15 | 10 |
| 1940s | 16 | 7 |
| **1950s** | **35** | **20** |
| 1960s | 2 | 2 |
| 1970s | 4 | 4 |
| 1980s | 13 | 3 |
| 1990s | 1 | 0 |
| 2000s | 1 | 0 |
| 2020s | 1 | 0 |

El mas antiguo es **Mene Grande, 1914**. El mas reciente, 2023. La **mediana de
descubrimiento es 1953**.

> **Analisis.** La lectura es dura y esta en los numeros: **desde 1990 solo
> aparecen tres campos nuevos en el tracker**. La industria venezolana de hoy
> vive de yacimientos hallados hace setenta anos o mas. El pico exploratorio
> fueron los cincuenta, y la Faja se cartografio sobre todo entonces.
>
> Con una salvedad honesta: GOGET solo incluye unidades por encima de cierto
> umbral de produccion o reservas, asi que la caida posterior a 1990 mide
> **descubrimientos grandes**, no toda la actividad exploratoria. Aun con esa
> reserva, la forma de la curva es inequivoca.

Reproducible con `node scripts/analisis/historia-campos.mjs`.

## 2. Los campos que siguen produciendo despues de un siglo

Los diez mas antiguos del tracker, **todos marcados como activos**:

| Ano | Campo |
|---|---|
| 1914 | Mene Grande |
| 1917 | Cabimas |
| 1925 | La Concepcion · Lagunillas · La Paz · Tia Juana |
| 1928 | Mara · Quiriquire |
| 1930 | Bachaquero |
| 1931 | Cumarebo |

Casi todos en la cuenca de Maracaibo. **Mene Grande** es donde se perforo el
pozo Zumaque I, el que inaugura la explotacion comercial venezolana.

> **Analisis.** Que campos de 1914 sigan clasificados como activos dice dos
> cosas a la vez: la calidad del recurso original, y que la produccion actual
> se sostiene sobre infraestructura con un siglo encima. El coste de mantener
> eso en pie es parte de los 53.000 millones que Rystad calcula solo para no
> caer.

## 3. Las tres rupturas de propiedad

### 1975-1976 — Nacionalizacion

El Estado asume la industria y crea PDVSA como casa matriz de las
concesionarias extranjeras que operaban hasta entonces.

### Anos noventa — Apertura Petrolera

Venezuela no tenia capital ni tecnologia para el crudo extrapesado de la Faja e
invito de vuelta a las companias internacionales mediante convenios y
asociaciones estrategicas. Es cuando ConocoPhillips y ExxonMobil entran a la
Faja.

### 2007 — Conversion forzosa a empresas mixtas

Las asociaciones se convierten por decreto en **empresas mixtas con PDVSA
mayoritaria**. ConocoPhillips y ExxonMobil rechazan las condiciones, salen del
pais y acuden al arbitraje internacional. Chevron, Repsol, Eni y otras aceptan
y se quedan.

> **El rastro esta en los datos del mapa.** La columna de operadora de
> `campos.geojson` no dice "Chevron" ni "Repsol": dice **Petropiar**,
> **Petroboscan**, **Petroquiriquire**, **Petrodelta**, **Petrozamora**,
> **Petrocabimas**, **Petrokarina**, **Petrolera Sino-Venezolana**.
>
> Esos nombres son el fosil de 2007. Cada uno es una empresa mixta creada en
> aquella conversion, y sobreviven como el identificador operativo de campos
> que en la practica maneja un socio extranjero. Quien lea el mapa sin conocer
> la historia vera solo nombres raros; quien la conozca esta leyendo el decreto.

De las 105 operadoras declaradas: **23 campos figuran directamente a nombre de
PDVSA, 39 no publican operadora**, y el resto se reparte entre esas empresas
mixtas.

## 4. Midstream y downstream: lo que el mapa ya muestra

El proyecto tiene cartografiados **346 ductos**, **5 refinerias**, **2
complejos petroquimicos**, **1 planta de gas**, **4 puertos** y **25 parques de
tanques** agrupados a partir de 704 tanques individuales.

Las cinco refinerias identificadas por nombre:

**Amuay** y el **Centro de Refinacion Paraguana** (Punta Cardon), en Falcon, que
juntos forman uno de los mayores complejos refinadores del mundo. **El Palito**,
en Carabobo. **Puerto La Cruz**, en Anzoategui. Y la **antigua refineria de San
Lorenzo**, en Zulia, la mas vieja del pais.

> **Nota de metodo, y de humildad.** Las tres mayores —Amuay, El Palito y Punta
> Cardon— **no aparecieron en la primera consulta a OpenStreetMap**. Estaban
> etiquetadas de otra forma y hubo que hacer una segunda busqueda. Punta Cardon
> ademas se colaba como instalacion generica porque el clasificador buscaba el
> termino ingles "refiner" y su nombre real es "Centro de Refinacion".
>
> La leccion quedo escrita en `DATA_SOURCES.md`: en OSM, que un activo no
> aparezca casi nunca significa que no exista. Significa que esta etiquetado de
> otra manera.

## 5. Lo que se perdio por el camino

**CITGO**, el brazo refinador de PDVSA en Estados Unidos, dejo de ser
venezolano de hecho en 2025-2026: un tribunal de Delaware aprobo la venta de su
matriz PDV Holding tras ocho anos de litigio de acreedores. Detalle en
[FINANZAS.md](FINANZAS.md).

**Rosneft** transfirio sus activos venezolanos a una entidad estatal rusa hacia
2020, en respuesta a las sanciones.

## 6. La linea de tiempo, de un vistazo

| Ano | Hecho |
|---|---|
| 1914 | Zumaque I en Mene Grande: arranca la explotacion comercial |
| 1950s | Pico exploratorio: 35 campos del tracker actual, 20 en la Faja |
| 1960 | Venezuela cofunda la OPEP |
| 1975-76 | Nacionalizacion; nace PDVSA |
| 1990s | Apertura Petrolera: vuelven las internacionales a la Faja |
| 2007 | Conversion forzosa a empresas mixtas; salen Conoco y Exxon |
| ~2020 | Rosneft transfiere sus activos a una entidad estatal rusa |
| 2025-26 | Delaware aprueba la venta de la matriz de CITGO |
| feb 2026 | OFAC emite GL 49, GL 50 y GL 50A |
| jul 2026 | 1.117.000 bpd, de los cuales 595.000 en la Faja |

---

## Fuentes

- Anos de descubrimiento, operadoras y estado — dato propio, reproducible con
  `scripts/analisis/historia-campos.mjs` sobre `public/data/campos.geojson`
  (Global Energy Monitor, GOGET marzo 2026, CC BY 4.0)
- Refinerias, ductos y terminales — OpenStreetMap (ODbL), ver
  `DATA_SOURCES.md` seccion 11
- Produccion y licencias 2026 — ver [MERCADO.md](MERCADO.md)
- CITGO — ver [FINANZAS.md](FINANZAS.md)
