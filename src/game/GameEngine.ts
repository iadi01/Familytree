import * as THREE from "three";
import { CharacterType, GameRole, GameState, HidingSpot, MapId } from "./types";
import { buildMap, BuiltMap, MAPS } from "./mapBuilder";
import { loadCharacter, CharacterInstance } from "./characterController";
import { ActiveBot, updateBots } from "./botAI";
import { sound } from "./audio";

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  mapId: MapId;
  playerRole: GameRole;
  playerModel: CharacterType;
  botCount?: number;
  onHUDUpdate: (data: HUDUpdateData) => void;
  onGameOver: (result: GameOverData) => void;
  onNotification: (msg: string) => void;
}

export interface HUDUpdateData {
  timeRemaining: number;
  phase: "hiding" | "seeking";
  playerRole: GameRole;
  stamina: number; // 0 to 100
  isPlayerHidden: boolean;
  hidersAlive: number;
  hidersTotal: number;
  proximityIntensity: number; // 0 (far) to 1 (near)
  canCatchTarget: boolean;
  targetName?: string;
}

export interface GameOverData {
  victory: boolean;
  reason: string;
  role: GameRole;
  timeSurvived: number;
  hidersCaught: number;
  totalHiders: number;
  score: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private map: BuiltMap;
  private options: GameEngineOptions;

  // Player state
  private player: CharacterInstance | null = null;
  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerRotY = 0;
  private isGrounded = true;
  private isRunning = false;
  private isCrouching = false;
  private isPlayerHidden = false;
  private isPlayerCaught = false;
  private stamina = 100;

  // Camera third person controls
  private cameraAngleX = 0.25; // pitch
  private cameraAngleY = 0; // yaw
  private cameraDistance = 5.5;

  // Bots
  private bots: ActiveBot[] = [];
  private totalHidersCount = 5;

  // Game Loop
  private animFrameId: number | null = null;
  private lastTime = 0;
  private gameTime = 0;
  private hidingPhaseDuration = 15;
  private matchDuration = 110;
  private phase: "hiding" | "seeking" = "hiding";
  private isGameOver = false;
  private startTime = 0;

  // Input states
  private keys: Record<string, boolean> = {};
  private touchMove = { x: 0, y: 0 };
  private touchCam = { startX: 0, startY: 0, isDragging: false };

  // Particles for catch
  private catchParticles: THREE.Points | null = null;
  private catchParticleTime = 0;

  constructor(options: GameEngineOptions) {
    this.options = options;
    this.canvas = options.canvas;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();
    const mapMeta = MAPS[options.mapId];
    this.scene.background = new THREE.Color(mapMeta.skyColor);
    this.scene.fog = new THREE.FogExp2(mapMeta.fogColor, 0.016);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.3,
      250,
    );

    // Lights
    const hemiLight = new THREE.HemisphereLight(mapMeta.skyColor, mapMeta.groundColor, 0.7);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(mapMeta.sunColor, 1.3);
    dirLight.position.set(30, 45, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 130;
    const d = 45;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // Build Map
    this.map = buildMap(options.mapId);
    this.scene.add(this.map.group);

    // Catch particles burst
    this.initCatchParticles();

    // Setup input listeners
    this.setupInputs();

    // Start background music
    sound.startBGM(options.mapId);
  }

  public async init() {
    // Determine player start position
    if (this.options.playerRole === "seeker") {
      this.playerPos.copy(this.map.seekerSpawn);
    } else {
      const startSpot = this.map.hiderSpawns[0] || new THREE.Vector3(0, 0, 0);
      this.playerPos.copy(startSpot);
    }

    // Load Player character
    this.player = await loadCharacter(this.options.playerModel, 0x3b82f6);
    this.player.group.position.copy(this.playerPos);
    this.scene.add(this.player.group);

    // Spawn AI bots
    await this.spawnBots();

    // Start game loop
    this.lastTime = performance.now();
    this.startTime = performance.now();
    this.loop(this.lastTime);
  }

