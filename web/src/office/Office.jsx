import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { Character, Player } from './Character.jsx';
import { BubbleProjector, BubbleLayer } from './Bubbles.jsx';
import { ROOMS, DESKS, STATIONS } from './layout.js';
import { game } from '../game.js';

const GLASS = { color: '#d6e8f7', transparent: true, opacity: 0.16, roughness: 0.02, metalness: 0.3, envMapIntensity: 1.5, depthWrite: false };
const FRAME = '#3a3f4a';

/** Polished stone floor that reflects the room, like the concept renders. */
function Floor({ hq }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[15.5, 16]} />
        {hq ? (
          <MeshReflectorMaterial
            color="#aeb7c7"
            roughness={0.35}
            metalness={0.1}
            blur={[260, 80]}
            resolution={512}
            mixBlur={1}
            mixStrength={0.55}
            mirror={0.55}
            depthScale={0.6}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.2}
          />
        ) : (
          <meshStandardMaterial color="#c9ced8" roughness={0.3} metalness={0.15} />
        )}
      </mesh>
      {/* centre rug, like the concept art */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1]} receiveShadow>
        <planeGeometry args={[5.5, 7.5]} />
        <meshStandardMaterial color="#56699a" roughness={0.95} />
      </mesh>
      {/* tile lines */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={`x${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-6 + i * 2, 0.005, 0]}>
          <planeGeometry args={[0.02, 16]} />
          <meshBasicMaterial color="#b5bbc6" />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ x, z, rot = 0, w = 1.8, d = 0.8, monitor = true }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color="#f4f4f2" roughness={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(w / 2 - 0.06) * s, 0.38, 0]} castShadow>
          <boxGeometry args={[0.06, 0.76, d - 0.05]} />
          <meshStandardMaterial color="#2e323b" />
        </mesh>
      ))}
      {monitor && (
        <group position={[0, 0.81, -0.12]}>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.75, 0.45, 0.04]} />
            <meshStandardMaterial color="#2a2f38" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.32, 0.022]}>
            <planeGeometry args={[0.68, 0.38]} />
            <meshStandardMaterial color="#9fb8d9" emissive="#5b7fb0" emissiveIntensity={0.35} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.06, 0.12, 0.06]} />
            <meshStandardMaterial color="#2a2f38" />
          </mesh>
        </group>
      )}
    </group>
  );
}

function Chair({ x, z, rot = 0 }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <boxGeometry args={[0.55, 0.08, 0.55]} />
        <meshStandardMaterial color="#25282f" />
      </mesh>
      <mesh position={[0, 0.85, -0.25]} castShadow>
        <boxGeometry args={[0.55, 0.7, 0.07]} />
        <meshStandardMaterial color="#25282f" />
      </mesh>
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.42, 8]} />
        <meshStandardMaterial color="#555" />
      </mesh>
    </group>
  );
}

function GlassRoom({ room }) {
  const { x, z, w, d } = room;
  const h = 2.6;
  const doorGap = 1.4;
  const side = (w - doorGap) / 2;
  return (
    <group position={[x, 0, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#d9dce2" roughness={0.3} />
      </mesh>
      {/* side walls */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(w / 2) * s, h / 2, 0]}>
          <boxGeometry args={[0.04, h, d]} />
          <meshStandardMaterial {...GLASS} />
        </mesh>
      ))}
      {/* front glass with a door gap */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(doorGap / 2 + side / 2) * s, h / 2, d / 2]}>
          <boxGeometry args={[side, h, 0.04]} />
          <meshStandardMaterial {...GLASS} />
        </mesh>
      ))}
      {/* frames */}
      {[[-w / 2, d / 2], [w / 2, d / 2], [-doorGap / 2, d / 2], [doorGap / 2, d / 2], [-w / 2, -d / 2], [w / 2, -d / 2]].map(([fx, fz], i) => (
        <mesh key={i} position={[fx, h / 2, fz]} castShadow>
          <boxGeometry args={[0.07, h, 0.07]} />
          <meshStandardMaterial color={FRAME} />
        </mesh>
      ))}
      <mesh position={[0, h, d / 2]}>
        <boxGeometry args={[w, 0.07, 0.07]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      {/* back shelf */}
      <mesh position={[0, 0.5, -d / 2 + 0.25]} castShadow>
        <boxGeometry args={[w * 0.6, 1, 0.4]} />
        <meshStandardMaterial color="#3a3e47" />
      </mesh>
      {[-0.5, -0.3, -0.1].map((bx, i) => (
        <mesh key={i} position={[bx, 1.18, -d / 2 + 0.25]}>
          <boxGeometry args={[0.12, 0.36, 0.28]} />
          <meshStandardMaterial color={['#c0392b', '#f4f4f2', '#2d4a8a'][i]} />
        </mesh>
      ))}
    </group>
  );
}

function Bonsai({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.16, 0.12, 0.12, 12]} /><meshStandardMaterial color="#2e2e33" /></mesh>
      <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.02, 0.03, 0.2, 6]} /><meshStandardMaterial color="#5a3b22" /></mesh>
      <mesh position={[0, 0.34, 0]} scale={[1.4, 0.7, 1]}><sphereGeometry args={[0.12, 10, 8]} /><meshStandardMaterial color="#2f6b3a" /></mesh>
    </group>
  );
}

function Stapler({ position }) {
  // The red stapler from the concept art, front and centre on the meeting table.
  return (
    <group position={position} rotation={[0, 0.4, 0]}>
      <mesh position={[0, 0.04, 0]} castShadow><boxGeometry args={[0.36, 0.06, 0.1]} /><meshStandardMaterial color="#d62b22" roughness={0.3} /></mesh>
      <mesh position={[0.02, 0.1, 0]} rotation={[0, 0, 0.08]} castShadow><boxGeometry args={[0.34, 0.06, 0.09]} /><meshStandardMaterial color="#e2342a" roughness={0.3} /></mesh>
    </group>
  );
}

function Furniture() {
  return (
    <group>
      {Object.values(ROOMS).map((r, i) => <GlassRoom key={i} room={r} />)}
      {/* executive desks face the camera */}
      {['washington', 'ren', 'cleo'].map((id) => {
        const [x, z] = DESKS[id].pos;
        return (
          <group key={id}>
            <Desk x={x} z={z + 0.85} rot={Math.PI} w={id === 'ren' ? 2.2 : 1.8} />
            <Chair x={x} z={z} rot={0} />
          </group>
        );
      })}
      <Bonsai position={[1.45, 0.81, -5.25]} />
      {/* meeting table */}
      <group position={[0, 0, 0.8]}>
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.8, 0.07, 4.4]} />
          <meshStandardMaterial color="#f4f4f2" roughness={0.25} />
        </mesh>
        {[[-0.7, -2], [0.7, -2], [-0.7, 2], [0.7, 2]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.38, lz]}><boxGeometry args={[0.07, 0.76, 0.07]} /><meshStandardMaterial color="#2e323b" /></mesh>
        ))}
        <Stapler position={[0, 0.82, 0.1]} />
        <mesh position={[-0.35, 0.86, 1.3]} castShadow><boxGeometry args={[0.45, 0.1, 0.6]} /><meshStandardMaterial color="#2f62c8" /></mesh>
        <mesh position={[0.4, 0.84, 1.2]} castShadow><boxGeometry args={[0.45, 0.07, 0.6]} /><meshStandardMaterial color="#f7f7f5" /></mesh>
      </group>
      {[[-1.35, 1.4, Math.PI / 2], [1.35, 0.2, -Math.PI / 2], [-1.35, -0.4, Math.PI / 2], [1.35, 2.0, -Math.PI / 2]].map(([x, z, r], i) => (
        <Chair key={i} x={x} z={z} rot={r} />
      ))}
      {/* open desks */}
      <Desk x={-5.3} z={1.3} rot={-Math.PI / 2} w={2.2} />
      <Desk x={-5.3} z={-1.0} rot={-Math.PI / 2} w={2.2} />
      <Chair x={-6.1} z={1.3} rot={Math.PI / 2} />
      <Desk x={5.3} z={1.3} rot={Math.PI / 2} w={2.2} />
      <Desk x={5.3} z={-1.0} rot={Math.PI / 2} w={2.2} />
      <Chair x={6.1} z={1.3} rot={-Math.PI / 2} />
      {/* coffee bar */}
      <group position={[-3.6, 0, 6.1]}>
        <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[2.2, 1, 0.6]} /><meshStandardMaterial color="#3a3e47" /></mesh>
        <mesh position={[-0.6, 1.2, 0]} castShadow><boxGeometry args={[0.4, 0.4, 0.35]} /><meshStandardMaterial color="#c9ced8" metalness={0.6} roughness={0.3} /></mesh>
      </group>
    </group>
  );
}

function makeLabelTexture(text) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f2f2f2';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#151515';
  g.font = '700 150px Comfortaa, "Arial Rounded MT Bold", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Blimp() {
  const ref = useRef();
  const label = useMemo(() => makeLabelTexture('nevermind'), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.03;
    ref.current.position.x = Math.sin(t) * 22;
    ref.current.position.y = 13 + Math.sin(t * 3) * 0.4;
    ref.current.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI;
  });
  return (
    <group ref={ref} position={[0, 13, -36]}>
      <mesh scale={[4.2, 1.25, 1.25]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, 1.18 * s]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
          <planeGeometry args={[5, 1.25]} />
          <meshBasicMaterial map={label} transparent />
        </mesh>
      ))}
      <mesh position={[0, -1.35, 0]}><boxGeometry args={[1.4, 0.35, 0.5]} /><meshStandardMaterial color="#9aa0aa" /></mesh>
      <mesh position={[-4, 0.6, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[1, 0.08, 0.6]} /><meshStandardMaterial color="#5b616c" /></mesh>
    </group>
  );
}

/** The city outside, quietly falling apart. */
/** A tiling texture of office windows, some lit by the sunset. */
function useWindowTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 64, 128);
    let seed = 3;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 4; y < 128; y += 8) {
      for (let x = 4; x < 64; x += 10) {
        const lit = rand();
        g.fillStyle = lit > 0.86 ? '#fff1c8' : lit > 0.5 ? '#b9c6dc' : '#9fb0cb';
        g.fillRect(x, y, 6, 5);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

/** Sky dome: deep blue overhead fading to a warm sunset at the horizon. */
function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color('#6f97d8') }, mid: { value: new THREE.Color('#b9cdee') }, horizon: { value: new THREE.Color('#f6d2b2') }, below: { value: new THREE.Color('#7f93b8') } },
        vertexShader: 'varying vec3 vPos; void main() { vPos = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader:
          // Below the horizon is city haze, not sky (you look down past the building a lot).
          'uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 below; varying vec3 vPos; void main() { float h = vPos.y; vec3 c = h < 0.0 ? mix(horizon, below, smoothstep(0.0, -0.12, h)) : h < 0.12 ? mix(horizon, mid, smoothstep(0.0, 0.12, h)) : mix(mid, top, smoothstep(0.12, 0.7, h)); gl_FragColor = vec4(c, 1.0); }',
      }),
    [],
  );
  return (
    <mesh material={material}>
      <sphereGeometry args={[150, 32, 16]} />
    </mesh>
  );
}

/** The low sun with a soft glow, back right, as in the concept art. */
function Sun() {
  const glow = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,248,225,1)');
    r.addColorStop(0.25, 'rgba(255,226,170,0.75)');
    r.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  return (
    <group position={[34, 6, -70]}>
      <sprite scale={[34, 34, 1]}><spriteMaterial map={glow} transparent depthWrite={false} fog={false} /></sprite>
      <mesh><sphereGeometry args={[3.2, 24, 16]} /><meshBasicMaterial color="#fff6e0" fog={false} /></mesh>
    </group>
  );
}

function Skyline() {
  const windows = useWindowTexture();
  const buildings = useMemo(() => {
    const out = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 26; i++) {
        const x = -50 + i * 4 + rand() * 2;
        const h = 6 + rand() * (row === 2 ? 30 : 18);
        out.push({ x, z: -20 - row * 10 - rand() * 3, w: 2 + rand() * 2.5, h, shade: 0.42 + row * 0.1 + rand() * 0.08 });
      }
    }
    return out;
  }, []);
  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 14, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial
            color={new THREE.Color().setHSL(0.6, 0.32, b.shade)}
            map={windows}
            map-repeat={[Math.max(1, Math.round(b.w / 1.2)), Math.max(1, Math.round(b.h / 2.4))]}
            roughness={0.6}
            metalness={0.2}
          />
        </mesh>
      ))}
      <Crumbling position={[-14, -10, -26]} />
    </group>
  );
}

function Crumbling({ position }) {
  const pieces = useRef([]);
  const data = useMemo(() => Array.from({ length: 10 }, () => ({ x: 0, y: 0, z: 0, v: 0, delay: Math.random() * 6 })), []);
  useFrame((_, dt) => {
    data.forEach((p, i) => {
      p.delay -= dt;
      if (p.delay > 0) return;
      p.v += 9.8 * dt * 0.25;
      p.y -= p.v * dt;
      p.x += 0.4 * dt;
      if (p.y < -22) { p.y = 0; p.x = (Math.random() - 0.5) * 2; p.v = 0; p.delay = Math.random() * 4; }
      const m = pieces.current[i];
      if (m) { m.position.set(1.5 + p.x, 22 + p.y, p.z); m.rotation.x += dt * 2; m.rotation.z += dt; }
    });
  });
  return (
    <group position={position}>
      <mesh position={[0, 7, 0]}><boxGeometry args={[4, 30, 4]} /><meshStandardMaterial color="#8ea0c0" /></mesh>
      <mesh position={[-0.8, 23.5, 0]} rotation={[0, 0, 0.25]}><boxGeometry args={[2.4, 3, 4]} /><meshStandardMaterial color="#8ea0c0" /></mesh>
      {data.map((_, i) => (
        <mesh key={i} ref={(el) => (pieces.current[i] = el)} position={[0, 22, 0]}>
          <boxGeometry args={[0.6, 0.6, 0.6]} />
          <meshStandardMaterial color="#a9b6cf" />
        </mesh>
      ))}
    </group>
  );
}

function WindowWall() {
  // The tall glass curtain wall at the back of the floor.
  return (
    <group>
      <group position={[0, 0, -7.6]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[-7.75 + i * 3.1, 3.5, 0]}>
            <boxGeometry args={[0.12, 7, 0.12]} />
            <meshStandardMaterial color={FRAME} />
          </mesh>
        ))}
        <mesh position={[0, 0.15, 0]}><boxGeometry args={[15.5, 0.3, 0.2]} /><meshStandardMaterial color={FRAME} /></mesh>
      </group>
      {/* front balcony rail, as in the overhead concept art */}
      <group position={[0, 0, 7.6]}>
        <mesh position={[0, 0.55, 0]}><boxGeometry args={[15.5, 1.1, 0.04]} /><meshStandardMaterial {...GLASS} /></mesh>
        <mesh position={[0, 1.1, 0]}><boxGeometry args={[15.5, 0.06, 0.08]} /><meshStandardMaterial color={FRAME} /></mesh>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[-7.75 + i * 3.1, 0.55, 0]}><boxGeometry args={[0.06, 1.1, 0.06]} /><meshStandardMaterial color={FRAME} /></mesh>
        ))}
      </group>
      {/* side glass */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[7.75 * s, 3.5, 0]}><boxGeometry args={[0.04, 7, 15.2]} /><meshStandardMaterial {...GLASS} /></mesh>
      ))}
    </group>
  );
}

/** Frame the office for whatever shape the screen is (portrait phones need to stand further back). */
const TARGET = [0, 0, -0.3];
const tmp = new THREE.Vector3();

/**
 * Follow camera (like walking around in Pokemon) or the whole-office map view.
 * The map view frames the floor for whatever shape the screen is.
 */
function CameraRig() {
  const { camera, size } = useThree();
  const look = useRef(new THREE.Vector3(game.player.x, 0, game.player.z));
  useFrame((_, dt) => {
    const aspect = size.width / size.height;
    camera.fov = aspect < 1 ? 50 : 40;
    camera.updateProjectionMatrix();
    const k = Math.min(1, dt * 4);
    if (game.map) {
      const v = THREE.MathUtils.degToRad(camera.fov) / 2;
      const h = Math.atan(Math.tan(v) * aspect);
      const dist = Math.max(8.2 / Math.tan(h), 7 / Math.tan(v)) * 0.98;
      const tilt = THREE.MathUtils.degToRad(52);
      tmp.set(TARGET[0], dist * Math.sin(tilt), TARGET[2] + dist * Math.cos(tilt));
      look.current.lerp(tmp.clone().set(...TARGET), k);
    } else {
      const dist = aspect < 1 ? 15.5 : 13;
      const tilt = THREE.MathUtils.degToRad(55);
      tmp.set(game.player.x, dist * Math.sin(tilt), game.player.z + dist * Math.cos(tilt));
      look.current.lerp(new THREE.Vector3(game.player.x, 0.6, game.player.z), k * 1.5);
    }
    camera.position.lerp(tmp, k);
    camera.lookAt(look.current);
  });
  return null;
}

/** Among Us style task stations. */
function Stations({ level }) {
  const [px, pz] = STATIONS.review.pos;
  const [bx, bz] = STATIONS.briefing.pos;
  const [lx, lz] = STATIONS.log.pos;
  const [mx, mz] = STATIONS.mail.pos;
  const [wx, wz] = STATIONS.leads.pos;
  return (
    <group>
      {/* printer: drafts come out here */}
      <group position={[px, 0, pz]}>
        <mesh position={[0, 0.4, 0]} castShadow><boxGeometry args={[0.7, 0.8, 0.5]} /><meshStandardMaterial color="#e9e9ec" /></mesh>
        <mesh position={[0, 0.88, 0]} castShadow><boxGeometry args={[0.6, 0.16, 0.45]} /><meshStandardMaterial color="#3a3e47" /></mesh>
        <mesh position={[0, 0.82, 0.3]} rotation={[-0.4, 0, 0]}><planeGeometry args={[0.4, 0.3]} /><meshStandardMaterial color="#ffffff" /></mesh>
      </group>
      {/* Ren's briefing scroll on a stand */}
      <group position={[bx, 0, bz]}>
        <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.06, 0.12, 1, 10]} /><meshStandardMaterial color="#5a3b22" /></mesh>
        <mesh position={[0, 1.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.09, 0.09, 0.6, 12]} /><meshStandardMaterial color="#f3e2b8" /></mesh>
        <mesh position={[0, 1.02, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.1, 0.1, 0.05, 12]} /><meshStandardMaterial color="#c98b2e" /></mesh>
      </group>
      {/* bulletin board */}
      <group position={[lx - 0.25, 0, lz]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[1.6, 1.0, 0.06]} /><meshStandardMaterial color="#b9895a" /></mesh>
        {[[-0.45, 1.45, '#fff6a8'], [0.1, 1.5, '#ffffff'], [0.5, 1.25, '#bfe3ff'], [-0.2, 1.1, '#ffd1dc']].map(([x, y, c], i) => (
          <mesh key={i} position={[x, y, 0.04]} rotation={[0, 0, (i - 1.5) * 0.08]}><planeGeometry args={[0.32, 0.3]} /><meshStandardMaterial color={c} /></mesh>
        ))}
        {[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.4, 0]}><boxGeometry args={[0.05, 0.8, 0.05]} /><meshStandardMaterial color="#3a3e47" /></mesh>)}
      </group>
      {/* mail terminal */}
      <group position={[mx, 0, mz]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[0.6, 1.1, 0.4]} /><meshStandardMaterial color="#2a2f38" /></mesh>
        <mesh position={[0, 0.95, 0.205]}><planeGeometry args={[0.46, 0.3]} /><meshStandardMaterial color="#7fd3a0" emissive="#3fa36b" emissiveIntensity={0.6} /></mesh>
      </group>
      {/* Wren's lead whiteboard */}
      <group position={[wx - 0.3, 0, wz]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 1.35, 0]} castShadow><boxGeometry args={[1.7, 1.05, 0.05]} /><meshStandardMaterial color="#f7f7f4" roughness={0.2} /></mesh>
        <mesh position={[0, 1.35, -0.01]}><boxGeometry args={[1.8, 1.15, 0.03]} /><meshStandardMaterial color="#9aa0aa" metalness={0.5} /></mesh>
        {[[-0.5, 1.6, '#d63a2f'], [0, 1.6, '#e8b52c'], [0.5, 1.6, '#3fc35a'], [-0.5, 1.2, '#5a6fc0'], [0.2, 1.15, '#d63a2f']].map(([x, y, c], i) => (
          <mesh key={i} position={[x, y, 0.03]}><planeGeometry args={[0.32, 0.22]} /><meshStandardMaterial color={c} /></mesh>
        ))}
        {[-0.75, 0.75].map((x) => <mesh key={x} position={[x, 0.42, 0]}><cylinderGeometry args={[0.03, 0.03, 0.84, 8]} /><meshStandardMaterial color="#3a3e47" /></mesh>)}
      </group>
      <Decor level={level} />
    </group>
  );
}

function Plant({ position, s = 1 }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.22, 0.17, 0.5, 12]} /><meshStandardMaterial color="#f1ede4" /></mesh>
      <mesh position={[0, 0.75, 0]} castShadow><sphereGeometry args={[0.38, 12, 10]} /><meshStandardMaterial color="#3d7a46" /></mesh>
      <mesh position={[0.15, 1.0, 0.05]} castShadow><sphereGeometry args={[0.25, 10, 8]} /><meshStandardMaterial color="#4b8f52" /></mesh>
    </group>
  );
}

/** The office improves as the company levels up from real, finished work. */
export const UNLOCKS = [
  { level: 2, name: 'Plants' },
  { level: 3, name: 'Gallery wall' },
  { level: 4, name: 'Arcade cabinet' },
  { level: 5, name: 'Trophy and neon sign' },
];

function Decor({ level }) {
  return (
    <group>
      {level >= 2 && (
        <>
          <Plant position={[-7.0, 0, 6.8]} />
          <Plant position={[7.0, 0, 6.8]} />
          <Plant position={[-7.0, 0, -2.7]} s={0.8} />
          <Plant position={[7.0, 0, -2.7]} s={0.8} />
        </>
      )}
      {level >= 3 &&
        [[-4.75, '#d62b22'], [4.75, '#2f62c8']].map(([x, c]) => (
          <group key={x} position={[x, 1.7, -7.12]}>
            <mesh><boxGeometry args={[1.2, 0.8, 0.04]} /><meshStandardMaterial color="#111" /></mesh>
            <mesh position={[0, 0, 0.025]}><planeGeometry args={[1.05, 0.65]} /><meshStandardMaterial color={c} /></mesh>
          </group>
        ))}
      {level >= 4 && (
        <group position={[-1.4, 0, 6.3]}>
          <mesh position={[0, 0.85, 0]} castShadow><boxGeometry args={[0.8, 1.7, 0.7]} /><meshStandardMaterial color="#5b2a86" /></mesh>
          <mesh position={[0, 1.2, 0.36]}><planeGeometry args={[0.6, 0.45]} /><meshStandardMaterial color="#2affc6" emissive="#16b08a" emissiveIntensity={0.8} /></mesh>
        </group>
      )}
      {level >= 5 && (
        <group position={[-0.7, 0.81, -5.25]}>
          <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.1, 0.14, 0.3, 12]} /><meshStandardMaterial color="#e2b53c" metalness={0.8} roughness={0.25} /></mesh>
          <mesh position={[0, 0.38, 0]}><sphereGeometry args={[0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e2b53c" metalness={0.8} roughness={0.25} side={THREE.DoubleSide} /></mesh>
        </group>
      )}
    </group>
  );
}

export function Office({ roster, staff, selected, talkingTo, onSelect, level = 1, stationBadges = {}, quality = 'high' }) {
  const hq = quality === 'high';
  const stateById = Object.fromEntries(staff.map((s) => [s.id, s]));
  // Shared between the 3D scene (head positions) and the HTML bubble layer.
  const anchors = useMemo(() => ({}), []);
  const elements = useMemo(() => ({}), []);
  return (
    <>
    <Canvas
      shadows="soft"
      dpr={hq ? [1, 2] : [1, 1.25]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.88 }}
      camera={{ fov: 40, near: 0.5, far: 200, position: [0, 14, 16] }}
      onPointerMissed={() => onSelect(null)}
      onCreated={({ gl }) => gl.setClearColor('#bcd0ee')}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#bcd0ee']} />
      <fog attach="fog" args={['#d6d6e8', 34, 95]} />
      <CameraRig />
      <SkyDome />
      <Sun />
      {/* Studio-style reflections for the glossy figures and glass, built locally (no downloads). */}
      <Environment resolution={hq ? 256 : 64} frames={1}>
        <Lightformer form="rect" intensity={1.4} color="#ffe2bf" position={[10, 6, -8]} scale={[12, 6, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#cfe0ff" position={[-10, 8, 6]} scale={[10, 8, 1]} />
        <Lightformer form="ring" intensity={0.9} color="#ffffff" position={[0, 12, 0]} scale={6} />
      </Environment>
      <hemisphereLight args={['#eef3ff', '#8f96a8', 0.55]} />
      {/* warm sunset key light from the back right */}
      <directionalLight
        position={[14, 16, -6]}
        intensity={2.1}
        color="#ffd9ad"
        castShadow
        shadow-bias={-0.0004}
        shadow-mapSize={hq ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {/* cool fill from the front left so faces aren't lost in shadow */}
      <directionalLight position={[-8, 10, 12]} intensity={0.55} color="#cddcff" />
      <Skyline />
      <Blimp />
      <WindowWall />
      {/* the skyscraper's glass facade dropping away below the floor */}
      <mesh position={[0, -30.2, 0]}>
        <boxGeometry args={[15.6, 60, 16]} />
        <meshStandardMaterial color="#7f97c0" roughness={0.2} metalness={0.4} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[0, -1.5 - i * 3, 8.01]}>
          <planeGeometry args={[15.6, 0.12]} />
          <meshBasicMaterial color="#5d7199" />
        </mesh>
      ))}
      <Floor hq={hq} />
      <Furniture />
      {roster.map((p) => (
        <Character key={p.id} id={p.id} active={p.active} state={stateById[p.id]} selected={selected === p.id} talking={talkingTo === p.id} onSelect={onSelect} anchors={anchors} />
      ))}
      <Player anchors={anchors} />
      <Stations level={level} />
      {Object.entries(STATIONS).map(([id, st]) => (
        <group key={id} position={[st.pos[0], 1.9, st.pos[1]]} ref={(el) => { anchors[`st:${id}`] = el; }} />
      ))}
      <BubbleProjector anchors={anchors} elements={elements} />
    </Canvas>
    <BubbleLayer roster={roster} staff={staff} elements={elements} stationBadges={stationBadges} />
    </>
  );
}
