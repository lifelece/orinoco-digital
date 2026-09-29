# Investigacion

Linea de trabajo OSINT del proyecto: la que da contexto a lo que el mapa dibuja.
El mapa dice **donde** esta cada activo; esto dice **como llego a estar ahi** y
**cuanto vale**.

| Documento | Que responde |
|---|---|
| [MERCADO.md](MERCADO.md) | Quien opera hoy, cuanto se produce, que abrio y que sigue cerrado |
| [HISTORIA.md](HISTORIA.md) | Como cambio de manos el sector, de 1914 a hoy, upstream a downstream |
| [FINANZAS.md](FINANZAS.md) | Cuanto se invirtio, cuanto se debe, que se perdio en tribunales |

## Metodo

Las mismas reglas que rigen el mapa rigen aqui, porque el riesgo es el mismo:

1. **Toda cifra lleva fuente y fecha.** Sin las dos, no entra.
2. **Se distingue el dato del analisis.** Los parrafos de interpretacion van
   marcados como tales.
3. **Neutralidad.** Se describe la industria con datos. Los hechos contenciosos
   —expropiaciones, arbitrajes, sanciones— se documentan con su fuente y sin
   adjetivos.
4. **Lo que no se sabe se dice.** Un hueco declarado vale mas que un relleno
   plausible.

## Dos anclas distintas, y no hay que confundirlas

Este cuerpo de investigacion se apoya en dos clases de material:

**Lo que sale de los datos del propio proyecto.** Reproducible: ejecutas
`node scripts/analisis/historia-campos.mjs` y sale lo mismo. Es la parte mas
solida y esta marcada en cada documento.

**Lo que sale de fuentes externas.** Publicaciones, resoluciones, notas de
prensa especializada. Cada afirmacion lleva su enlace. Es solida pero
**envejece**, y el sector venezolano cambia de mes en mes.

## Limite grande y declarado: la historia por pozo no existe en publico

El encargo original pedia documentar los cambios que sufrio **cada pozo**.
**Eso no se puede hacer con fuentes publicas, y conviene decirlo antes de que
alguien lo busque.**

El historial por pozo —fecha de perforacion, intervenciones, cambios de
completacion, produccion mensual, abandono— vive en los archivos de PDVSA y de
las empresas mixtas. No es que sea dificil de encontrar: **no es publico**. Es
exactamente la misma razon por la que el modulo predictivo del proyecto es una
demo y no un sistema real (ver `MODEL_CARD.md`).

Lo que **si** se puede documentar, y es lo que hay aqui:

| Nivel | Disponibilidad |
|---|---|
| Pozo individual | **No publico** |
| Campo | Si — 96 de 105 con ano de descubrimiento |
| Empresa mixta / operadora | Si — decretos, laudos, licencias |
| Sector | Si — produccion, exportacion, inversion |

La granularidad baja de pozo a campo. Es un escalon, no un fracaso: con 105
campos fechados se reconstruye la curva de descubrimientos de un siglo, que
cuenta una historia que ningun pozo suelto contaria.

## Advertencia de vigencia

El sector venezolano se mueve rapido: en 2026 cambiaron el marco de sanciones,
el regimen de inversion y la propiedad de CITGO. **Reverificar antes de
publicar o citar.** Cada afirmacion lleva la fecha en que se comprobo.
