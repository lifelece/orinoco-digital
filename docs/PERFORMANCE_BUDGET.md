# Presupuesto de rendimiento

> Estos numeros son **limites duros**, no sugerencias. Se revisan en cada STOP
> gate de fase.

## El objetivo real

No es una workstation con fibra. Es:

- **Desarrollo:** laptop de 8 GB de RAM.
- **Usuario final:** telefono de gama media en **red movil venezolana**, que es
  lenta e inestable, y en un pais con cortes electricos frecuentes.

CesiumJS es pesado por naturaleza. Todo lo demas tiene que compensarlo.

## Limites

| Metrica | Limite | Por que |
|---|---|---|
| Entidades por capa | 2.000 | Mas que eso exige clustering o teselado |
| Peso de un GeoJSON servido | 2 MB | Por encima, partir por sector o simplificar geometrias |
| Peso de nuestro JS (sin Cesium) | 150 KB comprimido | Si crece, sobra codigo |
| Tiempo hasta el globo visible (4G) | 5 s | Umbral de abandono |
| Capas cargadas al inicio | 1 | Las demas, bajo demanda |
| FPS en interaccion (movil) | > 30 | Por debajo se siente roto |

## Tecnicas ya aplicadas

- **`requestRenderMode: true`** — Cesium solo redibuja cuando algo cambia. Es la
  optimizacion de mayor impacto: sin ella, el globo consume GPU y bateria
  continuamente aunque nadie lo toque. Ya activo en `map.js`.
- **Widgets innecesarios desactivados** — sin animation, timeline, geocoder ni
  baseLayerPicker. Menos DOM, menos peso, menos ruido visual.
- **Limites de camara** — `maximumZoomDistance` y `minimumZoomDistance` evitan
  que el usuario se pierda en el espacio o atraviese el terreno.

## Tecnicas pendientes, por fase

| Fase | Tecnica | Cuando aplicarla |
|---|---|---|
| 2 | **Billboards, no modelos 3D** para los pozos | Desde el primer pozo. Un glTF por pozo mata el rendimiento |
| 2 | **Clustering de entidades** (`EntityCluster`) | Al pasar de ~300 puntos visibles |
| 3 | **Carga perezosa por capa** | Al anadir la segunda capa |
| 3 | **Simplificar geometrias de ductos** | Si un LineString pasa de 1.000 vertices |
| 6 | **Code-splitting de Cesium** | Antes del deploy |
| 6 | **PWA / offline-first** | Si la telemetria muestra abandono por carga |

## Como medir

1. `npm run build && npm run preview`
2. Abrir desde el **telefono**, en la misma red o via la URL de Vercel.
3. Chrome DevTools remoto -> pestana Network con throttling **Slow 4G**.
4. Lighthouse en modo movil.

Y despues, la prueba que de verdad manda: **usarlo un minuto en el telefono, en
datos moviles, con DevTools cerrado**. Si se siente lento, esta lento — aunque
las metricas digan otra cosa.

## Que hacer al superar un limite

No se sube el limite. Se arregla el codigo o se recorta el dato. El limite
existe justamente para forzar esa conversacion.

Si un limite resulta genuinamente mal calibrado, se cambia **con un ADR** en
`DECISIONS.md` que explique por que — no en silencio.

## Medicion de referencia (Fase 0)

Primer build real, para tener una linea base:

| Recurso | Tamano | Gzip |
|---|---|---|
| JS (incluye Cesium completo) | 4,19 MB | **1,13 MB** |
| CSS | 37 kB | 8,5 kB |
| Assets estaticos de Cesium | 7,7 MB | (se sirven bajo demanda) |

**1,13 MB comprimidos solo de JavaScript es demasiado** para el objetivo de
5 segundos en 4G. El build ya avisa al superar el limite de 1.500 kB
configurado en `vite.config.js`.

Es esperable en la Fase 0 y es exactamente la razon por la que el
code-splitting de Cesium esta en la lista de la Fase 6. La linea base queda
anotada aqui para poder medir la mejora cuando se haga.
