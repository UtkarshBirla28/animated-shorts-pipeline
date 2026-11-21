// v4 SET ENTRY 'steam' (owner TRAIN; briefs/v3/pointing/V4_STRUCTURE.md): WHERE IT CAME FROM, lines 13-18 of the v4
// script (shots v22 .. v30 of v4/shot_plan.ts). The geometry is the shared set ../../sets/steam.ts (the black 4-4-0, the
// rice country, the semaphore); THIS file stages it on the v4 clock: who stands where in each shot (STAGE), CAST's v4
// beats (cast/beats_v4.ts, cued on words) on the crew, the props a shot needs (a soft-blur semaphore + a misted round
// window for his view, white egrets lifting off the paddy in the event picture), and the cameras (CAMS, keyed on the v4
// shot ids: ONE glide, then the director's rest).
// NOTHING is typed in frames or seconds: a shot's staging is looked up from the shot that holds the frame (shotOfFrame),
// prop times are offsets from the shot's own cut (cutS), so a re-timed script / voice moves everything by itself.
// Loco frame: rail top y 0, the front buffer beam z 0, the train runs toward -Z, the driver on the LEFT (x < 0), the cab
// z 6.25..7.95 (floor 1.38, roof 3.32, half width 1.18), the round spectacle windows at (+-0.82, 2.72, 6.25) r 0.17,
// the left side's lower cut-out (the entrance) z 7.30..7.83, the tender from z 8.25.
import * as THREE from "three";
import type { Built, CamState, KitCtx, V3 } from "../../../../kit/core/ctx";
import { withShake } from "../../../../kit/core/camera";
import { birds } from "../../../../kit/fx/birds";
import { GROUND_Y } from "../../../../kit/vehicles/steam_world";
import { buildSteamWith, CREW_DEFAULT, STEAM_PLAN, STEAM_RIG, type CrewPlan, type SteamCaster } from "../../sets/steam";
import type { Beat } from "../../cast/moves";
import { R_V4 } from "../resolver";
import { FPS, cutS, cutE, shotOfFrame, FRAMES } from "../timeline";
import { easeGlide, restFrames, type ShotCam, type View } from "../camkit";

const F = 1.38, P = Math.PI;
const AWAY: V3 = [-50, -10, -50];
/** where Hori's eyes go when he searches the line ahead (the semaphore side, far) */
const AHEAD: V3 = [-3.1, 5.0, -80];
const HORI_HEAD: V3 = [-0.6, 2.95, 6.62];
const yawTo = (from: V3, to: V3) => Math.atan2(to[0] - from[0], to[2] - from[2]);

