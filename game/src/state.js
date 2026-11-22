// state.js — the pure rules of Duel Arkanum: no DOM, no timers, no sound.
// One job: hold the game state and apply legal moves to it, so the same
// code drives the browser game, the screenshot set-ups and the Node tests.

import {
  CARD_BY_ID,
  CARD_DEFS,
  DECK_COPIES,
  MAX_BOARD,
  MAX_HAND,
  MAX_LIFE,
  MAX_MANA,
  START_HAND,
  START_LIFE,
} from './config.js';
import { mulberry32, shuffle } from './random.js';

function sideState() {
  return {
    life: START_LIFE,
    mana: 0,
    maxMana: 0,
    deck: [],
    hand: [],
    board: [],
    fatigue: 0,
  };
}

function newCardInstance(state, defId) {
  const def = CARD_BY_ID[defId];
  const card = {
    uid: state.nextUid,
    defId,
    name: def.name,
    element: def.element,
    type: def.type,
    cost: def.cost,
    attack: def.attack ?? 0,
    health: def.health ?? 0,
    maxHealth: def.health ?? 0,
    effect: def.effect ?? null,
    amount: def.amount ?? 0,
    text: def.text,
    canAttack: false,
    justPlayed: false,
  };
  state.nextUid += 1;
  return card;
}

export function buildDeck(state) {
  const ids = [];
  for (const def of CARD_DEFS) {
    for (let i = 0; i < DECK_COPIES; i += 1) ids.push(def.id);
  }
  return shuffle(ids, state.rng).map((id) => newCardInstance(state, id));
}

export function createGame(seed) {
  const state = {
    seed,
    rng: mulberry32(seed),
    phase: 'play',
    turn: 1,
    active: 'player',
    nextUid: 1,
    player: sideState(),
    ai: sideState(),
    log: [],
    stats: { turns: 1, cardsPlayed: 0, damageDealt: 0, kills: 0 },
  };
  state.player.deck = buildDeck(state);
  state.ai.deck = buildDeck(state);
  for (let i = 0; i < START_HAND; i += 1) {
    drawCard(state, 'player');
    drawCard(state, 'ai');
  }
  startTurn(state, 'player');
  return state;
}

export function other(side) {
  return side === 'player' ? 'ai' : 'player';
}

export function logLine(state, text) {
  state.log.push(text);
  if (state.log.length > 6) state.log.shift();
}

export function drawCard(state, side) {
  const s = state[side];
  if (s.deck.length === 0) {
    s.fatigue += 1;
    damageHero(state, side, s.fatigue);
    logLine(state, `${side === 'player' ? 'Kamu' : 'Mira'} kehabisan kartu dan menanggung ${s.fatigue} luka kelelahan.`);
    return null;
  }
  const card = s.deck.pop();
  if (s.hand.length >= MAX_HAND) {
    logLine(state, `Tangan penuh: ${card.name} terbuang.`);
    return card;
  }
  s.hand.push(card);
  return card;
}

export function startTurn(state, side) {
  const s = state[side];
  if (!(state.turn === 1 && side === 'player')) {
    s.maxMana = Math.min(MAX_MANA, s.maxMana + 1);
  } else {
    s.maxMana = 1;
  }
  s.mana = s.maxMana;
  for (const creature of s.board) {
    creature.canAttack = true;
    creature.justPlayed = false;
  }
  drawCard(state, side);
  logLine(state, side === 'player' ? `Giliranmu — ronde ${state.turn}.` : `Giliran Mira — ronde ${state.turn}.`);
}

export function damageHero(state, side, amount) {
  const s = state[side];
  s.life = Math.max(0, s.life - amount);
  checkEnd(state);
  return s.life;
}

export function healHero(state, side, amount) {
  const s = state[side];
  s.life = Math.min(MAX_LIFE, s.life + amount);
  return s.life;
}

function removeDead(state, side) {
  const s = state[side];
  const before = s.board.length;
  s.board = s.board.filter((c) => c.health > 0);
  return before - s.board.length;
}

export function damageCreature(state, side, uid, amount) {
  const s = state[side];
  const target = s.board.find((c) => c.uid === uid);
  if (!target) return false;
  target.health -= amount;
  const died = removeDead(state, side);
  if (died > 0) {
    state.stats.kills += died;
    logLine(state, `${target.name} hancur.`);
  }
  return died > 0;
}

// Stage a creature straight onto a side's board, ready to fight. Used
// only by the screenshot set-ups, never by a real turn: it lets a still
// image show a busy mid-game table without playing twenty rounds first.
export function summonForShot(state, side, defId) {
  const card = newCardInstance(state, defId);
  card.canAttack = true;
  card.justPlayed = false;
  state[side].board.push(card);
  return card;
}

export function checkEnd(state) {
  if (state.phase !== 'play') return;
  if (state.ai.life <= 0) {
    state.phase = 'won';
    logLine(state, 'Mira kalah! Menara mengakui kemenanganmu.');
  } else if (state.player.life <= 0) {
    state.phase = 'lost';
    logLine(state, 'Nyawamu habis. Mira mempertahankan menaranya.');
  }
}

