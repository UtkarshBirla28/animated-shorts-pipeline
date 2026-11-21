// THE WARDROBE of "Why Japanese Train Drivers Point at Nothing" (pointing; owner CAST). One body colour + one signature
// item per person (BIBLE_NOTES 5), the channel's pale faces, generic cartoons (no likenesses, no logos, no Japanese text).
// COLOUR OWNERSHIP: the suitcase is the only glossy sunflower yellow (#ffc21a); the tourist's cap is the only red on a
// person; the driver owns navy and the brightest white (the gloves); the train owns emerald (#1f9a5a), so nobody wears
// emerald. Drawn by people.ts over the clown cast's drawFig (read-only import).
import type { Outfit } from "../../../videos/clown/toon";

export const COL = {
  ink: "#2c1e2a",
  navy: "#1f2a4a", navyLite: "#2c3a62", gold: "#d9a92e", goldLite: "#ffe08a", glove: "#ffffff", gloveSeam: "#d9dbe6",
  visor: "#14121a", silver: "#c9ced8",
  capRed: "#6c2a27", tee: "#bfc8d6", teeRib: "#8591a8", jeans: "#4f7fc4", lace: "#e23a2e", phoneCobalt: "#2f6fe0",
  kidTee: "#ffc928", kidShorts: "#26365e", kidSock: "#fbf8f2", kidShoe: "#e3402f", kidPack: "#3f9a4e", toyCap: "#22305a",
  trench: "#d8c3a0", tote: "#e9e0c8",
  ndNavy: "#24325a", ndShirt: "#a9c6e8", cord: "#c9a24a", pjStripe: "#e2453a",
  hoodie: "#8a8f99", beanie: "#c8643b", cans: "#2a2d36", phoneRed: "#e9342c",
  lavender: "#9b8ac9", labCoat: "#f3f3f0", brick: "#a8443a",
  furoshiki: "#2f3f86", stroller: "#7a8aa0",
  skin: "#f8f3ee",
};

/** THE DRIVER: navy single-breasted uniform (4 gold buttons, a costume layer), white shirt + navy tie, neat short black
 *  hair; the cap (black glossy peak, thin gold band, a plain round gold badge) and the WHITE gloves are layers */
export const DRIVER: Outfit = { shirt: COL.navy, pants: "#1b2440", shoes: "#16131a", hair: "#16131a", hairStyle: "short", fringeUp: 0.03 };
/** THE TOURIST: tall, a LIGHT GREY tee (never his skin's off-white: the print must sit on a shirt) with a ribbed collar,
 *  short sleeves and NEW YORK in plain black block caps (layers), mid-blue jeans (hips + legs), white sneakers
 *  with red laces (a layer), short brown hair, stubble (a layer), the RED cap */
export const TOURIST: Outfit = { shirt: COL.tee, pants: COL.jeans, shoes: "#fbfaf6", hair: "#5a3b2a", hairStyle: "short", build: "tall", hat: "cap", hatCol: COL.capRed,
  browCol: "#3a2418" };
/** THE KID (~6, rescaled to 1.12 m): sky-blue tee with a white collar trim, navy shorts, white socks, small red sneakers,
 *  a little green backpack, black hair, round cheeks; the too-big navy TOY driver's cap is a layer */
export const KID: Outfit = { shirt: COL.kidTee, pants: COL.kidShorts, shoes: COL.kidShoe, hair: "#1c1820", hairStyle: "messy", build: "small", fringeUp: 0.02 };
/** the kid's mum: a beige trench, a dark bob, a canvas tote (layer) */
export const KID_MUM: Outfit = { shirt: COL.trench, pants: "#4a4458", shoes: "#5a3b3b", hair: "#1f1a22", hairStyle: "bob", fringeUp: 0.02 };   // (collar, lapels, belt, buttons: the trench layer in people.ts)
/** the NY conductor (upper body in his window): navy vest over a light-blue shirt, grey moustache, reading glasses on a
 *  cord, short grey hair, no cap, no badges */
// (v4, 17:30, lead + STATION stills: he read as "a grey old man with glasses", not a conductor): a NAVY uniform jacket
// over a light-blue shirt collar, a navy uniform cap (people.ts), dark hair + a neat dark moustache, NO glasses, no gloves
export const NY_CONDUCTOR: Outfit = { shirt: COL.ndNavy, collar: true, collarCol: COL.ndShirt, pants: "#1f2740", shoes: "#1e1a20", hair: "#2e231e", hairStyle: "crop",
  moustache: "#2e231e", browCol: "#2e231e" };
