# 🂡 Duel Arkanum

[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/upinhuy/best-card-game/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/upinhuy/best-card-game/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

An original turn-based card duel for the [make.fun bounty "Make the best card game"](https://make.fun/bounty/best-card-game-20261122-1826). You are a young card-keeper duelling Mira, the Guardian of the Tower. Spend mana, play creatures of four elements — Api 🔥, Air 💧, Daun 🍃, Batu 🪨 — cast spells, and bring her life from 30 to 0 before she does the same to you.

- **Complete game**: title screen, live table with your hand and Mira's, readable card values/suits/costs, visible life and mana totals, win and loss screens.
- **Played with keyboard + mouse**: click to play and attack, keys 1–7 to pick a card, Enter to end your turn, Esc to cancel, R to play again, M to mute.
- **Offline**: static files only, no network requests, no libraries. Open `game/index.html` in a desktop browser (or run `node serve.ts` and visit http://localhost:8080).

## How to play

- Each duellist starts at ❤ 30 life. Reduce Mira to 0 to win.
- Mana grows by 1 each round, up to 10. Cards cost mana.
- Creatures fight on the board and can attack once per round, starting the round after they are played.
- Spells strike at once: damage a target, heal yourself, draw cards, or shake the whole enemy board.
- Running out of cards hurts: each empty draw costs growing fatigue damage.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshots are staged from the game's own code with `?shot=title|play|win|lose`.

## Referral

Built by [@ipinchan](https://make.fun/r/hv9zk8y5) — join make.fun with referral code `hv9zk8y5`: https://make.fun/r/hv9zk8y5

## License

MIT — see [LICENSE](LICENSE).