  private async spawnBots() {
    const botTypes: CharacterType[] = ["gobot", "sophia", "gdbot", "beetle_bot"];
    const botNames = ["Aarav", "Myra", "Vihaan", "Kabir", "Zara", "Rohan"];

    const count = this.options.botCount || 5;
    this.totalHidersCount = this.options.playerRole === "seeker" ? count : count - 1;

    for (let i = 0; i < count; i++) {
      const isBotSeeker = this.options.playerRole === "hider" && i === 0;
      const role: GameRole = isBotSeeker ? "seeker" : "hider";
      const modelType = botTypes[i % botTypes.length];
      const botColor = isBotSeeker ? 0xef4444 : 0x10b981;

      let startPos = new THREE.Vector3();
      if (isBotSeeker) {
        startPos.copy(this.map.seekerSpawn);
      } else {
        const spawnIdx = (i + 1) % this.map.hiderSpawns.length;
        startPos.copy(this.map.hiderSpawns[spawnIdx]);
      }

      const charInstance = await loadCharacter(modelType, botColor);
      charInstance.group.position.copy(startPos);
      this.scene.add(charInstance.group);

      // Pick initial target hiding spot for hider bots
      const targetSpot = this.map.hidingSpots[i % this.map.hidingSpots.length];

      this.bots.push({
        state: {
          id: `bot-${i}`,
          name: botNames[i % botNames.length],
          role,
          model: modelType,
          x: startPos.x,
          y: startPos.y,
          z: startPos.z,
          rotY: 0,
          isCaught: false,
          isCrouching: false,
          currentAnim: "Idle",
          state: isBotSeeker ? "patrolling" : "hiding",
          targetSpot,
          speed: 4.2,
        },
        char: charInstance,
        targetPos: targetSpot
          ? new THREE.Vector3(targetSpot.x, targetSpot.y, targetSpot.z)
          : startPos.clone(),
        waitTime: 0,
      });
    }
  }

