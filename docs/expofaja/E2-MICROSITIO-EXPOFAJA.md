# E2 — Micrositio `/expofaja`: la vitrina unida al mapa

> **Decisiones:** ADR-020, piezas 3, 4, 7, 8 y 9.
> **Gate de entrada:** E1 mergeado (o al menos en vista previa aprobada).
> **Autorizacion CCIEB:** recibida el 2026-10-12 -> **modo marcas**: logos,
> fotos de ponentes y muro de aliados, ya optimizados en `public/expofaja/`.
> **Gate de salida:** telefono real + escaneo del QR impreso.
> **Fecha objetivo:** vista previa el miercoles 14; merge a `main` antes del
> jueves 15 a las 12:00.

## Objetivo

Una pagina ligera, con la identidad ExpoFaja, que cualquiera abre desde el QR
en el museo y en 3 segundos sabe **que charla hay ahora, que viene despues,
quien habla, quien organiza y por que Ciudad Bolivar** — y con un toque salta
al mapa 3D de la ciudad.

## Secciones (una sola pagina, movil primero)

| # | Seccion | Contenido | Datos |
|---|---|---|---|
| 1 | Cabecera | Co-marca `Orinoco Digital × [expofaja.webp]` sobre hero `ef-petroleo` (usar `expofaja-sobre-oscuro.webp`); fechas; sede; botones "Ver agenda" y "Ver Ciudad Bolivar en 3D" (-> `/?modo=ciudadBolivar`) | `evento.json` |
| 2 | Ahora / Siguiente | Durante el evento: sesion en curso y siguiente por sala, con hora local de Caracas. Fuera del evento: cuenta regresiva o "El evento termino" | `agenda.json` + `agenda.js` |
| 3 | Agenda | Pestanas por dia; cada sesion: hora, sala, tipo, titulo, ponente (enlace a su tarjeta) y boton "Agregar a mi calendario" (.ics generado en el navegador) | `agenda.json` |
| 4 | Ponentes | Tarjetas: `foto` (WebP del afiche, 7 ponentes) o avatar con iniciales si es `null`, titulo, nombre, perfil, sus sesiones. Perfil `[perfil_pendiente]` se muestra como "Perfil por confirmar". Solo `en_programa: true` | `ponentes.json` |
| 5 | ¿Por que Ciudad Bolivar? | Dos columnas: **"Lo que plantea el organizador"** (afirmaciones del brochure, atribuidas) y **"Lo que muestran los datos abiertos"** (anillos: 63 de 105 campos a menos de 200 km en linea recta; 5 campos mas cercanos con km; conteos OSM por clase; todo de E1, con fuente). Debajo, **"Lo que impulsa la CCIEB"**: las iniciativas de `iniciativas-ccieb.json` con enlace a su nota | `evento.json` + `public/data/ciudad-bolivar-resumen.json` (de E1, ~2 KB) |
| 6 | El mapa | Imagen estatica (WebP <= 120 KB) de Ciudad Bolivar y la Faja sacada del propio mapa + boton al deep-link de E1. **Sin Cesium** | captura versionada |
| 7 | Aliados | Muro de logos: institucionales arriba (CCIEB, Alcaldia, Gobernacion, Museo Soto), luego los 46 comerciales de `public/expofaja/marcas/aliados/`. Archivo por aliado: `semillas/marcas-manifiesto.json`. Los `nombre_confirmado: false` no se muestran | `aliados.json` + manifiesto |
| 8 | Participa | Tarjetas: asistir (formulario de la CCIEB `#formregexpofaja2026`), ponencias (correo), patrocinio (correo y pagina CCIEB), **Bolsa de Empleo Energetica** (noticia CCIEB). Orinoco no recoge datos ni vende nada | `evento.json` |
| 9 | Noticias | Ultimas 4 noticias de la CCIEB, enlazadas a su sitio | `noticias-ccieb.json` (E4 lo automatiza) |
| 10 | Pie | "Organizan: CCIEB · Alcaldia de Angostura del Orinoco"; aviso de independencia; fuentes y licencias; aviso de marcas | — |

**Cifras del organizador** (303 mil millones, 5.000 pozos...): en la columna
izquierda de la seccion 5, en un bloque rotulado "Cifras del organizador
(CCIEB)". Si Luis decidio en E0 dejarlas para E4, se omite el bloque.

## Arquitectura (ADR-020 §3)

```
expofaja/index.html          entrada de Vite (OG, JSON-LD, <noscript>)
src/expofaja/main.js         orquesta
src/expofaja/datos.js        fetch + validacion de los JSON (sin DOM)
src/expofaja/agenda.js       puras: sesionActual, proximaSesion, generarIcs
src/expofaja/vista.js        DOM (sin fetch, sin cesium)
src/expofaja/expofaja.css    Tailwind 4 + tokens ef-*/cc-* (02 §5)
public/data/expofaja/        evento, agenda, ponentes, aliados, noticias (.json)
public/expofaja/marcas/      YA EN EL KIT: logos WebP + aliados/ + AVISO.md
public/expofaja/ponentes/    YA EN EL KIT: 7 fotos WebP + AVISO.md
public/expofaja/og.png       1200x630 co-marca (o solo texto sin E0)
public/expofaja/mapa.webp    captura del mapa para la seccion 6
```

- `vite.config.js`: `build.rollupOptions.input = { main: "index.html",
  expofaja: "expofaja/index.html" }`. Comprobar en el build que el chunk
  `cesium` **no** aparece en el HTML de `/expofaja`.
- `vercel.json`: **retirar** la redireccion temporal de E1; anadir la
  cabecera `frame-ancestors` solo para `/expofaja/(.*)` (ADR-020 §6).
