// Capturas de todas las pantallas en claro y oscuro, contra los servicios reales.
//
// Uso:  npm run web:export  &&  npm run capturas [idioma] [carpeta-de-salida]
//
// El idioma es 'es' (por defecto) o 'en': se deja puesto en el almacenamiento
// del navegador antes de cargar la app, igual que si lo hubieras elegido en
// Ajustes. Por defecto salen en docs/capturas/<idioma>/.
//
// Playwright no es una dependencia del proyecto (se lleva un navegador entero
// detrás). Si no está instalado:  npm i -D playwright && npx playwright install chromium
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  console.error('Falta Playwright. Instálalo con: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const DIST = 'dist';
// Puerto libre que elige el sistema: un número fijo choca con cualquier otro
// servidor de desarrollo que estuviera levantado.
let port = 0;
const LANG = process.argv[2] === 'en' ? 'en' : 'es';
const OUT = process.argv[3] ?? join('docs/capturas', LANG);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = join(DIST, normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
port = server.address().port;
await mkdir(OUT, { recursive: true });

// Punto libre (campo de Toledo) y punto que exige autorización (junto a Barajas).
const LIBRE = { lat: 39.7, lon: -4.1 };
const AUTH = { lat: 40.4718, lon: -3.5626 };

const PAGES = [
  ['home', '/'],
  ['buscar', '/buscar'],
  ['mapa', '/mapa'],
  ['cuaderno', '/cuaderno'],
  ['normas', '/normas'],
  ['diario', '/diario'],
  ['ajustes', '/ajustes'],
  ['resultado-libre', `/resultado?lat=${LIBRE.lat}&lon=${LIBRE.lon}`],
  ['resultado-auth', `/resultado?lat=${AUTH.lat}&lon=${AUTH.lon}`],
  ['luz', `/luz?lat=${LIBRE.lat}&lon=${LIBRE.lon}`],
  ['descargar', '/descargar'],
];

const browser = await chromium.launch();

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
    locale: LANG === 'en' ? 'en-GB' : 'es-ES',
    permissions: ['geolocation'],
    geolocation: { latitude: LIBRE.lat, longitude: LIBRE.lon },
    isMobile: true,
    hasTouch: true,
  });
  // El idioma se deja elegido antes de que arranque la app: es la misma clave
  // que usa SettingsContext (AsyncStorage es localStorage en web).
  await ctx.addInitScript((lang) => {
    localStorage.setItem('zonadron.settings.v1', JSON.stringify({ language: lang }));
  }, LANG);

  // Las peticiones externas se hacen desde el proceso de Playwright: así no hay
  // CORS de por medio y el navegador ve las respuestas reales de ENAIRE.
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('127.0.0.1') || url.includes('localhost')) return route.continue();
    try {
      const res = await route.fetch({ timeout: 45000 });
      const headers = { ...res.headers(), 'access-control-allow-origin': '*' };
      delete headers['content-encoding'];
      await route.fulfill({ response: res, headers });
    } catch {
      await route.abort();
    }
  });

  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`  ! ${name}: ${e.message}`));
    await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'load' });
    if (name === 'buscar') {
      await page.waitForTimeout(1500);
      const input = page.getByLabel(LANG === 'en' ? 'Search for a place' : 'Buscar un lugar');
      await input.fill('Playa de la Malvarrosa');
      await page.waitForTimeout(3500);
    } else {
      await page.waitForTimeout(name === 'home' || name.startsWith('resultado') ? 30000 : 8000);
    }
    await page.screenshot({ path: join(OUT, `${scheme}-${name}.png`), fullPage: name !== 'mapa' && name !== 'luz' && name !== 'descargar' });
    console.log(`${scheme}-${name}`);
    await page.close();
  }
  await ctx.close();
}

await browser.close();
server.close();
