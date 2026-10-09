import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LOOKS } from '../staffLook.js';
import { DESKS, HANGOUTS, STATIONS, route, slide } from './layout.js';
import { Chibi } from './models.jsx';
import { game, setNear } from '../game.js';

const WALK_SPEED = 1.5;
const PLAYER_SPEED = 3.2;
const TALK_RANGE = 2.4;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function animateLimbs(t, dt, mode, armsRef, legsRef, bodyRef) {
  const [armL, armR] = armsRef.current.children;
  const [legL, legR] = legsRef.current.children;
  bodyRef.current.position.y = mode === 'walk' ? Math.abs(Math.sin(t * 10)) * 0.06 : mode === 'type' ? Math.sin(t * 18) * 0.008 : Math.sin(t * 2) * 0.01;
  if (mode === 'walk') {
    const swing = Math.sin(t * 10) * 0.6;
    armL.rotation.x = swing; armR.rotation.x = -swing;
    legL.rotation.x = -swing; legR.rotation.x = swing;
  } else if (mode === 'type') {
    armL.rotation.x = -1.1 + Math.sin(t * 22) * 0.12;
    armR.rotation.x = -1.1 + Math.sin(t * 22 + 1.7) * 0.12;
    legL.rotation.x = legR.rotation.x = 0;
  } else if (mode === 'wave') {
    armR.rotation.x = 0;
    armR.rotation.z = -2.6 + Math.sin(t * 8) * 0.3;
    armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, dt * 6);
    legL.rotation.x = legR.rotation.x = 0;
    return;
  } else {
    armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0, dt * 6);
    armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, dt * 6);
    legL.rotation.x = legR.rotation.x = 0;
  }
  armR.rotation.z = THREE.MathUtils.lerp(armR.rotation.z, 0, dt * 8);
}

function turnToward(group, face, dt) {
  let diff = face - group.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  group.rotation.y += diff * Math.min(1, dt * 8);
}

/**
 * One employee. `state` comes from the server: status (idle | working | paused),
 * activity (what they're doing) and bubble (what they last said).
 */
export function Character({ id, state, active, selected, talking, onSelect, anchors }) {
  const look = LOOKS[id];
  const desk = DESKS[id];
  const root = useRef();
  const body = useRef();
  const armsRef = useRef();
  const legsRef = useRef();
  const sim = useRef({
    pos: new THREE.Vector2(desk.pos[0], desk.pos[1]),
    path: [],
    face: desk.face,
    nextWander: 3 + Math.random() * 8,
    atDesk: true,
  });

  const status = !active ? 'offduty' : state?.status || 'idle';

  // Working or paused: head to the desk and stay there.
  useEffect(() => {
    const s = sim.current;
    if (status === 'working' || status === 'paused') {
      s.path = route([s.pos.x, s.pos.y], desk.pos);
      s.atDesk = false;
    }
  }, [status]);

  useFrame((three, dt) => {
    dt = Math.min(dt, 0.05);
    const t = three.clock.elapsedTime;
    const s = sim.current;

    // Idle people wander; workers and paused people stay put; anyone you're talking to waits.
    if (!talking && (status === 'idle' || status === 'offduty') && s.path.length === 0) {
      s.nextWander -= dt;
      if (s.nextWander <= 0) {
        const goHome = !s.atDesk && Math.random() < 0.5;
        const target = goHome ? desk.pos : pick(HANGOUTS).map((v) => v + (Math.random() - 0.5) * 0.8);
        s.path = route([s.pos.x, s.pos.y], target);
        s.atDesk = false;
        s.nextWander = (status === 'offduty' ? 14 : 8) + Math.random() * 14;
      }
    }

    let walking = false;
    if (s.path.length && !talking) {
      const [tx, tz] = s.path[0];
      const dx = tx - s.pos.x;
      const dz = tz - s.pos.y;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) {
        s.path.shift();
        if (!s.path.length && Math.hypot(s.pos.x - desk.pos[0], s.pos.y - desk.pos[1]) < 0.1) s.atDesk = true;
      } else {
        const step = Math.min(dist, WALK_SPEED * dt);
        s.pos.x += (dx / dist) * step;
        s.pos.y += (dz / dist) * step;
        s.face = Math.atan2(dx, dz);
        walking = true;
      }
    } else if (talking) {
      s.face = Math.atan2(game.player.x - s.pos.x, game.player.z - s.pos.y);
    } else if (s.atDesk) {
      s.face = desk.face;
    }

    game.staffPos[id] = { x: s.pos.x, z: s.pos.y };
    const g = root.current;
    g.position.x = s.pos.x;
    g.position.z = s.pos.y;
    turnToward(g, s.face, dt);

    const mode = walking ? 'walk' : status === 'working' && s.atDesk && !talking ? 'type' : 'still';
    animateLimbs(t, dt, mode, armsRef, legsRef, body);
  });

  return (
    <group ref={root} position={[desk.pos[0], 0, desk.pos[1]]} onClick={(e) => { e.stopPropagation(); onSelect(id); }}>
      <Chibi look={look} bodyRef={body} armsRef={armsRef} legsRef={legsRef} />
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.55, 0.68, 40]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      )}
      {/* generous invisible tap target */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 2.2, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* where the speech bubble hangs (see Bubbles.jsx) */}
      <group position={[0, 2.55, 0]} ref={(el) => { if (anchors) anchors[id] = el; }} />
    </group>
  );
}

