# El proceso: como se construyo esto

**Del 8 al 10 de septiembre de 2026.** De una carpeta vacia a un sitio publico
con cinco capas de datos trazables.

Este documento no es un diario de victorias. Su valor esta en los errores, que
son lo que no se aprende leyendo el codigo terminado.

---

## Lo que se construyo

| | |
|---|---|
| En produccion | https://orinoco-digital.vercel.app |
| Codigo | 34,7 KB propios (11,5 KB gzip) + CesiumJS en chunk aparte |
| Datos | 105 campos · 346 ductos · 97 activos downstream · 105 lineas de limites · 1.254 celdas DEMO |
| Documentacion | 21 archivos Markdown, 11 decisiones registradas |

## El metodo, en una frase

**Fases con STOP gate, cada dato con fuente, y ningun hueco rellenado con algo
plausible.**

Las tres reglas se refuerzan entre si. Los gates obligan a verificar en un
telefono real antes de seguir. La regla de fuente impide que entre nada que no
se pueda defender. Y la prohibicion de inventar convierte los huecos en
informacion en vez de en vergüenza.

## Las fases, y lo que costo cada una

| Fase | Resultado |
|---|---|
| 0 · Setup | Esqueleto ES6, Vite, Cesium, i18n desde el primer commit |
| 1 · Mapa base | Hubo que **medir** la Faja: su poligono oficial no existe en publico |
| 2 · Upstream | 105 campos. Descubrimos que son **campos, no pozos** |
| 3 · Mid/Downstream | 346 ductos y 97 activos. Filtrar fue mas trabajo que dibujar |
| 4 · Backend | **Saltada.** Ninguno de sus criterios se cumplia (ADR-010) |
| 5 · IA DEMO | Modelo sintetico con el aviso forzado en codigo |
| 6-7 · Deploy | En Vercel, con caches por ruta y Open Graph |

---

## Los siete errores, y que ensena cada uno

### 1. La documentacion de partida apuntaba a una dependencia muerta

El plan original mandaba instalar `vite-plugin-cesium`. Esta **discontinuado
desde 2023**. Se detecto antes de instalarlo y se uso el ejemplo oficial de
CesiumGS.

**Ensena:** verificar el estado de cada dependencia antes de escribirla en el
cimiento, aunque venga de tu propia documentacion.

### 2. El build de 5 kB que parecia roto y no lo estaba

Con el token de Cesium vacio, `npm run build` producia un bundle de 5 kB sin
Cesium. Vite sustituye la variable en tiempo de compilacion, la guarda
`if (!TOKEN) throw` se vuelve constante y Rollup elimina como muerto todo lo que
va detras.

**Ensena:** un build que compila no es un build que funciona.

### 3. Llamar "pozo" a un campo

El conversor escribia `tipo: "pozo"`. Pero GOGET es un inventario de **campos**:
su propia documentacion dice que la coordenada es *"aproximadamente el centro de
la unidad"*, que abarca kilometros.

Se detecto leyendo la hoja `About` del libro, no los datos.

**Ensena:** leer la documentacion del dataset antes que el dataset. Un campo
presentado como pozo es un dato falso, y este proyecto vive de no tenerlos.

### 4. Las tres refinerias mas grandes del pais faltaban

La primera consulta a OpenStreetMap no devolvia **Amuay, El Palito ni Punta
Cardon**. Estaban etiquetadas de otra forma. Y Punta Cardon volvio a colarse
despues porque el clasificador buscaba el termino ingles "refiner" y su nombre
real es "Centro de **Refinacion** Paraguana".

**Ensena:** en datos colaborativos, la ausencia casi nunca significa
inexistencia. Contrastar contra una lista de activos conocidos antes de dar una
capa por completa.

### 5. Cambiar calidad por fluidez sin querer

Al arreglar una queja de rendimiento en movil se subio el error de terreno de 2
a 4. Arreglo la fluidez y dejo el mapa borroso — la siguiente queja.

La solucion no fue elegir: **dos valores**, uno mientras la camara se mueve y
otro al detenerse. El ojo no aprecia detalle en movimiento.

