/**
 * Carpeta de documentos.
 *
 * Volar legal en España es, en buena parte, llevar papeles encima: el
 * certificado de piloto A1/A3, el registro de operador, el seguro, la
 * declaración de conformidad del aparato. Cuando te paran en mitad del campo
 * no hay cobertura para bajarlos del correo, así que la app los guarda en el
 * móvil y ya está.
 *
 * Aquí vive el modelo y las cuentas (categorías, caducidades, tamaños). El
 * archivo en disco lo mueve `src/documents/files.ts` y la lista guardada la
 * lleva `src/state/DocumentsContext.tsx`: este módulo es puro y se puede
 * probar sin móvil.
 */

import { dateLocale, t } from '../i18n';

/** Para qué sirve el papel. Sólo ordena y filtra: no cambia nada legal. */
export type DocCategory = 'operador' | 'piloto' | 'dron' | 'seguro' | 'otro';

export const DOC_CATEGORIES: { id: DocCategory; icon: string }[] = [
  { id: 'piloto', icon: 'person-outline' },
  { id: 'operador', icon: 'id-card-outline' },
  { id: 'dron', icon: 'hardware-chip-outline' },
  { id: 'seguro', icon: 'shield-outline' },
  { id: 'otro', icon: 'document-outline' },
];

const VALID_CATEGORIES: DocCategory[] = ['operador', 'piloto', 'dron', 'seguro', 'otro'];

export function docCategoryLabel(id: DocCategory): string {
  return id === 'operador'
    ? t('docs.category.operador')
    : id === 'piloto'
      ? t('docs.category.piloto')
      : id === 'dron'
        ? t('docs.category.dron')
        : id === 'seguro'
          ? t('docs.category.seguro')
          : t('docs.category.otro');
}

export function docCategoryIcon(id: DocCategory): string {
  return DOC_CATEGORIES.find((c) => c.id === id)?.icon ?? 'document-outline';
}