  private initCatchParticles() {
    const count = 75;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;
      col[i * 3] = Math.random();
      col[i * 3 + 1] = Math.random();
      col[i * 3 + 2] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0,
    });
    this.catchParticles = new THREE.Points(geo, mat);
    this.scene.add(this.catchParticles);
  }

  private triggerCatchBurst(pos: THREE.Vector3) {
    if (!this.catchParticles) return;
    this.catchParticles.position.copy(pos);
    this.catchParticles.position.y += 1.2;
    (this.catchParticles.material as THREE.PointsMaterial).opacity = 1;
    this.catchParticleTime = 0.8;
  }

  private setupInputs() {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys[e.code] = true;
      if (e.code === "KeyC") {
        this.toggleCrouch();
      }
      if (e.code === "KeyE" || e.code === "Space") {
        if (this.options.playerRole === "seeker") {
          this.attemptCatch();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // Mouse look
    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      this.cameraAngleY -= dx * 0.005;
      this.cameraAngleX = Math.max(0.08, Math.min(1.2, this.cameraAngleX + dy * 0.005));
    };
    const onMouseUp = () => {
      isMouseDown = false;
    };

    this.canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Window resize
    const onResize = () => {
      if (!this.canvas) return;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };
    window.addEventListener("resize", onResize);
  }

  // Mobile virtual joystick & button bindings
  public setVirtualJoystick(x: number, y: number) {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }

  public setCameraTouchDrag(dx: number, dy: number) {
    this.cameraAngleY -= dx * 0.006;
    this.cameraAngleX = Math.max(0.08, Math.min(1.2, this.cameraAngleX + dy * 0.006));
  }

  public triggerJump() {
    if (this.isGrounded) {
      this.playerVel.y = 7.5;
      this.isGrounded = false;
      sound.playJump();
    }
  }

  public toggleCrouch() {
    this.isCrouching = !this.isCrouching;
    if (this.player) {
      this.player.setCrouch(this.isCrouching);
    }
  }

  public setSprint(sprint: boolean) {
    this.isRunning = sprint && this.stamina > 5;
  }

  public attemptCatch() {
    if (this.options.playerRole !== "seeker" || this.phase === "hiding") return;

    for (const bot of this.bots) {
      if (bot.state.role === "hider" && !bot.state.isCaught) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(bot.state.x, 0, bot.state.z));
        if (dist < 2.5) {
          bot.state.isCaught = true;
          bot.char.group.visible = false;
          sound.playCatch();
          this.triggerCatchBurst(new THREE.Vector3(bot.state.x, 0, bot.state.z));
          this.options.onNotification(`You tagged ${bot.state.name}! 🎯`);

          // Check win condition
          this.checkWinCondition();
          return;
        }
      }
    }
  }

  private loop = (time: number) => {
    const delta = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    if (!this.isGameOver) {
      this.update(delta);
    }

    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    this.gameTime += delta;

    // Check Phase
    if (this.gameTime < this.hidingPhaseDuration) {
      this.phase = "hiding";
    } else {
      if (this.phase === "hiding") {
        sound.playCountdownBeep(true);
        this.options.onNotification("Seeker released! Go seek / hide!");
      }
      this.phase = "seeking";
    }

    // Time remaining in current phase or total
    const totalTimeRemaining = Math.max(0, this.hidingPhaseDuration + this.matchDuration - this.gameTime);
    if (totalTimeRemaining <= 0) {
      this.endGameByTime();
      return;
    }

    // Update Player
    this.updatePlayer(delta);

    // Update Camera
    this.updateCamera();

    // Update Bots
    const seekerPos =
      this.options.playerRole === "seeker"
        ? this.playerPos
        : this.bots.find((b) => b.state.role === "seeker")
          ? new THREE.Vector3(
              this.bots.find((b) => b.state.role === "seeker")!.state.x,
              0,
              this.bots.find((b) => b.state.role === "seeker")!.state.z,
            )
          : new THREE.Vector3(0, 0, 0);

    updateBots(
      this.bots,
      this.map.hidingSpots,
      seekerPos,
      this.options.playerRole === "hider" && !this.isPlayerCaught ? this.playerPos : null,
      this.phase === "hiding",
      delta,
      this.map.colliders,
      (caughtName, caughtId) => {
        sound.playCatch();
        this.triggerCatchBurst(this.playerPos);
        if (caughtId === "player") {
          this.isPlayerCaught = true;
          this.options.onNotification("You were CAUGHT by the Seeker! 😱");
          this.endGame(false, "The seeker found you!");
        } else {
          this.options.onNotification(`${caughtName} was caught! 🎯`);
          this.checkWinCondition();
        }
      },
    );

    // Update Map animations (snow, etc.)
    if (this.map.update) {
      this.map.update(delta);
    }

    // Update catch particles
    if (this.catchParticleTime > 0) {
      this.catchParticleTime -= delta;
      if (this.catchParticles) {
        (this.catchParticles.material as THREE.PointsMaterial).opacity = Math.max(
          0,
          this.catchParticleTime / 0.8,
        );
      }
    }

    // Proximity Radar & Heartbeat calculation
    let nearestDist = 999;
    if (this.options.playerRole === "hider") {
      const seekerBot = this.bots.find((b) => b.state.role === "seeker");
      if (seekerBot) {
        nearestDist = this.playerPos.distanceTo(
          new THREE.Vector3(seekerBot.state.x, 0, seekerBot.state.z),
        );
      }
    } else {
      // Player is Seeker: distance to closest uncaught hider
      for (const bot of this.bots) {
        if (bot.state.role === "hider" && !bot.state.isCaught) {
          const d = this.playerPos.distanceTo(new THREE.Vector3(bot.state.x, 0, bot.state.z));
          if (d < nearestDist) nearestDist = d;
        }
      }
    }

    const proximityIntensity = Math.max(0, Math.min(1, (22 - nearestDist) / 20));
    sound.updateHeartbeat(proximityIntensity);

    // Hiding spot detection for player
    let inSpot = false;
    for (const spot of this.map.hidingSpots) {
      const d = new THREE.Vector2(this.playerPos.x - spot.x, this.playerPos.z - spot.z).length();
      if (d < spot.radius) {
        inSpot = true;
        break;
      }
    }
    this.isPlayerHidden = (inSpot && this.isCrouching) || (inSpot && nearestDist > 14);

    // Check if Seeker has someone in catch range
    let canCatch = false;
    let targetName: string | undefined = undefined;
    if (this.options.playerRole === "seeker" && this.phase === "seeking") {
      for (const bot of this.bots) {
        if (bot.state.role === "hider" && !bot.state.isCaught) {
          const d = this.playerPos.distanceTo(new THREE.Vector3(bot.state.x, 0, bot.state.z));
          if (d < 2.5) {
            canCatch = true;
            targetName = bot.state.name;
            break;
          }
        }
      }
    }

    // Alive hiders count
    const uncaughtBots = this.bots.filter((b) => b.state.role === "hider" && !b.state.isCaught).length;
    const hidersAlive = this.options.playerRole === "hider" ? uncaughtBots + (this.isPlayerCaught ? 0 : 1) : uncaughtBots;

    // Send HUD update
    this.options.onHUDUpdate({
      timeRemaining: Math.ceil(
        this.phase === "hiding"
          ? this.hidingPhaseDuration - this.gameTime
          : totalTimeRemaining,
      ),
      phase: this.phase,
      playerRole: this.options.playerRole,
      stamina: Math.round(this.stamina),
      isPlayerHidden: this.isPlayerHidden,
      hidersAlive,
      hidersTotal: this.totalHidersCount,
      proximityIntensity,
      canCatchTarget: canCatch,
      targetName,
    });
  }

  private updatePlayer(delta: number) {
    if (!this.player) return;

    // If seeker during hiding phase, freeze player
    if (this.options.playerRole === "seeker" && this.phase === "hiding") {
      this.player.playAnim("Idle");
      this.player.update(delta);
      return;
    }

    // Input Movement Vector relative to camera angle
    let inputX = 0;
    let inputZ = 0;

    if (this.keys["KeyW"] || this.keys["ArrowUp"]) inputZ -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) inputZ += 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) inputX -= 1;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) inputX += 1;

    // Combine with mobile virtual joystick
    if (this.touchMove.x !== 0 || this.touchMove.y !== 0) {
      inputX = this.touchMove.x;
      inputZ = -this.touchMove.y; // invert Y for standard forward
    }

    const inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
    const hasMoveInput = inputLen > 0.08;

    // Sprint & Stamina
    const wantSprint = (this.keys["ShiftLeft"] || this.keys["ShiftRight"] || this.isRunning) && !this.isCrouching;
    if (wantSprint && hasMoveInput && this.stamina > 4) {
      this.isRunning = true;
      this.stamina = Math.max(0, this.stamina - 20 * delta);
    } else {
      this.isRunning = false;
      this.stamina = Math.min(100, this.stamina + 12 * delta);
    }

    // Speed
    const baseSpeed = this.isCrouching ? 2.5 : this.isRunning ? 7.8 : 4.5;
    let moveDir = new THREE.Vector3(0, 0, 0);

    if (hasMoveInput) {
      // Rotate input by camera yaw
      const normX = inputX / (inputLen || 1);
      const normZ = inputZ / (inputLen || 1);

      const sin = Math.sin(this.cameraAngleY);
      const cos = Math.cos(this.cameraAngleY);

      moveDir.x = normX * cos + normZ * sin;
      moveDir.z = -normX * sin + normZ * cos;

      // Rotate character model towards movement vector
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      this.playerRotY = THREE.MathUtils.lerp(this.playerRotY, targetAngle, delta * 12);
      this.player.group.rotation.y = this.playerRotY;
    }

    // Gravity
    this.playerVel.y -= 19 * delta;

    // Jump
    if (this.keys["Space"] && this.isGrounded && !this.isCrouching) {
      this.playerVel.y = 7.5;
      this.isGrounded = false;
      sound.playJump();
    }

    // Proposed new position
    const nextX = this.playerPos.x + moveDir.x * baseSpeed * delta;
    const nextZ = this.playerPos.z + moveDir.z * baseSpeed * delta;
    const nextY = this.playerPos.y + this.playerVel.y * delta;

    // Collision against map boundaries
    const clampedX = Math.max(this.map.bounds.minX, Math.min(this.map.bounds.maxX, nextX));
    const clampedZ = Math.max(this.map.bounds.minZ, Math.min(this.map.bounds.maxZ, nextZ));

    // Collision against map obstacle colliders
    const playerRadius = 0.45;
    let finalX = clampedX;
    let finalZ = clampedZ;

    const testBox = new THREE.Box3(
      new THREE.Vector3(clampedX - playerRadius, this.playerPos.y + 0.2, clampedZ - playerRadius),
      new THREE.Vector3(clampedX + playerRadius, this.playerPos.y + 1.8, clampedZ + playerRadius),
    );

    for (const collider of this.map.colliders) {
      if (collider.intersectsBox(testBox)) {
        // Simple slide response: test X and Z separately
        const testXOnly = new THREE.Box3(
          new THREE.Vector3(clampedX - playerRadius, this.playerPos.y + 0.2, this.playerPos.z - playerRadius),
          new THREE.Vector3(clampedX + playerRadius, this.playerPos.y + 1.8, this.playerPos.z + playerRadius),
        );
        if (collider.intersectsBox(testXOnly)) {
          finalX = this.playerPos.x;
        }

        const testZOnly = new THREE.Box3(
          new THREE.Vector3(this.playerPos.x - playerRadius, this.playerPos.y + 0.2, clampedZ - playerRadius),
          new THREE.Vector3(this.playerPos.x + playerRadius, this.playerPos.y + 1.8, clampedZ + playerRadius),
        );
        if (collider.intersectsBox(testZOnly)) {
          finalZ = this.playerPos.z;
        }
      }
    }

    this.playerPos.x = finalX;
    this.playerPos.z = finalZ;

    // Ground landing check
    if (nextY <= 0) {
      if (!this.isGrounded && this.playerVel.y < -4) {
        sound.playLand();
      }
      this.playerPos.y = 0;
      this.playerVel.y = 0;
      this.isGrounded = true;
    } else {
      this.playerPos.y = nextY;
    }

    // Footstep audio
    if (this.isGrounded && hasMoveInput) {
      const stepInterval = this.isRunning ? 0.32 : 0.52;
      if (Math.floor(this.gameTime / stepInterval) !== Math.floor((this.gameTime - delta) / stepInterval)) {
        sound.playFootstep(
          this.options.mapId === "frost-peak"
            ? "snow"
            : this.options.mapId === "sunlit-pueblo"
              ? "stone"
              : "grass",
        );
      }
    }

    // Select & blend animation
    if (!this.isGrounded) {
      this.player.playAnim(this.playerVel.y > 0 ? "Jump" : "Fall");
    } else if (hasMoveInput) {
      this.player.playAnim(this.isRunning ? "Run" : "Walk");
    } else {
      this.player.playAnim("Idle");
    }

    // Update 3D model
    this.player.group.position.copy(this.playerPos);
    this.player.update(delta);
  }

  private updateCamera() {
    const target = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));

    // Spherical offset
    const cosPitch = Math.cos(this.cameraAngleX);
    const sinPitch = Math.sin(this.cameraAngleX);
    const cosYaw = Math.cos(this.cameraAngleY);
    const sinYaw = Math.sin(this.cameraAngleY);

    const offsetX = this.cameraDistance * cosPitch * sinYaw;
    const offsetY = this.cameraDistance * sinPitch;
    const offsetZ = this.cameraDistance * cosPitch * cosYaw;

    const desiredCamPos = target.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));

    // Smooth follow
    this.camera.position.lerp(desiredCamPos, 0.18);
    this.camera.lookAt(target);
  }

  private checkWinCondition() {
    const uncaughtHiders = this.bots.filter((b) => b.state.role === "hider" && !b.state.isCaught).length;

    if (this.options.playerRole === "seeker") {
      if (uncaughtHiders === 0) {
        // Player caught everyone!
        this.endGame(true, "Congratulations! You found all the hiders! 🏆");
      }
    } else {
      // Player is Hider
      if (uncaughtHiders === 0 && this.isPlayerCaught) {
        this.endGame(false, "All hiders were caught by the seeker!");
      }
    }
  }

  private endGameByTime() {
    if (this.options.playerRole === "hider") {
      if (!this.isPlayerCaught) {
        this.endGame(true, "Victory! You survived the entire match hidden! 🛡️");
      } else {
        this.endGame(false, "Time is up! You were caught earlier in the match.");
      }
    } else {
      const caughtCount = this.bots.filter((b) => b.state.role === "hider" && b.state.isCaught).length;
      if (caughtCount === this.totalHidersCount) {
        this.endGame(true, "Victory! You caught all hiders before time ran out!");
      } else {
        this.endGame(false, `Time's up! You only caught ${caughtCount} of ${this.totalHidersCount} hiders.`);
      }
    }
  }

  private endGame(victory: boolean, reason: string) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    sound.stopHeartbeat();
    if (victory) {
      sound.playVictory();
    } else {
      sound.playDefeat();
    }

    const timeSurvived = Math.round((performance.now() - this.startTime) / 1000);
    const caught = this.bots.filter((b) => b.state.role === "hider" && b.state.isCaught).length;
    const score = (victory ? 1000 : 250) + caught * 200 + Math.min(300, timeSurvived * 3);

    this.options.onGameOver({
      victory,
      reason,
      role: this.options.playerRole,
      timeSurvived,
      hidersCaught: caught,
      totalHiders: this.totalHidersCount,
      score,
    });
  }

  public cleanup() {
    this.isGameOver = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    sound.cleanup();
    this.renderer.dispose();
  }
}
