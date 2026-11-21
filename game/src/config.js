// config.js — constants and the three hand-built levels of Shadow Post.
// Map legend: # wall, . floor, C crate (solid cover, blocks sight),
// B bush (walkable shadow, blocks sight, hides the courier), P courier start,
// * parcel to collect, E exit. Each map is 20 columns x 11 rows.
export const TILE = 64;
export const COLS = 20;
export const ROWS = 11;
export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PLAYER_WALK = 150;
export const PLAYER_RUN = 245;
export const PLAYER_RADIUS = 14;

export const LEVELS = [
  {
    name: 'Level 1 — The Depot',
    brief: 'Slip past two patrols, take all three parcels, leave unseen.',
    coneRange: 205,
    coneHalfAngle: 0.58,
    patrolSpeed: 72,
    chaseSpeed: 168,
    map: [
      '####################',
      '#P....#.....C.....*#',
      '#.....#....###.....#',
      '#..C..#...........E#',
      '#.....#....#..B....#',
      '#..B.....C.#......##',
      '#.....#....#.......#',
      '#..C..#..B.#...C...#',
      '#.....#....#.......#',
      '#.*....#...#...*...#',
      '####################',
    ],
    guards: [
      { waypoints: [[9, 1], [9, 3], [14, 3], [14, 1]], pause: 1.2 },
      { waypoints: [[2, 8], [8, 8], [8, 6], [2, 6]], pause: 0.9 },
    ],
  },
  {
    name: 'Level 2 — The Archive',
    brief: 'Three patrols now, tighter shelves. Bushes are your friends.',
    coneRange: 225,
    coneHalfAngle: 0.55,
    patrolSpeed: 82,
    chaseSpeed: 178,
    map: [
      '####################',
      '#P..C.#......B....*#',
      '#.....#..C...#.....#',
      '#.##..#......#..C..#',
      '#.#...#..B...#.....#',
      '#.#.C....##......#.#',
      '#...#....#...C...#.#',
      '#.B.#..C.#.......#.#',
      '#...#....#..##....E#',
      '#.*.#....#.....B.*.#',
      '####################',
    ],
    guards: [
      { waypoints: [[10, 1], [10, 4], [14, 4], [14, 1]], pause: 1.0 },
      { waypoints: [[2, 6], [6, 6], [6, 9], [3, 9]], pause: 0.8 },
      { waypoints: [[14, 6], [14, 8], [16, 8], [16, 6]], pause: 1.1 },
    ],
  },
  {
    name: 'Level 3 — The Vault',
    brief: 'Four guards, long sightlines. Run only when you must.',
    coneRange: 245,
    coneHalfAngle: 0.52,
    patrolSpeed: 92,
    chaseSpeed: 188,
    map: [
      '####################',
      '#P....#..C...#....*#',
      '#..##.#......#..B..#',
      '#..##...C..........#',
      '#.B..#..##...#..C..#',
      '#....#......B#.....#',
      '#..C....##....#..#.#',
      '#....#....#..C#..#.#',
      '#.B..#..B.#....#...#',
      '#.*..#....#..B.#.*E#',
      '####################',
    ],
    guards: [
      { waypoints: [[10, 1], [10, 3], [12, 3], [12, 1]], pause: 0.9 },
      { waypoints: [[2, 7], [6, 7], [6, 5], [2, 5]], pause: 0.8 },
      { waypoints: [[11, 5], [11, 8], [16, 8], [16, 5]], pause: 1.0 },
      { waypoints: [[14, 2], [14, 4], [11, 4], [11, 2]], pause: 0.7 },
    ],
  },
];

// Sanity-check a level map: 20x11, one start, one exit, three parcels.
export function validateLevel(level) {
  const problems = [];
  if (level.map.length !== ROWS) problems.push('map has ' + level.map.length + ' rows, want ' + ROWS);
  let starts = 0, exits = 0, parcels = 0;
  level.map.forEach((row, y) => {
    if (row.length !== COLS) problems.push('row ' + y + ' is ' + row.length + ' wide, want ' + COLS);
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === 'P') starts++;
      if (c === 'E') exits++;
      if (c === '*') parcels++;
      if ('#.CBP*E.'.indexOf(c) < 0) problems.push('row ' + y + ' col ' + x + ' has unknown tile ' + JSON.stringify(c));
    }
  });
  if (starts !== 1) problems.push('want 1 courier start, found ' + starts);
  if (exits !== 1) problems.push('want 1 exit, found ' + exits);
  if (parcels !== 3) problems.push('want 3 parcels, found ' + parcels);
  return problems;
}
