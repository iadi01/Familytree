import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MainMenu } from "@/components/game/MainMenu";
import { GameCanvas } from "@/components/game/GameCanvas";
import { HowToPlayModal } from "@/components/game/HowToPlayModal";
import { CharacterType, GameRole, MapId } from "@/game/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hide & Seek 3D — Browser Arena" },
      {
        name: "description",
        content:
          "Play real-time 3D Hide & Seek in your browser with 4 detailed maps and fully animated characters!",
      },
      { property: "og:title", content: "Hide & Seek 3D — Browser Arena" },
      {
        property: "og:description",
        content:
          "Low-poly 3D Hide and Seek game with animated characters and maps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameIndex,
});

function GameIndex() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const [gameConfig, setGameConfig] = useState<{
    character: CharacterType;
    mapId: MapId;
    role: GameRole;
    botCount: number;
  }>({
    character: "gobot",
    mapId: "timber-fort",
    role: "hider",
    botCount: 5,
  });

  const handleStartGame = (config: typeof gameConfig) => {
    setGameConfig(config);
    setIsPlaying(true);
  };

  return (
    <div className="game-app-wrapper">
      {isPlaying ? (
        <GameCanvas
          mapId={gameConfig.mapId}
          playerRole={gameConfig.role}
          playerModel={gameConfig.character}
          botCount={gameConfig.botCount}
          onExitToMenu={() => setIsPlaying(false)}
        />
      ) : (
        <>
          <MainMenu
            onStartGame={handleStartGame}
            onOpenHowToPlay={() => setShowHowToPlay(true)}
          />
          {/* Discreet link to Family Tree if needed */}
          <div className="fixed bottom-2 left-3 z-30">
            <Link
              to="/tree/$treeId"
              params={{ treeId: "sharma" }}
              className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1"
            >
              🌳 Family Tree Archive
            </Link>
          </div>
        </>
      )}

      {showHowToPlay && (
        <HowToPlayModal onClose={() => setShowHowToPlay(false)} />
      )}
    </div>
  );
}
