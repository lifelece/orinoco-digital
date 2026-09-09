/**
 * main.js — Punto de entrada. Solo orquesta: no contiene logica de dominio.
 */

import "./style.css";
import { iniciarMapa, dibujarCampos, alSeleccionarActivo } from "./map.js";
import {
  montarUI,
  mostrarError,
  mostrarPanelActivo,
  fijarCampos,
} from "./ui.js";
import { getCampos } from "./api.js";
import { tieneProcedencia, normalizarActivo } from "./data.js";
import { t } from "./i18n/index.js";

/**
 * Carga la capa upstream. Fase 2.
 *
 * El mapa arranca antes de que lleguen los datos: si la red falla, el usuario
 * se queda con un globo usable y un aviso, no con una pantalla en blanco.
 */
async function cargarCampos() {
  try {
    const coleccion = await getCampos();

    // Regla del proyecto: un activo sin fuente no se dibuja.
    const publicables = {
      type: "FeatureCollection",
      features: coleccion.features.filter((f) =>
        tieneProcedencia(normalizarActivo(f.properties))
      ),
    };

    const descartados =
      coleccion.features.length - publicables.features.length;
    if (descartados > 0) {
      console.warn(`${descartados} campos sin fuente: no se dibujan.`);
    }

    dibujarCampos(publicables);
    fijarCampos(publicables);
  } catch (error) {
    console.error(error);
    mostrarError(t("error.cargaDatos"));
  }
}

function arrancar() {
  try {
    iniciarMapa();
    montarUI();
    alSeleccionarActivo(mostrarPanelActivo);
    cargarCampos();
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
