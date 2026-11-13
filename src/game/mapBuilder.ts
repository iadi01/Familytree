import * as THREE from "three";
import { HidingSpot, MapId, MapMetadata } from "./types";

export interface BuiltMap {
  group: THREE.Group;
  hidingSpots: HidingSpot[];
  seekerSpawn: THREE.Vector3;
  hiderSpawns: THREE.Vector3[];
  colliders: THREE.Box3[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  snowParticles?: THREE.Points;
  update?: (delta: number) => void;
}

export const MAPS: Record<MapId, MapMetadata> = {
  "timber-fort": {
    id: "timber-fort",
    name: "Timber Fort",
    tagline: "Medieval Outpost & Excavation Pit",
    description: "Hide among log palisades, inside watchtowers, behind the blacksmith forge, or in the deep quarry crater.",
    image: "/maps/timber-fort.jpg",
    fogColor: 0xdde5cb,
    skyColor: 0x9dc4e8,
    sunColor: 0xfffaed,
    groundColor: 0x6e7b4b,
    particles: "leaves",
    ambience: "Medieval Forest",
  },
  "frost-peak": {
    id: "frost-peak",
    name: "Frost Peak",
    tagline: "Alpine Ski Chalet & Snowy Summit",
    description: "Hide inside the timber ski chalet, behind snowmobiles, near the frozen waterfall, or behind snow-draped pine clusters.",
    image: "/maps/frost-peak.jpg",
    fogColor: 0xd8e4ee,
    skyColor: 0xa9cce3,
    sunColor: 0xffffff,
    groundColor: 0xecf0f1,
    particles: "snow",
    ambience: "Wintry Alpine",
  },
  "sunlit-pueblo": {
    id: "sunlit-pueblo",
    name: "Sunlit Pueblo",
    tagline: "Colonial Plaza, Basilica & Terraces",
    description: "Hide inside the central gazebo, behind colorful colonial houses, near market stalls, or up the hillside cemetery.",
    image: "/maps/sunlit-pueblo.jpg",
    fogColor: 0xf5deb3,
    skyColor: 0x87ceeb,
    sunColor: 0xfff3d1,
    groundColor: 0xd4a373,
    particles: "sparks",
    ambience: "Sunlit Plaza",
  },
  "neon-matrix": {
    id: "neon-matrix",
    name: "Neon Matrix",
    tagline: "Cyber Holographic Labyrinth",
    description: "Hide behind glowing holographic barriers, data obelisks, and energy terminals in a futuristic cyber labyrinth.",
    image: "/maps/timber-fort.jpg",
    fogColor: 0x0a0a1a,
    skyColor: 0x050510,
    sunColor: 0x00ffff,
    groundColor: 0x111122,
    particles: "sparks",
    ambience: "Cyber Synth",
  },
};

// Low-poly material palette
const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
const stoneMat = new THREE.MeshLambertMaterial({ color: 0x7f8c8d });
const darkStoneMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, flatShading: true });
const birchFoliageMat = new THREE.MeshLambertMaterial({ color: 0x558b2f, flatShading: true });
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
const birchTrunkMat = new THREE.MeshLambertMaterial({ color: 0xe0e0e0 });
const snowMat = new THREE.MeshLambertMaterial({ color: 0xf0f4f8, flatShading: true });
const iceMat = new THREE.MeshLambertMaterial({ color: 0xa5d6a7, transparent: true, opacity: 0.85 });
const redRoofMat = new THREE.MeshLambertMaterial({ color: 0xb71c1c });
const churchWhiteMat = new THREE.MeshLambertMaterial({ color: 0xfafafa });
const domeBlueMat = new THREE.MeshLambertMaterial({ color: 0x1565c0 });
const pinkHouseMat = new THREE.MeshLambertMaterial({ color: 0xd81b60 });
const blueHouseMat = new THREE.MeshLambertMaterial({ color: 0x1976d2 });
const goldHouseMat = new THREE.MeshLambertMaterial({ color: 0xf57f17 });
const crateMat = new THREE.MeshLambertMaterial({ color: 0xa1887f });
const barrelMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });

