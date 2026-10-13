# ExpoFaja 2026 x Orinoco Digital — mandatos para Claude Code

> **Fecha:** 2026-10-12 · **Autor:** Luis Carlos Vasquez · **Estado:** propuesta,
> pendiente de aprobacion del autor. **Autorizacion de la CCIEB: recibida el
> 2026-10-12** para todos los recursos disponibles (`AUTORIZACIONES.md`).
>
> Esta carpeta convierte la intervencion de Luis en la ExpoFaja (12/10/2026) en
> mandatos ejecutables. **No cambia `CLAUDE.md`.** Donde choquen, manda
> `CLAUDE.md` hasta que `03-ADR-020-PROPUESTA.md` se apruebe y pase a
> `docs/DECISIONS.md`.

## La idea en una frase

**Ciudad Bolivar como eje del mapa.** El mapa abre en la ciudad, mirando
hacia la Faja; anillos de distancia muestran cuantos campos petroleros quedan
cerca (63 de 105 a menos de 200 km en linea recta); encima, lo que la Camara
de Comercio e Industrias del Estado Bolivar (CCIEB) y la ExpoFaja quieren
impulsar, atribuido. Todo con datos publicos verificables.

## Orden de lectura (Claude Code)

1. `CLAUDE.md` y `docs/PLAN.md` del repo (como siempre).
2. `00-CONTEXTO.md` — que paso, quien es quien, reglas, riesgos.
3. `01-DATOS-EVENTO.md` — resumen humano de las semillas. **La fuente
   maquina son los JSON de `semillas/`, nunca este .md.**
4. `02-IDENTIDAD-VISUAL.md` — paleta, logos, convivencia con el tema oscuro.
5. `03-ADR-020-PROPUESTA.md` — decisiones de arquitectura.
6. El mandato de la etapa activa (`E1`...`E4`).

## Mandatos

| Etapa | Archivo | Quien | Necesita permiso CCIEB | Fecha objetivo |
|---|---|---|---|---|
| E0 | `E0-GOBERNANZA-PERMISOS.md` + `AUTORIZACIONES.md` | Luis (sin codigo) | **Hecho** (12/10); falta anotar quien y por que medio | Lun 12 |
| E1 | `E1-MODO-CIUDAD-BOLIVAR.md` | Claude Code | Autorizado | Mar 13 |
| E2 | `E2-MICROSITIO-EXPOFAJA.md` | Claude Code | Autorizado (modo marcas) | Mie 14 -> Jue 15 12:00 |
| E3 | `E3-EMBED-WORDPRESS.md` | Claude Code + webmaster CCIEB | Autorizado | Tras E2 (ideal: antes del 16) |
| E4 | `E4-POST-EVENTO.md` | Claude Code | Autorizado (salvo datos de afiliados no publicos) | Semana del 19/10 |
| — | `data/raw/expofaja/privado/PROPUESTA-CCIEB.md` (no versionado) | Luis -> CCIEB | — | Enviar con E0 o tras E1 |

**Linea roja de calendario:** el evento empieza el **jueves 15 a las 17:00**
(acto inaugural) y las conferencias el **viernes 16 a las 09:00**. Merge a
`main` = produccion (Vercel conectado a GitHub desde el 2026-09-29). Nada se
mergea despues del jueves 15 a las 12:00 salvo correcciones de agenda en JSON.

## Prompt de arranque global (pegar en Claude Code)

```
Lee CLAUDE.md, docs/PLAN.md y docs/expofaja/README.md completos. Despues lee
docs/expofaja/00-CONTEXTO.md, 02-IDENTIDAD-VISUAL.md y 03-ADR-020-PROPUESTA.md.
Vamos a trabajar la etapa [E1|E2|E3|E4]: abre su archivo y confirma en una
frase que etapa trabajas y que archivos vas a tocar. Los datos del evento
salen SOLO de docs/expofaja/semillas/*.json; si falta un dato usa el
placeholder que ya trae la semilla, no lo completes. Al terminar la etapa,
PARA en su STOP gate y espera revision.
```

## Contenido del kit

```
docs/expofaja/
  README.md                  este archivo
  00-CONTEXTO.md
  01-DATOS-EVENTO.md
  02-IDENTIDAD-VISUAL.md
  03-ADR-020-PROPUESTA.md
  E0-GOBERNANZA-PERMISOS.md
  AUTORIZACIONES.md
  E1-MODO-CIUDAD-BOLIVAR.md
  E2-MICROSITIO-EXPOFAJA.md
  E3-EMBED-WORDPRESS.md
  E4-POST-EVENTO.md
  semillas/                  JSON y GeoJSON con fuente en cada bloque
  qr/                        QR a https://orinoco-digital.vercel.app/expofaja

public/expofaja/             SI versionado (autorizado el 2026-10-12)
  marcas/                    logos WebP <= 40 KB + AVISO.md; aliados/ (46)
  ponentes/                  7 fotos WebP del afiche + AVISO.md

data/raw/expofaja/           NO versionado (.gitignore ya cubre data/raw/)
  marcas/                    logos originales (fuente de los WebP publicados)
  referencias/               brochure, programa, afiche, transcripcion,
                             recortes de ponentes (solo referencia)
  privado/                   propuesta a la CCIEB y hallazgos de su web
                             (conversacion con un aliado: nunca al repo)
```

## Instalacion del kit en el repo

Descomprimir en la raiz de `orinoco-digital/`. `data/raw/` ya esta en
`.gitignore`, asi que originales, referencias y lo privado no se suben. Entran
a Git `docs/expofaja/` y `public/expofaja/` (marcas y fotos autorizadas, con
su `AVISO.md`). Rama sugerida: `expofaja/contexto` (convencion
`tipo/descripcion` de `CONVENTIONS.md`).
