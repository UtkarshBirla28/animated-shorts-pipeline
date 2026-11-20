// kit/vehicles (TRAIN owner): the shared dimensions of the generic Tokyo 4-door commuter EMU (E231 / E233 / E235-like
// "wide body" stainless car, JR narrow gauge). One place for every number so the exterior, the interior, the cab and the
// film sets agree. Train-local frame: y = 0 at the TOP OF RAIL, the nose of car 1 at z = 0, the train extends toward +Z
// and runs toward -Z; x + = the train's right side (the driver sits on the LEFT, x < 0). Car-local z' = z - k * PITCH.
export const D = {
  gauge: 1.067,            // m, JR narrow gauge
  pitch: 20.0,             // car pitch (coupler to coupler)
  body0: 0.25, body1: 19.75, // mid-car body ends (car-local)
  floor: 1.13,             // floor above top of rail (E233: 1,130 mm)
  hw: 1.475,               // half body width (2,950 mm wide body)
  sideY0: 1.10, sideY1: 3.25, // flat side wall (above rail)
  sillY: 0.95, sillHW: 1.40, // the tapered skirt under the floor line
  eaveY: 3.45, eaveHW: 1.37, roofY: 3.62,
  wall: 0.065,             // body side thickness (outer skin to inner lining)
  doorW: 1.3, doorH: 1.85, // door opening (E233: 1,300 mm)
  leafW: 0.68,             // one door leaf (overlaps the opening by 3 cm)
  winY0: 0.83, winY1: 1.80, // side windows above the FLOOR
  // door-leaf glass above the floor: TALL (0.34..1.74 m) and 0.46 m wide. Not JR East practice (their door glass starts
  // at ~0.9 m); the film needs the 75 cm yellow suitcase readable BEHIND a closed door from the platform (frame 0).
  dwinY0: 0.15, dwinY1: 1.74, dwinW: 0.46,
  bandY0: -0.02, bandY1: 0.80, // the emerald LOWER BODY (floor line to just under the windows). LOOK v2 2026-11-20: was 0.62 (an 18 cm band); 0.40 in the first look test
  lineY0: 0.80, lineY1: 0.835, // a dark line under the windows (was 0.565 / 0.595)
  headY0: 2.055, headY1: 2.10, // the thin header band under the eave (above the floor)
  lampY: 1.975,            // car-side pilot lamp above the floor (in the fascia over the windows, mid-car)
  lampDZ: 0.74,            // ... its z offset behind the middle of the car side (beside the blank destination panel)
  wheelR: 0.43, wheelbase: 2.1, bogieHalf: 6.9,
  cabDepth: 2.15,          // partition position (car-local z') in a cab car
  innerHW: 1.405,          // the inner lining
  ceilC: 2.33, ceilS: 2.16, // ceiling height above the floor: centre / sides
};
/** the cab car's face (train frame; heights above the FLOOR unless noted): a flat face at z = zF between two rounded
 *  corner posts of radius rc; the body sides start at z = zB = zF + rc. Three windscreen panes in a black-glass panel
 *  (the middle one is the emergency door's), a blank destination window above. */
export const FACE = {
  zF: 0.06, zB: 0.2, rc: 0.14,
  waist: 0.92,                       // top of the lower (painted) face = bottom of the black panel
  panelTop: 2.26,                    // top of the black panel (the brow above is band-coloured)
  panes: [[-1.28, -0.31], [-0.25, 0.25], [0.31, 1.28]] as [number, number][],
  wy0: 0.98, wy1: 2.02,              // the panes
  dest: { x0: -0.55, x1: 0.55, y0: 2.10, y1: 2.23 },
  door: { x0: -0.3, x1: 0.3 },       // the emergency door's seams
};
/** door centres (car-local z') of a mid car and of a cab car (cab at z' = 0) */
export const DOORS_MID = [2.77, 7.59, 12.41, 17.23];
export const DOORS_CAB = [3.6, 8.42, 13.24, 18.06];
/** window spans (car-local z0, z1) between / beyond the doors; each pair splits into 2 panes by a mullion when wide */
export const windowsOf = (doors: number[], z0: number, z1: number, cab: boolean): [number, number][] => {
  const hw = D.doorW / 2, out: [number, number][] = [];
  const spans: [number, number][] = [];
  if (!cab) spans.push([z0, doors[0] - hw]);
  for (let i = 0; i < doors.length - 1; i++) spans.push([doors[i] + hw, doors[i + 1] - hw]);
  spans.push([doors[doors.length - 1] + hw, z1]);
  // the open leaves slide 0.66 m into the wall beside each door: no glass over the pockets
  spans.forEach(([a, b], i) => {
    const L = b - a, first = !cab && i === 0, last = i === spans.length - 1;
    if (L > 2.4) { const w = Math.min(2.2, L - 1.34), c = (a + b) / 2; out.push([c - w / 2, c + w / 2]); }
    else if (L > 1.45 && first) out.push([a + 0.12, a + 0.12 + Math.min(0.72, L - 0.86)]);       // car end: the door is on the b side
    else if (L > 1.45 && last) out.push([b - 0.12 - Math.min(0.72, L - 0.86), b - 0.12]);        // car end: the door is on the a side
  });
  return out;
};
export const BOGIES_MID = [10 - D.bogieHalf, 10 + D.bogieHalf];
export const BOGIES_CAB = [3.45, 16.95];
