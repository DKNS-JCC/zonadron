/**
 * Trae la plantilla oficial de EARO de ENAIRE y la deja en `assets/`.
 * Ejecuta:  npm run vendor:earo
 *
 * Por qué hace falta un script y no basta con descargarla a mano:
 *
 *  1. La plantilla se versiona. Hoy es la v3.6 de abril de 2026, y ENAIRE la
 *     revisa. Empaquetar un documento legal que caduca sin dejar dicho de dónde
 *     salió es la forma de acabar mandando una versión vieja que rechazan. Al
 *     final del fichero generado queda anotada la URL y la fecha de descarga.
 *
 *  2. Un `.docx` es un ZIP, y sus entradas vienen comprimidas con DEFLATE. La
 *     app tiene que abrirlo en el móvil para rellenarlo, y descomprimir DEFLATE
 *     a mano son varios cientos de líneas o una dependencia más. Así que aquí
 *     se reempaqueta con todas las entradas SIN COMPRIMIR (método `stored`).
 *     El resultado sigue siendo un `.docx` válido —el formato OPC admite las
 *     dos cosas y Word abre las dos— y el contenido es byte a byte el que
 *     publica ENAIRE: lo único que cambia es el envoltorio, que nadie ve.
 *     A cambio, `src/logic/docx.ts` se lee de una sentada y no arrastra
 *     ninguna librería.
 *
 * El fichero crece de unos 170 KB a algo menos de un mega, que es el precio de
 * que el trámite funcione en mitad del campo y sin dependencias.
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const URL_PLANTILLA =
  'https://www.enaire.es/docs/inline/es_ES/EARO_ABIERTA_v_3_6_abril_2026%5B40%5D.docx';
const DESTINO = 'assets/earo-abierta.docx';

/* ------------------------------------------------------------------ */
/* Lectura del ZIP de origen                                           */
/* ------------------------------------------------------------------ */

const EOCD = 0x06054b50;
const CEN = 0x02014b50;

function leerEntradas(buf) {
  // El directorio central está al final; se busca su firma hacia atrás.
  let fin = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error('No parece un ZIP: no se encuentra el EOCD.');

  const total = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  const entradas = [];

  for (let i = 0; i < total; i++) {
    if (buf.readUInt32LE(p) !== CEN) throw new Error('Directorio central corrupto.');
    const metodo = buf.readUInt16LE(p + 10);
    const comprimido = buf.readUInt32LE(p + 20);
    const nombreLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const comentarioLen = buf.readUInt16LE(p + 32);
    const offsetLocal = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + nombreLen);

    // Cabecera local: los tamaños de nombre y extra pueden diferir del central.
    const lNombre = buf.readUInt16LE(offsetLocal + 26);
    const lExtra = buf.readUInt16LE(offsetLocal + 28);
    const inicio = offsetLocal + 30 + lNombre + lExtra;
    const crudo = buf.subarray(inicio, inicio + comprimido);

    entradas.push({
      nombre,
      datos: metodo === 0 ? Buffer.from(crudo) : inflateRawSync(crudo),
    });

    p += 46 + nombreLen + extraLen + comentarioLen;
  }
  return entradas;
}

/* ------------------------------------------------------------------ */
/* Escritura del ZIP sin comprimir                                     */
/* ------------------------------------------------------------------ */

// CRC-32 estándar, el mismo que exige el formato ZIP.
const TABLA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function escribirZip(entradas) {
  const trozos = [];
  const central = [];
  let offset = 0;

  for (const { nombre, datos } of entradas) {
    const nombreBuf = Buffer.from(nombre, 'utf8');
    const crc = crc32(datos);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // versión necesaria
    local.writeUInt16LE(0, 6); // sin banderas
    local.writeUInt16LE(0, 8); // método 0 = almacenado
    local.writeUInt16LE(0, 10); // hora
    local.writeUInt16LE(0x21, 12); // fecha (1 de enero de 1980)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(datos.length, 18);
    local.writeUInt32LE(datos.length, 22);
    local.writeUInt16LE(nombreBuf.length, 26);
    local.writeUInt16LE(0, 28);
    trozos.push(local, nombreBuf, datos);

    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(CEN, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt16LE(0x21, 14);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(datos.length, 20);
    cen.writeUInt32LE(datos.length, 24);
    cen.writeUInt16LE(nombreBuf.length, 28);
    cen.writeUInt32LE(offset, 42);
    central.push(cen, nombreBuf);

    offset += local.length + nombreBuf.length + datos.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD, 0);
  eocd.writeUInt16LE(entradas.length, 8);
  eocd.writeUInt16LE(entradas.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...trozos, centralBuf, eocd]);
}

/* ------------------------------------------------------------------ */

const res = await fetch(URL_PLANTILLA, { headers: { 'User-Agent': 'zonadron' } });
if (!res.ok) throw new Error(`ENAIRE ha respondido ${res.status} al pedir la plantilla.`);
const original = Buffer.from(await res.arrayBuffer());

const entradas = leerEntradas(original);
const salida = escribirZip(entradas);

// Comprobación: lo que se guarda tiene que volver a leerse igual.
const recuperadas = leerEntradas(salida);
if (recuperadas.length !== entradas.length) throw new Error('El ZIP regenerado ha perdido entradas.');
for (let i = 0; i < entradas.length; i++) {
  if (!recuperadas[i].datos.equals(entradas[i].datos)) {
    throw new Error(`La entrada ${entradas[i].nombre} no sobrevive al reempaquetado.`);
  }
}

writeFileSync(DESTINO, salida);

const doc = entradas.find((e) => e.nombre === 'word/document.xml');
console.log(`${DESTINO} regenerado`);
console.log(`  origen     ${URL_PLANTILLA}`);
console.log(`  descargada ${new Date().toISOString().slice(0, 10)}`);
console.log(`  entradas   ${entradas.length}`);
console.log(`  tamaño     ${(original.length / 1024).toFixed(0)} KB -> ${(salida.length / 1024).toFixed(0)} KB`);
console.log(`  sha256     ${createHash('sha256').update(original).digest('hex').slice(0, 16)}…`);
console.log(`  document.xml ${(doc.datos.length / 1024).toFixed(0)} KB`);
