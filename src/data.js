export const CAREERS = {
  Sprints: {
    rating: 79,
    tagline: 'Explosive acceleration, max velocity, speed endurance and relay execution.',
    events: ['100m', '200m', '400m', '800m'],
    primary: ['100m', '200m', '400m']
  },
  Distance: {
    rating: 78,
    tagline: 'Aerobic development, race tactics, positioning, drafting and championship kicks.',
    events: ['800m', '1500m', 'Mile', '3000m', '5000m', '10000m'],
    primary: ['800m', '1500m', '5000m']
  },
  Jumps: {
    rating: 77,
    tagline: 'Approach rhythm, takeoff precision, elastic power and technical consistency.',
    events: ['Long Jump', 'Triple Jump', 'High Jump', 'Pole Vault'],
    primary: ['Long Jump', 'Triple Jump']
  },
  Throws: {
    rating: 80,
    tagline: 'Strength, rotational speed, release mechanics and championship-series consistency.',
    events: ['Shot Put', 'Discus', 'Hammer', 'Javelin', 'Weight Throw'],
    primary: ['Shot Put', 'Discus']
  },
  'Combined Events': {
    rating: 76,
    tagline: 'Balance speed, strength, technique and recovery across multi-event competition.',
    events: ['Pentathlon', 'Heptathlon', 'Decathlon'],
    primary: ['Heptathlon', 'Decathlon']
  }
};

export const EVENTS = {
  '100m': { distance: 100, kind: 'race', start: 'blocks', laneRules: 'lanes', startOptions: ['Full Stagger'], basePace: 10.7 },
  '200m': { distance: 200, kind: 'race', start: 'blocks', laneRules: 'lanes', startOptions: ['Full Stagger'], basePace: 21.8 },
  '400m': { distance: 400, kind: 'race', start: 'blocks', laneRules: 'lanes', startOptions: ['Full Stagger'], basePace: 48.8 },
  '800m': { distance: 800, kind: 'race', start: 'standing', laneRules: 'break', startOptions: ['One-Turn Stagger', 'Waterfall'], basePace: 111.8 },
  '1500m': { distance: 1500, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], basePace: 235.0 },
  'Mile': { distance: 1609.344, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], basePace: 255.0 },
  '3000m': { distance: 3000, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], basePace: 515.0 },
  '5000m': { distance: 5000, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], basePace: 900.0 },
  '10000m': { distance: 10000, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], basePace: 1860.0 },
  'Long Jump': { kind: 'field', unit: 'm' },
  'Triple Jump': { kind: 'field', unit: 'm' },
  'High Jump': { kind: 'field', unit: 'm' },
  'Pole Vault': { kind: 'field', unit: 'm' },
  'Shot Put': { kind: 'field', unit: 'm' },
  'Discus': { kind: 'field', unit: 'm' },
  'Hammer': { kind: 'field', unit: 'm' },
  'Javelin': { kind: 'field', unit: 'm' },
  'Weight Throw': { kind: 'field', unit: 'm' },
  'Pentathlon': { kind: 'combined' },
  'Heptathlon': { kind: 'combined' },
  'Decathlon': { kind: 'combined' }
};

export const PLACE_POINTS = [100, 80, 65, 52, 42, 34, 28, 22];
export const TEAM_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

export const CLASSES = [
  {
    id: 'chem',
    name: 'CHEM 101 • General Chemistry',
    time: '8:00 AM',
    room: 'Science Hall 204',
    description: 'Energy systems, acids and bases, buffers, equilibrium and the chemistry behind performance.',
    reward: 8
  },
  {
    id: 'stats',
    name: 'STAT 110 • Applied Statistics',
    time: '10:00 AM',
    room: 'Math Center 118',
    description: 'Use splits, distributions and variability to understand race data and training trends.',
    reward: 7
  },
  {
    id: 'writing',
    name: 'ENG 101 • Academic Writing',
    time: '12:30 PM',
    room: 'Liberal Arts 302',
    description: 'Maintain eligibility through assignments, attendance and weekly academic progress.',
    reward: 6
  },
  {
    id: 'marketing',
    name: 'MKTG 205 • Sports Marketing',
    time: '2:00 PM',
    room: 'Business Hall 110',
    description: 'Build athlete brand value, fan engagement and sponsorship knowledge inside the NCFA universe.',
    reward: 6
  }
];

