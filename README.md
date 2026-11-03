# BOTTLE KEEPER 🍾

**Don't let it drop.** A tiny, skill-based physics juggling game. Shoot the falling glass bottle, learn to control its spin by changing where you hit it, and keep up when the second and third bottles arrive.

## Play locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To verify: `npm run check`. To build a deployable static site: `npm run build` (upload `dist/` to your static host).

### Controls

| Device | Move | Shoot |
|---|---|---|
| Desktop | Mouse or ←/→ or A/D | Click or Space |
| Touch | Drag the lower-left move pad | Tap lower-right SHOOT |

One bottle starts the game; a second arrives at 8 hits, a third at 22 hits. A hit near the bottle's center gives a PERFECT bonus, a low save gives a SAVE bonus. Dropping any bottle ends the run. Best score is saved locally.

## Design intent

The game is about **learning a repeatable physical skill**, not surviving unpredictable randomness. Off-center impacts create torque, spin changes your next shot, and you can begin to plan where the bottle will be. Physics uses the `planck` (Planck.js) engine with a fixed 60Hz step; visuals use Canvas 2D.

The initial numeric values and difficulty are hypotheses until playtested. Press the backtick key (`) to toggle debug outlines and live tuning sliders. See [MVP specification](docs/MVP_SPEC_v0.1.md).

## Status

v0.1 prototype. Gameplay tuning, real Android touch testing, accessibility and browser QA are still pending. No backend or user account. All audio is synthesized locally with Web Audio; no external media assets.
