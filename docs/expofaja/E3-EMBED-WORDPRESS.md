# E3 — Entregar el micrositio a la web de la CCIEB (WordPress)

> **Decision:** ADR-020 §6.
> **Gate de entrada:** E2 en produccion; autorizacion de E0; contacto del
> administrador del WordPress.
> **Gate de salida:** el embed se ve en `camaradecomerciobolivar.org/expofaja/`
> desde un telefono real.

## Lo que se sabe del sitio de la CCIEB (revisado el 2026-10-12)

| Dato | Valor | Consecuencia |
|---|---|---|
| CMS | WordPress 7.1.3, tema Astra | — |
| Constructor | Elementor 4.3.3 | Tiene el widget **HTML**: se pega el codigo sin plugin |
| Servidor y cache | LiteSpeed + SpeedyCache | Tras pegar el codigo hay que **purgar la cache** o no se ve |
| Consentimiento | CookieAdmin Pro | El embed no pone cookies: no hay que declararlo |
| Pagina del evento | `/expofaja/` (Elementor). Anclas: `#eventofaja`, `#porquebolivarfaja`, `#patrociniofaja`, `#brochurefaja`, `#contactofaja`, `#formregexpofaja2026` | **No tiene agenda ni ponentes**: el embed llena ese hueco |
| API publica | `/wp-json/wp/v2/posts` con CORS abierto a lectura | E4 lee sus noticias en el build |
| Cabeceras | Sin `X-Frame-Options` ni CSP restrictiva | El iframe hacia fuera funciona; nuestra cabecera decide quien nos inserta |

## Opciones (decision tomada)

| Opcion | Esfuerzo CCIEB | Riesgo para su sitio | Mantenimiento | Decision |
|---|---|---|---|---|
| **A. Iframe de `/expofaja/?embed=1` en un widget HTML de Elementor** | 5 minutos | Nulo (no ejecuta nuestro codigo en su pagina; el script opcional solo ajusta la altura) | Cero: cada cambio en el repo se ve solo | **Ahora** |
| **B. Boton + QR "Ver agenda y mapa"** enlazando a `/expofaja` | 2 minutos | Nulo | Cero | **Ahora, como complemento** (menu "Programa", Instagram, pantallas LED del evento) |
| C. Subdominio `expofaja.camaradecomerciobolivar.org` (CNAME a Vercel) | Acceso a su DNS | Bajo | Anadir dominio a Vercel y al token de Cesium | Si lo piden despues del evento |
| D. Widget JS / Web Component dentro de su pagina | Bajo | Medio: codigo nuestro corriendo en su sitio | Alto | Descartada |
| E. HTML estatico subido a su WordPress | Medio | Bajo | Alto: dos fuentes de verdad | Descartada |

## Codigo para el administrador (opcion A)

Pegar en un widget **HTML** de Elementor, en una seccion nueva con el ID CSS
`programafaja`, debajo de "Sobre el evento":

```html
<div style="max-width:1200px;margin:0 auto;">
  <iframe
    id="orinoco-expofaja"
    src="https://orinoco-digital.vercel.app/expofaja/?embed=1"
    title="ExpoFaja Ciudad Bolivar 2026: agenda, ponentes y mapa de Ciudad Bolivar"
    loading="lazy"
    referrerpolicy="strict-origin-when-cross-origin"
    style="width:100%;height:1800px;border:0;border-radius:12px;display:block;">
  </iframe>
</div>
<script>
  // Ajusta la altura del iframe a su contenido. Solo acepta mensajes de
  // orinoco-digital.vercel.app.
  window.addEventListener("message", function (e) {
    if (e.origin !== "https://orinoco-digital.vercel.app") return;
    if (!e.data || e.data.tipo !== "expofaja:altura") return;
    var f = document.getElementById("orinoco-expofaja");
    if (f) f.style.height = Math.ceil(e.data.altura) + "px";
  });
</script>
```

Si su configuracion no permite `<script>` en el widget, funciona igual sin
el: el iframe queda con altura fija de 1800 px.

## Pasos para el administrador (para enviarle tal cual)

1. Entrar a WordPress -> Paginas -> "Expofaja" -> **Editar con Elementor**.
2. Anadir una seccion debajo de "Sobre el evento". En **Avanzado -> ID CSS**
   escribir `programafaja`.
3. Arrastrar el widget **HTML** a la seccion y pegar el codigo de arriba.
4. **Actualizar**.
5. En el menu de la pagina, cambiar el enlace de "Programa" a
   `#programafaja`.
6. Purgar la cache (LiteSpeed / SpeedyCache) y abrir la pagina desde el
   telefono.

## Lo que hace Claude Code en esta etapa

| Tarea | Archivo |
|---|---|
| Confirmar que `vercel.json` sirve `frame-ancestors 'self' https://camaradecomerciobolivar.org https://www.camaradecomerciobolivar.org` en `/expofaja/(.*)` y **no** en el resto | `vercel.json` |
| `postMessage` con origen destino de la CCIEB, nunca `"*"` | `src/expofaja/vista.js` |
| En modo embed: enlaces externos con `target="_top"` para que el salto al mapa 3D (`/?modo=ciudadBolivar`) no quede atrapado en el iframe | `src/expofaja/vista.js` |
| Pagina de prueba local que simula el WordPress (HTML con el snippet) | `docs/expofaja/prueba-embed.html` |
| Documento de entrega para la CCIEB (este archivo, seccion "Pasos") convertido en PDF de 1 pagina | fuera del repo |

## Prompt de arranque (Claude Code)

```
Lee docs/expofaja/03-ADR-020-PROPUESTA.md (§6) y E3-EMBED-WORDPRESS.md.
Rama: expofaja/e3-embed. Verifica las cabeceras con `curl -sI` contra la
URL de vista previa: frame-ancestors en /expofaja/ y NO en /. Revisa que el
modo ?embed=1 envie la altura solo al origen de la CCIEB y que los enlaces
salgan con target="_top". Crea docs/expofaja/prueba-embed.html con el
snippet exacto de este archivo apuntando a la vista previa. PARA y
muestrame una captura del embed en esa pagina de prueba en 390 px de ancho.
```

## STOP GATE

- [ ] `prueba-embed.html` muestra el micrositio sin doble scroll en 390 px
- [ ] Desde otro dominio (no CCIEB, no Vercel) el iframe **no** carga
      (prueba de `frame-ancestors`)
- [ ] El administrador recibio los pasos y el codigo
- [ ] Visto en `camaradecomerciobolivar.org/expofaja/` desde un telefono real
