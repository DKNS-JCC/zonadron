// Capturas de todas las pantallas en claro y oscuro, contra los servicios reales.
import pw from '/tmp/pw/node_modules/playwright/index.js';
const { chromium } = pw;
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const DIST = 'dist';
const PORT = 8099;
const OUT = process.argv[2] ?? '/tmp/after';

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
await new Promise((r) => server.listen(PORT, r));
await mkdir(OUT, { recursive: true });

// Punto libre (campo de Toledo) y punto que exige autorización (junto a Barajas).
const LIBRE = { lat: 39.7, lon: -4.1 };
const AUTH = { lat: 40.4718, lon: -3.5626 };

const PAGES = [
  ['home', '/'],
  ['buscar', '/buscar'],
  ['mapa', '/mapa'],
  ['info', '/info'],
  ['ajustes', '/ajustes'],
  ['resultado-libre', `/resultado?lat=${LIBRE.lat}&lon=${LIBRE.lon}`],
  ['resultado-auth', `/resultado?lat=${AUTH.lat}&lon=${AUTH.lon}`],
  ['luz', `/luz?lat=${LIBRE.lat}&lon=${LIBRE.lon}`],
  ['descargar', '/descargar'],
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 2,
    colorScheme: scheme,
    locale: 'es-ES',
    permissions: ['geolocation'],
    geolocation: { latitude: LIBRE.lat, longitude: LIBRE.lon },
    isMobile: true,
    hasTouch: true,
  });
  // Las peticiones externas se hacen desde el proceso de Playwright: así no hay
  // CORS de por medio y el navegador ve las respuestas reales de ENAIRE.
  await ctx.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('localhost')) return route.continue();
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
    await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'load' });
    if (name === 'buscar') {
      await page.waitForTimeout(1500);
      const input = page.getByLabel('Buscar un lugar');
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
