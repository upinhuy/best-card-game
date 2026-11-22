// ai.js — Mira's turn, one decision at a time.
// One job: look at the board and pick the next legal action for a side,
// using only the same applyAction rules the player follows. The UI calls
// nextAction after every applied action, so each choice sees the board
// exactly as it stands. The same chooser drives the test player, so the
// two sides are judged by one brain.

import { MAX_BOARD } from './config.js';
import { other } from './state.js';

function valueOfCreature(card) {
  return card.attack + card.health;
}

function choosePlay(state, side) {
  const s = state[side];
  const foeSide = other(side);
  const foe = state[foeSide];
  const affordable = s.hand.filter((c) => c.cost <= s.mana);
  if (affordable.length === 0) return null;

  // A lethal bolt ends the game on the spot.
  for (const card of affordable) {
    if (card.type === 'spell' && card.effect === 'damage' && card.amount >= foe.life) {
      return { kind: 'play', uid: card.uid, target: { kind: 'hero', side: foeSide } };
    }
  }
  // Heal only while hurt.
  for (const card of affordable) {
    if (card.type === 'spell' && card.effect === 'heal' && s.life <= 18) {
      return { kind: 'play', uid: card.uid, target: null };
    }
  }
  // Sweep when it clears something or hits a crowded board.
  for (const card of affordable) {
    if (card.type === 'spell' && card.effect === 'sweep') {
      const kills = foe.board.filter((c) => c.health <= card.amount).length;
      if (kills > 0 || foe.board.length >= 3) {
        return { kind: 'play', uid: card.uid, target: null };
      }
    }
  }
  // Damage spell: kill the biggest creature it can, else hit the hero
  // when the foe has nothing standing.
  for (const card of affordable) {
    if (card.type === 'spell' && card.effect === 'damage') {
      const killable = foe.board
        .filter((c) => c.health <= card.amount)
        .sort((a, b) => valueOfCreature(b) - valueOfCreature(a));
      if (killable.length > 0) {
        return { kind: 'play', uid: card.uid, target: { kind: 'creature', uid: killable[0].uid } };
      }
      if (foe.board.length === 0) {
        return { kind: 'play', uid: card.uid, target: { kind: 'hero', side: foeSide } };
      }
    }
  }
  // Draw when the hand is thin.
  for (const card of affordable) {
    if (card.type === 'spell' && card.effect === 'draw' && s.hand.length <= 2) {
      return { kind: 'play', uid: card.uid, target: null };
    }
  }
  // Creatures: the strongest affordable one that fits the board.
  if (s.board.length < MAX_BOARD) {
    const creatures = affordable
      .filter((c) => c.type === 'creature')
      .sort((a, b) => valueOfCreature(b) - valueOfCreature(a) || a.cost - b.cost);
    if (creatures.length > 0) {
      return { kind: 'play', uid: creatures[0].uid, target: null };
    }
  }
  // A draw spell is still worth it late in the game.
  for (const card of affordable) {
    if (card.type === 'spell' && card.effect === 'draw') {
      return { kind: 'play', uid: card.uid, target: null };
    }
  }
  return null;
}

function chooseAttackTarget(state, side, attacker) {
  const foeSide = other(side);
  const foeBoard = state[foeSide].board;
  // A kill the attacker survives: take the most valuable one.
  const safeKills = foeBoard
    .filter((c) => c.health <= attacker.attack && c.attack < attacker.health)
    .sort((a, b) => valueOfCreature(b) - valueOfCreature(a));
  if (safeKills.length > 0) {
    return { kind: 'creature', uid: safeKills[0].uid };
  }
  // Any kill at all beats hitting the hero when the defender hits hard.
  const kills = foeBoard
    .filter((c) => c.health <= attacker.attack)
    .sort((a, b) => b.attack - a.attack);
  if (kills.length > 0 && kills[0].attack >= 3) {
    return { kind: 'creature', uid: kills[0].uid };
  }
  return { kind: 'hero', side: foeSide };
}

// The single next action a side takes, or { kind: 'end' } when done.
export function nextAction(state, side = 'ai') {
  if (state.phase !== 'play' || state.active !== side) return { kind: 'end' };
  const play = choosePlay(state, side);
  if (play) return play;
  const ready = state[side].board.filter((c) => c.canAttack);
  if (ready.length > 0) {
    const attacker = ready.sort((a, b) => b.attack - a.attack)[0];
    return { kind: 'attack', uid: attacker.uid, target: chooseAttackTarget(state, side, attacker) };
  }
  return { kind: 'end' };
}
