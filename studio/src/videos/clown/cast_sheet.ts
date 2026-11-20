// THE IN-WORLD DESIGN SHEET of "The Clown Nobody Saw" (owner CHAR, v2): the cast staged in the real square under the
// film's light (cardshade, grade), to check the true rendered look. Render page n on any frame with
//   PROPS='{"post":{"sheet":n,"captions":false,"overlays":false}}' node scripts/stills.mjs out/clown/char_v2/w<n>_ <frame> 0.5
// Pages: 1 the clown (views + actions), 2 the five phone people, 3 the story cast, 4 the crowd kit. The cells sit at a
// fixed distance in front of the live camera (they follow whatever shot camera EDIT gives the frame).
// The plain 2D bench (true pixel sizes, every action animated) is src/sandboxes/clownbench (CHAR.md v2).
import type { Eng, Stage, CamInfo } from "./cast";
import type { V3 } from "./plan";
import { WHEEL_R } from "./plan";
import * as PPL from "./cast_people";
import * as CROWD from "./cast_crowd";
import type { Pose, ClownPose } from "./cast_people";
import type { Pen } from "./toon";

type Cell = { draw: (p: Pen) => void; scale?: number; ghost?: boolean };
const C = PPL.C;
const ph = (col: string) => PPL.phoneArm(col);
const walk = (s: number, c: number, w: number, x: Partial<Pose> = {}): Pose => ({ s, c, walk: w, go: 1, expr: "bright", ...x });
const stand = (x: Partial<Pose> = {}): Pose => ({ s: 0, c: 1, go: 0, expr: "bright", ...x });
const clown = (x: Partial<ClownPose>): Cell => {
  const P: ClownPose = { s: 0, c: 1, spin: 0.9, wheelR: WHEEL_R, expr: "brightGrin", face: { blush: 0.6 }, armL: { fk: [96, 104], hand: "open" }, armR: { to: "show", prop: { k: "horn" }, hand: "grip" }, ...x };
  return { draw: (p) => PPL.drawClown(p, P), scale: 1 / PPL.CLOWN_K };
};
const PAGES: Record<number, Cell[]> = {
  1: [
    clown({ s: 0.62, c: 0.78, spin: 1.3, roll: -8, expr: "thrillB", look: 0.6, armL: { fk: [150, 170], hand: "open" }, armR: PPL.clownHonk(20, 19).arm, ruff: 0.4 }),
    clown({ s: 1, c: 0.02, spin: 2.2 }),
    clown({ s: -0.3, c: -0.95, spin: 4.5, armL: { to: "show", prop: { k: "horn" } }, armR: { fk: [96, 104], hand: "open" } }),
    clown({ s: 0.2, c: 0.97, spin: 0.2, armR: PPL.waveArm(28, 22, 1).arm, armL: { fk: [70, 80], hand: "open" } }),
    clown({ s: 0.6, c: 0.8, ...PPL.clownWobble(16, 12, 1) }),
    { ...clown({ s: 0.5, c: 0.86, spin: 0.9 }), ghost: true },
  ],
  2: [
    { draw: (p) => PPL.drawPhoneGuy(p, walk(0.5, 0.86, 0.15, { mouth: "vA", armL: ph(C.phoneRed), armR: PPL.talkHand(10, 2, true) })) },
    { draw: (p) => PPL.drawWhite(p, walk(0, 1, 0.7, { armL: ph(C.phoneWhite), armR: { to: "pocket" } })) },
    { draw: (p) => PPL.drawHero(p, walk(0, 1, 0.12, { mouth: "vE", armL: ph(C.phoneYellow), armR: PPL.talkHand(4, 13, true) })) },
    { draw: (p) => PPL.drawBlue(p, walk(-0.5, 0.86, 0.1, { expr: "laughBig", armR: ph(C.phoneBlue), armL: { to: "hip" } })) },
    { draw: (p) => PPL.drawPink(p, walk(0.4, 0.9, 0.35, { armL: ph(C.phonePink) })) },
    { draw: (p) => PPL.drawHero(p, walk(0.2, -1, 0.62, { armR: ph(C.phoneYellow) })) },
    { draw: (p) => PPL.drawPhoneGuy(p, walk(-0.3, -0.95, 0.3, { armR: ph(C.phoneRed) })) },
    { draw: (p) => PPL.drawHero(p, walk(0, 1, 0.38, { duck: 1, expr: "blank", armL: ph(C.phoneYellow) })) },
  ],
  3: [
    { draw: (p) => PPL.drawProf(p, stand({ expr: "puzzled", headTilt: 4, armL: PPL.chinStroke(30, 16) })) },
    { draw: (p) => PPL.drawProf(p, walk(1, 0.1, 0.3, { gait: "tiptoe", expr: "sly", look: 0.9, armL: PPL.sneakArms(10, 0.3)[0], armR: PPL.sneakArms(10, 0.3)[1] })) },
    { draw: (p) => PPL.drawStudent(p, stand({ expr: "brightGrin", ...PPL.leanIn(1, 1) })) },
    { draw: (p) => { const g = PPL.garmentFling(40, 26, 1); PPL.drawStudent(p, stand({ expr: "thrillB", armL: g.hold, armR: g.fling })); }, scale: 0.9 },
    { draw: (p) => PPL.drawInterviewer(p, 0, stand({ expr: "asking", mouth: "vO", armL: PPL.clipboardArm(), armR: PPL.talkHand(6, 2, true) })) },
    { draw: (p) => { const co = PPL.cupOffArm(40, 8, -1); PPL.drawDude(p, stand({ expr: "brightGrin", cupOff: co.cupOff, armL: co.arm, armR: PPL.overShoulder(44, 30) })); } },
    { draw: (p) => { const [a, b] = PPL.pedalMime(30, 14); PPL.drawFriend(p, 1, stand({ expr: "laughBig", armL: a, armR: b })); } },
    { draw: (p) => PPL.drawFriend(p, 0, stand({ expr: "brightGrin", armR: PPL.pointArm(40, 20, [700, 300]) })) },
  ],
  4: CROWD.CROWD_IDS.slice(0, 8).map((id, i) => ({ draw: (p: Pen) => CROWD.drawCrowd(p, id, CROWD.crowdPose(id, 20 + 9 * i, { s: i % 2 ? 0.8 : -0.4, c: i % 2 ? 0.5 : 0.9 })) })),
};
export const stageSheet = (E: Eng, out: Stage, cam: CamInfo, page: number) => {
  const cells = PAGES[page] ?? [], big = page === 1, cols = big ? 3 : 4, z = big ? 6.2 : 8.5, dx = big ? 1.55 : 0.85;
  const R = cam.right, F: V3 = [R.z, 0, -R.x];   // the camera's forward on the ground (up x right)
  const light = E.light2D(cam);
  cells.forEach((cell, n) => {
    const col = n % cols, row = Math.floor(n / cols), lat = (col - (cols - 1) / 2) * dx, d = z + row * 2.2;
    const pos: V3 = [cam.pos.x + F[0] * d + R.x * lat, 0, cam.pos.z + F[2] * d + R.z * lat];
    const draw = (p: Pen) => { void light; cell.draw(p); };
    if (cell.ghost) E.putGhost(out, cam, `sheetv2_${page}_${n}`, pos, (p) => PPL.asGhost(p, 0.55, "#dfeeff", 0.3, draw, "#ffffff"), cell.scale ?? 1);
    else E.putFig(out, cam, `sheetv2_${page}_${n}`, pos, draw, { scale: cell.scale ?? 1 });
  });
};
