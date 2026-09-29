#!/usr/bin/env node
/**
 * verificar-modulos.mjs — Gate de arquitectura sin dependencias.
 *
 * Automatiza dos reglas de CLAUDE.md ("Arquitectura modular") que hasta ahora
 * solo se vigilaban por revision humana:
 *
 *   1. "map.js — Unico modulo que importa 'cesium'." La unica excepcion es
 *      src/controladorRender.js: map.js es el unico que lo importa a EL, pero
 *      el propio archivo no importa "cesium" (opera por duck-typing sobre el
 *      viewer que recibe — ver docs/DECISIONS.md -> ADR-019), asi que en la
 *      practica no hace falta ninguna excepcion en la regla de abajo: se
 *      documenta aqui por si el dia de manana deja de cumplirse.
 *   2. "ui.js — No importa 'cesium', no hace 'fetch'." Extendido a todo
 *      src/ui/**, que es donde vive el resto de la interfaz desde ADR-014.
 *
 * Por que como gate y no solo como regla escrita: ADR-017 (dividir ui.js en
 * src/ui/) cita un error real que ya paso por confiar en la lectura humana —
 * docs/PROCESO.md, error 6: un simbolo que "parecia" importado, dado por
 * bueno porque un grep encontraba la cadena sin distinguir import de uso.
 * Repartir la interfaz en mas archivos multiplica los sitios donde alguien
 * (humano o IA) puede copiar un import de mas sin darse cuenta.
 *
 * Inspirado en la IDEA de scripts/check-import-directions.mjs de
 * bilawalsidhu/gods-eye-view (MIT) — no en su codigo, que es mucho mas
 * elaborado (analiza direcciones de import entre server/portable/renderer).
 * Esta version es la minima que Orinoco necesita hoy: dos reglas, sin
 * dependencias, ~80 lineas. Ver THIRD-PARTY.md y docs/DECISIONS.md -> ADR-019.
 *
 * Sin dependencias (regla 7 de CLAUDE.md): solo node:fs, node:path y
 * node:url. Uso: `node scripts/verificar-modulos.mjs`, o `npm test` (ya lo
 * incluye) o `npm run verificar:modulos` por separado.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join, relative } from "node:path";

const RAIZ_SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

/** Archivos que SI pueden importar "cesium". Ruta relativa a src/, con "/". */
const PERMITE_CESIUM = new Set(["map.js"]);

/**
 * Import de "cesium" o "cesium/subruta", estatico o dinamico:
 *   import X from "cesium";           import "cesium/Build/.../x.css";
 *   import { A, B } from 'cesium';    await import("cesium");
 * No es un parser real (no hace falta uno para dos reglas de dependencia
 * cero): basta con "la palabra import seguida, antes del ; o salto de linea,
 * de una cadena entre comillas que empieza por cesium".
 */
const RE_IMPORT_CESIUM = /\bimport\b[^;\n]*["']cesium(?:\/[^"']*)?["']/;

/** Llamada a fetch(. La interfaz no hace red (CLAUDE.md, fila de ui.js). */
const RE_FETCH = /\bfetch\s*\(/;

/**
 * Todos los .js bajo un directorio, recursivamente.
 * @param {string} dir
 * @returns {string[]} rutas absolutas
 */
function listarJs(dir) {
  const salida = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    const info = statSync(ruta);
    if (info.isDirectory()) salida.push(...listarJs(ruta));
    else if (extname(nombre) === ".js") salida.push(ruta);
  }
  return salida;
}

/** Ruta relativa a src/, siempre con "/" (para comparar igual en Windows). */
function rutaRelativa(rutaAbsoluta) {
  return relative(RAIZ_SRC, rutaAbsoluta).split("\\").join("/");
}

function verificar() {
  const archivos = listarJs(RAIZ_SRC);
  const errores = [];

  for (const rutaAbsoluta of archivos) {
    const rel = rutaRelativa(rutaAbsoluta);
    const contenido = readFileSync(rutaAbsoluta, "utf8");

    if (RE_IMPORT_CESIUM.test(contenido) && !PERMITE_CESIUM.has(rel)) {
      errores.push(
        `src/${rel}: importa "cesium". Solo src/map.js puede ` +
          `(CLAUDE.md, tabla "Arquitectura modular").`
      );
    }

    const esInterfaz = rel === "ui.js" || rel.startsWith("ui/");
    if (esInterfaz && RE_FETCH.test(contenido)) {
      errores.push(
        `src/${rel}: usa fetch(. La interfaz no hace red ` +
          `(CLAUDE.md: "ui.js ... no hace fetch").`
      );
    }
  }

  if (errores.length) {
    console.error(`verificar-modulos: ${errores.length} violacion(es):\n`);
    for (const error of errores) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `verificar-modulos: ${archivos.length} archivo(s) de src/ revisados, sin violaciones.`
  );
}

verificar();
