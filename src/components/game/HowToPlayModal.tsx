import { X, Shield, Search, Smartphone, Monitor, Zap } from "lucide-react";

interface HowToPlayModalProps {
  onClose: () => void;
}

export function HowToPlayModal({ onClose }: HowToPlayModalProps) {
  return (
    <div className="game-modal-backdrop" onClick={onClose}>
      <div
        className="game-modal-card info-modal animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2 className="game-modal-title">How To Play Hide & Seek 3D</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Master the maps, hide in plain sight, or hunt down all opponents!
        </p>

        <div className="how-to-play-sections">
          {/* Rules */}
          <div className="htp-card">
            <h3 className="htp-title">
              <Shield size={16} className="text-emerald-400" /> Game Rules
            </h3>
            <ul className="htp-list">
              <li>
                <strong>Hiding Phase (15s):</strong> Hiders scramble to find cover. Seeker is frozen at spawn.
              </li>
              <li>
                <strong>Seeking Phase (110s):</strong> Seeker hunts hiders. If Seeker tags all hiders before time runs out, Seeker wins! If any hider survives, Hiders win!
              </li>
              <li>
                <strong>Cover & Hiding:</strong> Crouch behind logs, cabins, gazebo pillars, or ski chalet porches. A green badge appears when you are in stealth cover!
              </li>
            </ul>
          </div>

          {/* Desktop Controls */}
          <div className="htp-card">
            <h3 className="htp-title">
              <Monitor size={16} className="text-blue-400" /> Desktop Controls
            </h3>
            <div className="htp-keys-grid">
              <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</div>
              <div><kbd>Mouse Drag</kbd> Rotate Camera</div>
              <div><kbd>Shift</kbd> Sprint (Uses Stamina)</div>
              <div><kbd>Space</kbd> Jump</div>
              <div><kbd>C</kbd> Crouch / Hide</div>
              <div><kbd>E</kbd> Tag / Catch (as Seeker)</div>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="htp-card">
            <h3 className="htp-title">
              <Smartphone size={16} className="text-purple-400" /> Mobile Controls
            </h3>
            <ul className="htp-list">
              <li><strong>Left Screen:</strong> Virtual Joystick to walk and run.</li>
              <li><strong>Right Screen:</strong> Touch and drag anywhere to look around.</li>
              <li><strong>Action Buttons:</strong> Dedicated on-screen buttons for Jump, Hide/Crouch, Sprint, and Catch!</li>
            </ul>
          </div>
        </div>

        <button
          type="button"
          className="modal-btn play-again-btn w-full mt-4"
          onClick={onClose}
        >
          <span>GOT IT, LET'S PLAY!</span>
        </button>
      </div>
    </div>
  );
}
