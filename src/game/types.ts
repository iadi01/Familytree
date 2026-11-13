export type CharacterType = "gobot" | "sophia" | "gdbot" | "beetle_bot";

export type MapId = "timber-fort" | "frost-peak" | "sunlit-pueblo" | "neon-matrix";

export type GameRole = "hider" | "seeker";

export type GameState = "menu" | "countdown" | "playing" | "gameover";

export interface HidingSpot {
  id: string;
  name: string;
  x: number;
  z: number;
  y: number;
  radius: number;
  isCover: boolean;
}

export interface BotState {
  id: string;
  name: string;
  role: GameRole;
  model: CharacterType;
  x: number;
  y: number;
  z: number;
  rotY: number;
  isCaught: boolean;
  isCrouching: boolean;
  currentAnim: "Idle" | "Walk" | "Run" | "Jump";
  state: "hiding" | "fleeing" | "patrolling" | "chasing";
  targetSpot?: HidingSpot | null;
  targetPlayer?: { x: number; z: number } | null;
  speed: number;
}

export interface MapMetadata {
  id: MapId;
  name: string;
  tagline: string;
  description: string;
  image: string;
  fogColor: number;
  skyColor: number;
  sunColor: number;
  groundColor: number;
  particles: "none" | "snow" | "leaves" | "sparks";
  ambience: string;
}
