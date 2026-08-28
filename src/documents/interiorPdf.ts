/**
 * Genera el impreso de comunicación al Ministerio del Interior, relleno.
 *
 * La plantilla oficial va empaquetada con la app (`assets/`), así que esto
 * funciona sin cobertura: es el mismo criterio que el resto de la carpeta de
 * documentos, donde lo que importa es que el papel esté cuando estás en el
 * campo y no cuando tienes wifi.
 *
 * El relleno en sí lo hace `src/logic/pdfForm.ts`, que es puro. Aquí sólo está
 * lo que depende del móvil: leer el asset, escribir el resultado y pasárselo a
 * la hoja de compartir.
 */

import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { canFillForm, fillPdfForm } from '../logic/pdfForm';
import { buildInteriorFields, type InteriorContext } from '../logic/interior';

/** En el navegador no hay dónde dejar el fichero ni con qué compartirlo. */
export const interiorPdfSupported = Platform.OS !== 'web';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TEMPLATE = require('../../assets/comunicacion-interior.pdf');

/** La plantilla se lee una vez por sesión: son 335 KB y no cambia. */
let templateCache: Uint8Array | null = null;

async function loadTemplate(): Promise<Uint8Array> {
  if (templateCache) return templateCache;
  const asset = Asset.fromModule(TEMPLATE);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const bytes = await new File(uri).bytes();
  templateCache = bytes;
  return bytes;
}

function outputDir(): Directory {
  const dir = new Directory(Paths.document, 'zonadron', 'tramites');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** `comunicacion-interior-2026-08-24.pdf`, para que se distingan en la carpeta. */
function outputName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `comunicacion-interior-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.pdf`;
}

export type InteriorPdfResult =
  | { ok: true; uri: string; fileName: string; filled: number }
  | { ok: false; reason: 'unsupported' | 'template' | 'write' };

/**
 * Rellena el impreso y lo deja en la carpeta privada de la app.
 *
 * No comparte ni abre nada: eso lo decide quien llama, porque compartir saca el
 * documento de la app y esa es una acción del usuario, no un efecto colateral
 * de generarlo.
 */
export async function generateInteriorPdf(ctx: InteriorContext): Promise<InteriorPdfResult> {
  if (!interiorPdfSupported) return { ok: false, reason: 'unsupported' };

  let template: Uint8Array;
  try {
    template = await loadTemplate();
  } catch {
    return { ok: false, reason: 'template' };
  }

  // Si algún día el Ministerio publica una plantilla que este relleno no sepa
  // tratar, es mejor decirlo que entregar un PDF corrupto.
  if (!canFillForm(template)) return { ok: false, reason: 'template' };

  const { bytes, filled } = fillPdfForm(template, buildInteriorFields(ctx));

  try {
    const file = new File(outputDir(), outputName(ctx.now));
    if (file.exists) file.delete();
    file.create();
    file.write(bytes);
    return { ok: true, uri: file.uri, fileName: file.name, filled: filled.length };
  } catch {
    return { ok: false, reason: 'write' };
  }
}

/** Pasa el impreso a la hoja de compartir del sistema. */
export async function shareInteriorPdf(uri: string): Promise<boolean> {
  if (!interiorPdfSupported) return false;
  if (!(await Sharing.isAvailableAsync())) return false;
  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Comunicación al Ministerio del Interior',
      UTI: 'com.adobe.pdf',
    });
    return true;
  } catch {
    return false;
  }
}
