# M1 — Shell de UI

> **Origen:** Notion, *Mejora v2 — Experiencia de usuario, navegacion,
> animacion y render*, seccion 5 (roadmap) y 1 (interfaz).
> **Gate de entrada:** v1.0 desplegada (hecho, falta cerrar la Fase 6-7).
> **Gate de salida:** captura comparativa + prueba en telefono real con
> DevTools cerrado.

## Objetivo

Que Cesium sea el lienzo y no la aplicacion. La interfaz anterior funcionaba,
pero en movil el pie de atribuciones se montaba encima del panel de capas, el
titulo salia truncado y el panel tapaba un tercio del mapa.

## Lo que se hizo

| Componente (Notion §1.3) | Implementacion |
|---|---|
| Tokens de diseno | `@theme` en `style.css`: superficies, texto, acentos por sector, estados. Sin fuentes web. ADR-014 |
| Viewer sin chrome | Widgets ya estaban fuera. El indicador de seleccion se re-estiliza con los tokens; los creditos de Cesium se armonizan, **no se ocultan** |
| Drawer de activo | Panel lateral en escritorio, hoja inferior en movil. `Esc` cierra. Fuente, confianza y fecha siempre visibles, con antiguedad |
| Control de capas | Contador por capa, muestras de color en cada fila, estado de carga y de error por capa |
| Leyenda persistente | Las muestras de cada fila son la leyenda minima; la completa sigue desplegable |
| Buscador | Campos, instalaciones, centrales y ductos con nombre. `/` enfoca, flechas y `Enter`. Vuelo de 1,2 s. Enciende la capa si estaba apagada |
| Chip de frescura | "Datos actualizados hace N dias", verde, ambar pasados 90 dias, rojo pasados 180 |
| Estados de carga y error | Pantalla de carga hasta que el terreno termina (maximo 8 s). Avisos fuera de `#ui-root`: ya no se borran al redibujar |
| Footer de creditos | Atribucion corta siempre visible + dialogo "Fuentes y licencias" con enlace y licencia de cada fuente |

Ademas, errores que se encontraron auditando y se corrigieron en el camino. El
detalle esta en [../AUDITORIA-2026-09.md](../AUDITORIA-2026-09.md):

- Cerrar la ficha con la X sacaba al usuario del sitio.
- La capa de rios nunca se dibujaba: el Orinoco no estaba en el mapa.
- La vista de tabla no tenia salida visible.
- El banner DEMO desaparecia al cambiar de idioma con la capa encendida.
- Tocar una frontera abria una ficha de "Instalacion petrolera".

Y se cablea la capa de centrales electricas (ADR-013), que estaba a medias.

## Fuera de alcance, a proposito

Lo que Notion reparte en hitos posteriores se queda ahi: deep-links y jerarquia
de navegacion (M2), tabla de easing (M3), base oscura e iluminacion (M4). La
unica excepcion es la animacion de entrada de la ficha, 180 ms: sin ella el
panel aparecia de golpe, y respeta `prefers-reduced-motion`.

## Verificacion hecha

En Chrome headless con WebGL por software, escritorio 1440x900 y movil
390x844, el 2026-09-15:

- [x] Consola limpia al cargar (antes: `DeveloperError` de la hidrografia)
- [x] Cerrar la ficha con la X mantiene la URL; el gesto atras la cierra
- [x] Tocar una frontera no abre ficha
- [x] Buscar "guri" + Enter enciende la capa de centrales y abre la ficha
- [x] Tabla en movil: boton de volver visible; "Ver en el mapa" abre la ficha
- [x] `npm run build`: 68,6 KB de codigo propio, 22 KB gzip (limite: 150 KB)

**Nada de esto sustituye al gate.** WebGL por software no mide fluidez, y la
regla del proyecto es el telefono real.

## STOP GATE

- [x] Captura comparativa en `docs/capturas/` (antes y despues): `m1-antes-*` y `m1-despues-*`, escritorio y movil
- [ ] Telefono real, DevTools cerrado, **datos moviles**: carga, capas, buscador, ficha, tabla
- [ ] Objetivos tactiles comodos con el pulgar; nada depende de hover
- [ ] **Texto legible sin hacer zoom.** Lighthouse (2026-09-17) mide que casi el 90 % del texto de la build con M1 esta por debajo de 12 px: `text-[10px]` y los creditos. Si en el telefono se lee mal, aplica la clausula de reconsideracion de ADR-014. Ver `docs/NOTION.md` §4
- [ ] Gesto atras: cierra ficha, hoja de capas, tabla y dialogo, sin salir del sitio
- [ ] Cambiar de idioma con la capa DEMO encendida: el banner sigue ahi
- [ ] Revisado el diff: sin dependencias nuevas, sin datos inventados, contrato de `api.js` intacto
