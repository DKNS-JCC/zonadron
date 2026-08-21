/**
 * Los archivos de la carpeta de documentos, en disco.
 *
 * Todo vive dentro del almacenamiento privado de la app
 * (`.../zonadron/documentos/`), no en la caché: la caché la borra el sistema
 * cuando le hace falta sitio, y un seguro que desaparece solo el día que te
 * paran no sirve de nada. Nada sale de ahí salvo que el usuario le dé a abrir,
 * que es cuando se le pasa el archivo a otra app.
 *
 * Se guarda una copia, no una referencia: el archivo original puede estar en
 * una descarga que el usuario borre mañana, o en Drive sin conexión. Copiar
 * cuesta unos megas y es la única forma de que el papel esté en el campo.
 *
 * La ficha de cada archivo (nombre, categoría, caducidad) la lleva
 * `src/state/DocumentsContext.tsx`. Aquí sólo se copia, se borra y se abre.
 */

import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { newId } from '../logic/id';
import { extensionOf, type StoredDocument } from '../logic/documents';

/**
 * En el navegador no hay carpeta privada donde dejar nada: la app web sigue
 * sirviendo para consultar zonas, pero la carpeta de documentos es cosa del
 * móvil y se dice claramente en lugar de fallar a medias.
 */
export const documentsSupported = Platform.OS !== 'web';

function documentsDir(): Directory {
  const dir = new Directory(Paths.document, 'zonadron', 'documentos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** El archivo guardado de un documento, exista o no todavía. */
export function storedFile(storedName: string): File {
  return new File(documentsDir(), storedName);
}

export function storedUri(storedName: string): string {
  return storedFile(storedName).uri;
}

/** ¿Sigue estando el archivo? Una copia de seguridad restaurada puede no traerlo. */
export function storedExists(storedName: string): boolean {
  try {
    return storedFile(storedName).exists;
  } catch {
    return false;
  }
}

/** Lo que devuelve el selector una vez copiado a la carpeta de la app. */
export interface PickedFile {
  id: string;
  fileName: string;
  storedName: string;
  mimeType: string | null;
  size: number;
}

/**
 * Abre el selector del sistema y copia lo que se elija.
 *
 * Se usa el selector del sistema (SAF en Android, UIDocumentPicker en iOS) a
 * propósito: da acceso a lo que el usuario elija —incluida la galería o Drive—
 * sin pedir ni un permiso. Una app que promete no mirar nada tuyo no puede
 * empezar pidiendo acceso a todas tus fotos.
 *
 * Devuelve lista vacía si se cancela. Si algo falla al copiar, lanza: quien
 * llama enseña el aviso.
 */
export async function pickAndStore(): Promise<PickedFile[]> {
  if (!documentsSupported) return [];
  const res = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    type: '*/*',
  });
  if (res.canceled || !res.assets?.length) return [];

  const stored: PickedFile[] = [];
  for (const asset of res.assets) {
    const id = newId();
    const fileName = asset.name || `${id}`;
    const ext = extensionOf(fileName) || guessExtension(asset.mimeType ?? null);
    const storedName = ext ? `${id}.${ext}` : id;
    const source = new File(asset.uri);
    const target = new File(documentsDir(), storedName);
    source.copy(target);
    stored.push({
      id,
      fileName,
      storedName,
      mimeType: asset.mimeType ?? null,
      // El selector no siempre dice el tamaño; si no, se mira ya copiado.
      size: asset.size ?? target.size ?? 0,
    });
  }
  return stored;
}

/** Borra el archivo. Que ya no esté no es un error: el objetivo era ése. */
export function deleteStored(storedName: string): void {
  try {
    const file = storedFile(storedName);
    if (file.exists) file.delete();
  } catch {
    /* si no se deja borrar, la ficha desaparece igual y el archivo queda huérfano */
  }
}

export type OpenResult = 'ok' | 'missing' | 'unsupported';

/**
 * Enseña el documento con la hoja de compartir del sistema, que es la que sabe
 * abrir un PDF o una foto con la app que el usuario tenga. Desde ahí también
 * puede mandárselo a quien se lo pida — un `Linking.openURL` sobre un
 * `file://` no funciona en Android, así que esto no es un rodeo: es la manera.
 */
export async function openStored(doc: StoredDocument): Promise<OpenResult> {
  if (!documentsSupported) return 'unsupported';
  if (!storedExists(doc.storedName)) return 'missing';
  if (!(await Sharing.isAvailableAsync())) return 'unsupported';
  try {
    await Sharing.shareAsync(storedUri(doc.storedName), {
      mimeType: doc.mimeType ?? undefined,
      dialogTitle: doc.title,
    });
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

/** Extensión razonable cuando el archivo llega sin nombre útil. */
function guessExtension(mime: string | null): string {
  if (!mime) return '';
  const known: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/webp': 'webp',
    'text/plain': 'txt',
  };
  if (known[mime]) return known[mime];
  const sub = mime.split('/')[1] ?? '';
  return /^[a-z0-9]{1,8}$/.test(sub) ? sub : '';
}
