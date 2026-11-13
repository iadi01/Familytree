import { Trophy, AlertCircle, RotateCcw, Home, Sparkles } from "lucide-react";
import { GameOverData } from "@/game/GameEngine";

interface GameOverModalProps {
  data: GameOverData;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOverModal({ data, onPlayAgain, onMainMenu }: GameOverModalProps) {
  return (
    <div className="game-modal-backdrop">
      <div className={`game-modal-card ${data.victory ? "victory" : "defeat"} animate-scale-up`}>
        {/* Header Icon */}
        <div className="game-modal-icon-circle">
          {data.victory ? (
            <Trophy size={42} className="text-amber-400 animate-bounce-subtle" />
          ) : (
            <AlertCircle size={42} className="text-rose-400" />
          )}
        </div>

        <h2 className="game-modal-title">
          {data.victory ? "VICTORY!" : "MATCH OVER"}
        </h2>
        <p className="game-modal-reason">{data.reason}</p>

        {/* Stats Grid */}
        <div className="game-modal-stats-grid">
          <div className="modal-stat-box">
            <span className="stat-label">SCORE</span>
            <span className="stat-value text-amber-400 font-mono">
              +{data.score}
            </span>
          </div>
          <div className="modal-stat-box">
            <span className="stat-label">TIME</span>
            <span className="stat-value font-mono">{data.timeSurvived}s</span>
          </div>
          <div className="modal-stat-box">
            <span className="stat-label">TAGGED</span>
            <span className="stat-value font-mono">
              {data.hidersCaught} / {data.totalHiders}
            </span>
          </div>
          <div className="modal-stat-box">
            <span className="stat-label">ROLE</span>
            <span className="stat-value uppercase text-xs">
              {data.role}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="game-modal-actions">
          <button
            type="button"
            className="modal-btn play-again-btn"
            onClick={onPlayAgain}
          >
            <RotateCcw size={18} />
            <span>PLAY AGAIN</span>
          </button>
          <button
            type="button"
            className="modal-btn main-menu-btn"
            onClick={onMainMenu}
          >
            <Home size={18} />
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
}
