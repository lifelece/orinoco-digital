---
paths:
  - "src/**"
---

# Convenciones de codigo (resumen de docs/CONVENTIONS.md)

- Identificadores en espanol sin tildes, camelCase; constantes UPPER_SNAKE; claves i18n con puntos (`panel.operadora`).
- `import`/`export` nombrados, sin `export default`. `const` por defecto, nunca `var`. `async`/`await`.
- Comillas dobles, punto y coma, 2 espacios. Funciones de menos de ~40 lineas.
- JSDoc en todo lo exportado (parametros, retorno, efectos).
- Comentarios: el porque, no el que. Valor sin verificar: comentario `// SIN VERIFICAR — ...` en la linea.
- `config.js` es el unico que lee `import.meta.env`. `api.js` devuelve siempre FeatureCollection.
- Simbolo usado = simbolo importado o definido (error 6). El hook post-edicion corre `verificar:modulos`.
