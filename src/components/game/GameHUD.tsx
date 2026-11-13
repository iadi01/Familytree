import { useEffect, useState } from "react";
import {
  Shield,
  Search,
  Volume2,
  VolumeX,
  Zap,
  ArrowUp,
  UserCheck,
  UserX,
  Target,
  LogOut,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { HUDUpdateData } from "@/game/GameEngine";
import { sound } from "@/game/audio";
import { MapId } from "@/game/types";
import { MAPS } from "@/game/mapBuilder";

interface GameHUDProps {
  data: HUDUpdateData;
  mapId: MapId;
  notifications: string[];
  onExit: () => void;
  onJump: () => void;
  onCrouch: () => void;
  onSprintToggle: (sprint: boolean) => void;
  onCatch: () => void;
}

export function GameHUD({
  data,
  mapId,
  notifications,
  onExit,
  onJump,
  onCrouch,
  onSprintToggle,
  onCatch,
}: GameHUDProps) {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [sprintActive, setSprintActive] = useState(false);
  const mapMeta = MAPS[mapId];

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const toggleSound = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const handleSprintClick = () => {
    const next = !sprintActive;
    setSprintActive(next);
    onSprintToggle(next);
  };

  return (
    <div className="game-hud-overlay">
      {/* Top Header Bar */}
      <header className="hud-header-bar">
        {/* Role & Map Info */}
        <div className="hud-badge role-badge">
          {data.playerRole === "hider" ? (
            <>
              <Shield size={16} className="text-emerald-400" />
              <span>HIDER</span>
            </>
          ) : (
            <>
              <Search size={16} className="text-amber-400" />
              <span>SEEKER</span>
            </>
          )}
          <span className="text-muted-foreground text-xs font-normal">
            · {mapMeta.name}
          </span>
        </div>

        {/* Center Countdown Timer & Phase */}
        <div className="hud-timer-container">
          <div className="hud-phase-label">
            {data.phase === "hiding" ? "🛡️ HIDING PHASE" : "🔍 SEEKING PHASE"}
          </div>
          <div className={`hud-timer-display ${data.timeRemaining <= 10 ? "urgent" : ""}`}>
            {formatTime(data.timeRemaining)}
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="hud-icon-btn"
            title={isMuted ? "Unmute Sound" : "Mute Sound"}
            onClick={toggleSound}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            type="button"
            className="hud-icon-btn text-rose-400"
            title="Exit Match"
            onClick={onExit}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Floating Notifications Bar */}
      <div className="hud-notifications-area">
        {notifications.slice(-2).map((msg, i) => (
          <div key={i} className="hud-notification-pill animate-bounce-subtle">
            {msg}
          </div>
        ))}
      </div>

      {/* Status & Heartbeat Radar */}
      <div className="hud-center-status">
        {data.playerRole === "hider" ? (
          data.proximityIntensity > 0.65 ? (
            <div className="hud-status-badge danger">
              <AlertTriangle size={17} className="animate-pulse" />
              <span>DANGER! SEEKER IS NEARBY!</span>
            </div>
          ) : data.isPlayerHidden ? (
            <div className="hud-status-badge hidden">
              <Shield size={17} />
              <span>IN COVER · HIDDEN</span>
            </div>
          ) : (
            <div className="hud-status-badge visible">
              <Radio size={17} />
              <span>VISIBLE · FIND COVER</span>
            </div>
          )
        ) : (
          data.canCatchTarget && (
            <div className="hud-status-badge catch-ready" onClick={onCatch}>
              <Target size={18} className="animate-spin" />
              <span>TAG {data.targetName?.toUpperCase()}! (PRESS E / TAP)</span>
            </div>
          )
        )}

        {/* Heartbeat Sensor Ring */}
        {data.proximityIntensity > 0.08 && (
          <div
            className="hud-heartbeat-radar"
            style={{
              animationDuration: `${Math.max(0.3, 1.2 - data.proximityIntensity * 0.9)}s`,
              opacity: 0.3 + data.proximityIntensity * 0.7,
            }}
          >
            <span className="text-rose-500 font-mono text-xs font-bold">
              💓 SENSOR {Math.round(data.proximityIntensity * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Bottom Area: Hiders Count, Stamina & Mobile Controls */}
      <footer className="hud-bottom-bar">
        {/* Hiders Tracker */}
        <div className="hud-hiders-counter">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Hiders Remaining
          </div>
          <div className="text-lg font-black text-white">
            {data.hidersAlive} / {data.hidersTotal}
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="hud-stamina-wrapper">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1">
            <span className="flex items-center gap-1">
              <Zap size={13} className="text-amber-400" /> STAMINA
            </span>
            <span>{data.stamina}%</span>
          </div>
          <div className="hud-stamina-bar-bg">
            <div
              className="hud-stamina-bar-fill"
              style={{ width: `${data.stamina}%` }}
            />
          </div>
        </div>

        {/* Mobile Action Buttons (Right side) */}
        <div className="hud-mobile-actions">
          {data.playerRole === "seeker" && (
            <button
              type="button"
              className={`hud-action-circle catch-btn ${data.canCatchTarget ? "pulse-glow" : ""}`}
              onClick={onCatch}
              title="Tag Hider"
            >
              <Target size={24} />
              <span>TAG</span>
            </button>
          )}

          <button
            type="button"
            className={`hud-action-circle sprint-btn ${sprintActive ? "active" : ""}`}
            onClick={handleSprintClick}
            title="Sprint"
          >
            <Zap size={22} />
            <span>SPRINT</span>
          </button>

          <button
            type="button"
            className="hud-action-circle crouch-btn"
            onClick={onCrouch}
            title="Crouch / Hide"
          >
            <Shield size={22} />
            <span>HIDE</span>
          </button>

          <button
            type="button"
            className="hud-action-circle jump-btn"
            onClick={onJump}
            title="Jump"
          >
            <ArrowUp size={24} />
            <span>JUMP</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