export function buildMap(mapId: MapId): BuiltMap {
  const group = new THREE.Group();
  const hidingSpots: HidingSpot[] = [];
  const colliders: THREE.Box3[] = [];
  let seekerSpawn = new THREE.Vector3(0, 0, 0);
  const hiderSpawns: THREE.Vector3[] = [];
  let snowParticles: THREE.Points | undefined;
  let updateFn: ((delta: number) => void) | undefined;

  const bounds = { minX: -48, maxX: 48, minZ: -48, maxZ: 48 };

  // Helper to add obstacle + collider
  function addBoxObstacle(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    castShadow = true,
  ) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Collider
    const box = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y + h / 2, z),
      new THREE.Vector3(w, h * 2, d),
    );
    colliders.push(box);
    return mesh;
  }

  function addTree(x: number, z: number, scale = 1, isSnowy = false, isBirch = false) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.25 * scale, 0.4 * scale, 3 * scale, 6);
    const trunk = new THREE.Mesh(trunkGeo, isBirch ? birchTrunkMat : trunkMat);
    trunk.position.y = 1.5 * scale;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Conical Foliage layers
    const fMat = isSnowy
      ? new THREE.MeshLambertMaterial({ color: 0x3d5a45, flatShading: true })
      : isBirch
        ? birchFoliageMat
        : foliageMat;

    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const coneGeo = new THREE.ConeGeometry((2.2 - i * 0.5) * scale, 2.5 * scale, 7);
      const cone = new THREE.Mesh(coneGeo, fMat);
      cone.position.y = (2.8 + i * 1.5) * scale;
      cone.castShadow = true;
      treeGroup.add(cone);

      if (isSnowy) {
        // Snow cap
        const snowCapGeo = new THREE.ConeGeometry((2.25 - i * 0.5) * scale, 0.8 * scale, 7);
        const snowCap = new THREE.Mesh(snowCapGeo, snowMat);
        snowCap.position.y = (3.4 + i * 1.5) * scale;
        treeGroup.add(snowCap);
      }
    }

    group.add(treeGroup);

    // Trunk collider
    colliders.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, 1.5 * scale, z),
        new THREE.Vector3(0.9 * scale, 4 * scale, 0.9 * scale),
      ),
    );
  }

  function addBarrelOrCrate(x: number, z: number, isBarrel = true) {
    if (isBarrel) {
      const geo = new THREE.CylinderGeometry(0.5, 0.5, 1.1, 8);
      const mesh = new THREE.Mesh(geo, barrelMat);
      mesh.position.set(x, 0.55, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    } else {
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const mesh = new THREE.Mesh(geo, crateMat);
      mesh.position.set(x, 0.5, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    colliders.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, 0.6, z),
        new THREE.Vector3(1.1, 1.5, 1.1),
      ),
    );
  }

  /* -------------------------------------------------------------
     MAP 1: TIMBER FORT / MEDIEVAL OUTPOST (Image 1)
     ------------------------------------------------------------- */
  if (mapId === "timber-fort") {
    seekerSpawn = new THREE.Vector3(0, 0, -28);

    // Ground Island
    const islandGeo = new THREE.CylinderGeometry(42, 45, 6, 32);
    const islandMesh = new THREE.Mesh(
      islandGeo,
      new THREE.MeshLambertMaterial({ color: 0x60733d, flatShading: true }),
    );
    islandMesh.position.y = -3;
    islandMesh.receiveShadow = true;
    group.add(islandMesh);

    // Dirt trails
    const pathGeo = new THREE.CircleGeometry(16, 16);
    const pathMat = new THREE.MeshLambertMaterial({ color: 0x8b7355, flatShading: true });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.set(-6, 0.05, -6);
    pathMesh.receiveShadow = true;
    group.add(pathMesh);

    // Deep Crater / Excavation Pit (Right-Center, matches image)
    const craterRimGeo = new THREE.TorusGeometry(8.5, 2, 10, 24);
    const craterMat = new THREE.MeshLambertMaterial({ color: 0x4a3b2c, flatShading: true });
    const craterRim = new THREE.Mesh(craterRimGeo, craterMat);
    craterRim.rotation.x = Math.PI / 2;
    craterRim.position.set(12, 0.2, 10);
    group.add(craterRim);

    // Water pool in crater bottom
    const waterGeo = new THREE.CircleGeometry(6, 16);
    const waterMat = new THREE.MeshLambertMaterial({ color: 0x224433, transparent: true, opacity: 0.9 });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(12, 0.1, 10);
    group.add(waterMesh);

    hidingSpots.push({
      id: "crater-pit",
      name: "Quarry Excavation Pit",
      x: 12,
      y: 0,
      z: 10,
      radius: 5,
      isCover: true,
    });

    // Fort Palisade Walls (North-West compound)
    // Wall North
    addBoxObstacle(16, 3.5, 0.8, -16, 0, -18, woodMat);
    // Wall West
    addBoxObstacle(0.8, 3.5, 14, -24, 0, -11, woodMat);
    // Wall South with Gate opening
    addBoxObstacle(6, 3.5, 0.8, -21, 0, -4, woodMat);
    addBoxObstacle(6, 3.5, 0.8, -11, 0, -4, woodMat);
    // Wall East
    addBoxObstacle(0.8, 3.5, 14, -8, 0, -11, woodMat);

    // Fort Watchtower at NW corner
    addBoxObstacle(3.5, 6.5, 3.5, -23, 0, -17, darkWoodMat);
    hidingSpots.push({
      id: "fort-watchtower",
      name: "Fort NW Watchtower",
      x: -23,
      y: 0,
      z: -17,
      radius: 2.2,
      isCover: true,
    });

    // Fort Houses inside Compound
    addBoxObstacle(6, 4, 5, -16, 0, -13, woodMat);
    // Roof
    const roofGeo = new THREE.ConeGeometry(4.5, 2, 4);
    const roofMesh = new THREE.Mesh(roofGeo, redRoofMat);
    roofMesh.position.set(-16, 5, -13);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.castShadow = true;
    group.add(roofMesh);

    hidingSpots.push({
      id: "fort-cabin",
      name: "Inner Fort Cabin",
      x: -16,
      y: 0,
      z: -9,
      radius: 3,
      isCover: true,
    });

    // Blacksmith & Forge (South of crater)
    addBoxObstacle(5, 3, 4, -4, 0, 18, darkWoodMat);
    addBoxObstacle(1.5, 4.5, 1.5, -5.5, 0, 19.5, stoneMat); // Chimney
    hidingSpots.push({
      id: "blacksmith-forge",
      name: "Blacksmith Forge",
      x: -4,
      y: 0,
      z: 18,
      radius: 3,
      isCover: true,
    });

    // Storage Huts (East side)
    addBoxObstacle(5, 3.2, 4, 26, 0, -12, woodMat);
    addBoxObstacle(4, 2.8, 4, 32, 0, -10, darkWoodMat);
    hidingSpots.push({
      id: "east-storage-huts",
      name: "Eastern Supply Sheds",
      x: 29,
      y: 0,
      z: -11,
      radius: 3.5,
      isCover: true,
    });

    // Hay Carts & Crates
    addBoxObstacle(3.5, 1.5, 2.2, 16, 0, -2, woodMat);
    addBarrelOrCrate(14, -3, true);
    addBarrelOrCrate(18, -1, true);
    addBarrelOrCrate(19, -3, false);
    hidingSpots.push({
      id: "hay-cart-crates",
      name: "Supply Cart & Barrels",
      x: 16,
      y: 0,
      z: -2,
      radius: 2.5,
      isCover: true,
    });

    // Dense Forest Clusters around the boundary (Hiding spots!)
    const treePositions = [
      // North
      [-30, -26], [-24, -28], [-18, -30], [-10, -32], [2, -30], [12, -28], [22, -26], [30, -24],
      // East forest
      [34, -18], [36, -8], [32, 2], [35, 12], [28, 20], [20, 26],
      // South forest
      [10, 30], [0, 32], [-12, 30], [-20, 26], [-28, 20],
      // West forest
      [-34, 12], [-36, 0], [-35, -12], [-32, -20],
      // Center scattered
      [-2, -12], [2, 6], [22, 4], [-12, 10],
    ];

    treePositions.forEach(([tx, tz], i) => {
      addTree(tx, tz, 0.85 + (i % 3) * 0.25, false, i % 4 === 0);
    });

    hidingSpots.push({
      id: "deep-forest-north",
      name: "North Dense Pines",
      x: -2,
      y: 0,
      z: -30,
      radius: 4,
      isCover: true,
    });
    hidingSpots.push({
      id: "south-woods",
      name: "South Forest Clearing",
      x: -16,
      y: 0,
      z: 22,
      radius: 3.5,
      isCover: true,
    });

    // Hider spawns around the map
    hiderSpawns.push(
      new THREE.Vector3(-16, 0, -10),
      new THREE.Vector3(12, 0, 10),
      new THREE.Vector3(-4, 0, 18),
      new THREE.Vector3(26, 0, -12),
      new THREE.Vector3(16, 0, -2),
      new THREE.Vector3(-2, 0, -28),
    );
  }

  /* -------------------------------------------------------------
     MAP 2: FROST PEAK / ALPINE SKI RESORT (Image 2)
     ------------------------------------------------------------- */
  else if (mapId === "frost-peak") {
    seekerSpawn = new THREE.Vector3(18, 0, 22);

    // Snowy Island Ground
    const snowGroundGeo = new THREE.CylinderGeometry(44, 46, 5, 32);
    const snowGroundMesh = new THREE.Mesh(snowGroundGeo, snowMat);
    snowGroundMesh.position.y = -2.5;
    snowGroundMesh.receiveShadow = true;
    group.add(snowGroundMesh);

    // Towering Mountain Peak in Background (North)
    const mountainGeo = new THREE.ConeGeometry(24, 22, 9);
    const mountainMat = new THREE.MeshLambertMaterial({ color: 0xe6edf2, flatShading: true });
    const mountain = new THREE.Mesh(mountainGeo, mountainMat);
    mountain.position.set(4, 8, -22);
    mountain.castShadow = true;
    group.add(mountain);

    // Summit Cross on peak
    const crossVert = addBoxObstacle(0.4, 3, 0.4, 7, 19, -21, darkWoodMat, false);
    const crossHoriz = addBoxObstacle(1.8, 0.4, 0.4, 7, 20.2, -21, darkWoodMat, false);

    // Frozen Waterfall / Ice Cliff
    const iceGeo = new THREE.BoxGeometry(7, 12, 3);
    const iceMesh = new THREE.Mesh(iceGeo, iceMat);
    iceMesh.position.set(3, 5, -12);
    group.add(iceMesh);
    colliders.push(new THREE.Box3().setFromObject(iceMesh));

    hidingSpots.push({
      id: "frozen-waterfall",
      name: "Frozen Ice Cavern",
      x: 3,
      y: 0,
      z: -10,
      radius: 3.5,
      isCover: true,
    });

    // 2-Story Alpine Wooden Ski Chalet (West)
    addBoxObstacle(12, 6, 8, -18, 0, 6, woodMat);
    // Roof with Snow
    const chaletRoofGeo = new THREE.BoxGeometry(14, 1.2, 10);
    const chaletRoof = new THREE.Mesh(chaletRoofGeo, snowMat);
    chaletRoof.position.set(-18, 6.6, 6);
    chaletRoof.rotation.z = 0.05;
    chaletRoof.castShadow = true;
    group.add(chaletRoof);
    // Porch & balustrade
    addBoxObstacle(12, 1, 3, -18, 0, 11, darkWoodMat);
    // Chimney with smoke effect
    addBoxObstacle(1.2, 4, 1.2, -15, 6, 4, stoneMat);

    hidingSpots.push({
      id: "ski-chalet-porch",
      name: "Ski Chalet Porch & Rear",
      x: -18,
      y: 0,
      z: 2,
      radius: 4,
      isCover: true,
    });

    // Ski Lift System (Center through Mountain)
    // Tower 1 (Base station)
    addBoxObstacle(1.2, 9, 1.2, 4, 0, 14, darkStoneMat);
    addBoxObstacle(6, 0.6, 1.2, 4, 9, 14, darkStoneMat);
    // Tower 2 (Mid mountain)
    addBoxObstacle(1.2, 12, 1.2, 12, 0, -2, darkStoneMat);
    addBoxObstacle(6, 0.6, 1.2, 12, 12, -2, darkStoneMat);
    // Tower 3 (Summit station)
    addBoxObstacle(1.2, 15, 1.2, 22, 0, -18, darkStoneMat);

    // Cable line
    const cableMat = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
    const cablePoints = [
      new THREE.Vector3(4, 9.2, 14),
      new THREE.Vector3(12, 12.2, -2),
      new THREE.Vector3(22, 15.2, -18),
    ];
    const cableGeo = new THREE.BufferGeometry().setFromPoints(cablePoints);
    const cableLine = new THREE.Line(cableGeo, cableMat);
    group.add(cableLine);

    // Suspended Gondola 1
    const gondola1 = addBoxObstacle(1.8, 2.2, 1.8, 8, 8, 6, redRoofMat);
    // Suspended Gondola 2
    const gondola2 = addBoxObstacle(1.8, 2.2, 1.8, 17, 11, -10, blueHouseMat);

    // Ski Lift Base Operator Shack
    addBoxObstacle(4, 3, 4, -1, 0, 14, woodMat);
    hidingSpots.push({
      id: "lift-station-shack",
      name: "Ski Lift Operator Booth",
      x: -1,
      y: 0,
      z: 14,
      radius: 3,
      isCover: true,
    });

    // Snowmobiles & Ski Racks
    addBoxObstacle(2.5, 1.2, 1.2, -8, 0, 16, redRoofMat);
    addBoxObstacle(2.5, 1.2, 1.2, -5, 0, 18, goldHouseMat);
    addBoxObstacle(4, 1.8, 0.6, 10, 0, 18, woodMat); // Ski rack
    hidingSpots.push({
      id: "snowmobile-park",
      name: "Snowmobiles & Ski Racks",
      x: -7,
      y: 0,
      z: 17,
      radius: 2.5,
      isCover: true,
    });

    // Mountain Rescue Hut (East summit)
    addBoxObstacle(5, 3.5, 4, 26, 0, -16, churchWhiteMat);
    // Red cross on rescue hut
    addBoxObstacle(1.2, 0.4, 0.1, 26, 2.5, -13.9, redRoofMat, false);
    addBoxObstacle(0.4, 1.2, 0.1, 26, 2.5, -13.9, redRoofMat, false);
    hidingSpots.push({
      id: "mountain-rescue-hut",
      name: "Alpine Rescue Station",
      x: 26,
      y: 0,
      z: -16,
      radius: 3,
      isCover: true,
    });

    // Dense Snow-Draped Pines
    const pinePositions = [
      [-32, -18], [-28, -12], [-30, -4], [-33, 8], [-28, 18], [-24, 24],
      [-34, -26], [-24, -28], [-14, -26], [-8, -28],
      [28, 4], [32, 12], [26, 18], [34, -4], [30, -24],
      [-6, 4], [16, 6], [2, 24],
    ];

    pinePositions.forEach(([px, pz], i) => {
      addTree(px, pz, 0.8 + (i % 3) * 0.3, true, false);
    });

    hidingSpots.push({
      id: "snowy-woods-west",
      name: "West Pine Forest",
      x: -30,
      y: 0,
      z: -12,
      radius: 4,
      isCover: true,
    });

    // Falling Snow Particles
    const snowCount = 450;
    const snowPositions = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      snowPositions[i * 3] = (Math.random() - 0.5) * 80;
      snowPositions[i * 3 + 1] = Math.random() * 25;
      snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute("position", new THREE.BufferAttribute(snowPositions, 3));
    const snowParticleMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      transparent: true,
      opacity: 0.85,
    });
    snowParticles = new THREE.Points(snowGeo, snowParticleMat);
    group.add(snowParticles);

    updateFn = (delta: number) => {
      if (!snowParticles) return;
      const positions = snowParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < snowCount; i++) {
        positions[i * 3 + 1] -= delta * 3.5;
        positions[i * 3] += Math.sin(positions[i * 3 + 1] * 0.5) * 0.04;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 25;
        }
      }
      snowParticles.geometry.attributes.position.needsUpdate = true;
    };

    hiderSpawns.push(
      new THREE.Vector3(3, 0, -10),
      new THREE.Vector3(-18, 0, 2),
      new THREE.Vector3(-1, 0, 14),
      new THREE.Vector3(-7, 0, 17),
      new THREE.Vector3(26, 0, -16),
      new THREE.Vector3(-30, 0, -12),
    );
  }

  /* -------------------------------------------------------------
     MAP 3: SUNLIT PUEBLO / COLONIAL PLAZA (Image 3)
     ------------------------------------------------------------- */
  else if (mapId === "sunlit-pueblo") {
    seekerSpawn = new THREE.Vector3(0, 0, 26);

    // Terracotta Island Ground
    const puebloGroundGeo = new THREE.CylinderGeometry(44, 46, 5, 32);
    const puebloGround = new THREE.Mesh(
      puebloGroundGeo,
      new THREE.MeshLambertMaterial({ color: 0xd4a373, flatShading: true }),
    );
    puebloGround.position.y = -2.5;
    puebloGround.receiveShadow = true;
    group.add(puebloGround);

    // Cobblestone Plaza Center
    const plazaGeo = new THREE.BoxGeometry(26, 0.1, 26);
    const plazaMat = new THREE.MeshLambertMaterial({ color: 0xc8b69e });
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.set(-6, 0.05, 0);
    plazaMesh.receiveShadow = true;
    group.add(plazaMesh);

    // Central Town Gazebo (Kiosko) with Octagonal Roof
    const gazeboBase = addBoxObstacle(7, 0.8, 7, -6, 0, 0, stoneMat);
    // Columns
    const colOffsets = [[-2.8, -2.8], [2.8, -2.8], [-2.8, 2.8], [2.8, 2.8]];
    colOffsets.forEach(([cx, cz]) => {
      addBoxObstacle(0.3, 3, 0.3, -6 + cx, 0.8, cz, darkWoodMat, false);
    });
    // Green Dome Roof
    const kioskRoofGeo = new THREE.ConeGeometry(4.8, 2.2, 8);
    const kioskRoofMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 });
    const kioskRoof = new THREE.Mesh(kioskRoofGeo, kioskRoofMat);
    kioskRoof.position.set(-6, 4.2, 0);
    kioskRoof.castShadow = true;
    group.add(kioskRoof);

    hidingSpots.push({
      id: "plaza-gazebo",
      name: "Central Town Gazebo",
      x: -6,
      y: 0,
      z: 0,
      radius: 3.5,
      isCover: true,
    });

    // Historic Church / Basilica (West)
    // Main Sanctuary
    addBoxObstacle(11, 8, 14, -24, 0, -6, churchWhiteMat);
    // Twin Bell Towers
    addBoxObstacle(3.5, 13, 3.5, -28, 0, 1.5, churchWhiteMat);
    addBoxObstacle(3.5, 13, 3.5, -20, 0, 1.5, churchWhiteMat);
    // Blue Dome on Church
    const churchDomeGeo = new THREE.SphereGeometry(3.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const churchDome = new THREE.Mesh(churchDomeGeo, domeBlueMat);
    churchDome.position.set(-24, 8, -6);
    churchDome.castShadow = true;
    group.add(churchDome);

    // Church Portal Arch
    addBoxObstacle(3, 4.5, 0.8, -24, 0, 2.2, darkWoodMat);

    hidingSpots.push({
      id: "church-sanctuary",
      name: "Basilica Bell Towers & Portal",
      x: -24,
      y: 0,
      z: 4,
      radius: 4,
      isCover: true,
    });

    // Colorful Colonial Houses (South & East of Plaza)
    // Magenta House
    addBoxObstacle(7, 6, 6, -10, 0, 14, pinkHouseMat);
    // Sky Blue House
    addBoxObstacle(8, 6.5, 7, 1, 0, 15, blueHouseMat);
    // Terracotta Yellow House
    addBoxObstacle(7, 5.5, 6, 10, 0, 13, goldHouseMat);

    hidingSpots.push({
      id: "colonial-houses-alley",
      name: "Colorful Houses Back Alley",
      x: 0,
      y: 0,
      z: 20,
      radius: 4,
      isCover: true,
    });

    // Hillside Terraced Slopes & Cemetery (North-East, matches image)
    // Terrace 1
    addBoxObstacle(24, 3, 14, 18, 0, -14, darkStoneMat);
    // Terrace 2
    addBoxObstacle(18, 3, 10, 20, 3, -16, darkStoneMat);
    // Small Hilltop Chapel
    addBoxObstacle(5, 4, 4, 22, 6, -16, churchWhiteMat);
    const chapelRoof = new THREE.ConeGeometry(3.2, 1.8, 4);
    const chapelRoofMesh = new THREE.Mesh(chapelRoof, redRoofMat);
    chapelRoofMesh.position.set(22, 9, -16);
    chapelRoofMesh.rotation.y = Math.PI / 4;
    group.add(chapelRoofMesh);

    // Shrines / Tombs on Terrace
    for (let i = 0; i < 6; i++) {
      const tx = 14 + (i % 3) * 4;
      const tz = -11 - Math.floor(i / 3) * 5;
      addBoxObstacle(1.6, 0.8, 1, tx, 3, tz, churchWhiteMat);
    }

    hidingSpots.push({
      id: "hillside-cemetery",
      name: "Hillside Terrace & Chapel",
      x: 20,
      y: 3,
      z: -14,
      radius: 4.5,
      isCover: true,
    });

    // Market Stalls with colorful canopies
    addBoxObstacle(3, 1.2, 1.8, 4, 0, -6, woodMat);
    const canopyGeo = new THREE.BoxGeometry(3.6, 0.2, 2.4);
    const canopy = new THREE.Mesh(canopyGeo, redRoofMat);
    canopy.position.set(4, 2.5, -6);
    group.add(canopy);

    addBarrelOrCrate(6, -7, true);
    addBarrelOrCrate(6, -5, true);
    addBarrelOrCrate(3, -9, false);

    hidingSpots.push({
      id: "market-canopy",
      name: "Plaza Market Stalls",
      x: 5,
      y: 0,
      z: -6,
      radius: 2.5,
      isCover: true,
    });

    // Cypress trees and street lamps
    const cypressPos = [
      [-34, -18], [-32, 12], [-14, -20], [-2, -22], [10, -24],
      [32, -4], [34, 10], [24, 22], [14, 24],
    ];
    cypressPos.forEach(([cx, cz]) => {
      addTree(cx, cz, 0.9, false, false);
    });

    hiderSpawns.push(
      new THREE.Vector3(-6, 0, 0),
      new THREE.Vector3(-24, 0, 4),
      new THREE.Vector3(0, 0, 20),
      new THREE.Vector3(20, 3, -14),
      new THREE.Vector3(5, 0, -6),
      new THREE.Vector3(-14, 0, -20),
    );
  }

  /* -------------------------------------------------------------
     MAP 4: NEON MATRIX / CYBER LABYRINTH
     ------------------------------------------------------------- */
  else {
    seekerSpawn = new THREE.Vector3(0, 0, -24);

    // Dark cyber floor with neon grid
    const floorGeo = new THREE.PlaneGeometry(80, 80, 32, 32);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x070b19,
      roughness: 0.2,
      metalness: 0.8,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    // Neon Grid Helper
    const gridHelper = new THREE.GridHelper(80, 40, 0x00ffff, 0xff00ff);
    gridHelper.position.y = 0.02;
    group.add(gridHelper);

    const neonCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff });
    const neonPink = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3 });

    // Labyrinth maze walls
    const walls = [
      // Outer box walls
      { w: 60, h: 4, d: 1, x: 0, z: -30 },
      { w: 60, h: 4, d: 1, x: 0, z: 30 },
      { w: 1, h: 4, d: 60, x: -30, z: 0 },
      { w: 1, h: 4, d: 60, x: 30, z: 0 },
      // Inner maze sections
      { w: 20, h: 4, d: 1, x: -10, z: -15 },
      { w: 1, h: 4, d: 20, x: 10, z: -10 },
      { w: 22, h: 4, d: 1, x: 5, z: 5 },
      { w: 1, h: 4, d: 18, x: -15, z: 8 },
      { w: 16, h: 4, d: 1, x: 14, z: 18 },
      { w: 1, h: 4, d: 14, x: 0, z: -5 },
    ];

    walls.forEach((w, i) => {
      addBoxObstacle(w.w, w.h, w.d, w.x, 0, w.z, darkMat);
      // Glowing neon edge top
      const edge = addBoxObstacle(
        w.w,
        0.15,
        w.d,
        w.x,
        w.h,
        w.z,
        i % 2 === 0 ? neonCyan : neonPink,
        false,
      );
    });

    // Central Data Core Tower
    addBoxObstacle(4, 10, 4, 0, 0, 0, darkMat);
    addBoxObstacle(4.2, 0.4, 4.2, 0, 5, 0, neonCyan, false);
    addBoxObstacle(4.2, 0.4, 4.2, 0, 9.8, 0, neonPink, false);

    hidingSpots.push({
      id: "cyber-core",
      name: "Central Data Obelisk",
      x: 0,
      y: 0,
      z: 0,
      radius: 3,
      isCover: true,
    });
    hidingSpots.push({
      id: "nw-terminal",
      name: "NW Cyber Vault",
      x: -20,
      y: 0,
      z: -20,
      radius: 4,
      isCover: true,
    });
    hidingSpots.push({
      id: "se-terminal",
      name: "SE Energy Hub",
      x: 20,
      y: 0,
      z: 20,
      radius: 4,
      isCover: true,
    });

    hiderSpawns.push(
      new THREE.Vector3(-20, 0, -20),
      new THREE.Vector3(20, 0, 20),
      new THREE.Vector3(-18, 0, 18),
      new THREE.Vector3(18, 0, -18),
      new THREE.Vector3(0, 0, 12),
    );
  }

  return {
    group,
    hidingSpots,
    seekerSpawn,
    hiderSpawns,
    colliders,
    bounds,
    snowParticles,
    update: updateFn,
  };
}
