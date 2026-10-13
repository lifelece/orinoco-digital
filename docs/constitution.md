# Constitucion de Orinoco Digital

Principios no negociables. Toda spec, plan y tarea los respeta.

1. Ningun dato sin fuente en `docs/DATA_SOURCES.md`; cada registro lleva `fuente`, `confianza` y `ultima_verificacion`, en WGS84. (Reglas 3 y 4)
2. No se inventan datos, coordenadas, nombres ni columnas: placeholder visible o pregunta. (Regla 2)
3. Static-first: el GeoJSON versionado en Git es la fuente de verdad; se sirve como estatico. (ADR-003, ADR-010)
4. `api.js` devuelve siempre FeatureCollection. (Arquitectura)
5. Una responsabilidad por modulo; solo `map.js` importa `cesium`; la interfaz no hace `fetch`. (ADR-019)
6. Vanilla ES6, sin frameworks ni dependencias nuevas sin ADR. (ADR-004, Regla 7)
7. Todo texto visible pasa por `t(clave)`, en ES y EN. (ADR-005, Regla 9)
8. La capa predictiva es DEMO y lo dice siempre que esta activa. (Regla 5, MODEL_CARD.md)
9. Neutralidad: datos y fuentes, sin postura politica. (Regla 8)
10. Objetivo real: laptop de 8 GB y redes moviles venezolanas. (Regla 10, PERFORMANCE_BUDGET.md)
11. Verificado = telefono real con DevTools cerrado; los fallos se ven en la UI. (Regla 6)
12. Marcas y contenido de terceros (CCIEB, ExpoFaja, aliados) solo con autorizacion registrada, atribuidos y fuera de las licencias del proyecto. (ADR-020, propuesta)

Cambiar un principio requiere un ADR.
