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
