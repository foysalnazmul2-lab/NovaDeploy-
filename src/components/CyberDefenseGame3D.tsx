import { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Shield,
  Volume2,
  VolumeX,
  Pause,
  Play,
  RotateCcw,
  ArrowLeft,
  Trophy,
  Zap,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import { computeWaveThreatProfile } from '../utils/engine';
import { GameRunScoreRecord } from '../types';

interface CyberDefenseGame3DProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  currentUserUid?: string;
  leaderboard: GameRunScoreRecord[];
  onSaveGameScore: (scoreRecord: Omit<GameRunScoreRecord, 'id' | 'ownerUid' | 'createdAt'>) => void;
}

type GameLifecycleState = 'title' | 'playing' | 'paused' | 'gameover';
type EnemyArchetype = 'swarm' | 'weaver' | 'juggernaut';

interface EnemyEntity {
  id: number;
  archetype: EnemyArchetype;
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  coreMaterial: THREE.MeshStandardMaterial;
  hp: number;
  maxHp: number;
  speed: number;
  windupTimer: number;
  isWindingUp: boolean;
  orbitPhase: number;
  hitFlashTimer: number;
}

interface ProjectileEntity {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isEnemy: boolean;
  life: number;
}

interface ParticleSlot {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  age: number;
  maxAge: number;
}

