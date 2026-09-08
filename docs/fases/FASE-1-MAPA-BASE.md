# Fase 1 — Mapa base 3D (Faja del Orinoco)

> **Gate de entrada:** Fase 0 cerrada.
> **Gate de salida:** viewer centrado en la Faja con terreno y vuelo inicial,
> verificado en movil.

**Tiempo estimado:** 1-2 semanas part-time

## Objetivo

Camara inicial sobre la Faja Petrolifera del Orinoco, terreno mundial activo,
controles limitados y un boton "Volar a la Faja".

## Tarea bloqueante: verificar el centro de la Faja

`config.js` usa **8.5 N, -64.5 O** y esta marcado **SIN VERIFICAR**. Viene de la
documentacion del proyecto, no de una fuente primaria.

Antes de cerrar esta fase:

1. Abrir `data/raw/usgs-fs-2009-3028-orinoco-oil-belt.pdf` (ya descargado).
2. Localizar el mapa de la Orinoco Oil Belt Assessment Unit y sus limites.
3. Derivar un centro y una altura de camara que encuadren la Faja completa.
4. Actualizar `VISTA_FAJA` y **quitar la marca de SIN VERIFICAR**.
5. Registrar la fuente en [../DATA_SOURCES.md](../DATA_SOURCES.md).

Lo mismo con los cuatro bloques: `BLOQUES` en `config.js` tiene `centro: null` a
proposito. **Null es correcto; un numero inventado es un fallo grave.**

## Implementacion

- `config.js` — `VISTA_FAJA` verificada y centros de los 4 bloques.
- `map.js` — `volarAFaja()` ya existe. Ajustar duracion y pitch al dato real.
- `ui.js` — el boton ya existe. Revisar que sea comodo con el pulgar en movil.
- Opcional: poligono de la Faja como referencia visual, si el USGS lo permite
  extraer con precision razonable.

## Prompt de arranque

```
Lee CLAUDE.md y docs/fases/FASE-1-MAPA-BASE.md.
Trabajamos la Fase 1. Ya verifique el centro de la Faja: es [lat], [lng].
Actualiza VISTA_FAJA en config.js con ese dato y quita la marca SIN VERIFICAR.
Ajusta volarAFaja() para que el encuadre muestre la Faja completa.
No toques la estructura de modulos. PARA en el STOP gate.
```

## Verificacion

En movil real, DevTools cerrado: abre sobre Venezuela oriental, el terreno tiene
relieve visible, el boton vuela a la Faja con fluidez y sin tirones.

## STOP GATE

- [ ] Centro de la Faja **verificado contra fuente** y registrado
- [ ] Vista inicial sobre la FPO
- [ ] Terreno 3D con relieve visible
- [ ] Boton de vuelo funcional en movil
- [ ] Rendimiento aceptable (> 30 FPS al interactuar)
