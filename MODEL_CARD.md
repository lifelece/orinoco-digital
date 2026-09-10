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
| Entorno de entrenamiento | Google Colab (no local: 8 GB de RAM y Python sin instalar) |
| Salida | Grid GeoJSON con `score` de 0 a 1 por celda |
| Notebook | `notebooks/modelo-demo.ipynb` |
| Hiperparametros | 300 arboles, profundidad 8, minimo 5 muestras por hoja |
| Estado | Infraestructura lista. **Sin entrenar**: falta ejecutar el notebook |

`public/data/prob_grid.geojson` **no esta versionado a proposito**. Es salida de
un modelo, no un dato de fuente: quien quiera la capa ejecuta el notebook y la
genera. Asi nadie hereda un artefacto que parece dato sin saber de donde sale.

## Datos de entrenamiento

Generados por `scripts/generar-features-demo.mjs`. **1.254 celdas** en una
rejilla de 0,08 grados (~9 km) sobre la caja de la Faja. 47,2% con etiqueta
positiva.

### Lo que es real: las distribuciones

Cada variable se muestrea de una distribucion triangular (minimo, mediana,
maximo) con los valores **publicados en la tabla 1 del USGS FS 2009-3028**:

| Variable | Min | Mediana | Max |
|---|---|---|---|
| Porosidad (%) | 20 | 25 | 38 |
| Saturacion de agua (%) | 10 | 20 | 25 |
| Espesor de arena neta (ft) | 1 | 150 | 350 |
| Profundidad del reservorio (m) | 150 | 700 | 1.400 |
| Gravedad (grados API) | 4 | 10 | 16 |

Profundidad y gravedad API vienen del cuerpo del mismo documento. El factor de
recobro publicado (15 / 45 / 70 %) no se usa como feature.

### Lo que es inventado: el reparto espacial y la etiqueta

- **El reparto espacial** se genera con funciones seno para dar continuidad. La
  geologia real no se genera con senos.
- **La etiqueta objetivo** la calcula el script con una suma ponderada que nos
  hemos inventado: 35% porosidad, 30% espesor, 20% agua invertida, 15%
  profundidad invertida, mas ruido.

## LA LIMITACION QUE NO SE PUEDE MAQUILLAR

**El modelo no aprende geologia. Aprende a recuperar nuestra propia formula.**

Es circular por construccion: nosotros generamos la etiqueta con una formula,
el modelo la reproduce, y las metricas miden lo bien que la reprodujo. Un AUC
alto aqui solo dice que un bosque aleatorio sabe imitar una suma ponderada,
cosa que ya sabiamos.

Se anade ruido a proposito para que el modelo no acierte al 100%: sin el, la
etiqueta seria una funcion determinista de las features y el resultado seria
aun mas enganoso.

**Ninguna metrica de este modelo dice nada sobre la Faja del Orinoco.**

Se documenta asi de claro porque un demo que oculta su circularidad deja de ser
material didactico y pasa a ser un fraude presentable.

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

## Obligaciones en la interfaz — y como se garantizan

Mientras la capa este activa:

- **Banner permanente e imposible de ignorar** con el texto de la clave i18n
  `demo.banner`.
- Enlace visible a esta ficha.
- La capa dice **"probabilidad demostrativa"**, nunca "probabilidad de exito".
- El banner **no se puede cerrar** mientras la capa siga encendida.

**Esto no depende de la buena voluntad de quien programe manana.** Esta forzado
en el codigo: `dibujarGridProbabilidad()` en `src/map.js` comprueba que haya un
banner registrado con `registrarBannerDemo()` y, si no lo hay, **se niega a
dibujar** y avisa por consola. La comprobacion corre antes de crear la capa.

Un descuido futuro que quite el banner deja la capa apagada, que es el fallo
seguro. Lo contrario —publicar un modelo sintetico sin aviso— no puede pasar
por accidente.

La capa ademas **nace apagada** y su interruptor solo aparece si el grid llego a
cargarse.

## Responsable

Luis Carlos Vasquez. Correcciones y criticas metodologicas son bienvenidas por
issue en GitHub — especialmente de geologos y geofisicos.

**Ultima actualizacion:** 2026-09-09. Ficha creada antes del modelo y
actualizada al montar la infraestructura, todavia sin entrenar.
