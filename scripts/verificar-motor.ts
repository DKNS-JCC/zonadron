/**
 * Verificación del motor contra el servicio real de ENAIRE.
 *
 * No es un test de interfaz: comprueba que la app dice la verdad. Para cada
 * punto conocido consulta ENAIRE en directo, calcula el veredicto con la misma
 * lógica que usa la app y comprueba que coincide con lo esperado.
 *
 * Esto es integración contra un servicio externo, no un test unitario: puede
 * fallar porque ENAIRE esté caído, no porque el motor esté mal. Las
 * comprobaciones deterministas (que no dependen de red y sí se pueden
 * ejecutar en CI) viven aparte, en tests/ — ver `npm run test:unit`.
 *
 *   npm run test:motor
 */

import { queryZonesAt } from '../src/api/enaire';
import { getTerrainElevation } from '../src/api/elevation';
import { buildVerdict, evaluateZones } from '../src/logic/verdict';
import type { VerdictLevel } from '../src/types';

interface Case {
  nombre: string;
  lat: number;
  lon: number;
  altura: number;
  /** Niveles aceptables para este punto. */
  esperado: VerdictLevel[];
  nota: string;
}

const CASOS: Case[] = [
  {
    nombre: 'Pistas del aeropuerto Madrid-Barajas',
    lat: 40.4719,
    lon: -3.5626,
    altura: 120,
    esperado: ['PROHIBIDO', 'AUTORIZACION'],
    nota: 'Dentro del aeropuerto: nunca debe salir "puedes volar" sin más.',
  },
  {
    nombre: 'Puerta del Sol, Madrid',
    lat: 40.4169,
    lon: -3.7035,
    altura: 120,
    esperado: ['PROHIBIDO', 'AUTORIZACION', 'CONDICIONES'],
    nota: 'Centro urbano y espacio aéreo controlado.',
  },
  {
    nombre: 'Aeropuerto de Barcelona-El Prat',
    lat: 41.2974,
    lon: 2.0833,
    altura: 120,
    esperado: ['PROHIBIDO', 'AUTORIZACION'],
    nota: 'Entorno de aeródromo.',
  },
  {
    nombre: 'Sagrada Familia, Barcelona',
    lat: 41.4036,
    lon: 2.1744,
    altura: 120,
    esperado: ['PROHIBIDO', 'AUTORIZACION', 'CONDICIONES'],
    nota: 'Entorno urbano denso.',
  },
  {
    nombre: 'Campo abierto en Los Monegros (Huesca)',
    lat: 41.5155,
    lon: -0.2262,
    altura: 120,
    esperado: ['LIBRE'],
    nota:
      'Zona rural sin zonas que apliquen a 120 m. Si aquí sale "autorización" es que el aviso ' +
      'general de entorno urbano se está colando en el veredicto.',
  },
  {
    nombre: 'Los Monegros volando a 400 m (por encima del límite legal)',
    lat: 41.5155,
    lon: -0.2262,
    altura: 400,
    esperado: ['AUTORIZACION', 'CONDICIONES', 'PROHIBIDO'],
    nota:
      'A 400 m ya se entra en espacio aéreo superior: comprueba que la altura cambia el veredicto ' +
      'de verdad y no es un adorno.',
  },
];

const COLORS = {
  ok: '\x1b[32m',
  fail: '\x1b[31m',
  dim: '\x1b[90m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

async function main() {
  console.log(`${COLORS.bold}Verificación del motor contra el servicio real de ENAIRE${COLORS.reset}\n`);

  let fallos = 0;

  for (const caso of CASOS) {
    process.stdout.write(`• ${caso.nombre} … `);
    try {
      const [{ zones, failedLayers }, elev] = await Promise.all([
        queryZonesAt(caso.lat, caso.lon),
        getTerrainElevation(caso.lat, caso.lon),
      ]);

      const evaluated = evaluateZones(zones, caso.altura, elev);
      const verdict = buildVerdict(evaluated, caso.altura, failedLayers);
      const ok = caso.esperado.includes(verdict.level);
      if (!ok) fallos++;

      // Ninguna zona marcada como aviso general puede colarse en el veredicto.
      const avisoEnVeredicto = [...verdict.affecting, ...verdict.notAffecting].some((z) => z.advisory);
      if (avisoEnVeredicto) {
        fallos++;
        console.log(`  ${COLORS.fail}Un aviso general se ha colado en el veredicto${COLORS.reset}`);
      }

      console.log(
        `${ok ? COLORS.ok + 'OK' : COLORS.fail + 'FALLO'}${COLORS.reset} ` +
          `${COLORS.dim}(${verdict.level}; ${zones.length} zonas; terreno ${elev === null ? '?' : Math.round(elev) + ' m'})${COLORS.reset}`,
      );
      console.log(`  ${COLORS.dim}${verdict.summary}${COLORS.reset}`);
      if (verdict.advisories.length) {
        console.log(`  ${COLORS.dim}avisos generales mostrados aparte: ${verdict.advisories.length}${COLORS.reset}`);
      }
      if (failedLayers.length) {
        console.log(`  ${COLORS.fail}Capas sin respuesta: ${failedLayers.join(', ')}${COLORS.reset}`);
      }
      for (const z of verdict.affecting.slice(0, 4)) {
        console.log(`  ${COLORS.dim}- [${z.type}] ${z.title} · ${z.vertical.explanation.slice(0, 90)}…${COLORS.reset}`);
      }
      if (!ok) {
        console.log(`  ${COLORS.fail}Esperado uno de: ${caso.esperado.join(', ')} — ${caso.nota}${COLORS.reset}`);
      }
      console.log('');
    } catch (err) {
      fallos++;
      console.log(`${COLORS.fail}ERROR${COLORS.reset} ${(err as Error).message}\n`);
    }
  }

  console.log(
    `\n${fallos === 0 ? COLORS.ok + 'Todo correcto' : COLORS.fail + fallos + ' comprobación(es) fallidas'}${COLORS.reset}`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

main();
