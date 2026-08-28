/**
 * Relleno de formularios PDF (AcroForm), sin dependencias.
 *
 * Existe para el comunicado al Ministerio del Interior: la plantilla oficial es
 * un PDF con 67 campos y lo que se le entrega a la Administración tiene que ser
 * SU impreso, no una imitación nuestra. Así que en vez de dibujar un PDF
 * parecido, se rellena el auténtico.
 *
 * Cómo: un "actualizado incremental". El fichero original no se toca; se le
 * añaden al final las versiones nuevas de los objetos que cambian, una tabla
 * xref nueva y un trailer que apunta con /Prev a la tabla anterior. Es lo que
 * hace cualquier lector al guardar un formulario, y tiene dos ventajas grandes:
 * no hay que reescribir el PDF (o sea, no hay que entender el 95% de él) y el
 * documento original queda intacto dentro del resultado.
 *
 * Lo que se apoya en la plantilla concreta, comprobado sobre ella:
 *  - No está cifrada (/Encrypt ausente).
 *  - Usa tabla xref clásica, no flujos de referencias cruzadas.
 *  - Los objetos de campo son de nivel superior, no van dentro de object
 *    streams comprimidos.
 * Si algún día el Ministerio publica una plantilla que no cumpla esto,
 * `canFillForm` lo detecta y hay que revisar este módulo en vez de generar un
 * PDF corrupto en silencio.
 */

const enc = (s: string) => new TextEncoder().encode(s);
const dec = (b: Uint8Array) => new TextDecoder('latin1').decode(b);

/** Un campo de texto del formulario. */
export interface PdfField {
  /** Nombre completo, con sus padres: `topmostSubform[0].Page1[0].Municipio[0]`. */
  fullName: string;
  /** Nombre de la hoja, que es con el que se trabaja de puertas afuera. */
  name: string;
  objectNumber: number;
}

interface Parsed {
  bytes: Uint8Array;
  text: string;
  offsets: Map<number, number>;
  /** Número de objeto del diccionario /AcroForm. */
  acroFormObject: number;
  rootObject: number;
  /** Offset de la última tabla xref, para encadenar con /Prev. */
  prevXref: number;
  size: number;
  trailerExtras: string;
}

function objectBody(p: Parsed, num: number): string | null {
  const at = p.offsets.get(num);
  if (at === undefined) return null;
  const start = p.text.indexOf('obj', at);
  if (start < 0) return null;
  const end = p.text.indexOf('endobj', start);
  return end < 0 ? null : p.text.slice(start + 3, end);
}

/** Referencias `12 0 R` dentro de un array. */
function refsIn(fragment: string): number[] {
  const out: number[] = [];
  const re = /(\d+)\s+0\s+R/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment)) !== null) out.push(Number(m[1]));
  return out;
}

/** Contenido de una entrada `/Clave[ ... ]` respetando corchetes anidados. */
function arrayValue(body: string, key: string): string | null {
  const i = body.indexOf(key);
  if (i < 0) return null;
  const open = body.indexOf('[', i);
  if (open < 0) return null;
  let depth = 0;
  for (let j = open; j < body.length; j++) {
    if (body[j] === '[') depth++;
    else if (body[j] === ']') {
      depth--;
      if (depth === 0) return body.slice(open + 1, j);
    }
  }
  return null;
}

/** Valor de `/T(...)`, que es como el PDF guarda el nombre del campo. */
function titleOf(body: string): string | null {
  const m = /\/T\s*\(((?:\\.|[^\\)])*)\)/.exec(body);
  if (m) return m[1].replace(/\\([()\\])/g, '$1');
  const h = /\/T\s*<([0-9A-Fa-f]+)>/.exec(body);
  if (!h) return null;
  const hex = h[1];
  let s = '';
  for (let i = 0; i + 3 < hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  return s.replace(/^﻿/, '');
}

