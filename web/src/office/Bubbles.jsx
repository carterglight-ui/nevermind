// Retro RPG speech bubbles, drawn as plain HTML over the 3D office.
// A tiny projector inside the 3D scene moves each bubble to its owner's head every frame.
import { useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { IDLE_LINES } from '../staffLook.js';
import { STATIONS } from './layout.js';
import { game } from '../game.js';

const v = new THREE.Vector3();

/** Lives inside <Canvas>. Positions the DOM bubbles over the characters' heads. */
export function BubbleProjector({ anchors, elements }) {
  const { camera, size } = useThree();
  useFrame(() => {
    for (const [id, anchor] of Object.entries(anchors)) {
      const el = elements[id];
      if (!anchor || !el) continue;
      v.setFromMatrixPosition(anchor.matrixWorld).project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.style.visibility = v.z < 1 ? 'visible' : 'hidden';
    }
  });
  return null;
}

function Typewriter({ text }) {
  const [shown, setShown] = useState('');
  useEffect(() => {
    let i = 0;
    setShown('');
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [text]);
  return (
    <>
      {shown}
      {shown.length < text.length && <span className="caret">▌</span>}
    </>
  );
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Who or what the player can reach right now. */
export function useNear() {
  const [near, setNear] = useState(game.near);
  useEffect(() => {
    game.listeners.add(setNear);
    return () => game.listeners.delete(setNear);
  }, []);
  return near;
}

const Pointer = () => <div className="pointer">▼</div>;

/** One employee's bubble: what they just said, else what they're doing, else rare idle chatter. */
function Bubble({ id, state, active, elements, isNear }) {
  const [said, setSaid] = useState('');
  const [idleLine, setIdleLine] = useState('');
  const status = !active ? 'offduty' : state?.status || 'idle';

  useEffect(() => {
    if (!state?.bubble) return;
    setSaid(state.bubble);
    const t = setTimeout(() => setSaid(''), 9000);
    return () => clearTimeout(t);
  }, [state?.bubble, state?.updated_at]);

  useEffect(() => {
    if (status !== 'idle' && status !== 'offduty') return setIdleLine('');
    let clear;
    const c = setInterval(() => {
      if (Math.random() < 0.25) {
        setIdleLine(pick(IDLE_LINES[id]));
        clear = setTimeout(() => setIdleLine(''), 5000);
      }
    }, 20000 + Math.random() * 15000);
    return () => { clearInterval(c); clearTimeout(clear); };
  }, [status, id]);

  const text =
    said ||
    (status === 'working' && state?.activity ? `${state.activity}…` : '') ||
    (status === 'paused' ? 'Paused.' : '') ||
    idleLine;

  return (
    <div className="bubble-anchor" ref={(el) => { elements[id] = el; }}>
      {isNear && !text && <Pointer />}
      {text && (
        <div className={`bubble ${!said && status !== 'working' ? 'muted' : ''}`}>
          <Typewriter key={text} text={text} />
        </div>
      )}
    </div>
  );
}

/** Lives outside <Canvas>, over it. */
export function BubbleLayer({ roster, staff, elements, stationBadges }) {
  const byId = Object.fromEntries(staff.map((s) => [s.id, s]));
  const near = useNear();
  return (
    <div className="bubble-layer">
      {roster.map((p) => (
        <Bubble key={p.id} id={p.id} active={p.active} state={byId[p.id]} elements={elements} isNear={near?.type === 'staff' && near.id === p.id} />
      ))}
      {Object.entries(STATIONS).map(([id, st]) => (
        <div key={id} className="bubble-anchor" ref={(el) => { elements[`st:${id}`] = el; }}>
          <div className={`station-tag ${stationBadges[id] ? 'alert' : ''} ${near?.type === 'station' && near.id === id ? 'near' : ''}`}>
            {stationBadges[id] ? <span className="excl">!</span> : null}
            {st.label}
          </div>
        </div>
      ))}
      <div className="bubble-anchor" ref={(el) => { elements.you = el; }}>
        <div className="you-tag">YOU</div>
      </div>
    </div>
  );
}
