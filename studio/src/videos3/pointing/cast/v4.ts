// THE v4 CAST ENTRY (owner CAST, 2026-11-20): a character of the v4 film as a lit card that ACTS THE v4 FILM BY ITSELF
// (cast/beats_v4.ts on the director's v4 clock). Sets call this instead of castCardOf + their own beats:
//
//   const { castMemberV4, labWomanV4 } = await import("../../cast/v4");
//   const her = await labWomanV4(ctx, { pos: LAB4.her, seated: LAB4.seat, button: btnV, lamp: lampV });   // the young woman
//   const drv = await castMemberV4(ctx, "driver", { pos: () => P, yaw: () => Y, aim: (t) => SIGNAL, seated: true });
//   g.add(her.object); ... her.update(t, cam) on every sub-frame
//
// CUES (cast/moves.ts cueF): word keys of the v4 script ("go#3", "wait#1"), shot anchors ("@v05", "@v05.end-4"), and the
// director's EVENTS (v4/timeline.ts EV) as "ev:<name>[+-n]": ev:lampGreen, ev:go1..ev:go6 (the six green flashes),
// ev:red, ev:redBeatEnd, ev:xPop, ev:loopPoint. Nothing here is a typed frame number: a new voice or a revised line moves
// every beat by itself. Lazy: nothing reads the clock at import time.
import type { KitCtx, V3 } from "../../../kit/core/ctx";
import type { CardBuilt } from "../../../kit/cards/card";
import { castCardOf, type CastOpts } from "./member";
import { actBeats, timeBeats, type Timed } from "./moves";
import { BEATS_V4, evF } from "./beats_v4";   // (importing beats_v4 registers the "ev:" cues with moves.ts)
import type { Who } from "./people";
import { R_V4 } from "../v4/resolver";
import { FPS } from "../v4/timeline";
export { evF };

let TIMED: Timed[] | null = null;
/** every v4 beat resolved on the v4 clock (memoised; the "ev:" cues resolve through moves.ts setEventCues) */
export const timedV4 = (): Timed[] => (TIMED ??= timeBeats(BEATS_V4, R_V4));
/** what does not line up in the v4 beat table (a missing word / shot / event, a point under 12 f, a rushed call) */
export const beatReportV4 = (): string[] => timedV4().filter((t) => !t.ok || t.why).map((t) => `${t.b.who} ${t.b.m}: ${t.why}`);

/** THE CALL for v4 sets: any cast member acting its BEATS_V4 rows */
export const castMemberV4 = (ctx: KitCtx, who: Who, o: CastOpts): Promise<CardBuilt> => castCardOf(ctx, who, o, (e) => actBeats(who, timedV4(), e));

/** the frames [from, to) of a v4 shot (null when the plan has no such shot) */
const shotF = (id: string) => R_V4.shot(id);
const inShot = (t: number, id: string) => { const s = shotF(id); const f = Math.round(t * FPS); return !!s && f >= s[0] && f < s[1]; };

export type LabWomanOpts = {
  /** her ground point (the floor under the stool's front edge), metres */ pos: V3;
  /** the way her body faces (default 0 = +Z, toward the hook lens) */ yaw?: number | ((t: number) => number);
  /** the stool height (m) */ seated: number;
  /** the world point just ABOVE the button's cap (her fingertip lands here) */ button: V3;
  /** the lamp's lens (her eyes, and her point in v18 / v36) */ lamp: V3;
  /** the shots in which she POINTS at the lamp (default v18 + v36) */ pointShots?: string[];
} & Partial<Pick<CastOpts, "name" | "px" | "cardLook" | "shadow" | "act">>;
/** THE YOUNG WOMAN of the hook (lab_woman): frame 0's finger ready over the button and eyes wide on the lamp, a press on
 *  every green flash, the hand down on the red, the freeze, v18 / v36 the side-on point at the lamp, mouth open */
export const labWomanV4 = (ctx: KitCtx, o: LabWomanOpts): Promise<CardBuilt> => {
  const pts = o.pointShots ?? ["v18", "v36"], yaw = o.yaw ?? 0;
  return castMemberV4(ctx, "lab_woman", {
    pos: () => o.pos, yaw: typeof yaw === "number" ? () => yaw : yaw, seated: o.seated,
    aim: (t) => (pts.some((id) => inShot(t, id)) ? o.lamp : o.button), look: () => o.lamp,
    name: o.name ?? "lab_woman", px: o.px, cardLook: o.cardLook, shadow: o.shadow, act: o.act,
  });
};
