import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { CharacterType } from "./types";

export interface CharacterInstance {
  group: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: Record<string, THREE.AnimationAction>;
  currentAction: string;
  playAnim: (name: "Idle" | "Walk" | "Run" | "Jump" | "Fall") => void;
  update: (delta: number) => void;
  setCrouch: (crouch: boolean) => void;
  modelType: CharacterType;
}

const gltfLoader = new GLTFLoader();
const modelCache: Record<string, any> = {};

export function createProceduralBot(color: number = 0x2196f3): THREE.Group {
  const botGroup = new THREE.Group();

  // Torso
  const torsoGeo = new THREE.CylinderGeometry(0.5, 0.45, 0.9, 12);
  const torsoMat = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  botGroup.add(torso);

  // Head
  const headGeo = new THREE.SphereGeometry(0.42, 14, 12);
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.8;
  head.castShadow = true;
  botGroup.add(head);

  // Visor / Eyes
  const visorGeo = new THREE.BoxGeometry(0.5, 0.18, 0.25);
  const visorMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.82, 0.35);
  botGroup.add(visor);

  // Antenna
  const antGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4);
  const ant = new THREE.Mesh(antGeo, new THREE.MeshLambertMaterial({ color: 0x333333 }));
  ant.position.set(0, 2.3, 0);
  const tipGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const tip = new THREE.Mesh(tipGeo, new THREE.MeshBasicMaterial({ color: 0xffeb3b }));
  tip.position.set(0, 2.5, 0);
  botGroup.add(ant);
  botGroup.add(tip);

  // Legs
  const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6), legMat);
  leftLeg.position.set(-0.25, 0.35, 0);
  leftLeg.name = "leftLeg";
  leftLeg.castShadow = true;
  botGroup.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6), legMat);
  rightLeg.position.set(0.25, 0.35, 0);
  rightLeg.name = "rightLeg";
  rightLeg.castShadow = true;
  botGroup.add(rightLeg);

  return botGroup;
}

export async function loadCharacter(
  type: CharacterType,
  tintColor?: number,
): Promise<CharacterInstance> {
  const container = new THREE.Group();

  let gltfData = modelCache[type];
  if (!gltfData) {
    try {
      const url = `/models/${type}.glb`;
      gltfData = await gltfLoader.loadAsync(url);
      modelCache[type] = gltfData;
    } catch (err) {
      console.warn(`Could not load GLB for ${type}, using procedural avatar:`, err);
    }
  }

  // If GLTF is available
  if (gltfData && gltfData.scene) {
    const clone = gltfData.scene.clone(true);
    // Scale appropriately (gdquest models are slightly different in scale)
    const scale = type === "beetle_bot" ? 1.6 : type === "sophia" ? 1.3 : 1.4;
    clone.scale.set(scale, scale, scale);

    clone.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (tintColor && child.material) {
          const mat = child.material.clone();
          if (mat.color) {
            mat.color.lerp(new THREE.Color(tintColor), 0.35);
          }
          child.material = mat;
        }
      }
    });

    container.add(clone);

    // Animation Mixer
    let mixer: THREE.AnimationMixer | null = null;
    const actions: Record<string, THREE.AnimationAction> = {};

    if (gltfData.animations && gltfData.animations.length > 0) {
      mixer = new THREE.AnimationMixer(clone);

      // Find best animation clip matches
      const findClip = (candidates: string[]) => {
        for (const c of candidates) {
          const found = gltfData.animations.find(
            (a: THREE.AnimationClip) => a.name.toLowerCase() === c.toLowerCase(),
          );
          if (found) return found;
        }
        return gltfData.animations[0];
      };

      const idleClip = findClip(["idle"]);
      const walkClip = findClip(["walk", "run"]);
      const runClip = findClip(["run", "walk"]);
      const jumpClip = findClip(["jump", "flip", "fall"]);
      const fallClip = findClip(["fall", "jump"]);

      if (idleClip) actions["Idle"] = mixer.clipAction(idleClip);
      if (walkClip) actions["Walk"] = mixer.clipAction(walkClip);
      if (runClip) actions["Run"] = mixer.clipAction(runClip);
      if (jumpClip) actions["Jump"] = mixer.clipAction(jumpClip);
      if (fallClip) actions["Fall"] = mixer.clipAction(fallClip);

      if (actions["Idle"]) {
        actions["Idle"].play();
      }
    }

    let currentActionName = "Idle";

    const playAnim = (name: "Idle" | "Walk" | "Run" | "Jump" | "Fall") => {
      if (!mixer || currentActionName === name) return;
      const prev = actions[currentActionName];
      const next = actions[name] || actions["Idle"];

      if (next) {
        if (prev && prev !== next) {
          prev.fadeOut(0.2);
        }
        next.reset().fadeIn(0.2).play();
        currentActionName = name;
      }
    };

    let isCrouched = false;
    const setCrouch = (crouch: boolean) => {
      isCrouched = crouch;
      clone.scale.y = crouch ? scale * 0.65 : scale;
      clone.position.y = crouch ? -0.15 : 0;
    };

    return {
      group: container,
      mixer,
      actions,
      currentAction: currentActionName,
      playAnim,
      update: (delta: number) => {
        if (mixer) mixer.update(delta);
      },
      setCrouch,
      modelType: type,
    };
  }

  // Fallback procedural bot with synthesized bobbing animation
  const procBot = createProceduralBot(tintColor || 0x2196f3);
  container.add(procBot);

  let animTimer = 0;
  let currentAnimState: "Idle" | "Walk" | "Run" | "Jump" | "Fall" = "Idle";
  let isCrouched = false;

  const leftLeg = procBot.getObjectByName("leftLeg");
  const rightLeg = procBot.getObjectByName("rightLeg");

  return {
    group: container,
    mixer: null,
    actions: {},
    currentAction: "Idle",
    playAnim: (name) => {
      currentAnimState = name;
    },
    update: (delta: number) => {
      animTimer += delta * (currentAnimState === "Run" ? 14 : currentAnimState === "Walk" ? 8 : 2);
      if (currentAnimState === "Walk" || currentAnimState === "Run") {
        if (leftLeg) leftLeg.rotation.x = Math.sin(animTimer) * 0.6;
        if (rightLeg) rightLeg.rotation.x = -Math.sin(animTimer) * 0.6;
        procBot.position.y = Math.abs(Math.sin(animTimer)) * 0.08;
      } else if (currentAnimState === "Jump") {
        if (leftLeg) leftLeg.rotation.x = -0.4;
        if (rightLeg) rightLeg.rotation.x = 0.4;
      } else {
        if (leftLeg) leftLeg.rotation.x = 0;
        if (rightLeg) rightLeg.rotation.x = 0;
        procBot.position.y = Math.sin(animTimer * 1.5) * 0.03;
      }
    },
    setCrouch: (crouch) => {
      isCrouched = crouch;
      procBot.scale.y = crouch ? 0.65 : 1;
    },
    modelType: type,
  };
}
