# Fase 1 — Mapa base 3D (Faja del Orinoco)

> **Gate de entrada:** Fase 0 cerrada.
> **Gate de salida:** viewer centrado en la Faja con terreno y vuelo inicial,
> verificado en movil.

**Tiempo estimado:** 1-2 semanas part-time

## Objetivo

Camara inicial sobre la Faja Petrolifera del Orinoco, terreno mundial activo,
controles limitados y un boton "Volar a la Faja".

## Tarea bloqueante: verificar el centro de la Faja — HECHA

El valor **8.5 N, -64.5 O** estaba marcado SIN VERIFICAR. Ya se sustituyo por
una medicion con fuente.

`FAJA_BBOX` en `config.js`: oeste -67,34 | este -62,08 | sur 7,88 | norte 9,37.
Centro **8,62 N, -64,71**. Extension 579 km E-O x 165 km N-S.

Fuente: USGS Fact Sheet 2009-3028, figura 1. Medido con
`scripts/analisis/medir-faja-usgs.mjs`. Metodo, controles y limites en
[../DATA_SOURCES.md](../DATA_SOURCES.md) seccion 9.

El valor antiguo estaba a 15 km en latitud y 23 km en longitud: era una buena
aproximacion, pero ahora es un dato defendible con fuente.

**Hallazgo:** el poligono oficial de la AU no esta publicado como GIS. El
shapefile del USGS para Suramerica solo trae unidades convencionales, y la Faja
es una unidad continua. Queda documentado para no repetir la busqueda.

**Sigue pendiente:** los cuatro bloques. `BLOQUES` mantiene `centro: null`
porque la figura del USGS no los subdivide y no hay otra fuente publica
localizada. **Null es correcto; un numero inventado es un fallo grave.**

## Implementacion — hecha

- `config.js` — `FAJA_BBOX` medida y con fuente; `VISTA_FAJA` derivada de ella,
  no escrita a mano.
- `map.js` — `volarAFaja()` usa `Rectangle.fromDegrees(...)` en vez de punto mas
  altura. Asi Cesium calcula la distancia y la franja entera entra en cuadro sea
  cual sea la relacion de aspecto: con punto mas altura, un telefono en vertical
  recortaria los extremos este y oeste. Contrapartida asumida: el vuelo a un
  rectangulo es cenital y no admite `pitch`, que por eso se quito de `config.js`.
- `map.js` — `encuadrarFaja()` deja la vista inicial sobre la Faja al arrancar,
  sin animacion. La app ya no abre sobre el globo entero.
- `ui.js` — el boton ya existia y sigue igual.

## Verificacion — pendiente, la haces tu

En movil real, DevTools cerrado:

1. La app abre directamente sobre la Faja, no sobre el globo.
2. El terreno tiene relieve visible.
3. Alejar la camara y pulsar "Volar a la Faja" devuelve el encuadre con fluidez.
4. En vertical, los extremos este y oeste de la franja siguen visibles.

## STOP GATE

> **Gate cerrado el 2026-09-09.** Verificado por Luis Carlos Vasquez en telefono
> real con DevTools cerrado. Es la atestacion del autor, no una prueba
> automatizada: si algo se rompe mas adelante, este gate se reabre.


- [x] Centro de la Faja **verificado contra fuente** y registrado
- [x] Vista inicial sobre la FPO
- [x] Terreno 3D con relieve visible *(requiere el token de Cesium)*
- [x] Boton de vuelo funcional en movil
- [x] Rendimiento aceptable (> 30 FPS al interactuar)

## Queda abierto para mas adelante

- Centros de los 4 bloques: sin fuente publica localizada.
- Poligono real de la AU en vez de la caja envolvente, si aparece el GIS.
