import { useState } from "react";
import {
  Shield,
  Search,
  Sparkles,
  Play,
  Volume2,
  VolumeX,
  HelpCircle,
  Users,
  Compass,
  Trophy,
} from "lucide-react";
import { CharacterType, GameRole, MapId } from "@/game/types";
import { MAPS } from "@/game/mapBuilder";
import { sound } from "@/game/audio";

interface MainMenuProps {
  onStartGame: (config: {
    character: CharacterType;
    mapId: MapId;
    role: GameRole;
    botCount: number;
  }) => void;
  onOpenHowToPlay: () => void;
}

const CHARACTERS: {
  id: CharacterType;
  name: string;
  tagline: string;
  image: string;
  stats: { speed: number; stealth: number; stamina: number };
}[] = [
  {
    id: "gobot",
    name: "Gobot",
    tagline: "Agile & Quick Sprinter",
    image: "/models/gobot_vignette.png",
    stats: { speed: 90, stealth: 75, stamina: 85 },
  },
  {
    id: "sophia",
    name: "Sophia",
    tagline: "Stealth & Evasion Master",
    image: "/models/sophia_vignette.png",
    stats: { speed: 85, stealth: 95, stamina: 80 },
  },
  {
    id: "gdbot",
    name: "GDBot",
    tagline: "Balanced Powerhouse",
    image: "/models/gdbot_vignette.png",
    stats: { speed: 80, stealth: 70, stamina: 95 },
  },
  {
    id: "beetle_bot",
    name: "BeetleBot",
    tagline: "Compact Scout",
    image: "/models/beetle_bot_vignette.png",
    stats: { speed: 75, stealth: 90, stamina: 85 },
  },
];

export function MainMenu({ onStartGame, onOpenHowToPlay }: MainMenuProps) {
  const [selectedChar, setSelectedChar] = useState<CharacterType>("gobot");
  const [selectedMap, setSelectedMap] = useState<MapId>("timber-fort");
  const [selectedRole, setSelectedRole] = useState<GameRole>("hider");
  const [botCount, setBotCount] = useState<number>(5);
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const mapList = Object.values(MAPS);

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const handleStart = () => {
    sound.playCatch();
    onStartGame({
      character: selectedChar,
      mapId: selectedMap,
      role: selectedRole,
      botCount,
    });
  };

  return (
    <div className="game-menu-container">
      {/* Background Ambience */}
      <div className="menu-backdrop-glow" />

      {/* Top Navbar */}
      <header className="menu-navbar">
        <div className="menu-brand">
          <div className="menu-logo-badge">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="menu-title">HIDE & SEEK 3D</h1>
            <p className="menu-tagline">Browser Arena · Godot 3D Characters</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="menu-icon-btn"
            title="How to Play"
            onClick={onOpenHowToPlay}
          >
            <HelpCircle size={18} />
            <span className="hidden sm:inline text-xs font-semibold">Rules</span>
          </button>
          <button
            type="button"
            className="menu-icon-btn"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
            onClick={toggleSound}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="menu-scrollable-content">
        {/* Step 1: Select Character */}
        <section className="menu-section">
          <div className="menu-section-header">
            <span className="section-step-num">1</span>
            <h2>Choose Your Character</h2>
          </div>

          <div className="character-cards-grid">
            {CHARACTERS.map((char) => {
              const active = selectedChar === char.id;
              return (
                <div
                  key={char.id}
                  className={`character-card ${active ? "active" : ""}`}
                  onClick={() => {
                    setSelectedChar(char.id);
                    sound.playJump();
                  }}
                >
                  <div className="character-avatar-frame">
                    <img src={char.image} alt={char.name} />
                  </div>
                  <div className="character-info">
                    <h3 className="character-name">{char.name}</h3>
                    <p className="character-tagline">{char.tagline}</p>
                  </div>
                  {/* Stat bars */}
                  <div className="character-stats">
                    <div className="stat-row">
                      <span>Speed</span>
                      <div className="stat-bar-bg">
                        <div className="stat-bar-fill" style={{ width: `${char.stats.speed}%` }} />
                      </div>
                    </div>
                    <div className="stat-row">
                      <span>Stealth</span>
                      <div className="stat-bar-bg">
                        <div className="stat-bar-fill bg-emerald-400" style={{ width: `${char.stats.stealth}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 2: Select Map */}
        <section className="menu-section">
          <div className="menu-section-header">
            <span className="section-step-num">2</span>
            <h2>Select 3D Map</h2>
          </div>

          <div className="map-cards-grid">
            {mapList.map((map) => {
              const active = selectedMap === map.id;
              return (
                <div
                  key={map.id}
                  className={`map-card ${active ? "active" : ""}`}
                  onClick={() => {
                    setSelectedMap(map.id);
                    sound.playJump();
                  }}
                >
                  <div className="map-image-wrapper">
                    <img src={map.image} alt={map.name} />
                    <span className="map-ambience-tag">{map.ambience}</span>
                  </div>
                  <div className="map-card-body">
                    <h3 className="map-title">{map.name}</h3>
                    <p className="map-desc">{map.tagline}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Step 3: Role & Options */}
        <section className="menu-section">
          <div className="menu-section-header">
            <span className="section-step-num">3</span>
            <h2>Game Role & Bot Players</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Role Switcher */}
            <div className="role-selector-box">
              <div
                className={`role-choice-card ${selectedRole === "hider" ? "active" : ""}`}
                onClick={() => setSelectedRole("hider")}
              >
                <div className="role-icon-box text-emerald-400">
                  <Shield size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-base">Hider (Survive)</h4>
                  <p className="text-xs text-muted-foreground">
                    Crouch behind cover, hide inside buildings, and evade the seeker until time expires!
                  </p>
                </div>
              </div>

              <div
                className={`role-choice-card ${selectedRole === "seeker" ? "active" : ""}`}
                onClick={() => setSelectedRole("seeker")}
              >
                <div className="role-icon-box text-amber-400">
                  <Search size={28} />
                </div>
                <div>
                  <h4 className="font-bold text-base">Seeker (Hunt)</h4>
                  <p className="text-xs text-muted-foreground">
                    Follow heartbeats, check hiding spots, and tag all hiders before time runs out!
                  </p>
                </div>
              </div>
            </div>

            {/* Bots & Options */}
            <div className="settings-box">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold flex items-center gap-1.5">
                  <Users size={16} className="text-primary" /> AI Bot Players
                </span>
                <span className="text-sm font-black text-primary font-mono">
                  {botCount} Bots
                </span>
              </div>
              <div className="flex gap-2">
                {[3, 4, 5, 6].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`bot-count-btn ${botCount === count ? "active" : ""}`}
                    onClick={() => setBotCount(count)}
                  >
                    {count} Bots
                  </button>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Smart AI bots will dynamically hide behind palisades, chalet porches,
                and gazebos, or hunt you down if seeker!
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Launch Footer Button */}
      <footer className="menu-footer">
        <button type="button" className="menu-play-button" onClick={handleStart}>
          <Play size={22} className="fill-current" />
          <span>START MATCH</span>
        </button>
      </footer>
    </div>
  );
}
