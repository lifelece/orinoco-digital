# Atribuciones de terceros (codigo)

Este archivo documenta codigo de Orinoco Digital cuya **idea** (no el texto
del codigo) viene de otro proyecto de codigo abierto. Para licencias de
**datos** de terceros, ver `LICENSE-DATA` y `docs/DATA_SOURCES.md`: es una
cosa distinta, con obligaciones distintas (ADR-008).

---

## bilawalsidhu/gods-eye-view (MIT)

Repositorio: https://github.com/bilawalsidhu/gods-eye-view · Licencia: MIT.

El 2026-09-29 se hizo un analisis de ese repositorio buscando ideas
aplicables a Orinoco (`docs/DECISIONS.md` -> ADR-019). Dos piezas de Orinoco
reimplementan una idea de ahi, **sin copiar su codigo**: nombres, estructura
y comentarios propios, en espanol, siguiendo `docs/CONVENTIONS.md`.

| Archivo de Orinoco | Idea tomada de | Archivo de gods-eye-view |
|---|---|---|
| `src/controladorRender.js` | Holds de render continuo contados por referencia (un `Set` de duenos activos, en vez de un `requestRenderMode` fijo) | `src/renderGovernor.js` |
| `scripts/verificar-modulos.mjs` | Un script de Node sin dependencias que falla en CI si un modulo importa algo que no deberia | `scripts/check-import-directions.mjs` |

**Por que reimplementar y no copiar.** gods-eye-view esta escrito para un
dominio muy distinto (satelites/aviones/barcos en tiempo real, con servidor
Node) y con mucha mas superficie de la que Orinoco necesita — su
`renderGovernor.js` trae diagnosticos de solicitudes recientes que Orinoco no
usa, y su verificador de modulos analiza direcciones de import entre
server/portable/renderer que no existen en un proyecto static-first como
este. Ver `C:\dev\referencias\gods-eye-view-analisis.md` (fuera de este
repositorio) para el analisis completo.

La licencia MIT de gods-eye-view permite copiar su codigo literal conservando
el aviso de copyright; se opto por reimplementar en vez de copiar/pegar
porque el resultado es mas simple y encaja con el resto del proyecto
(Vanilla ES6, comentarios en espanol, cero dependencias). Este archivo deja
constancia del origen de la idea aunque el texto del codigo sea propio.
