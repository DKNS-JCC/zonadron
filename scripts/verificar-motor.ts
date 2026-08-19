/**
 * Verificación del motor contra el servicio real de ENAIRE.
 *
 * No es un test de interfaz: comprueba que la app dice la verdad. Para cada
 * punto conocido consulta ENAIRE en directo, calcula el veredicto con la misma
 * lógica que usa la app y comprueba que coincide con lo esperado.
 *
 *   npm run test:motor
 */

import { normalizeZone, queryZonesAt } from '../src/api/enaire';
import { getTerrainElevation } from '../src/api/elevation';
import { buildVerdict, evaluateZones } from '../src/logic/verdict';
import { htmlToText } from '../src/logic/html';
import { bboxContains, boxAround, interpolateElevation, pointInRings } from '../src/offline/geometry';
import { computeCoverageGrid } from '../src/offline/coverage';
import { findNearestFlyable } from '../src/offline/nearest';
import { lightKind, shadowAzimuth, shadowRatio, sunDay, sunPosition } from '../src/logic/sun';
import { horizonAt } from '../src/api/horizon';
import type { RawZoneAttributes, VerdictLevel } from '../src/types';

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

  /* ---------------------------------------------------------------- */
  /* Comprobaciones del motor con datos sintéticos                       */
  /* ---------------------------------------------------------------- */

  console.log(`${COLORS.bold}Comprobaciones del motor${COLORS.reset}\n`);

  const check = (nombre: string, ok: boolean, detalle = '') => {
    if (!ok) fallos++;
    console.log(`${ok ? COLORS.ok + 'OK   ' : COLORS.fail + 'FALLO'}${COLORS.reset} ${nombre}${detalle ? ` ${COLORS.dim}${detalle}${COLORS.reset}` : ''}`);
  };

  const zonaFalsa = (attrs: Partial<RawZoneAttributes>) =>
    normalizeZone({ identifier: 'TEST', type: 'REQ_AUTHORIZATION', uom: 'M', ...attrs }, 'aero', 0);

  // 1. LO MÁS IMPORTANTE: si una capa no responde y no se ha encontrado nada
  //    grave, la app NO puede decir "puedes volar".
  {
    const v = buildVerdict([], 120, ['aero']);
    check(
      'una capa caída nunca produce "Puedes volar"',
      v.level === 'DESCONOCIDO' && v.incomplete,
      `→ ${v.level}`,
    );
  }
  {
    const v = buildVerdict([], 120, []);
    check('sin capas caídas y sin zonas sí se puede volar', v.level === 'LIBRE', `→ ${v.level}`);
  }
  {
    // Una zona prohibida sigue mandando aunque falte una capa: es lo restrictivo.
    const zona = zonaFalsa({ type: 'PROHIBITED', lower: 0, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
    const v = buildVerdict(evaluateZones([zona], 120, 500), 120, ['urbano']);
    check('una zona prohibida manda aunque falte una capa', v.level === 'PROHIBIDO', `→ ${v.level}`);
  }

  // 2. Unidad desconocida: no se puede asumir que sean metros.
  {
    const zona = zonaFalsa({ uom: '', lower: 300, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
    const [ev] = evaluateZones([zona], 120, 500);
    check('con unidad desconocida la zona se considera aplicable', ev.vertical.affects);
  }
  {
    const zona = zonaFalsa({ uom: 'M', lower: 300, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
    const [ev] = evaluateZones([zona], 120, 500);
    check('en metros, una zona que empieza a 300 m no afecta a un vuelo de 120 m', !ev.vertical.affects);
  }

  // 3. W84 no se convierte a ciegas contra una elevación ortométrica.
  {
    const zona = zonaFalsa({ lower: 500, lowerReference: 'W84', upper: 2000, upperReference: 'W84' });
    const [ev] = evaluateZones([zona], 120, 500);
    check('una zona referida a W84 se considera aplicable', ev.vertical.affects);
  }

  // 4. Sin elevación del terreno, una zona en AMSL debe considerarse aplicable.
  {
    const zona = zonaFalsa({ lower: 1000, lowerReference: 'AMSL', upper: 2000, upperReference: 'AMSL' });
    const [ev] = evaluateZones([zona], 120, null);
    check('sin elevación del terreno, una zona AMSL se considera aplicable', ev.vertical.affects);
  }

  // 5. Fechas sin zona horaria: se interpretan como UTC y con margen.
  {
    const haceDosHoras = new Date(Date.now() - 2 * 3600e3).toISOString().slice(0, 19);
    const zona = zonaFalsa({ endDateTime: haceDosHoras, lower: 0, lowerReference: 'AGL' });
    const [ev] = evaluateZones([zona], 120, 500, new Date());
    check('una zona recién terminada no se descarta de inmediato', ev.timing !== 'CADUCADA', `→ ${ev.timing}`);
  }

  // 6. Alturas medidas desde el punto de referencia del aeródromo.
  {
    const msg =
      'Se encuentra en la Zona geografica de UAS General de HOSPITAL X, LEBJ. ' +
      'Por debajo de 90m medidos desde el punto de referencia del aerodromo (770m), no es necesario coordinar la operacion.';
    const zona = zonaFalsa({ message: msg, lower: 90, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
    check('se lee la elevación del punto de referencia', zona.referenceElevation === 770, `→ ${zona.referenceElevation}`);

    // Terreno POR ENCIMA del aeródromo: la zona empieza más baja de lo publicado.
    const [alto] = evaluateZones([zona], 120, 785);
    check(
      'terreno más alto que el aeródromo: la zona empieza antes de los 90 m',
      alto.vertical.affects && Math.round(alto.vertical.lowerAgl ?? -1) === 75,
      `→ ${alto.vertical.lowerAgl?.toFixed(0)} m`,
    );

    // Terreno POR DEBAJO del aeródromo: la zona empieza más arriba.
    const [bajo] = evaluateZones([zona], 120, 700);
    check(
      'terreno más bajo que el aeródromo: la zona empieza a 160 m y no afecta a 120 m',
      !bajo.vertical.affects && Math.round(bajo.vertical.lowerAgl ?? -1) === 160,
      `→ ${bajo.vertical.lowerAgl?.toFixed(0)} m`,
    );

    // Sin elevación del terreno no se puede calcular: se asume que afecta.
    const [sinTerreno] = evaluateZones([zona], 120, null);
    check('sin elevación del terreno, la zona del aeródromo se considera aplicable', sinTerreno.vertical.affects);
  }
  {
    // ENAIRE deja el paréntesis vacío en muchos helipuertos de hospital.
    const msg = 'Por debajo de 90m medidos desde el punto de referencia del aerodromo (), no es necesario coordinar.';
    const zona = zonaFalsa({ message: msg, lower: 90, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
    check('sin elevación publicada del aeródromo, se marca como no calculable', zona.referenceElevationMissing);
    const [ev] = evaluateZones([zona], 30, 785);
    check('y en ese caso se considera que la zona te afecta', ev.vertical.affects);
  }
  {
    // Una zona normal en AGL no debe verse afectada por esta lógica.
    const zona = zonaFalsa({ message: 'Zona normal sin referencia.', lower: 90, lowerReference: 'AGL', upper: 900, upperReference: 'AGL' });
    const [ev] = evaluateZones([zona], 120, 785);
    check('una zona AGL normal sigue midiéndose desde el suelo', Math.round(ev.vertical.lowerAgl ?? -1) === 90);
  }

  // 7. Techo libre: hasta dónde se puede subir sin pedir permiso.
  {
    const zonaAlta = zonaFalsa({ type: 'REQ_AUTHORIZATION', lower: 74, lowerReference: 'AGL', upper: 900, upperReference: 'AGL', name: 'ZONA ALTA' });
    const v = buildVerdict(evaluateZones([zonaAlta], 120, 500), 120, []);
    check('el techo libre es el suelo de la zona que exige permiso', v.maxFreeHeight.metres === 74, `→ ${v.maxFreeHeight.metres}`);

    const v2 = buildVerdict([], 120, []);
    check('sin zonas, el techo libre es el límite legal de 120 m', v2.maxFreeHeight.metres === 120 && v2.maxFreeHeight.legalLimit);

    const suelo = zonaFalsa({ type: 'PROHIBITED', lower: 0, lowerReference: 'AGL', upper: 900, upperReference: 'AGL', name: 'PROHIBIDA' });
    const v3 = buildVerdict(evaluateZones([suelo], 120, 500), 120, []);
    check('con una zona desde el suelo, el techo libre es cero', v3.maxFreeHeight.metres === 0);

    const cond = zonaFalsa({ type: 'CONDITIONAL', lower: 0, lowerReference: 'AGL', upper: 120, upperReference: 'AGL', name: 'CONDICIONAL' });
    const v4 = buildVerdict(evaluateZones([cond], 120, 500), 120, []);
    check('una zona condicional no baja el techo libre', v4.maxFreeHeight.metres === 120);
  }

  // 8. Geometría del modo sin cobertura.
  {
    const cuadrado = [[[-1, 40], [-1, 41], [0, 41], [0, 40], [-1, 40]]];
    check('punto dentro del polígono', pointInRings(40.5, -0.5, cuadrado));
    check('punto fuera del polígono', !pointInRings(42, -0.5, cuadrado));

    const grid = { lat0: 40, lon0: -1, dLat: 0.01, dLon: 0.01, rows: 2, cols: 2, values: [100, 200, 300, 400] };
    const centro = interpolateElevation(grid, 40.005, -0.995);
    check('la elevación interpolada cae en el centro de la rejilla', centro !== null && Math.abs(centro - 250) < 0.001, `→ ${centro}`);
    check('fuera de la rejilla no se inventa elevación', interpolateElevation(grid, 45, -1) === null);

    const caja = boxAround(40.4168, -3.7038, 25);
    check('la caja de 25 km contiene su centro', bboxContains(caja, 40.4168, -3.7038));
    check('y no contiene un punto a 100 km', !bboxContains(caja, 41.4, -3.7038));
  }

  // 9. Mapa de altura libre (con un paquete sintético).
  {
    // Un cuadrado de ~2 km con una zona que exige permiso desde 0 m en su mitad este.
    const packBBox = { minLat: 40.0, maxLat: 40.02, minLon: -1.02, maxLon: -1.0 };
    const zonaRings = [[[-1.01, 40.0], [-1.01, 40.02], [-1.0, 40.02], [-1.0, 40.0], [-1.01, 40.0]]];
    const pack = {
      version: 1,
      createdAt: new Date().toISOString(),
      center: { lat: 40.01, lon: -1.01 },
      radiusKm: 2,
      bbox: packBBox,
      label: 'prueba',
      elevation: null,
      zones: [
        {
          layer: 'aero' as const,
          rings: zonaRings,
          attributes: {
            identifier: 'TEST', type: 'REQ_AUTHORIZATION', uom: 'M',
            lower: 0, lowerReference: 'AGL', upper: 900, upperReference: 'AGL', name: 'ZONA PRUEBA',
          },
        },
      ],
    };

    const grid = computeCoverageGrid(pack, packBBox, 8);
    const oeste = grid.values[3 * grid.cols + 1]; // mitad oeste, fuera de la zona
    const este = grid.values[3 * grid.cols + 6]; // mitad este, dentro
    check('en el mapa de altura libre, fuera de la zona se puede subir a 120 m', oeste === 120, `→ ${oeste}`);
    check('y dentro de la zona la altura libre es cero', este === 0, `→ ${este}`);

  }

  // 10. Motor solar (sin red: todo se calcula en el móvil).
  {
    const lat = 40.9605, lon = -5.679;
    const dia = sunDay(new Date('2026-08-18T12:00:00Z'), lat, lon);
    const noon = sunPosition(dia.solarNoon!, lat, lon);
    check('al mediodía solar el sol está justo al sur', Math.abs(noon.azimuth - 180) < 0.5, `→ ${noon.azimuth.toFixed(1)}°`);
    check('el sol sale por el este y se pone por el oeste',
      dia.sunriseAzimuth! < 110 && dia.sunsetAzimuth! > 250,
      `→ ${dia.sunriseAzimuth?.toFixed(0)}° / ${dia.sunsetAzimuth?.toFixed(0)}°`);
    check('la hora dorada de la tarde acaba en el ocaso',
      dia.goldenEveningStart! < dia.sunset! && dia.sunset! < dia.blueEvening[0]!);
    check('la hora azul va después del ocaso y antes del final del crepúsculo',
      dia.blueEvening[0]! < dia.blueEvening[1]!);
    check('con el sol a 45° la sombra mide lo mismo que el objeto',
      Math.abs((shadowRatio(45) ?? 0) - 1) < 0.001, `→ ×${shadowRatio(45)?.toFixed(3)}`);
    check('con el sol en el horizonte no hay sombra que medir', shadowRatio(0) === null);
    check('la sombra cae al contrario que el sol', shadowAzimuth(90) === 270);
    check('a 3° de altura es hora dorada', lightKind(3) === 'dorada');
    check('a -5° es hora azul', lightKind(-5) === 'azul');
    check('a -20° es de noche', lightKind(-20) === 'noche');
  }

  // 11. El horizonte del terreno se interpola entre azimuts medidos.
  {
    const perfil = {
      byAzimuth: [
        { azimuth: 270, angle: 0, distanceKm: 1 },
        { azimuth: 280, angle: 10, distanceKm: 1 },
      ],
      originElevation: 700,
      maxDistanceKm: 20,
    };
    check('en el azimut medido devuelve su ángulo', Math.abs(horizonAt(perfil, 280) - 10) < 0.01);
    const medio = horizonAt(perfil, 275);
    check('a mitad de camino interpola', medio > 3 && medio < 7, `→ ${medio.toFixed(1)}°`);
  }

  // 12. Punto volable más cercano a un objetivo fotográfico.
  {
    // Zona que exige permiso en la mitad este; el objetivo cae dentro de ella.
    const packBBox = { minLat: 40.0, maxLat: 40.06, minLon: -1.06, maxLon: -1.0 };
    const pack = {
      version: 1,
      createdAt: new Date().toISOString(),
      center: { lat: 40.03, lon: -1.03 },
      radiusKm: 3,
      bbox: packBBox,
      label: 'prueba',
      elevation: null,
      zones: [
        {
          layer: 'aero' as const,
          rings: [[[-1.03, 40.0], [-1.03, 40.06], [-1.0, 40.06], [-1.0, 40.0], [-1.03, 40.0]]],
          attributes: {
            identifier: 'TEST', type: 'REQ_AUTHORIZATION', uom: 'M',
            lower: 0, lowerReference: 'AGL', upper: 900, upperReference: 'AGL', name: 'ZONA',
          },
        },
      ],
    };

    const dentro = findNearestFlyable(pack, { lat: 40.03, lon: -1.01 }, 120, 3, 48);
    check('un objetivo dentro de la zona no se marca como volable', !dentro.targetIsFlyable);
    check('y encuentra el punto libre más cercano', dentro.best !== null);
    check(
      'que está al oeste, que es donde acaba la zona',
      dentro.best?.bearing === 'al oeste',
      `→ ${dentro.best?.bearing} a ${dentro.best?.distanceM.toFixed(0)} m`,
    );
    check(
      'a una distancia coherente con el borde de la zona',
      (dentro.best?.distanceM ?? 0) > 1300 && (dentro.best?.distanceM ?? 0) < 2200,
      `→ ${dentro.best?.distanceM.toFixed(0)} m`,
    );

    const fuera = findNearestFlyable(pack, { lat: 40.03, lon: -1.05 }, 120, 3, 48);
    check('un objetivo fuera de la zona sí es volable de partida', fuera.targetIsFlyable);
  }

  // 13. Los avisos generales se reconocen por identificador, no por capa entera.
  {
    const aviso = normalizeZone({ identifier: 'NPDRID', type: 'REQ_AUTHORIZATION', uom: 'M' }, 'urbano', 0);
    const zonaReal = normalizeZone({ identifier: 'URB0001', type: 'REQ_AUTHORIZATION', uom: 'M', lower: 0, lowerReference: 'AGL' }, 'urbano', 1);
    check('NPDRID se trata como aviso general', aviso.advisory);
    check('una zona urbana nueva SÍ contaría para el veredicto', !zonaReal.advisory);
  }

  console.log('');

  // Comprobación de la limpieza de HTML (no debe quedar marcado).
  const muestra =
    '<b>Zona</b><p>Texto con <font color="#dc143c">color</font> y <elem>etiqueta propia</elem>.</p><br/>Fin&nbsp;&amp; ya';
  const limpio = htmlToText(muestra);
  const sinEtiquetas = !/[<>]/.test(limpio) && !limpio.includes('&nbsp;');
  console.log(
    `${sinEtiquetas ? COLORS.ok + 'OK' : COLORS.fail + 'FALLO'}${COLORS.reset} limpieza de HTML → ${JSON.stringify(limpio)}`,
  );
  if (!sinEtiquetas) fallos++;

  console.log(
    `\n${fallos === 0 ? COLORS.ok + 'Todo correcto' : COLORS.fail + fallos + ' comprobación(es) fallidas'}${COLORS.reset}`,
  );
  process.exit(fallos === 0 ? 0 : 1);
}

main();