// ================================================================ STAGE: who stands where in each v4 shot
/** the lenses (also used to turn the people toward / away from them) */
export const VIEWS: Record<string, View & { b?: View; roll?: number; shake?: number; focus?: number }> = {
  // v22 THE EVENT: low over the left paddy, close on the front three-quarter, the horizon tilted a touch; the lens falls
  // back a little as the engine thunders at it (one glide), then rests
  v22: { pos: [-9.6, 0.45, -10.6], look: [0.0, 1.7, 4.2], fov: 50, roll: -0.05, shake: 0.1, b: { pos: [-9.9, 0.5, -9.4], look: [0.0, 1.75, 4.6], fov: 49 } },   // (audit r1: the whole engine + the plume in frame, grass in the bottom quarter)
  // ---- THE CAB SHOTS (lead round 4: "a big red slab cuts a third of the frame, the driver seen from behind"): WIDE
  // SIDE CUT-AWAYS. The lens stands outside the LEFT side (its sheets hidden: CrewPlan.cutaway), high enough (~2.85 m)
  // that the right-hand opening shows green country under blue sky; the whole cab in frame, both men whole and medium
  // (head ~1/7 of the height), the cab floor above the caption band (~63 %), the wheels + rods turning below it.
  // Screen right = +Z (the tender), screen left = the boiler + the round windows.
  // v23 HORI AT THE LITTLE ROUND WINDOW: the whole cab side-on; Hori at the left round window, head pushed forward,
  // peering (CAST's "peer"); the coal man shovelling at the back right; the fire between them. One push in
  // (audit r1: "no round window visible, he sniffs a wall"): OVER HIS SHOULDER inside the cab: his head pushed toward the
  // bright little round window in the dark front plate
  v23: { shake: 0.4, pos: [1.82, 2.98, 8.3], look: [-0.8, 2.72, 6.35], fov: 50, b: { pos: [1.6, 2.95, 8.05], look: [-0.8, 2.72, 6.35], fov: 49 } },   // (pass 14: square from the right the round window was edge-on: 3/4 from behind-right, outside (cutawayR): his profile pushed toward the little round window beside it)
  // v23b HIS VIEW: through the round window from just behind it: the black front plate round the misted glass, the line
  // ahead, the semaphore a soft blur (its stand-in). A held POV with the cab's shake only (focus on the glass: at final
  // the world goes soft too)
  v23b: { pos: [-0.72, 2.5, 6.86], look: [-0.826, 2.718, 6.247], fov: 70, shake: 0.22, focus: 0.62, fnum: 1.4 },   // (R2b: lower: the line through the glass climbs over the boiler to the semaphore, which is the SUBJECT, centred)
  // v24 HE TURNS AND SHOUTS ACROSS THE CAB: the cut-away from behind-left (three-quarter): his face toward us as he
  // turns to the coal man, the backhead with the fire beside him. No move (the director's drift)
  // (lead 00:55: "five shots, one picture": v24 is now a CLOSER two-shot on him turning to shout, waist up, his face
  // toward this lens, the coal man at the right edge; head ~1/4)
  v24: { shake: 0.45, pos: [-3.35, 3.0, 9.15], look: [-0.25, 2.55, 7.05], fov: 44 },   // (R2b: tighter: heads >= 15 %, less smoke + bare deck)
  // v25 THE COAL MAN MID-SHOVEL HEARS IT: the side cut-away square on: the two men face each other (three-quarter to
  // us), the fire glowing between them at the backhead, the country through the right opening. One push in
  // (audit r1: v25 had v23's lens): FROM BEHIND, over the fall plate: the fire in the backhead the warm centre, Hori
  // turned back shouting at the coal man, who freezes mid-shovel and looks up
  v25: { shake: 0.4, pos: [-5.55, 2.87, 7.06], look: [-0.5, 2.3, 6.97], fov: 38, b: { pos: [-4.98, 2.8, 7.03], look: [-0.5, 2.32, 6.97], fov: 38 } },   // (R2 RE-STAGE wide side cut-away; R2b tighter: heads ~16 %; Hori's cap clear of the left edge)
  // v26 HE LEANS OUT AND LOOKS AT THE POST: from behind the cab on the left, over his shoulder: him leaning out of the
  // entrance, the black boiler side, the semaphore ahead with its arm lowered (clear). A slow slide
  v26: { pos: [-1.72, 3.02, 7.55], look: [-2.7, 3.1, -20], fov: 50, b: { pos: [-1.78, 3.0, 7.2], look: [-2.7, 3.1, -20], fov: 50 } },   // (R2: the view down the line from the left entrance: the semaphore + the track streaming, NO people)
  // v27 "CLEAR!": from outside ahead-left, his huge grin; the black cab side + brass, smoke streaming. No move
  v27: { pos: [-3.45, 2.45, 4.75], look: [-1.15, 2.62, 7.7], fov: 39 },   // (R2: lower; the grab rail off his body: he stands 15 cm further back)
  // v28 THE BOSS SQUEEZED INTO THE BACK CORNER: the whole cab side-on, three men: Hori at his window (left), the coal man
  // shovelling (middle), the boss in the back corner (right), three-quarter to us, delighted. One push in
  // (lead 00:55: v28 / v29 from ANOTHER SIDE: inside from the front-left corner (where Hori stands: he is behind the
  // lens), looking back: the boss squeezed into the back-right corner, the coal man at the tender, the countryside
  // streaming past the openings behind them. One push toward the boss)
  v28: { shake: 0.45, pos: [0.25, 3.5, 10.2], look: [0.3, 2.6, 6.9], fov: 64, b: { pos: [0.25, 3.45, 9.8], look: [0.3, 2.62, 6.9], fov: 63 } },   // (R2b RE-STAGE: from over the tender looking forward: nobody faces the lens; the boss clear of the right edge, less floor)
  // v29 HE WRITES "RULE": closer on the boss (head ~1/5), the notebook at his chest; a slow push toward it
  // v29: THE NOTEBOOK, its own close picture: "RULE" written + underlined at his chest, his grin at the top edge
  v29: { pos: [-0.37, 2.62, 6.46], look: [0.62, 2.5, 7.72], fov: 60, b: { pos: [-0.27, 2.6, 6.58], look: [0.62, 2.5, 7.72], fov: 60 } },   // (lead 02:15: the NOTEBOOK + his hands under his WHOLE face (r6: the page sits right under his chin, so "face out of frame" cut his mouth; the cab is too short to go wider than ~1/3 head)
  // v30 THE HELD PICTURE (the funniest of the film): side-on, a little closer than v23: Hori nose to the little round
  // window (profile, screen left), the boss right behind him beaming (three-quarter to us). Still (the director's pull)
  // (lead 00:55: its OWN framing): from outside the RIGHT side looking in across the cab (both side sheets hidden:
  // the country behind them): Hori big in profile at the right, nose to the front plate by his little round window,
  // peering; the boss right behind him, three-quarter to us, beaming. Heads ~1/4. Still (the director's pull)
  v30: { shake: 0.3, pos: [0.6, 2.93, 6.48], look: [-0.6, 2.86, 6.95], fov: 58 },   // (R2 RE-STAGE: by the front plate right of him: Hori's FACE big in the foreground, eyes open looking ahead, the proud boss small behind)
};
const posOf = (id: string) => VIEWS[id]?.pos ?? [0, 2.5, 12];

