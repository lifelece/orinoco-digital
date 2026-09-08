# Como contribuir

Gracias por el interes. Este proyecto acepta dos tipos de aporte, y el segundo
vale mas que el primero.

## 1. Correcciones de datos (lo mas valioso)

Si un pozo esta mal ubicado, una refineria cerro, una cifra cambio o una fuente
quedo obsoleta: **abre un issue o un PR**.

Requisito unico e innegociable: **la correccion viene con fuente**.

Un buen issue de datos incluye:

- Que registro esta mal (su `id`).
- Que dice ahora y que deberia decir.
- **La fuente** — enlace, documento o dataset, con su fecha.
- Si son coordenadas: en que CRS estan. Si no lo sabes, dilo; es mejor que
  suponer.

Un aporte sin fuente no se puede fusionar, por bienintencionado que sea. La
credibilidad del proyecto es literalmente su unico activo.

## 2. Codigo

### Antes de escribir

Lee [CLAUDE.md](CLAUDE.md) y [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Hay
restricciones duras que parecen arbitrarias y no lo son:

- `map.js` es el unico modulo que importa `cesium`.
- `ui.js` no importa `cesium` ni hace `fetch`.
- `data.js` no toca red, DOM ni Cesium.
- `api.js` devuelve **siempre** una `FeatureCollection`.
- Sin frameworks (React, Vue, Svelte).
- **Sin dependencias nuevas** sin discutirlas antes en un issue.

Si tu cambio necesita romper alguna de estas, abre un issue primero. Puede que
tengas razon — pero entonces se documenta como ADR en
[docs/DECISIONS.md](docs/DECISIONS.md).

### Estilo

Ver [docs/CONVENTIONS.md](docs/CONVENTIONS.md). En resumen: espanol sin tildes
en identificadores, ES6 modules, comillas dobles, JSDoc en todo lo exportado, y
todo texto visible por `t(clave)`.

### Verificacion

Antes de abrir el PR:

1. `npm run build` pasa.
2. Funciona en escritorio.
3. Funciona **en un telefono real**, con **DevTools cerrado**.
4. La consola esta limpia.

El punto 3 no es una formalidad. El publico de este proyecto esta en redes
moviles venezolanas.

## Firma DCO — obligatoria

Todos los commits se firman:

```bash
git commit -s -m "fix(datos): corregir ubicacion del pozo POZO-JUN-004"
```

El `-s` anade `Signed-off-by:` y certifica que tienes derecho a aportar ese
contenido. Es el [Developer Certificate of Origin](https://developercertificate.org/).

Usamos DCO en vez de un CLA porque un proyecto en solitario no puede sostener la
friccion legal de un CLA. Ver ADR-009 en [docs/DECISIONS.md](docs/DECISIONS.md).

Configuralo una vez y olvidate:

```bash
git config user.name "Tu Nombre"
git config user.email "tu@email.com"
```

## Licencias de lo que aportas

- **Codigo** que aportas queda bajo Apache-2.0.
- **Datos originales** que aportes quedan bajo CC BY 4.0.
- **Datos de terceros**: no los aportes sin verificar que su licencia lo
  permite, e indica cual es. Ojo especial con OpenStreetMap: es ODbL y es
  share-alike, por eso su capa se mantiene **separada**.

## Que NO aportar

- Informacion propietaria o filtrada de PDVSA o de cualquier empresa. Riesgo
  legal, de credibilidad y personal. **Se rechaza sin excepcion.**
- Contenido con carga politica. El proyecto describe la industria con datos,
  sin tomar bando.
- Datos sin fuente.
- Dependencias nuevas sin discusion previa.

## Moderacion

Todo entra por Pull Request y lo revisa el mantenedor. No es burocracia: es la
defensa contra coordenadas falsas y propaganda, y viene gratis con el flujo de
GitHub.

## Codigo de conducta

Ver [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
