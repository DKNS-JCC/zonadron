/**
 * Comprobación de enlaces compartidos, contra la red de verdad.
 *
 * Google cambia cada poco el formato de sus enlaces de Maps, y cuando lo hace
 * la app deja de reconocer el sitio compartido sin que ninguna prueba unitaria
 * se entere: las de `tests/sharedPoint.test.ts` comprueban el análisis del
 * texto, no lo que contesta Google hoy. Esto resuelve enlaces reales de
 * principio a fin y enseña qué sale.
 *
 *   npx tsx scripts/verificar-enlaces.ts                        (la batería fija)
 *   npx tsx scripts/verificar-enlaces.ts "https://maps.app.goo.gl/…"  (los tuyos)
 *
 * Un punto marcado como «aproximado» no es un fallo: es que el enlace no
 * llevaba coordenadas y se ha sacado del nombre o del encuadre. La app avisa
 * de ello. Un `null`, en cambio, es un enlace que el usuario comparte y la app
 * rechaza: eso sí hay que mirarlo.
 */

import { resolveSharedPoint } from '../src/logic/sharedPoint';

/** Formatos que hemos visto salir del botón de compartir de Maps. */
const BATERIA = [
  // Chincheta con ficha de sitio (enlace corto de la app de Android/iOS).
  'https://maps.app.goo.gl/yhsVbc1Fy6z1cs926',
  // Chincheta suelta: las coordenadas van en la propia ruta.
  'https://www.google.com/maps/search/40.9819235,+-5.6632237',
  // Enlace largo con la chincheta en los datos.
  'https://www.google.com/maps/place/Catedral+de+Salamanca/@40.9600,-5.6664,17z/data=!3m1!4b1!4m6!3m5!8m2!3d40.9601!4d-5.6656',
  // Sólo el identificador del sitio: no hay coordenadas por ningún lado.
  'https://maps.google.com/?cid=5091404763919886719',
  // Apple Maps.
  'https://maps.apple.com/?ll=40.9601,-5.6656&q=Catedral',
];

function describir(punto: Awaited<ReturnType<typeof resolveSharedPoint>>): string {
  if (!punto) return 'NO RECONOCIDO';
  const donde = `${punto.lat.toFixed(6)}, ${punto.lon.toFixed(6)}`;
  const nombre = punto.label ? ` · ${punto.label}` : '';
  return `${donde}${nombre}${punto.approximate ? ' · APROXIMADO' : ''}`;
}

async function main() {
  const enlaces = process.argv.slice(2);
  const lista = enlaces.length > 0 ? enlaces : BATERIA;
  let fallos = 0;

  for (const enlace of lista) {
    const t0 = Date.now();
    let punto: Awaited<ReturnType<typeof resolveSharedPoint>> = null;
    try {
      punto = await resolveSharedPoint(enlace);
    } catch (e) {
      console.log(`✗ ${enlace}\n  ERROR ${(e as Error).message}`);
      fallos++;
      continue;
    }
    if (!punto) fallos++;
    console.log(`${punto ? '·' : '✗'} ${enlace}`);
    console.log(`  ${describir(punto)}  (${Date.now() - t0} ms)`);
  }

  console.log(`\n${lista.length - fallos}/${lista.length} enlaces resueltos.`);
  if (fallos > 0) process.exitCode = 1;
}

main();
