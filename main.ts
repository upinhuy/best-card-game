// main.ts — the hand-in program for Duel Arkanum (Node 22, stdlib only).
//
// What it does, in order:
//   1. Finds the repository root from this file's own location.
//   2. Empties the output directory (or MAKEFUN_OUTPUT_DIR outside the
//      grader) and copies game/ and screenshots/ into it.
//   3. Asks the vendored make.fun library to build dossier.json, the
//      summary the judge reads: the sources, the screenshots and the
//      totals, capped the way the sealed gate expects them.
//
// Sandbox fix: round 1 of this entry was rejected because the program
// removed the output directory itself (rmSync on MAKEFUN_OUTPUT_DIR),
// which the grader mounts read-only at its parent — the run died with
// EACCES before copying anything. emptyDir below only clears contents.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');

// Creates the directory when missing, then removes everything inside it.
// The directory itself is never deleted: in the grader the output path is
// a mount point, so removing it fails with EACCES even for its owner.
function emptyDir(dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function handIn() {
  if (!existsSync(join(gameDir, 'index.html'))) {
    throw new Error(`game/index.html is missing under ${gameDir}`);
  }
  if (!existsSync(shotsDir)) {
    throw new Error(`screenshots/ is missing under ${repoRoot}`);
  }
  emptyDir(outDir);
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`handed in Duel Arkanum to ${outDir} (dossier ${dossier.length} bytes)`);
}

handIn();