- Copiar `docs/expofaja/semillas/*.json` a `public/data/expofaja/` **sin
  editar a mano**; quitar las claves `_nota`. Un test valida la forma:
  toda sesion con `ponente_id` apunta a un ponente existente, horas
  `HH:MM`, fechas dentro del 15–17/10, todo bloque con fuente.
- Zona horaria: toda comparacion de horas en `America/Caracas` (UTC-4 fijo)
  con `Intl.DateTimeFormat`, no con la hora del telefono a ciegas.
- `.ics`: generado con texto plano (RFC 5545, `DTSTART;TZID=America/Caracas`),
  sin libreria. `UID` estable: `<fecha>-<inicio>-<sala>@orinoco-digital`.
- `?embed=1`: oculta cabecera y pie propios, muestra "Abrir en pantalla
  completa", y envia `postMessage({ tipo: "expofaja:altura", altura })` al
  padre cuando cambia la altura (`ResizeObserver`). Origen destino: el de
  la CCIEB, no `"*"`.

## SEO y redes

- `<title>`: "ExpoFaja Ciudad Bolivar 2026 — agenda, ponentes y mapa".
- OG/Twitter con `og.png` propio y `%SITIO_URL%/expofaja/`.
- JSON-LD `schema.org/Event`: `name`, `startDate 2026-10-15T17:00-04:00`,
  `endDate 2026-10-17T20:00-04:00`, `eventAttendanceMode Offline`,
  `eventStatus Scheduled`, `location` (Museo, con `geo` de OSM),
  `organizer` (CCIEB, url). Sin `offers`: no se venden entradas aqui.
- `canonical` a `/expofaja/`. En modo embed: `noindex`.

## Accesibilidad y rendimiento

- Contrastes de `02-IDENTIDAD-VISUAL.md` §3; `ef-cian`, `ef-naranja` y
  `ef-gris` **nunca** como texto sobre claro.
- Objetivos tactiles >= 44 px; pestanas de dias con roles ARIA; foco visible.
- `prefers-reduced-motion`: sin animaciones de entrada.
- Contenido del evento con `lang="es"` aunque la UI este en ingles.
- Presupuesto: JS propio <= 30 KB gzip; cada imagen <= 60 KB (logos <= 40 KB);
  LCP <= 2,5 s en 4G simulada. Fotos `loading="lazy"` salvo la cabecera.
- `<noscript>`: agenda basica en texto (el programa es lo minimo que debe
  verse sin JavaScript).

## Prompt de arranque (Claude Code)

```
Lee CLAUDE.md, docs/expofaja/README.md, 00-CONTEXTO.md, 01-DATOS-EVENTO.md,
02-IDENTIDAD-VISUAL.md, 03-ADR-020-PROPUESTA.md, docs/expofaja/AUTORIZACIONES.md
y este archivo (E2-MICROSITIO-EXPOFAJA.md). Rama: expofaja/e2-micrositio.

La autorizacion de marcas y fotos esta en AUTORIZACIONES.md: trabajas en
modo marcas con los archivos ya optimizados de public/expofaja/ (no
re-descargues ni re-comprimas; si alguno falta, avisa).

1. Segunda entrada de Vite y esqueleto de src/expofaja/ (ADR-020 §3). Muestra
   el build y confirma que /expofaja no carga el chunk de cesium. PARA.
2. datos.js + agenda.js con tests (sesionActual en los bordes: 11:59, 12:00,
   antes del evento, despues del evento; generarIcs valido).
3. vista.js seccion por seccion en el orden de la tabla, con i18n ES/EN.
4. Modo embed, OG, JSON-LD, cabeceras de vercel.json, retirar la redireccion
   temporal de E1.
5. npm test y npm run build: reporta pesos (JS gzip, cada imagen).

Reglas: datos SOLO de public/data/expofaja/*.json copiados de semillas; un
campo "[perfil_pendiente]" se muestra como "Perfil por confirmar", nunca se
rellena; sin dependencias nuevas; sin cesium; neutralidad (aviso fijo,
agenda textual, ningun ponente destacado).
```

## Verificacion

- [ ] `npm test`: tests de `agenda.js`, de forma de los JSON y de
      `verificar-modulos` (nada de `src/expofaja/` importa `cesium`;
      `vista.js` no hace `fetch`).
- [ ] Build: `/expofaja/index.html` sin referencia al chunk `cesium`.
- [ ] Lighthouse movil de `/expofaja`: rendimiento y accesibilidad
      anotados en el PR (meta: >= 90 ambos).
- [ ] El `.ics` se importa en Google Calendar y en el calendario del
      telefono con la hora correcta.
- [ ] Simular "ahora" (parametro de prueba solo en desarrollo, p. ej.
      `?ahora=2026-10-16T10:30`) y ver la franja Ahora/Siguiente correcta.
      Ese parametro **no** existe en el build de produccion: se habilita
      con una constante de `config.js` derivada de `import.meta.env.DEV`
      (`config.js` sigue siendo el unico que lee `import.meta.env`).

## STOP GATE

- [ ] Telefono real, datos moviles, DevTools cerrado: cabecera, agenda,
      ponentes, salto al mapa 3D y vuelta atras
- [ ] **QR impreso escaneado** con dos telefonos distintos
- [ ] Logos nitidos sobre claro y oscuro; muro de aliados completo; fotos
      de ponentes con avatar de iniciales donde no hay foto
- [ ] Aviso de independencia visible sin hacer scroll en el pie
- [ ] Revisado el diff: sin dependencias, sin datos inventados, sin
      `[perfil_pendiente]` rellenado
- [ ] PR abierto; merge a `main` solo con el OK de Luis y antes del jueves
      15 a las 12:00
