// config.js — the whole card catalog and the fixed numbers of Duel Arkanum.
// One job: describe every card once, so state.js, ai.js and render.js all
// read the same truth. Nothing here touches the DOM or the game state.

// The four elements double as the suits of this game. Each has a colour,
// a glyph and a short Indonesian name shown on every card.
export const ELEMENTS = {
  api: { name: 'Api', glyph: '🔥', color: '#e2492f', soft: '#fde3dc' },
  air: { name: 'Air', glyph: '💧', color: '#2b7fd4', soft: '#dceefc' },
  daun: { name: 'Daun', glyph: '🍃', color: '#3d8f4f', soft: '#ddf2df' },
  batu: { name: 'Batu', glyph: '🪨', color: '#7a6a58', soft: '#ece5da' },
};

export const START_LIFE = 30;
export const MAX_LIFE = 30;
export const MAX_MANA = 10;
export const MAX_HAND = 7;
export const MAX_BOARD = 5;
export const START_HAND = 3;
export const DECK_COPIES = 2;

// A card definition. Creatures fight on the board; spells resolve at once.
// effect is only read for spells: 'damage' | 'heal' | 'draw' | 'sweep'.
// amount is the size of the effect (damage, healing, cards drawn).
export const CARD_DEFS = [
  { id: 'bara', name: 'Bara Muda', element: 'api', type: 'creature', cost: 1, attack: 2, health: 1, text: 'Si kecil yang menyala.' },
  { id: 'perisai', name: 'Perisai Batu', element: 'batu', type: 'creature', cost: 2, attack: 1, health: 4, text: 'Tahan banting.' },
  { id: 'embun', name: 'Tetes Embun', element: 'air', type: 'creature', cost: 2, attack: 2, health: 2, text: 'Sejuk dan sigap.' },
  { id: 'serigala', name: 'Serigala Daun', element: 'daun', type: 'creature', cost: 3, attack: 3, health: 3, text: 'Berburu dari balik dedaunan.' },
  { id: 'golem', name: 'Golem Batu', element: 'batu', type: 'creature', cost: 4, attack: 3, health: 6, text: 'Langkahnya mengguncang meja.' },
  { id: 'putri', name: 'Putri Air', element: 'air', type: 'creature', cost: 4, attack: 4, health: 5, text: 'Arusnya tak pernah surut.' },
  { id: 'naga', name: 'Naga Api', element: 'api', type: 'creature', cost: 5, attack: 6, health: 4, text: 'Sayapnya menebar bara.' },
  { id: 'rimba', name: 'Raja Rimba', element: 'daun', type: 'creature', cost: 6, attack: 7, health: 6, text: 'Hutan tunduk padanya.' },
  { id: 'petir', name: 'Sambaran Petir', element: 'api', type: 'spell', cost: 2, effect: 'damage', amount: 4, text: 'Beri 4 luka ke satu sasaran.' },
  { id: 'penyembuh', name: 'Air Penyembuh', element: 'air', type: 'spell', cost: 2, effect: 'heal', amount: 6, text: 'Pulihkan 6 nyawa pahlawanmu.' },
  { id: 'takdir', name: 'Tarik Takdir', element: 'daun', type: 'spell', cost: 1, effect: 'draw', amount: 2, text: 'Ambil 2 kartu.' },
  { id: 'gempa', name: 'Gempa Menara', element: 'batu', type: 'spell', cost: 3, effect: 'sweep', amount: 2, text: 'Beri 2 luka ke semua makhluk lawan.' },
];

export const CARD_BY_ID = Object.fromEntries(CARD_DEFS.map((d) => [d.id, d]));

// The two duelists. The names and flavour text are original to this game.
export const HEROES = {
  player: { name: 'Kamu — Murid Arkanum', title: 'Penjaga Kartu Muda' },
  ai: { name: 'Mira — Penjaga Menara', title: 'Lawan dari Menara Arkanum' },
};

// How long the AI pauses between its visible moves (milliseconds).
export const AI_STEP_MS = 650;