**Ensena:** cuando dos requisitos parecen excluyentes, suele faltar una
dimension. Aqui era el tiempo.

### 6. El import que faltaba y tumbo el sitio entero

En produccion no se dibujaba **ningun** dato. `main.js` usaba
`getZonaDisputada` sin importarlo. El array de capas se construye **antes** del
`Promise.allSettled`, asi que el `ReferenceError` no lo absorbia el manejo por
capa: reventaba la carga entera. Y al llamarse sin `await`, la promesa
rechazada quedaba sin manejar y ni siquiera aparecia el aviso de error.

La causa de fondo: un reemplazo automatico que no encontro su patron y fallo en
silencio. Se dio por bueno tras comprobar con `grep` que el simbolo aparecia en
el archivo — **sin verificar que lo que aparecia era el uso y no el import**.

**Ensena:** verificar la propiedad que importa, no una cadena que se le parece.
La comprobacion ahora es que todo simbolo usado este importado o definido.

### 7. Ignorar en Git lo que produccion necesitaba

`prob_grid.geojson` se puso en `.gitignore` razonando que es salida de un modelo
y no un dato de fuente. Pero Vercel despliega desde el repositorio: la capa DEMO
no habria existido en la web. Revertido en ADR-011.

**Ensena:** una regla correcta en abstracto puede ser incorrecta aguas abajo.

---

## Las decisiones que mas rindieron

**Static-first.** El GeoJSON en Git como fuente de verdad resolvio de un golpe
persistencia, cuota, rendimiento y superficie de escritura. Y permitio **saltar
la Fase 4 entera** cuando se comprobo que ninguno de sus criterios se cumplia.

**El contrato de `api.js`.** Que toda funcion devuelva una FeatureCollection
permitio anadir cinco capas sin tocar la interfaz.

**i18n desde el primer commit.** Coste: minutos. Retro-adaptarlo en la Fase 3
habrian sido dias.

**Escribir la MODEL_CARD antes que el modelo.** Fijo los limites antes de que
el entusiasmo de construirlo pudiera erosionarlos.

**La garantia en el codigo, no en la disciplina.** `dibujarGridProbabilidad()`
se **niega a dibujar** si no hay un banner DEMO registrado. Un descuido futuro
apaga la capa en vez de publicar un modelo sintetico sin aviso.

---

## Lo que se midio, no se estimo

| Hallazgo | Como se obtuvo |
|---|---|
| Extension de la Faja | Analisis de pixeles sobre la figura del USGS, calibrando su graticula |
| 7,25 MB → 231 KB en limites | Douglas-Peucker propio, sin dependencias |
| 704 tanques → 25 parques | Agrupacion por proximidad, marcada como dato derivado |
| Curva de descubrimientos | Agregacion de 96 campos fechados |

En el caso de la Faja hubo que medir porque **el poligono oficial no esta
publicado como GIS**: el shapefile del USGS para Suramerica solo trae unidades
convencionales y la Faja es continua. Ese hallazgo negativo tambien esta
documentado, para que nadie repita la busqueda.

---

## Lo que sigue abierto

- **Token de Cesium sin restringir por dominio.** Lo mas urgente.
- Centros de los cuatro bloques de la Faja: sin fuente publica localizada.
- Poligono real de la Faja, en vez de su caja envolvente.
- Historial por pozo: **no existe en publico**, y probablemente nunca lo hara.
- Lighthouse, material de divulgacion y el tag v1.0.

---

## Lo que este proyecto demuestra que se puede hacer solo

Con herramientas gratuitas y una laptop de 8 GB: un mapa 3D sobre terreno real,
con datos de cuatro fuentes distintas, licencias respetadas una por una,
bilingue, accesible, desplegado, y con cada dato rastreable hasta su origen.

Lo que **no** se puede hacer solo, y conviene decirlo con la misma claridad:
predecir perforacion, reconstruir el historial de un pozo, o sustituir los datos
que solo tiene quien opera los campos.

**La diferencia entre las dos listas es exactamente la diferencia entre un
proyecto honesto y uno que promete de mas.**