export function parsePdf(bytes: Uint8Array): Parsed | null {
  const text = dec(bytes);

  const offsets = new Map<number, number>();
  const re = /(?:^|[\r\n\s])(\d+)\s+0\s+obj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) offsets.set(Number(m[1]), m.index);

  const rootMatch = /\/Root\s+(\d+)\s+0\s+R/.exec(text);
  if (!rootMatch) return null;
  const rootObject = Number(rootMatch[1]);

  const startxref = /startxref\s+(\d+)\s*%%EOF\s*$/.exec(text.slice(-200));
  if (!startxref) return null;
  const prevXref = Number(startxref[1]);

  const sizeMatch = /\/Size\s+(\d+)/.exec(text);
  const size = sizeMatch ? Number(sizeMatch[1]) : offsets.size + 1;

  const catalog = objectBody({ bytes, text, offsets, acroFormObject: 0, rootObject, prevXref, size, trailerExtras: '' }, rootObject);
  if (!catalog) return null;
  const acro = /\/AcroForm\s+(\d+)\s+0\s+R/.exec(catalog);
  if (!acro) return null;

  const info = /\/Info\s+(\d+)\s+0\s+R/.exec(text);
  const id = /\/ID\s*\[[^\]]*\]/.exec(text);
  const trailerExtras =
    (info ? `/Info ${info[1]} 0 R` : '') + (id ? id[0] : '');

  return {
    bytes,
    text,
    offsets,
    acroFormObject: Number(acro[1]),
    rootObject,
    prevXref,
    size,
    trailerExtras,
  };
}

/**
 * Comprueba que la plantilla es de las que este módulo sabe rellenar. Se llama
 * antes de rellenar: más vale decir "esta plantilla no la sé rellenar" que
 * entregarle a la Administración un PDF roto.
 */
export function canFillForm(bytes: Uint8Array): boolean {
  const text = dec(bytes);
  if (text.includes('/Encrypt')) return false;
  if (text.includes('/ObjStm')) return false;
  if (/\/Type\s*\/XRef/.test(text)) return false;
  return parsePdf(bytes) !== null;
}

/** Todos los campos del formulario, con su nombre completo. */
export function listFields(bytes: Uint8Array): PdfField[] {
  const p = parsePdf(bytes);
  if (!p) return [];

  const acro = objectBody(p, p.acroFormObject);
  if (!acro) return [];
  const roots = refsIn(arrayValue(acro, '/Fields') ?? '');

  const out: PdfField[] = [];
  const seen = new Set<number>();

  const walk = (num: number, prefix: string) => {
    if (seen.has(num)) return;
    seen.add(num);
    const body = objectBody(p, num);
    if (body === null) return;

    const title = titleOf(body);
    const full = title === null ? prefix : prefix ? `${prefix}.${title}` : title;

    const kids = arrayValue(body, '/Kids');
    if (kids !== null) {
      for (const kid of refsIn(kids)) walk(kid, full);
      return;
    }
    // Hoja: sólo interesan las que tienen nombre propio.
    if (title !== null) out.push({ fullName: full, name: title, objectNumber: num });
  };

  for (const r of roots) walk(r, '');
  return out;
}

/**
 * Cadena PDF en UTF-16BE hexadecimal.
 *
 * Se usa siempre, también para texto ASCII: el impreso lleva nombres, calles y
 * municipios españoles, y con codificación de un byte los acentos y las eñes
 * salen rotos. En hexadecimal tampoco hay que escapar paréntesis ni barras.
 */
function pdfString(value: string): string {
  let hex = 'FEFF';
  for (const ch of value) {
    const cp = ch.codePointAt(0) ?? 32;
    if (cp > 0xffff) {
      const v = cp - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0').toUpperCase();
      hex += (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0').toUpperCase();
    } else {
      hex += cp.toString(16).padStart(4, '0').toUpperCase();
    }
  }
  return `<${hex}>`;
}

/** Quita una entrada `/Clave ...` del diccionario, sea del tipo que sea. */
function removeEntry(body: string, key: string): string {
  const i = body.indexOf(key);
  if (i < 0) return body;
  let j = i + key.length;
  while (j < body.length && /\s/.test(body[j])) j++;
  if (body[j] === '[') {
    let depth = 0;
    for (; j < body.length; j++) {
      if (body[j] === '[') depth++;
      else if (body[j] === ']') {
        depth--;
        if (depth === 0) { j++; break; }
      }
    }
  } else if (body[j] === '<' && body[j + 1] === '<') {
    let depth = 0;
    for (; j < body.length - 1; j++) {
      if (body[j] === '<' && body[j + 1] === '<') { depth++; j++; }
      else if (body[j] === '>' && body[j + 1] === '>') {
        depth--; j += 2;
        if (depth === 0) break;
      }
    }
  } else {
    while (j < body.length && !/[\s/>\]]/.test(body[j])) j++;
  }
  return body.slice(0, i) + body.slice(j);
}

