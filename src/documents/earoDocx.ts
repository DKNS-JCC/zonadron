/**
 * Genera la EARO rellena a partir de la plantilla oficial de ENAIRE.
 *
 * La plantilla va empaquetada con la app (`assets/earo-abierta.docx`), así que
 * esto funciona sin cobertura: el mismo criterio que el resto de la carpeta de
 * documentos, donde lo que importa es que el papel esté cuando estás en el
 * campo y no cuando tienes wifi.
 *
 * El relleno lo hacen `src/logic/docx.ts` y `src/logic/earo.ts`, que son puros.
 * Aquí sólo está lo que depende del móvil: leer el asset, escribir el fichero
 * y pasárselo a la hoja de compartir.
 */

import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { canFillDocx, openDocx, saveDocx } from '../logic/docx';
import { checkTemplate, fillEaro, type EaroContext } from '../logic/earo';

/** En el navegador no hay dónde dejar el fichero ni con qué compartirlo. */
export const earoSupported = Platform.OS !== 'web';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const TEMPLATE = require('../../assets/earo-abierta.docx');

/** La plantilla se lee una vez por sesión: son 638 KB y no cambia. */
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

/**
 * `EARO-Matacan-2026-08-31.docx`. Lleva el gestor dentro del nombre porque una
 * EARO es por ConOps y por dependencia: quien vuela en dos aeródromos acaba
 * con dos, y distinguirlas por la fecha sola es pedir un disgusto.
 */
function outputName(atspName: string, date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const fecha = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const gestor = atspName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // se van las tildes: el nombre es de fichero
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return gestor ? `EARO-${gestor}-${fecha}.docx` : `EARO-${fecha}.docx`;
}

export type EaroResult =
  | { ok: true; uri: string; fileName: string }
  | { ok: false; reason: 'unsupported' | 'template' | 'write' };

/**
 * Rellena la EARO y la deja en la carpeta privada de la app.
 *
 * No comparte ni abre nada: eso lo decide quien llama, porque compartir saca
 * el documento de la app y esa es una acción del usuario, no un efecto
 * colateral de generarlo.
 */
export async function generateEaro(
  ctx: EaroContext,
  now: Date = new Date(),
): Promise<EaroResult> {
  if (!earoSupported) return { ok: false, reason: 'unsupported' };

  let template: Uint8Array;
  try {
    template = await loadTemplate();
  } catch {
    return { ok: false, reason: 'template' };
  }

  // Si la plantilla empaquetada no es la que espera el mapeo de casillas, se
  // dice. Un documento con los datos en el sitio equivocado es peor que no
  // tener documento: se firma sin leerlo y se manda.
  if (!canFillDocx(template)) return { ok: false, reason: 'template' };

  let bytes: Uint8Array;
  try {
    const { entries, doc } = openDocx(template);
    if (!checkTemplate(doc)) return { ok: false, reason: 'template' };
    fillEaro(doc, ctx);
    bytes = saveDocx(entries, doc);
  } catch {
    return { ok: false, reason: 'template' };
  }

  try {
    const file = new File(outputDir(), outputName(ctx.atspName, now));
    if (file.exists) file.delete();
    file.create();
    file.write(bytes);
    return { ok: true, uri: file.uri, fileName: file.name };
  } catch {
    return { ok: false, reason: 'write' };
  }
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Pasa la EARO a la hoja de compartir del sistema. */
export async function shareEaro(uri: string): Promise<boolean> {
  if (!earoSupported) return false;
  if (!(await Sharing.isAvailableAsync())) return false;
  try {
    await Sharing.shareAsync(uri, {
      mimeType: DOCX_MIME,
      dialogTitle: 'Evaluación y atenuación del riesgo operacional (EARO)',
      UTI: 'org.openxmlformats.wordprocessingml.document',
    });
    return true;
  } catch {
    return false;
  }
}
