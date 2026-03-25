import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { GameScene } from "../game/GameScene";

export default function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      backgroundColor: "#0a0a1a",
      parent: containerRef.current,
      scene: [GameScene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
      <div className="mb-3 text-center">
        <h1 className="text-2xl font-bold text-cyan-400 tracking-widest font-mono uppercase">
          Square Eater
        </h1>
        <p className="text-xs text-gray-500 font-mono mt-1">
          Arrow keys or WASD to move &bull; Eat smaller squares &bull; Avoid bigger ones
        </p>
      </div>
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden shadow-2xl shadow-cyan-900/30 border border-cyan-900/40"
      />
      <div className="mt-3 flex gap-6 text-xs font-mono text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-yellow-400 rounded-sm" /> Small (eat these)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "#00e5ff" }} /> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 bg-red-500 rounded-sm" /> Big (avoid until phase 2)
        </span>
      </div>
    </div>
  );
}
