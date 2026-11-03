/**
 * Validador de recorridos (spec 003, T05; plan 3.3). Puro: sin DOM, sin red,
 * sin Cesium. Trabaja sobre el JSON de recorridos (claves snake_case del plan),
 * no sobre la salida del motor. RF-112 a RF-121.
 *
 * Tambien materializa la lista negra de referencias foraneas (RF-117) y la
 * regla de nombres propios (RF-119): se ejecuta en CI via test/recorridos.test.mjs.
 */

const NIVELES = ["divulgacion", "tecnico"];
const TIPOS_DATO = ["cifra", "legal", "instalacion", "cualitativo"];
const REFERENCIAS = ["esquematico", "ubicacion"];
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER = /\[[^\]]*pendiente[^\]]*\]/i;

const esObjeto = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const textoLleno = (x) => typeof x === "string" && x.trim() !== "";

/**
 * @param {Object} json
 * @param {{idsActivos: Set<string>, sectores: string[], nombresPropios: string[], ejemplosForaneos: string[], publicadas: string[]}} contexto
 * @returns {{ok: boolean, errores: Array<{ruta: string, regla: string, detalle: string}>}}
 */
export function validarRecorridos(json, contexto) {
  const errores = [];
  const err = (ruta, regla, detalle) => errores.push({ ruta, regla, detalle });
  const ctx = contexto || {};
  const idsActivos = ctx.idsActivos || new Set();
  const sectores = ctx.sectores || [];
  const propios = ctx.nombresPropios || [];
  const foraneos = ctx.ejemplosForaneos || [];
  const publicadas = ctx.publicadas || [];

  /** Par bilingue {es, en}: ambos llenos y sin placeholder. */
  function bilingue(valor, ruta) {
    if (!esObjeto(valor)) {
      err(ruta, "campos", "falta el par {es, en}");
      return;
    }
    for (const idioma of ["es", "en"]) {
      const t = valor[idioma];
      if (!textoLleno(t)) err(`${ruta}.${idioma}`, "campos", `falta el texto ${idioma.toUpperCase()} o esta vacio`);
      else if (PLACEHOLDER.test(t)) err(`${ruta}.${idioma}`, "campos", `contiene un marcador pendiente: "${t}"`);
    }
    // RF-119: cada nombre propio del ES debe aparecer tal cual en el EN.
    if (textoLleno(valor.es) && textoLleno(valor.en)) {
      for (const n of propios) {
        if (valor.es.includes(n) && !valor.en.includes(n)) {
          err(`${ruta}.en`, "nombre-propio", `"${n}" esta en ES y falta (o cambia) en EN`);
        }
      }
    }
  }

  /** RF-117: ningun texto menciona referencias foraneas. */
  function sinForaneos(valor, ruta) {
    if (typeof valor === "string") {
      const bajo = valor.toLowerCase();
      for (const f of foraneos) {
        if (bajo.includes(f.toLowerCase())) err(ruta, "ejemplo-foraneo", `menciona "${f}"`);
      }
    } else if (Array.isArray(valor)) {
      valor.forEach((v, i) => sinForaneos(v, `${ruta}[${i}]`));
    } else if (esObjeto(valor)) {
      for (const [k, v] of Object.entries(valor)) sinForaneos(v, `${ruta}.${k}`);
    }
  }

  function validarCamara(camara, ruta) {
    if (!esObjeto(camara)) return err(ruta, "camara", "falta la camara");
    const existe = (id, r) => {
      if (!textoLleno(id) || !idsActivos.has(id)) err(r, "camara", `el id "${id}" no existe en los datos`);
    };
    if ("objetivo_ref" in camara) existe(camara.objetivo_ref, `${ruta}.objetivo_ref`);
    else if ("entre" in camara) {
      if (!Array.isArray(camara.entre) || camara.entre.length !== 2) err(`${ruta}.entre`, "camara", "debe ser un par de ids");
      else camara.entre.forEach((id, i) => existe(id, `${ruta}.entre[${i}]`));
    } else if (camara.vista !== "faja") err(ruta, "camara", 'debe traer objetivo_ref, entre o vista: "faja"');
  }

  function validarDato(d, ruta) {
    if (!esObjeto(d)) return err(ruta, "campos", "el dato no es un objeto");
    if (!textoLleno(d.id)) err(`${ruta}.id`, "campos", "falta id");
    if (!TIPOS_DATO.includes(d.tipo_dato)) err(`${ruta}.tipo_dato`, "campos", `tipo_dato invalido: ${JSON.stringify(d.tipo_dato)}`);
    bilingue(d.etiqueta, `${ruta}.etiqueta`);
    bilingue(d.fuente_nombre, `${ruta}.fuente_nombre`);
    if (!textoLleno(d.valor)) err(`${ruta}.valor`, "campos", "falta valor");
    if (!("unidad" in d)) err(`${ruta}.unidad`, "campos", "falta unidad (null si es cualitativo)");
    else if (d.unidad !== null && !textoLleno(d.unidad)) err(`${ruta}.unidad`, "campos", "unidad debe ser texto o null");
    if (d.tipo_dato === "cualitativo" && d.unidad != null) err(`${ruta}.unidad`, "campos", "un dato cualitativo lleva unidad null");
    if (typeof d.aproximado !== "boolean") err(`${ruta}.aproximado`, "campos", "aproximado debe ser true o false");
    if (!textoLleno(d.confianza)) err(`${ruta}.confianza`, "campos", "falta confianza");
    if (!FECHA_ISO.test(d.ultima_verificacion || "")) err(`${ruta}.ultima_verificacion`, "campos", "falta ultima_verificacion (AAAA-MM-DD)");
    if (!FECHA_ISO.test(d.fecha_dato || "")) err(`${ruta}.fecha_dato`, "campos", "falta fecha_dato (AAAA-MM-DD)");

    // RF-113
    if (typeof d.fuente !== "string" || PLACEHOLDER.test(d.fuente) || /fuente_pendiente/.test(d.fuente)) {
      err(`${ruta}.fuente`, "fuente-https", `fuente pendiente o ausente: ${JSON.stringify(d.fuente)}`);
    } else if (!d.fuente.startsWith("https://")) {
      err(`${ruta}.fuente`, "fuente-https", `la fuente debe ser https://: "${d.fuente}"`);
    }
    // RF-114
    if (d.tipo_dato === "legal" && !FECHA_ISO.test(d.fecha_norma || "")) {
      err(`${ruta}.fecha_norma`, "fecha-norma", "un dato legal necesita fecha_norma (AAAA-MM-DD)");
    }
    // RF-118
    if (d.unidad === "°API" && d.aproximado !== true) {
      err(`${ruta}.aproximado`, "api-aproximado", "un dato en °API debe llevar aproximado: true");
    }
    // RF-121
    if (d.tipo_dato === "instalacion") {
      const n = d.nota;
      if (!esObjeto(n) || !textoLleno(n.es) || !textoLleno(n.en)) {
        err(`${ruta}.nota`, "nota-instalacion", "un dato de instalacion necesita nota ES y EN");
      }
    } else if (d.nota !== undefined) bilingue(d.nota, `${ruta}.nota`);
  }

  function validarEscena(e, ruta) {
    if (!esObjeto(e)) return err(ruta, "campos", "la escena no es un objeto");
    if (!textoLleno(e.id)) err(`${ruta}.id`, "campos", "falta id");
    validarCamara(e.camara, `${ruta}.camara`);

    // RF-120: "esquematico" | "ubicacion" | null (la clave debe existir)
    if (!("referencia" in e) || (e.referencia !== null && !REFERENCIAS.includes(e.referencia))) {
      err(`${ruta}.referencia`, "referencia", `debe ser "esquematico", "ubicacion" o null: ${JSON.stringify(e.referencia)}`);
    }
    // RF-116
    if (!Array.isArray(e.capas)) err(`${ruta}.capas`, "capas", "capas debe ser una lista");
    else e.capas.forEach((c, i) => {
      if (!sectores.includes(c)) err(`${ruta}.capas[${i}]`, "capas", `"${c}" no es una capa de sector (${sectores.join(", ")})`);
    });
    // texto por nivel
    if (!esObjeto(e.texto)) err(`${ruta}.texto`, "campos", "falta texto por nivel");
    else for (const n of NIVELES) bilingue(e.texto[n], `${ruta}.texto.${n}`);
    // datos puede ser []
    if (!Array.isArray(e.datos)) err(`${ruta}.datos`, "campos", "datos debe ser una lista (puede ser [])");
    else {
      const vistos = new Set();
      e.datos.forEach((d, i) => {
        validarDato(d, `${ruta}.datos[${i}]`);
        if (d && vistos.has(d.id)) err(`${ruta}.datos[${i}].id`, "id-repetido", `dato "${d.id}" repetido en la escena`);
        vistos.add(d && d.id);
      });
    }
    // P1: sin interaccion
    if (e.interaccion !== null) err(`${ruta}.interaccion`, "interaccion", "en P1 interaccion debe ser null");
  }

  if (!esObjeto(json) || !Array.isArray(json.recorridos)) {
    err("$", "campos", 'el archivo debe ser un objeto con la lista "recorridos"');
    return { ok: false, errores };
  }

  const idsRecorrido = new Set();
  const idsEscena = new Set();
  json.recorridos.forEach((r, i) => {
    const ruta = `recorridos[${i}]`;
    if (!esObjeto(r)) return err(ruta, "campos", "el recorrido no es un objeto");
    if (!textoLleno(r.id)) err(`${ruta}.id`, "campos", "falta id");
    else {
      if (idsRecorrido.has(r.id)) err(`${ruta}.id`, "id-repetido", `recorrido "${r.id}" repetido`);
      idsRecorrido.add(r.id);
      if (!publicadas.includes(r.id)) err(`${ruta}.id`, "publicada", `"${r.id}" no esta en RUTAS_PUBLICADAS (${publicadas.join(", ")})`);
    }
    bilingue(r.titulo, `${ruta}.titulo`);
    bilingue(r.pregunta, `${ruta}.pregunta`);
    if (!Array.isArray(r.escenas) || r.escenas.length === 0) return err(`${ruta}.escenas`, "campos", "faltan escenas");
    r.escenas.forEach((e, j) => {
      const re = `${ruta}.escenas[${j}]`;
      validarEscena(e, re);
      if (!esObjeto(e)) return;
      if (e.orden !== j + 1) err(`${re}.orden`, "orden", `orden ${JSON.stringify(e.orden)}; esperado ${j + 1} (consecutivo desde 1)`);
      if (textoLleno(e.id)) {
        if (idsEscena.has(e.id)) err(`${re}.id`, "id-repetido", `escena "${e.id}" repetida`);
        idsEscena.add(e.id);
      }
    });
    sinForaneos(r, ruta);
  });

  return { ok: errores.length === 0, errores };
}
