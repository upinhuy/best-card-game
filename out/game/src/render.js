// render.js — draws the whole table from the game state.
// One job: turn state + the UI selection into DOM, nothing else. It never
// changes the rules; every click or key goes through input.js instead.

import { ELEMENTS, HEROES, MAX_MANA } from './config.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function manaPips(mana, maxMana) {
  const wrap = el('div', 'mana');
  for (let i = 0; i < MAX_MANA; i += 1) {
    const pip = el('span', 'pip' + (i < mana ? ' filled' : '') + (i < maxMana ? '' : ' locked'));
    pip.textContent = '◆';
    wrap.appendChild(pip);
  }
  const label = el('span', 'mana-label', `${mana}/${maxMana} mana`);
  wrap.appendChild(label);
  return wrap;
}

function lifeBar(life, max) {
  const wrap = el('div', 'life');
  const bar = el('div', 'life-bar');
  const fill = el('div', 'life-fill');
  fill.style.width = `${Math.max(0, Math.round((life / max) * 100))}%`;
  if (life <= 10) fill.classList.add('low');
  bar.appendChild(fill);
  wrap.appendChild(bar);
  wrap.appendChild(el('span', 'life-text', `❤ ${life} / ${max}`));
  return wrap;
}

function heroPanel(side, state) {
  const s = state[side];
  const hero = HEROES[side];
  const panel = el('div', `hero ${side}`);
  const avatar = el('div', 'avatar', side === 'player' ? '🧙' : '🧝');
  const info = el('div', 'hero-info');
  info.appendChild(el('div', 'hero-name', hero.name));
  info.appendChild(el('div', 'hero-title', hero.title));
  info.appendChild(lifeBar(s.life, 30));
  info.appendChild(manaPips(s.mana, s.maxMana));
  info.appendChild(el('div', 'deck-count', `🂠 Dek: ${s.deck.length} kartu · Tangan: ${s.hand.length}`));
  panel.appendChild(avatar);
  panel.appendChild(info);
  panel.dataset.side = side;
  return panel;
}

function cardNode(card, opts) {
  const def = ELEMENTS[card.element];
  const node = el('div', `card ${card.type} el-${card.element}`);
  node.dataset.uid = String(card.uid);
  node.style.setProperty('--el', def.color);
  node.style.setProperty('--el-soft', def.soft);
  const head = el('div', 'card-head');
  head.appendChild(el('span', 'cost', `◆ ${card.cost}`));
  head.appendChild(el('span', 'element', `${def.glyph} ${def.name}`));
  node.appendChild(head);
  node.appendChild(el('div', 'card-name', card.name));
  const art = el('div', 'card-art', def.glyph);
  node.appendChild(art);
  node.appendChild(el('div', 'card-text', card.text));
  if (card.type === 'creature') {
    const foot = el('div', 'card-foot');
    foot.appendChild(el('span', 'atk', `⚔️ ${card.attack}`));
    if (card.justPlayed) foot.appendChild(el('span', 'sick', '💤'));
    else if (card.canAttack) foot.appendChild(el('span', 'ready', '✓ siap'));
    foot.appendChild(el('span', 'hp', `❤ ${card.health}`));
    node.appendChild(foot);
  } else {
    const foot = el('div', 'card-foot');
    foot.appendChild(el('span', 'spell-tag', '✦ Mantra'));
    foot.appendChild(el('span', 'spell-amount', card.effect === 'damage' ? `💥 ${card.amount}` : card.effect === 'heal' ? `💚 ${card.amount}` : card.effect === 'draw' ? `🃏 +${card.amount}` : `🌋 ${card.amount}`));
    node.appendChild(foot);
  }
  if (opts.selected) node.classList.add('selected');
  if (opts.playable) node.classList.add('playable');
  if (opts.targetable) node.classList.add('targetable');
  if (opts.dimmed) node.classList.add('dimmed');
  return node;
}

function cardBackNode() {
  const node = el('div', 'card-back');
  node.appendChild(el('span', 'back-glyph', '🂠'));
  return node;
}

function isTargetable(state, ui, side, card) {
  if (!ui.selected) return false;
  const sel = ui.selected;
  if (sel.kind === 'board') {
    return side === 'ai' && state.active === 'player' && state.phase === 'play';
  }
  if (sel.kind === 'hand') {
    const handCard = state.player.hand.find((c) => c.uid === sel.uid);
    if (!handCard || handCard.type !== 'spell' || handCard.effect !== 'damage') return false;
    return side === 'ai' && state.active === 'player' && state.phase === 'play';
  }
  return false;
}

