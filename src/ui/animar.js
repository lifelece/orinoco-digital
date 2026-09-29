/**
 * ui/animar.js — Animaciones de interfaz con CSS + el minimo de JS necesario
 * (adelanto de M3, ver docs/DECISIONS.md -> ADR-018).
 *
 * Sin GSAP ni ninguna libreria: es exactamente lo que C4 de docs/NOTION.md
 * pide para M3. Lo unico que anima por JS es el countUp de los contadores
 * (interpolar un numero frame a frame no se puede hacer solo con CSS sin
 * @property + registerProperty, que no todos los navegadores del publico
 * objetivo soportan). El resto —la entrada escalonada de las filas y el
 * "dibujado" de las lineas— es CSS puro en style.css, y por eso hereda gratis
 * la regla `prefers-reduced-motion` que ya vive ahi.
 *
 * Mismo contrato que ui.js: no importa "cesium" ni hace fetch.
 */

/**
 * Si el sistema pide menos movimiento. Se comprueba en cada llamada (no se
 * cachea) porque el usuario puede cambiarlo sin recargar la pagina.
 * @returns {boolean}
 */
export function prefiereMovimientoReducido() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // window/matchMedia pueden faltar (p.ej. al importar este modulo en un
    // test de Node, sin DOM). Sin movimiento reducido detectable, no se
    // fuerza: el llamador decide su propio valor por defecto.
    return false;
  }
}

/**
 * Progreso 0..1 con una curva de salida suave (easeOutCubic): arranca rapido
 * y frena al llegar, en vez de una velocidad constante que se nota mecanica.
 * Misma familia de curva que el "ease-out" de los tokens de ADR-014.
 *
 * Funcion pura, sin DOM: se puede probar sin dependencias (ADR-016).
 *
 * @param {number} progreso — 0..1
 * @returns {number} 0..1
 */
export function easeSalida(progreso) {
  const p = Math.min(1, Math.max(0, progreso));
  return 1 - (1 - p) ** 3;
}

/**
 * Valor entero de un countUp en un instante dado, entre 0 y `hasta`.
 * Funcion pura: nada de DOM ni de tiempo real, para poder probarla igual que
 * `hidrocarburoDe` en data.js.
 *
 * @param {number} hasta — valor final (105, 371, 72, 43...)
 * @param {number} progreso — 0..1, tiempo transcurrido / duracion total
 * @returns {number}
 */
export function valorCountUp(hasta, progreso) {
  if (!Number.isFinite(hasta) || hasta <= 0) return 0;
  return Math.round(hasta * easeSalida(progreso));
}

/** @type {Set<string>} claves de contador que ya hicieron su countUp una vez. */
const yaContados = new Set();

/**
 * Anima de 0 a su valor final los nodos `[data-contador]` de un contenedor,
 * una sola vez por clave (`data-contador`). Es lo que hace que "105 campos"
 * cuente hacia arriba solo AL CARGAR los datos: si el usuario despues marca o
 * desmarca un interruptor y la fila se repinta, el numero ya aparece hecho —
 * el countUp es una bienvenida al dato, no un tic que se repite en cada click.
 *
 * Con `prefers-reduced-motion` no anima nada: el numero final, que ya viene
 * escrito en el HTML, se queda como esta.
 *
 * @param {ParentNode} contenedor
 * @param {(valor: number) => string} formatear — numero() de ui.js, con los
 *   separadores del idioma activo
 * @param {number} [duracionMs=600]
 */
export function activarContadores(contenedor, formatear, duracionMs = 600) {
  const nodos = contenedor.querySelectorAll("[data-contador]");
  if (!nodos.length) return;

  const reducido = prefiereMovimientoReducido();

  for (const nodo of nodos) {
    const clave = nodo.dataset.contador;
    const hasta = Number(nodo.dataset.valor);

    if (yaContados.has(clave) || reducido || !Number.isFinite(hasta)) {
      yaContados.add(clave);
      continue; // El innerHTML ya trae escrito el valor final: no se toca.
    }
    yaContados.add(clave);

    nodo.textContent = formatear(0);
    const inicio = performance.now();
    const paso = (ahora) => {
      const progreso = Math.min(1, (ahora - inicio) / duracionMs);
      nodo.textContent = formatear(valorCountUp(hasta, progreso));
      if (progreso < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
}

/**
 * Clase y retraso en linea para la entrada escalonada (fadeUp) de una fila
 * del panel de capas. Solo se usa la primera vez que el panel se monta: en
 * los repintados posteriores (marcar/desmarcar un interruptor) la fila ya
 * esta ahi, y repetir la entrada en cada click seria ruido, no bienvenida.
 *
 * Funcion pura: se puede probar sin DOM.
 *
 * @param {boolean} animar
 * @param {number} indice — orden de la fila, para escalonar el retraso
 * @param {number} [pasoMs=30] — milisegundos de retraso entre fila y fila
 * @returns {{clase: string, estilo: string}}
 */
export function entradaFila(animar, indice, pasoMs = 30) {
  if (!animar) return { clase: "", estilo: "" };
  return {
    clase: "animate-fila-entra",
    estilo: `animation-delay:${Math.max(0, indice) * pasoMs}ms`,
  };
}

/**
 * Clase para el "dibujado" (drawLine) de una muestra de linea de la leyenda.
 * Como con `entradaFila`, solo se aplica en el primer montaje.
 *
 * @param {boolean} animar
 * @returns {string}
 */
export function claseDibujarLinea(animar) {
  return animar ? "animate-linea-dibujar" : "";
}
