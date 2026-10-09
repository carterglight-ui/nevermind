// Floor plan, after the overhead concept art: three glass offices along the back
// (Washington, Ren, Cleo), a meeting table in the middle (Milo and Felix),
// and open desks on the left (Wren) and right (Ollie).
// Units are roughly metres; x to the right, z toward the camera.

export const ROOMS = {
  washington: { x: -4.75, z: -5.2, w: 4.5, d: 4 },
  ren: { x: 0, z: -5.2, w: 4.8, d: 4 },
  cleo: { x: 4.75, z: -5.2, w: 4.5, d: 4 },
};

// Door = the gap in each room's front glass, centred.
for (const r of Object.values(ROOMS)) r.door = [r.x, r.z + r.d / 2 + 0.6];

// Where each person works: [x, z] for the chair, and which way they face (radians, 0 = toward camera).
export const DESKS = {
  washington: { pos: [-4.75, -6.1], face: 0, room: 'washington' },
  ren: { pos: [0, -6.1], face: 0, room: 'ren' },
  cleo: { pos: [4.75, -6.1], face: 0, room: 'cleo' },
  milo: { pos: [-1.35, 1.4], face: Math.PI / 2 },
  felix: { pos: [1.35, 0.2], face: -Math.PI / 2 },
  wren: { pos: [-6.1, 1.3], face: Math.PI / 2 },
  ollie: { pos: [6.1, 1.3], face: -Math.PI / 2 },
};

// Places people drift to when they're not busy.
export const HANGOUTS = [
  [-3.6, 5.0], // coffee bar
  [-2.8, 4.6],
  [3.8, 5.2], // by the front glass
  [6.3, -2.0],
  [-6.3, -2.0],
  [0, 3.9],
  [3.0, 2.6],
  [-3.6, 1.6],
];

export function roomAt(x, z) {
  for (const [id, r] of Object.entries(ROOMS)) {
    if (Math.abs(x - r.x) < r.w / 2 && Math.abs(z - r.z) < r.d / 2) return id;
  }
  return null;
}

/** Waypoints from one spot to another, going through doors instead of glass. */
export function route(from, to) {
  const points = [];
  const a = roomAt(from[0], from[1]);
  const b = roomAt(to[0], to[1]);
  if (a && a !== b) points.push(ROOMS[a].door);
  if (b && a !== b) points.push(ROOMS[b].door);
  points.push(to);
  return points;
}

// Things you can walk up to and use (Among Us style). r = how close you need to be.
export const STATIONS = {
  review: { pos: [2.7, 4.3], r: 1.4, label: 'Printer', opens: 'review' },
  briefing: { pos: [0, -2.45], r: 1.3, label: "Ren's scroll", opens: 'briefings' },
  log: { pos: [-7.2, 3.6], r: 1.4, label: 'Bulletin board', opens: 'log' },
  mail: { pos: [7.1, 4.2], r: 1.4, label: 'Mail terminal', opens: 'mail' },
};

export const PLAYER_START = [0, 5.2];
const BOUNDS = { minX: -7.4, maxX: 7.4, minZ: -7.1, maxZ: 7.2 };

// Solid rectangles [minX, maxX, minZ, maxZ] the player can't walk through.
export const OBSTACLES = (() => {
  const o = [];
  const t = 0.12;
  for (const r of Object.values(ROOMS)) {
    const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, z0 = r.z - r.d / 2, z1 = r.z + r.d / 2;
    o.push([x0 - t, x0 + t, z0, z1], [x1 - t, x1 + t, z0, z1], [x0, x1, z0 - t, z0 + t]);
    o.push([x0, r.x - 0.7, z1 - t, z1 + t], [r.x + 0.7, x1, z1 - t, z1 + t]); // front glass, door gap in the middle
  }
  for (const id of ['washington', 'ren', 'cleo']) {
    const [x, z] = DESKS[id].pos;
    const w = id === 'ren' ? 2.2 : 1.8;
    o.push([x - w / 2, x + w / 2, z + 0.45, z + 1.25]);
  }
  o.push([-0.9, 0.9, -1.4, 3.0]); // meeting table
  for (const [x, z] of [[-5.3, 1.3], [-5.3, -1.0], [5.3, 1.3], [5.3, -1.0]]) o.push([x - 0.4, x + 0.4, z - 1.1, z + 1.1]);
  o.push([-4.7, -2.5, 5.8, 6.4]); // coffee bar
  return o;
})();

/** Move a circle of radius r from (x, z) by (dx, dz), sliding along walls. */
export function slide(x, z, dx, dz, r = 0.32) {
  const blocked = (px, pz) =>
    px < BOUNDS.minX || px > BOUNDS.maxX || pz < BOUNDS.minZ || pz > BOUNDS.maxZ ||
    OBSTACLES.some(([a, b, c, d]) => px > a - r && px < b + r && pz > c - r && pz < d + r);
  if (!blocked(x + dx, z)) x += dx;
  if (!blocked(x, z + dz)) z += dz;
  return [x, z];
}
