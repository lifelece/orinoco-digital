# Fase 6-7 — Deploy + Divulgacion

> **Gate de entrada:** fases previas cerradas.
> **Gate de salida:** v1.0 publica en Vercel + material de lanzamiento.

**Tiempo estimado:** 1-2 semanas part-time

## Objetivo

Produccion en Vercel, y el paquete de divulgacion que convierte el proyecto en
algo que la gente ve, entiende y comparte.

## Deploy

```bash
npm run build
vercel --prod
```

Variables de entorno **en Vercel, no en el repo**:

- `VITE_CESIUM_TOKEN` — **un token nuevo, distinto al de desarrollo**,
  restringido a tu dominio de produccion en el panel de Cesium ion.
- `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` — solo si hiciste la Fase 4.

## Checklist antes de publicar

- [ ] Token de Cesium de produccion, restringido por dominio
- [ ] Ningun secreto en el repositorio (`git log -p` buscando `.env`)
- [ ] Meta OG y SEO con URL e imagen reales — hoy son placeholders en
      `index.html`
- [ ] Favicon
- [ ] Atribuciones visibles: Cesium, OpenStreetMap (ODbL), USGS, GEM
- [ ] Enlace a DISCLAIMER visible desde la interfaz
- [ ] Indicador de frescura de datos activo
- [ ] Code-splitting de Cesium revisado
- [ ] Lighthouse movil en verde

## Verificacion final

En dispositivo real, **en datos moviles, no en WiFi**, con DevTools cerrado:
carga en tiempo razonable, sin errores, interaccion fluida.

Es el estandar del proyecto desde la Fase 0 y en produccion es donde mas
importa.

## Divulgacion

Recuerda que el producto cuenta **tres historias a la vez** — geologia,
negocio e IA — y que ese cruce es el diferencial. El material debe mostrar las
tres.

| Pieza | Contenido |
|---|---|
| Video de recorrido | Vuelo desde el globo hasta un pozo, pasando por las capas. Higgsfield o Gemini para el montaje |
| README con demo | GIF animado + enlace en vivo. Es lo primero que ve un tecnico |
| Articulo ES/EN | Que es, como se hizo, que datos usa, que NO es |
| LinkedIn | Enfocado al angulo profesional: geologia + negocio + IA |
| Universidades y comunidad OSS | UDO, comunidad geoespacial, diaspora |

**Encuadre honesto en todo el material:** plataforma de divulgacion con datos
publicos verificables, mas una demo de IA. Nunca "sistema de prediccion". La
credibilidad es el activo; no la gastes en un titular.

## Sostenibilidad — que pasa despues del lanzamiento

El riesgo real ahora no es tecnico: es que el proyecto se quede quieto y
envejezca en publico.

- Cadencia de actualizacion definida en `DATA_SOURCES.md`.
- Indicador de frescura visible, para que un dato viejo se note.
- GitHub Action o issue recordatorio mensual.
- Responder issues: un proyecto con issues muertos parece abandonado aunque no
  lo este.

## STOP GATE (release v1.0)

- [ ] URL publica estable
- [ ] Secrets solo en Vercel, jamas en el repo
- [ ] Token de Cesium restringido por dominio
- [ ] Verificado en movil, en red movil real
- [ ] Atribuciones y disclaimer visibles
- [ ] Material de lanzamiento publicado
- [ ] Tag `v1.0` en GitHub
