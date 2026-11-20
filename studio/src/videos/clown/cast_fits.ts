// THE WARDROBE of "The Clown Nobody Saw" (owner CHAR): one body colour + one signature item each, the channel's pale
// #F8F3EE faces, generic cartoons (no likenesses, no logos, no real marks). Drawn by cast_people.ts (drawFig) over the
// kit's drawPerson.
// COLOUR OWNERSHIP (v2): the square is warm red-orange brick, so the walkers wear COOL or PALE body colours (sky blue,
// cobalt, green, cream, navy, grey, white, denim, lilac, pink); nobody wears brown / rust / orange bodies; the CLOWN alone
// wears saturated purple + yellow (the most saturated figure); the HERO's teal is hers alone (no other teal / mint
// anywhere: the professor's bow tie, the interviewers and the friend lost theirs); the professor is OLIVE tweed with a
// pale edge so he separates from red brick; the student wears the clown's colours muted (a purple overshirt over a
// yellow tee, red sneakers) and the clown's orange hair, so viewers connect them.
import type { Outfit } from "./toon";

/** THE HERO ("phone girl", phone-walker 3): teal hoodie, dark ponytail, white sneakers; her orange backpack is a costume
 *  layer (cast_people.ts), her phone is YELLOW */
export const HERO: Outfit = { shirt: "#17a6a1", hoodie: true, pants: "#34415f", shoes: "#f4f1ea", hair: "#3a2418", hairStyle: "pony", build: "small", fringeUp: 0.04 };
/** THE PHONE GUY (phone-walker 1, RED phone; the man the film opens on, the "Sorry... what clown?" line, the spin): tall,
 *  a sky-blue shirt, a navy knit vest, a navy tie, rectangular glasses, a neat side parting */
export const PHONE_GUY: Outfit = { shirt: "#8cc0ee", vest: "#26365e", collar: true, collarCol: "#e8f1fa", tie: "#c8332e", pants: "#3a4150", shoes: "#2a2226", hair: "#1c1820",
  hairStyle: "side", build: "tall", glasses: "rect", fringeUp: 0.05 };
/** v1 name of the phone guy (the same drawing: he must look identical in the quiz and the story) */
export const RED: Outfit = PHONE_GUY;
/** phone-walker 2 (LIME phone since p3 / D8: the white one was invisible on a white head and hand; the outfit keeps its v2
 *  name WHITE): a green varsity jacket (white hem stripe + a plain 7 on the back: a costume layer), a navy ball cap, brown hair */
export const WHITE: Outfit = { shirt: "#2c9a54", pants: "#6b6a58", shoes: "#3a3f52", hair: "#5a3b2a", hairStyle: "short", hat: "cap", hatCol: "#27365e" };
/** phone-walker 4 (SKY-BLUE phone): a round woman in a cream coat, a ginger bun */
export const BLUE: Outfit = { shirt: "#f3ead6", pants: "#5a4a6a", shoes: "#5a3b5b", hair: "#c8532d", hairStyle: "bun", build: "round", blouse: "#d9c9a8", pocket: true };
/** phone-walker 5 (PINK phone): a small woman: a navy dress with a white collar, a blonde bob, pink shoes */
export const PINK: Outfit = { shirt: "#2b3a78", dress: true, blouse: "#fbf8f2", pants: "#2b3a78", shoes: "#e0607a", hair: "#f0c64a", hairStyle: "bob", build: "small" };
/** music listener 1 (GREEN headphones): tall, a grey hoodie, messy dark hair */
export const M1: Outfit = { shirt: "#a2aab4", hoodie: true, pants: "#3a4250", shoes: "#e8e4da", hair: "#2a1e1a", hairStyle: "messy", build: "tall" };
/** music listener 2 (ORANGE headphones): a white tee, denim legs, dark curls, red sneakers */
export const M2: Outfit = { shirt: "#f7f4ec", pants: "#3f6fa8", shoes: "#c8452c", hair: "#1a1416", hairStyle: "curly", fringeUp: 0.03 };
/** THE HEADPHONES DUDE ("Dude, the unicycle guy!"; the bopping walk past the sculpture): tall, a cobalt tee with a white
 *  collar band, dark curls, LIME headphones (a costume layer), red sneakers */
export const DUDE: Outfit = { shirt: "#3466e0", pants: "#2a2f3c", shoes: "#e8452c", hair: "#1a1416", hairStyle: "curly", build: "tall", collarCol: "#f4f6fb", fringeUp: 0.03 };
/** the pair of friends: A = a denim jacket + brown curls (the one who gestures), B = a soft pink cardigan + a dark bob
 *  (the one who mimes pedalling while she laughs) */
