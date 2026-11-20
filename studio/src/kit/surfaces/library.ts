// SURFACES library: the CC0 sets in public/kit/surfaces/<name>/ (Poly Haven + ambientCG, see public/kit/LICENSES.md) with
// their real-world tile size and the defaults the registry uses. Measured by tools/*.py (2026-11-19): `h` = the 0.5 / 99.5 %
// percentiles of the scan's displacement (normalised to 0..1 in the shader); CELL sets use the kit height map
// <name>_hgt_1k.png instead (a rounded bevel from the per-brick cell map: real joints) and get per-brick variation
// (+ <name>_cen_1k.png: offsets to each brick's centroid, for tilt and cracks).
export type SurfKind = "cell" | "hex" | "plain";
export type SurfDef = {
  /** real-world metres per texture repeat (Poly Haven "dimensions") */
  tileM: number;
  kind: SurfKind;
  /** which resolutions exist on disk (2k = near-lens sets) */
  res: ("2k" | "1k")[];
  /** displacement range of the scan (plain / hex sets); cell sets use [0, 1] of the kit height map */
  h?: [number, number];
  /** real relief (m) from the lowest joint to the top of the cell / surface */
  reliefM: number;
  /** per-cell height jitter (m), value / hue / roughness variation, odd-cell share */
  cellVar?: [number, number, number, number];
  cellHeightM?: number;
  /** per-cell tilt (m/m), missing share, cracked share, chipped share; outline warp (m); albedo saturation; edge dust */
  cellV2?: [number, number, number, number];
  warpM?: number;
  sat?: number;
  dust?: number;
  /** joint mask thresholds in height units (lo, hi) and how much joints darken */
  joint?: [number, number, number];
  /** hex bombing rotation share (0 = offsets only, 1 = any angle) */
  hexRot?: number;
  rough?: number; normal?: number; ao?: number; cavity?: number; metal?: number;
  tint?: [number, number, number];
  /** macro variation: amount, scale m, roughness, hue */
  macro?: [number, number, number, number];
  moss?: number; dirt?: number; porosity: number;
  /** what it is for (docs) */
  use: string;
  author: string; src: string;
};
export const LIBRARY = {
  brick_pavers: { tileM: 1.94, kind: "cell", res: ["2k", "1k"], reliefM: 0.014, cellHeightM: 0.003, cellVar: [0.13, 0.05, 0.2, 0.1], joint: [0.12, 0.5, 0.75], tint: [0.84, 0.76, 0.75], sat: 0.42, cellV2: [0.035, 0.012, 0.04, 0.4], warpM: 0.003, dust: 0.45, macro: [0.12, 4, 0.15, 0.4], moss: 0.75, dirt: 0.45, porosity: 0.7, cavity: 0.35, use: "red brick paving (stretcher bond), paths, plazas", author: "Dimitrios Savva", src: "short_bricks_floor" },
  herringbone_pavers: { tileM: 2.0, kind: "cell", res: ["1k"], reliefM: 0.01, cellHeightM: 0.002, cellVar: [0.14, 0.04, 0.15, 0.03], joint: [0.12, 0.45, 0.3], macro: [0.12, 4, 0.15, 0.4], moss: 0.6, dirt: 0.45, porosity: 0.7, use: "herringbone brick paving", author: "Charlotte Baglioni", src: "herringbone_pavement" },
  cobbles: { tileM: 2.0, kind: "cell", res: ["2k", "1k"], reliefM: 0.035, cellHeightM: 0.004, cellVar: [0.12, 0.04, 0.2, 0.05], joint: [0.12, 0.5, 0.3], macro: [0.14, 5, 0.2, 0.4], moss: 0.6, dirt: 0.6, porosity: 0.55, cavity: 0.3, use: "granite setts / old town street", author: "Rob Tuytel", src: "cobblestone_floor_08" },
  asphalt: { tileM: 3.0, kind: "hex", res: ["2k", "1k"], h: [0.322, 0.851], reliefM: 0.006, hexRot: 1, joint: [0.0, 0.25, 0.2], macro: [0.12, 8, 0.2, 0.25], moss: 0, dirt: 0.25, porosity: 0.9, use: "road surface (has cracks; add crack / oil / patch decals)", author: "Rob Tuytel", src: "asphalt_02" },
  concrete_sidewalk: { tileM: 1.8, kind: "cell", res: ["2k", "1k"], reliefM: 0.008, cellHeightM: 0.002, cellVar: [0.1, 0.02, 0.15, 0.06], joint: [0.12, 0.45, 0.35], macro: [0.1, 5, 0.15, 0.3], moss: 0.35, dirt: 0.5, porosity: 0.7, use: "concrete slab pavement (sidewalks, platforms)", author: "Charlotte Baglioni", src: "concrete_pavement" },
  concrete_floor: { tileM: 3.0, kind: "hex", res: ["2k", "1k"], h: [0.341, 0.545], reliefM: 0.003, hexRot: 1, joint: [0.0, 0.2, 0.1], macro: [0.1, 6, 0.2, 0.25], moss: 0.1, dirt: 0.3, porosity: 0.7, use: "worn concrete (kerbs, gutters, sleepers, copings, garage floors, plinths)", author: "Dimitrios Savva, Rico Cilliers", src: "concrete_floor_worn_001" },
  gravel: { tileM: 2.0, kind: "hex", res: ["2k", "1k"], h: [0.38, 0.839], reliefM: 0.02, hexRot: 1, joint: [0.0, 0.3, 0.2], macro: [0.12, 4, 0.1, 0.3], moss: 0.1, dirt: 0.2, porosity: 0.6, use: "loose gravel / stone chippings", author: "Amal Kumar", src: "gravel_stones" },
  dirt_path: { tileM: 2.07, kind: "hex", res: ["2k", "1k"], h: [0.337, 0.639], reliefM: 0.015, hexRot: 1, joint: [0.0, 0.3, 0.1], macro: [0.15, 4, 0.1, 0.35], moss: 0.15, dirt: 0.1, porosity: 0.85, use: "packed earth path / dirt track", author: "eye-candy.xyz", src: "dirt_floor" },
  sand: { tileM: 1.5, kind: "hex", res: ["1k"], h: [0.102, 1.0], reliefM: 0.01, hexRot: 1, macro: [0.12, 5, 0.1, 0.3], moss: 0, dirt: 0, porosity: 0.8, use: "sand (beach, sandpit)", author: "Rob Tuytel", src: "sand_01" },
  rock: { tileM: 2.7, kind: "hex", res: ["1k"], h: [0.212, 0.851], reliefM: 0.05, hexRot: 1, macro: [0.15, 5, 0.15, 0.35], moss: 0.4, dirt: 0.2, porosity: 0.4, use: "rock face / boulders", author: "Dario Barresi, Rico Cilliers", src: "rock_face_03" },
  lawn_soil: { tileM: 2.0, kind: "hex", res: ["2k", "1k"], h: [0.184, 0.608], reliefM: 0.015, hexRot: 1, macro: [0.18, 5, 0.1, 0.5], moss: 0, dirt: 0, porosity: 0.7, use: "lawn ground under NATURE's blades / far lawn", author: "Charlotte Baglioni", src: "leafy_grass" },
  leaf_litter: { tileM: 3.0, kind: "hex", res: ["1k"], h: [0.133, 0.816], reliefM: 0.02, hexRot: 1, macro: [0.15, 5, 0.1, 0.4], moss: 0, dirt: 0, porosity: 0.6, use: "forest floor / leaf litter ground", author: "Rob Tuytel", src: "forest_leaves_02" },
  planks: { tileM: 2.0, kind: "cell", res: ["2k", "1k"], reliefM: 0.006, cellHeightM: 0.0015, cellVar: [0.18, 0.05, 0.2, 0.06], joint: [0.12, 0.45, 0.4], macro: [0.1, 4, 0.15, 0.3], moss: 0.2, dirt: 0.3, porosity: 0.6, use: "weathered outdoor boards (deck, boardwalk, bench, fence)", author: "Dario Barresi, Dimitrios Savva", src: "weathered_planks" },
  wood_floor: { tileM: 2.0, kind: "cell", res: ["2k", "1k"], reliefM: 0.003, cellHeightM: 0.0006, cellVar: [0.14, 0.05, 0.2, 0.03], joint: [0.12, 0.45, 0.45], macro: [0.08, 3, 0.2, 0.25], moss: 0, dirt: 0.15, porosity: 0.4, use: "interior wood floorboards (worn)", author: "Dimitrios Savva", src: "wood_floor_worn" },
  floor_tiles: { tileM: 3.0, kind: "cell", res: ["2k", "1k"], reliefM: 0.003, cellHeightM: 0.0005, cellVar: [0.05, 0.02, 0.15, 0.02], joint: [0.12, 0.45, 0.4], macro: [0.06, 3, 0.2, 0.2], moss: 0, dirt: 0.2, porosity: 0.2, use: "checker marble floor tiles (hall, kitchen, cafe)", author: "Rob Tuytel", src: "floor_tiles_06" },
  carpet: { tileM: 0.6, kind: "hex", res: ["1k"], h: [0.369, 0.698], reliefM: 0.004, hexRot: 0, macro: [0.08, 2, 0.05, 0.2], moss: 0, dirt: 0.1, porosity: 0.5, use: "dark carpet / rug field (tint it)", author: "Rohit Seervi", src: "dirty_carpet" },
  plaster: { tileM: 3.2, kind: "hex", res: ["2k", "1k"], h: [0.592, 0.608], reliefM: 0.001, hexRot: 1, macro: [0.06, 3, 0.1, 0.15], moss: 0, dirt: 0.2, porosity: 0.5, use: "interior plaster wall (tint for paint colour; wallpaper = canvas over it)", author: "Rob Tuytel", src: "plastered_wall_04" },
  painted_wall: { tileM: 2.0, kind: "hex", res: ["2k", "1k"], h: [0.706, 0.812], reliefM: 0.002, hexRot: 1, macro: [0.1, 4, 0.1, 0.25], moss: 0.1, dirt: 0.35, porosity: 0.5, use: "exterior painted render (facades)", author: "Amal Kumar", src: "painted_plaster_wall" },
  brick_wall: { tileM: 2.01, kind: "cell", res: ["2k", "1k"], reliefM: 0.012, cellHeightM: 0.0015, cellVar: [0.14, 0.05, 0.15, 0.04], joint: [0.12, 0.45, 0.3], macro: [0.1, 5, 0.1, 0.35], moss: 0.15, dirt: 0.35, porosity: 0.7, cavity: 0.3, use: "red brick facade / garden wall", author: "Rob Tuytel, Matterfield", src: "brick_wall_09" },
  painted_brick: { tileM: 1.8, kind: "cell", res: ["1k"], reliefM: 0.01, cellHeightM: 0.001, cellVar: [0.06, 0.02, 0.1, 0.02], joint: [0.12, 0.45, 0.25], macro: [0.1, 4, 0.1, 0.25], moss: 0.05, dirt: 0.3, porosity: 0.5, use: "painted brick (blue scan; tint toward white / cream)", author: "Amal Kumar", src: "painted_brick" },
  stone_wall: { tileM: 2.0, kind: "cell", res: ["2k", "1k"], reliefM: 0.03, cellHeightM: 0.006, cellVar: [0.12, 0.04, 0.15, 0.05], joint: [0.12, 0.45, 0.3], macro: [0.12, 5, 0.1, 0.35], moss: 0.4, dirt: 0.3, porosity: 0.5, use: "rubble stone wall (garden walls, old houses)", author: "Dario Barresi, Charlotte Baglioni", src: "stone_wall" },
  stone_trim: { tileM: 3.0, kind: "cell", res: ["1k"], reliefM: 0.006, cellHeightM: 0.001, cellVar: [0.07, 0.02, 0.1, 0.03], joint: [0.12, 0.45, 0.3], macro: [0.1, 4, 0.1, 0.25], moss: 0.1, dirt: 0.35, porosity: 0.5, use: "sandstone blocks: sills, lintels, cornices, plinths, kerbs, steps", author: "Rob Tuytel", src: "sandstone_blocks_08" },
  roof_tiles: { tileM: 2.5, kind: "cell", res: ["1k"], reliefM: 0.025, cellHeightM: 0.004, cellVar: [0.14, 0.05, 0.15, 0.05], joint: [0.12, 0.45, 0.3], macro: [0.12, 5, 0.1, 0.3], moss: 0.3, dirt: 0.2, porosity: 0.6, use: "clay roof tiles", author: "Amal Kumar", src: "clay_roof_tiles_02" },
  roof_slates: { tileM: 3.0, kind: "cell", res: ["1k"], reliefM: 0.01, cellHeightM: 0.002, cellVar: [0.12, 0.03, 0.15, 0.04], joint: [0.12, 0.45, 0.3], macro: [0.1, 5, 0.1, 0.3], moss: 0.25, dirt: 0.2, porosity: 0.4, use: "slate roof", author: "Rob Tuytel", src: "roof_slates_02" },
  corrugated_metal: { tileM: 1.12, kind: "plain", res: ["1k"], h: [0.055, 0.945], reliefM: 0.018, metal: 1, macro: [0.1, 4, 0.2, 0.2], moss: 0, dirt: 0.3, porosity: 0.1, use: "corrugated iron (sheds, fences, roofs)", author: "Jenelle van Heerden, Dimitrios Savva", src: "corrugated_iron" },
  painted_metal: { tileM: 2.0, kind: "plain", res: ["1k"], h: [0.047, 0.855], reliefM: 0.006, macro: [0.08, 4, 0.15, 0.2], moss: 0, dirt: 0.3, porosity: 0.1, use: "painted metal roller shutter (shop fronts)", author: "Dario Barresi, Rico Cilliers, Charlotte Baglioni", src: "painted_metal_shutter" },
  rusty_metal: { tileM: 1.0, kind: "hex", res: ["1k"], h: [0.086, 0.843], reliefM: 0.002, hexRot: 1, macro: [0.12, 3, 0.2, 0.2], moss: 0, dirt: 0.2, porosity: 0.3, use: "rusty sheet metal (bins, grates, old signs)", author: "Rob Tuytel", src: "rusty_metal_02" },
  marble: { tileM: 1.5, kind: "cell", res: ["1k"], reliefM: 0.003, cellHeightM: 0.0005, cellVar: [0.06, 0.02, 0.1, 0.02], joint: [0.12, 0.45, 0.35], macro: [0.06, 3, 0.15, 0.2], moss: 0, dirt: 0.15, porosity: 0.15, use: "beige stone / marble tiles (lobby floors, steps)", author: "Rob Tuytel", src: "marble_01" },
  fabric: { tileM: 0.4, kind: "plain", res: ["1k"], reliefM: 0.001, macro: [0.05, 1, 0.05, 0.1], moss: 0, dirt: 0, porosity: 0.5, use: "checked cotton (tablecloths, cushions, awnings when tinted)", author: "Rob Tuytel", src: "fabric_pattern_07" },
  concrete_wall: { tileM: 2.71, kind: "hex", res: ["1k"], h: [0.553, 0.624], reliefM: 0.002, hexRot: 1, macro: [0.1, 5, 0.15, 0.25], moss: 0.1, dirt: 0.4, porosity: 0.6, use: "exterior concrete wall", author: "Dario Barresi, Charlotte Baglioni", src: "concrete_wall_008" },
  // ---- added for "Why Japanese Train Drivers Point at Nothing" (2026-11-19) ----
  tactile_paving: { tileM: 1.5, kind: "plain", res: ["2k", "1k"], h: [0.078, 0.957], reliefM: 0.005, macro: [0.1, 4, 0.15, 0.2], sat: 0.85, moss: 0, dirt: 0.3, porosity: 0.3, use: "yellow tactile GUIDANCE blocks (raised bars, 30 cm tiles) for Japanese platforms; rot PI/2 turns the bars", author: "ambientCG (Lennart Demes)", src: "TactilePaving005" },
  subway_tiles: { tileM: 1.5, kind: "plain", res: ["2k", "1k"], h: [0.02, 0.98], reliefM: 0.004, macro: [0.06, 3, 0.2, 0.15], moss: 0, dirt: 0.5, porosity: 0.1, use: "white glazed wall tiles (15 cm, station / subway walls); add dirt.bottom + grime + streaks", author: "ambientCG (Lennart Demes)", src: "Tiles036" },
  steel_brushed: { tileM: 1.0, kind: "plain", res: ["1k"], h: [0.012, 0.306], reliefM: 0.0005, metal: 1, macro: [0.05, 2, 0.3, 0.05], moss: 0, dirt: 0.1, porosity: 0.05, use: "brushed stainless steel (train interior poles / panels, kitchen, handrails)", author: "ambientCG (Lennart Demes)", src: "Metal012" },
  vinyl_speckled: { tileM: 1.0, kind: "hex", res: ["2k", "1k"], h: [0.455, 0.988], reliefM: 0.001, hexRot: 1, macro: [0.06, 3, 0.2, 0.1], tint: [0.62, 0.66, 0.72], sat: 0.6, moss: 0, dirt: 0.25, porosity: 0.1, use: "speckled vinyl / terrazzo floor (train carriage floor: tinted grey-blue, sat 0.6)", author: "ambientCG (Lennart Demes)", src: "Terrazzo005" },
  ballast: { tileM: 3.2, kind: "hex", res: ["2k", "1k"], h: [0.208, 0.741], reliefM: 0.04, hexRot: 1, macro: [0.15, 4, 0.1, 0.25], tint: [0.9, 0.9, 0.92], sat: 0.6, moss: 0.05, dirt: 0.3, porosity: 0.4, use: "railway ballast (grey crushed stone bed; ground.ts railTrack)", author: "ambientCG (Lennart Demes)", src: "Gravel040" },
  worktop_laminate: { tileM: 1.0, kind: "hex", res: ["1k"], h: [0.494, 0.506], reliefM: 0.0003, hexRot: 1, macro: [0.04, 2, 0.2, 0.05], rough: 6, moss: 0, dirt: 0.05, porosity: 0.05, use: "laminated kitchen worktop (granite-look; rough x6 = satin laminate, tint for colour)", author: "ambientCG (Lennart Demes)", src: "Granite002A" },
  tunnel_concrete: { tileM: 2.0, kind: "hex", res: ["2k", "1k"], h: [0.749, 0.910], reliefM: 0.004, hexRot: 1, macro: [0.15, 4, 0.2, 0.2], tint: [0.7, 0.7, 0.72], moss: 0.05, dirt: 0.6, porosity: 0.6, use: "dark grimy tunnel / underpass concrete (dirt.grime 0.4 + streaks 0.5 + bottom dirt)", author: "Dario Barresi, Charlotte Baglioni", src: "concrete_wall_006" },
} satisfies Record<string, SurfDef>;
export type SurfName = keyof typeof LIBRARY;
export const SURF_NAMES = Object.keys(LIBRARY) as SurfName[];
