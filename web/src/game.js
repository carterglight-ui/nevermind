// Shared, mutable game state read every frame by the 3D scene and polled by the UI.
import { PLAYER_START } from './office/layout.js';

export const game = {
  input: { x: 0, z: 0 },            // joystick / keyboard, each -1..1
  player: { x: PLAYER_START[0], z: PLAYER_START[1] },
  staffPos: {},                     // id -> {x, z}, written by each character every frame
  near: null,                       // { type: 'staff' | 'station', id }
  map: false,                       // overview camera instead of follow camera
  frozen: false,                    // true while a dialogue is open
  listeners: new Set(),
};

export function setNear(next) {
  const cur = game.near;
  if (cur?.type === next?.type && cur?.id === next?.id) return;
  game.near = next;
  for (const fn of game.listeners) fn(next);
}

// Keyboard support (desktop testing): arrows / WASD, Space or Enter = A.
const keys = new Set();
const update = () => {
  game.input.x = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0);
  game.input.z = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0);
};
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    update();
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    update();
  });
  window.addEventListener('blur', () => { keys.clear(); update(); });
}

// Graphics quality, remembered on this phone. 'high' or 'saver'.
const GFX_KEY = 'nevermind-gfx';
export function getQuality() {
  try { return localStorage.getItem(GFX_KEY) || 'high'; } catch { return 'high'; }
}
export function saveQuality(q) {
  try { localStorage.setItem(GFX_KEY, q); } catch { /* fine */ }
}
