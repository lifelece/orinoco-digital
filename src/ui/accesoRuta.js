/**
 * ui/accesoRuta.js — Acceso "Ruta de aprendizaje" (chunk inicial, minimo).
 * Spec 003, plan §3.6, RF-81 y RF-127. No importa recorrido.js: el panel viaja
 * en un chunk diferido y se registra aqui con fijarRepintadoPanel.
 */

const BOTON =
  "pointer-events-auto inline-flex min-h-11 items-center justify-center self-start rounded-lg border border-trazo " +
  "bg-shell/90 px-3 text-center text-xs font-medium leading-tight text-hi shadow-lg shadow-black/30 " +
  "backdrop-blur transition hover:bg-white/10 sm:min-h-9 sm:text-[13px]";

/* Sin importar i18n: ui.js pasa `t` al registrar, y asi recorrido.js se prueba en Node. */
let traducir = null;
let alEntrar = null;
let oculto = false;
let repintarPanel = null;

/** Callback del boton (RF-81) y la `t` de i18n. Repinta para que el acceso aparezca. */
export function registrarAccesoRuta(fn, t) {
  alEntrar = fn ?? null;
  traducir = t ?? null;
  repintarRuta();
}

/** Mientras hay recorrido el acceso no se ofrece (RF-127). */
export function ocultarAccesoRuta(valor) {
  oculto = Boolean(valor);
  repintarRuta();
}

/** Lo registra recorrido.js al montar; null al desmontar. */
export function fijarRepintadoPanel(fn) {
  repintarPanel = fn ?? null;
}

/** La llama montarUI(): las ranuras se recrean al cambiar de idioma. */
export function repintarRuta() {
  const ranura = document.getElementById("ranura-ruta-acceso");
  ranura?.replaceChildren();
  if (ranura && alEntrar && traducir && !oculto) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.id = "btn-ruta-acceso";
    boton.className = BOTON;
    boton.textContent = traducir("ruta.acceso");
    boton.addEventListener("click", () => alEntrar?.());
    ranura.append(boton);
  }
  repintarPanel?.();
}