export const SHOP_ITEMS = [
  {
    id: 'bicarb',
    name: 'Sodium Bicarbonate',
    category: 'Buffering',
    cost: 180,
    description: 'Game effect: improves high-intensity buffering during selected races.',
    effects: { buffer: 0.08 }
  },
  {
    id: 'beta',
    name: 'Beta-Alanine',
    category: 'Buffering',
    cost: 220,
    description: 'Game effect: increases late-race buffering capacity after repeated use in the simulation.',
    effects: { buffer: 0.05, durability: 0.02 }
  },
  {
    id: 'creatine',
    name: 'Creatine',
    category: 'Power',
    cost: 220,
    description: 'Game effect: supports repeated explosive efforts and gym power in the simulation.',
    effects: { power: 0.05, recovery: 0.02 }
  },
  {
    id: 'beet',
    name: 'Beetroot / Nitrate',
    category: 'Endurance',
    cost: 170,
    description: 'Game effect: small running-economy bonus in longer events.',
    effects: { economy: 0.035 }
  },
  {
    id: 'carbs',
    name: 'Carbohydrate Fuel',
    category: 'Fuel',
    cost: 90,
    description: 'Game effect: restores glycogen availability before long events.',
    effects: { glycogen: 0.08 }
  },
  {
    id: 'electrolytes',
    name: 'Electrolyte Mix',
    category: 'Hydration',
    cost: 70,
    description: 'Game effect: reduces heat and hydration penalties.',
    effects: { hydration: 0.08 }
  },
  {
    id: 'protein',
    name: 'Protein Recovery',
    category: 'Recovery',
    cost: 100,
    description: 'Game effect: improves post-training recovery in the career calendar.',
    effects: { recovery: 0.05 }
  },
  {
    id: 'cherry',
    name: 'Tart Cherry Recovery',
    category: 'Recovery',
    cost: 120,
    description: 'Game effect: small soreness-recovery bonus after hard sessions.',
    effects: { recovery: 0.035 }
  }
];

export const ROSTER = [
  { name: 'Jordan Carter', school: 'Hawthorne', color: 0xf1c40f, shorts: 0x15171a, skin: 0x8a583b, rating: 78, player: true },
  { name: 'Malik Reed', school: 'Metro State', color: 0x377dff, shorts: 0x10244a, skin: 0x6f432d, rating: 83 },
  { name: 'Evan Brooks', school: 'Central Plains', color: 0xc93f36, shorts: 0x31120f, skin: 0xb77a56, rating: 80 },
  { name: 'Andre Lewis', school: 'Lakeview', color: 0x3faf68, shorts: 0x102b18, skin: 0x5f3827, rating: 77 },
  { name: 'Noah Grant', school: 'Cascadia Tech', color: 0x8c55c7, shorts: 0x251237, skin: 0xd09a73, rating: 82 },
  { name: 'Darius King', school: 'Atlantic A&M', color: 0xe87027, shorts: 0x3a1b08, skin: 0x70452f, rating: 79 },
  { name: 'Miles Bennett', school: 'North Valley', color: 0xe7eaf0, shorts: 0x1a2027, skin: 0xc58660, rating: 76 },
  { name: 'Caleb Stone', school: 'Redwood State', color: 0x25a9ad, shorts: 0x0e3133, skin: 0x9a6548, rating: 81 }
];

export function defaultCareerState() {
  return {
    athleteName: 'Jordan Carter',
    career: null,
    event: null,
    startFormat: null,
    points: 300,
    teamPoints: 0,
    gpa: 3.42,
    academicProgress: 82,
    energy: 94,
    coachTrust: 62,
    inventory: [],
    completedClasses: [],
    seasonBests: {},
    personalBests: {
      '100m': 10.88,
      '200m': 21.92,
      '400m': 48.94,
      '800m': 111.92,
      '1500m': 238.40,
      'Mile': 257.10,
      '3000m': 525.0,
      '5000m': 910.0,
      '10000m': 1900.0
    }
  };
}