export const FRIEND_A: Outfit = { shirt: "#4f7fc4", pants: "#2f3442", shoes: "#5a3b2a", hair: "#6a3a1e", hairStyle: "curly", collar: true, collarCol: "#e9eef5", pocket: true };
export const FRIEND_B: Outfit = { shirt: "#f4efe4", cardigan: "#f2a2c0", blouse: "#fbf8f2", pants: "#4a4458", shoes: "#f4f1ea", hair: "#1c1820", hairStyle: "bob", build: "small" };
/** the man walking alone with a coffee cup: a navy cardigan over a white shirt, bald with a grey horseshoe + moustache */
export const COFFEE: Outfit = { shirt: "#f1ede4", cardigan: "#3d5a8a", pants: "#5a5248", shoes: "#3a2a20", hair: "#a9a9b4", hairStyle: "bald", moustache: "#a9a9b4", browCol: "#7c7c88", build: "round" };
/** the girl walking alone with a book: a leaf-green dress, a dark bun */
export const BOOK: Outfit = { shirt: "#8cc257", dress: true, blouse: "#fbf8f2", pants: "#8cc257", shoes: "#3a2a2a", hair: "#3a2418", hairStyle: "bun", build: "small" };
/** THE PROFESSOR (IRA HYMAN, a generic friendly cartoon professor, NOT a likeness): an OLIVE tweed jacket (plaid weave)
 *  over a white shirt, a wine bow tie + cream pocket square (costume layer / suit), round glasses, swept grey hair, a warm
 *  face; drawn with a pale rim so the olive separates from red brick */
export const PROF: Outfit = { shirt: "#857a4e", suit: { square: "#f2e8c8" }, print: "plaid", pants: "#4f5160", shoes: "#2e2a30", hair: "#cfd0d8", hairStyle: "swept", browCol: "#8a8a94",
  glasses: "round", fringeUp: 0.05 };
/** THE STUDENT (the clown's civilian self: "I own a unicycle... and a clown suit."): lanky, the clown's ORANGE hair (curly
 *  mop), freckles (face extra), a muted purple overshirt over a yellow tee, dark jeans, red sneakers */
export const STUDENT: Outfit = { shirt: "#f6d64a", cardigan: "#7e5cc4", pants: "#2e3a5a", shoes: "#e9342c", hair: "#ff7a1f", hairStyle: "curly", build: "lanky", fringeUp: 0.02 };
/** the two interviewers: A = THE INTERVIEWER of the story (warm: a cream shirt, a lilac cardigan, a royal-blue lanyard,
 *  tall, a short crop); B = the second team member (small, a navy vest over a white shirt, an amber lanyard, a ponytail).
 *  Each carries a clipboard (a prop in the hand). No teal / mint (the hero's colour). */
export const ASK_A: Outfit = { shirt: "#f6ecd8", cardigan: "#a493dc", collar: true, collarCol: "#fffaf0", pants: "#3a4250", shoes: "#2a2226", hair: "#2a1e1a", hairStyle: "crop", build: "tall",
  lanyard: "#2a4fb0", rolled: false };
export const ASK_B: Outfit = { shirt: "#f7f4ec", vest: "#2c3d66", collar: true, pants: "#4a4458", shoes: "#3a2a2a", hair: "#8a4a2a", hairStyle: "pony", build: "small", lanyard: "#e8a020" };
/** THE MUM in the call bubble: a warm rose cardigan over a cream blouse, a grey-streaked bun, half-moon glasses on a chain */
export const MUM: Outfit = { shirt: "#fbf3e6", cardigan: "#d9708a", blouse: "#fffaf2", pants: "#5a4a5a", shoes: "#5a3b3b", hair: "#7a6a72", hairStyle: "bun", build: "round",
  glasses: "half", glassChain: "#c9a24a", fringeUp: 0.03 };
/** THE CLOWN: the kit draws a purple torso and a white bald head (its own hair is the skin colour: the orange puffs are a
 *  layer); the suit's yellow half, the pom-pom buttons, the ruffled collar, the red nose, the orange hair puffs, the little
 *  hat, the baggy two-colour limbs, the white gloves and the big red shoes are costume layers in cast_people.ts drawClown */
export const CLOWN: Outfit = { shirt: "#a436f2", pants: "#a436f2", shoes: "#e9342c", skin: "#fdfbf6", hair: "#f6f1ea", hairStyle: "bald" };
/** the orange of the clown's hair puffs = the student's hair (the link between them) */
export const CLOWN_HAIR = "#ff7a1f";
