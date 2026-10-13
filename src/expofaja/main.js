/**
 * main.js — Entrada del micrositio /expofaja. Solo orquesta.
 */

import "./expofaja.css";
import { cargarAgenda } from "./datos.js";
import { montarVista } from "./vista.js";

/** Arranque: monta la vista; la agenda se conectara en una tarea posterior. */
function arrancar() {
  const contenedor = document.getElementById("app");
  if (!contenedor) return;
  montarVista(contenedor);
  void cargarAgenda;
}

arrancar();
