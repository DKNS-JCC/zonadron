/**
 * Los mensajes que publica ENAIRE vienen en HTML pensado para un navegador
 * (con <p>, <b>, <font color> e incluso etiquetas propias como <elem>).
 * Aquí lo convertimos a texto plano legible SIN alterar el contenido:
 * sólo se elimina el marcado y se normaliza el espaciado.
 */

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&ordm;': 'º',
  '&ordf;': 'ª',
  '&deg;': '°',
  '&aacute;': 'á',
  '&eacute;': 'é',
  '&iacute;': 'í',
  '&oacute;': 'ó',
  '&uacute;': 'ú',
  '&ntilde;': 'ñ',
  '&Aacute;': 'Á',
  '&Eacute;': 'É',
  '&Iacute;': 'Í',
  '&Oacute;': 'Ó',
  '&Uacute;': 'Ú',
  '&Ntilde;': 'Ñ',
  '&uuml;': 'ü',
  '&Uuml;': 'Ü',
  '&hellip;': '…',
  '&mdash;': '—',
  '&ndash;': '–',
};

export function decodeEntities(input: string): string {
  let out = input;
  for (const [entity, char] of Object.entries(ENTITIES)) {
    out = out.split(entity).join(char);
  }
  out = out.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  out = out.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  return out;
}

/** Convierte el HTML de ENAIRE en texto plano con saltos de párrafo. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  let s = String(html);

  // Saltos explícitos y bloques -> nueva línea
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, '\n');
  s = s.replace(/<\s*(p|div|tr|h[1-6])(\s[^>]*)?>/gi, '\n');
  s = s.replace(/<\s*li(\s[^>]*)?>/gi, '\n• ');

  // Resto de etiquetas fuera (incluidas las propias de ENAIRE, p.ej. <elem>)
  s = s.replace(/<[^>]*>/g, '');

  s = decodeEntities(s);

  // Normalización de espaciado
  s = s.replace(/\r/g, '');
  s = s.replace(/[ \t]+/g, ' ');
  s = s.replace(/ *\n */g, '\n');
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

/** Divide el texto oficial en párrafos para pintarlos con espaciado correcto. */
export function toParagraphs(text: string): string[] {
  return text
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Extrae las frases del mensaje oficial que contienen datos accionables
 * concretos (contacto, niveles, notas), para poder destacarlas.
 */
export function extractLabelled(text: string, label: string): string | null {
  const re = new RegExp(`${label}\\s*:\\s*([^\\n]*)`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const value = m[1].trim();
  return value.length > 0 ? value : null;
}
