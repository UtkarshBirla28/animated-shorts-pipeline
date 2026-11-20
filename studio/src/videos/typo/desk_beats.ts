// HERO DESK timing (owner DESK): beat-keyed frames shared by sets_desk.ts (the hand, keys, screen, counter) and
// cams_desk.ts (the cuts that hand the trader's arm between CHAR's card and the 3D hero hand). Words only, no literals.
import { BEAT } from "./beats";

/** shot 1: the ENTER press: anticipation lift, the finger lands on the key (contact) on "typo" */
export const PRESS1 = { lift0: BEAT.typo - 11, down0: BEAT.typo - 4, contact: BEAT.typo + 1, up0: BEAT.typo + 5, settle: BEAT.typo + 20 };
/** shot 8: the cut to the CANCEL key ("They press cancel."), the two presses (contacts on the story.ts kicks) */
export const CUT8 = BEAT.they - 2;
export const PRESS8A = { lift0: BEAT.cancel3 - 6, down0: BEAT.cancel3 + 2, contact: BEAT.cancel3 + 6, up0: BEAT.cancel3 + 12, settle: BEAT.cancel3 + 26 };
export const PRESS8B = { lift0: BEAT.again - 12, down0: BEAT.again, contact: BEAT.again + 4, up0: BEAT.again + 16, settle: BEAT.again + 32 };
/** shot 6: the cut from the order screen to his face for "Easy mistake." */
export const CUT6 = BEAT.easy - 4;
/** shot 6: QTY digits land through "610,000"; the summary strip builds from the end of the number; PRICE on "¥1" */
export const qtyDigitAt = (k: number) => BEAT.n610k + 2 + (k * (BEAT.n610kEnd - BEAT.n610k - 4)) / 5;
export const STRIP6 = BEAT.n610kEnd + 3;
/** shot 8: the screen refuses (on the first press), the two "..." */
export const REFUSE8 = PRESS8A.contact + 2;
/** the grey "..." pops a beat before each "Nothing." (read on the key + screen frame), then a CUT to his frozen stare,
 *  held: [nothing1 + 2, again - 8) and [nothing2 + 2, end of shot); the 3D hand is off (his card arms are on) there */
export const DOTS8 = [BEAT.nothing1 - 8, BEAT.nothing2 - 8];
export const STARE8: [number, number][] = [[BEAT.nothing1 + 2, BEAT.again - 8], [BEAT.nothing2 + 2, 1e9]];
/** shots 1 / 14 (fix2, Design A): the whole shot is the FRONT-RIGHT medium (cams_desk A0): the trader faces that lens,
 *  the right side monitor + the back-view lamp are hidden, the big board hangs over his head */
export const faceOnAt = (id: number, _f = 0) => id === 1 || id === 14;
