import type { RuleSection, RuleSource } from './rules';

/**
 * The same regulation summary in English. Same ids, same order, same sources:
 * the linked documents are still in Spanish, because that is what the law is
 * published in.
 */
export const RULE_SECTIONS_EN: RuleSection[] = [
  {
    id: 'antes',
    icon: 'clipboard-outline',
    title: 'Before you take off',
    intro: 'The minimum you need in order to fly legally in Spain.',
    bullets: [
      'Be registered as a UAS operator with AESA and carry the operator number stuck to the drone (required except for toy drones and camera-less drones under 250 g).',
      'Have completed the remote pilot training for your subcategory (A1/A3 or A2).',
      'Check the area before every flight: UAS geographical zones change and are published with notices.',
      'Check the NOTAMs in force: there may be temporary restrictions that are not on the zone map.',
      'Always fly within visual line of sight (VLOS) unless you hold a specific authorization.',
    ],
    source: 'AESA — How to fly a UAS in Spain',
    sourceUrl: 'https://www.seguridadaerea.gob.es/es/ambitos/drones',
  },
  {
    id: 'abierta',
    icon: 'layers-outline',
    title: 'Open category: A1, A2 and A3',
    intro:
      'The lowest-risk category and the one most pilots use. It needs no prior authorization, but it does have strict limits.',
    bullets: [
      'General maximum height: 120 m above the surface (with the allowance for clearing tall obstacles).',
      'Maximum take-off mass: under 25 kg.',
      'Always within direct visual line of sight (VLOS) and never carrying dangerous goods.',
      'A1: you may fly close to people, but never over crowds. With C1 (≥250 g) you must keep 5 m horizontally from uninvolved people.',
      'A2: flying close to people with C2 drones (<4 kg), keeping 30 m horizontally (5 m in low-speed mode).',
      'A3: far from people, at least 150 m from residential, commercial, industrial or recreational areas.',
      'In the open category, flying over buildings in an urban environment is prohibited.',
    ],
    source: 'Implementing Regulation (EU) 2019/947 and RD 517/2024',
    sourceUrl: 'https://www.seguridadaerea.gob.es/es/ambitos/drones',
  },
  {
    id: 'zonas',
    icon: 'shield-outline',
    title: 'What the zones in this app mean',
    intro:
      'ENAIRE classifies every zone with a type (ED-318 format). That is what this app uses to give you the verdict.',
    bullets: [
      'Prohibited: no flying, full stop.',
      'Authorization required: you must ask the zone manager for permission and be granted it before flying.',
      'Conditional: you may fly if you meet what the zone requires (height, distance, prior coordination, hours…).',
      'If several zones affect you at once, all of them apply: you cannot go by the least restrictive one.',
      'Where a specific zone contradicts a general one, the specific one prevails.',
    ],
    source: 'RD 517/2024 and AESA guidance UAS-OPS-DT01',
    sourceUrl: 'https://www.seguridadaerea.gob.es/es/ambitos/drones/zonas-geograficas-de-uas',
  },
  {
    id: 'aerodromos',
    icon: 'airplane-outline',
    title: 'Around airports and heliports',
    intro:
      'These are the largest zones and the ones that block a flight most often. Flying is prohibited unless coordinated in advance with the aerodrome operator and the air traffic service provider.',
    bullets: [
      'Public civil and military aerodromes: 6 km along the runway axis × 5 km wide up to 45 m height; 10 km × 7.5 km between 45 and 900 m.',
      'Restricted-use civil aerodromes: 3 km × 3 km up to 45 m; 5 km × 4.5 km between 45 and 900 m.',
      'Public civil and military heliports: 2.5 km × 2.5 km from the FATO up to 90 m; 3.3 km × 3.3 km between 90 and 900 m.',
      'Restricted civil heliports: 2.5 km radius up to 90 m; 3.3 km between 90 and 450 m.',
    ],
    source: 'RD 517/2024 — AESA guidance UAS-OPS-DT01',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'controlado',
    icon: 'radio-outline',
    title: 'Controlled airspace and FIZ',
    intro:
      'Plenty of people are surprised to see an orange zone in the middle of open country: it is usually controlled airspace (CTR, TMA) or a flight information zone.',
    bullets: [
      'Without coordinating with air traffic control you may fly VLOS up to 60 m height, as long as you are outside aerodrome and heliport zones.',
      'Above those 60 m you need prior coordination, a risk assessment (EARO) and, if the provider requires it, a flight plan and communication with ATS.',
      'Watch the heights: many controlled-airspace zones start hundreds of metres up and are referred to sea level. This app converts them to height above the ground using the real elevation of the point.',
    ],
    source: 'RD 517/2024 — AESA guidance UAS-OPS-DT01',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'urbano',
    icon: 'business-outline',
    title: 'Urban environments',
    intro: 'Towns and residential, commercial, industrial or recreational areas.',
    bullets: [
      'Maximum height: 300 m above the tallest obstacle within a 600 m radius.',
      'In the open category you cannot fly over buildings.',
      'Keep the horizontal safety distances of your subcategory (A1, A2 or A3).',
      'Registered operators must notify the Ministry of the Interior 5 days in advance in the cases the regulation sets out.',
    ],
    source: 'RD 517/2024 — AESA guidance UAS-OPS-DT01',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'infra',
    icon: 'git-network-outline',
    title: 'Critical infrastructure',
    intro:
      'Railways, roads, energy, water, ports, hospitals… These are the blue zones on the map, usually narrow strips but very long ones.',
    bullets: [
      'Linear infrastructure (tracks, roads, power lines): 25 m horizontally from the sides.',
      'Non-linear infrastructure: 10 m horizontally from the perimeter.',
      'Height: 50 m above the highest point of the infrastructure (100 m lengthwise for linear ones).',
      'To fly inside you need permission from the infrastructure manager.',
    ],
    source: 'RD 517/2024 — AESA guidance UAS-OPS-DT01',
    sourceUrl:
      'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    id: 'natura',
    icon: 'leaf-outline',
    title: 'Protected natural areas',
    intro: 'They do not always appear in ENAIRE’s layers, so it is worth checking them separately.',
    bullets: [
      'Flying in a protected natural area requires prior coordination with the site manager (usually the regional government).',
      'You can look them up in the Natura 2000 and Ministry for the Ecological Transition viewers.',
      'A zone missing from ENAIRE’s map does not mean there are no environmental or municipal restrictions.',
    ],
    source: 'RD 517/2024 — AESA guidance UAS-OPS-DT01',
    sourceUrl: 'https://www.miteco.gob.es/',
  },
];

export const SOURCES_EN: RuleSource[] = [
  {
    label: 'ENAIRE — UAS Geographical Zones (official data)',
    url: 'https://aip.enaire.es/AIP/UAS-es.html',
  },
  { label: 'ENAIRE Drones (official viewer)', url: 'https://drones.enaire.es/' },
  {
    label: 'AESA — UAS geographical zones',
    url: 'https://www.seguridadaerea.gob.es/es/ambitos/drones/zonas-geograficas-de-uas',
  },
  {
    label: 'AESA — UAS-OPS-DT01 guidance (zones under RD 517/2024)',
    url: 'https://www.seguridadaerea.gob.es/sites/default/files/UAS-OPS-DT01_Ed.01_Zonas.geograficas.UAS.del.RDUAS.pdf',
  },
  {
    label: 'Technical documentation of ENAIRE’s data service',
    url: 'https://aip.enaire.es/recursos/descargas/ZGUAS/servAIS_APIDOC.pdf',
  },
];
