# Ficha del modelo — Capa predictiva DEMO

> **Este modelo es una demostracion educativa. No es un sistema de prediccion
> de perforacion. No es asesoria de inversion ni asesoria de ingenieria. No
> debe usarse para tomar ninguna decision real.**

Esta ficha existe antes que el modelo a proposito: fija los limites de lo que
la Fase 5 puede afirmar, para que el entusiasmo de construirlo no se los coma.

## Por que un modelo real es imposible aqui

Predecir la probabilidad de exito de una perforacion es aprendizaje supervisado
sobre datos geofisicos: sismica 3D, registros de pozo, nucleos, historiales de
produccion. Esos datos:

- Son **propietarios** de PDVSA y de las empresas mixtas.
- **No son publicos** — ni por ley de transparencia ni por filtracion utilizable.
- Pesan **terabytes** y requieren interpretacion de un geofisico.

Cualquiera que afirme predecir perforacion en la Faja con datos publicos esta
equivocado o mintiendo. Este proyecto no va a ser ninguna de las dos cosas.

Tampoco es tarea de un LLM: Gemini se usa aqui para **extraer y estructurar**
datos desde PDFs e informes, nunca para estimar geologia.

## Que es este modelo entonces

Una **ilustracion de metodo**. Ensena como se veria el flujo — features
geologicas, entrenamiento, grid de probabilidad sobre el mapa — usando datos
publicos agregados y datos sinteticos. El valor es pedagogico: muestra el
procedimiento, no produce un resultado utilizable.

## Ficha tecnica

| Campo | Valor |
|---|---|
| Proposito | Educativo y demostrativo |
| Tipo | Clasificador supervisado (RandomForest o regresion logistica) |
| Libreria | scikit-learn |
| Entorno de entrenamiento | Google Colab (no local: 8 GB de RAM no bastan) |
| Salida | Grid GeoJSON con `score` de 0 a 1 por celda |
| Estado | No entrenado — pendiente de la Fase 5 |

## Datos de entrenamiento

| Origen | Naturaleza |
|---|---|
| Petrofisica agregada del USGS (FS 2009-3028) | Publica, real, **agregada** — no por pozo |
| Datos sinteticos generados para la demo | **Ficticios**, generados para completar el ejercicio |

**Importante:** al mezclar datos publicos agregados con datos sinteticos, el
resultado no describe la realidad de ningun bloque concreto. Es un artefacto
del ejercicio.

## Features previstas

Profundidad, espesor de arena neta, porosidad, saturacion de agua y distancia a
pozos productivos conocidos.

Se documentara la fuente y el rango de cada una antes de entrenar.

## Limitaciones (todas, sin suavizar)

1. **No valida contra resultados reales de perforacion.** No existe un conjunto
   de prueba publico. La metrica que reporte el modelo no significa nada sobre
   el mundo real.
2. **Datos sinteticos.** Parte de las filas de entrenamiento son inventadas por
   construccion.
3. **Resolucion inadecuada.** La petrofisica publica es agregada por unidad de
   evaluacion; decidir una perforacion exige resolucion de pozo.
4. **Sin variables criticas.** Faltan sismica, presion de yacimiento,
   continuidad lateral, estructura y saturaciones locales.
5. **Sin dimension temporal.** Los yacimientos cambian con la produccion; el
   modelo ve una foto fija.
6. **Sin analisis economico.** Exito geologico no es exito comercial.
7. **Correlacion, no causa.** El modelo aprende patrones estadisticos, no
   fisica de yacimientos.

## Uso aceptable e inaceptable

**Aceptable:** ensenar el flujo de un modelo geoespacial; material de clase;
demostrar la integracion tecnica entre ML y un visor 3D.

**Inaceptable:** decidir donde perforar; sustentar una inversion; presentarlo
como estimacion real; citarlo como evidencia sobre el potencial de un bloque;
cualquier uso que omita la palabra DEMO.

## Obligaciones en la interfaz

Mientras la capa este activa:

- **Banner permanente e imposible de ignorar** con el texto de la clave i18n
  `demo.banner`.
- Enlace visible a esta ficha.
- La leyenda dice **"probabilidad demostrativa"**, nunca "probabilidad de
  exito".
- El banner **no se puede cerrar** mientras la capa siga encendida.

Si la implementacion no cumple estas cuatro condiciones, la capa no se publica.

## Responsable

Luis Carlos Vasquez. Correcciones y criticas metodologicas son bienvenidas por
issue en GitHub — especialmente de geologos y geofisicos.

**Ultima actualizacion:** 2026-09-08 (ficha creada antes del modelo)
