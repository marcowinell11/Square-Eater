import Phaser from "phaser";

const SPEED = 160;
const BASE_SIZE = 30;
const CANVAS_W = 800;
const CANVAS_H = 600;
const NPC_DIRECTION_CHANGE_MS = 1200;
const TOTAL_LEVELS = 11;

// Per-level counts: level N → bigCount = N+1, smallCount = (N+1)*2
function bigCount(level: number)   { return level + 1; }
function smallCount(level: number) { return (level + 1) * 2; }

interface NpcSquare extends Phaser.GameObjects.Rectangle {
  vx: number;
  vy: number;
  dirTimer: number;
  sizeCategory: "small" | "big";
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private npcs: NpcSquare[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private playerSize = BASE_SIZE;
  private phase: "eat-small" | "eat-big" = "eat-small";
  private statusText!: Phaser.GameObjects.Text;
  private sizeText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Rectangle;
  private overlayText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private currentLevel = 1;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: { level?: number } = {}) {
    this.currentLevel = typeof data.level === "number" ? data.level : 1;
  }

  create() {
    this.gameOver = false;
    this.phase = "eat-small";
    this.playerSize = BASE_SIZE;
    this.npcs = [];

    // Background
    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x0a0a1a);
    this.add.grid(0, 0, CANVAS_W * 2, CANVAS_H * 2, 40, 40, 0x0a0a1a, 0, 0x1a1a3a, 0.4).setOrigin(0, 0);

