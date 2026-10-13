# Tareas 002 — Micrositio `/expofaja`

> Spec: `specs/002-micrositio-expofaja/spec.md` (manda). Mandato:
> `docs/expofaja/E2-MICROSITIO-EXPOFAJA.md`. Rama `expofaja-e2`, worktree
> `C:\dev\orinoco-e2`. Escritas por el coordinador el 2026-10-13 (el
> planificador se corto por limite de sesion tras la spec): este archivo hace
> de plan corto. Fecha: vista previa mie 14; merge antes del jue 15 a las 12:00.

## Ya hecho

- [x] T1 · Segunda entrada de Vite, esqueleto `src/expofaja/`, regla de
  `verificar-modulos` (sin `map.js`, `vista.js` sin `fetch`) · 878a8c5.
- [x] T0 · Contratos compartidos (coordinador): en `src/config.js`
  `MODO_DESARROLLO`, `RUTAS_EXPOFAJA`, `DESFASE_EVENTO`, `ORIGEN_CCIEB`,
  `URL_MAPA_CIUDAD`; scripts npm `data:expofaja` y `og:expofaja`; marcadores
  `<!-- agenda-noscript:inicio/fin -->` en `expofaja/index.html`; merge de
  `expofaja-e1` (trae `t(clave, params)` y `ciudad-bolivar-resumen.json`).

## Duenos de archivo (nadie toca archivos de otro paquete)

| Paquete | Archivos |
|---|---|
| A — datos y logica | `scripts/expofaja-datos.mjs` (nuevo), `public/data/expofaja/*.json` (generados), bloque entre marcadores `agenda-noscript` de `expofaja/index.html` (solo lo escribe el script), `src/expofaja/datos.js`, `src/expofaja/agenda.js`, `test/expofaja-datos.test.mjs`, `test/expofaja-agenda.test.mjs` |
| B — vista | `src/expofaja/vista.js`, `src/expofaja/embed.js` (nuevo), `src/expofaja/main.js`, `src/expofaja/expofaja.css`, claves `expofaja.*` al final de `src/i18n/es.json` y `en.json` |
| C — HTML, cabeceras, imagenes | `expofaja/index.html` (todo menos el bloque noscript), `vercel.json`, `scripts/expofaja-og.mjs` (nuevo), `docs/expofaja/og-plantilla.html` (nuevo), `public/expofaja/og.png`, `test/expofaja-html.test.mjs` (nuevo) |
| Coordinador | `src/config.js`, `package.json`, `scripts/verificar-modulos.mjs`, este archivo |

Si necesitas una constante nueva en `config.js` o un cambio en otro archivo,
escribelo en tu informe; no lo edites.

## Contratos (firmas; JSDoc obligatorio en lo exportado)

```js
// src/expofaja/datos.js (A) — fetch + validacion, sin DOM
export async function cargarDatosEvento(fetchFn = fetch)
// -> { evento, agenda, ponentes, aliados, manifiesto, noticias, iniciativas, resumen, avisos: string[] }
// Lanza Error si evento/agenda/ponentes faltan o no validan (RF-3).
// aliados/manifiesto/noticias/iniciativas -> null + entrada en avisos (RF-4); resumen -> null (RF-47).
export function validarAgenda(agenda, ponentes)   // -> string[] errores (RF-5)
export function validarEvento(evento)             // -> string[] (RF-6)
export function validarNoticias(noticias)         // -> string[] (RF-7)
export function validarResumen(resumen)           // -> string[]

// src/expofaja/agenda.js (A) — puras; "ahora" es un Date; hora del evento = DESFASE_EVENTO
export function instanteEvento(fecha, hhmm)       // "2026-10-16","09:00" -> Date (null si hhmm null)
export function horaEvento(ahora)                 // Date -> "HH:MM" en hora del evento (RF-14)
export function fechaEvento(ahora)                // Date -> "AAAA-MM-DD" en hora del evento
export function estadoEvento(agenda, ahora)       // "antes" | "durante" | "despues"
export function sesionActual(agenda, ahora)       // [{ dia, sesion }] en curso, sin exposiciones, una por sala (RF-16)
export function exposicionEnCurso(agenda, ahora)  // { dia, sesion } | null (RF-20)
export function proximaSesion(agenda, ahora)      // { dia, sesion } | null (RF-18/19)
export function cuentaRegresiva(agenda, ahora)    // { dias, horas, minutos } | null (RF-15)
export function diaInicial(agenda, ahora)         // indice de pestana (RF-26)
export function enCurso(dia, sesion, ahora)       // boolean (RF-29)
export function uidSesion(dia, sesion)            // "<fecha>-<HHMM>-<sala>@orinoco-digital" (RF-33)
export function generarIcs(sesion, dia, ponente, generado = new Date()) // texto RFC 5545 (RF-31..34)
export function leerAhora(search, permitido, reloj = () => new Date()) // RF-23/24

// src/expofaja/vista.js (B) — DOM; sin fetch, sin cesium
export function montarVista(contenedor, datos, { embed, alCambiarIdioma })
export function actualizarTiempo(ahora)           // repinta estado/Ahora/Siguiente/hora/cuenta (RF-22)
export function mostrarErrorCarga(contenedor, error) // RF-3

// src/expofaja/embed.js (B) — RF-60..65
export function esEmbed(search)                   // boolean
export function iniciarEmbed(documento, ventana)  // noindex, target=_top, postMessage a ORIGEN_CCIEB con ResizeObserver (>=150 ms)
```

