/**
 * historia-campos.mjs — Extrae la historia REAL contenida en los datos.
 *
 * No inventa cronologia: solo agrega lo que GEM publica por campo
 * (ano de descubrimiento, inicio de produccion, operadora, propietarios) y lo
 * cruza con la extension medida de la Faja.
 *
 * Sirve de ancla factual para docs/investigacion/HISTORIA.md: cualquier cifra
 * de ese documento que venga de aqui es reproducible ejecutando este script.
 *
 * Uso: node scripts/analisis/historia-campos.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const campos = JSON.parse(
  readFileSync(join(RAIZ, "public", "data", "campos.geojson"), "utf8")
).features.map((f) => f.properties);

const FAJA = { oeste: -67.34, este: -62.08, sur: 7.88, norte: 9.37 };
const centro = (f) => {
  let c = f.geometry?.coordinates ?? [];
  let n = 0;
  while (Array.isArray(c[0]) && n < 5) {
    c = c[0];
    n += 1;
  }
  return c;
};

const geo = JSON.parse(
  readFileSync(join(RAIZ, "public", "data", "campos.geojson"), "utf8")
).features;

const enFaja = new Set(
  geo
    .filter((f) => {
      const [lng, lat] = centro(f);
      return (
        lng >= FAJA.oeste && lng <= FAJA.este && lat >= FAJA.sur && lat <= FAJA.norte
      );
    })
    .map((f) => f.properties.id)
);

const anio = (v) => {
  const n = Number.parseInt(String(v ?? "").slice(0, 4), 10);
  return Number.isFinite(n) && n > 1850 && n < 2100 ? n : null;
};

console.log("HISTORIA CONTENIDA EN LOS DATOS DE CAMPOS");
console.log("Fuente: Global Energy Monitor, GOGET marzo 2026\n");

// --- Descubrimientos por decada ---------------------------------------------

const conDescubrimiento = campos.filter((p) => anio(p.descubrimiento));
console.log(
  `Campos con ano de descubrimiento: ${conDescubrimiento.length} de ${campos.length}`
);

const decadas = new Map();
for (const p of conDescubrimiento) {
  const d = Math.floor(anio(p.descubrimiento) / 10) * 10;
  if (!decadas.has(d)) decadas.set(d, { total: 0, faja: 0 });
  decadas.get(d).total += 1;
  if (enFaja.has(p.id)) decadas.get(d).faja += 1;
}

console.log("\nDescubrimientos por decada (| = un campo):");
const orden = [...decadas.keys()].sort((a, b) => a - b);
for (const d of orden) {
  const { total, faja } = decadas.get(d);
  console.log(
    `  ${d}s  ${String(total).padStart(3)}  ${"|".repeat(total).padEnd(24)} ` +
      `(${faja} en la Faja)`
  );
}

const anios = conDescubrimiento.map((p) => anio(p.descubrimiento)).sort((a, b) => a - b);
console.log(`\n  el mas antiguo: ${anios[0]}`);
console.log(`  el mas reciente: ${anios[anios.length - 1]}`);
console.log(`  mediana: ${anios[Math.floor(anios.length / 2)]}`);

// --- Los mas antiguos, con nombre -------------------------------------------

console.log("\nLos 10 campos mas antiguos que siguen en el tracker:");
[...conDescubrimiento]
  .sort((a, b) => anio(a.descubrimiento) - anio(b.descubrimiento))
  .slice(0, 10)
  .forEach((p) => {
    const nombre = (p.nombre ?? "").replace(" (Venezuela)", "");
    console.log(
      `  ${anio(p.descubrimiento)}  ${nombre.slice(0, 40).padEnd(42)} ` +
        `${p.estado.padEnd(12)} ${enFaja.has(p.id) ? "Faja" : ""}`
    );
  });

// --- Operadoras --------------------------------------------------------------

console.log("\nOperadoras declaradas:");
const ops = new Map();
for (const p of campos) {
  const o = p.operadora ?? "(no publicada)";
  ops.set(o, (ops.get(o) ?? 0) + 1);
}
[...ops.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .forEach(([o, n]) => console.log(`  ${String(n).padStart(3)}  ${o}`));

// --- Estado actual -----------------------------------------------------------

console.log("\nEstado operativo:");
const est = new Map();
for (const p of campos) est.set(p.estado, (est.get(p.estado) ?? 0) + 1);
[...est.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([e, n]) =>
    console.log(`  ${String(n).padStart(3)}  ${e}  (${((n / campos.length) * 100).toFixed(0)}%)`)
  );

// --- Hidrocarburo ------------------------------------------------------------

console.log("\nTipo de hidrocarburo:");
const fl = new Map();
for (const p of campos) fl.set(p.fluido ?? "(sin dato)", (fl.get(p.fluido ?? "(sin dato)") ?? 0) + 1);
[...fl.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([f, n]) => console.log(`  ${String(n).padStart(3)}  ${f}`));

// --- Cobertura de cada campo del esquema ------------------------------------

console.log("\nCobertura de los campos del esquema:");
for (const clave of [
  "nombre",
  "fluido",
  "estado",
  "descubrimiento",
  "operadora",
  "propietarios",
  "cuenca",
  "inicio_produccion",
  "bloque",
]) {
  const n = campos.filter((p) => p[clave] != null && p[clave] !== "").length;
  const pct = Math.round((n / campos.length) * 100);
  console.log(
    `  ${clave.padEnd(20)} ${"#".repeat(Math.round(pct / 5)).padEnd(20, ".")} ${String(pct).padStart(3)}%`
  );
}

console.log(`\nCampos dentro de la caja de la Faja: ${enFaja.size} de ${campos.length}`);
