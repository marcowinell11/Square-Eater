import Phaser from "phaser";
import { generateMaze, getPathCells } from "./mazeGenerator";

// ─── Constants ───────────────────────────────────────────────────────────────

const CANVAS_W = 800;
const CANVAS_H = 600;
const SPEED = 150;
const CELL_SIZE = 44;          // fixed world-pixel size of each maze grid cell
const TRANSITION_ZOOM = 6;    // how far in we zoom at level end
const ZOOM_IN_MS = 700;
const ZOOM_OUT_MS = 1400;
const TOTAL_LEVELS = 11;

// [mazeCols, mazeRows] = number of path cells (not counting walls)
// grid dimensions = (2*cols+1) × (2*rows+1)
const MAZE_CONFIGS: Array<[number, number] | null> = [
  null,         // Level  1 – open arena
  [5, 4],       // Level  2  grid 11×9
  [6, 4],       // Level  3  grid 13×9
  [6, 5],       // Level  4  grid 13×11
  [7, 5],       // Level  5  grid 15×11
  [7, 6],       // Level  6  grid 15×13
  [8, 6],       // Level  7  grid 17×13
  [8, 7],       // Level  8  grid 17×15
  [9, 7],       // Level  9  grid 19×15
  [9, 8],       // Level 10  grid 19×17
  [10, 9],      // Level 11  grid 21×19
];

// Open-arena sizes (level 1 only)
const ARENA_PLAYER_SIZE = 30;
const ARENA_SMALL_SIZE  = 15;
const ARENA_BIG_SIZE    = 66;
const ARENA_SMALL_COUNT = 12;
const ARENA_BIG_COUNT   = 6;
const ARENA_NPC_DIR_MS  = 1200;

// Maze sizing (relative to CELL_SIZE)
const MAZE_PLAYER_RATIO  = 0.42;
const MAZE_SMALL_RATIO   = 0.28;
const MAZE_BIG_RATIO     = 0.72;

// ─── Types ───────────────────────────────────────────────────────────────────

interface NpcRect extends Phaser.GameObjects.Rectangle {
  vx: number;
  vy: number;
  dirTimer: number;
  sizeCategory: "small" | "big";
}

// ─── Scene ───────────────────────────────────────────────────────────────────

export class GameScene extends Phaser.Scene {

  // passed between restarts
  private currentLevel = 1;
  private startZoom    = 1;

  // player
  private player!:    Phaser.GameObjects.Rectangle;
  private playerSize  = ARENA_PLAYER_SIZE;
  private phase: "eat-small" | "eat-big" = "eat-small";

  // npcs
  private npcs: NpcRect[] = [];

  // maze
  private mazeGrid: number[][] | null = null;
  private gridW = 0;
  private gridH = 0;
  private worldW = 0;
  private worldH = 0;

  // flags
  private isGameOver        = false;
  private isTransition      = false;
  private moveLocked        = false;
  private needsCameraFollow = false;

  // input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };

  // HUD
  private statusText!:  Phaser.GameObjects.Text;
  private sizeText!:    Phaser.GameObjects.Text;
  private levelText!:   Phaser.GameObjects.Text;
  private overlay!:     Phaser.GameObjects.Rectangle;
  private overlayText!: Phaser.GameObjects.Text;
  private subText!:     Phaser.GameObjects.Text;