## Paquete A — datos y logica

- [x] A1 · `scripts/expofaja-datos.mjs`: copia `docs/expofaja/semillas/{evento,agenda,ponentes,aliados,marcas-manifiesto,iniciativas-ccieb}.json` y `noticias-ccieb.json` -> `noticias.json` en `public/data/expofaja/` **sin claves `_nota`** (en cualquier nivel), sin editar valores; genera el `<noscript>` con la agenda en texto (RF-73) entre los marcadores de `expofaja/index.html`; idempotente; ejecutarlo · RF: 1, 2, 8, 73 · test: `test/expofaja-datos.test.mjs` — las copias existen, no tienen `_nota`, el resto es identico a la semilla; toda `foto`/logo referenciado existe bajo `public/expofaja/` (RF-8) · vueltas: 0/2
- [x] A2 · `datos.js`: `cargarDatosEvento` y validadores · RF: 3-7, 47 · test: casos validos con los JSON reales y casos rotos (fecha fuera de rango, hora "12:00 AM", tipo desconocido, ponente_id inexistente, bloque sin fuente, noticia de otro dominio); fetch simulado con 404 para un opcional y para un critico · vueltas: 0/2
- [x] A3 · `agenda.js` · RF: 13-24, 26, 29, 31-34 · test: `sesionActual` el 2026-10-16 a las 11:59, 12:00, el 15 a las 08:00 (antes) y el 17 a las 21:00 (despues) — esperado de la spec tecnica §11 contrastado con `agenda.json` real (si no cuadra, manda el JSON y se reporta); resultado identico con `TZ=Asia/Tokyo` y `TZ=America/Caracas` (RF-13); `.ics` con CRLF, lineas <= 75 octetos, escapes, `DTSTART;TZID=America/Caracas`, UID estable y distinto por sesion; `leerAhora` ignora el parametro si `permitido` es false o el valor es invalido · vueltas: 0/2

## Paquete B — vista (espera las firmas de A; puede escribir contra ellas desde ya)

- [x] B1 · `main.js` + `vista.js` secciones 1-4 (cabecera con co-marca y frase de anillos, Ahora/Siguiente con reloj por minuto, Agenda con pestanas ARIA y boton de calendario, Ponentes) · RF: 9-12, 14-30, 35-41, 74-77 · test: `npm test` (claves i18n usadas existen; `verificar-modulos`); `npm run dev` + `?ahora=2026-10-16T10:30` a 390x844 sin scroll en la cabecera (RF-12) · vueltas: 0/2
- [x] B2 · `vista.js` secciones 5-10 (Por que Ciudad Bolivar con organizador / datos abiertos / cifras con contraste / iniciativas; mapa con fallback sin imagen RF-50; aliados con institucionales primero, `nombre_confirmado:false` omitidos, sin logo -> tarjeta de texto, `loading="lazy"`; Participa; Noticias; Pie con aviso de independencia primero) + `expofaja.css` + `embed.js` · RF: 42-65 · test: `npm test`; build; revision de contrastes de 02 §3 (ef-cian/naranja/gris nunca texto sobre claro) · vueltas: 0/2

## Paquete C — HTML, cabeceras e imagenes

- [x] C1 · `expofaja/index.html`: meta descripcion, canonical `/expofaja/`, OG/Twitter (`%SITIO_URL%` como ya hace `index.html`), JSON-LD `Event` (RF-72, `location` con geo del Museo Soto tomada de `docs/expofaja/semillas/ciudad-bolivar-verificacion.geojson`, sin `offers`) · RF: 70-72 · test: `test/expofaja-html.test.mjs` — JSON-LD parsea y trae fechas exactas; meta OG presentes; marcadores noscript intactos · vueltas: 0/2
- [x] C2 · `vercel.json`: retirar la redireccion temporal `/expofaja` de E1; cabeceras `frame-ancestors` solo en `/expofaja/(.*)` y `Cache-Control` corto en `/data/expofaja/(.*)` (spec tecnica §8); JSON estricto · RF: 66-69 · test: en el mismo test, el JSON parsea, no hay redirect de `/expofaja`, la CSP no aplica a `/` · vueltas: 0/2
- [x] C3 · `og.png` 1200x630 <= 300 KB: `docs/expofaja/og-plantilla.html` (co-marca con `public/expofaja/marcas/`, fechas, sede; tokens ef-*) renderizada con Edge/Chrome headless instalado (`--headless --screenshot --window-size=1200,630`) por `scripts/expofaja-og.mjs` (sin dependencias npm) · RF: 71, RNF-2 · test: tamano y dimensiones leidas de la cabecera PNG · vueltas: 0/2

## Integracion (coordinador)

- [ ] I1 · Merge de lo ultimo de `expofaja-e1`; `npm test`, `npm run build`: `dist/expofaja/index.html` sin chunk cesium (RF-69), JS propio <= 30 KB gzip (RNF-1), pesos de imagenes; Lighthouse movil si hay Chrome DevTools MCP; `mapa.webp` desde la vista previa de E1 (duda 2: sin captura, RF-50, hasta tenerla) · vueltas: 0/2
- [ ] I2 · PR contra `main` sin merge; checklist de Luis (telefono, QR impreso con dos telefonos, `.ics` en Google Calendar y en el telefono)
