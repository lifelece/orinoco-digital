/**
 * Micrositio /expofaja: HTML (SEO, JSON-LD), cabeceras de vercel.json y
 * imagen OG. Spec 002, RF-66 a RF-72 y RNF-2.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";

const leer = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), "utf8");
const html = leer("expofaja/index.html");

test("titulo, descripcion, canonical y Open Graph del micrositio (RF-70, RF-71)", () => {
  assert.match(html, /<title>ExpoFaja Ciudad Bolívar 2026 — agenda, ponentes y mapa<\/title>/);
  assert.match(html, /<meta\s+name="description"[\s\S]*?15, 16 y 17 de octubre[\s\S]*?Jesús Soto/);
  assert.match(html, /rel="canonical" href="%SITIO_URL%\/expofaja\/"/);
  assert.match(html, /property="og:image" content="%SITIO_URL%\/expofaja\/og.png"/);
  assert.match(html, /property="og:url" content="%SITIO_URL%\/expofaja\/"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
});

test("JSON-LD schema.org/Event con fechas exactas y sin entradas a la venta (RF-72)", () => {
  const bloque = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(bloque, "falta el bloque JSON-LD");
  const evento = JSON.parse(bloque[1]);
  assert.equal(evento["@type"], "Event");
  assert.equal(evento.startDate, "2026-10-15T17:00-04:00");
  assert.equal(evento.endDate, "2026-10-17T20:00-04:00");
  assert.equal(evento.eventAttendanceMode, "https://schema.org/OfflineEventAttendanceMode");
  assert.equal(evento.eventStatus, "https://schema.org/EventScheduled");
  assert.equal(evento.location.name, "Museo de Arte Moderno Jesús Soto");
  assert.equal(evento.organizer.url, "https://camaradecomerciobolivar.org");
  assert.equal(evento.offers, undefined);
});

test("los marcadores del noscript siguen en el HTML (los usa data:expofaja)", () => {
  const ini = html.indexOf("<!-- agenda-noscript:inicio");
  const fin = html.indexOf("<!-- agenda-noscript:fin -->");
  assert.ok(ini > 0 && fin > ini);
});

test("vercel.json: sin redireccion de /expofaja; CSP solo en el micrositio; cache corta de su agenda (RF-66..68)", () => {
  const vercel = JSON.parse(leer("vercel.json"));
  const redirecciones = vercel.redirects ?? [];
  assert.equal(redirecciones.some((r) => r.source.startsWith("/expofaja")), false);

  const csp = (fuente) =>
    vercel.headers
      .find((h) => h.source === fuente)
      ?.headers.find((c) => c.key === "Content-Security-Policy")?.value;
  const esperada =
    "frame-ancestors 'self' https://camaradecomerciobolivar.org https://www.camaradecomerciobolivar.org";
  assert.equal(csp("/expofaja/(.*)"), esperada);
  assert.equal(csp("/expofaja"), esperada);
  assert.equal(csp("/(.*)"), undefined, "la CSP no debe aplicarse a todo el sitio");

  const cache = vercel.headers
    .find((h) => h.source === "/data/expofaja/(.*).json")
    ?.headers.find((c) => c.key === "Cache-Control")?.value;
  assert.equal(cache, "public, max-age=300, stale-while-revalidate=3600");
});

test("og.png mide 1200x630 y pesa <= 300 KB (RNF-2)", () => {
  const ruta = new URL("../public/expofaja/og.png", import.meta.url);
  const b = readFileSync(ruta);
  assert.equal(b.toString("ascii", 1, 4), "PNG");
  assert.equal(b.readUInt32BE(16), 1200);
  assert.equal(b.readUInt32BE(20), 630);
  assert.ok(statSync(ruta).size <= 300 * 1024);
});