/** the crew per shot (CrewPlan of ../../sets/steam.ts). Hori never points (hands on the lever / the rail) */
export const STAGE: Record<string, CrewPlan> = {
  // v22: Hori leans from the left opening (small at the cab), the coal man at work
  v22: { noPoles: true, hori: { pos: [-1.0, F, 6.9], yaw: -(P - 0.5), look: AHEAD }, fireman: { pos: [0.4, F, 7.4], yaw: P - 0.3 }, official: null, shovel: true, cocks: 0 },
  // v23: at the left round window, facing forward (profile to the side lens, a touch toward us), peering (CAST's
  // "peer"); the coal man at the back right, shovelling, three-quarter to us
  v23: { hori: { pos: [-0.72, F, 6.97], yaw: P - 0.3, look: [-0.82, 2.72, 6.0] }, fireman: { pos: [0.45, F, 8.1], yaw: P }, official: null, shovel: true, signal: 140, cocks: 0, fire: 1.6, cutaway: true, cutawayR: true },
  // v23b: his view: he is the lens (his card parked away); the semaphore is the soft-blur stand-in
  v23b: { hori: { pos: AWAY, yaw: P }, fireman: { pos: [0.6, F, 7.75], yaw: P - 0.3 }, official: null, shovel: true, signal: 30, hideSignal: true, noPoles: true },
  // v24: turned from the window toward the coal man (back right), shouting; his face toward the behind-left lens
  v24: { hori: { pos: [-0.55, F, 6.72], yaw: -0.55, look: [0.25, 2.9, 7.5] }, fireman: { pos: [0.32, F, 7.42], yaw: P + 0.3, look: HORI_HEAD }, official: null, shovel: true, cutaway: true, cocks: 0 },
  // v25: the two face each other, three-quarter to the side lens: Hori front-left, the coal man back right, shovel loaded
  v25: { hori: { pos: [-0.6, F, 6.66], yaw: -0.3, look: [0.25, 2.9, 7.5] }, fireman: { pos: [0.28, F, 7.5], yaw: P + 0.35, look: HORI_HEAD }, official: null, shovel: true, cutaway: true, cocks: 0, fire: 2.2 },
  // v26: the coal man leans out of the left entrance, looking ahead at the post; Hori back at his window
  v26: { hori: { pos: AWAY, yaw: P }, fireman: { pos: AWAY, yaw: P }, official: null, shovel: false, signal: 18, cocks: 0 },
  // v27: the same place, turned a little toward us (front three-quarter), bellowing "Clear!"
  v27: { hori: { pos: [-0.62, F, 6.55], yaw: P, look: AHEAD }, fireman: { pos: [-1.2, F, 7.71], yaw: yawTo([-1.2, F, 7.71], VIEWS.v27.pos) - 0.25, look: HORI_HEAD }, official: null, shovel: false, signal: 40 },
  // v28 / v29: the boss in the back-right corner facing the cab, beaming at Hori; the coal man beside him at work;
  // Hori at his window, behind this lens
  // (lead 00:55: back to the front-corner lens looking back: Hori behind the lens)
  v28: { noPoles: true, hori: { pos: [-0.72, F, 6.8], yaw: -P / 2, look: [-4, 3.0, 4.0] }, fireman: { pos: [0.55, F, 6.7], yaw: -2.1, look: [0, 1.86, 6.33] }, official: { pos: [0.8, F, 7.75], yaw: -2.13, look: HORI_HEAD }, shovel: true, cocks: 0, fire: 1.8 },   // (R2b: Hori in profile shouting out of his left side; the coal man low by the firehole, side-on; the boss foreground right, profile, watching Hori)
  v29: { hori: { pos: AWAY, yaw: P }, fireman: { pos: AWAY, yaw: P },   // (r7: his face was cut by the right edge of the notebook close)
    official: { pos: [0.8, F, 7.72], yaw: yawTo([0.8, F, 7.72], VIEWS.v29.pos) + 0.1, look: [0.62, 2.28, 7.5] }, shovel: true },
  // v30: Hori nose to the round glass (profile, screen left), the boss right behind him, three-quarter to us, beaming
  // at the back of his head; the coal man at the back right
  v30: { hori: { pos: [-0.66, F, 6.9], yaw: P - 0.6, look: AHEAD }, fireman: { pos: AWAY, yaw: P }, official: { pos: [-1.0, F, 7.55], yaw: yawTo([-1.0, F, 7.55], [0.6, 2.93, 6.48]) - 0.2, look: HORI_HEAD }, shovel: false, cocks: 0, fire: 2.0 },
};
/** the staging at film time t: the shot that holds the frame, else the set default. A shot's `signal` is the
 *  semaphore's distance ahead ON THE CUT: it then comes closer at the train's speed (the world streams; it must too) */
