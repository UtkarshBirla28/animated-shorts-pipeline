// HANDS + POPS (owner CAST; K-C10, K-F2): YOUR hand with the keys in the kitchen POV (s15), the tourist's pointing finger
// entering his phone view (s22), and the lab's 2D pops (the calling bubble with a finger icon, the tick, the -85 % chip).
// Cast style: skin mittens with an ink outline (4 fingers at this size), a grey sleeve cuff. Pure in t.
import type { KitCtx, V3 } from "../../../kit/core/ctx";
import { card, type CardBuilt } from "../../../kit/cards/card";
import { Pen, type P2 } from "../../../videos/clown/toon";
import { drawBigHand, drawKeys, drawLensPoint } from "./draw_hands";
export { drawBigHand, drawKeys, drawCallBubble, drawTick, drawChip, popK, drawLensPoint } from "./draw_hands";
import { wordF } from "./timing";
import { CAST_LOOK, CAST_SKIN, CAST_WHITE } from "./member";

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const sm = (x: number) => { const c = clamp(x, 0, 1); return c * c * (3 - 2 * c); };
/** the POV hand's state at film time t: on "Ever" it grips the lever (keys dangling), on "check" it lets go, hesitates
 *  mid-air, the fingers curl round the keys (the doubt) */
export const povHandState = (t: number) => {
  const f = t * 30, fe = wordF("ever"), fc = wordF("check#3");
  const letGo = sm((f - fc) / 8), hes = sm((f - fc - 8) / 14);
  const curl = 0.75 * (1 - letGo) + 0.9 * hes;                      // gripping -> open -> curled round the keys
  const lift = 60 * letGo - 20 * hes, swing = 0.25 * Math.sin((f - fe) / 7) * Math.exp(-Math.max(0, f - fe) / 50) + 0.18 * Math.sin((f - fc) / 5) * Math.exp(-Math.max(0, f - fc) / 30) * (f > fc ? 1 : 0);
  return { curl, lift, swing, f };
};
/** YOUR hand in the kitchen POV: a big card (~0.26 m wide), keys on its fingers */
export const povHand = async (ctx: KitCtx, o: { pos: (t: number) => V3; yaw?: (t: number) => number; px?: number; sizeM?: number; shadow?: boolean }): Promise<CardBuilt> =>
  card(ctx, {
    px: o.px ?? 1100, heightM: o.sizeM ?? 0.32, canvasM: o.sizeM ?? 0.32, aspect: 1, soleY: 1, crownY: 0, pos: o.pos, yaw: o.yaw, face: o.yaw ? "yaw" : "camera", shadow: o.shadow ?? false, lodM: 30, name: "povHand",
    key: (t) => { const s = povHandState(t); return `${s.curl.toFixed(3)}|${s.lift.toFixed(1)}|${s.swing.toFixed(3)}`; },
    draw: (c2d, t, w, h) => {
      const s = povHandState(t); c2d.setTransform(w / 1000, 0, 0, h / 1000, 0, 0); const p = new Pen(c2d);
      const wr: P2 = [470, 640 - s.lift];
      drawBigHand(p, wr, -0.35, s.curl, 0);
      drawKeys(p, [wr[0] - 40, wr[1] - 170], s.swing);
    },
  });
/** the tourist's index finger entering his phone view (s22): slowly, small, no snap. `k` 0 = curled out of frame .. 1 = pointing */
export const pointHandState = (t: number) => { const f = t * 30, fg = wordF("gone"); return { k: sm((f - fg + 10) / 26) }; };
export const pointHand = async (ctx: KitCtx, o: { pos: (t: number) => V3; yaw?: (t: number) => number; px?: number; sizeM?: number }): Promise<CardBuilt> =>
  card(ctx, {
    px: o.px ?? 1000, heightM: o.sizeM ?? 0.3, canvasM: o.sizeM ?? 0.3, aspect: 1, soleY: 1, crownY: 0, pos: o.pos, yaw: o.yaw, face: o.yaw ? "yaw" : "camera", shadow: false, lodM: 30, name: "pointHand",
    key: (t) => pointHandState(t).k.toFixed(3),
    draw: (c2d, t, w, h) => { const s = pointHandState(t); c2d.setTransform(w / 1000, 0, 0, h / 1000, 0, 0); drawBigHand(new Pen(c2d), [720, 760 + 120 * (1 - s.k)], -0.75, 0.95, s.k, "#f4f1ea", "#f2dccb"); },
  });


/** THE GLOVE THAT COMES AT THE LENS (frame 0, K-C12): a big foreground card of the front-on pointing hand, to stand
 *  ~0.4-0.6 m in front of the lens so the real depth of field softens it. `k(t)` = how far out it is (0 = drawn back,
 *  small / 1 = full thrust; overshoot allowed): feed it callKAt("driver", t) (acting.ts) so it follows the call's clock.
 *  who = "driver" (white glove, navy sleeve, white shirt cuff) / "tourist" / "kid" (skin, no sleeve). `from` = the
 *  direction the forearm comes from (rad: 0 = straight below, + = from the lower right of the card) */
const LENS_GLOVE_RETIRED = true;
export const lensGlove = async (ctx: KitCtx, o: { pos: (t: number) => V3; k: (t: number) => number; who?: "driver" | "tourist" | "kid"; yaw?: (t: number) => number; px?: number; sizeM?: number; from?: number; side?: 1 | -1 }): Promise<CardBuilt> => {
  const who = o.who ?? "driver", q = (t: number) => Math.round(clamp(o.k(t), -0.2, 1.3) * 200) / 200;
  return card(ctx, {
    px: o.px ?? 1000, heightM: o.sizeM ?? 0.3, canvasM: o.sizeM ?? 0.3, aspect: 1, soleY: 1, crownY: 0, pos: o.pos, yaw: o.yaw, face: o.yaw ? "yaw" : "camera", shadow: false, lodM: 30, name: "lensGlove",
    look: { ...CAST_LOOK, gain: who === "driver" ? 0.8 : 0.68, form: 0.6 },   // the white glove is the brightest thing in frame 0
    key: (t) => String(q(t)),
    // v4 (BENCHMARK 6.3): the lens-glove card is RETIRED (a hand at the lens reads as a blob / "he points at me"): it stays
    // an empty, invisible card so the sets that still build it keep compiling
    draw: (c2d, t, w, h) => {
      if (LENS_GLOVE_RETIRED) { c2d.clearRect(0, 0, w, h); return; }
      const k = q(t), z = 0.5 + 0.5 * clamp(k, 0, 1.25);
      c2d.setTransform(w / 1000, 0, 0, h / 1000, 0, 0);
      drawLensPoint(new Pen(c2d), [500, 430], 420 * z, { fill: who === "driver" ? CAST_WHITE : CAST_SKIN, line: who === "driver" ? "#c6bfd2" : "#b3a2c0", side: o.side ?? 1, thrust: k, glove: who === "driver", ow: 17 * Math.sqrt(z),
        arm: who === "driver" ? { col: "#1f2a4a", cuff: CAST_WHITE, from: o.from ?? 0.55, len: 1.7 } : { col: CAST_SKIN, from: o.from ?? 0.55, len: 1.7 } });
    },
  });
};
