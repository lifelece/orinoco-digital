# Convenciones

## Idioma del codigo

- **Codigo, nombres y comentarios: espanol**, sin tildes ni enes en
  identificadores (`volarAFaja`, no `volarALaFajaPetrolífera`).
- **Texto visible al usuario: nunca literal.** Siempre `t("clave")`.
- Los nombres de campos de datos van en espanol sin tildes: `operadora`,
  `ultima_verificacion`. Coinciden con las columnas de Supabase.

Razon: el dominio es venezolano y las fuentes son en espanol. Mezclar idiomas en
los nombres de dominio genera errores de traduccion mental.

## Nomenclatura

| Elemento | Estilo | Ejemplo |
|---|---|---|
| Variables y funciones | camelCase | `volarAFaja`, `cargarGeoJSON` |
| Constantes de modulo | UPPER_SNAKE | `CESIUM_TOKEN`, `VISTA_FAJA` |
| Archivos JS | camelCase corto | `map.js`, `data.js` |
| Claves i18n | punto jerarquico | `panel.operadora`, `boton.volarFaja` |
| IDs de activos | MAYUS con guiones | `POZO-JUN-001`, `REF-AMUAY` |
| Ramas git | tipo/descripcion | `fase-2/capa-pozos` |

## Estilo

- ES6 modules, `import`/`export` nombrados. Sin `export default`.
- `const` por defecto; `let` solo si reasignas. Nunca `var`.
- `async`/`await`, no cadenas de `.then()`.
- Encadenamiento opcional (`?.`) y coalescencia (`??`) en vez de guardas largas.
- Comillas dobles. Punto y coma. Dos espacios de indentacion.
- Funciones cortas. Si una pasa de ~40 lineas, probablemente hace dos cosas.

## Comentarios

Explican **por que**, no **que**. El codigo ya dice que hace.

```js
// MAL
// Recorre las features y las filtra
const validas = features.filter(esValida);

// BIEN
// Una feature sin fuente no se dibuja: la credibilidad del proyecto depende
// de que todo dato visible sea rastreable. Ver CLAUDE.md regla 3.
const publicables = features.filter(tieneProcedencia);
```

Todo valor sin verificar se marca en el propio codigo:

```js
// SIN VERIFICAR — confirmar contra el poligono del USGS antes de cerrar Fase 1.
export const VISTA_FAJA = { lng: -64.5, lat: 8.5 };
```

## JSDoc

Obligatorio en todo lo exportado: parametros, retorno y efectos secundarios.
Da a Claude Code el contexto que evita que invente firmas.

## Tailwind

- Clases de utilidad en el HTML generado por `ui.js`. Sin `@apply`.
- Movil primero: base sin prefijo, `sm:` y `md:` para pantallas mayores.
- Estados de foco visibles siempre (`focus-visible:outline`). Teclado incluido.
- Paleta: `slate` para superficies, `emerald` para acciones, `red` para errores,
  `amber` para avisos DEMO.

## Datos

- Todo GeoJSON en WGS84 (EPSG:4326), longitud primero: `[lng, lat]`.
- Fechas en ISO 8601: `2026-09-08`.
- Un dato ausente es `null` explicito. **Nunca** un valor inventado, un cero de
  relleno ni una cadena vacia que parezca dato.
- Cada registro con `fuente`, `confianza` (`alta`/`media`/`baja`) y
  `ultima_verificacion`.

## Commits

Formato: `tipo(alcance): descripcion en imperativo`

```
feat(fase-2): anadir capa de pozos desde GeoJSON local
fix(map): corregir altura de camara en moviles
docs(fuentes): registrar licencia y CRS del dataset de GEM
data(upstream): actualizar estado de 12 pozos del bloque Junin
```

Tipos: `feat`, `fix`, `docs`, `data`, `refactor`, `chore`.

**Firma DCO obligatoria:** `git commit -s`. Sustituye a un CLA y deja constancia
de la procedencia de cada aporte. Ver `CONTRIBUTING.md`.

## Verificacion antes de cerrar una fase

1. Funciona en escritorio.
2. Funciona **en un telefono real**, misma red, **DevTools cerrado**.
3. Consola limpia.
4. Los errores se ven en la UI, no solo en consola.
5. El STOP gate de la fase esta completo.

El paso 2 no es negociable: el publico objetivo esta en redes moviles
venezolanas, no en fibra de escritorio.
