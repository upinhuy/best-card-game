// sound.js — tiny generated sounds, no audio files at all.
// One job: play a short WebAudio blip for each game event. Everything is
// synthesized at run time, so the game ships no network request and no
// asset. The first user gesture creates the AudioContext.

let context = null;

function ctx() {
  if (!context) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    context = new AC();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

function blip(ui, freq, dur, type, gainValue) {
  if (ui.muted) return;
  const audio = ctx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + dur);
}

const SOUNDS = {
  play: () => [520, 0.12, 'triangle', 0.12],
  attack: () => [190, 0.16, 'sawtooth', 0.1],
  turn: () => [330, 0.1, 'sine', 0.08],
  start: () => [440, 0.2, 'triangle', 0.12],
  win: () => [660, 0.5, 'triangle', 0.14],
  lose: () => [160, 0.5, 'sine', 0.12],
};

export function playSound(ui, name) {
  const make = SOUNDS[name];
  if (!make) return;
  try {
    const [freq, dur, type, gainValue] = make();
    blip(ui, freq, dur, type, gainValue);
    if (name === 'win') {
      window.setTimeout(() => blip(ui, 880, 0.5, 'triangle', 0.14), 160);
    }
  } catch {
    // Sound is garnish: a browser without audio still plays the game.
  }
}
