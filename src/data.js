export const CAREERS = {
  Sprints: {
    rating: 79,
    tagline: 'Acceleration, max velocity, speed endurance, hurdles and relay execution.',
    events: ['100m', '200m', '400m'],
    primary: ['100m', '200m', '400m']
  },
  Distance: {
    rating: 78,
    tagline: 'Aerobic development, race tactics, positioning, drafting and championship kicks.',
    events: ['800m', '1500m', '3000m', '5000m', '10000m'],
    primary: ['800m', '1500m', '5000m']
  },
  Jumps: {
    rating: 77,
    tagline: 'Approach rhythm, takeoff precision, elastic power and technical consistency.',
    events: ['Long Jump', 'Triple Jump', 'High Jump', 'Pole Vault'],
    primary: ['Long Jump', 'Triple Jump', 'High Jump']
  },
  Throws: {
    rating: 80,
    tagline: 'Strength, rotational speed, release mechanics and championship-series consistency.',
    events: ['Shot Put', 'Discus', 'Hammer', 'Javelin', 'Weight Throw'],
    primary: ['Shot Put', 'Discus', 'Javelin']
  },
  'Combined Events': {
    rating: 76,
    tagline: 'Balance speed, strength, technique and recovery across multi-event competition.',
    events: ['Pentathlon', 'Heptathlon', 'Decathlon'],
    primary: ['Heptathlon', 'Decathlon']
  }
};

export const EVENTS = {
  '100m': { distance: 100, kind: 'race', start: 'blocks', laneRules: 'straight-lanes', startOptions: ['Straight Start'], baseTime: 10.65, cadence: 4.65 },
  '200m': { distance: 200, kind: 'race', start: 'blocks', laneRules: 'lanes', startOptions: ['Full Stagger'], baseTime: 21.55, cadence: 4.55 },
  '400m': { distance: 400, kind: 'race', start: 'blocks', laneRules: 'lanes', startOptions: ['Full Stagger'], baseTime: 47.8, cadence: 4.25 },
  '800m': { distance: 800, kind: 'race', start: 'standing', laneRules: 'break', breakDistance: 100, startOptions: ['One-Turn Stagger', 'Waterfall'], baseTime: 110.8, cadence: 3.85 },
  '1500m': { distance: 1500, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], baseTime: 231.0, cadence: 3.70 },
  '3000m': { distance: 3000, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], baseTime: 495.0, cadence: 3.60 },
  '5000m': { distance: 5000, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], baseTime: 865.0, cadence: 3.50 },
  '10000m': { distance: 10000, kind: 'race', start: 'standing', laneRules: 'waterfall', startOptions: ['Waterfall'], baseTime: 1800.0, cadence: 3.42 },
  'Long Jump': { kind: 'field', unit: 'm', baseMark: 7.15, discipline: 'jump', action: 'TAKEOFF' },
  'Triple Jump': { kind: 'field', unit: 'm', baseMark: 15.05, discipline: 'jump', action: 'TAKEOFF' },
  'High Jump': { kind: 'field', unit: 'm', baseMark: 2.03, discipline: 'vertical', action: 'TAKEOFF' },
  'Pole Vault': { kind: 'field', unit: 'm', baseMark: 5.10, discipline: 'vertical', action: 'PLANT' },
  'Shot Put': { kind: 'field', unit: 'm', baseMark: 17.20, discipline: 'throw', action: 'RELEASE' },
  'Discus': { kind: 'field', unit: 'm', baseMark: 54.50, discipline: 'throw', action: 'RELEASE' },
  'Hammer': { kind: 'field', unit: 'm', baseMark: 58.50, discipline: 'throw', action: 'RELEASE' },
  'Javelin': { kind: 'field', unit: 'm', baseMark: 65.00, discipline: 'throw', action: 'RELEASE' },
  'Weight Throw': { kind: 'field', unit: 'm', baseMark: 18.50, discipline: 'throw', action: 'RELEASE' },
  'Pentathlon': { kind: 'combined', unit: 'pts', baseMark: 3900 },
  'Heptathlon': { kind: 'combined', unit: 'pts', baseMark: 5200 },
  'Decathlon': { kind: 'combined', unit: 'pts', baseMark: 7000 }
};

