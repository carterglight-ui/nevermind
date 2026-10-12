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

/** Re-render a few times a second to follow the simulation (meetings, hand-offs). */
function useSimTick(ms = 400) {
  const [, setN] = useState(0);
  useEffect(() => {
    const bump = () => setN((n) => n + 1);
    const id = setInterval(bump, ms);
    game.listeners.add(bump);
    return () => { clearInterval(id); game.listeners.delete(bump); };
  }, [ms]);
}

/**
 * One employee's bubble. In order: what they're saying in a team huddle,
 * what they're telling a teammate while handing off work, what they just said,
 * what they're working on, else rare idle chatter.
 */
function Bubble({ id, state, active, elements }) {
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

  const meeting = game.meeting;
  const meetingLine = meeting?.speaking === id ? meeting.line : '';
  const visit = game.visits[id];
  const inMeeting = Boolean(meeting?.participants.includes(id));
  const visitLine = !inMeeting && visit && visit.until > Date.now() ? visit.line : '';
  const listening = game.talkingTo === id;

  const text =
    meetingLine ||
    (listening ? '…' : '') ||
    visitLine ||
    said ||
    (status === 'working' && state?.activity ? `${state.activity}…` : '') ||
    (status === 'paused' ? 'Paused.' : '') ||
    (meeting?.participants.includes(id) ? '' : idleLine);

  return (
    <div className="bubble-anchor" ref={(el) => { elements[id] = el; }}>
      {text && (
        <div className={`bubble ${meetingLine || visitLine || said ? '' : 'muted'}`}>
          <Typewriter key={text} text={text} />
        </div>
      )}
    </div>
  );
}

/** Lives outside <Canvas>, over it. Station labels are buttons. */
export function BubbleLayer({ roster, staff, elements, stationBadges, onStation }) {
  useSimTick();
  const byId = Object.fromEntries(staff.map((s) => [s.id, s]));
  return (
    <div className="bubble-layer">
      {roster.map((p) => (
        <Bubble key={p.id} id={p.id} active={p.active} state={byId[p.id]} elements={elements} />
      ))}
      {Object.entries(STATIONS).map(([id, st]) => (
        <div key={id} className="bubble-anchor" ref={(el) => { elements[`st:${id}`] = el; }}>
          <button className={`station-tag ${stationBadges[id] ? 'alert' : ''}`} onClick={() => onStation(st.opens)}>
            {stationBadges[id] ? <span className="excl">!</span> : null}
            {st.label}
          </button>
        </div>
      ))}
    </div>
  );
}