export const crewAt = (t: number): CrewPlan => {
  const id = shotOfFrame(Math.floor(t * FPS + 1e-6)), p = STAGE[id];
  if (!p) return CREW_DEFAULT;
  const q0 = p.signal === undefined ? p : { ...p, signal: p.signal - STEAM_PLAN.speed * Math.max(0, t - cutS(id)) };
  const q = id === "v23b" ? { ...q0, hideSignal: t >= cutS(id) + V23B_SHARP_S } : q0;
  // v27 (DIRECTOR 05:00: the shot now opens on the end of "man."): the coal man TURNS from looking down the line to us
  // in its first frames (a 5-frame snap, cued on the shot's own cut), then grins on his "Clear!" (CAST)
  if (id === "v27") { const u = Math.min(1, Math.max(0, (t - cutS(id) - 1 / FPS) / (5 / FPS))), k = u * u * (3 - 2 * u);
    const d = Math.atan2(Math.sin(q.fireman.yaw - P), Math.cos(q.fireman.yaw - P));   // the short way round
    return { ...q, fireman: { ...q.fireman, yaw: P + d * k } }; }
  return q;
};
const inShot = (id: string, t: number) => FRAMES[id] !== undefined && t >= cutS(id) && t < cutE(id);
/** v23b: seconds the real semaphore is shown sharp before it smears */
const V23B_SHARP_S = 0.3;
void posOf;

