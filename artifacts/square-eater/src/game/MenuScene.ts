import Phaser from "phaser";
import { playMusic, AUDIO_KEYS } from "./AudioManager";

const CANVAS_W = 800;
const CANVAS_H = 600;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    playMusic(AUDIO_KEYS.menuMusic);
    // Background
    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x0a0a1a);
    this.add.grid(0, 0, CANVAS_W * 2, CANVAS_H * 2, 40, 40, 0x0a0a1a, 0, 0x1a1a3a, 0.4).setOrigin(0, 0);

    // Decorative squares drifting in the background
    this.spawnDeco(120, 140, 36, 0x00e5ff, 0.15);
    this.spawnDeco(680, 460, 52, 0xffdd44, 0.12);
    this.spawnDeco(660, 130, 26, 0xff4455, 0.1);
    this.spawnDeco(140, 450, 44, 0x00ffaa, 0.1);
    this.spawnDeco(400, 80,  20, 0xffdd44, 0.1);
    this.spawnDeco(400, 520, 30, 0xff4455, 0.1);

    // Title
    this.add.text(CANVAS_W / 2, 160, "SQUARE EATER", {
      fontSize: "56px",
      color: "#00e5ff",
      fontFamily: "monospace",
      fontStyle: "bold",
      stroke: "#003344",
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Tagline
    this.add.text(CANVAS_W / 2, 228, "Eat smaller. Avoid bigger. Survive 11 levels.", {
      fontSize: "16px",
      color: "#8888aa",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // How-to-play pill labels
    const hints = [
      { color: 0xffdd44, label: "Small squares — eat these first" },
      { color: 0x00ffaa, label: "Turn green when ready to eat big" },
      { color: 0xff4455, label: "Big squares — deadly until phase 2" },
    ];
    hints.forEach(({ color, label }, i) => {
      const y = 300 + i * 38;
      this.add.rectangle(CANVAS_W / 2 - 160, y, 22, 22, color).setOrigin(0.5);
      this.add.text(CANVAS_W / 2 - 144, y, label, {
        fontSize: "14px",
        color: "#aaaacc",
        fontFamily: "monospace",
      }).setOrigin(0, 0.5);
    });

    // Start button
    const btnW = 220;
    const btnH = 54;
    const btnX = CANVAS_W / 2;
    const btnY = 500;

    const btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x00e5ff)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(btnX, btnY, "START GAME", {
      fontSize: "20px",
      color: "#0a0a1a",
      fontFamily: "monospace",
      fontStyle: "bold",
    }).setOrigin(0.5);

    // Button hover states
    btnBg.on("pointerover", () => {
      btnBg.setFillStyle(0x80ffff);
    });
    btnBg.on("pointerout", () => {
      btnBg.setFillStyle(0x00e5ff);
    });
    btnBg.on("pointerdown", () => {
      btnBg.setFillStyle(0x009ab0);
    });
    btnBg.on("pointerup", () => {
      this.scene.start("GameScene", { level: 1 });
    });

    // Also start on Space / Enter
    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("GameScene", { level: 1 }));
    this.input.keyboard!.once("keydown-ENTER", () => this.scene.start("GameScene", { level: 1 }));

    // Hint below button
    this.add.text(CANVAS_W / 2, btnY + 38, "or press Space / Enter", {
      fontSize: "12px",
      color: "#555577",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // Keep btnText above btnBg in depth
    btnText.setDepth(1);
  }

  private spawnDeco(x: number, y: number, size: number, color: number, alpha: number) {
    const sq = this.add.rectangle(x, y, size, size, color, alpha);
    const dur = Phaser.Math.Between(4000, 8000);
    this.tweens.add({
      targets: sq,
      x: x + Phaser.Math.Between(-60, 60),
      y: y + Phaser.Math.Between(-60, 60),
      duration: dur,
      ease: "Sine.easeInOut",
      yoyo: true,
      repeat: -1,
    });
  }
}
