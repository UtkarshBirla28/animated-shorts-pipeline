// The typo short's WARDROBE (owner CHAR): one body colour + one signature item each, pale #F8F3EE faces, generic
// cartoons (no likenesses, no logos). Drawn by toon.ts drawPerson.
import type { Outfit, HairStyle } from "./toon";

/** THE TRADER (20s): short black hair, a white shirt (a cool white, a value step under the face), sleeves rolled, a dark
 *  tie pulled loose, thin rectangular glasses, the signature BLUE ID LANYARD with a blank card */
export const TRADER_FIT: Outfit = { shirt: "#e9eef5", collarCol: "#d6dde8", pants: "#2e3240", shoes: "#2a2226", hair: "#17131c", hairStyle: "short",
  tie: "#2a2f48", looseTie: true, collar: true, rolled: true, lanyard: "#2f6fd0", glasses: "rect", fringeUp: 0.07 };
/** THE BOSS (50s): a mid-grey suit, a burgundy tie, neat side-parted grey hair, glasses (rect, a darker frame) */
export const BOSS_FIT: Outfit = { shirt: "#7c818b", pants: "#5f636c", shoes: "#1e1a20", hair: "#a7a8b0", hairStyle: "side", browCol: "#5c5c66",
  tie: "#8a2630", suit: {}, glasses: "rect", penPocket: true, fringeUp: 0.06 };

/** office staff: white shirts / dark suits (men), blouses + cardigans (women) */
export const staffFit = (v: number): Outfit => ([
  { shirt: "#eef1f4", collarCol: "#d8dde4", pants: "#2e3442", shoes: "#2a2226", hair: "#1c1820", hairStyle: "crop", tie: "#24345e", collar: true, rolled: true },
  { shirt: "#ecc8cf", pants: "#3e3a48", shoes: "#4a2a2a", hair: "#4a3020", hairStyle: "bob", cardigan: "#6f86ad", blouse: "#f6f1ec", build: "small" },
  { shirt: "#323846", pants: "#2a2f3a", shoes: "#1a1416", hair: "#241c1a", hairStyle: "side", tie: "#a8323a", suit: {}, glasses: "rect" },
  { shirt: "#f1ede4", pants: "#4a4458", shoes: "#3a2a20", hair: "#2a1e1a", hairStyle: "pony", cardigan: "#b4836a", blouse: "#fbf8f2", build: "small" },
  { shirt: "#e7ecf2", collarCol: "#d0d7e0", pants: "#3a3d46", shoes: "#2a2226", hair: "#6c6c74", hairStyle: "side", tie: "#2a5a3a", collar: true, glasses: "rect" },
  { shirt: "#2b303c", pants: "#262a34", shoes: "#1a1416", hair: "#1a1416", hairStyle: "short", tie: "#5a3a6a", suit: {} },
  { shirt: "#cfe0ef", pants: "#3a3a48", shoes: "#3a2a2a", hair: "#3a2a22", hairStyle: "bun", cardigan: "#8a9a7a", blouse: "#f4f6f8", build: "small" },
] as Outfit[])[v % 7];

/** Tokyo salarymen (dark suits, plain ties, briefcases) + a woman in a camel coat */
export const salaryFit = (v: number): Outfit => ([
  { shirt: "#2c313c", pants: "#252a33", shoes: "#16121a", hair: "#1a1416", hairStyle: "side", tie: "#4a5a7a", suit: {} },
  { shirt: "#3c3f48", pants: "#2e3038", shoes: "#16121a", hair: "#2a2220", hairStyle: "crop", tie: "#7a2a30", suit: {}, glasses: "rect" },
  { shirt: "#252a36", pants: "#20242e", shoes: "#16121a", hair: "#5a5a62", hairStyle: "short", tie: "#2a4a3a", suit: {} },
  { shirt: "#a8865e", pants: "#3a3440", shoes: "#3a2020", hair: "#2a1c18", hairStyle: "bob", build: "small", collar: true, collarCol: "#e8dcc8" },
] as Outfit[])[v % 4];

/** exchange lobby visitors (shots 3 / 4 / 7 / 9): suits, a cardigan lady, a student */
export const visitorFit = (v: number): Outfit => ([
  { shirt: "#3a4252", pants: "#2c3240", shoes: "#16121a", hair: "#1c1618", hairStyle: "crop", tie: "#b0803a", suit: {} },
  { shirt: "#c46a5a", pants: "#3e3a48", shoes: "#3a2020", hair: "#3a2418", hairStyle: "bob", cardigan: "#e2d0a8", blouse: "#fbf6ec", build: "small" },
  { shirt: "#5a6070", pants: "#3a3e48", shoes: "#16121a", hair: "#b0b0b8", hairStyle: "bald", tie: "#3a2a5a", suit: {}, glasses: "rect", moustache: "#9a9aa2" },
  { shirt: "#3f6b5a", pants: "#2e3440", shoes: "#2a2226", hair: "#1a1416", hairStyle: "messy", collar: true, collarCol: "#e8ece4" },
] as Outfit[])[v % 4];

