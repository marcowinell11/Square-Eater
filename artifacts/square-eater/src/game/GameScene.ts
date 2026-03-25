import Phaser from "phaser";

const SPEED = 160;
const BASE_SIZE = 30;
const SMALL_COUNT = 12;
const BIG_COUNT = 6;
const CANVAS_W = 800;
const CANVAS_H = 600;
const NPC_DIRECTION_CHANGE_MS = 1200;

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
  private playerSize: number = BASE_SIZE;
  private phase: "eat-small" | "eat-big" = "eat-small";
  private statusText!: Phaser.GameObjects.Text;
  private sizeText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Rectangle;
  private overlayText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;
  private gameOver = false;
  private won = false;
  private smallEaten = 0;
  private totalSmall = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.gameOver = false;
    this.won = false;
    this.smallEaten = 0;
    this.phase = "eat-small";
    this.playerSize = BASE_SIZE;
    this.npcs = [];

    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x0a0a1a);

    this.add.grid(0, 0, CANVAS_W * 2, CANVAS_H * 2, 40, 40, 0x0a0a1a, 0, 0x1a1a3a, 0.4).setOrigin(0, 0);

    this.player = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, this.playerSize, this.playerSize, 0x00e5ff);
    this.player.setStrokeStyle(2, 0x80ffff);

    const smallSize = Math.round(BASE_SIZE * 0.5);
    const bigSize = Math.round(BASE_SIZE * 2.2);

    for (let i = 0; i < SMALL_COUNT; i++) {
      this.spawnNpc("small", smallSize);
    }
    for (let i = 0; i < BIG_COUNT; i++) {
      this.spawnNpc("big", bigSize);
    }

    this.totalSmall = SMALL_COUNT;

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.statusText = this.add.text(10, 10, "", {
      fontSize: "14px",
      color: "#aaaacc",
      fontFamily: "monospace",
    });

    this.sizeText = this.add.text(10, 32, "", {
      fontSize: "14px",
      color: "#00e5ff",
      fontFamily: "monospace",
    });

    this.overlay = this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x000000, 0).setDepth(10);
    this.overlayText = this.add.text(CANVAS_W / 2, CANVAS_H / 2 - 40, "", {
      fontSize: "42px",
      color: "#ffffff",
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5).setDepth(11);
    this.subText = this.add.text(CANVAS_W / 2, CANVAS_H / 2 + 20, "", {
      fontSize: "18px",
      color: "#aaaacc",
      fontFamily: "monospace",
    }).setOrigin(0.5).setDepth(11);

    this.updateHUD();
  }

  private spawnNpc(category: "small" | "big", size: number) {
    let x: number, y: number;
    let tries = 0;
    do {
      x = Phaser.Math.Between(size, CANVAS_W - size);
      y = Phaser.Math.Between(size, CANVAS_H - size);
      tries++;
    } while (
      tries < 30 &&
      Phaser.Math.Distance.Between(x, y, CANVAS_W / 2, CANVAS_H / 2) < 120
    );

    const color = category === "small" ? 0xffdd44 : 0xff4455;
    const strokeColor = category === "small" ? 0xffaa00 : 0xaa0011;

    const npc = this.add.rectangle(x, y, size, size, color) as NpcSquare;
    npc.setStrokeStyle(2, strokeColor);
    npc.vx = Phaser.Math.Between(0, 1) ? SPEED : -SPEED;
    npc.vy = Phaser.Math.Between(0, 1) ? SPEED : -SPEED;
    npc.dirTimer = 0;
    npc.sizeCategory = category;
    this.npcs.push(npc);
  }

  private updateHUD() {
    const remaining = this.npcs.filter(n => n.sizeCategory === "small").length;
    if (this.phase === "eat-small") {
      this.statusText.setText(`Phase 1: Eat the small squares (${remaining} left)`);
    } else {
      const bigRemaining = this.npcs.filter(n => n.sizeCategory === "big").length;
      this.statusText.setText(`Phase 2: Eat the big squares! (${bigRemaining} left)`);
    }
    this.sizeText.setText(`Your size: ${Math.round(this.playerSize)}`);
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    const dt = delta / 1000;

    let px = this.player.x;
    let py = this.player.y;
    const half = this.playerSize / 2;

    const upPressed = this.cursors.up.isDown || this.wasd.up.isDown;
    const downPressed = this.cursors.down.isDown || this.wasd.down.isDown;
    const leftPressed = this.cursors.left.isDown || this.wasd.left.isDown;
    const rightPressed = this.cursors.right.isDown || this.wasd.right.isDown;

    if (upPressed) py -= SPEED * dt;
    if (downPressed) py += SPEED * dt;
    if (leftPressed) px -= SPEED * dt;
    if (rightPressed) px += SPEED * dt;

    px = Phaser.Math.Clamp(px, half, CANVAS_W - half);
    py = Phaser.Math.Clamp(py, half, CANVAS_H - half);

    this.player.setPosition(px, py);
    this.player.setSize(this.playerSize, this.playerSize);

    for (const npc of this.npcs) {
      npc.dirTimer -= delta;
      if (npc.dirTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        npc.vx = Math.cos(angle) * SPEED;
        npc.vy = Math.sin(angle) * SPEED;
        npc.dirTimer = NPC_DIRECTION_CHANGE_MS + Math.random() * 600;
      }

      const npcHalf = npc.width / 2;
      let nx = npc.x + npc.vx * dt;
      let ny = npc.y + npc.vy * dt;

      if (nx - npcHalf < 0) { nx = npcHalf; npc.vx = Math.abs(npc.vx); }
      if (nx + npcHalf > CANVAS_W) { nx = CANVAS_W - npcHalf; npc.vx = -Math.abs(npc.vx); }
      if (ny - npcHalf < 0) { ny = npcHalf; npc.vy = Math.abs(npc.vy); }
      if (ny + npcHalf > CANVAS_H) { ny = CANVAS_H - npcHalf; npc.vy = -Math.abs(npc.vy); }

      npc.setPosition(nx, ny);
    }

    this.checkCollisions();
    this.updateHUD();
  }

  private rectsOverlap(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return (
      ax - aw / 2 < bx + bw / 2 &&
      ax + aw / 2 > bx - bw / 2 &&
      ay - ah / 2 < by + bh / 2 &&
      ay + ah / 2 > by - bh / 2
    );
  }

  private checkCollisions() {
    const px = this.player.x;
    const py = this.player.y;
    const ps = this.playerSize;

    const toRemove: NpcSquare[] = [];

    for (const npc of this.npcs) {
      if (!this.rectsOverlap(px, py, ps, ps, npc.x, npc.y, npc.width, npc.height)) continue;

      if (npc.sizeCategory === "small") {
        toRemove.push(npc);
        this.smallEaten++;
        this.playerSize += 3;
        this.player.setFillStyle(0x00e5ff);
      } else if (npc.sizeCategory === "big") {
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

    const smallLeft = this.npcs.filter(n => n.sizeCategory === "small").length;

    if (this.phase === "eat-small" && smallLeft === 0) {
      this.phase = "eat-big";
      this.playerSize = Math.max(this.playerSize, BASE_SIZE * 2.5);
      this.player.setSize(this.playerSize, this.playerSize);
      this.player.setFillStyle(0x00ffaa);
      this.player.setStrokeStyle(2, 0x00aa66);

      for (const npc of this.npcs) {
        if (npc.sizeCategory === "big") {
          npc.setFillStyle(0xff4455);
          npc.setStrokeStyle(3, 0xff0022);
        }
      }

      this.showPhaseMessage("Phase 2!\nNow eat the big squares!", 0x00ffaa);
    }

    if (this.npcs.length === 0) {
      this.triggerWin();
    }
  }

  private flashEat(x: number, y: number, size: number, color: number) {
    const flash = this.add.rectangle(x, y, size * 1.5, size * 1.5, color, 0.8);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 250,
      onComplete: () => flash.destroy(),
    });
  }

  private showPhaseMessage(msg: string, color: number) {
    const hex = "#" + color.toString(16).padStart(6, "0");
    const txt = this.add.text(CANVAS_W / 2, CANVAS_H / 2, msg, {
      fontSize: "32px",
      color: hex,
      fontFamily: "monospace",
      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(9);

    this.tweens.add({
      targets: txt,
      alpha: 0,
      y: CANVAS_H / 2 - 80,
      duration: 2000,
      delay: 500,
      onComplete: () => txt.destroy(),
    });
  }

  private triggerDeath() {
    this.gameOver = true;
    this.overlay.setFillStyle(0x000000, 0.75);
    this.player.setFillStyle(0xff0000);
    this.overlayText.setText("GAME OVER").setColor("#ff4455");
    this.subText.setText("You touched a bigger square!\nPress R to restart");

    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart();
    });
  }

  private triggerWin() {
    this.gameOver = true;
    this.won = true;
    this.overlay.setFillStyle(0x000000, 0.75);
    this.player.setFillStyle(0xffdd00);
    this.overlayText.setText("YOU WIN!").setColor("#ffdd00");
    this.subText.setText("You are the last square standing!\nPress R to play again");

    this.input.keyboard!.once("keydown-R", () => {
      this.scene.restart();
    });
  }
}