    // Player
    this.player = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, this.playerSize, this.playerSize, 0x00e5ff);
    this.player.setStrokeStyle(2, 0x80ffff);

    const smallSize = Math.round(BASE_SIZE * 0.5);
    const bigSize   = Math.round(BASE_SIZE * 2.2);

    for (let i = 0; i < smallCount(this.currentLevel); i++) this.spawnNpc("small", smallSize);
    for (let i = 0; i < bigCount(this.currentLevel); i++)   this.spawnNpc("big",   bigSize);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // HUD
    this.statusText = this.add.text(10, 10, "", { fontSize: "14px", color: "#aaaacc", fontFamily: "monospace" });
    this.sizeText   = this.add.text(10, 32, "", { fontSize: "14px", color: "#00e5ff", fontFamily: "monospace" });
    this.levelText  = this.add.text(CANVAS_W - 10, 10, "", {
      fontSize: "16px", color: "#ffffff", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(1, 0);

    // Overlay (game over / win)
    this.overlay = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0).setDepth(10);
    this.overlayText = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 40, "", {
      fontSize: "42px", color: "#ffffff", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(11);
    this.subText = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 20, "", {
      fontSize: "18px", color: "#aaaacc", fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(11);

    this.updateHUD();
  }

  // ─── NPC Spawning ────────────────────────────────────────────────────────────

  private spawnNpc(category: "small" | "big", size: number) {
    let x: number, y: number;
    let tries = 0;
    do {
      x = Phaser.Math.Between(size, CANVAS_W - size);
      y = Phaser.Math.Between(size, CANVAS_H - size);
      tries++;
    } while (
      tries < 30 &&
      Phaser.Math.Distance.Between(x, y, CANVAS_W / 2, CANVAS_H / 2) < 130
    );

    const color       = category === "small" ? 0xffdd44 : 0xcc2233;
    const strokeColor = category === "small" ? 0xffaa00 : 0xaa0011;

    // Big squares are dimmed / locked until phase 2
    const alpha = category === "big" ? 0.5 : 1;

    const npc = this.add.rectangle(x, y, size, size, color, alpha) as NpcSquare;
    npc.setStrokeStyle(2, strokeColor);
    npc.vx = Phaser.Math.Between(0, 1) ? SPEED : -SPEED;
    npc.vy = Phaser.Math.Between(0, 1) ? SPEED : -SPEED;
    npc.dirTimer = 0;
    npc.sizeCategory = category;
    this.npcs.push(npc);
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────

  private updateHUD() {
    const smallLeft = this.npcs.filter(n => n.sizeCategory === "small").length;
    const bigLeft   = this.npcs.filter(n => n.sizeCategory === "big").length;

    if (this.phase === "eat-small") {
      this.statusText.setText(`Phase 1: Eat the small squares (${smallLeft} left)`);
    } else {
      this.statusText.setText(`Phase 2: Eat the big squares! (${bigLeft} left)`);
    }
    this.sizeText.setText(`Your size: ${Math.round(this.playerSize)}`);
    this.levelText.setText(`Level ${this.currentLevel} / ${TOTAL_LEVELS}`);
  }

  // ─── Update Loop ─────────────────────────────────────────────────────────────

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    const dt   = delta / 1000;
    const half = this.playerSize / 2;

    let px = this.player.x;
    let py = this.player.y;

    const up    = this.cursors.up.isDown    || this.wasd.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasd.down.isDown;
    const left  = this.cursors.left.isDown  || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;

    if (up)    py -= SPEED * dt;
    if (down)  py += SPEED * dt;
    if (left)  px -= SPEED * dt;
    if (right) px += SPEED * dt;

    px = Phaser.Math.Clamp(px, half, CANVAS_W - half);
    py = Phaser.Math.Clamp(py, half, CANVAS_H - half);

    this.player.setPosition(px, py);
    this.player.setSize(this.playerSize, this.playerSize);

    // Move NPCs
    for (const npc of this.npcs) {
      npc.dirTimer -= delta;
      if (npc.dirTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        npc.vx = Math.cos(angle) * SPEED;
        npc.vy = Math.sin(angle) * SPEED;
        npc.dirTimer = NPC_DIRECTION_CHANGE_MS + Math.random() * 600;
      }

      const nh = npc.width / 2;
      let nx = npc.x + npc.vx * dt;
      let ny = npc.y + npc.vy * dt;

      if (nx - nh < 0)        { nx = nh;          npc.vx =  Math.abs(npc.vx); }
      if (nx + nh > CANVAS_W) { nx = CANVAS_W - nh; npc.vx = -Math.abs(npc.vx); }
      if (ny - nh < 0)        { ny = nh;          npc.vy =  Math.abs(npc.vy); }
      if (ny + nh > CANVAS_H) { ny = CANVAS_H - nh; npc.vy = -Math.abs(npc.vy); }

      npc.setPosition(nx, ny);
    }

    this.checkCollisions();
    this.updateHUD();
  }

  // ─── Collision ───────────────────────────────────────────────────────────────

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
    const toRemove: NpcSquare[] = [];

    for (const npc of this.npcs) {
      if (!this.rectsOverlap(px, py, ps, ps, npc.x, npc.y, npc.width, npc.height)) continue;

      if (npc.sizeCategory === "small") {
        toRemove.push(npc);
        this.playerSize += 3;
      } else {
        if (this.phase === "eat-big") {
          toRemove.push(npc);
          this.playerSize += 8;
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

    // Phase transition
    if (this.phase === "eat-small" && this.npcs.filter(n => n.sizeCategory === "small").length === 0) {
      this.phase = "eat-big";
      this.playerSize = Math.max(this.playerSize, BASE_SIZE * 2.5);
      this.player.setFillStyle(0x00ffaa);
      this.player.setStrokeStyle(2, 0x00aa66);

      for (const npc of this.npcs) {
        if (npc.sizeCategory === "big") {
          npc.setAlpha(1);
          npc.setFillStyle(0xff4455);
          npc.setStrokeStyle(3, 0xff0022);
        }
      }

      this.showMessage("Phase 2!\nNow eat the big squares!", 0x00ffaa);
    }

    if (this.npcs.length === 0) {
      if (this.currentLevel >= TOTAL_LEVELS) {
        this.triggerWin();
      } else {
        this.triggerLevelComplete();
      }
    }
  }

  // ─── Effects ─────────────────────────────────────────────────────────────────

  private flashEat(x: number, y: number, size: number, color: number) {
    const flash = this.add.rectangle(x, y, size * 1.5, size * 1.5, color, 0.8);
    this.tweens.add({
      targets: flash, alpha: 0, scaleX: 2, scaleY: 2, duration: 250,
      onComplete: () => flash.destroy(),
    });
  }

  private showMessage(msg: string, color: number) {
    const hex = "#" + color.toString(16).padStart(6, "0");
    const txt = this.add.text(CANVAS_W / 2, CANVAS_H / 2, msg, {
      fontSize: "32px", color: hex, fontFamily: "monospace",
      fontStyle: "bold", align: "center", stroke: "#000000", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(9);

    this.tweens.add({
      targets: txt, alpha: 0, y: CANVAS_H / 2 - 80, duration: 2000, delay: 500,
      onComplete: () => txt.destroy(),
    });
  }

  // ─── End States ──────────────────────────────────────────────────────────────

  private triggerDeath() {
    this.gameOver = true;
    this.player.setFillStyle(0xff0000);
    this.overlay.setFillStyle(0x000000, 0.75);
    this.overlayText.setText("GAME OVER").setColor("#ff4455");
    this.subText.setText(`You touched a bigger square!\nR — retry Level ${this.currentLevel}   M — main menu`);

    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart({ level: this.currentLevel });
    });
    this.input.keyboard!.once("keydown-M", () => {
      this.scene.start("MenuScene");
    });
  }

  private triggerLevelComplete() {
    this.gameOver = true;
    this.player.setFillStyle(0xffdd00);
    this.overlay.setFillStyle(0x000000, 0.6);
    this.overlayText.setText(`LEVEL ${this.currentLevel} CLEAR!`).setColor("#ffdd00");
    this.subText.setText(`Get ready for Level ${this.currentLevel + 1}\nPress R to continue`);

    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart({ level: this.currentLevel + 1 });
    });
  }

  private triggerWin() {
    this.gameOver = true;
    this.player.setFillStyle(0xffdd00);
    this.overlay.setFillStyle(0x000000, 0.75);
    this.overlayText.setText("YOU WIN!").setColor("#ffdd00");
    this.subText.setText("All 11 levels conquered!\nR — play again   M — main menu");

    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart({ level: 1 });
    });
    this.input.keyboard!.once("keydown-M", () => {
      this.scene.start("MenuScene");
    });
  }
}
