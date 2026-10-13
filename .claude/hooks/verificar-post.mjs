#!/usr/bin/env node
// Hook PostToolUse (Edit|Write) del proyecto.
// Tras editar algo en src/, corre el gate de modulos (solo map.js importa
// cesium; la interfaz no importa cesium ni hace fetch). Tras editar un
// diccionario de i18n, corre su test (mismas claves en ES y EN).
// Si falla: exit 2 y la salida por stderr, para que Claude lo arregle ya y no
// al final. Sin dependencias.

import { spawnSync } from "node:child_process";
import { relative, resolve, sep } from "node:path";

// De la salida TAP de node --test solo interesa que test fallo y su mensaje,
// no la pila: lo demas son tokens que Claude no necesita.
function resumir(texto) {
  const lineas = texto.trim().split("\n");
  if (!lineas.some((l) => l.startsWith("not ok"))) return lineas.slice(-25).join("\n");
  const utiles = [];
  let enError = false;
  for (const l of lineas) {
    if (l.startsWith("not ok")) utiles.push(l);
    else if (/^\s+error: /.test(l)) enError = true;
    else if (enError && /^\s+(code|name|stack|expected|actual|operator):/.test(l)) enError = false;
    if (enError && l.trim()) utiles.push(l);
  }
  return utiles.slice(0, 40).join("\n");
}

let datos = "";
process.stdin.on("data", (trozo) => (datos += trozo));
process.stdin.on("end", () => {
  let entrada;
  try {
    entrada = JSON.parse(datos);
  } catch {
    process.exit(0);
  }

  const ruta = entrada?.tool_input?.file_path;
  if (!ruta) process.exit(0);

  const raiz = process.env.CLAUDE_PROJECT_DIR || entrada.cwd || process.cwd();
  const rel = relative(raiz, resolve(raiz, ruta)).split(sep).join("/");

  const comprobaciones = [];
  if (/^src\/.+\.js$/.test(rel)) {
    comprobaciones.push(["scripts/verificar-modulos.mjs"]);
  }
  if (/^src\/i18n\/.+\.json$/.test(rel)) {
    comprobaciones.push(["--import", "./test/entorno.mjs", "--test", "test/i18n.test.mjs"]);
  }
  if (comprobaciones.length === 0) process.exit(0);

  for (const args of comprobaciones) {
    const r = spawnSync(process.execPath, args, { cwd: raiz, encoding: "utf8" });
    if (r.status !== 0) {
      const salida = resumir(`${r.stdout ?? ""}${r.stderr ?? ""}`);
      process.stderr.write(`Comprobacion fallida tras editar ${rel} (node ${args.join(" ")}):\n${salida}\n`);
      process.exit(2);
    }
  }
  process.exit(0);
});
