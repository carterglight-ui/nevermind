import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Character } from './Character.jsx';
import { BubbleProjector, BubbleLayer } from './Bubbles.jsx';
import { ROOMS, DESKS } from './layout.js';

const GLASS = { color: '#cfe3f5', transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.1, depthWrite: false };
const FRAME = '#3a3f4a';

function Floor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[15.5, 16]} />
        <meshStandardMaterial color="#c9ced8" roughness={0.35} metalness={0.15} />
      </mesh>
      {/* centre rug, like the concept art */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1]} receiveShadow>
        <planeGeometry args={[5.5, 7.5]} />
        <meshStandardMaterial color="#5c6f99" roughness={0.95} />
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
function Skyline() {
  const buildings = useMemo(() => {
    const out = [];
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 26; i++) {
        const x = -50 + i * 4 + rand() * 2;
        const h = 6 + rand() * (row === 2 ? 30 : 18);
        out.push({ x, z: -20 - row * 10 - rand() * 3, w: 2 + rand() * 2.5, h, shade: 0.55 + row * 0.12 + rand() * 0.08 });
      }
    }
    return out;
  }, []);
  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 14, b.z]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshStandardMaterial color={new THREE.Color().setHSL(0.6, 0.35, b.shade)} roughness={0.9} />
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
function CameraRig() {
  const { camera, size } = useThree();
  useMemo(() => {
    const aspect = size.width / size.height;
    camera.fov = aspect < 1 ? 50 : 40;
    const v = THREE.MathUtils.degToRad(camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * aspect);
    // Far enough back to fit the floor's width, and its depth (foreshortened) in view.
    const dist = Math.max(8.2 / Math.tan(h), 7 / Math.tan(v)) * 0.98;
    const tilt = THREE.MathUtils.degToRad(52);
    camera.position.set(TARGET[0], dist * Math.sin(tilt), TARGET[2] + dist * Math.cos(tilt));
    camera.lookAt(...TARGET);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export function Office({ roster, staff, selected, onSelect }) {
  const stateById = Object.fromEntries(staff.map((s) => [s.id, s]));
  // Shared between the 3D scene (head positions) and the HTML bubble layer.
  const anchors = useMemo(() => ({}), []);
  const elements = useMemo(() => ({}), []);
  return (
    <>
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 40, near: 0.5, far: 200, position: [0, 14, 16] }}
      onPointerMissed={() => onSelect(null)}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#bcd0ee']} />
      <fog attach="fog" args={['#cfd9ee', 30, 75]} />
      <CameraRig />
      <hemisphereLight args={['#eaf1ff', '#9aa3b5', 0.9]} />
      <directionalLight
        position={[14, 18, 6]}
        intensity={1.6}
        color="#ffe2bf"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <mesh position={[30, 9, -60]}>
        <sphereGeometry args={[3, 24, 16]} />
        <meshBasicMaterial color="#fff2cf" />
      </mesh>
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
      <Floor />
      <Furniture />
      {roster.map((p) => (
        <Character key={p.id} id={p.id} active={p.active} state={stateById[p.id]} selected={selected === p.id} onSelect={onSelect} anchors={anchors} />
      ))}
      <BubbleProjector anchors={anchors} elements={elements} />
      <OrbitControls
        target={TARGET}
        enableRotate
        minPolarAngle={0.35}
        maxPolarAngle={1.15}
        minAzimuthAngle={-0.6}
        maxAzimuthAngle={0.6}
        minDistance={6}
        maxDistance={60}
        enableDamping
      />
    </Canvas>
    <BubbleLayer roster={roster} staff={staff} elements={elements} />
    </>
  );
}
