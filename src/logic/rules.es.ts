import type { RuleSection, RuleSource } from './rules';

/** Normativa resumida, en español. Ver `rules.ts` para el aviso importante. */

export const RULE_SECTIONS_ES: RuleSection[] = [
  {
    id: 'antes',
    icon: 'clipboard-outline',
    title: 'Antes de despegar',
    intro: 'Lo mínimo que necesitas tener en regla para volar legalmente en España.',
    bullets: [
      'Estar registrado como operador UAS en AESA y llevar el número de operador pegado al dron (obligatorio salvo drones de juguete o sin cámara de menos de 250 g).',
      'Haber hecho la formación de piloto a distancia que corresponda a tu subcategoría (A1/A3 o A2).',
      'Comprobar la zona antes de cada vuelo: las zonas geográficas UAS cambian y se publican con avisos.',
      'Consultar los NOTAM vigentes: puede haber restricciones temporales que no están en el mapa de zonas.',
      'Volar siempre dentro de tu alcance visual (VLOS) salvo que tengas una autorización específica.',
    ],
    source: 'AESA — Cómo volar un UAS en España',
    sourceUrl: 'https://www.seguridadaerea.gob.es/es/ambitos/drones',
  },
  {
    id: 'abierta',
    icon: 'layers-outline',
    title: 'Categoría abierta: A1, A2 y A3',
    intro:
      'Es la categoría de menor riesgo y la que usa la mayoría de pilotos. No necesita autorización previa, pero sí cumplir límites estrictos.',
    bullets: [
      'Altura máxima general: 120 m sobre la superficie (con la excepción prevista para salvar obstáculos altos).',
      'Peso máximo al despegue: menos de 25 kg.',
      'Vuelo siempre en alcance visual directo (VLOS) y sin transportar mercancías peligrosas.',
      'A1: se puede volar cerca de personas, pero nunca sobre aglomeraciones. Con C1 (≥250 g) hay que mantener 5 m horizontales respecto a personas ajenas.',
      'A2: vuelo próximo a personas con drones C2 (<4 kg), manteniendo 30 m horizontales (5 m si usas modo de baja velocidad).',
      'A3: lejos de personas, a 150 m como mínimo de zonas residenciales, comerciales, industriales o recreativas.',
      'En categoría abierta está prohibido sobrevolar edificios en entorno urbano.',
    ],
    source: 'Reglamento de Ejecución (UE) 2019/947 y RD 517/2024',
    sourceUrl: 'https://www.seguridadaerea.gob.es/es/ambitos/drones',
  },
  {
    id: 'zonas',
    icon: 'shield-outline',
    title: 'Qué significan las zonas de esta app',
    intro:
      'ENAIRE clasifica cada zona con un tipo (formato ED-318). Es lo que esta app usa para darte el veredicto.',
    bullets: [
      'Prohibido: no se puede volar, punto.',
      'Requiere autorización: hace falta pedir permiso al gestor de la zona y que te lo concedan antes de volar.',
      'Con condiciones: puedes volar si cumples lo que la zona exige (altura, distancia, coordinación previa, horarios…).',
      'Si te afectan varias zonas a la vez, se cumplen todas: no vale quedarse con la menos restrictiva.',
      'Cuando una zona particular contradice a una general, prevalece la particular.',
    ],
    source: 'RD 517/2024 y guía UAS-OPS-DT01 de AESA',
    sourceUrl: 'https://www.seguridadaerea.gob.es/es/ambitos/drones/zonas-geograficas-de-uas',
  },
  {
    id: 'aerodromos',
    icon: 'airplane-outline',
    title: 'Entorno de aeropuertos y helipuertos',
    intro:
      'Son las zonas más extensas y las que más veces bloquean un vuelo. Están prohibidas salvo coordinación previa con el gestor del aeródromo y el proveedor de servicios de tránsito aéreo.',
    bullets: [
      'Aeródromos civiles de uso público y militares: 6 km en el eje de pista × 5 km de anchura hasta 45 m de altura; 10 km × 7,5 km entre 45 y 900 m.',
      'Aeródromos civiles de uso restringido: 3 km × 3 km hasta 45 m; 5 km × 4,5 km entre 45 y 900 m.',
      'Helipuertos civiles públicos y militares: 2,5 km × 2,5 km desde la FATO hasta 90 m; 3,3 km × 3,3 km entre 90 y 900 m.',
      'Helipuertos civiles restringidos: radio de 2,5 km hasta 90 m; 3,3 km entre 90 y 450 m.',
    ],
    source: 'RD 517/2024 — guía UAS-OPS-DT01 de AESA',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'controlado',
    icon: 'radio-outline',
    title: 'Espacio aéreo controlado y FIZ',
    intro:
      'Mucha gente se sorprende al ver una zona naranja en pleno campo: suele ser espacio aéreo controlado (CTR, TMA) o una zona de información de vuelo.',
    bullets: [
      'Sin coordinación con el control aéreo puedes volar en VLOS hasta 60 m de altura, siempre que estés fuera de las zonas de aeródromos y helipuertos.',
      'Por encima de esos 60 m hace falta coordinación previa, evaluación del riesgo (EARO) y, si el proveedor lo exige, plan de vuelo y comunicación con el ATS.',
      'Ojo con las alturas: muchas zonas de espacio aéreo controlado empiezan a cientos de metros y están referidas al nivel del mar. Esta app las convierte a altura sobre el terreno usando la elevación real del punto.',
    ],
    source: 'RD 517/2024 — guía UAS-OPS-DT01 de AESA',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'urbano',
    icon: 'business-outline',
    title: 'Entornos urbanos',
    intro: 'Núcleos de población y áreas residenciales, comerciales, industriales o recreativas.',
    bullets: [
      'Altura máxima: 300 m sobre el obstáculo más alto situado en un radio de 600 m.',
      'En categoría abierta no se pueden sobrevolar edificios.',
      'Hay que mantener las distancias horizontales de seguridad de tu subcategoría (A1, A2 o A3).',
      'Los operadores registrados deben presentar comunicación previa al Ministerio del Interior con 5 días de antelación en los supuestos previstos.',
    ],
    source: 'RD 517/2024 — guía UAS-OPS-DT01 de AESA',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'infra',
    icon: 'git-network-outline',
    title: 'Infraestructuras críticas',
    intro:
      'Ferrocarril, carreteras, energía, agua, puertos, hospitales… Son las zonas azules del mapa y suelen ser franjas estrechas pero muy largas.',
    bullets: [
      'Infraestructuras lineales (vías, carreteras, tendidos): 25 m horizontales desde los laterales.',
      'Infraestructuras no lineales: 10 m horizontales desde el perímetro.',
      'Altura: 50 m sobre el punto más elevado de la infraestructura (100 m en sentido longitudinal para las lineales).',
      'Para volar dentro hay que contar con el permiso del gestor de la infraestructura.',
    ],
    source: 'RD 517/2024 — guía UAS-OPS-DT01 de AESA',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'natura',
    icon: 'leaf-outline',
    title: 'Espacios naturales protegidos',
    intro:
      'No siempre aparecen en las capas de ENAIRE, así que conviene comprobarlos aparte.',
    bullets: [
      'Volar en un espacio natural protegido exige coordinación previa con el gestor del espacio (normalmente la comunidad autónoma).',
      'Puedes consultarlos en los visores de Red Natura 2000 y del Ministerio para la Transición Ecológica.',
      'La ausencia de una zona en el mapa de ENAIRE no significa que no haya restricciones ambientales o municipales.',
    ],
    source: 'RD 517/2024 — guía UAS-OPS-DT01 de AESA',
    sourceUrl: 'https://www.miteco.gob.es/',
  },
];

export const SOURCES_ES: RuleSource[] = [
  {
    label: 'ENAIRE — Zonas Geográficas UAS (datos oficiales)',
    url: 'https://aip.enaire.es/AIP/UAS-es.html',
  },
  { label: 'ENAIRE Drones (visor oficial)', url: 'https://drones.enaire.es/' },
  {
    label: 'AESA — Zonas geográficas de UAS',
    url: 'https://www.seguridadaerea.gob.es/es/ambitos/drones/zonas-geograficas-de-uas',
  },
  {
    label: 'AESA — Guía UAS-OPS-DT01 (zonas del RD 517/2024)',
    url: 'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    label: 'Documentación técnica del servicio de datos de ENAIRE',
    url: 'https://aip.enaire.es/recursos/descargas/ZGUAS/servAIS_APIDOC.pdf',
  },
];
