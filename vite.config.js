import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";

// Setup oficial de CesiumJS para Vite.
// Fuente: https://github.com/CesiumGS/cesium-vite-example
// NO usamos vite-plugin-cesium: ese paquete esta discontinuado desde 2023.
// Ver docs/DECISIONS.md -> ADR-002.
const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "cesiumStatic";

export default defineConfig({
  define: {
    // Ruta base desde donde Cesium carga sus assets en runtime.
    CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`),
  },
  plugins: [
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl },
      ],
    }),
  ],
  server: {
    // Permite abrir el globo desde el telefono en la misma red (verificacion obligatoria).
    host: true,
  },
  build: {
    // Presupuesto de rendimiento: avisar si un chunk se pasa de 1.5 MB.
    // Cesium es grande por naturaleza; el aviso existe para detectar NUESTRO codigo creciendo.
    chunkSizeWarningLimit: 1500,
  },
});
