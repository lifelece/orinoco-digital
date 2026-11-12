#!/usr/bin/env node
/**
 * validar-bloques.mjs — Valida la capa "Bloques y contratos 2026" publicada (spec 004, T08, RF-158).
 *
 * Uso: node scripts/validar-bloques.mjs [directorio]   (por defecto public/data/)
 * - Ninguno de los dos archivos existe: "capa no publicada", codigo 0 (es el estado normal
 *   mientras no haya permiso de redistribucion, ADR-024).
 * - Existe solo uno, o alguno no es JSON o no pasa el validador: codigo 1 con cada error.
 * Sin dependencias; usa el mismo validador puro que el conversor y los tests.
 */

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { validarBloques, validarDivisiones } from "../src/bloques/validar.js";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = process.argv[2] ? resolve(process.argv[2]) : join(RAIZ, "public", "data");
const ARCHIVOS = [
  ["bloques-2026.geojson", validarBloques],
  ["faja-divisiones-2026.geojson", validarDivisiones],
];

const presentes = ARCHIVOS.filter(([n]) => existsSync(join(dir, n)));
if (presentes.length === 0) {
  console.log("validar-bloques: capa no publicada (no hay archivos de la capa en " + dir + "); nada que validar.");
} else {
  const errores = [];
  for (const [nombre] of ARCHIVOS) {
    if (!existsSync(join(dir, nombre))) errores.push(`${nombre}: falta (la capa se publica con los dos archivos)`);
  }
  for (const [nombre, validar] of presentes) {
    let fc;
    try {
      fc = JSON.parse(readFileSync(join(dir, nombre), "utf8"));
    } catch (e) {
      errores.push(`${nombre}: no es JSON valido (${e.message})`);
      continue;
    }
    const r = validar(fc);
    for (const a of r.avisos) console.warn(`AVISO ${nombre}: ${a}`);
    for (const e of r.errores) errores.push(`${nombre}: ${e}`);
    if (r.errores.length === 0) console.log(`validar-bloques: ${nombre} OK (${fc.features.length} entidades)`);
  }
  if (errores.length > 0) {
    console.error(`validar-bloques: ${errores.length} error(es):`);
    for (const e of errores) console.error(`  ERROR ${e}`);
    process.exitCode = 1;
  }
}
