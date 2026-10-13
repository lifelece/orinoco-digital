# 02 — Identidad visual: ExpoFaja + CCIEB dentro de Orinoco Digital

> Colores medidos pixel a pixel sobre los archivos recibidos el 2026-10-12
> (`data/raw/expofaja/marcas/`), no estimados a ojo. Contrastes calculados con
> la formula WCAG 2.1. Las marcas son de la CCIEB y estan autorizadas desde
> el 2026-10-12 (`AUTORIZACIONES.md`). Este documento dice como usarlas.

## 1. Paleta ExpoFaja (logo oficial PNG)

| Token | Hex | Donde aparece en el logo | Peso en el logo |
|---|---|---|---|
| `ef-petroleo` | `#014655` | "Expo", torre, plataforma | 50 % |
| `ef-cian` | `#04D5D6` | "Faja", onda de rio | 32 % |
| `ef-azul` | `#066E86` | "CAPITAL ESTRATEGICA" | 6 % |
| `ef-verde` | `#58A51E` | Banda inferior (llanura) | 5 % |
| `ef-naranja` | `#FFA201` | Banda superior | 4 % |
| `ef-gris` | `#BBBBBB` | "Ciudad Bolivar 2026" | 3 % |

Lectura de las bandas (naranja / cian / verde = crudo o sol / rio Orinoco /
llanura) es **nuestra**, no oficial: no publicarla como significado de marca.

## 2. Paleta CCIEB (sello)

| Token | Hex | Donde |
|---|---|---|
| `cc-azul` | `#131A8D` | Anillo y letras del sello |
| `cc-indigo` | `#28166F` | Nave y puente |
| `cc-atardecer-1` | `#EE7C19` | Degradado superior |
| `cc-atardecer-2` | `#FAAB00` | Degradado medio |
| `cc-atardecer-3` | `#FAD00A` | Degradado inferior |

El sello CCIEB se usa **completo y sin recolorear**. No se extraen sus
colores para la interfaz: su papel es firma institucional ("Organiza").

## 3. Contraste (texto normal necesita >= 4,5:1)

| Texto | Fondo | Ratio | Uso |
|---|---|---|---|
| `#FFFFFF` | `ef-petroleo` | 10,46 | Texto sobre hero |
| `ef-cian` | `ef-petroleo` | 5,72 | Acentos y enlaces sobre hero |
| `ef-naranja` | `ef-petroleo` | 5,19 | Chips de hora sobre hero |
| `ef-petroleo` | `#FFFFFF` | 10,46 | Titulos y texto en cuerpo claro |
| `ef-azul` | `#FFFFFF` | 5,86 | Subtitulos, enlaces en cuerpo claro |
| `ef-cian` | `#FFFFFF` | **1,83** | **Prohibido como texto** sobre claro. Solo fondos, bordes, iconos grandes |
| `ef-naranja` | `#FFFFFF` | **2,02** | **Prohibido como texto** sobre claro |
| `ef-gris` | `#FFFFFF` | **1,92** | **Prohibido como texto** sobre claro |
| `ef-verde` | `#FFFFFF` | 3,08 | Solo texto grande (>= 24 px o 19 px negrita) |

Variantes de texto accesibles derivadas (mismo tono, mas oscuras) para cuerpo
claro: `ef-cian-texto #00787A` (5,29), `ef-verde-texto #3E7A12` (5,25),
`ef-naranja-texto #A35F00` (5,01).

## 4. Convivencia con Orinoco Digital (decision)

Orinoco ya tiene tokens en `src/style.css` (ADR-014) y dos chocan con la marca:

| Token Orinoco | Hex | Choque con | Riesgo |
|---|---|---|---|
| `--color-gas` | `#4cc9f0` | `ef-cian #04D5D6` | Un punto cian en el mapa se leeria como "gas" |
| `--color-crudo` | `#f2a33c` | `ef-naranja #FFA201` | Un punto naranja se leeria como "crudo" |

**Decision:**

1. **En el mapa 3D, los colores de marca no codifican datos.** La capa
   Ciudad Bolivar (E1) usa `--color-hi #e6edf3` con iconos distintos por
   clase (museo, avion, puente, birrete, cruz, cama, banco). La semantica de
   colores del mapa no se toca.
2. **La marca vive en el micrositio `/expofaja` (E2)** y, dentro del mapa,
   en la **cabecera DOM del modo Ciudad Bolivar** ("En alianza con" + sello
   CCIEB + logo ExpoFaja, E1) y en el chip "ExpoFaja 2026" de la ficha del
   Museo Soto. Nunca en marcadores ni sobre el terreno.
