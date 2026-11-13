import * as THREE from "three";
import { BotState, GameRole, HidingSpot } from "./types";
import { CharacterInstance } from "./characterController";

export interface ActiveBot {
  state: BotState;
  char: CharacterInstance;
  targetPos: THREE.Vector3;
  waitTime: number;
}

export function updateBots(
  bots: ActiveBot[],
  hidingSpots: HidingSpot[],
  seekerPosition: THREE.Vector3,
  playerHiderPos: THREE.Vector3 | null,
  isHidingPhase: boolean,
  delta: number,
  colliders: THREE.Box3[],
  onCatchHider: (hiderName: string, hiderId: string) => void,
) {
  for (const bot of bots) {
    if (bot.state.isCaught) continue;

    // -------------------------------------------------------------
    // HIDER BOT BEHAVIOR
    // -------------------------------------------------------------
    if (bot.state.role === "hider") {
      const distToSeeker = new THREE.Vector3(bot.state.x, 0, bot.state.z).distanceTo(
        new THREE.Vector3(seekerPosition.x, 0, seekerPosition.z),
      );

      // Check if seeker is scary close
      if (!isHidingPhase && distToSeeker < 8 && bot.state.state !== "fleeing") {
        // Panic! Pick a new distant hiding spot
        bot.state.state = "fleeing";
        const farSpots = [...hidingSpots].sort((a, b) => {
          const distA = new THREE.Vector3(a.x, 0, a.z).distanceTo(seekerPosition);
          const distB = new THREE.Vector3(b.x, 0, b.z).distanceTo(seekerPosition);
          return distB - distA; // furthest first
        });
        const chosen = farSpots[Math.floor(Math.random() * Math.min(3, farSpots.length))];
        if (chosen) {
          bot.state.targetSpot = chosen;
          bot.targetPos.set(chosen.x, chosen.y, chosen.z);
        }
        bot.state.isCrouching = false;
        bot.char.setCrouch(false);
      }

      // If at hiding spot
      const currentPos = new THREE.Vector3(bot.state.x, 0, bot.state.z);
      const distToTarget = currentPos.distanceTo(new THREE.Vector3(bot.targetPos.x, 0, bot.targetPos.z));

      if (distToTarget < 1.2) {
        // We reached hiding spot!
        bot.state.state = "hiding";
        bot.state.currentAnim = "Idle";
        bot.char.playAnim("Idle");
        bot.state.isCrouching = true;
        bot.char.setCrouch(true);
      } else {
        // Move towards target
        const dir = new THREE.Vector3().subVectors(bot.targetPos, currentPos).normalize();
        const speed = bot.state.state === "fleeing" ? 6.5 : 4.0;
        bot.state.x += dir.x * speed * delta;
        bot.state.z += dir.z * speed * delta;

        // Smooth rotation
        const targetAngle = Math.atan2(dir.x, dir.z);
        bot.state.rotY = THREE.MathUtils.lerp(bot.state.rotY, targetAngle, delta * 10);
        bot.char.group.rotation.y = bot.state.rotY;

        const anim = speed > 5 ? "Run" : "Walk";
        bot.state.currentAnim = anim;
        bot.char.playAnim(anim);
        bot.char.setCrouch(false);
      }
    }

    // -------------------------------------------------------------
    // SEEKER BOT BEHAVIOR
    // -------------------------------------------------------------
    else if (bot.state.role === "seeker") {
      if (isHidingPhase) {
        // Seeker is waiting / blindfolded
        bot.state.currentAnim = "Idle";
        bot.char.playAnim("Idle");
        continue;
      }

      // Check if seeker spots player hider
      let chasedTarget: THREE.Vector3 | null = null;
      if (playerHiderPos) {
        const distToPlayer = new THREE.Vector3(bot.state.x, 0, bot.state.z).distanceTo(
          new THREE.Vector3(playerHiderPos.x, 0, playerHiderPos.z),
        );
        if (distToPlayer < 12) {
          chasedTarget = playerHiderPos;
          if (distToPlayer < 2.0) {
            onCatchHider("Player", "player");
          }
        }
      }

      // Check if seeker spots other hider bots
      if (!chasedTarget) {
        for (const other of bots) {
          if (other.state.role === "hider" && !other.state.isCaught) {
            const dist = new THREE.Vector3(bot.state.x, 0, bot.state.z).distanceTo(
              new THREE.Vector3(other.state.x, 0, other.state.z),
            );
            if (dist < 10) {
              chasedTarget = new THREE.Vector3(other.state.x, other.state.y, other.state.z);
              if (dist < 2.0) {
                other.state.isCaught = true;
                other.char.group.visible = false;
                onCatchHider(other.state.name, other.state.id);
              }
              break;
            }
          }
        }
      }

      // Set target pos
      if (chasedTarget) {
        bot.state.state = "chasing";
        bot.targetPos.copy(chasedTarget);
      } else {
        // Patrol through hiding spots
        const currentPos = new THREE.Vector3(bot.state.x, 0, bot.state.z);
        const distToSpot = currentPos.distanceTo(new THREE.Vector3(bot.targetPos.x, 0, bot.targetPos.z));

        if (distToSpot < 2.5) {
          bot.waitTime += delta;
          if (bot.waitTime > 2.5) {
            // Pick next random hiding spot to investigate
            bot.waitTime = 0;
            const nextSpot = hidingSpots[Math.floor(Math.random() * hidingSpots.length)];
            if (nextSpot) {
              bot.targetPos.set(nextSpot.x, nextSpot.y, nextSpot.z);
            }
          }
          bot.state.currentAnim = "Idle";
          bot.char.playAnim("Idle");
          continue;
        }
      }

      // Move Seeker
      const currentPos = new THREE.Vector3(bot.state.x, 0, bot.state.z);
      const dir = new THREE.Vector3().subVectors(bot.targetPos, currentPos).normalize();
      const speed = bot.state.state === "chasing" ? 6.8 : 4.5;
      bot.state.x += dir.x * speed * delta;
      bot.state.z += dir.z * speed * delta;

      const targetAngle = Math.atan2(dir.x, dir.z);
      bot.state.rotY = THREE.MathUtils.lerp(bot.state.rotY, targetAngle, delta * 8);
      bot.char.group.rotation.y = bot.state.rotY;

      const anim = speed > 5 ? "Run" : "Walk";
      bot.state.currentAnim = anim;
      bot.char.playAnim(anim);
    }

    // Update 3D position & animations
    bot.char.group.position.set(bot.state.x, bot.state.y, bot.state.z);
    bot.char.update(delta);
  }
}
