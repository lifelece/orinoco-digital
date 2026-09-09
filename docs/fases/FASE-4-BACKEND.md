# Fase 4 — Backend Supabase + PostGIS *(OPCIONAL)*

> **Gate de entrada:** Fase 3 cerrada.
> **Gate de salida:** datos servidos desde Supabase; el frontend consume la API
> sin cambiar la UI.

**Tiempo estimado:** 2-3 semanas part-time

## Primero: ¿de verdad la necesitas?

Esta fase es **opcional**. Ver ADR-003 en [../DECISIONS.md](../DECISIONS.md).

La arquitectura del proyecto es **static-first**: el GeoJSON en Git servido
desde el CDN es la fuente de verdad. Eso ya resuelve persistencia, cuota,
rendimiento y seguridad de escritura.

Haz esta fase **solo si** aparece al menos una de estas necesidades reales:

- Consulta espacial dinamica (ej. "activos en un radio de 50 km de aqui").
- Series temporales de produccion que no caben comodas en un archivo.
- Escrituras: aportes de datos desde la web, no por Pull Request.
- Los GeoJSON superaron el limite de 2 MB del presupuesto de rendimiento.

Si ninguna aplica, **salta a la Fase 6-7 y despliega**. Anadir un backend que no
necesitas es tiempo perdido y una pieza mas que puede pausarse o caerse.

## Setup Supabase

```sql
create extension if not exists postgis;

create table activos (
  id text primary key,
  tipo text,
  sector text,
  bloque text,
  estado text,
  operadora text,
  notas text,
  fuente text not null,
  confianza text,
  ultima_verificacion date,
  geom geometry(Geometry, 4326)
);

create index activos_geom_idx on activos using gist (geom);
```

Nota que `fuente` es `not null`: la regla del proyecto se aplica tambien en el
esquema, no solo por convencion.

## Seguridad — la parte que no se improvisa

```sql
alter table activos enable row level security;

create policy "lectura publica" on activos
  for select using (true);
```

- **Solo politica SELECT.** Ninguna politica de INSERT, UPDATE ni DELETE.
- En el frontend, **solo la `anon` key**. La `service_role` key nunca sale del
  servidor ni entra en una variable `VITE_*`.
- Verificar de verdad que RLS bloquea escrituras: intenta un INSERT con la anon
  key y confirma que falla. **No asumas que funciona.**

## Frontend

`api.js` es el unico archivo que cambia. `getCampos()` pasa a consultar Supabase
y devuelve **la misma FeatureCollection** que antes.

Si tienes que tocar `map.js` o `ui.js`, algo se hizo mal: el contrato de `api.js`
existe precisamente para que esta migracion sea barata.

Nueva dependencia: `@supabase/supabase-js`. Es la unica aprobada para esta fase.

## Migracion de datos

Script en Node que lee los GeoJSON de las fases 2-3 y los carga en `activos`.
Git sigue siendo la fuente de verdad; Supabase es el espejo.

Considera una GitHub Action programada que re-siembre la tabla — mantiene el
proyecto activo y evita que se pause por inactividad.

## Prompt de arranque

```
Lee CLAUDE.md, docs/fases/FASE-4-BACKEND.md y src/api.js.
Trabajamos la Fase 4. Ya tengo la tabla activos en Supabase con RLS de solo
lectura. Reemplaza el cuerpo de getCampos() para que consulte Supabase con
supabase-js y devuelva una FeatureCollection identica en forma a la anterior.
Usa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY desde config.js.
NO toques map.js ni ui.js. PARA en el STOP gate.
```

## STOP GATE

- [ ] Necesidad real justificada (si no, saltar la fase)
- [ ] Tabla + PostGIS + indice GIST
- [ ] RLS activo, solo SELECT, **verificado con un INSERT que falla**
- [ ] Solo la anon key en el frontend
- [ ] `getCampos()` consume Supabase
- [ ] **`map.js` y `ui.js` sin cambios**
- [ ] Datos identicos a los de la version estatica
- [ ] Verificado en movil real
