# Plan de vibe-coding — Orinoco Digital

> Como construir esto sin quemarte, sin alucinaciones y sin refactors caros.
> Derivado de la documentacion en Notion (Proyecto Orinoco Digital), analizada
> y contrastada contra el estado real de las herramientas en septiembre 2026.

---

## 0. Como leer este plan

El proyecto son **tres proyectos con dificultad muy distinta**. Confundirlos es
la forma numero uno de perder meses:

| Capa | Que es de verdad | Viabilidad en solitario |
|---|---|---|
| A. Visualizacion / divulgacion | Ingenieria web geoespacial | Alta — **este es el MVP real** |
| B. IA predictiva de perforacion | ML supervisado sobre datos propietarios | Solo como DEMO |
| C. Investigacion PDVSA / gas / contratos | Periodismo de datos, OSINT | Media, continua |

Todo el esfuerzo de los primeros meses va a **A**. B se etiqueta como demo desde
el primer pixel. C corre en paralelo y no bloquea codigo.

---

## 1. Correcciones al plan original (leelas antes de codear)

El analisis de la documentacion encontro cinco puntos que muerden si se
descubren tarde. Ya estan resueltos en el repo, pero conviene que sepas por que.

### 1.1 `vite-plugin-cesium` esta muerto — CORREGIDO

La Fase 0 original manda `npm i cesium vite-plugin-cesium`. Ese paquete esta
**discontinuado desde finales de 2023**. Instalarlo hoy te deja con una
dependencia sin mantenimiento en el cimiento del proyecto.

El setup correcto es el ejemplo oficial de CesiumGS: `vite-plugin-static-copy`
copiando `Assets`, `Widgets`, `Workers` y `ThirdParty`, mas `CESIUM_BASE_URL`
definido en `define`. Ya esta en `vite.config.js`. Ver ADR-002.

### 1.2 El orden de las fases tiene una inversion util

El roadmap original pone Supabase (Fase 4) antes de la IA demo (Fase 5). Pero la
pagina "Soluciones practicas" concluye que la arquitectura correcta es
**static-first**: el GeoJSON en Git servido desde el CDN, con Supabase solo para
lo que necesite consulta dinamica.

Conclusion practica: **la Fase 4 deja de ser obligatoria para el MVP**. Si al
llegar a ella tus GeoJSON siguen siendo pequenos y de solo lectura, saltala y ve
directo a deploy. Supabase entra cuando aparezca una necesidad real (busqueda
espacial, series temporales, escrituras), no por calendario. Ver ADR-003.

### 1.3 Faltaba el modulo de i18n en el esqueleto

La pagina de puntos ciegos avisa que retro-adaptar i18n es caro, pero la Fase 0
original no lo incluia en la estructura. Ya esta: `src/i18n/` con `es.json`,
`en.json` y `t(clave)` desde el primer commit.

### 1.4 Falta un dato verificado para la vista inicial

`config.js` usa 8.5 N, -64.5 O como centro de la Faja. Viene de la
documentacion y esta marcado **SIN VERIFICAR**. Antes de cerrar la Fase 1 hay
que confirmarlo contra el poligono del USGS y anotarlo en `DATA_SOURCES.md`.
Es exactamente el tipo de dato que no se debe dar por bueno.

### 1.5 Python no esta instalado en esta maquina

Se comprobo: `python` en el PATH es el stub del Microsoft Store. No es un
problema hoy — la Fase 5 entrena en Google Colab a proposito, porque 8 GB de
RAM no dan para ML local comodo. Solo tenlo presente: **no intentes entrenar en
la laptop**.

---

## 2. El ritmo: como se vibe-codea esto

### La unidad de trabajo es la fase, no el dia

Cada fase tiene un archivo en `docs/fases/` con objetivo, gate de entrada,
implementacion, prompt de arranque, verificacion y STOP gate. Una sesion de
trabajo empieza leyendo el archivo de la fase activa.

### El ciclo de una sesion

1. **Abrir** — Claude Code lee `CLAUDE.md` + `docs/PLAN.md` + el archivo de la
   fase activa. Que confirme en una frase que fase trabaja.
2. **Pedir** — un prompt, un entregable acotado. Los prompts de arranque estan
   escritos en cada archivo de fase.
3. **Revisar** — leer el diff antes de aceptar. Buscar especificamente:
   dependencias nuevas, datos inventados, cambios de arquitectura no pedidos.