export function render(state, ui) {
  const app = document.getElementById('app');
  const badge = document.getElementById('turn-badge');
  if (state.phase === 'title') {
    badge.textContent = 'Siap bertarung? Tekan MULAI DUEL.';
  } else if (state.phase === 'play') {
    badge.textContent = state.active === 'player'
      ? `Ronde ${state.turn} — Giliranmu`
      : `Ronde ${state.turn} — Giliran Mira…`;
  } else if (state.phase === 'won') {
    badge.textContent = 'Kamu menang!';
  } else {
    badge.textContent = 'Mira menang.';
  }
  const endBtn = document.getElementById('end-turn');
  endBtn.disabled = !(state.phase === 'play' && state.active === 'player' && !ui.aiRunning);
  endBtn.textContent = state.active === 'player' ? '⏎ Akhiri Giliran (Enter)' : 'Mira berpikir…';

  const aiZone = document.getElementById('ai-zone');
  aiZone.replaceChildren();
  aiZone.appendChild(heroPanel('ai', state));
  const aiHand = el('div', 'hand-backs');
  for (let i = 0; i < state.ai.hand.length; i += 1) aiHand.appendChild(cardBackNode());
  aiHand.title = `Tangan Mira: ${state.ai.hand.length} kartu`;
  aiZone.appendChild(aiHand);
  const aiBoard = el('div', 'board-row');
  aiBoard.id = 'ai-board';
  for (const card of state.ai.board) {
    aiBoard.appendChild(cardNode(card, {
      selected: false,
      playable: false,
      targetable: isTargetable(state, ui, 'ai', card),
      dimmed: false,
    }));
  }
  if (state.ai.board.length === 0) aiBoard.appendChild(el('div', 'board-empty', '— belum ada makhluk —'));
  aiZone.appendChild(aiBoard);

  const logBox = document.getElementById('log');
  logBox.replaceChildren();
  for (const line of state.log.slice(-4)) logBox.appendChild(el('div', 'log-line', line));
  const hint = document.getElementById('hint');
  if (state.phase === 'title') {
    hint.textContent = 'Klik MULAI DUEL atau tekan Enter untuk mulai.';
  } else if (state.phase !== 'play') {
    hint.textContent = 'Duel selesai — tekan R atau tombol Main Lagi.';
  } else if (state.active !== 'player') {
    hint.textContent = 'Mira sedang mengambil gilirannya…';
  } else if (ui.selected && ui.selected.kind === 'hand') {
    const card = state.player.hand.find((c) => c.uid === ui.selected.uid);
    if (card && card.type === 'spell' && card.effect === 'damage') {
      hint.textContent = `Klik satu makhluk lawan atau Mira untuk ${card.name}. Esc batal.`;
    } else {
      hint.textContent = 'Mantra siap — klik kartu lagi untuk membatalkan, Esc batal.';
    }
  } else if (ui.selected && ui.selected.kind === 'board') {
    hint.textContent = 'Klik makhluk lawan atau Mira untuk menyerang. Esc batal.';
  } else {
    hint.textContent = 'Klik kartu di tangan untuk memainkannya · klik makhlukmu lalu sasarannya untuk menyerang · 1–7 pilih kartu · Enter akhiri giliran.';
  }

  const playerBoard = document.getElementById('player-board');
  playerBoard.replaceChildren();
  for (const card of state.player.board) {
    playerBoard.appendChild(cardNode(card, {
      selected: ui.selected && ui.selected.kind === 'board' && ui.selected.uid === card.uid,
      playable: false,
      targetable: false,
      dimmed: !(card.canAttack && state.active === 'player'),
    }));
  }
  if (state.player.board.length === 0) playerBoard.appendChild(el('div', 'board-empty', '— mejamu masih kosong —'));

  const playerHand = document.getElementById('player-hand');
  playerHand.replaceChildren();
  for (const card of state.player.hand) {
    const playable = state.phase === 'play' && state.active === 'player' && card.cost <= state.player.mana;
    playerHand.appendChild(cardNode(card, {
      selected: ui.selected && ui.selected.kind === 'hand' && ui.selected.uid === card.uid,
      playable,
      targetable: false,
      dimmed: !playable && state.active === 'player',
    }));
  }
  if (state.player.hand.length === 0) playerHand.appendChild(el('div', 'board-empty', '— tangan kosong —'));

  const playerHeroBox = document.getElementById('player-hero-box');
  playerHeroBox.replaceChildren();
  playerHeroBox.appendChild(heroPanel('player', state));

  renderOverlay(state, ui);
}

function renderOverlay(state, ui) {
  const title = document.getElementById('overlay-title');
  const end = document.getElementById('overlay-end');
  if (state.phase === 'title') {
    title.classList.remove('hidden');
    end.classList.add('hidden');
    return;
  }
  title.classList.add('hidden');
  if (state.phase === 'won' || state.phase === 'lost') {
    end.classList.remove('hidden');
    const won = state.phase === 'won';
    document.getElementById('end-title').textContent = won ? '🏆 MENANG!' : '💔 KALAH';
    document.getElementById('end-title').className = won ? 'end-title win' : 'end-title lose';
    document.getElementById('end-sub').textContent = won
      ? 'Mira mengakui kehebatanmu. Menara Arkanum kini milikmu!'
      : 'Mira mempertahankan menaranya… kali ini. Coba lagi!';
    document.getElementById('end-stats').textContent =
      `Ronde: ${state.turn} · Kartu dimainkan: ${state.stats.cardsPlayed} · ` +
      `Luka diberikan: ${state.stats.damageDealt} · Nyawamu tersisa: ${state.player.life} · Nyawa Mira: ${state.ai.life}`;
  } else {
    end.classList.add('hidden');
  }
}