/** the NY commuter: grey hoodie, dark jeans, the rust-orange beanie + headphones round his neck (layers), red phone */
export const NY_COMMUTER: Outfit = { shirt: COL.hoodie, hoodie: true, pants: "#2e3442", shoes: "#e8e4da", hair: "#3a2a20", hairStyle: "crop" };
/** the lab volunteer: a lavender sweater, a high ponytail */
export const VOLUNTEER: Outfit = { shirt: COL.lavender, sweater: true, pants: "#3a4250", shoes: "#f0ece2", hair: "#2a1e1a", hairStyle: "pony", fringeUp: 0.03 };
/** the researcher: a white lab coat (a layer) over a brick-red shirt, grey hair, round glasses, a pen behind the ear */
export const RESEARCHER: Outfit = { shirt: COL.brick, collar: true, collarCol: "#f6f0e8", pants: "#4f5160", shoes: "#2e2a30", hair: "#c6c8d0", hairStyle: "swept", build: "tall",
  glasses: "round", browCol: "#8a8a94", pencil: true, pencilCol: "#2f6fe0" };

// ---------------- the crowd (JP commuters + NY passengers): dark suits and coats, school blazers, quiet colours
export const SUIT_A: Outfit = { shirt: "#3a3f4c", suit: {}, tie: "#6a7896", pants: "#30343e", shoes: "#16131a", hair: "#1c1820", hairStyle: "side" };
export const SUIT_B: Outfit = { shirt: "#4a4d56", suit: {}, tie: "#8a3a3e", pants: "#3a3d46", shoes: "#16131a", hair: "#2a2226", hairStyle: "short", glasses: "rect" };
export const SUIT_C: Outfit = { shirt: "#2e3340", suit: {}, tie: "#3c5a8a", pants: "#2a2e38", shoes: "#16131a", hair: "#1c1820", hairStyle: "crew", build: "tall" };
export const OFFICE_W: Outfit = { shirt: "#6b6f7c", cardigan: "#5a6274", blouse: "#f4f1ea", pants: "#3a3e4a", shoes: "#2a2226", hair: "#2a1e1a", hairStyle: "bob", build: "small" };
export const OFFICE_MASK: Outfit = { shirt: "#7a7064", collar: true, collarCol: "#eee8dc", pants: "#3e3a36", shoes: "#2a2226", hair: "#1c1820", hairStyle: "crop" };
export const STUDENT_A: Outfit = { shirt: "#26345e", blouse: "#fbf8f2", dress: true, pants: "#26345e", shoes: "#2a2226", hair: "#1c1820", hairStyle: "bob", build: "small" };
export const STUDENT_B: Outfit = { shirt: "#26345e", collar: true, collarCol: "#fbf8f2", tie: "#8a2c3a", pants: "#3a3f52", shoes: "#2a2226", hair: "#241a1e", hairStyle: "pony", build: "small" };
export const GRANDMA: Outfit = { shirt: "#8a7a8e", cardigan: "#7a6a7e", blouse: "#f2ece4", pants: "#4a4458", shoes: "#3a2a2a", hair: "#d6d4dc", hairStyle: "bun", build: "round" };
export const MUM_STROLLER: Outfit = { shirt: "#9aa6b4", cardigan: "#5d6f86", blouse: "#f6f2ea", pants: "#3a4250", shoes: "#f0ece2", hair: "#3a2418", hairStyle: "pony", fringeUp: 0.03 };
export const LATE_SALARY: Outfit = { shirt: "#40444f", suit: {}, tie: "#a8523a", pants: "#34373f", shoes: "#16131a", hair: "#1c1820", hairStyle: "side", build: "tall" };
export const WAIT_A: Outfit = { shirt: "#5c6270", collar: true, collarCol: "#eceae4", pants: "#33363f", shoes: "#1e1a20", hair: "#2a2226", hairStyle: "short" };
export const WAIT_B: Outfit = { shirt: "#c9c2b4", cardigan: "#8f8576", blouse: "#f8f4ec", pants: "#4a4552", shoes: "#3a2a2a", hair: "#3a2418", hairStyle: "bun", build: "small" };
export const WAIT_C: Outfit = { shirt: "#3d4a5e", hoodie: true, pants: "#2f3442", shoes: "#e8e4da", hair: "#1c1820", hairStyle: "messy" };
export const WATCH_TAPPER: Outfit = { shirt: "#7b6a58", collar: true, collarCol: "#f3ece0", pocket: true, pants: "#3a3440", shoes: "#2a2226", hair: "#5a3020", hairStyle: "bob" };
export const NY_RIDER_A: Outfit = { shirt: "#5a6a52", pants: "#3a3d46", shoes: "#2a2226", hair: "#2a1e1a", hairStyle: "crop", hat: "cap", hatCol: "#3a4a6a" };
export const NY_RIDER_B: Outfit = { shirt: "#a85a6a", cardigan: "#6a3a4a", blouse: "#f4eee6", pants: "#2e3442", shoes: "#f0ece2", hair: "#1c1418", hairStyle: "curly", build: "small" };
export const NY_RIDER_C: Outfit = { shirt: "#4a5466", collar: true, collarCol: "#e8eef4", pants: "#5a5248", shoes: "#3a2a20", hair: "#a9a9b4", hairStyle: "bald", moustache: "#a9a9b4", build: "round" };
export const NY_LEAVER: Outfit = { shirt: "#8a6a4a", hoodie: true, pants: "#3a4250", shoes: "#c8452c", hair: "#2a1e1a", hairStyle: "curly", build: "tall" };

