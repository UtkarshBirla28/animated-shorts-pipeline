// CAST of 'pointing' (owner CAST; API + notes: cast/NOTES.md). The set builders place characters with castMember(); each
// card ACTS THE FILM BY ITSELF (the bible's acting beats keyed to the word timeline), lit by the CARDS kit.
//
//   const drv = await castMember(ctx, "driver", { pos: () => [-0.55, 0, -1.2], yaw: () => Math.PI, aim: (t) => SIGNAL, seated: true });
//   set.add(drv.object); ... drv.update(t, cam) on every sub-frame
import type { KitCtx } from "../../kit/core/ctx";
import type { CardBuilt } from "../../kit/cards/card";
import { SPECS, type Who } from "./cast/people";
import { actorOf } from "./cast/acting";
import { castCardOf, type CastOpts } from "./cast/member";
import { liftPairOf, type LiftOpts } from "./cast/lift";
export { LIFT, liftPlace, heldPose, holdingPose, type LiftOpts, type LiftPlace } from "./cast/lift";
export { castCardOf, worldToCard, CAST_LOOK, CAST_SKIN, CAST_WHITE, type CastOpts } from "./cast/member";
export { callOut, callArm, aimArm, earTarget, filmTarget, gazeTo, type ActEnv, type Actor, type CallOpt } from "./cast/gesture";
// the moves + the beat table (the film's acting as data) + what a SET needs to sync a prop to the acting
export * as MOVES from "./cast/moves";
export { walkedM, hookK, footReach, pointK, capDropAt, type Beat, type Cue } from "./cast/moves";
export { BEATS } from "./cast/beats";
export { beatReport, beatWin, walkedAt, hookAt, callKAt, pointKAt, filmBeats } from "./cast/acting";

export { crowdJP, crowdNY, trainRock, rockLag, rockAmp, type CrowdMemberSpec } from "./cast/crowd";
export { povHand, pointHand, lensGlove, drawCallBubble, drawTick, drawChip, popK, drawBigHand, drawKeys, drawLensPoint } from "./cast/hands";
export { wordT, wordEnd, wordF, speakingAt, mouthAt, getToks, voiceSource } from "./cast/timing";
export { drawWho, SPECS, WHO_LIST, type CPose, type Who } from "./cast/people";

/** THE CALL: a character of the film as a lit card that acts the film by itself (the bible's beats on the word timeline) */
export const castMember = (ctx: KitCtx, who: Who, o: CastOpts): Promise<CardBuilt> => castCardOf(ctx, who, o, actorOf(who, SPECS[who].seed));
/** THE LIFT (s06): mum holds the boy up at the cab window. ONE call builds both cards (the boy raised LIFT.liftM, her
 *  arms round his waist, her face behind his shoulder); both act the film (his copy-point, the cap drop, her smile).
 *    const { kid, mum, place } = await castLiftPair(ctx, { pos: boyFloorAt, yaw: () => Math.PI, aim: aimOf, k: (t) => (lifted(t) ? 1 : 0) });
 *  place(t) = where they are (for lenses / props). Details: cast/lift.ts + cast/NOTES.md */
export const castLiftPair = (ctx: KitCtx, o: LiftOpts) => liftPairOf(ctx, o, { kid: actorOf("kid", SPECS.kid.seed), mum: actorOf("kid_mum", SPECS.kid_mum.seed) });

// ---------------- the cast data (bible "cast"), for the validator / the sheet
export type CastSpec = { id: string; role: string; build: "small" | "standard" | "tall"; body_colour: string; signature: string; card: string;
  speaks: boolean; expressions: string[] };
export const CAST: CastSpec[] = [
  { id: "driver", role: "the Tokyo commuter-train driver (point-and-call)", build: "standard", body_colour: "#1f2a4a", signature: "white gloves + navy peaked cap", card: "cast.ts castMember:driver", speaks: true, expressions: ["focus", "callOut", "calm", "firm", "smallNod"] },
  { id: "tourist", role: "the New York tourist, loud, cheerful, likeable", build: "tall", body_colour: "#f4f1ea", signature: "red cap + the yellow suitcase", card: "cast.ts castMember:tourist", speaks: true, expressions: ["laughBig", "brightGrin", "smugB", "mockStiff", "puzzled", "blankDrop"] },
  { id: "kid", role: "the one tiny fan (about 6)", build: "small", body_colour: "#5fb3e8", signature: "a too-big navy toy driver's cap", card: "cast.ts castMember:kid", speaks: true, expressions: ["serious", "proud", "frownB", "worriedB", "delight"] },
  { id: "kid_mum", role: "the boy's mum", build: "standard", body_colour: "#d8c3a0", signature: "beige trench + canvas tote", card: "cast.ts castMember:kid_mum", speaks: false, expressions: ["warm", "amused"] },
  { id: "ny_conductor", role: "a New York subway conductor at his window", build: "standard", body_colour: "#24325a", signature: "reading glasses on a cord + grey moustache", card: "cast.ts castMember:ny_conductor", speaks: false, expressions: ["deadpanPro", "squint", "firm"] },
  { id: "ny_commuter", role: "the rider at the open doors in the tunnel", build: "standard", body_colour: "#8a8f99", signature: "rust-orange beanie + neck headphones", card: "cast.ts castMember:ny_commuter", speaks: false, expressions: ["blank", "puzzled", "deadpan"] },
  { id: "volunteer", role: "the lab volunteer", build: "standard", body_colour: "#9b8ac9", signature: "lavender sweater + high ponytail", card: "cast.ts castMember:volunteer", speaks: false, expressions: ["focusB", "oops", "calling", "proudB"] },
  { id: "researcher", role: "the railway-lab researcher", build: "tall", body_colour: "#f3f3f0", signature: "clipboard + round glasses", card: "cast.ts castMember:researcher", speaks: false, expressions: ["focused", "pleased"] },
  { id: "jp_commuters", role: "Tokyo evening-rush commuters", build: "standard", body_colour: "#5a5e6b", signature: "dark suits, school blazers, one indigo furoshiki", card: "cast.ts crowdJP", speaks: false, expressions: ["sleepy", "chatty", "polite", "resigned"] },
  { id: "ny_passengers", role: "New York riders", build: "standard", body_colour: "#7b6a58", signature: "camel coat + wristwatch", card: "cast.ts crowdNY", speaks: false, expressions: ["impatient", "bored"] },
  { id: "pov_hand", role: "YOUR hand in the kitchen POV", build: "standard", body_colour: "#f0d6c0", signature: "keys + a small green train charm", card: "cast.ts povHand", speaks: false, expressions: ["hesitant"] },
];
