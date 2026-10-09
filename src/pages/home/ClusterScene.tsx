import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORS } from '@/lib/palette';

/**
 * The cluster — the site's only 3D scene (design.md §6, home.md §1).
 * ~36 pizza-box nodes in 4 loose rack-rows receding in depth, thin edges,
 * green/amber packets at constant speed, slow camera drift + cursor
 * parallax, one node blinks red every ~12s, fog fades back rows into bg-0.
 */

const ROWS = 4;
const COLS = 9;
const NODE_COUNT = ROWS * COLS;

interface Packet {
  from: number;
  to: number;
  dist: number;
  t: number;
  speed: number;
  color: string;
}

type BlinkRef = { current: { idx: number; start: number } };

/** Deterministic PRNG — stable particle layouts across renders. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildGraph() {
  const positions: THREE.Vector3[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = (c - (COLS - 1) / 2) * 1.55 + (r % 2 ? 0.4 : -0.15) + Math.sin(r * 7 + c * 3) * 0.12;
      const y = Math.sin(r * 5.1 + c * 1.7) * 0.55 - r * 0.12;
      const z = -r * 3.4 + Math.cos(c * 2.3 + r) * 0.3;
      positions.push(new THREE.Vector3(x, y, z));
    }
  }
  const edges: Array<[number, number]> = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (c < COLS - 1) edges.push([i, i + 1]); // along the row
      if (r < ROWS - 1) edges.push([i, i + COLS]); // to the row behind
    }
  }
  // adjacency for packet routing
  const adj: number[][] = Array.from({ length: NODE_COUNT }, () => []);
  edges.forEach(([a, b]) => {
    adj[a].push(b);
    adj[b].push(a);
  });
  return { positions, edges, adj };
}

function Nodes({ positions, blinkRef }: { positions: THREE.Vector3[]; blinkRef: BlinkRef }) {
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);
  const geo = useMemo(() => new THREE.BoxGeometry(0.62, 0.16, 0.9), []);
  const baseMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: COLORS.bg2,
        emissive: COLORS.signalGreen,
        emissiveIntensity: 0.08,
        roughness: 0.9,
        metalness: 0.1,
      }),
    [],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const { idx, start } = blinkRef.current;
    meshRefs.current.forEach((m, i) => {
      if (!m) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      if (i === idx) {
        const dt = t - start;
        if (dt < 0.9) {
          // 3 pulses x 300ms
          const phase = (dt % 0.3) / 0.3;
          const on = phase < 0.5;
          mat.emissive.set(on ? COLORS.signalRed : COLORS.signalGreen);
          mat.emissiveIntensity = on ? 1.6 : 0.08;
        } else {
          mat.emissive.set(COLORS.signalGreen);
          mat.emissiveIntensity = 0.08;
        }
      }
    });
  });

  return (
    <group>
      {positions.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshRefs.current[i] = m;
          }}
          position={p}
          geometry={geo}
          material={baseMat.clone()}
        />
      ))}
    </group>
  );
}

function Edges({ positions, edges }: { positions: THREE.Vector3[]; edges: Array<[number, number]> }) {
  const geo = useMemo(() => {
    const pts: number[] = [];
    edges.forEach(([a, b]) => {
      pts.push(positions[a].x, positions[a].y, positions[a].z);
      pts.push(positions[b].x, positions[b].y, positions[b].z);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [positions, edges]);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color={COLORS.line} transparent opacity={0.75} />
    </lineSegments>
  );
}

function Packets({ positions, adj, reduced }: { positions: THREE.Vector3[]; adj: number[][]; reduced: boolean }) {
  const packets = useMemo(() => {
    const rng = mulberry32(0xc0ffee);
    const rnd = (n: number) => Math.floor(rng() * n);
    const list: Packet[] = [];
    for (let i = 0; i < 13; i++) {
      const from = rnd(NODE_COUNT);
      const options = adj[from];
      const to = options[rnd(options.length)];
      list.push({
        from,
        to,
        dist: positions[from].distanceTo(positions[to]),
        t: rng(),
        speed: 0.9 + rng() * 0.8,
        color: i < 10 ? COLORS.signalGreen : COLORS.signalAmber, // 10 green, 3 amber
      });
    }
    return list;
  }, [positions, adj]);
  const meshRefs = useRef<Array<THREE.Mesh | null>>([]);

  useFrame((_, delta) => {
    if (reduced) return; // constant-speed machines halt under reduced motion
    packets.forEach((p, i) => {
      p.t += (p.speed * delta) / p.dist;
      if (p.t >= 1) {
        const options = adj[p.to].filter((n) => n !== p.from);
        const next = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : p.from;
        p.from = p.to;
        p.to = next;
        p.dist = positions[p.from].distanceTo(positions[p.to]);
        p.t = 0;
      }
      const m = meshRefs.current[i];
      if (m) m.position.lerpVectors(positions[p.from], positions[p.to], p.t);
    });
  });

  return (
    <group>
      {packets.map((p, i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshRefs.current[i] = m;
          }}
          position={positions[p.from]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={p.color} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ reduced }: { reduced: boolean }) {
  const blinkRef = useRef({ idx: -1, start: 0 });
  const nextBlink = useRef(6);
  const graph = useMemo(() => buildGraph(), []);

  useFrame(({ camera, clock, pointer }) => {
    const t = clock.getElapsedTime();
    // red-blink event every ~12s
    if (t > nextBlink.current) {
      blinkRef.current = { idx: Math.floor(Math.random() * NODE_COUNT), start: t };
      nextBlink.current = t + 12;
    }
    if (!reduced) {
      // slow drift: ±4° orbit, 40s period + cursor parallax (lerped)
      const drift = Math.sin((t / 40) * Math.PI * 2) * THREE.MathUtils.degToRad(4);
      const targetX = Math.sin(drift) * 9 + pointer.x * 0.7;
      const targetY = 2.1 + pointer.y * 0.45;
      camera.position.x += (targetX - camera.position.x) * 0.04;
      camera.position.y += (targetY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, -5);
    }
  });

  return (
    <group>
      <Nodes positions={graph.positions} blinkRef={blinkRef} />
      <Edges positions={graph.positions} edges={graph.edges} />
      <Packets positions={graph.positions} adj={graph.adj} reduced={reduced} />
    </group>
  );
}

export default function ClusterScene({ visible = true }: { visible?: boolean }) {
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  return (
    <Canvas
      frameloop={visible ? 'always' : 'never'}
      camera={{ position: [0, 2.1, 9], fov: 50, near: 0.1, far: 60 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <fog attach="fog" args={[COLORS.bg0, 7, 22]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[4, 8, 6]} intensity={0.7} color={COLORS.textHi} />
      <Rig reduced={reduced} />
    </Canvas>
  );
}
