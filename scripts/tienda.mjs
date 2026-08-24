// Recursos gráficos de la ficha de Google Play.
//
// Uso:  npm run tienda
//
// Genera en docs/tienda/:
//   · icono-512.png            el icono al tamaño exacto que pide la tienda
//   · destacado-1024x500.png   el gráfico destacado, obligatorio para publicar
//
// Se dibujan con el navegador y no con un editor a propósito: así el gráfico
// destacado sale de los mismos colores y la misma tipografía que la app, y
// cuando cambie la marca se regenera con una orden en vez de abrir un programa
// de diseño y acordarse de los valores.
//
// Playwright no es dependencia de producción; si falta:
//   npm i -D playwright && npx playwright install chromium

import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Falta Playwright. Instálalo con: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const SALIDA = 'docs/tienda';
const ICONO = resolve('assets/icon.png');

if (!existsSync(ICONO)) {
  console.error(`No se encuentra el icono en ${ICONO}`);
  process.exit(1);
}

// El icono va incrustado como data URI y no como file://: la página se carga
// con setContent, o sea desde about:blank, y Chromium bloquea los recursos
// locales de un origen que no es file. Salía un icono roto.
const iconoUrl = `data:image/png;base64,${(await readFile(ICONO)).toString('base64')}`;

// Los mismos colores que la app en oscuro (ver src/theme.ts y app.json).
const FONDO = '#0B1220';
const ACENTO = '#3B90FF';

const TIPO =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** El icono, a secas, al tamaño que pide la tienda. */
const paginaIcono = `
<style>
  html, body { margin: 0; background: ${FONDO}; }
  img { display: block; }
</style>
<body><img src="${iconoUrl}" width="512" height="512"></body>`;

/**
 * Gráfico destacado. Sale detrás del nombre en la ficha y en las
 * recomendaciones, a veces recortado por los lados y con el botón de instalar
 * encima: por eso el texto va centrado, grande y lejos de los bordes, y no hay
 * capturas diminutas dentro.
 */
const paginaDestacado = `
<style>
  html, body { margin: 0; }
  .lienzo {
    width: 1024px; height: 500px; box-sizing: border-box;
    background: radial-gradient(120% 140% at 78% 18%, #16233d 0%, ${FONDO} 62%);
    display: flex; align-items: center; gap: 56px; padding: 0 72px;
    font-family: ${TIPO};
    color: #ffffff;
  }
  .icono { width: 208px; height: 208px; flex: none; border-radius: 46px; box-shadow: 0 18px 44px rgba(0,0,0,.45); }
  .nombre { font-size: 68px; font-weight: 800; letter-spacing: -.03em; line-height: 1; }
  .gancho { font-size: 31px; font-weight: 600; color: ${ACENTO}; margin-top: 16px; letter-spacing: -.01em; }
  .detalle { font-size: 22px; color: #c3ccdb; margin-top: 14px; line-height: 1.45; }
</style>
<body>
  <div class="lienzo">
    <img class="icono" src="${iconoUrl}">
    <div>
      <div class="nombre">Zona Dron</div>
      <div class="gancho">¿Puedes volar tu dron aquí?</div>
      <div class="detalle">Zonas geográficas UAS, altura libre<br>y consulta sin cobertura.</div>
    </div>
  </div>
</body>`;

await mkdir(SALIDA, { recursive: true });

const navegador = await chromium.launch();

async function pinta(html, ancho, alto, destino) {
  const pagina = await navegador.newPage({ viewport: { width: ancho, height: alto } });
  await pagina.setContent(html);
  // Sin canal alfa: Google Play rechaza el gráfico destacado si lo lleva, y una
  // captura de una página sin fondo sale transparente.
  await pagina.screenshot({ path: destino, omitBackground: false, type: 'png' });
  await pagina.close();
  console.log(`· ${destino}  (${ancho}x${alto})`);
}

await pinta(paginaIcono, 512, 512, `${SALIDA}/icono-512.png`);
await pinta(paginaDestacado, 1024, 500, `${SALIDA}/destacado-1024x500.png`);

await navegador.close();
console.log('\nListo. Los dos van en la ficha de Google Play (ver docs/play-store.md).');
