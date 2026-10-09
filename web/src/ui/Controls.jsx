import { useRef, useState } from 'react';
import { game } from '../game.js';
import { useNear } from '../office/Bubbles.jsx';
import { STATIONS } from '../office/layout.js';

/** Virtual thumbstick, bottom left (like Among Us on mobile). */
export function Joystick() {
  const base = useRef();
  const [knob, setKnob] = useState([0, 0]);
  const active = useRef(null);
  const R = 42;

  const move = (e) => {
    const rect = base.current.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    setKnob([dx, dy]);
    game.input.x = dx / R;
    game.input.z = dy / R;
  };
  const end = () => {
    active.current = null;
    setKnob([0, 0]);
    game.input.x = 0;
    game.input.z = 0;
  };

  return (
    <div
      className="joystick"
      ref={base}
      onPointerDown={(e) => { active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => active.current === e.pointerId && move(e)}
      onPointerUp={end}
      onPointerCancel={end}
      aria-label="Move"
    >
      <div className="knob" style={{ transform: `translate(${knob[0]}px, ${knob[1]}px)` }} />
    </div>
  );
}

/** The A button. Its label says what it will do. */
export function AButton({ onPress, names }) {
  const near = useNear();
  const label = !near ? '' : near.type === 'staff' ? `TALK` : 'USE';
  const who = !near ? '' : near.type === 'staff' ? names[near.id]?.split(' ')[0] : STATIONS[near.id].label;
  return (
    <div className="a-wrap">
      {who && <div className="a-hint">{who}</div>}
      <button className={`a-btn ${near ? 'live' : ''}`} onClick={() => near && onPress(near)} aria-label={label || 'A'}>
        A
      </button>
      <div className="a-label">{label || '—'}</div>
    </div>
  );
}