export function CyberDefenseGame3D({
  isOpen,
  onClose,
  playerName,
  leaderboard,
  onSaveGameScore,
}: CyberDefenseGame3DProps) {
  const [gameState, setGameState] = useState<GameLifecycleState>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return 'playing';
    }
    return 'title';
  });

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('novaguard_high_score')) || 1450;
    } catch {
      return 1450;
    }
  });
  const [wave, setWave] = useState(1);
  const [coreIntegrity, setCoreIntegrity] = useState(100);
  const [empCharge, setEmpCharge] = useState(100);
  const [hostilesRemaining, setHostilesRemaining] = useState(8);
  const [enemiesNeutralized, setEnemiesNeutralized] = useState(0);
  const [muted, setMuted] = useState(false);
  const [victoryAchieved, setVictoryAchieved] = useState(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const gameStateRef = useRef<GameLifecycleState>(gameState);
  const mutedRef = useRef<boolean>(muted);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync ref and body dataset state hook for automated verification
  useEffect(() => {
    gameStateRef.current = gameState;
    if (isOpen && typeof document !== 'undefined') {
      document.body.dataset.state = gameState;
    }
    return () => {
      if (typeof document !== 'undefined') {
        delete document.body.dataset.state;
      }
    };
  }, [gameState, isOpen]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Procedural Web Audio API sound effects
  const playSynthSound = useCallback(
    (type: 'laser' | 'hit' | 'emp' | 'wave' | 'gameover') => {
      if (mutedRef.current) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'laser') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(680, now);
          osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.09);
          osc.start(now);
          osc.stop(now + 0.09);
        } else if (type === 'hit') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, now);
          osc.frequency.exponentialRampToValueAtTime(75, now + 0.14);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.14);
          osc.start(now);
          osc.stop(now + 0.14);
        } else if (type === 'emp') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(820, now + 0.35);
          gain.gain.setValueAtTime(0.16, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.36);
          osc.start(now);
          osc.stop(now + 0.36);
        } else if (type === 'wave') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(660, now + 0.1);
          gain.gain.setValueAtTime(0.11, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.28);
          osc.start(now);
          osc.stop(now + 0.28);
        } else if (type === 'gameover') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.linearRampToValueAtTime(95, now + 0.45);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.45);
          osc.start(now);
          osc.stop(now + 0.45);
        }
      } catch {
        // Ignore audio context restrictions
      }
    },
    []
  );

  // Controls Ref for triggering actions from React UI or keyboard
  const triggerStartRunRef = useRef<() => void>(() => {});
  const triggerEmpRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!isOpen) return;
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Fog & Camera
    const HORIZON_COLOR = 0x070b16;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(HORIZON_COLOR);
    scene.fog = new THREE.FogExp2(HORIZON_COLOR, 0.016);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 160);
    camera.position.set(0, 21, 24);
    camera.lookAt(0, 0, 0);

    // 2. Renderer & Software WebGL Detection
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererInfo = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|OffscreenCanvas/i.test(rendererInfo);

    renderer.setPixelRatio(isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. IBL RoomEnvironment for metallic/roughness PBR highlights
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // 4. Lighting (Warm Key + Cool Sky/Ground Hemisphere + Core Accent)
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    dirLight.position.set(16, 28, 18);
    if (!isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      dirLight.shadow.camera.near = 2;
      dirLight.shadow.camera.far = 70;
      const d = 24;
      dirLight.shadow.camera.left = -d;
      dirLight.shadow.camera.right = d;
      dirLight.shadow.camera.top = d;
      dirLight.shadow.camera.bottom = -d;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);

    const corePointLight = new THREE.PointLight(0x22d3ee, 3.5, 22);
    corePointLight.position.set(0, 3.5, 0);
    scene.add(corePointLight);

    // 5. Shared Contact Shadow Texture (radial soft blob)
    const createContactShadowTexture = () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
        g.addColorStop(0, 'rgba(0,0,0,0.65)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
      }
      return new THREE.CanvasTexture(c);
    };
    const shadowTex = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });

    // 6. Tactical Arena Floor & Hex Perimeter Ring
    const arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const floorGeo = new THREE.CylinderGeometry(26, 28, 0.8, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b1325,
      roughness: 0.78,
      metalness: 0.22,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.4;
    floorMesh.receiveShadow = !isSoftwareGl;
    arenaGroup.add(floorMesh);

    const gridHelper = new THREE.GridHelper(44, 22, 0x1e3a8a, 0x172554);
    gridHelper.position.y = 0.02;
    arenaGroup.add(gridHelper);

    const outerRingGeo = new THREE.TorusGeometry(19.5, 0.16, 12, 64);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.8,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 2;
    outerRing.position.y = 0.08;
    arenaGroup.add(outerRing);

    // 7. Composite Central Bio-Core Helix Vault (7 Sub-Parts)
    const bioCoreGroup = new THREE.Group();
    scene.add(bioCoreGroup);

    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.85,
    });
    const pedestalBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.1, 0.7, 8), pedestalMat);
    pedestalBase.position.y = 0.35;
    bioCoreGroup.add(pedestalBase);

    const pedestalStep = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.3, 0.5, 8), pedestalMat);
    pedestalStep.position.y = 0.95;
    bioCoreGroup.add(pedestalStep);

    const helixCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x0891b2,
      emissiveIntensity: 1.4,
      roughness: 0.18,
      metalness: 0.35,
    });
    const centralCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.25, 1), helixCrystalMat);
    centralCrystal.position.y = 2.8;
    bioCoreGroup.add(centralCrystal);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x818cf8,
      emissive: 0x4f46e5,
      emissiveIntensity: 0.7,
      roughness: 0.25,
      metalness: 0.9,
    });
    const gyroRing1 = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.08, 12, 48), ringMat);
    gyroRing1.position.y = 2.8;
    bioCoreGroup.add(gyroRing1);

    const gyroRing2 = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.07, 12, 48), ringMat);
    gyroRing2.position.y = 2.8;
    gyroRing2.rotation.x = Math.PI / 3;
    bioCoreGroup.add(gyroRing2);

    const crownSpire = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 6), pedestalMat);
    crownSpire.position.y = 4.9;
    bioCoreGroup.add(crownSpire);

    // 8. Composite Player Sentinel Mech (8 Sub-Parts, Ground Pivot y=0)
    const createPlayerSentinel = () => {
      const group = new THREE.Group();

      // Contact shadow
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.03;
      group.add(shadow);

      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.28,
        metalness: 0.78,
      });
      const darkChassisMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.5,
        metalness: 0.85,
      });
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.5,
        roughness: 0.15,
      });

      // 1. Hover Skirt Ring
      const hoverRing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.35, 12), darkChassisMat);
      hoverRing.position.y = 0.3;
      group.add(hoverRing);

      // 2. Main Torso Hull
      const torso = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.9, 1.25), armorMat);
      torso.position.y = 0.9;
      group.add(torso);

      // 3. Forward Cockpit Visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.34, 0.4), visorMat);
      visor.position.set(0, 1.02, -0.52);
      group.add(visor);

      // 4 & 5. Twin Plasma Cannon Barrels
      const barrelGeo = new THREE.CylinderGeometry(0.11, 0.14, 1.2, 10);
      barrelGeo.rotateX(Math.PI / 2);
      const leftBarrel = new THREE.Mesh(barrelGeo, darkChassisMat);
      leftBarrel.position.set(-0.75, 0.95, -0.45);
      group.add(leftBarrel);

      const rightBarrel = new THREE.Mesh(barrelGeo, darkChassisMat);
      rightBarrel.position.set(0.75, 0.95, -0.45);
      group.add(rightBarrel);

      // 6 & 7. Twin Thruster Nacelles
      const nacelleGeo = new THREE.BoxGeometry(0.32, 0.42, 0.95);
      const leftNacelle = new THREE.Mesh(nacelleGeo, armorMat);
      leftNacelle.position.set(-0.75, 0.65, 0.2);
      group.add(leftNacelle);

      const rightNacelle = new THREE.Mesh(nacelleGeo, armorMat);
      rightNacelle.position.set(0.75, 0.65, 0.2);
      group.add(rightNacelle);

      // 8. Dorsal Telemetry Fin
      const dorsalFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.7), visorMat);
      dorsalFin.position.set(0, 1.5, 0.15);
      group.add(dorsalFin);

      return group;
    };

    const playerGroup = createPlayerSentinel();
    playerGroup.position.set(0, 0, 7.5);
    scene.add(playerGroup);

    // 9. Composite Hostile Archetype Builders (3 Distinct Silhouettes & Policies)
    const createEnemyComposite = (archetype: EnemyArchetype) => {
      const group = new THREE.Group();

      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.03;
      group.add(shadow);

      if (archetype === 'swarm') {
        // Swarm Interceptor: Crimson sleek delta-wing striker (4 sub-parts)
        const hullMat = new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          roughness: 0.32,
          metalness: 0.72,
        });
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0xffb4c4,
          emissive: 0xe11d48,
          emissiveIntensity: 0.9,
          roughness: 0.2,
        });

        const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.35, 6), hullMat);
        nose.rotation.x = -Math.PI / 2;
        nose.position.y = 0.75;
        group.add(nose);

        const wings = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.14, 0.7), hullMat);
        wings.position.set(0, 0.75, 0.15);
        group.add(wings);

        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.6), hullMat);
        fin.position.set(0, 1.0, 0.25);
        group.add(fin);

        const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), coreMat);
        core.position.set(0, 0.8, -0.1);
        group.add(core);

        return { group, coreMesh: core, coreMaterial: coreMat };
      }

      if (archetype === 'weaver') {
        // Orbital Strafe Weaver: Amber tri-ring synth orbiter (5 sub-parts)
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          roughness: 0.28,
          metalness: 0.82,
        });
        const coreMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xd97706,
          emissiveIntensity: 1.0,
          roughness: 0.2,
        });

        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 0), coreMat);
        core.position.y = 0.95;
        group.add(core);

        const arm1 = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.16, 0.22), frameMat);
        arm1.position.y = 0.95;
        group.add(arm1);

        const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 1.75), frameMat);
        arm2.position.y = 0.95;
        group.add(arm2);

        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.08, 8, 24), frameMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.95;
        group.add(halo);

        return { group, coreMesh: core, coreMaterial: coreMat };
      }

      // Siege Juggernaut: Violet heavy armored 6-part goliath
      const heavyArmorMat = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        roughness: 0.42,
        metalness: 0.85,
      });
      const darkTreadMat = new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        roughness: 0.6,
        metalness: 0.7,
      });
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xe9d5ff,
        emissive: 0x9333ea,
        emissiveIntensity: 1.1,
        roughness: 0.2,
      });

      const leftTread = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.65), darkTreadMat);
      leftTread.position.set(-0.75, 0.28, 0);
      group.add(leftTread);

      const rightTread = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.65), darkTreadMat);
      rightTread.position.set(0.75, 0.28, 0);
      group.add(rightTread);

      const carapace = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 1.45), heavyArmorMat);
      carapace.position.set(0, 0.95, 0);
      group.add(carapace);

      const core = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 14), coreMat);
      core.position.set(0, 1.05, -0.58);
      group.add(core);

      const shoulderLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.9, 8), heavyArmorMat);
      shoulderLeft.position.set(-0.85, 1.55, 0.15);
      group.add(shoulderLeft);

      const shoulderRight = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.9, 8), heavyArmorMat);
      shoulderRight.position.set(0.85, 1.55, 0.15);
      group.add(shoulderRight);

      return { group, coreMesh: core, coreMaterial: coreMat };
    };

    // 10. Pooled InstancedMesh Particle Burst System (120 instances, zero GC churn)
    const PARTICLE_POOL_SIZE = 120;
    const particleGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const particleInstanced = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_POOL_SIZE);
    particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(particleInstanced);

    const dummyObj = new THREE.Object3D();
    const particleSlots: ParticleSlot[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      position: new THREE.Vector3(0, -100, 0),
      velocity: new THREE.Vector3(),
      color: new THREE.Color(0x38bdf8),
      scale: 0,
      age: 0,
      maxAge: 0.45,
    }));

    const spawnParticleBurst = (origin: THREE.Vector3, hexColor: number, count = 14) => {
      let spawned = 0;
      for (let i = 0; i < PARTICLE_POOL_SIZE && spawned < count; i++) {
        const slot = particleSlots[i];
        if (!slot.active) {
          slot.active = true;
          slot.position.copy(origin);
          const theta = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 8;
          slot.velocity.set(
            Math.cos(theta) * speed,
            2 + Math.random() * 5,
            Math.sin(theta) * speed
          );
          slot.color.setHex(hexColor);
          slot.scale = 0.8 + Math.random() * 0.7;
          slot.age = 0;
          slot.maxAge = 0.35 + Math.random() * 0.25;
          particleInstanced.setColorAt(i, slot.color);
          spawned++;
        }
      }
      if (particleInstanced.instanceColor) {
        particleInstanced.instanceColor.needsUpdate = true;
      }
    };

    // 11. Runtime Simulation State
    const enemies: EnemyEntity[] = [];
    const projectiles: ProjectileEntity[] = [];
    const projGeo = new THREE.SphereGeometry(0.22, 10, 10);
    const playerProjMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const enemyProjMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    let nextEnemyId = 1;
    let currentWave = 1;
    let currentScore = 0;
    let currentCoreHp = 100;
    let currentEmp = 100;
    let totalKills = 0;
    let fireCooldown = 0;
    let hitstopTimer = 0;
    let cameraTrauma = 0;
    let pointerWorld = new THREE.Vector3(0, 0, 0);

    const keysPressed: Record<string, boolean> = {};

    const clearEntities = () => {
      enemies.forEach(e => scene.remove(e.group));
      enemies.length = 0;
      projectiles.forEach(p => scene.remove(p.mesh));
      projectiles.length = 0;
    };

    const spawnWaveHostiles = (waveNum: number) => {
      const profile = computeWaveThreatProfile(waveNum);
      const spawnArchetype = (arch: EnemyArchetype, idx: number, total: number) => {
        const angle = (idx / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
        const radius = 17.5 + Math.random() * 3.0;
        const { group, coreMesh, coreMaterial } = createEnemyComposite(arch);
        group.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        group.lookAt(0, 0, 0);
        scene.add(group);

        const baseHp = arch === 'juggernaut' ? 75 : arch === 'weaver' ? 40 : 25;
        const baseSpeed = arch === 'swarm' ? 3.8 : arch === 'weaver' ? 2.6 : 1.55;

        enemies.push({
          id: nextEnemyId++,
          archetype: arch,
          group,
          coreMesh,
          coreMaterial,
          hp: baseHp * (1 + (waveNum - 1) * 0.12),
          maxHp: baseHp * (1 + (waveNum - 1) * 0.12),
          speed: baseSpeed * profile.speedMultiplier,
          windupTimer: 0,
          isWindingUp: false,
          orbitPhase: Math.random() * Math.PI * 2,
          hitFlashTimer: 0,
        });
      };

      let cursor = 0;
      for (let i = 0; i < profile.swarmCount; i++) {
        spawnArchetype('swarm', cursor++, profile.totalHostiles);
      }
      for (let i = 0; i < profile.strafeWeaverCount; i++) {
        spawnArchetype('weaver', cursor++, profile.totalHostiles);
      }
      for (let i = 0; i < profile.juggernautCount; i++) {
        spawnArchetype('juggernaut', cursor++, profile.totalHostiles);
      }

      setHostilesRemaining(enemies.length);
    };

    const firePlayerCannon = () => {
      if (fireCooldown > 0) return;
      fireCooldown = 0.16;
      playSynthSound('laser');

      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(playerGroup.quaternion).normalize();
      const spawnPos = playerGroup.position.clone().add(new THREE.Vector3(0, 0.95, 0)).addScaledVector(dir, 1.2);

      const mesh = new THREE.Mesh(projGeo, playerProjMat);
      mesh.position.copy(spawnPos);
      scene.add(mesh);

      projectiles.push({
        mesh,
        position: spawnPos,
        velocity: dir.multiplyScalar(28),
        isEnemy: false,
        life: 1.4,
      });
    };

    const triggerEmpNova = () => {
      if (currentEmp < 100 || gameStateRef.current !== 'playing') return;
      currentEmp = 0;
      setEmpCharge(0);
      cameraTrauma = Math.min(1, cameraTrauma + 0.65);
      playSynthSound('emp');
      spawnParticleBurst(playerGroup.position.clone().setY(1), 0x22d3ee, 36);

      for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.hp -= 45;
        enemy.hitFlashTimer = 0.18;
        spawnParticleBurst(enemy.group.position.clone().setY(1), 0x38bdf8, 8);
        if (enemy.hp <= 0) {
          scene.remove(enemy.group);
          enemies.splice(i, 1);
          totalKills += 1;
          currentScore += enemy.archetype === 'juggernaut' ? 180 : 90;
        }
      }
      setScore(currentScore);
      setEnemiesNeutralized(totalKills);
      setHostilesRemaining(enemies.length);
    };

    const startNewGameRun = () => {
      clearEntities();
      currentWave = 1;
      currentScore = 0;
      currentCoreHp = 100;
      currentEmp = 100;
      totalKills = 0;
      playerGroup.position.set(0, 0, 7.5);
      playerGroup.rotation.set(0, 0, 0);

      setWave(1);
      setScore(0);
      setCoreIntegrity(100);
      setEmpCharge(100);
      setEnemiesNeutralized(0);
      setVictoryAchieved(false);

      spawnWaveHostiles(1);
      setGameState('playing');
    };

    triggerStartRunRef.current = startNewGameRun;
    triggerEmpRef.current = triggerEmpNova;

    // Seed initial preview wave for title screen camera orbit
    spawnWaveHostiles(1);

    // 12. Input Listeners (Keyboard + Pointer Raycast Aiming)
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      keysPressed[code] = true;

      if (code === 'KeyP' || code === 'Escape') {
        if (gameStateRef.current === 'playing') {
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          setGameState('playing');
        }
      } else if (code === 'KeyE') {
        triggerEmpNova();
      } else if (code === 'Space' && gameStateRef.current === 'playing') {
        e.preventDefault();
        firePlayerCannon();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.code] = false;
    };

    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const pointerNdc = new THREE.Vector2();

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      raycaster.ray.intersectPlane(groundPlane, pointerWorld);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 && gameStateRef.current === 'playing') {
        firePlayerCannon();
      }
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', onResize);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // 13. Software-GL Resilient Frame Pacing Loop
    let disposed = false;
    let rafId = 0;
    const pixelFence = new Uint8Array(4);
    let lastTime = performance.now();

    const afterDraw = (cb: (now: number) => void) => {
      if (isSoftwareGl) {
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelFence);
      }
      rafId = requestAnimationFrame(cb);
    };

    const tick = (now: number) => {
      if (disposed) return;
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      // Animate Bio-Core Vault rings continuously
      centralCrystal.rotation.y += dt * 1.1;
      centralCrystal.position.y = 2.8 + Math.sin(now * 0.003) * 0.18;
      gyroRing1.rotation.z += dt * 0.9;
      gyroRing1.rotation.x += dt * 0.5;
      gyroRing2.rotation.y -= dt * 1.2;

      if (gameStateRef.current === 'title') {
        // Orbit camera slowly around the live 3D Bio-Core arena during Title Screen
        const orbitAngle = now * 0.00035;
        camera.position.set(Math.sin(orbitAngle) * 23, 18.5, Math.cos(orbitAngle) * 23);
        camera.lookAt(0, 1.5, 0);
        renderer.render(scene, camera);
        afterDraw(tick);
        return;
      }

      if (gameStateRef.current !== 'playing') {
        renderer.render(scene, camera);
        afterDraw(tick);
        return;
      }

      // Hitstop freeze on heavy impacts
      if (hitstopTimer > 0) {
        hitstopTimer -= dt;
        renderer.render(scene, camera);
        afterDraw(tick);
        return;
      }

      fireCooldown = Math.max(0, fireCooldown - dt);
      if (currentEmp < 100) {
        currentEmp = Math.min(100, currentEmp + dt * 11);
        setEmpCharge(Math.round(currentEmp));
      }

      // Player Movement (WASD / Arrow Keys)
      const moveVec = new THREE.Vector3();
      if (keysPressed['KeyW'] || keysPressed['ArrowUp']) moveVec.z -= 1;
      if (keysPressed['KeyS'] || keysPressed['ArrowDown']) moveVec.z += 1;
      if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) moveVec.x -= 1;
      if (keysPressed['KeyD'] || keysPressed['ArrowRight']) moveVec.x += 1;

      if (moveVec.lengthSq() > 0) {
        moveVec.normalize().multiplyScalar(10.5 * dt);
        playerGroup.position.add(moveVec);
      }

      // Clamp player within arena perimeter (and outside central pedestal)
      const distFromCenter = Math.hypot(playerGroup.position.x, playerGroup.position.z);
      if (distFromCenter > 18.0) {
        playerGroup.position.multiplyScalar(18.0 / distFromCenter);
      } else if (distFromCenter < 3.6) {
        if (distFromCenter < 0.01) playerGroup.position.set(0, 0, 3.6);
        else playerGroup.position.multiplyScalar(3.6 / distFromCenter);
      }

      // Aim player Sentinel toward pointer world position or nearest enemy
      if (pointerWorld.lengthSq() > 0.1) {
        playerGroup.lookAt(pointerWorld.x, 0, pointerWorld.z);
      } else if (enemies.length > 0) {
        const nearest = enemies[0].group.position;
        playerGroup.lookAt(nearest.x, 0, nearest.z);
      }

      // Auto-fire assist when holding Space
      if (keysPressed['Space']) {
        firePlayerCannon();
      }

      // Update Projectiles
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.life -= dt;
        p.position.addScaledVector(p.velocity, dt);
        p.mesh.position.copy(p.position);

        if (p.life <= 0) {
          scene.remove(p.mesh);
          projectiles.splice(i, 1);
          continue;
        }

        if (p.isEnemy) {
          // Check hit against Bio-Core or Player
          const distCore = Math.hypot(p.position.x, p.position.z);
          const distPlayer = Math.hypot(
            p.position.x - playerGroup.position.x,
            p.position.z - playerGroup.position.z
          );
          if (distCore < 2.2 || distPlayer < 1.25) {
            currentCoreHp = Math.max(0, currentCoreHp - 5);
            setCoreIntegrity(currentCoreHp);
            cameraTrauma = Math.min(1, cameraTrauma + 0.25);
            spawnParticleBurst(p.position, 0xf59e0b, 10);
            scene.remove(p.mesh);
            projectiles.splice(i, 1);
          }
          continue;
        }

        // Player projectile vs Enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const hitRadius = e.archetype === 'juggernaut' ? 1.55 : 1.15;
          const dist = Math.hypot(
            p.position.x - e.group.position.x,
            p.position.z - e.group.position.z
          );
          if (dist < hitRadius) {
            e.hp -= 25;
            e.hitFlashTimer = 0.12;
            playSynthSound('hit');
            spawnParticleBurst(p.position, 0x38bdf8, 9);
            scene.remove(p.mesh);
            projectiles.splice(i, 1);

            if (e.hp <= 0) {
              const burstColor =
                e.archetype === 'juggernaut'
                  ? 0xa855f7
                  : e.archetype === 'weaver'
                  ? 0xf59e0b
                  : 0xf43f5e;
              spawnParticleBurst(e.group.position.clone().setY(1), burstColor, 20);
              scene.remove(e.group);
              enemies.splice(j, 1);

              if (e.archetype === 'juggernaut') {
                hitstopTimer = 0.045;
                cameraTrauma = Math.min(1, cameraTrauma + 0.4);
              } else {
                cameraTrauma = Math.min(1, cameraTrauma + 0.16);
              }

              totalKills += 1;
              const pts =
                e.archetype === 'juggernaut' ? 200 : e.archetype === 'weaver' ? 120 : 75;
              currentScore += pts;
              setScore(currentScore);
              setEnemiesNeutralized(totalKills);
              setHostilesRemaining(enemies.length);
            }
            break;
          }
        }
      }

      // Update Enemies (3 Distinct Policies + 350ms Windup Telegraphs)
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const pos = e.group.position;
        const distToCore = Math.hypot(pos.x, pos.z);
        const dirToCore = new THREE.Vector3(-pos.x, 0, -pos.z).normalize();

        // Hit flash feedback
        if (e.hitFlashTimer > 0) {
          e.hitFlashTimer -= dt;
          e.coreMaterial.emissiveIntensity = 3.2;
        } else if (!e.isWindingUp) {
          e.coreMaterial.emissiveIntensity = 1.0;
        }

        if (e.archetype === 'swarm') {
          // Policy 1: Fast direct pursuit + 350ms high-emissive lunge telegraph near Bio-Core
          if (distToCore > 3.4) {
            pos.addScaledVector(dirToCore, e.speed * dt);
            e.group.lookAt(0, 0, 0);
          } else {
            e.isWindingUp = true;
            e.windupTimer += dt;
            e.coreMaterial.emissiveIntensity = 2.8 + Math.sin(now * 0.04) * 1.2;
            e.coreMesh.scale.setScalar(1.0 + e.windupTimer * 1.4);
            if (e.windupTimer >= 0.35) {
              currentCoreHp = Math.max(0, currentCoreHp - 8);
              setCoreIntegrity(currentCoreHp);
              cameraTrauma = Math.min(1, cameraTrauma + 0.32);
              spawnParticleBurst(pos.clone().setY(0.8), 0xf43f5e, 16);
              scene.remove(e.group);
              enemies.splice(i, 1);
              setHostilesRemaining(enemies.length);
            }
          }
        } else if (e.archetype === 'weaver') {
          // Policy 2: Sinusoidal lateral orbit + 350ms ranged plasma bolt windup telegraph
          e.orbitPhase += dt * 2.2;
          const tangent = new THREE.Vector3(-dirToCore.z, 0, dirToCore.x);
          const radialSpeed = distToCore > 9.5 ? e.speed : 0.2;
          pos.addScaledVector(dirToCore, radialSpeed * dt);
          pos.addScaledVector(tangent, Math.sin(e.orbitPhase) * e.speed * 0.9 * dt);
          e.group.lookAt(0, 0, 0);

          e.windupTimer += dt;
          if (e.windupTimer >= 2.45) {
            // 350ms bright telegraph before firing at Bio-Core
            e.isWindingUp = true;
            e.coreMaterial.emissiveIntensity = 3.4;
            e.coreMesh.scale.setScalar(1.35);
          }
          if (e.windupTimer >= 2.8) {
            e.windupTimer = 0;
            e.isWindingUp = false;
            e.coreMesh.scale.setScalar(1.0);

            const boltSpawn = pos.clone().setY(0.95);
            const boltMesh = new THREE.Mesh(projGeo, enemyProjMat);
            boltMesh.position.copy(boltSpawn);
            scene.add(boltMesh);
            projectiles.push({
              mesh: boltMesh,
              position: boltSpawn,
              velocity: dirToCore.clone().multiplyScalar(11.5),
              isEnemy: true,
              life: 2.2,
            });
          }
        } else {
          // Policy 3: Siege Juggernaut heavy advance + 350ms shockwave slam windup
          if (distToCore > 4.2) {
            pos.addScaledVector(dirToCore, e.speed * dt);
            e.group.lookAt(0, 0, 0);
          } else {
            e.isWindingUp = true;
            e.windupTimer += dt;
            e.coreMaterial.emissiveIntensity = 3.5;
            e.coreMesh.scale.setScalar(1.25);
            if (e.windupTimer >= 0.35) {
              e.windupTimer = -1.2; // cooldown before next slam
              e.isWindingUp = false;
              e.coreMesh.scale.setScalar(1.0);
              currentCoreHp = Math.max(0, currentCoreHp - 14);
              setCoreIntegrity(currentCoreHp);
              cameraTrauma = Math.min(1, cameraTrauma + 0.5);
              spawnParticleBurst(pos.clone().setY(0.5), 0xa855f7, 22);
            }
          }
        }
      }

      // Check Wave Clear / Victory Condition
      if (enemies.length === 0 && currentCoreHp > 0) {
        const waveBonus = computeWaveThreatProfile(currentWave).waveClearBonus;
        currentScore += waveBonus;
        setScore(currentScore);
        playSynthSound('wave');

        if (currentWave >= 5) {
          setVictoryAchieved(true);
          if (currentScore > highScore) {
            setHighScore(currentScore);
            try {
              localStorage.setItem('novaguard_high_score', String(currentScore));
            } catch {}
          }
          onSaveGameScore({
            playerName: playerName || 'Commander',
            score: currentScore,
            waveReached: currentWave,
            enemiesNeutralized: totalKills,
            bioCoresProtected: currentCoreHp,
          });
          setGameState('gameover');
        } else {
          currentWave += 1;
          setWave(currentWave);
          spawnWaveHostiles(currentWave);
        }
      }

      // Check Defeat Condition
      if (currentCoreHp <= 0) {
        playSynthSound('gameover');
        setVictoryAchieved(false);
        if (currentScore > highScore) {
          setHighScore(currentScore);
          try {
            localStorage.setItem('novaguard_high_score', String(currentScore));
          } catch {}
        }
        onSaveGameScore({
          playerName: playerName || 'Commander',
          score: currentScore,
          waveReached: currentWave,
          enemiesNeutralized: totalKills,
          bioCoresProtected: 0,
        });
        setGameState('gameover');
      }

      // Update Pooled InstancedMesh Particles
      let anyParticleUpdated = false;
      for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
        const slot = particleSlots[i];
        if (!slot.active) {
          dummyObj.position.set(0, -100, 0);
          dummyObj.scale.setScalar(0);
          dummyObj.updateMatrix();
          particleInstanced.setMatrixAt(i, dummyObj.matrix);
          continue;
        }
        anyParticleUpdated = true;
        slot.age += dt;
        if (slot.age >= slot.maxAge) {
          slot.active = false;
          dummyObj.position.set(0, -100, 0);
          dummyObj.scale.setScalar(0);
        } else {
          slot.position.addScaledVector(slot.velocity, dt);
          slot.velocity.y -= 9.8 * dt;
          const lifeRatio = 1 - slot.age / slot.maxAge;
          dummyObj.position.copy(slot.position);
          dummyObj.scale.setScalar(slot.scale * lifeRatio);
        }
        dummyObj.updateMatrix();
        particleInstanced.setMatrixAt(i, dummyObj.matrix);
      }
      if (anyParticleUpdated) {
        particleInstanced.instanceMatrix.needsUpdate = true;
      }

      // Smooth Camera Follow + Decaying Trauma² Shake
      cameraTrauma = Math.max(0, cameraTrauma - dt * 1.8);
      const shakeMag = cameraTrauma * cameraTrauma * 0.65;
      const shakeX = (Math.random() - 0.5) * 2 * shakeMag;
      const shakeY = (Math.random() - 0.5) * 2 * shakeMag;

      const targetCamX = playerGroup.position.x * 0.35 + shakeX;
      const targetCamZ = 22.5 + playerGroup.position.z * 0.25;
      camera.position.x += (targetCamX - camera.position.x) * Math.min(1, dt * 6);
      camera.position.y = 20.5 + shakeY;
      camera.position.z += (targetCamZ - camera.position.z) * Math.min(1, dt * 6);
      camera.lookAt(playerGroup.position.x * 0.2, 0.8, playerGroup.position.z * 0.2);

      renderer.render(scene, camera);
      afterDraw(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      envTex.dispose();
      shadowTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      projGeo.dispose();
      renderer.dispose();
    };
  }, [isOpen, playSynthSound, highScore, onSaveGameScore, playerName]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none bg-[#070b16]"
      role="dialog"
      aria-label="NovaGuard 3D Bio-Core Defense"
    >
      {/* Full-Viewport 100vw x 100vh Three.js Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* STATE 1: Bespoke Title Screen Overlay over Live 3D World */}
      {gameState === 'title' && (
        <div
          data-title-overlay="true"
          className="fixed inset-0 z-20 flex flex-col items-center justify-between p-6 sm:p-10 bg-[#060a14]/55 backdrop-blur-md"
        >
          {/* Top Bar: Exit to NovaDeploy Platform & Audio Toggle */}
          <div className="w-full max-w-6xl flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Return to NovaDeploy Cloud</span>
            </button>

            <button
              type="button"
              onClick={() => setMuted(m => !m)}
              aria-label="Toggle Sound"
              className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>
          </div>

          {/* Centerpiece Bespoke SVG Emblem & Typographic Lockup */}
          <div className="max-w-xl w-full text-center space-y-6 my-auto">
            <div className="mx-auto w-24 h-24 flex items-center justify-center">
              <svg
                viewBox="0 0 120 120"
                className="w-24 h-24 drop-shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="novaCoreGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22D3EE" />
                    <stop offset="50%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                <polygon
                  points="60,6 108,33 108,87 60,114 12,87 12,33"
                  stroke="url(#novaCoreGrad)"
                  strokeWidth="4"
                  fill="rgba(15, 23, 42, 0.78)"
                />
                <polygon
                  points="60,20 95,40 95,80 60,100 25,80 25,40"
                  stroke="#38BDF8"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  fill="none"
                />
                <path
                  d="M60 32 L78 60 L60 88 L42 60 Z"
                  fill="url(#novaCoreGrad)"
                />
                <circle cx="60" cy="60" r="7" fill="#F8FAFC" />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-[0.28em] text-cyan-300 font-semibold">
                Three.js Tactical DeSci Simulation
              </div>
              <h1 className="text-4xl sm:text-6xl font-heading font-extrabold tracking-tight text-white drop-shadow-lg">
                NOVAGUARD <span className="text-cyan-400">3D</span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto">
                Pilot the Sentinel Mech to defend the AlphaFold Bio-Core Vault against Swarm Interceptors, Orbital Weavers, and Siege Juggernauts.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                data-start="true"
                onClick={() => triggerStartRunRef.current()}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-indigo-500 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-heading font-extrabold text-base tracking-wide uppercase shadow-xl shadow-cyan-500/25 transition-transform active:scale-95 cursor-pointer flex items-center gap-2.5"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>Launch Defense Protocol</span>
              </button>
            </div>

            {/* Compact Keycap Controls Legend */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">WASD</kbd>
                <span>Move Sentinel</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">CLICK / SPACE</kbd>
                <span>Plasma Cannon</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono font-bold">E</kbd>
                <span>EMP Shockwave</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">P</kbd>
                <span>Pause</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar: High Score & Firestore Leaderboard Preview */}
          <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300 bg-slate-950/75 border border-slate-800/80 rounded-2xl px-5 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Personal Record:</span>
              <span className="font-mono font-bold text-white">{highScore.toLocaleString()} PTS</span>
            </div>
            <div className="flex items-center gap-4 font-mono">
              {leaderboard.slice(0, 2).map((entry, idx) => (
                <span key={entry.id} className="text-slate-300">
                  #{idx + 1} {entry.playerName}: <strong className="text-cyan-300">{entry.score.toLocaleString()}</strong>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: Minimalist Playing HUD (<12% Viewport Area, pointer-events-none root) */}
      {gameState === 'playing' && (
        <div
          data-hud="true"
          className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5"
        >
          {/* Top HUD Cluster */}
          <div className="w-full flex items-start justify-between gap-4">
            {/* Top-Left: Bio-Core Vault Integrity & EMP Capacitor */}
            <div className="bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-xl p-3 w-56 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Bio-Core Vault</span>
                </span>
                <span className="font-mono font-bold text-white tabular-nums">{coreIntegrity}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    coreIntegrity > 50
                      ? 'bg-emerald-400'
                      : coreIntegrity > 25
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${coreIntegrity}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="text-indigo-300 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>EMP Nova [E]</span>
                </span>
                <span className="font-mono text-slate-300 tabular-nums">{empCharge}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-150"
                  style={{ width: `${empCharge}%` }}
                />
              </div>
            </div>

            {/* Top-Center: Wave & Hostiles Counter */}
            <div className="bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-xl px-4 py-2.5 text-center">
              <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                WAVE {wave} OF 5
              </div>
              <div className="text-xs text-slate-300 font-mono tabular-nums mt-0.5 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                <span>Hostiles Active: {hostilesRemaining}</span>
              </div>
            </div>

            {/* Top-Right: Score & Interactive Controls (pointer-events-auto) */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="bg-slate-950/75 backdrop-blur-md border border-slate-800/80 rounded-xl px-3.5 py-2 text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                  Tactical Score
                </span>
                <span className="text-base font-mono font-bold text-white tabular-nums">
                  {score.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={() => triggerEmpRef.current()}
                disabled={empCharge < 100}
                title="Trigger EMP Shockwave (Key E)"
                className={`px-3 py-2.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                  empCharge >= 100
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 hover:bg-cyan-500/30'
                    : 'bg-slate-950/70 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                EMP
              </button>

              <button
                type="button"
                onClick={() => setMuted(m => !m)}
                aria-label="Mute Audio"
                className="p-2.5 rounded-xl bg-slate-950/75 hover:bg-slate-900 border border-slate-800 text-slate-200 cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>

              <button
                type="button"
                onClick={() => setGameState('paused')}
                aria-label="Pause Game"
                className="p-2.5 rounded-xl bg-slate-950/75 hover:bg-slate-900 border border-slate-800 text-slate-200 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-xl bg-slate-950/75 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 3: Pause Modal */}
      {gameState === 'paused' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#060a14]/70 backdrop-blur-md p-6">
          <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-slate-800 p-6 text-center space-y-5 shadow-2xl">
            <h2 className="text-2xl font-heading font-bold text-white">Defense Protocol Paused</h2>
            <p className="text-xs text-slate-400">
              Wave {wave} · Score: {score.toLocaleString()} · Bio-Core Integrity: {coreIntegrity}%
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setGameState('playing')}
                className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Resume Mission</span>
              </button>
              <button
                type="button"
                onClick={() => triggerStartRunRef.current()}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Run</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Exit to NovaDeploy Platform
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 4: Victory / Game Over Modal with Live Firestore Leaderboard */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#060a14]/80 backdrop-blur-md p-6">
          <div className="max-w-lg w-full rounded-3xl bg-slate-950 border border-slate-800 p-7 text-center space-y-6 shadow-2xl">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{victoryAchieved ? 'ALL 5 WAVES CLEARED' : 'BIO-CORE BREACHED'}</span>
              </div>
              <h2 className="text-3xl font-heading font-extrabold text-white">
                {victoryAchieved ? 'Bio-Core Vault Secured!' : 'Defense Protocol Terminated'}
              </h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Final Score</span>
                <span className="text-lg font-mono font-bold text-cyan-300 tabular-nums">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Wave Reached</span>
                <span className="text-lg font-mono font-bold text-white tabular-nums">
                  Wave {wave}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Neutralized</span>
                <span className="text-lg font-mono font-bold text-emerald-400 tabular-nums">
                  {enemiesNeutralized}
                </span>
              </div>
            </div>

            {/* Global Firestore Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="text-left bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cloud Firestore Top Defenders</span>
                  </span>
                  <span className="font-mono text-[11px]">Synced</span>
                </div>
                <div className="space-y-1.5">
                  {leaderboard.slice(0, 3).map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs font-mono py-1 border-b border-slate-800/60 last:border-none"
                    >
                      <span className="text-slate-300">
                        #{idx + 1} {item.playerName} (Wave {item.waveReached})
                      </span>
                      <span className="font-bold text-cyan-300">{item.score.toLocaleString()} PTS</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => triggerStartRunRef.current()}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-950 font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm cursor-pointer"
              >
                Return to Platform
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