4. **Verificar** — en el telefono, en la red real, con DevTools cerrado.
5. **Commit** — pequeno y descriptivo, con `git commit -s` (DCO).
6. **Cerrar o continuar** — si el STOP gate esta completo, marcalo y para.

### Las tres preguntas antes de aceptar cualquier cambio

- ¿Agrego alguna dependencia que yo no aprobe?
- ¿Hay algun numero, coordenada o nombre de columna que no puedo rastrear a una
  fuente?
- ¿Cambio la estructura de modulos o el contrato de `api.js`?

Si alguna respuesta es si, rechaza y pide de nuevo. Estas tres cubren la mayor
parte de lo que sale mal al vibe-codear.

### Cuando Claude Code se pierde

Sintomas: inventa nombres de funciones que no existen, propone React, "arregla"
cosas que no pediste. Remedio: nueva sesion, releer `CLAUDE.md`, y un prompt mas
estrecho. No pelees con un contexto contaminado.

---

## 3. Hoja de ruta

Tiempos part-time. A ritmo full-time, aproximadamente un tercio.

| Fase | Entregable | Tiempo | Archivo |
|---|---|---|---|
| 0 | Esqueleto + globo Cesium | 1-2 sem | [fases/FASE-0-SETUP.md](fases/FASE-0-SETUP.md) |
| 1 | Mapa base sobre la Faja | 1-2 sem | [fases/FASE-1-MAPA-BASE.md](fases/FASE-1-MAPA-BASE.md) |
| 2 | Capa upstream (pozos) | 2-3 sem | [fases/FASE-2-UPSTREAM.md](fases/FASE-2-UPSTREAM.md) |
| 3 | Midstream + downstream | 2-3 sem | [fases/FASE-3-MID-DOWNSTREAM.md](fases/FASE-3-MID-DOWNSTREAM.md) |
| 4 | Backend Supabase *(opcional)* | 2-3 sem | [fases/FASE-4-BACKEND.md](fases/FASE-4-BACKEND.md) |
| 5 | IA predictiva DEMO | 3-4 sem | [fases/FASE-5-IA-DEMO.md](fases/FASE-5-IA-DEMO.md) |
| 6-7 | Deploy + divulgacion | 1-2 sem | [fases/FASE-6-7-DEPLOY.md](fases/FASE-6-7-DEPLOY.md) |

**Hito que importa:** MVP visual navegable (fases 0-3) en ~2-3 meses. Ese es el
punto en que el proyecto ya vale por si solo, aunque nunca hagas la Fase 5.

La investigacion OSINT (PDVSA, gas, contratos, capa empresarial) corre en
paralelo y alimenta `DATA_SOURCES.md` de forma continua.

---

## 4. Que hacer AHORA, en orden

1. **Crear cuenta en Cesium ion** (Community, gratis): https://ion.cesium.com/
2. **Pegar el token** en `.env` -> `VITE_CESIUM_TOKEN=`
3. `npm run dev` y confirmar que el globo carga
4. `npm run dev:host` y abrirlo **en el telefono**, misma red, DevTools cerrado
5. Marcar el STOP gate de la Fase 0
6. Abrir `docs/fases/FASE-1-MAPA-BASE.md` y empezar

Sin el paso 2 la app arranca pero muestra un error explicito: eso es
intencional, no un bug.

---

## 5. Riesgos que se gestionan, no se resuelven

| Riesgo | Mitigacion vigente |
|---|---|
| Abandono del proyecto (bus factor 1) | Fases cortas con entregable visible; el MVP vale sin las fases tardias |
| Datos que envejecen en silencio | Campo `ultima_verificacion` + indicador de frescura en la UI |
| Licencias de datos incompatibles | Matriz por dataset en `DATA_SOURCES.md`; capa OSM separada y atribuida |
| Free tier que se agota | Static-first: el CDN absorbe la lectura |
| Cortes de luz e internet | Trabajo offline-first, commits frecuentes, deploy en la nube |
| Que la demo de IA se lea como dato real | Banner permanente + `MODEL_CARD.md` + lenguaje explicito |
| Exposicion personal | Tono tecnico y neutral; solo datos ya publicos. Ver ADR-007 |

---

## 6. La regla que resume todo

> Publica solo lo que puedes defender con una fuente, y etiqueta como demo todo
> lo que no puedes.

Ese es el foso del proyecto. La calidad del render se copia en un fin de semana;
la credibilidad, no.
