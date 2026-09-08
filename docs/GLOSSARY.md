# Glosario

Terminos de dominio que aparecen en el codigo, los datos y la interfaz.
Existe para que nadie — humano o asistente — tenga que adivinar que significa
un campo.

## Cadena de valor

| Termino | Definicion |
|---|---|
| **Upstream** | Exploracion y produccion. Pozos, yacimientos, perforacion. |
| **Midstream** | Transporte y almacenamiento. Oleoductos, gasoductos, mejoradores, terminales. |
| **Downstream** | Refinacion y distribucion. Refinerias, puertos de exportacion, productos. |
| **Mejorador** | Planta que convierte crudo extrapesado de la Faja en crudo sintetico mas ligero, apto para refinar o exportar. Eslabon caracteristico de Venezuela. |

## Geografia y geologia

| Termino | Definicion |
|---|---|
| **FPO / Faja** | Faja Petrolifera del Orinoco. La mayor acumulacion conocida de crudo extrapesado del planeta. |
| **Bloques de la Faja** | Las cuatro divisiones: **Boyaca**, **Junin**, **Ayacucho** y **Carabobo** (oeste a este). |
| **Cuenca Oriental de Venezuela** | Cuenca sedimentaria que contiene la Faja. |
| **Formacion Oficina** | Unidad estratigrafica del Mioceno; principal reservorio de la Faja. |
| **La Luna / Querecual** | Rocas madre del sistema petrolifero de la region. |
| **Crudo extrapesado** | Crudo de muy baja gravedad API y alta viscosidad. Requiere dilucion o mejoramiento para transportarse. |

## Petrofisica

| Termino | Definicion |
|---|---|
| **Porosidad** | Fraccion del volumen de roca que son poros. Cuanto fluido cabe. |
| **Permeabilidad** | Facilidad con que el fluido se mueve por la roca. Si sale o no. |
| **Saturacion de agua (Sw)** | Fraccion del espacio poroso ocupada por agua. Lo que no es hidrocarburo. |
| **Espesor de arena neta** | Grosor de roca que de verdad puede producir. |
| **Registro de pozo (well log)** | Medicion continua de propiedades a lo largo del pozo (gamma, resistividad, porosidad). |
| **LAS** | Log ASCII Standard. Formato estandar de registros de pozo. |

## Negocio y contratos

| Termino | Definicion |
|---|---|
| **PDVSA** | Petroleos de Venezuela S.A. Empresa estatal. |
| **Empresa mixta / JV** | Joint venture entre PDVSA (mayoritaria desde 2007) y socios privados. |
| **Apertura Petrolera** | Politica de los anos 90 que abrio la Faja a companias internacionales. |
| **Nacionalizacion de 2007** | Conversion forzosa a empresas mixtas con PDVSA mayoritaria. Origino los arbitrajes de ConocoPhillips y ExxonMobil. |
| **ICSID** | Centro internacional del Banco Mundial para arbitraje de disputas de inversion. |
| **OFAC** | Oficina de Control de Activos Extranjeros del Tesoro de EE.UU. Emite las licencias que autorizan operar. |
| **Licencia General (GL)** | Autorizacion de OFAC que permite ciertas operaciones sin permiso individual. |
| **CITGO** | Filial refinadora de PDVSA en EE.UU. Objeto de un proceso de acreedores en Delaware. |
| **bpd** | Barriles por dia. |
| **tcf** | Trillion cubic feet. Medida de reservas de gas en la escala anglosajona. |
| **EITI** | Extractive Industries Transparency Initiative. Estandar global de transparencia extractiva. |

## Tecnico y geoespacial

| Termino | Definicion |
|---|---|
| **CRS** | Coordinate Reference System. Sistema de referencia de coordenadas. |
| **WGS84 / EPSG:4326** | El CRS del proyecto. El que usan Cesium y el GPS. |
| **La Canoa / PSAD56** | Datum historico de Venezuela. Sin transformar, desvia las coordenadas cientos de metros. |
| **SIRGAS-REGVEN** | Datum moderno de Venezuela, practicamente equivalente a WGS84. |
| **GeoJSON** | Formato estandar de datos geoespaciales en JSON. Formato canonico del proyecto. |
| **Feature / FeatureCollection** | Un elemento geografico con propiedades / un conjunto de ellos. |
| **PostGIS** | Extension geoespacial de PostgreSQL. |
| **ODbL** | Open Database License. La de OpenStreetMap. Share-alike sobre bases de datos. |
| **LOD** | Level of Detail. Cargar mas o menos detalle segun la distancia de camara. |
| **Terreno (terrain)** | Malla de elevacion que da relieve real al globo. |
| **Billboard** | Imagen 2D que siempre mira a la camara. Mucho mas barata que un modelo 3D. |
| **Clustering** | Agrupar puntos cercanos en un solo simbolo al alejar la camara. |

## Datos y satelite

| Termino | Definicion |
|---|---|
| **VIIRS Nightfire** | Deteccion satelital de quema de gas (flares) por infrarrojo. Permite ver actividad real aunque los datos oficiales sean opacos. |
| **Flaring** | Quema de gas asociado en antorcha. Indicador de actividad y de impacto ambiental. |
| **Sentinel-1 / -2 / -5P** | Satelites de Copernicus: radar, optico y atmosferico (metano, NO2). |
| **GOGET** | Global Oil and Gas Extraction Tracker, de Global Energy Monitor. |
| **OSDU** | Open Subsurface Data Universe. Estandar abierto de datos de subsuelo. |
| **OSINT** | Inteligencia de fuentes abiertas. El metodo de investigacion del proyecto. |
