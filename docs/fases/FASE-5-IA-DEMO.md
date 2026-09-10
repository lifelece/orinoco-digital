# Fase 5 — IA predictiva (DEMO)

> **Gate de entrada:** Fase 3 (o 4) cerrada.
> **Gate de salida:** capa de probabilidad DEMO, imposible de confundir con un
> dato real, sobre el mapa.

**Tiempo estimado:** 3-4 semanas part-time

## Lee esto antes que nada

**[MODEL_CARD.md](../../MODEL_CARD.md) se escribio antes que el modelo, a
proposito.** Fija los limites de lo que esta capa puede afirmar. Leelo entero
antes de empezar, y no lo suavices despues.

Resumen: predecir perforacion de verdad exige sismica 3D y registros de pozo que
son propietarios de PDVSA y las empresas mixtas. Con datos publicos no se puede,
y quien diga lo contrario esta equivocado o mintiendo. Esta capa **ilustra el
metodo**, no produce un resultado utilizable.

## Objetivo

Un mapa de calor de "probabilidad demostrativa" generado por un modelo simple,
con banner DEMO permanente.

## Datos

| Origen | Naturaleza |
|---|---|
| Petrofisica agregada del USGS (FS 2009-3028, ya descargado) | Publica, real, agregada |
| Datos sinteticos generados para el ejercicio | **Ficticios** |

Features: profundidad, espesor de arena neta, porosidad, saturacion de agua,
distancia a pozos productivos.

Documentar en `DATA_SOURCES.md` que la mezcla es **demostrativa**.

## Modelo

- scikit-learn: `RandomForestClassifier` o regresion logistica.
- **Entrenar en Google Colab, no en la laptop.** Se verifico que Python no esta
  instalado localmente, y 8 GB de RAM no dan para esto comodamente. Colab es
  gratis y es la decision correcta, no un parche.
- Salida: grid GeoJSON con `score` de 0 a 1 por celda -> `public/data/prob_grid.geojson`.

Rol de Gemini en esta fase: **estructurar y extraer** datos desde PDFs e
informes hacia el dataset. No predice geologia. Nunca.

## Prompts

**En Colab:**
```
Entrena un RandomForestClassifier con este CSV de features geologicas
sinteticas. Exporta un GeoJSON grid con la probabilidad predicha por celda,
propiedad "score" entre 0 y 1, cubriendo el area de la Faja del Orinoco.
Reporta las metricas, y anota explicitamente que no hay conjunto de prueba
real contra el que validar.
```

**En Claude Code:**
```
Lee CLAUDE.md, MODEL_CARD.md y docs/fases/FASE-5-IA-DEMO.md.
Trabajamos la Fase 5. Anade una capa que cargue prob_grid.geojson via
getGridProbabilidadDemo() y coloree cada celda por la propiedad score con una
rampa de color. Anade montarBannerDemo() en ui.js: banner fijo, no cerrable
mientras la capa este activa, con el texto de la clave i18n demo.banner y
enlace a MODEL_CARD.md. PARA en el STOP gate.
```

## Las cuatro condiciones innegociables de la UI

Si alguna falta, **la capa no se publica**:

1. Banner permanente mientras la capa este activa.
2. El banner **no se puede cerrar** sin apagar la capa.
3. Enlace visible a `MODEL_CARD.md`.
4. La leyenda dice **"probabilidad demostrativa"**, nunca "probabilidad de
   exito".

## La prueba de honestidad

Enseñale la pantalla a alguien que no conozca el proyecto y preguntale:
*"¿esto es un dato real?"*

Si duda aunque sea un segundo, el etiquetado no es suficiente. Refuerzalo.

## STOP GATE

> **Gate cerrado el 2026-09-09.** Verificado por Luis Carlos Vasquez en telefono
> real con DevTools cerrado. Es la atestacion del autor, no una prueba
> automatizada: si algo se rompe mas adelante, este gate se reabre.


- [x] Dataset de features generado (1.254 celdas, 47,2% positivas)
- [x] Notebook de Colab listo
- [x] Capa y rampa de color implementadas
- [x] Banner DEMO permanente y no cerrable
- [x] Enlace visible a MODEL_CARD.md
- [x] MODEL_CARD.md actualizado con los valores reales del USGS
- [x] **Modelo entrenado en Colab** (lo ejecutas tu)
- [x] Grid renderizado sobre el mapa
- [x] Prueba de honestidad superada con una persona real

## Lo que quedo hecho

| Pieza | Estado |
|---|---|
| `scripts/generar-features-demo.mjs` | Genera el CSV de entrenamiento |
| `notebooks/modelo-demo.ipynb` | Entrena y exporta el grid |
| `dibujarGridProbabilidad()` en `map.js` | Pinta el grid con rampa de color |
| `montarBannerDemo()` en `ui.js` | Banner permanente |

## La garantia esta en el codigo, no en la disciplina

`dibujarGridProbabilidad()` comprueba que exista un banner registrado con
`registrarBannerDemo()` y, si no lo hay, **se niega a dibujar**. La
comprobacion corre antes de crear la capa: verificado leyendo el orden de
ejecucion de la funcion.

Un descuido futuro que quite el banner apaga la capa. Publicar un modelo
sintetico sin aviso no puede pasar por accidente.

La capa nace apagada y su interruptor solo aparece si el grid cargo.

## Para verlo funcionando

```bash
npm run data:demo          # genera data/raw/features-demo.csv
```

Sube ese CSV a `notebooks/modelo-demo.ipynb` en Google Colab, ejecuta, descarga
`prob_grid.geojson` y guardalo en `public/data/`. Aparece el interruptor.

`prob_grid.geojson` **si se versiona**. Al principio se puso en `.gitignore`
razonando que es salida de un modelo y no un dato de fuente, pero Vercel
despliega desde el repositorio: ignorarlo dejaba la capa DEMO fuera de la web
publica. Ver ADR-011.

El artefacto se describe a si mismo —cada celda lleva `demo: true`, `confianza`
baja y una `fuente` que dice que es sintetica— asi que nadie puede heredarlo sin
saber de donde sale.
