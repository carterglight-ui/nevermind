// Shared, mutable simulation state read every frame by the 3D scene.
// You are not in the office: you watch it, and reach in by tapping people.

export const game = {
  staffPos: {},       // id -> {x, z}, written by each character every frame
  talkingTo: null,    // id of whoever has stopped to talk to you
  moveMode: null,     // id waiting for you to tap a spot on the floor
  orders: {},         // id -> { to: [x, z], until } where you sent them
  visits: {},         // id -> { to: id, line, until } walking over to hand off work
  meeting: null,      // { participants: [id], lines: [{speaker, text}], started }
  listeners: new Set(),
};

export function emit() {
  for (const fn of game.listeners) fn();
}

// Graphics quality, remembered on this phone. 'high' or 'saver'.
const GFX_KEY = 'nevermind-gfx';
export function getQuality() {
  try { return localStorage.getItem(GFX_KEY) || 'high'; } catch { return 'high'; }
}
export function saveQuality(q) {
  try { localStorage.setItem(GFX_KEY, q); } catch { /* fine */ }
}
