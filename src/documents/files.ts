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
import { getContentUriAsync, readAsStringAsync, StorageAccessFramework } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as IntentLauncher from 'expo-intent-launcher';
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

/**
 * Copia a la carpeta un archivo que ya está en el móvil.
 *
 * Lo usa lo que genera la propia app —hoy la EARO— para poder archivarse junto
 * al resto de papeles sin pasar por el selector de documentos, que sería pedirle
 * al usuario que buscase un fichero que acabamos de escribir nosotros.
 */
export function storeExistingFile(uri: string, fileName: string, mimeType: string | null): PickedFile | null {
  if (!documentsSupported) return null;
  try {
    const id = newId();
    const ext = extensionOf(fileName) || guessExtension(mimeType);
    const storedName = ext ? `${id}.${ext}` : id;
    const target = new File(documentsDir(), storedName);
    new File(uri).copy(target);
    return { id, fileName, storedName, mimeType, size: target.size ?? 0 };
  } catch {
    return null;
  }
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
 * Abre el documento con el visor del sistema.
 *
 * Antes esto llamaba a la hoja de compartir, que es lo que hay a mano en Expo
 * pero no es lo que la gente espera: para leer un PDF te ofrecía mandárselo a
 * alguien. En Android se lanza ahora un ACTION_VIEW con un `content://` y el
 * permiso de lectura, que es lo que abre el visor de PDF que tengas puesto. En
 * iOS la hoja de compartir SÍ es el visor —la vista previa de Quick Look sale
 * ahí dentro—, así que allí se deja como estaba.
 *
 * Un `Linking.openURL` sobre un `file://` no vale: Android lo rechaza desde
 * hace años porque el otro proceso no puede leer nuestro almacenamiento.
 */
export async function openFile(uri: string, mimeType: string | null): Promise<OpenResult> {
  if (!documentsSupported) return 'unsupported';
  if (Platform.OS === 'android') {
    try {
      const content = await getContentUriAsync(uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: content,
        // FLAG_GRANT_READ_URI_PERMISSION: sin esto el visor abre en blanco.
        flags: 1,
        type: mimeType ?? undefined,
      });
      return 'ok';
    } catch {
      // Sin ninguna app capaz de abrirlo, la hoja de compartir al menos deja
      // hacer algo con el archivo en vez de no hacer nada.
      return shareFile(uri, mimeType, '');
    }
  }
  return shareFile(uri, mimeType, '');
}

export async function openStored(doc: StoredDocument): Promise<OpenResult> {
  if (!documentsSupported) return 'unsupported';
  if (!storedExists(doc.storedName)) return 'missing';
  return openFile(storedUri(doc.storedName), doc.mimeType);
}

async function shareFile(uri: string, mimeType: string | null, title: string): Promise<OpenResult> {
  if (!(await Sharing.isAvailableAsync())) return 'unsupported';
  try {
    await Sharing.shareAsync(uri, {
      mimeType: mimeType ?? undefined,
      dialogTitle: title || undefined,
    });
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

/** Manda el documento a otra persona o a otra app. */
export async function shareStored(doc: StoredDocument): Promise<OpenResult> {
  if (!documentsSupported) return 'unsupported';
  if (!storedExists(doc.storedName)) return 'missing';
  return shareFile(storedUri(doc.storedName), doc.mimeType, doc.title);
}

export type SaveResult = 'ok' | 'cancelled' | 'missing' | 'unsupported' | 'error';

/**
 * Guarda una copia donde el usuario diga, fuera de la app.
 *
 * Es lo que falta cuando lo único que hay es «compartir»: un papel que sólo
 * vive dentro de la app se pierde con la app. En Android se usa el marco de
 * acceso al almacenamiento —eliges carpeta una vez y el archivo aparece en
 * Descargas o donde tú digas—; en iOS la hoja de compartir ya trae «Guardar en
 * Archivos», que es exactamente esto y no hay API mejor.
 */
export async function saveToDevice(
  uri: string,
  fileName: string,
  mimeType: string | null,
): Promise<SaveResult> {
  if (!documentsSupported) return 'unsupported';

  if (Platform.OS !== 'android') {
    const res = await shareFile(uri, mimeType, fileName);
    return res === 'ok' ? 'ok' : 'unsupported';
  }

  let permiso;
  try {
    permiso = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  } catch {
    return 'error';
  }
  if (!permiso.granted) return 'cancelled';

  try {
    const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
    const destino = await StorageAccessFramework.createFileAsync(
      permiso.directoryUri,
      fileName,
      mimeType ?? 'application/octet-stream',
    );
    await StorageAccessFramework.writeAsStringAsync(destino, base64, { encoding: 'base64' });
    return 'ok';
  } catch {
    return 'error';
  }
}

/** Guarda en el móvil un documento de la carpeta. */
export async function saveStored(doc: StoredDocument): Promise<SaveResult> {
  if (!documentsSupported) return 'unsupported';
  if (!storedExists(doc.storedName)) return 'missing';
  return saveToDevice(storedUri(doc.storedName), doc.fileName || doc.storedName, doc.mimeType);
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
