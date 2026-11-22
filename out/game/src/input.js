// input.js — mouse and keyboard for Duel Arkanum, plus Mira's turn.
// One job: translate clicks and keys into applyAction calls, then ask
// render to redraw. It never invents rules; state.js decides legality.

import { AI_STEP_MS } from './config.js';
import { applyAction, endTurn } from './state.js';
import { nextAction as aiNext } from './ai.js';
import { render } from './render.js';
import { playSound } from './sound.js';

function findCardNode(node) {
  return node.closest ? node.closest('.card') : null;
}

function uidOf(node) {
  return Number(node.dataset.uid);
}

export function wireInput(ui) {
  const app = document.getElementById('app');

  app.addEventListener('click', (event) => {
    if (ui.state.phase !== 'play') return;
    if (ui.state.active !== 'player' || ui.aiRunning) return;
    const node = findCardNode(event.target);
    const hero = event.target.closest ? event.target.closest('.hero') : null;

    // Clicking a hero portrait targets that hero.
    if (hero && !node) {
      handleTarget(ui, { kind: 'hero', side: hero.dataset.side });
      return;
    }
    if (!node) return;
    const uid = uidOf(node);
    if (node.closest('#player-hand')) {
      handleHandCard(ui, uid);
    } else if (node.closest('#player-board')) {
      handleBoardCard(ui, uid);
    } else if (node.closest('#ai-board')) {
      handleTarget(ui, { kind: 'creature', uid });
    }
  });

  document.getElementById('end-turn').addEventListener('click', () => {
    endPlayerTurn(ui);
  });
  document.getElementById('restart').addEventListener('click', () => {
    ui.restart();
  });
  document.getElementById('sound-toggle').addEventListener('click', (event) => {
    ui.muted = !ui.muted;
    event.currentTarget.textContent = ui.muted ? '🔇 Suara mati' : '🔊 Suara hidup';
  });
  document.getElementById('start-btn').addEventListener('click', () => {
    ui.state.phase = 'play';
    playSound(ui, 'start');
    render(ui.state, ui);
  });
  document.getElementById('again-btn').addEventListener('click', () => {
    ui.restart();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'm' || event.key === 'M') {
      ui.muted = !ui.muted;
      document.getElementById('sound-toggle').textContent = ui.muted ? '🔇 Suara mati' : '🔊 Suara hidup';
      return;
    }
    if (ui.state.phase === 'title') {
      if (event.key === 'Enter') document.getElementById('start-btn').click();
      return;
    }
    if (ui.state.phase === 'won' || ui.state.phase === 'lost') {
      if (event.key === 'r' || event.key === 'R' || event.key === 'Enter') ui.restart();
      return;
    }
    if (event.key === 'Escape') {
      ui.selected = null;
      render(ui.state, ui);
      return;
    }
    if (ui.state.active !== 'player' || ui.aiRunning) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      endPlayerTurn(ui);
      return;
    }
    const n = Number(event.key);
    if (Number.isInteger(n) && n >= 1 && n <= ui.state.player.hand.length) {
      handleHandCard(ui, ui.state.player.hand[n - 1].uid);
    }
  });
}

function handleHandCard(ui, uid) {
  const state = ui.state;
  const card = state.player.hand.find((c) => c.uid === uid);
  if (!card) return;
  if (ui.selected && ui.selected.kind === 'hand' && ui.selected.uid === uid) {
    ui.selected = null;
    render(state, ui);
    return;
  }
  if (card.cost > state.player.mana) {
    state.log.push(`${card.name} butuh ${card.cost} mana — kamu punya ${state.player.mana}.`);
    render(state, ui);
    return;
  }
  if (card.type === 'creature') {
    const result = applyAction(state, { kind: 'play', uid, target: null });
    if (result.ok) {
      ui.selected = null;
      playSound(ui, 'play');
    }
    render(state, ui);
    return;
  }
  // Spells.
  if (card.effect === 'damage') {
    ui.selected = { kind: 'hand', uid };
    render(state, ui);
    return;
  }
  const result = applyAction(state, { kind: 'play', uid, target: null });
  if (result.ok) {
    ui.selected = null;
    playSound(ui, 'play');
  }
  render(state, ui);
}

function handleBoardCard(ui, uid) {
  const state = ui.state;
  const card = state.player.board.find((c) => c.uid === uid);
  if (!card) return;
  if (ui.selected && ui.selected.kind === 'board' && ui.selected.uid === uid) {
    ui.selected = null;
    render(state, ui);
    return;
  }
  if (!card.canAttack) {
    state.log.push(`${card.name} belum bisa menyerang ronde ini.`);
    render(state, ui);
    return;
  }
  ui.selected = { kind: 'board', uid };
  render(state, ui);
}

function handleTarget(ui, target) {
  const state = ui.state;
  if (!ui.selected) return;
  if (target.kind === 'hero' && target.side === 'player') {
    ui.selected = null;
    render(state, ui);
    return;
  }
  if (ui.selected.kind === 'board') {
    const result = applyAction(state, { kind: 'attack', uid: ui.selected.uid, target });
    if (result.ok) playSound(ui, 'attack');
    ui.selected = null;
    render(state, ui);
    return;
  }
  if (ui.selected.kind === 'hand') {
    const result = applyAction(state, { kind: 'play', uid: ui.selected.uid, target });
    if (result.ok) playSound(ui, 'play');
    ui.selected = null;
    render(state, ui);
  }
}

export function endPlayerTurn(ui) {
  const state = ui.state;
  if (state.phase !== 'play' || state.active !== 'player' || ui.aiRunning) return;
  ui.selected = null;
  endTurn(state);
  playSound(ui, 'turn');
  render(state, ui);
  runAiTurn(ui);
}

// Mira acts one step at a time so the player can watch the table change.
export function runAiTurn(ui) {
  const state = ui.state;
  if (state.phase !== 'play' || state.active !== 'ai') return;
  ui.aiRunning = true;
  const step = () => {
    if (state.phase !== 'play' || state.active !== 'ai') {
      ui.aiRunning = false;
      render(state, ui);
      finishIfOver(ui);
      return;
    }
    const action = aiNext(state);
    if (action.kind === 'end') {
      endTurn(state);
      ui.aiRunning = false;
      playSound(ui, 'turn');
      render(state, ui);
      finishIfOver(ui);
      return;
    }
    const result = applyAction(state, action);
    if (result.ok) playSound(ui, action.kind === 'attack' ? 'attack' : 'play');
    render(state, ui);
    if (state.phase !== 'play') {
      ui.aiRunning = false;
      finishIfOver(ui);
      return;
    }
    window.setTimeout(step, AI_STEP_MS);
  };
  window.setTimeout(step, AI_STEP_MS);
}

function finishIfOver(ui) {
  if (ui.state.phase === 'won') playSound(ui, 'win');
  if (ui.state.phase === 'lost') playSound(ui, 'lose');
  render(ui.state, ui);
}
