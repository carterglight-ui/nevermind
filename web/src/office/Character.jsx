import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LOOKS } from '../staffLook.js';
import { DESKS, HANGOUTS, MEETING_SEATS, route } from './layout.js';
import { Chibi } from './models.jsx';
import { game } from '../game.js';

const WALK_SPEED = 1.5;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function animateLimbs(t, dt, mode, armsRef, legsRef, bodyRef) {
  const [armL, armR] = armsRef.current.children;
  const [legL, legR] = legsRef.current.children;
  bodyRef.current.position.y = mode === 'walk' ? Math.abs(Math.sin(t * 10)) * 0.06 : mode === 'type' ? Math.sin(t * 18) * 0.008 : Math.sin(t * 2) * 0.01;
  const ease = (v, to, k = 6) => THREE.MathUtils.lerp(v, to, Math.min(1, dt * k));
  if (mode === 'walk') {
    const swing = Math.sin(t * 10) * 0.6;
    armL.rotation.x = swing; armR.rotation.x = -swing;
    legL.rotation.x = -swing; legR.rotation.x = swing;
    armR.rotation.z = ease(armR.rotation.z, 0, 8);
    return;
  }
  legL.rotation.x = legR.rotation.x = 0;
  if (mode === 'type') {
    armL.rotation.x = -1.1 + Math.sin(t * 22) * 0.12;
    armR.rotation.x = -1.1 + Math.sin(t * 22 + 1.7) * 0.12;
    armR.rotation.z = ease(armR.rotation.z, 0, 8);
  } else if (mode === 'wave') {
    armL.rotation.x = ease(armL.rotation.x, 0);
    armR.rotation.x = ease(armR.rotation.x, 0);
    armR.rotation.z = -2.6 + Math.sin(t * 8) * 0.3;
  } else if (mode === 'talk') {
    // gesturing while making a point
    armL.rotation.x = ease(armL.rotation.x, -0.5 + Math.sin(t * 5) * 0.25);
    armR.rotation.x = ease(armR.rotation.x, -0.7 + Math.sin(t * 6 + 1) * 0.3);
    armR.rotation.z = ease(armR.rotation.z, 0, 8);
  } else {
    armL.rotation.x = ease(armL.rotation.x, 0);
    armR.rotation.x = ease(armR.rotation.x, 0);
    armR.rotation.z = ease(armR.rotation.z, 0, 8);
  }
}

function turnToward(group, face, dt) {
  let diff = face - group.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  group.rotation.y += diff * Math.min(1, dt * 8);
}

/**
 * One employee, living their workday. What they do, in order of priority:
 * stop when you talk to them, go to a team huddle, go where you sent them,
 * walk over to hand someone work, sit at their desk while working or paused,
 * otherwise wander.
 */
export function Character({ id, state, active, onSelect, anchors }) {
  const look = LOOKS[id];
  const desk = DESKS[id];
  const root = useRef();
  const body = useRef();
  const armsRef = useRef();
  const legsRef = useRef();
  const sim = useRef({
    pos: new THREE.Vector2(desk.pos[0], desk.pos[1]),
    path: [],
    goal: null,
    face: desk.face,
    nextWander: 3 + Math.random() * 8,
    wanderTo: null,
  });

  const status = !active ? 'offduty' : state?.status || 'idle';

  useFrame((three, dt) => {
    dt = Math.min(dt, 0.05);
    const t = three.clock.elapsedTime;
    const now = Date.now();
    const s = sim.current;

    // 1. What should I be doing right now?
    let goal = null;
    let goalFace = null;
    let pose = 'still';
    const meeting = game.meeting;
    const seat = meeting ? meeting.participants.indexOf(id) : -1;
    const order = game.orders[id];
    const visit = game.visits[id];
    if (order && order.until < now) delete game.orders[id];
    if (visit && visit.until < now) delete game.visits[id];

    if (game.talkingTo === id) {
      goal = null; // stop where you are
      goalFace = 0; // turn to you (toward the camera)
      pose = 'wave';
    } else if (seat >= 0) {
      const sp = MEETING_SEATS[seat % MEETING_SEATS.length];
      goal = sp.pos;
      goalFace = sp.face;
      pose = meeting.speaking === id ? 'talk' : 'still';
    } else if (game.orders[id]) {
      goal = game.orders[id].to;
    } else if (game.visits[id] && game.staffPos[game.visits[id].to]) {
      const other = game.staffPos[game.visits[id].to];
      const dx = s.pos.x - other.x;
      const dz = s.pos.y - other.z;
      const d = Math.hypot(dx, dz) || 1;
      goal = [other.x + (dx / d) * 1.0, other.z + (dz / d) * 1.0];
      goalFace = Math.atan2(other.x - goal[0], other.z - goal[1]);
      pose = 'talk';
    } else if (status === 'working' || status === 'paused') {
      goal = desk.pos;
      goalFace = desk.face;
      pose = status === 'working' ? 'type' : 'still';
    } else {
      // idle: wander between the coffee bar, the windows and their desk
      s.nextWander -= dt;
      if (s.nextWander <= 0) {
        s.wanderTo = Math.random() < 0.4 ? null : pick(HANGOUTS).map((v) => v + (Math.random() - 0.5) * 0.8);
        s.nextWander = (status === 'offduty' ? 14 : 8) + Math.random() * 14;
      }
      goal = s.wanderTo || desk.pos;
      goalFace = s.wanderTo ? null : desk.face;
    }

    // 2. Re-plan the walk when the goal moves.
    if (goal && (!s.goal || Math.hypot(goal[0] - s.goal[0], goal[1] - s.goal[1]) > 0.3)) {
      s.goal = goal;
      s.path = route([s.pos.x, s.pos.y], goal);
    }
    if (!goal) { s.goal = null; s.path = []; }

    // 3. Walk.
    let walking = false;
    if (s.path.length) {
      const [tx, tz] = s.path[0];
      const dx = tx - s.pos.x;
      const dz = tz - s.pos.y;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) s.path.shift();
      else {
        const step = Math.min(dist, WALK_SPEED * dt);
        s.pos.x += (dx / dist) * step;
        s.pos.y += (dz / dist) * step;
        s.face = Math.atan2(dx, dz);
        walking = true;
      }
    } else if (goalFace !== null) {
      s.face = goalFace;
    }

    game.staffPos[id] = { x: s.pos.x, z: s.pos.y };
    const g = root.current;
    g.position.x = s.pos.x;
    g.position.z = s.pos.y;
    turnToward(g, s.face, dt);
    animateLimbs(t, dt, walking ? 'walk' : pose, armsRef, legsRef, body);
  });

  return (
    <group ref={root} position={[desk.pos[0], 0, desk.pos[1]]} onClick={(e) => { e.stopPropagation(); onSelect(id); }}>
      <Chibi look={look} bodyRef={body} armsRef={armsRef} legsRef={legsRef} />
      {/* generous invisible tap target */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 2.4, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* where the speech bubble hangs (see Bubbles.jsx) */}
      <group position={[0, 2.55, 0]} ref={(el) => { if (anchors) anchors[id] = el; }} />
    </group>
  );
}