3. **Micrositio = identidad ExpoFaja** (como el brochure: cuerpo claro, hero
   `ef-petroleo`). **Mapa = identidad Orinoco** (oscuro, "instrumento
   tecnico"). El puente entre ambos es el boton "Ver Ciudad Bolivar en 3D".

## 5. Tokens para el micrositio

En `src/expofaja/expofaja.css` (archivo nuevo, ADR-020). Prefijos `ef-` y
`cc-` para no colisionar con los del mapa:

```css
@import "tailwindcss";

@theme {
  --color-ef-petroleo: #014655;
  --color-ef-cian: #04d5d6;
  --color-ef-azul: #066e86;
  --color-ef-verde: #58a51e;
  --color-ef-naranja: #ffa201;
  --color-ef-gris: #bbbbbb;
  --color-ef-cian-texto: #00787a;
  --color-ef-verde-texto: #3e7a12;
  --color-ef-naranja-texto: #a35f00;
  --color-ef-fondo: #f2f6f7;
  --color-cc-azul: #131a8d;
}
```

`#F2F6F7` (`ef-fondo`) es el gris frio de los fondos del brochure: medido a
ojo sobre las paginas, **no** sale del logo. Validar con la CCIEB si hay
manual de marca.

## 6. Tipografia

Sin fuentes web (ADR-014): pila del sistema, titulos en peso 700–800. La
tipografia del logo **no se imita ni se adivina**: el logo ya la lleva. Si la
CCIEB entrega el nombre de su fuente y su licencia lo permite, se evalua con
un ADR (peso, licencia, `THIRD-PARTY.md`).

## 7. Archivos de marca

| Archivo (`data/raw/expofaja/marcas/`) | Que es | Uso |
|---|---|---|
| `expofaja-original.png` | 1373x476, fondo transparente, recibido de Luis | Sobre fondos claros |
| `expofaja-686.png` | Mitad de tamano | Cabecera del micrositio |
| `expofaja-sobre-oscuro.png` | **Derivado**: petroleo y azul pasados a blanco | Sobre `ef-petroleo` o el tema oscuro, **hasta recibir la version oficial** |
| `expofaja-mono-blanco.png` | **Derivado**: todo blanco (como la contraportada del brochure) | Pie, marcas de agua |
| `ccieb-original.jpg` | 1253x1253, fondo blanco | Fuente |
| `ccieb-transparente.png`, `ccieb-512.png`, `ccieb-128.png` | **Derivado**: recorte circular sin fondo | Firma "Organiza" |
| `_vista-previa-marcas.jpg` | Hoja de prueba claro/oscuro | Revision |

Pedir a la CCIEB (E0): logo ExpoFaja en vector (AI, SVG o PDF), version
oficial sobre fondo oscuro, sello CCIEB en vector, logo de la Alcaldia de
Angostura del Orinoco, y si existe, manual de marca del "logo territorio".

**Ya publicables (autorizado el 12/10):** `public/expofaja/marcas/`
contiene `expofaja.webp` (claro), `expofaja-sobre-oscuro.webp` y
`expofaja-mono-blanco.webp` (derivados), `ccieb.webp` (sello recortado),
`alcaldia-angostura-del-orinoco.webp`, `gobernacion-bolivar.webp`,
`museo-jesus-soto.webp` y `aliados/` (46), todos WebP <= 40 KB, mas
`AVISO.md` ("Marcas propiedad de sus titulares, usadas con autorizacion de la
CCIEB. No cubiertas por Apache-2.0 ni CC BY 4.0."). Procedencia y tamano de
cada archivo: `semillas/marcas-manifiesto.json`.

## 8. Reglas de uso del logo

- Zona de proteccion: la altura de la "E" de "Expo" alrededor del logo.
- Ancho minimo en pantalla: 120 px (por debajo "Ciudad Bolivar 2026" no se lee).
- No deformar, no rotar, no aplicar sombras ni degradados, no recolorear
  salvo las versiones listadas arriba.
- Bloque de co-marca: `Orinoco Digital  ×  [logo ExpoFaja]` en la cabecera;
  sello CCIEB + logo Alcaldia en el pie bajo "Organizan". Orinoco nunca
  aparece como organizador del evento.

## 9. Motivos graficos reutilizables

- **Puente Angostura**: esta en el sello CCIEB y en el fondo del afiche de
  ponentes. Es el puente visual natural entre la marca y el mapa (E1 lo
  dibuja como linea con su geometria OSM).
- **Torre + ondas**: el isotipo de ExpoFaja sirve como marca de agua al 4–6 %
  de opacidad en el hero, como hace el brochure.
- **Tarjetas de ponente**: el afiche usa tarjeta blanca redondeada con foto
  sobre bloque cian. Replicable con CSS sin imagenes de fondo.