function findInHand(state, side, uid) {
  return state[side].hand.find((c) => c.uid === uid) ?? null;
}

function targetCreature(state, side, uid) {
  return state[side].board.find((c) => c.uid === uid) ?? null;
}

// Validate and play a card from the active side's hand.
// target: null, or { kind: 'hero', side } or { kind: 'creature', uid }.
export function playCard(state, side, uid, target) {
  if (state.phase !== 'play') return { ok: false, reason: 'game over' };
  if (state.active !== side) return { ok: false, reason: 'not your turn' };
  const s = state[side];
  const card = findInHand(state, side, uid);
  if (!card) return { ok: false, reason: 'card not in hand' };
  if (card.cost > s.mana) return { ok: false, reason: 'not enough mana' };
  const foe = other(side);
  if (card.type === 'creature') {
    if (s.board.length >= MAX_BOARD) return { ok: false, reason: 'board is full' };
  } else if (card.effect === 'damage') {
    if (!target) return { ok: false, reason: 'needs a target' };
    if (target.kind === 'hero' && target.side !== foe) return { ok: false, reason: 'bad target' };
    if (target.kind === 'creature' && !targetCreature(state, foe, target.uid)) {
      return { ok: false, reason: 'bad target' };
    }
  }
  s.mana -= card.cost;
  s.hand = s.hand.filter((c) => c.uid !== uid);
  state.stats.cardsPlayed += 1;
  const who = side === 'player' ? 'Kamu' : 'Mira';
  if (card.type === 'creature') {
    card.canAttack = false;
    card.justPlayed = true;
    s.board.push(card);
    logLine(state, `${who} memainkan ${card.name} (${card.attack}/${card.health}).`);
    return { ok: true };
  }
  if (card.effect === 'damage') {
    if (target.kind === 'hero') {
      damageHero(state, foe, card.amount);
      state.stats.damageDealt += side === 'player' ? card.amount : 0;
      logLine(state, `${who} menghantam ${foe === 'player' ? 'kamu' : 'Mira'} dengan ${card.name} (${card.amount} luka).`);
    } else {
      damageCreature(state, foe, target.uid, card.amount);
      state.stats.damageDealt += side === 'player' ? card.amount : 0;
      logLine(state, `${who} menghantam satu makhluk dengan ${card.name} (${card.amount} luka).`);
    }
  } else if (card.effect === 'heal') {
    healHero(state, side, card.amount);
    logLine(state, `${who} memulihkan ${card.amount} nyawa dengan ${card.name}.`);
  } else if (card.effect === 'draw') {
    drawCard(state, side);
    drawCard(state, side);
    logLine(state, `${who} menarik 2 kartu dengan ${card.name}.`);
  } else if (card.effect === 'sweep') {
    const foes = state[foe].board.slice();
    for (const creature of foes) damageCreature(state, foe, creature.uid, card.amount);
    logLine(state, `${who} mengguncang meja dengan ${card.name}.`);
  }
  checkEnd(state);
  return { ok: true };
}

// A board creature attacks the enemy hero or one enemy creature.
export function attack(state, side, attackerUid, target) {
  if (state.phase !== 'play') return { ok: false, reason: 'game over' };
  if (state.active !== side) return { ok: false, reason: 'not your turn' };
  const s = state[side];
  const foe = other(side);
  const attacker = s.board.find((c) => c.uid === attackerUid);
  if (!attacker) return { ok: false, reason: 'attacker not on board' };
  if (!attacker.canAttack) return { ok: false, reason: 'already attacked' };
  attacker.canAttack = false;
  const who = side === 'player' ? 'Kamu' : 'Mira';
  if (target.kind === 'hero') {
    damageHero(state, foe, attacker.attack);
    if (side === 'player') state.stats.damageDealt += attacker.attack;
    logLine(state, `${attacker.name} menyerang ${foe === 'player' ? 'kamu' : 'Mira'} (${attacker.attack} luka).`);
  } else {
    const defender = targetCreature(state, foe, target.uid);
    if (!defender) return { ok: false, reason: 'bad target' };
    defender.health -= attacker.attack;
    attacker.health -= defender.attack;
    if (side === 'player') state.stats.damageDealt += attacker.attack;
    logLine(state, `${attacker.name} menyerang ${defender.name} (${attacker.attack} lawan ${defender.attack}).`);
    removeDead(state, foe);
    removeDead(state, side);
  }
  checkEnd(state);
  return { ok: true };
}

export function endTurn(state) {
  if (state.phase !== 'play') return { ok: false, reason: 'game over' };
  const next = other(state.active);
  if (next === 'player') state.turn += 1;
  state.active = next;
  startTurn(state, next);
  return { ok: true };
}

// One action object, as the AI plans it and the UI applies it.
export function applyAction(state, action) {
  const side = state.active;
  if (action.kind === 'play') return playCard(state, side, action.uid, action.target ?? null);
  if (action.kind === 'attack') return attack(state, side, action.uid, action.target);
  if (action.kind === 'end') return endTurn(state);
  return { ok: false, reason: 'unknown action' };
}
