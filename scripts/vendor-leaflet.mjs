/**
 * Regenera src/map/leafletVendor.ts a partir de node_modules/leaflet/dist.
 * Ejecuta:  npm run vendor:leaflet
 */
import { readFileSync, writeFileSync } from 'node:fs';

const js = readFileSync('node_modules/leaflet/dist/leaflet.js', 'utf8');
const css = readFileSync('node_modules/leaflet/dist/leaflet.css', 'utf8');

const header = `/* eslint-disable */
/**
 * Leaflet 1.9.4 empaquetado dentro de la app.
 *
 * Fichero generado automáticamente por \`npm run vendor:leaflet\` a partir de
 * \`node_modules/leaflet/dist\`. No editar a mano.
 *
 * Va incrustado en lugar de cargarse desde un CDN para que el mapa arranque sin
 * depender de un tercero: menos puntos de fallo y nada de peticiones a dominios
 * ajenos desde el móvil del usuario.
 *
 * Leaflet es software libre con licencia BSD-2-Clause.
 * Copyright (c) 2010-2023, Volodymyr Agafonkin
 * Copyright (c) 2010-2011, CloudMade
 * https://github.com/Leaflet/Leaflet/blob/main/LICENSE
 */

`;

writeFileSync(
  'src/map/leafletVendor.ts',
  `${header}export const LEAFLET_JS: string = ${JSON.stringify(js)};\n\nexport const LEAFLET_CSS: string = ${JSON.stringify(css)};\n`,
  'utf8',
);
console.log('src/map/leafletVendor.ts regenerado');
