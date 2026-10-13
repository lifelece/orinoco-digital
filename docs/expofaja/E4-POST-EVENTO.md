# E4 — Despues del evento: de vitrina a alianza

> **Gate de entrada:** E1 y E2 en produccion; el evento termino (17/10).
> **Fecha objetivo:** semana del 19/10. Cada bloque es independiente: Luis
> elige el orden. Cada uno pasa por su PR y su gate en telefono real.

## Bloques

### E4.1 — Memoria del evento (obligatorio)

Desde el 18/10 el micrositio cambia solo de modo (lo decide `agenda.js` con
la fecha, no un despliegue):

- Cabecera: "Se celebro del 15 al 17 de octubre de 2026".
- Franja Ahora/Siguiente -> "Resumen": cifras que la CCIEB publique
  (asistentes, expositores, ruedas de negocio) **atribuidas**, o nada.
- Agenda -> archivo, con enlace a la presentacion de cada ponente si la
  CCIEB la comparte con permiso.
- Galeria: solo fotos con autorizacion registrada en `AUTORIZACIONES.md`,
  WebP <= 60 KB, con credito.

### E4.2 — Noticias de la CCIEB automaticas

- `scripts/noticias-ccieb.mjs`: lee
  `https://camaradecomerciobolivar.org/wp-json/wp/v2/posts?categories=163,7&per_page=8&_fields=id,date,link,title,excerpt`
  (163 = "CBO Capital de Oportunidades", 7 = "Eventos"), limpia HTML de
  titulos y extractos, escribe `public/data/expofaja/noticias.json`.
- **GitHub Action diaria** que ejecuta el script y, si hay cambios, abre o
  actualiza un PR con `gh pr create` (sin acciones de terceros). Luis
  mergea: ningun contenido externo llega a produccion sin revision.
- Si el WordPress falla, el JSON versionado sigue sirviendo (static-first).

### E4.3 — Mapaton "Ciudad Bolivar existe" (alto impacto, sin codigo)

El hueco que E1 deja a la vista (OSM ve 16 supermercados donde la CCIEB
declara 224 supermercados y tiendas) se cierra **mapeando**, no maquillando:

- Socios: CCIEB (convoca afiliados), UNEG y UDO (estudiantes),
  comunidad OSM Venezuela.
- **Primera edicion, la hace Luis:** agregar la sede de la CCIEB (Av. San
  Cristobal) a OpenStreetMap. Hoy no existe ahi; en cuanto exista, el
  script de E1 la toma y la iniciativa "Capital Estrategica" aparece en el
  mapa con fuente.
- Herramientas gratuitas: StreetComplete o Every Door en el telefono, iD en
  el navegador. Etiqueta de cambios: `#MapatonCBO`.
- Medicion: `npm run data:ciudad-bolivar` antes y despues -> "Ciudad Bolivar
  paso de N a M comercios en el mapa". Ese dato es de Orinoco y es
  publicable.
- Efecto fuera del proyecto: OSM alimenta muchas apps y mapas; lo que se
  mapea ahi existe en todos.
- Reglas: cada empresa decide si se mapea; nada de datos personales; solo
  lo que se ve en la calle o la empresa autoriza.

### E4.4 — Directorio de afiliados georreferenciado (requiere ADR)

Capa `afiliadosCcieb` con las empresas afiliadas que **den su
consentimiento**: nombre, rubro, direccion, contacto comercial.

- Fuente: la CCIEB, con fecha y alcance en `AUTORIZACIONES.md`.
- Toca la decision abierta "directorio de empresas publico"
  (`docs/NOTION.md` §3): **ADR-021 antes de escribir codigo**.
- Coordenadas: geocodificadas desde la direccion con fuente declarada, o
  marcadas `geom_precision: "direccion_aproximada"`. Nunca a ojo.

### E4.5 — Medicion de visitas (decision de Luis)

Para darle a la CCIEB un dato real para sus patrocinadores ("la agenda
digital tuvo N visitas, M personas abrieron el mapa").

- Opcion recomendada: Vercel Web Analytics (sin cookies), activado desde el
  panel de Vercel y su script propio, **sin paquete npm**.
- Requiere ADR (regla 7: es un script de terceros) y una linea en el aviso
  de privacidad del pie.

### E4.5-bis — Revisar la portada

`MODO_INICIAL = "ciudadBolivar"` (E1). Tras el evento, Luis decide si la
portada sigue en la ciudad o vuelve a la vista nacional. Una constante.

## E4.6 — Generalizar si hay mas eventos

Si la CCIEB repite: `/eventos/<slug>/` con el mismo codigo y una carpeta de
JSON por evento. No copiar `src/expofaja/`.

### E4.7 — Contenido para LinkedIn (Luis, sin codigo)

Caso de estudio para su motor de marca personal: el antes/despues de la
capa (capturas de `docs/capturas/e1-*`), la cifra del mapaton, el QR en el
evento y la alianza con la CCIEB. Mostrar logros, no el detalle tecnico.

## Prompt de arranque (Claude Code, por bloque)

```
Lee CLAUDE.md, docs/expofaja/README.md, 03-ADR-020-PROPUESTA.md y
E4-POST-EVENTO.md. Trabajamos el bloque E4.[n] en la rama
expofaja/e4-[n]-[descripcion]. Confirma en una frase el bloque y los
archivos. Si el bloque dice "requiere ADR", escribe primero el ADR como
propuesta y PARA.
```

## STOP GATE (por bloque)

- [ ] Telefono real, datos moviles, DevTools cerrado
- [ ] Sin dependencias nuevas; sin datos sin fuente; autorizaciones al dia
- [ ] PR revisado y mergeado por Luis
