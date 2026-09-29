/**
 * controladorRender.js — Holds contados por referencia para el modo de
 * render continuo de Cesium (`scene.requestRenderMode`).
 *
 * Solo lo importa map.js: es el unico que toca `viewer.scene`. Este archivo
 * en si NO importa "cesium" — opera sobre el objeto `viewer` que recibe por
 * duck-typing (solo necesita `.scene.requestRenderMode` y
 * `.scene.requestRender()`), asi que se puede probar con node:test sin
 * Cesium instalado ni un canvas real. Ver docs/DECISIONS.md -> ADR-019.
 *
 * La idea —holds contados por id en vez de un booleano fijo— esta inspirada
 * en `src/renderGovernor.js` de bilawalsidhu/gods-eye-view (MIT); este
 * archivo es una reimplementacion propia, no una copia. Ver THIRD-PARTY.md.
 *
 * Por que hace falta: `requestRenderMode: true` (ya activo desde la Fase 0,
 * ver docs/PERFORMANCE_BUDGET.md) hace que Cesium solo redibuje ante input de
 * camara o carga de teselas. Pero CUALQUIER animacion por frame que este
 * codigo dispare por su cuenta —el vuelo de entrada, "Volar a la Faja", volar
 * a un activo desde el buscador— necesita `requestRenderMode = false`
 * mientras dura, o se ve a tirones (un frame por evento de camara, no uno por
 * frame de la animacion). Con un flag fijo, dos animaciones que se solapasen
 * (p.ej. tocar "Volar a la Faja" durante el vuelo de entrada) se pisarian: la
 * que termina primero reactivaria el modo reposo aunque la otra siga en
 * marcha, y el globo se "congelaria" a mitad de vuelo. Con holds por id eso
 * no puede pasar: el modo continuo dura mientras haya AL MENOS un hold activo,
 * sin importar cual ni cuantos.
 */

/** Ids activos que piden render continuo ahora mismo. */
const holds = new Set();

/**
 * Viewer instalado, o null. Solo se exige `.scene.requestRenderMode` (bool,
 * escribible) y `.scene.requestRender()` — el mismo contrato minimo que
 * `Cesium.Viewer` cumple, para no acoplar este modulo al SDK completo.
 * @type {{scene: {requestRenderMode: boolean, requestRender?: () => void}} | null}
 */
let viewerInstalado = null;

/**
 * Aplica el modo de render que corresponde al numero de holds activos.
 * Idempotente: si el modo ya es el correcto, no toca nada ni pide un frame de
 * mas.
 */
function aplicarModo() {
  if (!viewerInstalado) return;
  const continuo = holds.size > 0;
  const escena = viewerInstalado.scene;
  if (escena.requestRenderMode === !continuo) return;
  escena.requestRenderMode = !continuo;
  // Al volver a reposo, un ultimo frame: si el ultimo tick en modo continuo
  // dejo algo a medio interpolar, se pinta terminado en vez de quedarse el
  // penultimo fotograma congelado hasta el siguiente gesto de camara.
  if (!continuo) escena.requestRender?.();
}

/**
 * Instala el controlador sobre un viewer. Idempotente: llamarlo dos veces con
 * el mismo viewer no duplica nada.
 *
 * Los holds pedidos ANTES de instalar (p.ej. en pruebas, o si algun dia el
 * orden de arranque cambia) no se pierden: quedan en el Set y se aplican en
 * cuanto haya viewer.
 *
 * @param {Object} viewer — necesita `.scene.requestRenderMode` y, opcional,
 *   `.scene.requestRender()`. En produccion es el `Viewer` real de Cesium.
 */
export function instalarControladorRender(viewer) {
  if (!viewer?.scene) {
    throw new TypeError(
      "instalarControladorRender necesita un viewer con .scene"
    );
  }
  viewerInstalado = viewer;
  aplicarModo();
}

/**
 * Pide render continuo mientras dure una animacion. Idempotente por id: si ya
 * estaba pedido, no hace nada mas.
 *
 * Llamar donde EMPIEZA el trabajo por frame del dueno (se inicia el vuelo, se
 * engancha el listener de la escena).
 *
 * @param {string} id — nombre corto y estable: "vuelo-entrada",
 *   "volar-faja", "volar-activo"...
 */
export function pedirRenderContinuo(id) {
  if (!id) return;
  holds.add(id);
  aplicarModo();
}

/**
 * Libera un hold. Sin efecto si ese id no tenia uno pedido — dos capas que
 * liberan el mismo id (o un release sin su hold previo) no rompen nada.
 *
 * Llamar donde TERMINA el trabajo por frame del dueno (el vuelo completa o se
 * cancela, se desengancha el listener).
 *
 * @param {string} id
 */
export function liberarRenderContinuo(id) {
  if (!id) return;
  holds.delete(id);
  aplicarModo();
}

/**
 * Pide un unico frame extra para una mutacion puntual (un interruptor de
 * capa, un cambio de idioma) sin salir del modo reposo. En modo continuo es
 * un no-op barato (la escena ya se redibuja sola); solo tiene efecto real en
 * reposo. Reemplaza a los `viewer.scene.requestRender()` sueltos que ya
 * existian en map.js, con un nombre que dice para que es cada llamada.
 *
 * @param {string} [motivo] — solo para lectura humana en el codigo que llama.
 */
export function pedirRenderPuntual(motivo = "sin especificar") {
  void motivo;
  viewerInstalado?.scene.requestRender?.();
}

/**
 * Estado actual, para depurar o para tests de integracion.
 * @returns {{modo: "continuo" | "reposo", holds: string[]}}
 */
export function estadoControladorRender() {
  return { modo: holds.size > 0 ? "continuo" : "reposo", holds: [...holds].sort() };
}

/**
 * Desinstala el controlador y limpia los holds. Para tests, o para el dia que
 * el viewer se recree.
 * @param {Object} [viewer] — si se pasa, solo desinstala cuando coincide con
 *   el viewer instalado (evita que una llamada tardia de un viewer viejo
 *   pise al nuevo).
 */
export function desinstalarControladorRender(viewer) {
  if (viewer !== undefined && viewer !== viewerInstalado) return;
  viewerInstalado = null;
  holds.clear();
}

/** Test seam: resetea el modulo entre pruebas, sin pasar por un viewer real. */
export function _resetControladorRenderParaTest() {
  viewerInstalado = null;
  holds.clear();
}