  constructor() {
    super({ key: "GameScene" });
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  init(data: { level?: number; startZoom?: number } = {}) {
    this.currentLevel = typeof data.level    === "number" ? data.level    : 1;
    this.startZoom    = typeof data.startZoom === "number" ? data.startZoom : 1;
  }

  create() {
    this.isGameOver       = false;
    this.isTransition     = false;
    this.moveLocked       = false;
    this.needsCameraFollow = false;
    this.phase            = "eat-small";
    this.npcs             = [];

    if (this.currentLevel === 1) {
      this.setupArena();
    } else {
      this.setupMaze();
    }

    this.setupInput();
    this.setupHUD();
    this.updateHUD();

    // for large maze levels, always follow the player
    if (this.needsCameraFollow) {
      this.cameras.main.startFollow(this.player);
    }

    // zoom-out intro when coming from a previous level
    if (this.startZoom > 1) {
      this.moveLocked = true;
      this.cameras.main.setZoom(this.startZoom);
      this.cameras.main.startFollow(this.player);  // follow during zoom-out
      this.cameras.main.zoomTo(1, ZOOM_OUT_MS, "Quad.easeOut");
      this.time.delayedCall(ZOOM_OUT_MS + 50, () => {
        this.moveLocked = false;
        if (!this.needsCameraFollow) {
          this.cameras.main.stopFollow();
          this.cameras.main.centerOn(this.worldW / 2, this.worldH / 2);
        }
      });
    }
  }

  update(_time: number, delta: number) {
    if (this.isGameOver || this.isTransition) return;
    const dt = delta / 1000;
    this.handleInput(dt);
    this.moveNpcs(dt);
    this.checkCollisions();
    this.updateHUD();
  }

  // ─── Level Setup ───────────────────────────────────────────────────────────

  private setupArena() {
    this.worldW = CANVAS_W;
    this.worldH = CANVAS_H;
    this.mazeGrid = null;
    this.gridW = 0;
    this.gridH = 0;

    this.cameras.main.setBounds(0, 0, CANVAS_W, CANVAS_H);
    this.cameras.main.centerOn(CANVAS_W / 2, CANVAS_H / 2);

    // background + grid
    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x0a0a1a);
    this.add.grid(0, 0, CANVAS_W * 2, CANVAS_H * 2, 40, 40, 0, 0, 0x1a1a3a, 0.4).setOrigin(0, 0);

    this.playerSize = ARENA_PLAYER_SIZE;
    this.player = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, this.playerSize, this.playerSize, 0x00e5ff);
    this.player.setStrokeStyle(2, 0x80ffff);