/** Mete o sustituye `/V` en el diccionario de un campo. */
function withValue(body: string, value: string): string {
  let out = removeEntry(body, '/V');
  // La apariencia guardada es la del campo vacío: si se deja, algunos lectores
  // siguen enseñando el hueco en blanco pese al valor nuevo.
  out = removeEntry(out, '/AP');
  const close = out.lastIndexOf('>>');
  if (close < 0) return out;
  return `${out.slice(0, close)}/V ${pdfString(value)}${out.slice(close)}`;
}

export interface FillResult {
  bytes: Uint8Array;
  /** Campos que se han rellenado de verdad. */
  filled: string[];
  /** Nombres pedidos que no existen en la plantilla. */
  unknown: string[];
}

/**
 * Rellena el formulario y devuelve el PDF nuevo.
 *
 * Las claves de `values` son nombres de campo: vale el nombre completo o el de
 * la hoja, porque los nombres de hoja de esta plantilla ya son únicos.
 */
export function fillPdfForm(bytes: Uint8Array, values: Record<string, string>): FillResult {
  const p = parsePdf(bytes);
  if (!p) return { bytes, filled: [], unknown: Object.keys(values) };

  const fields = listFields(bytes);
  const byName = new Map<string, PdfField>();
  for (const f of fields) {
    byName.set(f.fullName, f);
    if (!byName.has(f.name)) byName.set(f.name, f);
  }

  const updated = new Map<number, string>();
  const filled: string[] = [];
  const unknown: string[] = [];

  for (const [key, raw] of Object.entries(values)) {
    const value = (raw ?? '').trim();
    if (!value) continue;
    const field = byName.get(key);
    if (!field) { unknown.push(key); continue; }
    const body = objectBody(p, field.objectNumber);
    if (body === null) { unknown.push(key); continue; }
    updated.set(field.objectNumber, withValue(body, value));
    filled.push(field.fullName);
  }

  // El diccionario del formulario: se le quita el XFA y se le pide al lector
  // que dibuje las apariencias.
  //
  // Lo del XFA importa. La plantilla es un XFA "estático" (no lleva
  // /NeedsRendering), o sea que las páginas ya están dibujadas como PDF normal
  // y el XFA es una copia paralela del formulario. Si se deja, los lectores de
  // Adobe hacen caso al XFA y no a los valores que acabamos de escribir, así
  // que se ve el impreso en blanco. Quitándolo queda un AcroForm de toda la
  // vida, que es lo que entiende todo el mundo, móviles incluidos.
  const acroBody = objectBody(p, p.acroFormObject);
  if (acroBody !== null) {
    let acro = removeEntry(acroBody, '/XFA');
    acro = removeEntry(acro, '/NeedAppearances');
    const close = acro.lastIndexOf('>>');
    if (close >= 0) acro = `${acro.slice(0, close)}/NeedAppearances true${acro.slice(close)}`;
    updated.set(p.acroFormObject, acro);
  }

  // --- Actualizado incremental ---
  const parts: string[] = [];
  const original = p.bytes.length;
  const newOffsets = new Map<number, number>();
  let cursor = original;

  // Un salto de línea antes, por si el original no acaba en uno.
  parts.push('\n');
  cursor += 1;

  for (const [num, body] of [...updated.entries()].sort((a, b) => a[0] - b[0])) {
    const chunk = `${num} 0 obj${body}endobj\n`;
    newOffsets.set(num, cursor);
    parts.push(chunk);
    cursor += chunk.length;
  }

  const xrefOffset = cursor;
  const nums = [...newOffsets.keys()].sort((a, b) => a - b);

  // La xref va en tramos de números consecutivos.
  const groups: number[][] = [];
  for (const n of nums) {
    const last = groups[groups.length - 1];
    if (last && n === last[last.length - 1] + 1) last.push(n);
    else groups.push([n]);
  }

  let xref = 'xref\n';
  for (const g of groups) {
    xref += `${g[0]} ${g.length}\n`;
    for (const n of g) {
      xref += `${String(newOffsets.get(n)).padStart(10, '0')} 00000 n \n`;
    }
  }
  xref +=
    `trailer\n<</Size ${p.size}/Root ${p.rootObject} 0 R${p.trailerExtras}/Prev ${p.prevXref}>>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;
  parts.push(xref);

  const tail = enc(parts.join(''));
  const out = new Uint8Array(original + tail.length);
  out.set(p.bytes, 0);
  out.set(tail, original);

  return { bytes: out, filled, unknown };
}
