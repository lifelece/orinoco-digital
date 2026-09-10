import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tailwindcss from "@tailwindcss/vite";

// Setup oficial de CesiumJS para Vite.
// Fuente: https://github.com/CesiumGS/cesium-vite-example
// NO usamos vite-plugin-cesium: ese paquete esta discontinuado desde 2023.
// Ver docs/DECISIONS.md -> ADR-002.
const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumBaseUrl = "cesiumStatic";

/**
 * URL publica del sitio. Las etiquetas Open Graph exigen URL absoluta, y el
 * dominio no se conoce hasta desplegar. En Vercel se define VITE_SITIO_URL;
 * en local queda el valor de desarrollo, que no molesta a nadie.
 */
const sitioUrl = (
  process.env.VITE_SITIO_URL ?? "http://localhost:5173"
).replace(/\/$/, "");

export default defineConfig({
  define: {
    // Ruta base desde donde Cesium carga sus assets en runtime.
    CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`),
  },
  plugins: [
    tailwindcss(),
    {
      // Sustituye %SITIO_URL% en index.html por la URL real del despliegue.
      name: "inyectar-sitio-url",
      transformIndexHtml(html) {
        return html.replaceAll("%SITIO_URL%", sitioUrl);
      },
    },
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

    rollupOptions: {
      output: {
        /**
         * Cesium en su propio chunk.
         *
         * No reduce el peso total —Cesium pesa lo que pesa— pero separa dos
         * cosas que cambian a ritmos muy distintos: nuestro codigo se toca a
         * diario y Cesium tres veces al ano. Con un solo bundle, cada
         * despliegue obliga a redescargar 1,1 MB comprimidos; separados, quien
         * ya visito el sitio solo vuelve a bajar los pocos KB que cambiaron.
         *
         * En redes moviles venezolanas esa diferencia es la que importa.
         */
        manualChunks(id) {
          if (id.includes("node_modules/cesium")) return "cesium";
          return undefined;
        },
      },
    },
  },
});
