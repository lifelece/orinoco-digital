#!/usr/bin/env node
/**
 * expofaja-og.mjs — Genera public/expofaja/og.png (1200x630) a partir de
 * docs/expofaja/og-plantilla.html con un navegador headless ya instalado
 * (Edge o Chrome). No es una dependencia del proyecto: si no hay navegador,
 * el script lo dice y sale con error. Ruta propia con OG_NAVEGADOR=<exe>.
 *
 * Uso: npm run og:expofaja
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLANTILLA = join(RAIZ, "docs", "expofaja", "og-plantilla.html");
const SALIDA = join(RAIZ, "public", "expofaja", "og.png");
const ANCHO = 1200;
const ALTO = 630;
const MAX_KB = 300; // spec 002, RNF-2

const CANDIDATOS = [
  process.env.OG_NAVEGADOR,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

/** Ancho y alto leidos de la cabecera IHDR de un PNG. */
function dimensionesPng(ruta) {
  const b = readFileSync(ruta);
  if (b.toString("ascii", 1, 4) !== "PNG") throw new Error(`${ruta} no es PNG`);
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20) };
}

const navegador = CANDIDATOS.find((ruta) => existsSync(ruta));
if (!navegador) {
  console.error("expofaja-og: no encontre Edge ni Chrome. Define OG_NAVEGADOR=<ruta al ejecutable>.");
  process.exit(1);
}

const r = spawnSync(
  navegador,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--allow-file-access-from-files",
    `--window-size=${ANCHO},${ALTO}`,
    `--screenshot=${SALIDA}`,
    pathToFileURL(PLANTILLA).href,
  ],
  { encoding: "utf8", timeout: 60000 }
);
if (r.status !== 0 && !existsSync(SALIDA)) {
  console.error(`expofaja-og: el navegador fallo (${r.status}).\n${r.stderr}`);
  process.exit(1);
}

const { ancho, alto } = dimensionesPng(SALIDA);
const kb = statSync(SALIDA).size / 1024;
console.log(`expofaja-og: ${SALIDA} ${ancho}x${alto}, ${kb.toFixed(1)} KB (navegador: ${navegador})`);
if (ancho !== ANCHO || alto !== ALTO) {
  console.error(`expofaja-og: dimensiones ${ancho}x${alto}, se esperaba ${ANCHO}x${ALTO}.`);
  process.exit(1);
}
if (kb > MAX_KB) {
  console.error(`expofaja-og: ${kb.toFixed(1)} KB supera ${MAX_KB} KB.`);
  process.exit(1);
}