/** per-shot light for the DIRECTOR to merge into the shot's rigOpts (film.ts does not read it yet: asked in the report).
 *  The sun: from ahead-left for the exteriors (the engine's front + left side lit), from the right for the cab inside
 *  (gold through the right opening onto the men) */
export const RIGOPTS: Record<string, Partial<typeof STEAM_RIG & { sunAz: number; sunEl: number }>> = {
  v22: { sunAz: 40, sunEl: 22, exposure: 0.72 },
  v23: { sunAz: -60, sunEl: 18, exposure: 0.84 }, v23b: { sunAz: -20, sunEl: 14, exposure: 0.85 },
  v24: { sunAz: -60, sunEl: 18, exposure: 0.84 }, v25: { sunAz: -60, sunEl: 18, exposure: 0.82 },
  v26: { sunAz: 35, sunEl: 20, exposure: 0.74 }, v27: { sunAz: 35, sunEl: 20, exposure: 0.74 },
  v28: { sunAz: -60, sunEl: 18, exposure: 0.84 }, v29: { sunAz: -60, sunEl: 18, exposure: 0.84 }, v30: { sunAz: 25, sunEl: 16, exposure: 0.8 },
};

// ================================================================ THE BUILD
const CREW_WHO = ["hori", "fireman", "official"] as const;
export const build = async (ctx: KitCtx): Promise<Built> => {
  // CAST's v4 beats for the crew (cast/beats_v4.ts on the v4 clock), loaded inside the builder (no import cycle)
  const [{ castCardOf }, MV, { BEATS_V4 }] = await Promise.all([import("../../cast/member"), import("../../cast/moves"), import("../../cast/beats_v4")]);
  const mine: Beat[] = BEATS_V4.filter((b) => (CREW_WHO as readonly string[]).includes(b.who));
  const timed = MV.timeBeats(mine, R_V4);
  for (const t of timed) if (!t.ok || t.why) console.warn(`[steam v4] beat ${t.b.who} ${t.b.m}: ${t.ok ? "" : "NOT PLAYED "}${t.why ?? ""} (f ${t.f0}-${t.f1})`);
  const cast: SteamCaster = (c, who, o) => castCardOf(c, who, o, (e) => MV.actBeats(who, timed, e));
  const base = await buildSteamWith({ crew: crewAt, cast })(ctx);
  const root = new THREE.Group(); root.name = "set:steam_v4"; root.add(base.object);
  const ups: ((t: number, cam: THREE.Camera) => void)[] = base.update ? [base.update] : [];

  // ---- v23b: the soft-blur semaphore (its real one is hidden in that shot) + the misted round glass
  const blurTex = (px: number) => {
    const cv = document.createElement("canvas"); cv.width = 320; cv.height = 840; const g = cv.getContext("2d")!;
    const src = document.createElement("canvas"); src.width = 320; src.height = 840; const s = src.getContext("2d")!;
    const M = 80, X0 = 220, Y0 = 820;   // 80 px per metre, the post's foot at (220, 820)
    s.fillStyle = "#2e2e30"; s.fillRect(X0 - 0.16 * M, Y0 - 8.2 * M, 0.32 * M, 8.2 * M);   // (audit r1: a DARK post: the pale one was the faintest thing in the frame)
    s.fillStyle = "#151515"; s.beginPath(); s.moveTo(X0 - 0.2 * M, Y0 - 8.2 * M); s.lineTo(X0 + 0.2 * M, Y0 - 8.2 * M); s.lineTo(X0, Y0 - 8.65 * M); s.fill();
    s.save(); s.translate(X0, Y0 - 7.2 * M); s.rotate(-P / 4 + P);   // the arm points left and is LOWERED 45 deg (clear)
    s.fillStyle = "#d22a1e"; s.fillRect(-0.15 * M, -0.2 * M, 1.9 * M, 0.4 * M); s.fillStyle = "#f4f1ea"; s.fillRect(1.4 * M, -0.2 * M, 0.2 * M, 0.4 * M); s.restore();
    g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); g.filter = "none";
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const blurMat = (px: number) => new THREE.MeshBasicMaterial({ map: blurTex(px), transparent: true, depthWrite: false, color: new THREE.Color(0.8, 0.8, 0.8) });
  const soft = blurMat(12), lessSoft = blurMat(12), sharp = blurMat(0);   // (R2: a heavy DOUBLE image, two soft copies apart; R2b: a sharp copy first)
  const mkSign = (m: THREE.Material, order: number) => { const me = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 10.5), m); me.renderOrder = order; root.add(me); return me; };
  const signA = mkSign(soft, 3), signB = mkSign(lessSoft, 4), signS = mkSign(sharp, 5);
  const frost = (() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d")!;
    const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, "rgba(232,238,244,0.1)"); gr.addColorStop(0.7, "rgba(226,232,240,0.22)"); gr.addColorStop(1, "rgba(220,226,236,0.45)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    // two light soot smudges on the glass (soot only as light smudges: the fact-checker)
    for (const [x, y, r] of [[70, 180, 40], [190, 70, 30]] as [number, number, number][]) { const s = g.createRadialGradient(x, y, 2, x, y, r); s.addColorStop(0, "rgba(90,84,80,0.18)"); s.addColorStop(1, "rgba(90,84,80,0)"); g.fillStyle = s; g.fillRect(0, 0, 256, 256); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    const me = new THREE.Mesh(new THREE.CircleGeometry(0.172, 48), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    me.position.set(-0.82, 2.72, 6.32); me.renderOrder = 6; root.add(me); return me;
  })();
  ups.push((t) => {
    // (R2b: the semaphore is the SUBJECT of his view): a stand-in at a FIXED place on the line through the window (its
    // arm at the window's centre, 9.5 m from his eye): SHARP for V23B_SHARP_S, then two soft copies drifting apart
    const inside = inShot("v23b", t), smear = inside && t >= cutS("v23b") + V23B_SHARP_S;
    signS.visible = inside && !smear; signA.visible = signB.visible = smear; frost.visible = inside;
    if (!inside) return;
    const C: V3 = [-2.25, 3.45, -1.95];   // the plane centre: the arm's middle sits on the window line
    signS.position.set(C[0], C[1], C[2] + 0.02);
    const k = smear ? Math.min(1, (t - cutS("v23b") - V23B_SHARP_S) / 0.3) : 0, ease = k * k * (3 - 2 * k);
    signA.position.set(C[0] - 0.45 * ease, C[1] + 0.1 * ease, C[2]); signB.position.set(C[0] + 0.45 * ease, C[1] - 0.1 * ease, C[2] + 0.01);
    (soft as THREE.MeshBasicMaterial).opacity = 1; (lessSoft as THREE.MeshBasicMaterial).opacity = 0.85;
  });

  // ---- v23b (FIX R1, "the world must move": his view held still for 21 % of its frame pairs): steam wisps blowing back
  // across the little round window from a leak just ahead of it (only on in that shot)
  {
    const { wisp } = await import("../../../../kit/vehicles/steam_fx");
    const w23b = [[-0.6, 2.95, 5.6]].map((p, i) => { const w = wisp(ctx, { pos: p as V3, speed: 8 + 2 * i }); root.add(w.object); return w; });
    ups.push((t, cam) => { const on = inShot("v23b", t); for (const w of w23b) { w.object.visible = on; if (on) w.update?.(t, cam); } });
    // (R2: "steam rolls across" every cab shot): leaks at both front corners of the cab blow back past the openings
    const CAB_SHOTS = ["v23", "v24", "v25", "v28", "v29", "v30"];
    const wCab = [[-1.55, 3.5, 6.0], [1.55, 3.5, 6.0]].map(   // (R2 clip: at head height the wisps crossed their faces: above the roof line, outside the sides)
      (p, i) => { const w = wisp(ctx, { pos: p as V3, speed: 7 + 1.5 * i }); root.add(w.object); return w; });
    ups.push((t, cam) => { const on = CAB_SHOTS.some((id) => inShot(id, t)); for (const w of wCab) { w.object.visible = on; if (on) w.update?.(t, cam); } });
  }

  // ---- v22: white egrets lift off the paddy near the lens as the engine thunders past (times = offsets from the cut)
  const t22 = FRAMES.v22 ? cutS("v22") : 0;
  const egrets = birds(ctx, { size: 0.5, color: "#f7f6f0", seed: 19, flapHz: 3.2,
    singles: [0, 1, 2, 3, 4, 5].map((i) => ({ from: [-3.6 - (i % 3) * 0.5, GROUND_Y + 0.3, -2.6 + i * 0.7] as V3, to: [-9.5 - i * 0.6, 5.5 + (i % 2) * 1.4, 4 + i * 1.2] as V3, t0: t22 + 0.05 + i * 0.07, t1: t22 + 2.3 + i * 0.07, arc: 1.2 })) });
  root.add(egrets.object); if (egrets.update) ups.push(egrets.update);

  return { ...base, object: root, update: (t, cam) => { for (const u of ups) u(t, cam); } };
};

