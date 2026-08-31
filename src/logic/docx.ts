/**
 * Relleno de documentos de Word (.docx), sin dependencias.
 *
 * Existe porque lo que se le entrega a un proveedor de servicios de tránsito
 * aéreo tiene que ser SU plantilla, no una imitación nuestra con las mismas
 * palabras. La EARO es un acuerdo que firman las dos partes, y llega con la
 * codificación, los anexos y el pie de página de ENAIRE.
 *
 * Un `.docx` es un ZIP con XML dentro. Normalmente sus entradas van
 * comprimidas con DEFLATE, y descomprimir DEFLATE en el móvil serían varios
 * cientos de líneas o una librería más; por eso la plantilla se empaqueta ya
 * sin comprimir (ver `scripts/vendor-earo.mjs`) y aquí sólo hay que recortar
 * trozos del fichero y volver a coserlos. `canFillDocx` comprueba que sea así
 * antes de tocar nada: si algún día alguien mete un `.docx` normal, se dice en
 * vez de escribir un fichero roto en silencio.
 *
 * De puertas afuera esto no sabe nada de EARO ni de ENAIRE: son tablas,
 * filas, celdas y párrafos. Lo que va en cada casilla vive en `earo.ts`.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ------------------------------------------------------------------ */
/* ZIP almacenado                                                      */
/* ------------------------------------------------------------------ */

const FIRMA_LOCAL = 0x04034b50;
const FIRMA_CENTRAL = 0x02014b50;
const FIRMA_FIN = 0x06054b50;

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const TABLA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function finDelDirectorio(view: DataView, length: number): number {
  // El registro de fin va al final del fichero; se busca su firma hacia atrás.
  for (let i = length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === FIRMA_FIN) return i;
  }
  return -1;
}

/** true si es un ZIP con todas sus entradas sin comprimir, que es lo que sabemos leer. */
export function canFillDocx(bytes: Uint8Array): boolean {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const fin = finDelDirectorio(view, bytes.length);
    if (fin < 0) return false;
    const total = view.getUint16(fin + 10, true);
    let p = view.getUint32(fin + 16, true);
    for (let i = 0; i < total; i++) {
      if (view.getUint32(p, true) !== FIRMA_CENTRAL) return false;
      if (view.getUint16(p + 10, true) !== 0) return false; // comprimida
      p += 46 + view.getUint16(p + 28, true) + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
    }
    return true;
  } catch {
    return false;
  }
}

export function readZip(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fin = finDelDirectorio(view, bytes.length);
  if (fin < 0) throw new Error('El documento no es un ZIP válido.');

  const total = view.getUint16(fin + 10, true);
  let p = view.getUint32(fin + 16, true);
  const entradas: ZipEntry[] = [];

  for (let i = 0; i < total; i++) {
    if (view.getUint32(p, true) !== FIRMA_CENTRAL) throw new Error('Directorio central corrupto.');
    if (view.getUint16(p + 10, true) !== 0) throw new Error('La plantilla viene comprimida.');
    const tam = view.getUint32(p + 24, true);
    const nombreLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const comentarioLen = view.getUint16(p + 32, true);
    const offsetLocal = view.getUint32(p + 42, true);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nombreLen));

    // Los tamaños de nombre y extra de la cabecera local pueden no coincidir
    // con los del directorio central, así que se leen de la propia local.
    const lNombre = view.getUint16(offsetLocal + 26, true);
    const lExtra = view.getUint16(offsetLocal + 28, true);
    const inicio = offsetLocal + 30 + lNombre + lExtra;
    entradas.push({ name, data: bytes.subarray(inicio, inicio + tam) });

    p += 46 + nombreLen + extraLen + comentarioLen;
  }
  return entradas;
}