// ---------------------------------------------------------------- the v4 cast (the TRUE story, 2026-11-20; vivid look)
/** HORI, a steam-engine driver around 1910: a deep indigo work jacket (collar, placket, chest pockets), dark trousers, a
 *  black railway cap (a layer), a dark moustache, ROUND glasses (his failing eyes: he squints), short dark hair */
export const HORI: Outfit = { shirt: "#2f3f8f", workJacket: true, pants: "#22242e", shoes: "#1a1416", hair: "#1c1618", hairStyle: "short", fringeUp: 0.03,
  moustache: "#241a1a", browCol: "#241a1a" };   // (FIX R1, facts auditor + lead: NO glasses: round glasses on the man whose eyes "had gone bad" made "He never knew about the eyes" absurd)
/** HIS FIREMAN: rust-orange bib overalls over a cream work shirt with ROLLED sleeves, a charcoal flat cap, soot on his
 *  face (a layer), the coal SHOVEL (a held prop) */
export const FIREMAN: Outfit = { shirt: "#efe3c8", overalls: "#d0612b", rolled: true, pants: "#d0612b", shoes: "#2a1e18", hair: "#2a2020", hairStyle: "crop",
  hat: "flatcap", hatCol: "#3a3a44" };
/** HORI'S BOSS, a railway official (1910s): a DARK charcoal suit, white shirt, a RED tie (his one colour), a black BOWLER
 *  (a layer: the kit has no bowler), a moustache, the notebook (a held prop) */
export const OFFICIAL: Outfit = { shirt: "#2c2a38", suit: {}, tie: "#c8323a", collar: true, pants: "#24222e", shoes: "#141014", hair: "#3a2a24", hairStyle: "side",
  moustache: "#3a2a24" };
/** THE PERSON AT THE STOVE: a mustard COAT (on the way out of the door), dark trousers, a bun */
export const COOK: Outfit = { shirt: "#d99a2b", pants: "#2a2e3a", shoes: "#2a1e18", hair: "#2a1a14", hairStyle: "bun" };
/** THE TWO NEW YORKERS with the cardboard sign (mid-twenties): a man in a tomato hoodie and jeans, a woman in a sky-blue
 *  jacket with a dark ponytail */
export const PRANK_A: Outfit = { shirt: "#e0503a", hoodie: true, pants: "#3a5a9a", shoes: "#f0ece2", hair: "#3a2418", hairStyle: "messy" };
export const PRANK_B: Outfit = { shirt: "#3aa0d8", pants: "#2a2e3a", shoes: "#e3402f", hair: "#1c1618", hairStyle: "pony", fringeUp: 0.03 };
/** THE FACE OF THE HOOK (v4, frame 0 + the last shot): a YOUNG WOMAN volunteer at the big button: a vivid CORAL-RED
 *  sweater with a white collar (the strongest colour on her), navy trousers, a dark high ponytail, big clear eyes */
export const LAB_WOMAN: Outfit = { shirt: "#e8433a", sweater: true, collar: true, pants: "#22305a", shoes: "#f2ede4", hair: "#22181a", hairStyle: "pony", fringeUp: 0.03 };
/** the lab people (two rows of twelve, mostly men, a few women): plain clothes in a few strong colours */
export const LAB_MAN_A: Outfit = { shirt: "#3a7ad8", pants: "#2a2e3a", shoes: "#2a1e18", hair: "#2a1e1a", hairStyle: "short" };
export const LAB_MAN_B: Outfit = { shirt: "#2f9a8a", pants: "#3a3040", shoes: "#2a1e18", hair: "#3a2a20", hairStyle: "side" };
export const LAB_MAN_C: Outfit = { shirt: "#e0a02a", pants: "#2a2e3a", shoes: "#2a1e18", hair: "#1c1618", hairStyle: "crop" };
export const LAB_WOMAN_B: Outfit = { shirt: "#8a5ad0", pants: "#2a2e3a", shoes: "#f0ece2", hair: "#3a2418", hairStyle: "bob", fringeUp: 0.02 };
/** the RESEARCHER: a white lab coat over a teal shirt, glasses, a clipboard */
export const RESEARCHER_V4: Outfit = { shirt: "#f3f3f0", pants: "#2a2e3a", shoes: "#2a1e18", hair: "#2a1e1a", hairStyle: "swept", glasses: "round" };
/** the person in PYJAMAS at the open fridge: blue-and-white striped pyjamas (one colour, a stripe layer later), messy hair */
// (19:05, lead: read as a plain blue shirt): cream top with bold RED stripes (people.ts pyjamaTop), red trousers, pink
// slippers, messy bed hair
export const PYJAMAS: Outfit = { shirt: "#fff1d6", pants: COL.pjStripe, shoes: "#f49ab8", hair: "#3a2418", hairStyle: "messy" };