// ================================================================ CAMERAS (keyed on the v4 shot ids)
/** ONE glide from view a to its `b` (or still), an optional small cab shake while it moves; the director's withRest
 *  freezes the end of every shot */
const lens = (id: string): ShotCam => (from, to) => {
  const v = VIEWS[id], b = v.b ?? v, t0 = from / FPS, t1 = (to - restFrames(from, to)) / FPS;
  const L = (x: number, y: number, k: number) => x + (y - x) * k;
  return (t: number): CamState => {
    const k = easeGlide((t - t0) / Math.max(1e-3, t1 - t0));
    const pos: V3 = [L(v.pos[0], b.pos[0], k), L(v.pos[1], b.pos[1], k), L(v.pos[2], b.pos[2], k)];
    const look: V3 = [L(v.look[0], b.look[0], k), L(v.look[1], b.look[1], k), L(v.look[2], b.look[2], k)];
    const c: CamState = { pos, look, fov: L(v.fov, b.fov, k), roll: v.roll ?? 0, fnum: v.fnum ?? 8, focus: v.focus ?? Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) };
    // (lead round 4: no shot starts or ends on a shaking camera: the shake swells in and dies out before the rest)
    const env = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - t0) / Math.max(1e-3, t1 - t0))));
    return v.shake ? withShake(c, Math.min(t, t1) - t0, v.shake * env, 47) : c;
  };
};
export const CAMS: Record<string, ShotCam> = Object.fromEntries(Object.keys(VIEWS).map((id) => [id, lens(id)]));
/** v22 (R2 RE-STAGE: "the engine MOVES: it thunders across the frame, the camera pans with it"): in the loco frame the
 *  lens slides back along the line (-9 -> +9 m: the engine overtakes it) while it pans from the front three-quarter
 *  to the cab and tender; low, the horizon low (grass at most a quarter) */
CAMS.v22 = (from, to) => {
  const t0 = from / FPS, t1 = (to - restFrames(from, to)) / FPS;
  return (t: number): CamState => {
    const u = Math.max(0, Math.min(1, (t - t0) / Math.max(1e-3, t1 - t0))), k = 0.15 * easeGlide(u) + 0.85 * u;
    const pos: V3 = [-8.2, 0.35, -9 + 18 * k], look: V3 = [0, 2.35, 1.2 + 9.5 * k];
    return { pos, look, fov: 52, roll: -0.04, fnum: 8, focus: Math.hypot(look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]) };
  };
};