export function writeZip(entries: ZipEntry[]): Uint8Array {
  const partes: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nombre = enc.encode(name);
    const crc = crc32(data);

    const local = new Uint8Array(30);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, FIRMA_LOCAL, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(8, 0, true); // método 0: almacenado
    lv.setUint16(12, 0x21, true); // fecha fija: 1 de enero de 1980
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nombre.length, true);
    partes.push(local, nombre, data);

    const cen = new Uint8Array(46);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, FIRMA_CENTRAL, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nombre.length, true);
    cv.setUint32(42, offset, true);
    central.push(cen, nombre);

    offset += local.length + nombre.length + data.length;
  }

  const fin = new Uint8Array(22);
  const fv = new DataView(fin.buffer);
  const tamCentral = central.reduce((n, c) => n + c.length, 0);
  fv.setUint32(0, FIRMA_FIN, true);
  fv.setUint16(8, entries.length, true);
  fv.setUint16(10, entries.length, true);
  fv.setUint32(12, tamCentral, true);
  fv.setUint32(16, offset, true);

  const todo = [...partes, ...central, fin];
  const total = todo.reduce((n, c) => n + c.length, 0);
  const salida = new Uint8Array(total);
  let at = 0;
  for (const trozo of todo) {
    salida.set(trozo, at);
    at += trozo.length;
  }
  return salida;
}

/* ------------------------------------------------------------------ */
/* Edición del XML del documento                                       */
/* ------------------------------------------------------------------ */

const TBL = /<w:tbl>[\s\S]*?<\/w:tbl>/g;
const TR = /<w:tr[ >][\s\S]*?<\/w:tr>/g;
const TC = /<w:tc>[\s\S]*?<\/w:tc>/g;
const WP = /<w:p[ >][\s\S]*?<\/w:p>/g;
const WT = /(<w:t[^>]*>)([^<]*)(<\/w:t>)/g;

function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * El inverso de `escapar`, para que leer un texto devuelva lo que se escribió.
 * Importa más de lo que parece: `checkTemplate` compara rótulos de la
 * plantilla, y un rótulo con un `&` dentro no casaría nunca.
 */
function desescapar(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function tramos(texto: string, patron: RegExp): Array<[number, number]> {
  const re = new RegExp(patron.source, 'g');
  const out: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) out.push([m.index, m.index + m[0].length]);
  return out;
}

/** El texto plano de un párrafo, juntando todos sus fragmentos. */
export function paragraphText(p: string): string {
  const re = new RegExp(WT.source, 'g');
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(p))) out += m[2];
  return desescapar(out);
}

/**
 * Mete un texto en un párrafo.
 *
 * Word parte una frase en varios fragmentos (`w:r`) en cuanto cambia algo del
 * formato, incluso a mitad de palabra. Así que el texto entero va al primero y
 * los demás se vacían: se conserva el formato del párrafo y no quedan restos
 * del texto viejo por el camino.
 */
export function setParagraphText(p: string, texto: string): string {
  const re = new RegExp(WT.source, 'g');
  const trozos: string[] = [];
  let last = 0;
  let primero = true;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p))) {
    trozos.push(p.slice(last, m.index));
    trozos.push(`<w:t xml:space="preserve">${primero ? escapar(texto) : ''}</w:t>`);
    last = m.index + m[0].length;
    primero = false;
  }
  if (!primero) {
    trozos.push(p.slice(last));
    return trozos.join('');
  }

  // Párrafo vacío: no hay dónde meter el texto, así que se añade un fragmento.
  // Hereda el formato declarado en `w:pPr/w:rPr` si lo hay, que es el que Word
  // aplicaría a lo que escribieras ahí tú mismo.
  const rpr = /<w:pPr>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)[\s\S]*?<\/w:pPr>/.exec(p);
  const run = `<w:r>${rpr ? rpr[1] : ''}<w:t xml:space="preserve">${escapar(texto)}</w:t></w:r>`;
  const cierre = p.lastIndexOf('</w:p>');
  return p.slice(0, cierre) + run + p.slice(cierre);
}

/** Reescribe una celda con un párrafo por valor, usando el primero de plantilla. */
export function setCellText(celda: string, valores: string[]): string {
  const parrafos = tramos(celda, WP);
  if (parrafos.length === 0) return celda;
  const plantilla = celda.slice(parrafos[0][0], parrafos[0][1]);
  const nuevos = valores.map((v) => setParagraphText(plantilla, v)).join('');
  return celda.slice(0, parrafos[0][0]) + nuevos + celda.slice(parrafos[parrafos.length - 1][1]);
}