/** the home buyers (shot 10): an office worker, the grandma (reading glasses on a chain, a bun, a cardigan), an internet
 *  cafe student (a striped polo, headphones round the neck = the collar colour), the 27-year-old (messy hair, GREY HOODIE) */
export const WORKER_FIT: Outfit = { shirt: "#eef0f2", collarCol: "#d6dae0", pants: "#30343e", shoes: "#1a1416", hair: "#221a18", hairStyle: "crop", tie: "#2a4a7a", collar: true };
export const GRANNY_FIT: Outfit = { shirt: "#d9c2d6", pants: "#5a4e5e", shoes: "#4a3030", hair: "#d8d6dc", hairStyle: "bun", cardigan: "#9a6a8a", blouse: "#fbf6f2",
  glasses: "half", glassChain: "#d0a040", build: "small", browCol: "#8a8690" };
export const STUDENT_FIT: Outfit = { shirt: "#e0a33a", pants: "#2e3a5a", shoes: "#3a3a40", hair: "#1c1418", hairStyle: "bowl", collar: true, collarCol: "#f6e6c0", print: null };
export const BUYER_FIT: Outfit = { shirt: "#9a9ca6", pants: "#3a3e4a", shoes: "#2a2a30", hair: "#1e1a20", hairStyle: "messy", hoodie: true };

/** the notice-board hall (shot 11): the snatching crowd (cheerful casual colours) + the SELLER (a sly purple-grey suit,
 *  a fedora, a thin moustache) */
export const crowdFit = (v: number): Outfit => ([
  { shirt: "#e07a3a", pants: "#3a3e4a", shoes: "#2a2226", hair: "#2a1c18", hairStyle: "crop", collar: true, collarCol: "#f6e2cc" },
  { shirt: "#4aa07a", pants: "#3e3a48", shoes: "#3a2020", hair: "#5a3020", hairStyle: "pony", build: "small", blouse: "#f4f8f2" },
  { shirt: "#5a7ac8", pants: "#2e3440", shoes: "#2a2226", hair: "#1a1416", hairStyle: "messy", collar: true, collarCol: "#e6ecf8" },
  { shirt: "#d8b23a", pants: "#4a4458", shoes: "#3a2a20", hair: "#8a8a92", hairStyle: "side", cardigan: "#a8543a", collar: true, glasses: "rect" },
  { shirt: "#c85a7a", pants: "#3a3440", shoes: "#3a2020", hair: "#2a1a14", hairStyle: "bob", build: "small", blouse: "#fbf2f4" },
] as Outfit[])[v % 5];
export const SELLER_FIT: Outfit = { shirt: "#6a5878", pants: "#4a3e56", shoes: "#1e1620", hair: "#1a1416", hairStyle: "slick", hat: "fedora", hatCol: "#3a2e44",
  suit: {}, tie: "#c8a03a", moustache: "#2a1e24" };

/** the court (shot 13): three judges in black robes (the middle one older, white hair), the exchange's lawyer */
export const judgeFit = (v: number): Outfit => ([
  { shirt: "#1f1d26", pants: "#1a1820", shoes: "#16121a", hair: "#1a1416", hairStyle: "side", robe: true, tie: "#2a2a3a" },
  { shirt: "#1f1d26", pants: "#1a1820", shoes: "#16121a", hair: "#efeef2", hairStyle: "swept", robe: true, tie: "#2a2a3a", glasses: "rect", browCol: "#9a98a2" },
  { shirt: "#1f1d26", pants: "#1a1820", shoes: "#16121a", hair: "#2a1e1a", hairStyle: "bob", robe: true, blouse: "#f4f2ee", build: "small" },
] as Outfit[])[v % 3];
export const LAWYER_FIT: Outfit = { shirt: "#2a2e3a", pants: "#23262f", shoes: "#16121a", hair: "#2a2220", hairStyle: "side", tie: "#6a7a9a", suit: {}, glasses: "rect", fringeUp: 0.04 };
void (null as unknown as HairStyle);

/** fix2 (audit 2): the museum guard by the pedestal (shot 4): a navy uniform, a peaked cap, a plain badge */
export const GUARD_FIT: Outfit = { shirt: "#2b3c66", pants: "#232c44", shoes: "#16121a", hair: "#2a2220", hairStyle: "crop", hat: "cap", hatCol: "#22304f", band: "#d8b24a",
  tie: "#1c2233", collar: true, collarCol: "#e8ecf2", workJacket: true, badge: "GUARD", moustache: "#3a302c" };
