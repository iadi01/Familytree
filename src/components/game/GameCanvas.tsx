import { useEffect, useRef, useState } from "react";
import { CharacterType, GameRole, MapId } from "@/game/types";
import { GameEngine, GameOverData, HUDUpdateData } from "@/game/GameEngine";
import { GameHUD } from "./GameHUD";
import { VirtualJoystick } from "./VirtualJoystick";
import { GameOverModal } from "./GameOverModal";

interface GameCanvasProps {
  mapId: MapId;
  playerRole: GameRole;
  playerModel: CharacterType;
  botCount: number;
  onExitToMenu: () => void;
}

export function GameCanvas({
  mapId,
  playerRole,
  playerModel,
  botCount,
  onExitToMenu,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [hudData, setHudData] = useState<HUDUpdateData>({
    timeRemaining: 15,
    phase: "hiding",
    playerRole,
    stamina: 100,
    isPlayerHidden: false,
    hidersAlive: botCount,
    hidersTotal: botCount,
    proximityIntensity: 0,
    canCatchTarget: false,
  });

  const [notifications, setNotifications] = useState<string[]>([]);
  const [gameOverResult, setGameOverResult] = useState<GameOverData | null>(null);

  const addNotification = (msg: string) => {
    setNotifications((prev) => [...prev.slice(-4), msg]);
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine({
      canvas: canvasRef.current,
      mapId,
      playerRole,
      playerModel,
      botCount,
      onHUDUpdate: (data) => setHudData(data),
      onGameOver: (result) => setGameOverResult(result),
      onNotification: (msg) => addNotification(msg),
    });

    engineRef.current = engine;
    engine.init();

    return () => {
      engine.cleanup();
      engineRef.current = null;
    };
  }, [mapId, playerRole, playerModel, botCount]);

  const handleRestart = () => {
    setGameOverResult(null);
    if (engineRef.current) {
      engineRef.current.cleanup();
    }
    if (canvasRef.current) {
      const engine = new GameEngine({
        canvas: canvasRef.current,
        mapId,
        playerRole,
        playerModel,
        botCount,
        onHUDUpdate: (data) => setHudData(data),
        onGameOver: (result) => setGameOverResult(result),
        onNotification: (msg) => addNotification(msg),
      });
      engineRef.current = engine;
      engine.init();
    }
  };

  return (
    <div className="game-viewport-container">
      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="game-webgl-canvas" />

      {/* Heads-up Display */}
      <GameHUD
        data={hudData}
        mapId={mapId}
        notifications={notifications}
        onExit={onExitToMenu}
        onJump={() => engineRef.current?.triggerJump()}
        onCrouch={() => engineRef.current?.toggleCrouch()}
        onSprintToggle={(s) => engineRef.current?.setSprint(s)}
        onCatch={() => engineRef.current?.attemptCatch()}
      />

      {/* Mobile Touch Virtual Joystick */}
      <VirtualJoystick
        onMove={(x, y) => engineRef.current?.setVirtualJoystick(x, y)}
        onCameraDrag={(dx, dy) => engineRef.current?.setCameraTouchDrag(dx, dy)}
      />

      {/* Game Over Modal */}
      {gameOverResult && (
        <GameOverModal
          data={gameOverResult}
          onPlayAgain={handleRestart}
          onMainMenu={onExitToMenu}
        />
      )}
    </div>
  );
}