    // spawn arena npcs
    for (let i = 0; i < ARENA_SMALL_COUNT; i++) this.spawnArenaRandom("small");
    for (let i = 0; i < ARENA_BIG_COUNT;   i++) this.spawnArenaRandom("big");
  }

  private setupMaze() {
    const cfg = MAZE_CONFIGS[this.currentLevel - 1]!;
    const [mazeCols, mazeRows] = cfg;

    this.mazeGrid = generateMaze(mazeCols, mazeRows);
    this.gridW = 2 * mazeCols + 1;
    this.gridH = 2 * mazeRows + 1;
    this.worldW = this.gridW * CELL_SIZE;
    this.worldH = this.gridH * CELL_SIZE;

    this.cameras.main.setBounds(0, 0, this.worldW, this.worldH);
    this.cameras.main.centerOn(this.worldW / 2, this.worldH / 2);

    this.drawMaze();
    // mark whether this level needs camera follow (world larger than viewport)
    this.needsCameraFollow = this.worldW > CANVAS_W || this.worldH > CANVAS_H;

    // player at center-ish cell of the maze
    const startGx = Math.floor(this.gridW / 2);
    const startGy = Math.floor(this.gridH / 2);
    // snap to nearest odd-odd cell (proper maze corridor)
    const pGx = startGx % 2 === 0 ? startGx + 1 : startGx;
    const pGy = startGy % 2 === 0 ? startGy + 1 : startGy;

    this.playerSize = Math.round(CELL_SIZE * MAZE_PLAYER_RATIO);
    this.player = this.add.rectangle(
      pGx * CELL_SIZE + CELL_SIZE / 2,
      pGy * CELL_SIZE + CELL_SIZE / 2,
      this.playerSize, this.playerSize,
      0x00e5ff
    );
    this.player.setStrokeStyle(2, 0x80ffff);
    this.player.setDepth(5);

    // spawn maze npcs (avoid player's starting cell ±2 cells)
    const playerAvoidDist = CELL_SIZE * 4;
    const pathCells = getPathCells(this.mazeGrid);
    const validCells = pathCells.filter(({ gx, gy }) => {
      const wx = gx * CELL_SIZE + CELL_SIZE / 2;
      const wy = gy * CELL_SIZE + CELL_SIZE / 2;
      return Phaser.Math.Distance.Between(wx, wy, this.player.x, this.player.y) > playerAvoidDist;
    });

    Phaser.Utils.Array.Shuffle(validCells);

    const smallCount = 3 + Math.floor((this.currentLevel - 2) * 0.6);
    const bigCount   = 1 + Math.floor((this.currentLevel - 2) * 0.4);

    for (let i = 0; i < smallCount && i < validCells.length; i++) {
      this.spawnMazeNpc(validCells[i].gx, validCells[i].gy, "small");
    }
    for (let i = smallCount; i < smallCount + bigCount && i < validCells.length; i++) {
      this.spawnMazeNpc(validCells[i].gx, validCells[i].gy, "big");
    }
  }

  private drawMaze() {
    if (!this.mazeGrid) return;

    // floor
    this.add.rectangle(this.worldW / 2, this.worldH / 2, this.worldW, this.worldH, 0x0d0d20).setDepth(0);

    const gfx = this.add.graphics().setDepth(1);
    gfx.fillStyle(0x1a1060, 1);
    gfx.lineStyle(1, 0x2a1888, 1);

    for (let gy = 0; gy < this.gridH; gy++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        if (this.mazeGrid![gy][gx] === 0) {
          gfx.fillRect(
            gx * CELL_SIZE, gy * CELL_SIZE,
            CELL_SIZE, CELL_SIZE
          );
          gfx.strokeRect(
            gx * CELL_SIZE, gy * CELL_SIZE,
            CELL_SIZE, CELL_SIZE
          );
        }
      }
    }

    // subtle floor grid on path cells
    const fgfx = this.add.graphics().setDepth(1);
    fgfx.lineStyle(1, 0x1a1a3a, 0.3);
    for (let gy = 0; gy < this.gridH; gy++) {
      for (let gx = 0; gx < this.gridW; gx++) {
        if (this.mazeGrid![gy][gx] === 1) {
          fgfx.strokeRect(gx * CELL_SIZE, gy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }

  // ─── NPC Spawning ──────────────────────────────────────────────────────────

  private spawnArenaRandom(category: "small" | "big") {
    const size = category === "small" ? ARENA_SMALL_SIZE : ARENA_BIG_SIZE;
    const color = category === "small" ? 0xffdd44 : 0xff4455;
    const stroke = category === "small" ? 0xffaa00 : 0xaa0011;

    let x: number, y: number, tries = 0;
    do {
      x = Phaser.Math.Between(size, CANVAS_W - size);
      y = Phaser.Math.Between(size, CANVAS_H - size);
      tries++;
    } while (
      tries < 30 &&
      Phaser.Math.Distance.Between(x, y, CANVAS_W / 2, CANVAS_H / 2) < 120
    );

    const npc = this.add.rectangle(x, y, size, size, color) as NpcRect;
    npc.setStrokeStyle(2, stroke);
    npc.sizeCategory = category;
    npc.vx = Phaser.Math.Between(0, 1) ? SPEED : -SPEED;
    npc.vy = Phaser.Math.Between(0, 1) ? SPEED : -SPEED;
    npc.dirTimer = Phaser.Math.Between(600, ARENA_NPC_DIR_MS);
    this.npcs.push(npc);
  }

  private spawnMazeNpc(gx: number, gy: number, category: "small" | "big") {
    const size   = Math.round(CELL_SIZE * (category === "small" ? MAZE_SMALL_RATIO : MAZE_BIG_RATIO));
    const color  = category === "small" ? 0xffdd44 : 0xff4455;
    const stroke = category === "small" ? 0xffaa00 : 0xaa0011;

    const wx = gx * CELL_SIZE + CELL_SIZE / 2;
    const wy = gy * CELL_SIZE + CELL_SIZE / 2;

    const npc = this.add.rectangle(wx, wy, size, size, color) as NpcRect;
    npc.setStrokeStyle(2, stroke);
    npc.setDepth(3);
    npc.sizeCategory = category;
    npc.dirTimer = Phaser.Math.Between(0, 600);
    // start with a random cardinal direction
    this.pickMazeNpcDir(npc);
    this.npcs.push(npc);
  }

  // ─── Input ─────────────────────────────────────────────────────────────────

  private setupInput() {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up:    kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  private handleInput(dt: number) {
    if (this.moveLocked) return;

    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    let px = this.player.x;
    let py = this.player.y;
    const half = this.playerSize / 2;
    const dx = SPEED * dt;

    if (this.mazeGrid) {
      // maze: slide along walls (try each axis independently)
      const nx = px + (right ? dx : left ? -dx : 0);
      const ny = py + (down  ? dx : up   ? -dx : 0);

      if (!this.hitsMazeWall(nx, py, this.playerSize)) px = nx;
      if (!this.hitsMazeWall(px, ny, this.playerSize)) py = ny;

      // clamp to world bounds
      px = Phaser.Math.Clamp(px, half, this.worldW - half);
      py = Phaser.Math.Clamp(py, half, this.worldH - half);
    } else {
      // open arena
      if (up)    py -= dx;
      if (down)  py += dx;
      if (left)  px -= dx;
      if (right) px += dx;
      px = Phaser.Math.Clamp(px, half, CANVAS_W - half);
      py = Phaser.Math.Clamp(py, half, CANVAS_H - half);
    }

    this.player.setPosition(px, py);
    this.player.setSize(this.playerSize, this.playerSize);
  }

  // ─── NPC Movement ──────────────────────────────────────────────────────────

  private moveNpcs(dt: number) {
    if (this.mazeGrid) {
      this.moveNpcsMaze(dt);
    } else {
      this.moveNpcsArena(dt);
    }
  }

  private moveNpcsArena(dt: number) {
    for (const npc of this.npcs) {
      npc.dirTimer -= dt * 1000;
      if (npc.dirTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        npc.vx = Math.cos(angle) * SPEED;
        npc.vy = Math.sin(angle) * SPEED;
        npc.dirTimer = ARENA_NPC_DIR_MS + Math.random() * 600;
      }

      const half = npc.width / 2;
      let nx = npc.x + npc.vx * dt;
      let ny = npc.y + npc.vy * dt;

      if (nx - half < 0)        { nx = half;            npc.vx =  Math.abs(npc.vx); }
      if (nx + half > CANVAS_W) { nx = CANVAS_W - half; npc.vx = -Math.abs(npc.vx); }
      if (ny - half < 0)        { ny = half;            npc.vy =  Math.abs(npc.vy); }
      if (ny + half > CANVAS_H) { ny = CANVAS_H - half; npc.vy = -Math.abs(npc.vy); }

      npc.setPosition(nx, ny);
    }
  }

  private moveNpcsMaze(dt: number) {
    for (const npc of this.npcs) {
      npc.dirTimer -= dt * 1000;

      const half = npc.width / 2;
      const nx = npc.x + npc.vx * dt;
      const ny = npc.y + npc.vy * dt;

      // check wall collision on each axis
      const canX = !this.hitsMazeWall(nx, npc.y, npc.width);
      const canY = !this.hitsMazeWall(npc.x, ny, npc.height);

      if (canX) {
        npc.x = Phaser.Math.Clamp(nx, half, this.worldW - half);
      } else {
        // snap to wall and change direction
        this.pickMazeNpcDir(npc);
      }

      if (canY) {
        npc.y = Phaser.Math.Clamp(ny, half, this.worldH - half);
      } else {
        this.pickMazeNpcDir(npc);
      }

      // random direction change
      if (npc.dirTimer <= 0) {
        this.pickMazeNpcDir(npc);
        npc.dirTimer = 1000 + Math.random() * 1200;
      }
    }
  }

  private pickMazeNpcDir(npc: NpcRect) {
    const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    Phaser.Utils.Array.Shuffle(dirs);

    // prefer not to reverse
    const revIdx = dirs.findIndex(([vx, vy]) => vx === -npc.vx && vy === -npc.vy);
    if (revIdx > 0) {
      const [removed] = dirs.splice(revIdx, 1);
      dirs.push(removed);
    }

    const probe = CELL_SIZE * 0.7;
    for (const [dx, dy] of dirs) {
      const tx = npc.x + dx * probe;
      const ty = npc.y + dy * probe;
      if (!this.hitsMazeWall(tx, ty, npc.width)) {
        npc.vx = dx * SPEED;
        npc.vy = dy * SPEED;
        return;
      }
    }
    // completely stuck – try any direction after a tiny delay
    npc.vx = 0;
    npc.vy = 0;
    npc.dirTimer = 80;
  }

  // ─── Wall Collision ────────────────────────────────────────────────────────

  private hitsMazeWall(cx: number, cy: number, size: number): boolean {
    if (!this.mazeGrid) return false;
    const half = size / 2 - 1; // 1px inset to allow snug corridor navigation
    const corners = [
      [cx - half, cy - half],
      [cx + half, cy - half],
      [cx - half, cy + half],
      [cx + half, cy + half],
    ];
    for (const [wx, wy] of corners) {
      const gx = Math.floor(wx / CELL_SIZE);
      const gy = Math.floor(wy / CELL_SIZE);
      if (gx < 0 || gx >= this.gridW || gy < 0 || gy >= this.gridH) return true;
      if (this.mazeGrid[gy][gx] === 0) return true;
    }
    return false;
  }

  // ─── Collision Detection ───────────────────────────────────────────────────

  private rectsOverlap(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number,
  ): boolean {
    return (
      ax - aw / 2 < bx + bw / 2 &&
      ax + aw / 2 > bx - bw / 2 &&
      ay - ah / 2 < by + bh / 2 &&
      ay + ah / 2 > by - bh / 2
    );
  }

  private checkCollisions() {
    const { x: px, y: py } = this.player;
    const ps = this.playerSize;
    const toRemove: NpcRect[] = [];

    for (const npc of this.npcs) {
      if (!this.rectsOverlap(px, py, ps, ps, npc.x, npc.y, npc.width, npc.height)) continue;

      if (npc.sizeCategory === "small") {
        toRemove.push(npc);
        const growBy = this.mazeGrid ? 2 : 3;
        this.playerSize = Math.min(
          this.playerSize + growBy,
          this.mazeGrid ? CELL_SIZE * 0.88 : 999
        );
      } else {
        if (this.phase === "eat-big") {
          toRemove.push(npc);
          const growBy = this.mazeGrid ? 3 : 8;
          this.playerSize = Math.min(
            this.playerSize + growBy,
            this.mazeGrid ? CELL_SIZE * 0.88 : 999
          );
        } else {
          this.triggerDeath();
          return;
        }
      }
    }

    for (const npc of toRemove) {
      this.flashEat(npc.x, npc.y, npc.width, npc.fillColor);
      npc.destroy();
      this.npcs = this.npcs.filter(n => n !== npc);
    }

    // phase transition
    if (this.phase === "eat-small" && this.npcs.filter(n => n.sizeCategory === "small").length === 0) {
      this.phase = "eat-big";
      if (this.mazeGrid) {
        this.playerSize = Math.max(this.playerSize, Math.round(CELL_SIZE * MAZE_BIG_RATIO * 1.05));
      } else {
        this.playerSize = Math.max(this.playerSize, ARENA_BIG_SIZE + 5);
      }
      this.player.setFillStyle(0x00ffaa);
      this.player.setStrokeStyle(2, 0x00aa66);
      for (const npc of this.npcs) {
        if (npc.sizeCategory === "big") {
          npc.setFillStyle(0xff4455);
          npc.setStrokeStyle(3, 0xff0000);
        }
      }
      this.showMessage("Phase 2!\nEat the big squares!", 0x00ffaa);
    }

    if (this.npcs.length === 0 && !this.isTransition) {
      this.onLevelComplete();
    }
  }

  // ─── Level Progression ─────────────────────────────────────────────────────

  private onLevelComplete() {
    this.isTransition = true;
    this.moveLocked   = true;

    if (this.currentLevel === TOTAL_LEVELS) {
      this.triggerWin();
      return;
    }

    // zoom in on player, then start next level
    this.cameras.main.startFollow(this.player);
    this.cameras.main.zoomTo(TRANSITION_ZOOM, ZOOM_IN_MS, "Quad.easeIn");

    const nextLevel = this.currentLevel + 1;
    this.time.delayedCall(ZOOM_IN_MS + 100, () => {
      this.scene.restart({ level: nextLevel, startZoom: TRANSITION_ZOOM });
    });
  }

  private triggerDeath() {
    this.isGameOver = true;
    this.player.setFillStyle(0xff0000);
    this.overlay.setFillStyle(0x000000, 0.75);
    this.overlayText.setText("GAME OVER").setColor("#ff4455");
    this.subText.setText("You touched a bigger square!\nPress R to restart from Level 1");
    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart({ level: 1, startZoom: 1 });
    });
  }

  private triggerWin() {
    this.isGameOver = true;
    this.player.setFillStyle(0xffdd00);
    this.overlay.setFillStyle(0x000000, 0.75);
    this.overlayText.setText("YOU WIN!").setColor("#ffdd00");
    this.subText.setText(`You conquered all ${TOTAL_LEVELS} levels!\nPress R to play again`);
    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart({ level: 1, startZoom: 1 });
    });
  }

  // ─── HUD ───────────────────────────────────────────────────────────────────

  private setupHUD() {
    // fixed to camera (depth ensures it's always on top)
    this.levelText = this.add.text(CANVAS_W - 10, 10, "", {
      fontSize: "15px",
      color: "#ffdd44",
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);

    this.statusText = this.add.text(10, 10, "", {
      fontSize: "13px",
      color: "#aaaacc",
      fontFamily: "monospace",
    }).setScrollFactor(0).setDepth(20);

    this.sizeText = this.add.text(10, 30, "", {
      fontSize: "13px",
      color: "#00e5ff",
      fontFamily: "monospace",
    }).setScrollFactor(0).setDepth(20);

    // overlay (game over / win screen)
    this.overlay = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0)
      .setScrollFactor(0).setDepth(30);
    this.overlayText = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 40, "", {
      fontSize: "42px",
      color: "#ffffff",
      fontFamily: "monospace",
      fontStyle: "bold",
      align: "center",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31);
    this.subText = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 20, "", {
      fontSize: "17px",
      color: "#aaaacc",
      fontFamily: "monospace",
      align: "center",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(31);
  }

  private updateHUD() {
    this.levelText.setText(`Level ${this.currentLevel} / ${TOTAL_LEVELS}`);

    const smallLeft = this.npcs.filter(n => n.sizeCategory === "small").length;
    const bigLeft   = this.npcs.filter(n => n.sizeCategory === "big").length;

    if (this.phase === "eat-small") {
      this.statusText.setText(`Phase 1: Eat the small squares (${smallLeft} left)`);
    } else {
      this.statusText.setText(`Phase 2: Eat the big squares! (${bigLeft} left)`);
    }
    this.sizeText.setText(`Your size: ${Math.round(this.playerSize)}`);
  }

  // ─── FX Helpers ────────────────────────────────────────────────────────────

  private flashEat(x: number, y: number, size: number, color: number) {
    const flash = this.add.rectangle(x, y, size * 1.5, size * 1.5, color, 0.85).setDepth(8);
    this.tweens.add({
      targets: flash,
      alpha: 0, scaleX: 2.2, scaleY: 2.2,
      duration: 220,
      onComplete: () => flash.destroy(),
    });
  }

  private showMessage(msg: string, color = 0xffffff) {
    const hex = "#" + color.toString(16).padStart(6, "0");
    const txt = this.add.text(CANVAS_W / 2, CANVAS_H / 2, msg, {
      fontSize: "30px",
      color: hex,
      fontFamily: "monospace",
      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(25);

    this.tweens.add({
      targets: txt,
      alpha: 0, y: txt.y - 80,
      duration: 1800,
      delay: 400,
      onComplete: () => txt.destroy(),
    });
  }
}