export interface StoredDocument {
  id: string;
  /** Cómo lo llamas tú. Por defecto, el nombre del archivo sin extensión. */
  title: string;
  category: DocCategory;
  /**
   * De quién es el papel: null = tuyo (piloto u operador); si no, el id del
   * dron al que pertenece. Es lo que permite tener cinco seguros distintos sin
   * confundirlos.
   */
  droneId: string | null;
  /** Nombre original del archivo, tal y como venía. */
  fileName: string;
  /** Nombre con el que está guardado dentro de la app (`id` + extensión). */
  storedName: string;
  mimeType: string | null;
  /** Tamaño en bytes. 0 cuando el sistema no lo dice. */
  size: number;
  addedAt: string;
  /** Fecha de caducidad en formato AAAA-MM-DD, o null si no caduca. */
  expiresAt: string | null;
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Caducidades                                                         */
/* ------------------------------------------------------------------ */

/** Un mes de aviso: da tiempo a renovar un seguro o un certificado sin prisas. */
export const EXPIRY_WARNING_DAYS = 30;

export type DocStatus = 'sinFecha' | 'vigente' | 'porCaducar' | 'caducado';

/** AAAA-MM-DD → milisegundos UTC, o null si esa fecha no existe. */
function parseIsoDate(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const back = new Date(ms);
  // El 31 de febrero se convertiría solo en el 3 de marzo: eso no es una fecha.
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return ms;
}

/** Días que faltan para una fecha AAAA-MM-DD. Negativo si ya pasó. */
export function daysUntil(dateIso: string, now: Date = new Date()): number | null {
  const target = parseIsoDate(dateIso);
  if (target === null) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function documentStatus(doc: StoredDocument, now: Date = new Date()): DocStatus {
  if (!doc.expiresAt) return 'sinFecha';
  const days = daysUntil(doc.expiresAt, now);
  if (days === null) return 'sinFecha';
  if (days < 0) return 'caducado';
  return days <= EXPIRY_WARNING_DAYS ? 'porCaducar' : 'vigente';
}

/** Los que hay que renovar ya: caducados primero, luego los que están al caer. */
export function expiringDocuments(
  docs: StoredDocument[],
  now: Date = new Date(),
): StoredDocument[] {
  return docs
    .filter((d) => {
      const s = documentStatus(d, now);
      return s === 'caducado' || s === 'porCaducar';
    })
    .sort((a, b) => (a.expiresAt ?? '').localeCompare(b.expiresAt ?? ''));
}

/* ------------------------------------------------------------------ */
/* Fechas escritas a mano                                              */
/* ------------------------------------------------------------------ */

/**
 * Lo que teclea el usuario (DD/MM/AAAA, con barras, guiones o puntos) pasado a
 * AAAA-MM-DD. Devuelve null si no hay forma de entenderlo; la cadena vacía la
 * filtra quien llama, porque «sin fecha» no es un error.
 */
export function parseDateInput(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const m = /^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2,4})$/.exec(raw);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const iso = `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
  return parseIsoDate(iso) === null ? null : iso;
}

/** AAAA-MM-DD → lo que se enseña en un campo: DD/MM/AAAA. */
export function formatDateInput(iso: string | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** AAAA-MM-DD → fecha larga en el idioma de la app. */
export function formatDateLong(iso: string | null): string {
  const ms = iso ? parseIsoDate(iso) : null;
  if (ms === null) return '';
  return new Date(ms).toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/* ------------------------------------------------------------------ */
/* Archivos                                                            */
/* ------------------------------------------------------------------ */

/** Tamaño legible. Sin decimales en bytes y kilobytes: no aportan nada. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} kB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

/** Extensión en minúsculas y sin punto, o cadena vacía si el nombre no la trae. */
export function extensionOf(fileName: string): string {
  const clean = fileName.split(/[?#]/)[0];
  const dot = clean.lastIndexOf('.');
  if (dot <= 0 || dot === clean.length - 1) return '';
  const ext = clean.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

/** Título por defecto: el nombre del archivo sin la extensión. */
export function titleFromFileName(fileName: string): string {
  const ext = extensionOf(fileName);
  const base = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;
  return base.trim() || fileName;
}

/** Icono según el tipo de archivo: se reconoce antes por la forma que leyendo. */
export function fileIcon(doc: StoredDocument): string {
  const ext = extensionOf(doc.fileName);
  const mime = doc.mimeType ?? '';
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'heic', 'webp'].includes(ext)) {
    return 'image-outline';
  }
  if (mime === 'application/pdf' || ext === 'pdf') return 'document-text-outline';
  return 'document-outline';
}

/* ------------------------------------------------------------------ */
/* Persistencia                                                        */
/* ------------------------------------------------------------------ */

/** Un documento leído de disco, con todo lo que falte puesto a un valor sano. */
export function normaliseDocument(raw: unknown): StoredDocument | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const storedName = typeof r.storedName === 'string' ? r.storedName : '';
  const id = typeof r.id === 'string' ? r.id : '';
  // Sin id o sin archivo la ficha no apunta a nada: mejor tirarla que enseñar
  // una fila que no se puede abrir.
  if (!id || !storedName) return null;
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const size = Number(r.size);
  const expires = typeof r.expiresAt === 'string' ? r.expiresAt : null;
  return {
    id,
    title: text(r.title) || titleFromFileName(text(r.fileName) || storedName),
    category: VALID_CATEGORIES.includes(r.category as DocCategory)
      ? (r.category as DocCategory)
      : 'otro',
    droneId: typeof r.droneId === 'string' && r.droneId ? r.droneId : null,
    fileName: text(r.fileName) || storedName,
    storedName,
    mimeType: typeof r.mimeType === 'string' ? r.mimeType : null,
    size: Number.isFinite(size) && size > 0 ? size : 0,
    addedAt: text(r.addedAt) || new Date().toISOString(),
    expiresAt: expires && parseIsoDate(expires) !== null ? expires : null,
    notes: text(r.notes),
  };
}

/**
 * Orden de la lista: primero lo que caduca (y lo ya caducado del todo arriba),
 * luego lo demás por fecha de guardado. Lo urgente no se busca, aparece.
 */
export function sortDocuments(docs: StoredDocument[], now: Date = new Date()): StoredDocument[] {
  const rank = (d: StoredDocument) => {
    const s = documentStatus(d, now);
    return s === 'caducado' ? 0 : s === 'porCaducar' ? 1 : 2;
  };
  return [...docs].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra < 2) return (a.expiresAt ?? '').localeCompare(b.expiresAt ?? '');
    return b.addedAt.localeCompare(a.addedAt);
  });
}
