import Phaser from "phaser";
import {
  playMusic, AUDIO_KEYS,
  isMusicEnabled, isSfxEnabled,
  setMusicEnabled, setSfxEnabled,
} from "./AudioManager";

const CANVAS_W = 800;
const CANVAS_H = 600;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: "MenuScene" });
  }

  create() {
    playMusic(AUDIO_KEYS.menuMusic);

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x0a0a1a);
    this.add.grid(0, 0, CANVAS_W * 2, CANVAS_H * 2, 40, 40, 0x0a0a1a, 0, 0x1a1a3a, 0.4).setOrigin(0, 0);

    this.spawnDeco(120, 140, 36, 0x00e5ff, 0.15);
    this.spawnDeco(680, 460, 52, 0xffdd44, 0.12);
    this.spawnDeco(660, 130, 26, 0xff4455, 0.1);
    this.spawnDeco(140, 450, 44, 0x00ffaa, 0.1);
    this.spawnDeco(400, 80,  20, 0xffdd44, 0.1);
    this.spawnDeco(400, 520, 30, 0xff4455, 0.1);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(CANVAS_W / 2, 160, "SQUARE EATER", {
      fontSize: "56px", color: "#00e5ff", fontFamily: "monospace",
      fontStyle: "bold", stroke: "#003344", strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(CANVAS_W / 2, 228, "Eat smaller. Avoid bigger. Survive 11 levels.", {
      fontSize: "16px", color: "#8888aa", fontFamily: "monospace",
    }).setOrigin(0.5);

    // ── How-to hints ──────────────────────────────────────────────────────────
    const hints = [
      { color: 0xffdd44, label: "Small squares — eat these first" },
      { color: 0x00ffaa, label: "Turn green when ready to eat big" },
      { color: 0xff4455, label: "Big squares — deadly until phase 2" },
    ];
    hints.forEach(({ color, label }, i) => {
      const y = 300 + i * 38;
      this.add.rectangle(CANVAS_W / 2 - 160, y, 22, 22, color).setOrigin(0.5);
      this.add.text(CANVAS_W / 2 - 144, y, label, {
        fontSize: "14px", color: "#aaaacc", fontFamily: "monospace",
      }).setOrigin(0, 0.5);
    });

    // ── Start button ──────────────────────────────────────────────────────────
    const startBg = this.add.rectangle(CANVAS_W / 2, 500, 220, 54, 0x00e5ff)
      .setInteractive({ useHandCursor: true });
    this.add.text(CANVAS_W / 2, 500, "START GAME", {
      fontSize: "20px", color: "#0a0a1a", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5).setDepth(1);

    startBg.on("pointerover",  () => startBg.setFillStyle(0x80ffff));
    startBg.on("pointerout",   () => startBg.setFillStyle(0x00e5ff));
    startBg.on("pointerdown",  () => startBg.setFillStyle(0x009ab0));
    startBg.on("pointerup",    () => this.scene.start("GameScene", { level: 1 }));

    this.input.keyboard!.once("keydown-SPACE", () => this.scene.start("GameScene", { level: 1 }));
    this.input.keyboard!.once("keydown-ENTER", () => this.scene.start("GameScene", { level: 1 }));

    this.add.text(CANVAS_W / 2, 538, "or press Space / Enter", {
      fontSize: "12px", color: "#555577", fontFamily: "monospace",
    }).setOrigin(0.5);

    // ── Settings button ───────────────────────────────────────────────────────
    const settingsBtn = this.add.text(CANVAS_W - 20, CANVAS_H - 20, "⚙  Settings", {
      fontSize: "14px", color: "#6666aa", fontFamily: "monospace",
    }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    settingsBtn.on("pointerover", () => settingsBtn.setColor("#aaaaff"));
    settingsBtn.on("pointerout",  () => settingsBtn.setColor("#6666aa"));

    const panel = this.buildSettingsPanel();
    panel.setVisible(false);

    settingsBtn.on("pointerup", () => panel.setVisible(true));
  }

  // ─── Settings Panel ─────────────────────────────────────────────────────────

  private buildSettingsPanel(): Phaser.GameObjects.Container {
    const PW = 360, PH = 260;
    const container = this.add.container(CANVAS_W / 2, CANVAS_H / 2).setDepth(20);

    // Dim backdrop
    container.add(
      this.add.rectangle(0, 0, CANVAS_W, CANVAS_H, 0x000000, 0.65).setInteractive()
    );

    // Panel card
    container.add(this.add.rectangle(0, 0, PW, PH, 0x12122a).setStrokeStyle(2, 0x3333aa));

    // Panel title
    container.add(
      this.add.text(0, -PH / 2 + 34, "SETTINGS", {
        fontSize: "22px", color: "#ffffff", fontFamily: "monospace", fontStyle: "bold",
      }).setOrigin(0.5)
    );

    // Divider line
    container.add(this.add.rectangle(0, -PH / 2 + 58, PW - 40, 1, 0x333366));

    // ── Toggle rows ──────────────────────────────────────────────────────────
    const rows = [
      { label: "Music",         get: isMusicEnabled, set: setMusicEnabled, onEnable: () => playMusic(AUDIO_KEYS.menuMusic) },
      { label: "Sound Effects", get: isSfxEnabled,   set: setSfxEnabled,   onEnable: () => {} },
    ];

    rows.forEach((row, i) => {
      const rowY = -20 + i * 62;
      const trackX = PW / 2 - 52;
      const trackW = 58, trackH = 28;

      // Label
      container.add(
        this.add.text(-PW / 2 + 30, rowY, row.label, {
          fontSize: "16px", color: "#aaaacc", fontFamily: "monospace",
        }).setOrigin(0, 0.5)
      );

      // Track
      const track = this.add.rectangle(trackX, rowY, trackW, trackH,
        row.get() ? 0x1a3a4a : 0x1a1a2a
      ).setStrokeStyle(1, 0x5555aa).setInteractive({ useHandCursor: true });
      container.add(track);

      // Thumb
      const thumb = this.add.rectangle(
        row.get() ? trackX + 13 : trackX - 13,
        rowY, 24, 22,
        row.get() ? 0x00e5ff : 0x555577
      );
      container.add(thumb);

      // State label ("ON" / "OFF")
      const stateLabel = this.add.text(trackX - trackW / 2 - 10, rowY,
        row.get() ? "ON" : "OFF",
        { fontSize: "12px", color: row.get() ? "#00e5ff" : "#555577", fontFamily: "monospace" }
      ).setOrigin(1, 0.5);
      container.add(stateLabel);

      const refresh = () => {
        const on = row.get();
        track.setFillStyle(on ? 0x1a3a4a : 0x1a1a2a);
        thumb.setFillStyle(on ? 0x00e5ff : 0x555577);
        stateLabel.setText(on ? "ON" : "OFF").setColor(on ? "#00e5ff" : "#555577");
        this.tweens.add({
          targets: thumb,
          x: on ? trackX + 13 : trackX - 13,
          duration: 120, ease: "Quad.easeOut",
        });
      };

      track.on("pointerup", () => {
        const next = !row.get();
        row.set(next);
        if (next) row.onEnable();
        refresh();
      });
    });

    // ── Close button ──────────────────────────────────────────────────────────
    const closeY = PH / 2 - 36;
    const closeBg = this.add.rectangle(0, closeY, 140, 36, 0x222244)
      .setStrokeStyle(1, 0x5555aa)
      .setInteractive({ useHandCursor: true });
    const closeTxt = this.add.text(0, closeY, "CLOSE", {
      fontSize: "15px", color: "#aaaacc", fontFamily: "monospace", fontStyle: "bold",
    }).setOrigin(0.5);

    closeBg.on("pointerover",  () => closeBg.setFillStyle(0x333366));
    closeBg.on("pointerout",   () => closeBg.setFillStyle(0x222244));
    closeBg.on("pointerup",    () => container.setVisible(false));

    container.add(closeBg);
    container.add(closeTxt);

    // Escape key closes panel
    this.input.keyboard!.on("keydown-ESC", () => {
      if (container.visible) container.setVisible(false);
    });

    return container;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private spawnDeco(x: number, y: number, size: number, color: number, alpha: number) {
    const sq = this.add.rectangle(x, y, size, size, color, alpha);
    const dur = Phaser.Math.Between(4000, 8000);
    this.tweens.add({
      targets: sq,
      x: x + Phaser.Math.Between(-60, 60),
      y: y + Phaser.Math.Between(-60, 60),
      duration: dur, ease: "Sine.easeInOut", yoyo: true, repeat: -1,
    });
  }
}
