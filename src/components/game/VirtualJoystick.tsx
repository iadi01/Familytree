import { useEffect, useRef, useState } from "react";

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  onCameraDrag: (dx: number, dy: number) => void;
}

export function VirtualJoystick({ onMove, onCameraDrag }: VirtualJoystickProps) {
  const [active, setActive] = useState(false);
  const [stickPos, setStickPos] = useState({ x: 0, y: 0 });
  const baseRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);

  // Right half camera touch dragging
  const camTouchIdRef = useRef<number | null>(null);
  const camLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const screenWidth = window.innerWidth;

      // Left half of screen -> Joystick
      if (touch.clientX < screenWidth * 0.45 && touchIdRef.current === null) {
        touchIdRef.current = touch.identifier;
        setActive(true);
        updateStick(touch.clientX, touch.clientY);
      }
      // Right half of screen -> Camera Drag
      else if (touch.clientX >= screenWidth * 0.45 && camTouchIdRef.current === null) {
        camTouchIdRef.current = touch.identifier;
        camLastPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === touchIdRef.current) {
        updateStick(touch.clientX, touch.clientY);
      } else if (touch.identifier === camTouchIdRef.current) {
        const dx = touch.clientX - camLastPosRef.current.x;
        const dy = touch.clientY - camLastPosRef.current.y;
        camLastPosRef.current = { x: touch.clientX, y: touch.clientY };
        onCameraDrag(dx, dy);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setActive(false);
        setStickPos({ x: 0, y: 0 });
        onMove(0, 0);
      } else if (touch.identifier === camTouchIdRef.current) {
        camTouchIdRef.current = null;
      }
    }
  };

  const updateStick = (clientX: number, clientY: number) => {
    if (!baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let normX = dx;
    let normY = dy;
    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    setStickPos({ x: normX, y: normY });
    onMove(normX / maxRadius, normY / maxRadius);
  };

  return (
    <div
      className="mobile-touch-surface"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Visual Joystick Base */}
      <div className="virtual-joystick-base" ref={baseRef}>
        <div
          className="virtual-joystick-thumb"
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
          }}
        />
      </div>

      <div className="mobile-cam-hint">
        <span>Touch right screen to rotate camera</span>
      </div>
    </div>
  );
}