/** You. Walks with the joystick; finds who or what is in reach. */
export function Player({ anchors }) {
  const root = useRef();
  const body = useRef();
  const armsRef = useRef();
  const legsRef = useRef();
  const face = useRef(Math.PI);

  useFrame((three, dt) => {
    dt = Math.min(dt, 0.05);
    const p = game.player;
    let { x: ix, z: iz } = game.input;
    const len = Math.hypot(ix, iz);
    if (len > 1) { ix /= len; iz /= len; }
    const moving = !game.frozen && len > 0.08;
    if (moving) {
      [p.x, p.z] = slide(p.x, p.z, ix * PLAYER_SPEED * dt, iz * PLAYER_SPEED * dt);
      face.current = Math.atan2(ix, iz);
    }

    // What's in reach: the closest person, else the closest station.
    let best = null;
    let bestD = Infinity;
    for (const [id, sp] of Object.entries(game.staffPos)) {
      const d = Math.hypot(sp.x - p.x, sp.z - p.z);
      if (d < TALK_RANGE && d < bestD) { best = { type: 'staff', id }; bestD = d; }
    }
    if (!best) {
      for (const [id, st] of Object.entries(STATIONS)) {
        const d = Math.hypot(st.pos[0] - p.x, st.pos[1] - p.z);
        if (d < st.r && d < bestD) { best = { type: 'station', id }; bestD = d; }
      }
    }
    if (!game.frozen) setNear(best);
    if (game.frozen && game.near?.type === 'staff') {
      const sp = game.staffPos[game.near.id];
      if (sp) face.current = Math.atan2(sp.x - p.x, sp.z - p.z);
    }

    const g = root.current;
    g.position.x = p.x;
    g.position.z = p.z;
    turnToward(g, face.current, dt);
    animateLimbs(three.clock.elapsedTime, dt, moving ? 'walk' : 'still', armsRef, legsRef, body);
  });

  return (
    <group ref={root} position={[game.player.x, 0, game.player.z]}>
      <Chibi look={LOOKS.you} bodyRef={body} armsRef={armsRef} legsRef={legsRef} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshBasicMaterial color="#ffd23f" transparent opacity={0.35} />
      </mesh>
      <group position={[0, 2.55, 0]} ref={(el) => { if (anchors) anchors.you = el; }} />
    </group>
  );
}
