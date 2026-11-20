// CAST of 'award' (from the bible; CARDS kit: studio/src/kit/cards/, see its NOTES.md). The set builders place and act
// them with the CARDS API (card.ts / crowd.ts / cardlight.ts); this file holds only the design data, shared by every set.
export type CastSpec = { id: string; role: string; build: "small" | "standard" | "tall"; body_colour: string; signature: string; card: string;
  speaks: boolean; expressions: string[] };
export const CAST: CastSpec[] = [
 {
  "id": "kid",
  "role": "YOU: the perfect-attendance kid (about 10), the hero",
  "build": "small",
  "body_colour": "#f2b632",
  "signature": "yellow backpack + red beanie",
  "card": "cards/card",
  "speaks": false,
  "expressions": [
   "bright",
   "proud",
   "smug",
   "sleepy",
   "blank"
  ]
 },
 {
  "id": "mom",
  "role": "Mom, proud, the doubter (she is SURE it works)",
  "build": "standard",
  "body_colour": "#5c8f5a",
  "signature": "green cardigan + a coffee mug",
  "card": "cards/card",
  "speaks": true,
  "expressions": [
   "proud",
   "certain",
   "warm"
  ]
 },
 {
  "id": "clerk",
  "role": "the researcher in the mail room (generic, never a likeness)",
  "build": "tall",
  "body_colour": "#7b7f8c",
  "signature": "grey vest + rubber stamp + pencil behind the ear",
  "card": "cards/card",
  "speaks": false,
  "expressions": [
   "focused",
   "sly"
  ]
 },
 {
  "id": "promise_kid",
  "role": "the promise-letter kid",
  "build": "small",
  "body_colour": "#3d6fb6",
  "signature": "blue puffer jacket",
  "card": "cards/card",
  "speaks": false,
  "expressions": [
   "neutral",
   "shrug"
  ]
 },
 {
  "id": "teachers",
  "role": "about 20 teachers (crowd kit)",
  "build": "standard",
  "body_colour": "#9a8d7a",
  "signature": "lanyards",
  "card": "cards/crowd",
  "speaks": false,
  "expressions": [
   "doubtful",
   "smiling"
  ]
 },
 {
  "id": "kids_crowd",
  "role": "schoolkids arriving / at desks (crowd kit)",
  "build": "small",
  "body_colour": "#c9a27e",
  "signature": "backpacks",
  "card": "cards/crowd",
  "speaks": false,
  "expressions": [
   "chatty",
   "sleepy"
  ]
 }
];