/**
 * El documento abierto, con las operaciones que hacen falta para rellenarlo.
 *
 * Las tablas, filas y celdas se direccionan por número de orden. Es frágil
 * frente a un cambio de plantilla, y por eso `earo.ts` comprueba antes que la
 * plantilla es la que espera: es preferible negarse a generar el documento
 * que generar uno con los datos en las casillas equivocadas.
 */
export class DocxDocument {
  constructor(private xml: string) {}

  toString(): string {
    return this.xml;
  }

  tableCount(): number {
    return tramos(this.xml, TBL).length;
  }

  rowCount(tabla: number): number {
    const [s, e] = tramos(this.xml, TBL)[tabla];
    return tramos(this.xml.slice(s, e), TR).length;
  }

  /** El texto de una celda, para poder comprobar que la plantilla es la buena. */
  cellText(tabla: number, fila: number, celda: number): string {
    const [ts, te] = tramos(this.xml, TBL)[tabla];
    const t = this.xml.slice(ts, te);
    const [rs, re] = tramos(t, TR)[fila];
    const r = t.slice(rs, re);
    const [cs, ce] = tramos(r, TC)[celda];
    const c = r.slice(cs, ce);
    return tramos(c, WP)
      .map(([a, b]) => paragraphText(c.slice(a, b)))
      .join(' ')
      .trim();
  }

  setCell(tabla: number, fila: number, celda: number, valores: string[]): void {
    const [ts, te] = tramos(this.xml, TBL)[tabla];
    const t = this.xml.slice(ts, te);
    const [rs, re] = tramos(t, TR)[fila];
    const r = t.slice(rs, re);
    const [cs, ce] = tramos(r, TC)[celda];
    const nuevaFila = r.slice(0, cs) + setCellText(r.slice(cs, ce), valores) + r.slice(ce);
    const nuevaTabla = t.slice(0, rs) + nuevaFila + t.slice(re);
    this.xml = this.xml.slice(0, ts) + nuevaTabla + this.xml.slice(te);
  }

  dropRows(tabla: number, filas: number[]): void {
    const [ts, te] = tramos(this.xml, TBL)[tabla];
    let t = this.xml.slice(ts, te);
    for (const fila of [...filas].sort((a, b) => b - a)) {
      const [rs, re] = tramos(t, TR)[fila];
      t = t.slice(0, rs) + t.slice(re);
    }
    this.xml = this.xml.slice(0, ts) + t + this.xml.slice(te);
  }

  /** Deja `copias` duplicados de una fila justo detrás de ella. */
  cloneRow(tabla: number, fila: number, copias: number): void {
    if (copias <= 0) return;
    const [ts, te] = tramos(this.xml, TBL)[tabla];
    const t = this.xml.slice(ts, te);
    const [rs, re] = tramos(t, TR)[fila];
    const nueva = t.slice(0, re) + t.slice(rs, re).repeat(copias) + t.slice(re);
    this.xml = this.xml.slice(0, ts) + nueva + this.xml.slice(te);
  }

  /**
   * Sustituye el párrafo cuyo texto empieza por `prefijo`. Devuelve false si no
   * aparece, para que quien llama pueda decidir si eso invalida el documento.
   */
  setParagraph(prefijo: string, texto: string): boolean {
    for (const [s, e] of tramos(this.xml, WP)) {
      if (paragraphText(this.xml.slice(s, e)).trim().startsWith(prefijo)) {
        this.xml = this.xml.slice(0, s) + setParagraphText(this.xml.slice(s, e), texto) + this.xml.slice(e);
        return true;
      }
    }
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Entrada y salida                                                    */
/* ------------------------------------------------------------------ */

const DOCUMENTO = 'word/document.xml';

export function openDocx(bytes: Uint8Array): { entries: ZipEntry[]; doc: DocxDocument } {
  const entries = readZip(bytes);
  const documento = entries.find((e) => e.name === DOCUMENTO);
  if (!documento) throw new Error('La plantilla no contiene word/document.xml.');
  return { entries, doc: new DocxDocument(dec.decode(documento.data)) };
}

export function saveDocx(entries: ZipEntry[], doc: DocxDocument): Uint8Array {
  return writeZip(
    entries.map((e) => (e.name === DOCUMENTO ? { name: e.name, data: enc.encode(doc.toString()) } : e)),
  );
}
