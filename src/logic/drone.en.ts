import type { DroneProfile } from './drone';

/** Drone profiles in English. Same ids and order as `drone.es.ts`. */
export const DRONE_PROFILES_EN: DroneProfile[] = [
  {
    id: 'sub250',
    label: 'Under 250 g',
    examples: 'DJI Mini 2, Mini 3, Mini 4K, Neo…',
    subcategory: 'A1',
    rules: [
      'You may fly close to people, but never over crowds.',
      'Avoid flying over uninvolved people; if it happens, keep it as brief as possible.',
      'You do not need the extra A2 training: knowing the manufacturer’s manual is enough.',
      'Maximum height 120 m above the surface, always within visual line of sight (VLOS).',
      'If your drone has a camera you must register as a UAS operator with AESA, even under 250 g.',
      'In an urban environment you cannot fly over buildings in the open category.',
    ],
  },
  {
    id: 'c1',
    label: 'C1 (250 g – 900 g)',
    examples: 'DJI Mini 4 Pro with C1 marking, Air 3S…',
    subcategory: 'A1',
    rules: [
      'Keep 5 m horizontally from uninvolved people.',
      'Never over crowds.',
      'You need the A1/A3 online training and UAS operator registration.',
      'Maximum height 120 m above the surface, always in VLOS.',
    ],
  },
  {
    id: 'c2',
    label: 'C2 (under 4 kg)',
    examples: 'DJI Mavic 3 with C2 marking…',
    subcategory: 'A2',
    rules: [
      'Keep 30 m horizontally from uninvolved people (5 m in low-speed mode).',
      'Never over crowds.',
      'You need the A2 training on top of UAS operator registration.',
      'Maximum height 120 m above the surface, always in VLOS.',
    ],
  },
  {
    id: 'c3c4',
    label: 'C3 or C4 (up to 25 kg)',
    examples: 'Large working drones or ones you built yourself',
    subcategory: 'A3',
    rules: [
      'Fly far from people: at least 150 m from residential, commercial, industrial or recreational areas.',
      'No uninvolved person may be inside the flight area.',
      'You need the A1/A3 online training and UAS operator registration.',
      'Maximum height 120 m above the surface, always in VLOS.',
    ],
  },
  {
    id: 'otro',
    label: 'Other, or not sure',
    examples: 'All the rules are shown',
    subcategory: '—',
    rules: [],
  },
];
