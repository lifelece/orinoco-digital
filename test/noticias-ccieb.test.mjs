/**
 * scripts/noticias-ccieb.mjs (E4.2): limpieza de HTML y validacion de enlaces
 * con fixtures con la forma de /wp-json/wp/v2/posts. Sin red.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  limpiarHtml,
  esEnlaceCcieb,
  normalizarPosts,
  mismasNoticias,
} from "../scripts/noticias-ccieb.mjs";
import { validarNoticias } from "../src/expofaja/datos.js";

const URL_OK = "https://camaradecomerciobolivar.org/2026/10/12/una-nota/";

const post = (cambios = {}) => ({
  id: 43134,
  date: "2026-10-12T09:15:00",
  link: URL_OK,
  title: { rendered: "Bolsa de Empleo &#8211; Expo&nbsp;Faja &amp; m&aacute;s" },
  excerpt: { rendered: "<p>Primer <strong>p&aacute;rrafo</strong>&hellip;</p>\n<p>Segundo</p>" },
  ...cambios,
});

test("limpiarHtml quita etiquetas y decodifica entidades numericas y con nombre", () => {
  assert.equal(limpiarHtml("<p>Hola &#8211; <b>mundo</b> &amp; &#x41;</p>"), "Hola – mundo & A");
  assert.equal(limpiarHtml("a&nbsp;&nbsp;b\n\n c"), "a b c");
});

test("limpiarHtml no ejecuta ni conserva scripts, y tolera entradas que no son texto", () => {
  assert.equal(limpiarHtml("x<script>alert(1)</script>y"), "x y");
  assert.equal(limpiarHtml(undefined), "");
  assert.equal(limpiarHtml(null), "");
});

test("limpiarHtml deja intacta una entidad desconocida en vez de inventarla", () => {
  assert.equal(limpiarHtml("&inventada;"), "&inventada;");
});

test("esEnlaceCcieb acepta solo https del dominio de la Camara", () => {
  assert.equal(esEnlaceCcieb(URL_OK), true);
  assert.equal(esEnlaceCcieb("http://camaradecomerciobolivar.org/x"), false);
  assert.equal(esEnlaceCcieb("https://camaradecomerciobolivar.org.malo.com/x"), false);
  assert.equal(esEnlaceCcieb("https://otro.org/x"), false);
  assert.equal(esEnlaceCcieb("javascript:alert(1)"), false);
  assert.equal(esEnlaceCcieb(undefined), false);
});

test("normalizarPosts produce la forma que valida el micrositio", () => {
  const { items, descartados } = normalizarPosts([post()]);
  assert.deepEqual(descartados, []);
  assert.equal(items[0].titulo, "Bolsa de Empleo – Expo Faja & más");
  assert.equal(items[0].fecha, "2026-10-12");
  assert.equal(items[0].extracto, "Primer párrafo… Segundo");
  assert.deepEqual(validarNoticias({ items }), []);
});

test("normalizarPosts descarta enlaces ajenos y registros incompletos, y lo informa", () => {
  const { items, descartados } = normalizarPosts([
    post({ id: 1, link: "https://evil.example/x" }),
    post({ id: 2, title: { rendered: "  " } }),
    post({ id: 3, date: "ayer" }),
    post({ id: "4" }),
    post({ id: 5 }),
  ]);
  assert.deepEqual(items.map((n) => n.id), [5]);
  assert.equal(descartados.length, 4);
});

test("normalizarPosts con una respuesta que no es lista devuelve vacio, no lanza", () => {
  assert.equal(normalizarPosts({ code: "rest_no_route" }).items.length, 0);
});

test("un extracto largo se recorta sin partir palabras", () => {
  const largo = "palabra ".repeat(100);
  const { items } = normalizarPosts([post({ excerpt: { rendered: `<p>${largo}</p>` } })]);
  assert.ok(items[0].extracto.length <= 221);
  assert.match(items[0].extracto, /palabra…$/);
});

test("mismasNoticias ignora el extracto y detecta una noticia nueva", () => {
  const a = normalizarPosts([post()]).items;
  const sinExtracto = a.map(({ extracto, ...resto }) => resto);
  assert.equal(mismasNoticias(a, sinExtracto), true);
  assert.equal(mismasNoticias(a, normalizarPosts([post({ id: 99 })]).items), false);
});
