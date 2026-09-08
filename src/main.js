/**
 * main.js — Punto de entrada. Solo orquesta: no contiene logica de dominio.
 */

import "./style.css";
import { iniciarMapa } from "./map.js";
import { montarUI, mostrarError } from "./ui.js";
import { t } from "./i18n/index.js";

function arrancar() {
  try {
    iniciarMapa();
    montarUI();
  } catch (error) {
    console.error(error);
    mostrarError(
      error.message?.includes("VITE_CESIUM_TOKEN")
        ? t("error.tokenFaltante")
        : String(error.message ?? error)
    );
  }
}

arrancar();