// One canonical source of truth for where every running event begins in the 3D stadium.
// Course values are metres along the oval model. The sprint chute is handled separately.
export const EVENT_STARTS = {
  '100m': { type: 'straight', base: null, stagger: 0 },
  '200m': { type: 'stagger', base: 172, stagger: 3.55 },
  '400m': { type: 'stagger', base: 360, stagger: 3.80 },
  '800m': { type: 'choice', base: 360, stagger: 3.80, breakDistance: 100 },
  '1500m': { type: 'arc', base: 112, stagger: 0 },
  '3000m': { type: 'arc', base: 175, stagger: 0 },
  '5000m': { type: 'arc', base: 175, stagger: 0 },
  '10000m': { type: 'arc', base: 375, stagger: 0 }
};

export const VENUES = [
  {
    id: 'hawthorne', name: 'Hawthorne University Track Stadium', city: 'Eugene Heights',
    inspiration: 'Pacific Northwest championship stadium', theme: 'gold', track: 0x9d2c31,
    seats: 12500, roof: 'sweeping', scoreboard: 'giant', crowd: 1.0
  },
  {
    id: 'riverbend', name: 'Riverbend Relays Stadium', city: 'Des Moines Central',
    inspiration: 'historic blue-oval relay venue', theme: 'blue', track: 0x2f67a4,
    seats: 14500, roof: 'bowl', scoreboard: 'corner', crowd: 0.94
  },
  {
    id: 'carolina-tech', name: 'Carolina Tech Aggie Stadium', city: 'Greensboro Heights',
    inspiration: 'HBCU championship sprint venue', theme: 'navy', track: 0x284a75,
    seats: 11000, roof: 'open', scoreboard: 'giant', crowd: 1.08
  },
  {
    id: 'pacific', name: 'Pacific Coast Drake Stadium', city: 'Westwood Bay',
    inspiration: 'Southern California collegiate stadium', theme: 'sky', track: 0x3c6fa8,
    seats: 10500, roof: 'open', scoreboard: 'corner', crowd: 0.90
  },
  {
    id: 'summit', name: 'Mt. Summit Hilmer Lodge Stadium', city: 'Walnut Ridge',
    inspiration: 'major community-college invitational venue', theme: 'black', track: 0xb13c35,
    seats: 8500, roof: 'compact', scoreboard: 'giant', crowd: 0.96
  },
  {
    id: 'peach-state', name: 'Peach State Spec Towns Stadium', city: 'Athens Grove',
    inspiration: 'Southeastern conference facility', theme: 'red', track: 0xa73531,
    seats: 9000, roof: 'open', scoreboard: 'corner', crowd: 0.92
  }
];

export const PLACE_POINTS = [100, 80, 65, 52, 42, 34, 28, 22];
export const TEAM_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

export const CLASSES = [
  { id: 'chem', name: 'CHEM 101 • General Chemistry', time: '8:00 AM', room: 'Science Hall 204', description: 'Acids, bases, buffers, equilibrium, energy transfer and exercise chemistry.', reward: 8 },
  { id: 'stats', name: 'STAT 110 • Applied Statistics', time: '10:00 AM', room: 'Math Center 118', description: 'Use splits, distributions and variability to understand race data and training trends.', reward: 7 },
  { id: 'writing', name: 'ENG 101 • Academic Writing', time: '12:30 PM', room: 'Liberal Arts 302', description: 'Maintain eligibility through assignments, attendance and weekly academic progress.', reward: 6 },
  { id: 'marketing', name: 'MKTG 205 • Sports Marketing', time: '2:00 PM', room: 'Business Hall 110', description: 'Athlete branding, fan engagement and sponsorship knowledge inside the NCFA universe.', reward: 6 }
];

