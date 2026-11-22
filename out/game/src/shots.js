// shots.js — the four staged states behind ?shot=, for screenshots.
// One job: start a real game from a seed and steer it, through the same
// public rules (createGame, applyAction, damageHero, summonForShot), into
// a title, a busy mid-game table, a won game and a lost game. The shots
// are real renders of the game's own code in a browser, never composites.

import { applyAction, createGame, damageHero, endTurn, summonForShot } from './state.js';
import { nextAction } from './ai.js';

function playSideQuietly(state, side) {
  // Let one side finish its whole turn at once, with no timers.
  for (let guard = 0; guard < 40 && state.phase === 'play' && state.active === side; guard += 1) {
    const action = nextAction(state, side);
    if (action.kind === 'end') break;
    applyAction(state, action);
  }
  if (state.phase === 'play' && state.active === side) endTurn(state);
}

function midGame(seed) {
  const state = createGame(seed);
  // Two full rounds of greedy play on both sides, so the decks, the log
  // and the turn counter all carry real history.
  for (let round = 0; round < 2 && state.phase === 'play'; round += 1) {
    playSideQuietly(state, 'player');
    if (state.phase !== 'play') break;
    playSideQuietly(state, 'ai');
  }
  if (state.phase !== 'play') return state;
  // Stage a busy table: creatures on both boards, mid-game life totals,
  // and enough mana and cards in hand to read at a glance.
  state.turn = 6;
  if (state.player.board.length < 3) {
    summonForShot(state, 'player', 'serigala');
    summonForShot(state, 'player', 'golem');
  }
  if (state.player.board.length < 3) summonForShot(state, 'player', 'putri');
  if (state.ai.board.length < 2) {
    summonForShot(state, 'ai', 'naga');
    summonForShot(state, 'ai', 'rimba');
  }
  state.player.maxMana = 6;
  state.player.mana = 6;
  state.ai.maxMana = 5;
  state.ai.mana = 2;
  damageHero(state, 'player', 6);
  damageHero(state, 'ai', 11);
  while (state.player.hand.length < 5 && state.player.deck.length > 0) {
    state.player.hand.push(state.player.deck.pop());
  }
  while (state.ai.hand.length < 4 && state.ai.deck.length > 0) {
    state.ai.hand.push(state.ai.deck.pop());
  }
  state.active = 'player';
  return state;
}

export function stateForShot(shot, seed) {
  if (shot === 'title') {
    const state = createGame(seed);
    state.phase = 'title';
    return state;
  }
  if (shot === 'play') {
    return midGame(seed);
  }
  if (shot === 'win') {
    const state = midGame(seed);
    if (state.phase === 'play') {
      // A real finishing blow through the attack path: set Mira's life to
      // the strongest ready creature's attack, then strike with it.
      const finisher = state.player.board
        .filter((c) => c.canAttack)
        .sort((a, b) => b.attack - a.attack)[0];
      if (finisher) {
        state.ai.life = finisher.attack;
        applyAction(state, { kind: 'attack', uid: finisher.uid, target: { kind: 'hero', side: 'ai' } });
      } else {
        damageHero(state, 'ai', state.ai.life);
      }
    }
    return state;
  }
  if (shot === 'lose') {
    const state = midGame(seed);
    if (state.phase === 'play') {
      state.player.life = 3;
      damageHero(state, 'player', state.player.life);
    }
    return state;
  }
  return createGame(seed);
}
