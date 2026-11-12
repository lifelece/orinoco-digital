# Solicitud de permiso de redistribución (borrador)

> Tarea T17 de la spec 004. **Borrador para que lo revise y lo envíe el autor del proyecto.** Nadie más lo envía.
> Hay dos destinatarios distintos, con dos mensajes: Transparencia Venezuela (asignaciones y tabla) y el autor de los polígonos. La capa solo se publica si responden los dos (pregunta 1 de la spec).
> Completar antes de enviar: `[contacto_tv]`, `[contacto_autor_poligonos]`, `[firma_luis]`, `[correo_de_contacto]`.

## Mensaje 1 — Transparencia Venezuela

**Para:** `[contacto_tv]`
**Asunto:** Permiso para mostrar el «Mapa del negocio petrolero 2026» en un mapa abierto, con atribución

Estimado equipo de Transparencia Venezuela:

Les escribo para pedirles permiso para reutilizar datos de su «Mapa del negocio petrolero en Venezuela 2026» (corte del 31/10/2026) en Orinoco Digital, un mapa 3D abierto y sin fines de lucro de la industria de hidrocarburos de Venezuela: https://orinoco-digital.vercel.app (código en https://github.com/lifelece/orinoco-digital).

**Qué quisiera usar**

- La asignación de cada bloque: operador en 2026, operador anterior, estatus, tipo de alianza, licencia OFAC registrada y municipios.
- Solo datos por bloque. No publicaría la tabla de registros de contratos: la ficha de cada bloque mostraría cuántos registros tiene y enlazaría a su página.

**Cómo lo usaría**

- Con atribución visible en la ficha de cada bloque, en la leyenda de la capa y en la página de fuentes: «Transparencia Venezuela, Mapa del negocio petrolero en Venezuela 2026», con enlace a https://transparenciave.org/mapapetrolero/ y la fecha de corte.
- Sin cambiar el contenido. Los únicos ajustes son de formato: nombres de campos, listas separadas y coordenadas redondeadas.
- Con la fecha de corte a la vista, para que nadie lea un dato viejo como actual. Cuando ustedes actualicen, actualizo o retiro la capa.
- Sin opinión: el mapa presenta hechos con su fuente.

**Lo que necesito saber**

1. Si autorizan esa reutilización y con qué licencia o condiciones (por ejemplo, CC BY 4.0, o atribución con un texto que ustedes indiquen).
2. Si puedo incluir el archivo de datos en el repositorio público del proyecto, o si prefieren que solo se muestre en el mapa.
3. Cómo quieren que se cite exactamente.

Hoy la capa está construida pero apagada: no se publica nada hasta tener su respuesta. Si prefieren que no se use, lo respeto y me limito a enlazar su mapa.

Para ser transparente sobre el método: preparé los datos a partir de la información que su página publica. Ese archivo está solo en mi equipo, no se ha compartido ni subido a ningún sitio.

Gracias por el trabajo que hacen y por su tiempo.

`[firma_luis]`
`[correo_de_contacto]`

## Mensaje 2 — Autor de los polígonos

**Para:** `[contacto_autor_poligonos]`
**Asunto:** Permiso para usar los polígonos de bloques petroleros en un mapa abierto, con atribución

Estimado profesor González:

Le escribo por los polígonos de los bloques de petróleo y gas de Venezuela que Transparencia Venezuela cita como base de su «Mapa del negocio petrolero en Venezuela 2026», y que, según esa fuente, provienen de su repositorio público.

Quisiera mostrarlos en Orinoco Digital, un mapa 3D abierto y sin fines de lucro de la industria de hidrocarburos de Venezuela (https://orinoco-digital.vercel.app; código en https://github.com/lifelece/orinoco-digital).

**Lo que necesito saber**

1. Si los polígonos son suyos y si autoriza su reutilización, y con qué licencia o condiciones.
2. Si puedo incluirlos en el repositorio público del proyecto o si prefiere que solo se muestren en el mapa.
3. Cómo quiere que se le cite, y si debo citar también a la institución de origen de los datos.

Los usaría sin modificar su trazado (solo redondeo de coordenadas para aligerar el archivo) y con atribución visible en la ficha de cada bloque y en la página de fuentes. Hoy la capa está apagada y no se publica nada hasta tener su respuesta. Si prefiere que no se usen, lo respeto.

Gracias por su tiempo.

`[firma_luis]`
`[correo_de_contacto]`

## Cuando lleguen las respuestas

- Guardar cada respuesta (fecha, remitente y condiciones) fuera del repositorio.
- Anotar en `docs/DATA_SOURCES.md` §19 la línea `Permiso de redistribucion: AAAA-MM-DD — alcance` y seguir la tarea T19 (activación).
- Si una de las dos partes no autoriza, la capa no se publica.