export const PRACTICES = [
  { id: 'easy', name: 'Easy aerobic session', groups: ['Distance', 'Combined Events'], energy: -7, trust: 2, development: { aerobic: 0.7 }, note: 'Low intensity. Builds aerobic durability without a large fatigue cost.' },
  { id: 'intervals', name: 'Race-pace intervals', groups: ['Distance', 'Sprints', 'Combined Events'], energy: -18, trust: 4, development: { speedEndurance: 1.0, buffer: 0.35 }, note: 'High-quality repetitions with controlled recovery.' },
  { id: 'starts', name: 'Blocks + acceleration', groups: ['Sprints', 'Combined Events'], energy: -12, trust: 3, development: { acceleration: 0.8 }, note: 'Start reaction and early acceleration work.' },
  { id: 'lift', name: 'Strength room', groups: ['Sprints', 'Throws', 'Jumps', 'Combined Events', 'Distance'], energy: -13, trust: 3, development: { power: 0.7 }, note: 'Power-focused lifting and movement quality.' },
  { id: 'technical', name: 'Technical event session', groups: ['Throws', 'Jumps', 'Combined Events'], energy: -11, trust: 4, development: { technique: 0.9 }, note: 'Approach, release, takeoff and event-specific technical work.' },
  { id: 'recovery', name: 'Recovery + treatment', groups: ['Sprints', 'Distance', 'Throws', 'Jumps', 'Combined Events'], energy: 16, trust: 1, development: { recovery: 0.3 }, note: 'Light movement, mobility and treatment.' }
];

export const SHOP_ITEMS = [
  { id: 'bicarb', name: 'Sodium Bicarbonate', category: 'Buffering', cost: 180, description: 'Game effect: improves simulated high-intensity buffering.', effects: { buffer: 0.08 } },
  { id: 'beta', name: 'Beta-Alanine', category: 'Buffering', cost: 220, description: 'Game effect: improves simulated late-race buffering capacity.', effects: { buffer: 0.05, durability: 0.02 } },
  { id: 'creatine', name: 'Creatine', category: 'Power', cost: 220, description: 'Game effect: supports simulated repeated explosive efforts and gym power.', effects: { power: 0.05, recovery: 0.02 } },
  { id: 'beet', name: 'Beetroot / Nitrate', category: 'Endurance', cost: 170, description: 'Game effect: small simulated running-economy bonus in longer events.', effects: { economy: 0.035 } },
  { id: 'caffeine', name: 'Caffeine', category: 'Competition', cost: 140, description: 'Game effect only: temporary focus and perceived-effort bonus. No dosing guidance.', effects: { focus: 0.035 } },
  { id: 'carbs', name: 'Carbohydrate Fuel', category: 'Fuel', cost: 90, description: 'Game effect: restores simulated glycogen availability before long events.', effects: { glycogen: 0.08 } },
  { id: 'electrolytes', name: 'Electrolyte Mix', category: 'Hydration', cost: 70, description: 'Game effect: reduces simulated heat and hydration penalties.', effects: { hydration: 0.08 } },
  { id: 'protein', name: 'Protein Recovery', category: 'Recovery', cost: 100, description: 'Game effect: improves simulated post-training recovery.', effects: { recovery: 0.05 } },
  { id: 'cherry', name: 'Tart Cherry Recovery', category: 'Recovery', cost: 120, description: 'Game effect: small soreness-recovery bonus after hard sessions.', effects: { recovery: 0.035 } },
  { id: 'omega', name: 'Omega-3 Recovery', category: 'Recovery', cost: 130, description: 'Game effect only: small recovery consistency bonus.', effects: { recovery: 0.025 } }
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
    athleteName: 'Jordan Carter', career: null, event: null, startFormat: null,
    points: 300, teamPoints: 0, gpa: 3.42, academicProgress: 82, energy: 94, coachTrust: 62,
    inventory: [], completedClasses: [], practiceLog: [], meetNumber: 0,
    venueId: 'hawthorne', seasonBests: {}, development: { aerobic: 0, speedEndurance: 0, acceleration: 0, power: 0, technique: 0, recovery: 0, buffer: 0 },
    personalBests: { '100m': 10.88, '200m': 21.92, '400m': 48.94, '800m': 111.92, '1500m': 238.40, '3000m': 525.0, '5000m': 910.0, '10000m': 1900.0 }
  };
}
