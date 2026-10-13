/**
 * main.js — Entrada del micrositio /expofaja. Solo orquesta: carga los datos,
 * monta la vista y la mantiene al dia con el reloj.
 */

import "./expofaja.css";
import { MODO_DESARROLLO } from "../config.js";
import { idioma, t } from "../i18n/index.js";
import { cargarDatosEvento } from "./datos.js";
import { leerAhora } from "./agenda.js";
import { esEmbed, iniciarEmbed } from "./embed.js";
import { actualizarTiempo, montarVista, mostrarErrorCarga } from "./vista.js";

/** Instante actual: el reloj, o ?ahora= solo en desarrollo (RF-23/24). */
function ahora() {
  return leerAhora(location.search, MODO_DESARROLLO);
}

/** Llama a `fn` al empezar cada minuto del reloj y al volver a la pestana (RF-22). */
function cadaMinuto(fn) {
  const programar = () =>
    setTimeout(() => {
      fn();
      programar();
    }, 60000 - (Date.now() % 60000) + 100);
  programar();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) fn();
  });
}

async function arrancar() {
  const contenedor = document.getElementById("app");
  if (!contenedor) return;
  document.documentElement.lang = idioma();
  const embed = esEmbed(location.search);
  if (embed) iniciarEmbed(document, window);

  const cargando = document.createElement("p");
  cargando.className = "ef-cargando";
  cargando.setAttribute("role", "status");
  cargando.textContent = t("expofaja.cargando");
  contenedor.replaceChildren(cargando);

  let datos;
  try {
    datos = await cargarDatosEvento();
  } catch (error) {
    console.error(error);
    mostrarErrorCarga(contenedor, error);
    return;
  }
  for (const aviso of datos.avisos) console.warn(aviso);

  const pintar = () => montarVista(contenedor, datos, { embed, alCambiarIdioma: pintar, ahora: ahora() });
  pintar();
  cadaMinuto(() => actualizarTiempo(ahora()));
}

arrancar();
