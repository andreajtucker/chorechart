export const COLOR_PALETTE = {
  blue:    { bg: '#EFF6FF', accent: '#3B82F6', text: '#1E40AF' },
  rose:    { bg: '#FFF1F2', accent: '#F43F5E', text: '#BE123C' },
  green:   { bg: '#F0FDF4', accent: '#22C55E', text: '#15803D' },
  amber:   { bg: '#FFFBEB', accent: '#F59E0B', text: '#92400E' },
  purple:  { bg: '#FAF5FF', accent: '#A855F7', text: '#6B21A8' },
  teal:    { bg: '#F0FDFA', accent: '#14B8A6', text: '#115E59' },
  orange:  { bg: '#FFF7ED', accent: '#F97316', text: '#9A3412' },
  fuchsia: { bg: '#FDF4FF', accent: '#D946EF', text: '#86198F' },
};

export const PALETTE_KEYS = Object.keys(COLOR_PALETTE);

export const DEFAULT_PEOPLE = [
  { name: 'Evans',  colorKey: 'blue'  },
  { name: 'Andrea', colorKey: 'rose'  },
  { name: 'Rhys',   colorKey: 'green' },
  { name: 'Corbin', colorKey: 'amber' },
];

export const DEFAULT_CHORES = [
  { id: 'dishes',     name: 'Dishes',                         freq: 'daily',        type: 'rotation', people: ['Evans', 'Corbin', 'Rhys'], group: 'daily-trio' },
  { id: 'trash',      name: 'Take out the trash',             freq: 'daily',        type: 'rotation', people: ['Corbin', 'Rhys', 'Evans'], group: 'daily-trio' },
  { id: 'counters',   name: 'Clean counters & put food away', freq: 'daily',        type: 'rotation', people: ['Rhys', 'Evans', 'Corbin'], group: 'daily-trio' },
  { id: 'cooking',    name: 'Cooking',                        freq: 'daily',        type: 'fixed',    people: ['Andrea'] },
  { id: 'kid-bath',   name: 'Kid bathroom',                   freq: 'weekly',       type: 'rotation', people: ['Corbin', 'Rhys'] },
  { id: 'adult-bath', name: 'Adult bathroom',                 freq: 'weekly',       type: 'rotation', people: ['Evans', 'Andrea'] },
  { id: 'dusting',    name: 'Dusting',                        freq: 'weekly',       type: 'rotation', people: ['Evans', 'Andrea', 'Rhys', 'Corbin'] },
  { id: 'grocery',    name: 'Grocery shopping',               freq: 'weekly',       type: 'fixed',    people: ['Andrea'] },
  { id: 'robosuge',   name: 'RoboSuge',                       freq: 'twice-weekly', type: 'fixed',    people: ['Andrea'] },
];
