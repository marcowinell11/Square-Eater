# Square Eater

A 2D arcade browser game built with [Phaser 3](https://phaser.io/) and [React](https://react.dev/), running inside a pnpm monorepo.

---

## How to Play

| Input | Action |
|---|---|
| Arrow keys or WASD | Move your square |
| R | Restart after game over or win |

**Phase 1 — Eat the small squares (yellow)**
You start as a small cyan square. Collect the 12 yellow squares scattered across the arena. Each one makes you slightly bigger. Avoid the large red squares — touching one ends the game.

**Phase 2 — Eat the big squares (red)**
Once all yellow squares are eaten, you grow to a size that makes the red squares fair prey. Chase and eat all 6 of them.

**You win** when you are the last square on the screen.

---

## How the Code Works

### Project Layout

```
artifacts/square-eater/
├── src/
│   ├── main.tsx          # React entry point — mounts <App /> into the DOM
│   ├── App.tsx           # Root React component — wraps the game in a QueryClientProvider
│   ├── index.css         # Global CSS variables and Tailwind theme
│   ├── pages/
│   │   └── Game.tsx      # React page — creates and tears down the Phaser game instance
│   └── game/
│       └── GameScene.ts  # All game logic — the single Phaser scene
```

### Entry Flow

```
main.tsx
  └─ <App />              (React root, QueryClientProvider)
       └─ <Game />        (React page, manages the Phaser canvas lifetime)
            └─ GameScene  (Phaser.Scene — runs the game loop)
```

1. **`main.tsx`** renders the React app into `#root`.
2. **`App.tsx`** provides the React Query context (not used by the game itself, but available for future features like a leaderboard).
3. **`Game.tsx`** uses a `useEffect` to spin up a `Phaser.Game` instance inside a `<div>` ref. When the component unmounts (e.g. hot-reload), it calls `game.destroy(true)` to clean up the canvas and all Phaser resources.
4. **`GameScene.ts`** is where all gameplay happens.

---

### GameScene — the Game Loop

`GameScene` extends `Phaser.Scene` and implements three Phaser lifecycle hooks:

#### `create()`
Called once when the scene starts (or restarts). Responsible for:
- Resetting all state variables (phase, player size, NPC list, game-over flag).
- Drawing the background rectangle and grid overlay.
- Spawning the player and all NPC squares via `spawnNpc()`.
- Registering keyboard input (arrow keys + WASD).
- Creating the HUD text objects and the invisible overlay used for game-over / win screens.

#### `update(time, delta)`
Called every frame (~60 fps). Responsible for:
- **Player movement** — reads keyboard state, adjusts `px`/`py` by `SPEED * dt` (delta-time ensures speed is frame-rate independent), then clamps to canvas bounds.
- **NPC movement** — each NPC stores `vx`, `vy` velocity components and a `dirTimer`. When the timer expires, a new random angle is chosen and the NPC gets a new velocity. NPCs bounce off the four walls by flipping the relevant velocity component.
- **Collision detection** — calls `checkCollisions()`.
- **HUD update** — refreshes the phase and size text.

#### Private helpers

| Method | Purpose |
|---|---|
| `spawnNpc(category, size)` | Creates an NPC rectangle with a random starting position (kept at least 120 px from the player spawn), assigns initial velocity and a `sizeCategory` tag. |
| `updateHUD()` | Updates the two text objects in the top-left corner with current phase and player size. |
| `rectsOverlap(...)` | Axis-aligned bounding-box (AABB) test. Returns `true` when two rectangles overlap, using centre-point + half-extents maths. |
| `checkCollisions()` | Iterates every NPC, runs `rectsOverlap` against the player. Small NPCs are eaten (player grows +3 px). Big NPCs trigger death in phase 1, or are eaten (player grows +8 px) in phase 2. On phase transition, player is resized to at least 2.5× base and recoloured green. |
| `flashEat(x, y, size, color)` | Spawns a brief expanding flash rectangle at the eaten NPC's position, then destroys it. |
| `showPhaseMessage(msg, color)` | Shows a centred message that fades and rises off-screen over ~2 seconds. |
| `triggerDeath()` | Sets `gameOver = true`, dims the screen, shows "GAME OVER", listens for R to restart. |
| `triggerWin()` | Sets `gameOver = true` and `won = true`, dims the screen, shows "YOU WIN!", listens for R. |

---

### Key Constants (`GameScene.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `SPEED` | 160 | Pixels per second — applies equally to player and all NPCs |
| `BASE_SIZE` | 30 | Player starting side length in pixels |
| `SMALL_COUNT` | 12 | Number of small (edible) NPC squares |
| `BIG_COUNT` | 6 | Number of large (dangerous) NPC squares |
| `CANVAS_W / CANVAS_H` | 800 / 600 | Phaser canvas dimensions |
| `NPC_DIRECTION_CHANGE_MS` | 1200 | Minimum milliseconds between NPC direction changes |

Small NPC side = `BASE_SIZE × 0.5` = 15 px  
Big NPC side = `BASE_SIZE × 2.2` = 66 px

---

## Architecture Assessment

### What is well-separated

The codebase cleanly separates **two concerns**:

- **React layer** (`Game.tsx`, `App.tsx`) — owns the DOM, lifecycle, and styling.
- **Game layer** (`GameScene.ts`) — owns all game state, physics, and rendering via Phaser.

The two layers communicate through a single boundary: React mounts the Phaser canvas into a `<div>` ref and destroys it on unmount. Neither layer reaches into the other's internals.

### Where the architecture is flat

`GameScene.ts` is a single class that handles everything: input, movement, NPC AI, collision, phase transitions, visual effects, and win/loss states. This is a deliberate choice suited to a small game — it keeps the code easy to read in one place. However, if the game were to grow (more NPC types, levels, a score system), the scene would benefit from being split into dedicated modules, for example:

- `src/game/constants.ts` — all numeric tuning values
- `src/game/NpcBehavior.ts` — movement and direction logic
- `src/game/CollisionSystem.ts` — AABB detection and response
- `src/game/PhaseManager.ts` — phase transition logic
- `src/game/HUD.ts` — text display management

---

## Tests

**There are currently no tests in this project.**

No test framework (Vitest, Jest, Playwright, etc.) is installed, and no test scripts are defined in `package.json`. The `typecheck` script (`pnpm --filter @workspace/square-eater run typecheck`) will catch TypeScript type errors, but it does not execute any runtime test assertions.

### What could be tested

Because all game logic lives inside a Phaser scene (which requires a browser environment to construct), standard unit tests are awkward to write without mocking the entire Phaser API. The most practical paths forward are:

1. **Extract pure functions** — `rectsOverlap` and NPC direction logic are pure and could be moved to a separate file and covered with straightforward Vitest unit tests.
2. **End-to-end browser tests** — Playwright could drive the game in a real browser, simulating keystrokes and asserting on canvas state or DOM text (the HUD text is a real DOM element rendered by Phaser's Canvas/WebGL context, so assertions would need to read game-state via exposed globals or DOM text).
3. **Integration smoke test** — A simple check that the Phaser game initialises without throwing, using `jsdom` + Phaser's headless mode.

---

## Development

```bash
# Install dependencies (from workspace root)
pnpm install

# Start the dev server
pnpm --filter @workspace/square-eater run dev

# Type-check without running
pnpm --filter @workspace/square-eater run typecheck

# Production build
pnpm --filter @workspace/square-eater run build
```
