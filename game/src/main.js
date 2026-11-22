// main.js — bootstrap for Duel Arkanum.
// One job: build the starting state (a ?shot= state for screenshots, or a
// fresh seeded duel), wire input, and draw the first frame. Restarting
// reuses the same path so every game starts from the same honest code.

import { createGame } from './state.js';
import { stateForShot } from './shots.js';
import { render } from './render.js';
import { wireInput } from './input.js';

function readSeed(params) {
  const raw = Number(params.get('seed'));
  return Number.isInteger(raw) && raw > 0 ? raw : 20261122;
}

export function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = readSeed(params);
  const state = shot ? stateForShot(shot, seed) : createGame(seed);
  if (!shot) state.phase = 'title';

  const ui = {
    state,
    seed,
    selected: null,
    muted: false,
    aiRunning: false,
    restart() {
      ui.state = createGame((ui.seed + 1) % 2147483647);
      ui.state.phase = 'play';
      ui.seed = ui.state.seed;
      ui.selected = null;
      ui.aiRunning = false;
      render(ui.state, ui);
    },
  };

  wireInput(ui);
  render(state, ui);
  // A debug handle for automated play-tests; the game never reads it.
  window.__duel = ui;
  return ui;
}

boot();
