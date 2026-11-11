# CLAIMS_VERDICT — the 10 style-bible claims vs 16 measured shorts, and the template gap list

Written 2026-11-10. Private study notes. Never copy the reference characters, shots or scripts. Never name the channel.

**Evidence used:** all 16 breakdowns in `study\videos\*.md` (read in full, sections 1-15), `_all_breakdowns.json`
(the `claims_check` arrays), `CHANNEL_NUMBERS.md` (I use the `*_verified` columns; `bed_vs_voice` has n=2 and is
ignored), `REPO_KNOWLEDGE.md` sections 4, 8, 9, 11, and the template source in
`studio\src\videos\bridge\` and `sound\bridge\audio\` (same line numbers as the repo).

**Verified 2026-11-10** by an adversarial pass against the raw data and frames. Corrections are made in place; the
checked statements and their evidence are listed in `CHANNEL_STYLE_BIBLE.md` → "Verification log".

**Units:** f = frame at 30 fps. px = pixels at 1080x1920. %/f = scale change per frame. %w/f = shift per frame as a
share of frame width. LU = loudness difference in dB.

**Labels:** CONSTANT = true in 15-16 of 16. COMMON = 9-14 of 16. VARIABLE = a free choice (8 or fewer).

**Video short names used in citations (slug in `study\videos\`):**

| short | slug | short | slug |
|---|---|---|---|
| spear | an-unstoppable-spear-vs-an-unbreakable-shield | tree | this-tree-hates-you |
| memory | every-memory-has-a-price | teleport | what-if-humans-invented-teleportation |
| pirate | levels-of-pirate-cannonballs | gravebell | what-the-grave-bell-really-meant |
| jar | the-ancient-jar-that-warned-an-empire | random | why-humans-can-t-pick-random-numbers |
| burglar | the-burglar-who-only-moved-furniture | stormoil | why-sailors-carried-storm-oil |
| japanjob | the-job-nobody-wants-in-japan | seconddraw | why-the-second-draw-always-wins |
| slots | the-science-behind-slot-machines | brain | would-you-upload-your-brain |
| window | the-window-that-breaks-japan-s-gambling-law | knight | this-knight-found-the-ultimate-loophole |

---

# PART A — Claims verdict

## Scoreboard

| # | Claim (short) | TRUE | PARTLY | FALSE | UNCLEAR | Verdict for our rule book |
|---|---|---|---|---|---|---|
| 1 | Voice at frame 1-4, no intro/logo/CTA, ends on last word | 14 | 2 | 0 | 0 | Keep (CONSTANT), small edits |
| 2 | One male narrator, 3.5-4.1 w/s, almost no pauses | 8 | 8 | 0 | 0 | Keep pace; drop "male"; add per-line pace swing |
| 3 | -14 LUFS, LRA 2.4, bed 5-10 dB under speech | 0 | 15 | 1 | 0 | Loudness right; **bed number wrong (~18 dB)** |
| 4 | Captions 1-3 words, white bold, thin black outline, 60-74 %, hard swap | 14 | 2 | 0 | 0 | Keep (CONSTANT); outline is medium, not thin |
| 5 | Script formula (paradox, "Wait…?", "You see,", "Ever…?") | 0 | 16 | 0 | 0 | Rewrite: only the shape holds, the stock phrases don't |
| 6 | Hard cuts almost never; 4 f flashes or 6-8 f dissolves; continuous moves | 2 | 14 | 0 | 0 | Keep "no cuts" and dissolves; **drop the 4 f flash** |
| 7 | Camera holds 80 %; ease-out bursts peaking on frame 1 | 0 | 12 | 4 | 0 | **Wrong.** Camera moves almost all the time, in bells |
| 8 | Thin black outlines, blue/purple shadows, cast shadows | 5 | 11 | 0 | 0 | Outlines are tinted and medium; shadows vary |
| 9 | Lighting changes with beats (night-blue for explanation) | 10 | 6 | 0 | 0 | Keep (CONSTANT); night-blue is for danger, not explanation |
| 10 | Every sentence literal; props carry jokes; flat 2D FX | 9 | 7 | 0 | 0 | Literal + props CONSTANT; FX mix of 2D and light |

Per video (claims 1-10, T/P/F):

| video | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| spear | T | T | P | T | P | P | P | P | T | T |
| memory | T | P | P | T | P | P | P | P | T | P |
| pirate | T | P | P | T | P | P | P | T | T | T |
| jar | T | T | P | P | P | P | P | P | T | T |
| burglar | T | T | P | T | P | P | P | P | P | P |
| japanjob | T | T | P | T | P | T | P | P | T | T |
| slots | T | P | P | T | P | P | P | P | T | P |
| window | T | P | P | T | P | P | P | P | P | P |
| knight | T | P | P | T | P | P | F | P | P | T |
| tree | P | P | F | T | P | P | P | P | T | T |
| teleport | P | T | P | T | P | P | F | P | T | T |
| gravebell | T | T | P | T | P | P | F | T | P | P |
| random | T | T | P | T | P | P | F | T | P | T |
| stormoil | T | P | P | T | P | P | P | T | P | P |
| seconddraw | T | T | P | P | P | T | P | T | T | T |
| brain | T | P | P | T | P | P | P | P | T | P |

---

## Claim 1 — "Voice starts within the first 1-4 frames; no intro, logo, outro or CTA; video ends on the last word."

**Tally: TRUE 14 · PARTLY 2 · FALSE 0 · UNCLEAR 0**

Key evidence:
- First word time is 0.00 s in all 16 (CHANNEL_NUMBERS `first_word`). Voice energy is in by frame 1-4: the voice reaches
  speech level at 0.055-0.115 s = frame 1.6-3.5, median frame 2 (earliest spear 0.055 s; jar, japanjob, memory 0.06 s;
  latest random 0.115 s), measured from `audio16k.wav`. The first 40-50 ms of all 16 tracks are digital silence
  (likely encoder priming).
- First caption is on frame 0 in 10/16 (spear, memory, pirate, jar, burglar, japanjob, knight, random, stormoil,
  seconddraw) and on frame 1 in 6/16 (slots, window, tree, teleport, gravebell, brain). Verified on frames 0 and 1 of
  all 16; tree's "If you" first appears on frame 1.
- No logo, title card, end card or subscribe ask in any of the 16.
- Tail after the last word: median 0.09 s = 3 f (range −0.03 to 0.21 s). One exception: tree runs 0.5 s (15 f) after
  the last word for a silent apple-roll gag (tree, 67.60-68.10).
- Two videos end on a question to the viewer: "So be honest, would you still step inside?" (teleport, 51.98) and
  "So, would you still sign up?" (brain, 55.56).

**Corrected rule (CONSTANT):** First word at 0.00, audible by frame 1-4 (target ≤ 2). First caption on frame 0 or 1. No logo,
intro, title card, end card or subscribe ask. The last frame is the last word's end + 2-6 f (target 3 f). Only a
silent visual "button" gag may stretch the tail to ~15 f. A story question to the viewer as the last line is allowed
(VARIABLE, 2/16).

---

## Claim 2 — "One male narrator, fast and steady, 3.5-4.1 words/s, almost no pauses."

**Tally: TRUE 8 · PARTLY 8 · FALSE 0 · UNCLEAR 0**

Key evidence:
- One voice does everything in 16/16, including character lines, by shifting pitch: "Which one is real?" at 297 Hz
  (spear, 28.10); the guard at 271 Hz (jar, 40.48); the shopkeeper dropped to 130 Hz (memory, 60.06).
- Overall pace 3.47-4.06 w/s, median 3.69 (CHANNEL_NUMBERS). pirate is just under at 3.47.
- But pace is **not steady inside a video**: 2.05 w/s on "Then nobody moved." to 6.4 w/s on throwaway tails (spear,
  17.10); 2.63 w/s on "Eddie never decides anything." (seconddraw, 50.98); ramps to 4.5-5.2 w/s in the last 8 s
  (knight, 32.9-40.6).
- Pauses ≥ 0.3 s: 0-5 per video, median 2, longest 0.40 s (gravebell, 19.36). They sit before a dialogue line, a
  punchline or the pivot (spear, 31.28 before "attack and find out"; jar, 60.26 before the final sentence).
- Gender: median F0 174-211 Hz (median 195). It is high or unclear in 7/16 (memory, slots, window, knight, tree,
  stormoil, brain); tree's 211 Hz is female-typical (tree, §10).
- Voice is heavily levelled: sentence RMS spread 1.3 dB (random) to ~5 dB (tree); no breaths in any video.

**Corrected rule:** CONSTANT — one narrator voices every line; dry, no breaths, heavily levelled (sentence RMS within
about ±1.5-2.5 dB). CONSTANT — overall 3.45-4.1 w/s (median 3.69; target 3.7). COMMON — inside the video, slow to 2.6-3.0 w/s on
punch lines and the key line, speed up to 4.5-5 w/s on throwaway clauses and chases. Sentence gaps 0.10-0.28 s; at most
2-3 pauses of 0.30-0.40 s, only before dialogue, the pivot or the punchline. Bright, animated delivery: 12-14.5
semitones from p10 to p90 (voice.json; median ~14), phrase ends fall hard. Gender is a free choice (VARIABLE).

---

## Claim 3 — "Loudness about -14 LUFS, LRA about 2.4 LU; music/SFX bed only 5-10 dB below speech."

**Tally: TRUE 0 · PARTLY 15 · FALSE 1 · UNCLEAR 0**

Key evidence:
- Integrated loudness: −14.0 to −14.3 LUFS in 10/16; −15.0/−15.1 in 5 (spear, slots, knight, random, brain); −16.1 in
  tree (the FALSE). Median −14.1.
- LRA 1.7-3.1 LU, median 2.3. True peak −1.3 to −3.3 dBTP, median −2.3.
- **Bed level is the wrong part.** In clean word gaps the bed sits 16-22 dB under the voice in 10/16: 18-20 dB (spear,
  memory), 20-28 dB (jar), ≥ 22 dB (burglar), 18-22 dB (japanjob), 16-23 dB (window), 16-20 dB (stormoil), ~20 dB
  (random). Quieter-than-voice outliers: 8-15 dB (seconddraw, cleanest gap 14.5 dB at 20.79); ~11 dB by gap median
  (knight); 5-6 dB raw RMS but almost all below 250 Hz (brain). Median of all 16 ≈ **18 dB**.
- Some have no audible music at all: burglar (voice-only), pirate ("no clear music bed").
- SFX sit under the voice as low booms on impacts, not as a bed: +15-20 dB in the 30-110 Hz band at cannon fire
  (pirate, 1.45, 5.40, 60.82); the collapse is the loudest hit at ~3-8 dB under the voice (jar, 46.86).

**Corrected rule:** COMMON — master −14 LUFS integrated (10/16 at −14.0 to −14.3; the rest −15 to −16), true peak about −2 dBTP. CONSTANT —
LRA 1.7-3 LU (target ~2). COMMON — music bed about **18 dB under the voice** (keep within 16-22), soft, mostly below
500 Hz. COMMON — SFX are sparse event hits 3-12 dB under the voice. VARIABLE — no music at all is allowed.

---

## Claim 4 — "Captions: one word (sometimes 2-3), white bold sans, thin black outline, centred, lower-middle (60-74 %), hard swap on each word."

**Tally: TRUE 14 · PARTLY 2 · FALSE 0 · UNCLEAR 0**

Key evidence (the most stable thing in the whole channel):
- Font look: Montserrat Black/ExtraBold class in 16/16. Cap height 52-54 px (4.9-5.0 % of width) in 16/16 (the
  teleport report's 58 px included the stroke; re-measured 53 px, caps y 1324-1376 on "Now", teleport 27.54). Font size
  about 76 px.
- Fill #FFFFFF (#FDFDFD-#FEFEFE measured). Black outline about 5 px **plus** a black drop shadow. Verifier edge
  profiles on 12 videos: dark band ~4-5 px top, ~5-6 px left, ~7 px right, ~8-9 px bottom, so the shadow sits ~2 px
  right and ~4 px down. Its outer edge fades over ~5 px vs ~2-3 px for the stroke edge in all 12, including pirate,
  knight, spear, japanjob and brain, which the agents called "hard". So one spec fits all: a slight ~2-3 px blur.
- Centre x = 540. Baseline y = 1375-1379 (71.6-71.8 %). Text centre y ≈ 1350 = 70.3-70.6 % in 16/16. Never moves.
- 1.1-1.35 words per caption, typical ~1.25: 229 swaps / 295 words = 1.29 (memory); 55 % one word, 32 % two, 9 %
  three (jar); 83 % one word (slots). Verifier swap counts: memory 1.26, gravebell 1.28, tree 1.22, slots 1.14,
  japanjob 1.12 (the japanjob agent's "about 1.4" is high). Max 3. Small function words glue to the next word ("to a",
  "at two").
- Hard 1-frame swap, no pop, scale or fade (width ratio 1.00 on 155 swaps, memory). No emphasis colours in 16/16.
- Timing: swap 0-5 f before the word (median 1-3 f): 1 f (window), 1.4 f (brain), 3-5 f (burglar, tree), 3-6 f
  (slots). A caption is always on screen; it stays up through pauses.
- The two PARTLY verdicts are only about thickness: "solid 5-6 px … medium-thick rather than thin" (jar, §8) and
  "6-8 px plus soft shadow on 54 px letters" (seconddraw, §8).

**Corrected rule (CONSTANT):** Montserrat 800-900, ~76 px (cap height 53 px), fill #FFFFFF, 5 px black outline
(paint-order stroke) + black drop shadow ~2 px right, 4 px down (blur ~3 px, ~85 %). Centre x 540, baseline
y 1376 (with line-height 1 that is CSS `top: 1311px`, because Montserrat's baseline sits 65 px below the line-box top at
76 px). 1 word per caption by default (~1.25 words per caption); glue a/the/to/of/in/on to the next word; max 3. Hard swap
1-3 f before the word start; hold until the next caption (no blank frames); on screen from frame 0/1 to the last frame.
Sentence case, punctuation kept, digits for big numbers ("10,000", "1000 lbs" in pirate, 58). No animation, no emphasis
colour.

---

## Claim 5 — "Script formula: paradox hook; setting in 1-2 lines; 3-6 escalation beats with short in-character dialogue; a 'Wait…?' mystery beat; pivot 'You see,' then mechanism, often with an 'Ever…?' analogy; ironic payoff in the last 1-2 sentences."

**Tally: TRUE 0 · PARTLY 16 · FALSE 0 · UNCLEAR 0**

Key evidence, element by element:

| Element | Count | Evidence |
|---|---|---|
| Strange claim stated as plain fact in sentence 1 (2.8-6.1 s) | 16/16 | "Gambling is illegal in Japan, yet…" (window, 0.08) |
| …that is a true paradox | 10/16 | yes: spear, pirate, burglar, japanjob, window, knight, teleport, stormoil, seconddraw, brain. No: odd premise (memory, 0.00), warning (jar, 0.00), familiar near-miss (slots, 0.00), shock threat (tree, 0.00), shocking fact (gravebell, 0.00), second-person promise (random, 0.00) |
| Setting in 1-2 lines | 12/16 | 3-4 lines in memory (3.42-15.36), jar (5.30-13.32), tree (2.92-10.94), brain |
| 3-6 escalation beats, each with a prop gag | 15/16 | only 2 mechanism beats (random) |
| In-character dialogue | 8/16 | 1-4 short lines: stormoil 4 (7.66, 13.06, 17.80, 24.20), gravebell 3, spear 2, memory 2, jar 2, burglar 1, slots 1, seconddraw 1 ("After you.", 13.06). None in pirate, window, knight, tree, teleport, random, brain; japanjob only reported speech |
| Literal "Wait…?" | 2/16 | "Wait, practiced?" (gravebell, 35.96); "wait, I'm getting paid for this?" (japanjob, 18.2) |
| Some open-loop question beat | 14/16 | "But how?" (random, 9.94); "How is that possible?" (seconddraw, 19.76); "The catch?" (brain, 35.94); "you're about to find out why" (tree, 13.6) |
| "You see," | 11/16 (12 uses) | as a late pivot to the mechanism in 7 (spear 33.02, burglar 50.98, japanjob 49.15, window 30.38, stormoil 42.94, seconddraw 36.48, gravebell 54.0 = 91 %); as an early world-rule line in 4 (memory 3.42, jar 7.28, knight 3.52, gravebell 3.20); mid-story in tree (19.66 = 29 %). Gravebell uses it twice (verified in transcript.json) |
| Other pivot words | 5/16 | "Eventually," (pirate, 49.04), "So let's crack it open." (slots, 16.54), "Because" (teleport, 37.18), "Well, picture…" (random, 10.72), signposts "Problem is / The catch? / Here's the creepy part" (brain) |
| Literal "Ever…?" analogy | 1/16 | "Ever blown on a bowl of soup?" (stormoil, 47.28) |
| Any spoken everyday analogy | 3/16 | + "think about the last time your phone slid off a table" (seconddraw, 36.90), "Step into the elevator" (random, 13.26); others use a visual metaphor (breaker panel, japanjob 53.9; corkboard + photocopier, brain 18.3-20.3) |
| Ironic payoff in the last 1-2 sentences | 15/16 | often repeats the hook's words: "nobody will even notice" → "nobody noticed" (teleport, 46.38); "a way to tell" (random, 42.96). Irony shown visually instead in pirate (62.3) |

**Corrected rule:** CONSTANT — sentence 1 is one strange claim stated as plain fact, ≤ 6 s, whose "why" is answered
only near the end; the last 1-2 sentences are an ironic payoff that echoes the hook's words. COMMON — the claim is a
paradox (10/16); setting in 1-2 lines (12/16); 3-6 escalation beats, one prop gag each; one open-loop question in plain
words ("But how?", "The catch?"); pivot "You see," (11/16) placed either at 65-91 % of the runtime or as sentence 2.
VARIABLE — 1-4 short in-character lines (8/16), a second-person "you" story (6/16), an "Imagine…" opener in sentence 2
(4/16: tree, japanjob, seconddraw, teleport), a spoken analogy (3/16; prefer a visual metaphor). Do NOT force "Wait…?"
(2/16) or "Ever…?" (1/16). Length 112-295 words (median 220).

---

## Claim 6 — "Hard cuts almost never; most shot changes are 4-frame flash effects or 6-8 frame crossfade dissolves; transitions are often continuous camera moves (follow an object, whip pan with motion blur, fly-through)."

**Tally: TRUE 2 · PARTLY 14 · FALSE 0 · UNCLEAR 0**

Key evidence:
- Visible hard cuts in all 16 videos together: **5**. spear 1 (28.00), pirate 1 (2.20), jar 2 (3.07, 38.97), random 1
  (14.30). Zero in 12/16. (The auto "hard" column, median 3, is mostly wrong: moves, flashes and caption swaps fooled
  it.) Three more cuts are hidden inside fast moves, in 2 videos (jar, 0.83 rush push and 5.33; brain, f967 screen
  fly-in).
- Every other shot change is a cross-dissolve. Per-video verified medians 5-10 f (jar 5-6, window 6, teleport 6,
  stormoil 6, burglar 7, japanjob 7, slots 7, tree 7, seconddraw 7-8, gravebell 9, memory 9-10); channel median
  6 f (auto) to 7 f (verified). Range 2-18 f; 9-11 f for "time passes" montages (teleport, 13.93-17.93); 18 f for the
  biggest world change (memory, 23.58-24.18).
- **4-frame flash transitions: 0/16.** Flash-like moments exist in 7/16 but are story light, used once: teleport beam
  wipe 5 f (teleport, 0.97-1.13), white 2 f on a push into a phone (japanjob, 25.6), 2-3 f bloom leaving a screen
  (brain, 54.57), muzzle flash 3 f (seconddraw, 0.60), red 3 f + blue 3 f police wash (random, 9.70-9.93), 15 f
  glow-out on the sale (memory, 65.0-65.5), 5 f glow ramp into a dissolve (pirate, 30.10).
- Match dissolves (same shape in the same screen spot) in 12/16: ball → goblet (jar, 20.4), storm → porthole and
  bowl → bowl (stormoil, 42.80, 49.80), five object matches (gravebell).
- Continuous joins replace cuts: fly through windows (gravebell, 17.27, 29.03), screens (brain, 20.53, 31.6, 49.0),
  a hull hole (pirate, 2.3); follow-the-object (seconddraw, 0.9-3.3 bullet; stormoil, 0.5-1.5 oil); push into a photo
  (memory, 38.4; burglar, 51.73); foreground occluder wipes (knight, 4.83, 5.80).
- Whip pans as transitions are rare; whips happen inside shots (burglar, 17.4, 40.3) and mostly with light or no blur
  (teleport, 40.6 "no visible motion blur").

**Corrected rule:** CONSTANT — every shot change is a cross-dissolve, default 7 f (range 4-10), both cameras still
moving; at most 1 hard cut per video (0 in 12/16). COMMON — 2+ match dissolves per video; 1+ fly-through/follow-object
join. Dissolves start on the first word of a new clause (window: all 12; memory, 31.57). VARIABLE — one story-motivated
flash (2-15 f) at most. There is **no** standard 4-frame white flash.

---

## Claim 7 — "Camera holds about 80 % of frames; moves are ease-out bursts (peak speed on the first frame, decaying over ~8-10 frames); slow push-ins during holds; low camera heights; dutch tilts for drama."

**Tally: TRUE 0 · PARTLY 12 · FALSE 4 · UNCLEAR 0** (the FALSE ones: knight, teleport, gravebell, random)

Key evidence:
- Truly still frames: 7 % (japanjob), 10 % (burglar), 12 % (tree), 13.6 % (spear), 14 % (gravebell), 17 % (pirate),
  22 % (knight), 24 % (jar, slots, random), 27 % (memory), 28 % (teleport), 29 % (seconddraw), 31 % (brain) (agents'
  own thresholds, 0.05-0.2 %/f; window and stormoil gave no figure). On one uniform threshold (< 0.15 %/f zoom and pan,
  from `frames.json`, verifier): median **22.8 %**, range 8.5 % (japanjob) to 37.6 % (memory); window 10.4 %, stormoil
  20.8 %. **Nowhere near 80 %.** Even "holds" creep: 0.23 %/f median (burglar), 0.22-0.38 %/f (window), 0.2-0.4 %/f with
  2-3° roll drift (tree).
- Big moves are symmetric bells that peak mid-move, 0.6-3 s long (18-90 f), typically 30-55 f: dive 35 f peaking at
  frame 18 (burglar, 3.87-5.07); sine push 44 f (gravebell, 8.00-9.47); crane 87 f peaking at frame 33 (random,
  24.6-27.5); fast moves 17-30 f with 7-10 f ramps (brain, 20.53-21.43).
- Front-loaded ease-out exists but (a) mainly right after a dissolve and (b) decays over 25-55 f, not 8-10:
  −10.5 %/f decaying over 27 f (gravebell, 41.67); 55 f (stormoil, 43.0-44.8); 42 f (tree, 7.5).
- True short snaps exist only on 1-3 emphatic words in ~7/16: ×1.25 in 3-4 f on "run." (jar, 4.73); +15 %/f for 6 f,
  settled by f13 (japanjob, 0.00); a symmetric 21 f ×6 snap on the turn (knight, 30.27).
- Ease-in accelerations into an opening or dissolve in ~8/16: 0.3 → 15 %/f dive (memory, 0.55-0.97); +0.2 → +7.8 %/f
  (slots, 16.7-18.2); crash zooms to 8-15 %/f (teleport, 7.2-8.1, 49.8-50.5).
- Height: low is the default only in ~7/16 (burglar 0.3-0.8 m for a 1.6 m character; seconddraw 0.3-1.0 m; pirate deck
  level). Others sit at eye/chest level (gravebell 1.1-1.5 m for 1.8 m; random 1.3 m) or use many high angles
  (japanjob, §4).
- Dutch: held 5-20° on ominous beats in ~9/16 (memory −14°, 14.6; burglar ~12°, 15.5-17.4; slots 10-15°, 11.4-14.1;
  stormoil 15-20°, 33-34); none in 5/16 (knight, teleport, random, brain, tree).

**Corrected rule:** CONSTANT — the camera is moving or creeping in ~62-92 % of frames (median ~77 %; still frames 8-38 %,
median ~23 %, uniform threshold). Holds creep
0.1-0.6 %/f (typical 0.25 %/f ≈ 7 %/s), often with a 2-3° roll drift. CONSTANT — big moves are symmetric ease-in-out
bells of 30-55 f (range 18-90), peak 1-10 %/f mid-move. COMMON — a move that starts on a dissolve may start fast and
decay over 25-55 f; dives and crash zooms accelerate (ease-in) into the next shot. VARIABLE — 1-3 snap pushes
(×1.25-2.5 in 3-8 f) on emphatic words. COMMON — eye/chest height (~0.8 × character height) by default, plus 1-2 low
hero shots and 1 top-down/high shot. COMMON — held dutch 5-15° only on 1-3 tension beats. One fully locked shot ≤ 3.3 s
is allowed for "nothing happens", time-lapse or a diagram (spear, 17.9-20.4; gravebell, 4.70-8.00).

---

## Claim 8 — "2D flat cartoon characters with thin black outlines in 3D toon environments with hand-painted textures, black ink outlines on 3D geometry, depth of field on backgrounds, warm key light with blue/purple shadows; characters receive scene light and cast ground shadows."

**Tally: TRUE 5 · PARTLY 11 · FALSE 0 · UNCLEAR 0**

Key evidence:
- 2D camera-facing cards in painted 3D sets with ink lines and DOF: 14/16. Exceptions: knight is mostly flat 2.5D
  layers with true 3D only in the aerial (knight, 24.4-26.8); teleport is entirely 2D vector multiplane (teleport, §0
  warning).
- **Outlines are not thin and not black** in 16/16. Colour is a dark tint: #36323f (spear), #2a1d35 / #070920
  (memory), #2E1E2B (pirate), #3b302c-#544637 (jar), #2a1b2e (burglar), #1a1628 (japanjob), #432418 (slots), #2a1c1c
  (window), #333963 (tree), #462e31 (teleport), #0B000D (gravebell), #2E1B14 (random), #2a1318 (stormoil), #2e2236
  (seconddraw), #3A2E34 (brain). It takes the scene tint (maroon #3C1416 at sunset, pirate; navy #1b2343 at night,
  window).
- Width 1.5-5 % of head width as the agents quoted it, median ~2.7 %: 1.5-2.5 % (knight), 2 % (gravebell), 2.2-2.5 %
  (japanjob), 2.5 % (window), 2.7 % (teleport), 3 % (seconddraw), 3.3 % (burglar, slots), 4-5 % (jar). Most of these
  are the thin (lit) side. Brush weight: thicker on the shadow / lower-right side, 2.5-3× (tree 10 px lit vs 25-26 px
  shadow on a 491 px head = 2.0 % / 5.1 %, 36.5; japanjob CU 18 px vs ~55 px on an ~850 px head = 2.1 % / ~6.5 %, 19.75,
  verifier pixel check; stormoil ~2×). So the average around the head is ~3.5-4 %. Drawn into the art, so it scales
  with the card (5-6 px MS, 10-20 px CU).
- Characters take scene light in 15/16 (not teleport: face #fcf6f7 even in rain at night). Soft lit gradient: warm
  key side → lavender/blue shade (memory #c6d5fb → #384ba8 at 72.5). Thin pale rim on ~12/16 (cream #E9DED1 inner rim,
  tree; #fdf8e3, memory; "sticker" rim 2-5 px outside, brain #FFF8FB, spear 2-4 px, knight 1-3 px).
- World ink 2-4 px at mid distance (pirate, jar, slots, seconddraw), tinted (#4A3020 random, #1E0F05 on wood
  gravebell); thicker on near props 8-13 px (japanjob 9-11; stormoil 10-13).
- Shadows: day shadows are warm brown/mauve in ~8/16 (#897675 spear; #B89862 sand tree; #582a12 knight; maroon
  #2c0d0c slots); blue-violet mostly at night/sunset and on some ground (#61719d noon, seconddraw).
- Ground shadows: soft contact blobs in 10/16; silhouette cast shadows in 3/16 (seconddraw #61719d / #534c75, tree,
  stormoil 23.9); none or faint in 6/16 (spear, burglar, japanjob, slots, window, brain).

**Corrected rule:** CONSTANT — flat 2D cards facing the camera, near-white bean heads, stick limbs, ball hands, no
nose/ears, outline drawn into the art in a **dark tinted** colour (plum/brown/navy, never #000): thin (lit) side
~2-2.5 % of head width, thick (shadow, lower-right) side ~5-6.5 %, average ~3.5-4 %. CONSTANT — cards are tinted by scene light. COMMON —
painted 3D sets with tinted ink 2-4 px mid-distance; soft lit gradient on cards; thin cream rim on the key edge; soft
contact shadow under the feet. VARIABLE — shadow hue (warm brown in day, blue-violet at night/sunset), cast silhouette
shadows, fully 2D/2.5D worlds.

---

## Claim 9 — "Lighting changes with story beats (e.g. noon → sunset → night-blue for the explanation)."

**Tally: TRUE 10 · PARTLY 6 · FALSE 0 · UNCLEAR 0**

Key evidence:
- The light changes with story time or mood in 16/16, with 3-10 light states per video (median ~6-7; slots has 3:
  red casino, gold interior, cool x-ray; burglar has ~10, slots §7, burglar §7).
- It often changes inside a shot, on the key word: day → night in ~10 f on "You see," (japanjob, 49.57-49.90); hard
  switch to sunset on "Real numbers work like that elevator" (random, 24.6); sunrise relight (gravebell, 51.9-52.4);
  time-lapse for "a whole week" (spear, 18.6-20.4) and "a few minutes later" (pirate, 32.4-34.0); lamp-off in 3 f
  (burglar, 25.15); 20 % dip on "if this ever" (jar, 3.37-3.93); candle blown out (spear, 32.6).
- **Night-blue is NOT for the explanation in most.** The explanation is warm/bright in ~7/16: bronze interior (jar,
  48-58), warm galley (stormoil, 43-50), daylight (burglar, 50.98-54.7; gravebell, 37-46), sunset (random, 24.6-43),
  gold interior (slots, 18-26), white daylight (brain). It is night/dark blue in ~4/16 (tree, 15-30; japanjob, 49.6+;
  window alley, 27-45; seconddraw, 51.1+). Night-blue marks danger, secrets and twists: the warning (jar, 33-46),
  the storm (stormoil, 27-43), the twist (memory, 71.3+), "Here's the creepy part" (brain, 47.8).

**Corrected rule (CONSTANT):** Change the light on every story-time jump and every mood turn (3-10 states per video,
aim for 4-8).
Use in-shot relights of 3-20 f on the pivot or key word. COMMON — night-blue (#0e2179-#2647B1 ambient with warm
practicals) for danger, secrets and twists; give the explanation its own distinct look (blueprint blue, warm interior,
sunset gold). End on a bright or warm frame or on the colour of the payoff (VARIABLE).

---

## Claim 10 — "Every sentence is illustrated literally; props carry the joke. Effects are flat 2D cartoon sprites (sparkles, splashes, speed lines, dust, stars, light shafts)."

**Tally: TRUE 9 · PARTLY 7 · FALSE 0 · UNCLEAR 0**

Key evidence:
- Literal picture for every sentence in 16/16: spear through an anvil on "pierce anything" (spear, 1.8); kid crashes
  his bike on "a bike" (memory, 12.7); ¥0 register on "single yen" (window, 18); prices pop on "price" (knight, 8.5,
  9.8).
- Props and signs carry the jokes in 16/16 (LANGRAGE → GARBAGE, pirate 17.2; "NOBODY HOME", seconddraw 51-54; "NAME:
  YOU", brain 53.3).
- Flat outlined 2D sprite FX dominate in ~9/16 (pirate, jar, knight, japanjob, tree, spear, random, seconddraw,
  stormoil partly). In ~7/16 most FX are lighting, 3D or UI: LED roll-ups and x-ray wireframe (slots, 26.1); neon,
  chrome balls, tilt-shift (window); snow points, 3D paper cards, low-poly clods (gravebell, 38.7, 44.6); error boxes,
  HUD, missing texture (brain, 21.9, 35.5); bloom, rain, volumetric shafts (memory).
- The near-universal sprite is the **sweat drop** (13/16). Glints/sparkles ~8/16. Speed lines only ~5/16 (spear,
  pirate, jar, seconddraw, stormoil). Splashes ~3/16. Screen shake 3/16.

**Corrected rule:** CONSTANT — every sentence gets a literal picture that lands on its key word (0-3 f early), and a
prop or readable sign carries each joke. COMMON — a small 2D sprite kit (sweat drop, 4-point glint, impact ring,
smoke/steam puff, Z's, tears), drawn with the same tinted outline. COMMON — light FX (bloom on practicals, god-ray
planes, dust motes). VARIABLE — speed lines, splashes, UI/x-ray FX.

---

## What is fixed and what is free (summary of Part A)

**CONSTANTS (15-16 of 16) — copy exactly:**
1. Voice at 0.00 (audible by frame 1-4); caption from frame 0/1; no logo/intro/end card; video ends 2-6 f after the last word (15/16).
2. One narrator plays every voice; 3.45-4.1 w/s overall (median 3.69); ≤ 3 pauses ≥ 0.3 s; dry, levelled, no breaths; LRA 1.7-3 LU.
3. Caption spec (Claim 4) — to the pixel.
4. Cross-dissolves as the shot change; ≤ 1-2 hard cuts per video.
5. Camera never really stops; holds creep; moves are smooth bells.
6. Near-white bean-head cards with tinted dark outlines drawn into the art; cards tinted by scene light.
7. Light changes with story beats (3-10 states, median ~6-7).
8. Literal illustration of every sentence; jokes carried by props and readable signs (15/16 have readable signage;
   jar uses heraldry only).
9. No ending sting or outro music.

**COMMON (9-14 of 16) — default, but may skip:**
−14.0 to −14.3 LUFS (10) · bed 16-22 dB under voice (10) · paradox hook (10) · "You see," (11) · open-loop question
beat (14) · match dissolves (12) · painted 3D sets with tinted ink (14) · DOF on MS/CU with sharp wides (~12) · wide
lens on wides, 50-65° vertical (10) · contact shadow blobs (10) · cream rim on cards (~12) · sweat-drop sprite (13) ·
held dutch on tension beats (9) · one diagram/cutaway/"inside view" for the mechanism (~10).

**VARIABLE (≤ 8 of 16) — free choices per story:**
topic, era, setting · story mode (third-person tale 7, second-person "you" story 6, explainer ladder 3) · 31-78 s length · 1-17 characters · dialogue lines (8) · spoken
analogy (3) · music genre or no music (2 without) · SFX density (4-5 have none) · snap zooms (7) · whips inside shots
(7) · screen shake (3) · screen-space HUD overlays (tree, teleport) · fully 2D/2.5D worlds (2) · closing question to
the viewer (2).

---

# PART B — Template gap list

"Template now" = what `studio\src\videos\bridge\` and `sound\bridge\audio\` ship today (bridge short). REPO = section
of REPO_KNOWLEDGE.md. Priority: **P1** = must fix before our first video, **P2** = should, **P3** = nice.

## Camera

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| Glide shape and length | Symmetric bells peaking mid-move in 16/16; big moves 30-55 f typical, range 18-90 f (burglar 3.87-5.07 = 35 f; gravebell 8.00-9.47 = 44 f; random 24.6-27.5 = 87 f); fast moves 17-30 f (brain 20.53). Ease-out only on moves that start on a dissolve, decay 25-55 f (gravebell 41.67; stormoil 43.0). Ease-in into dives/dissolves (slots 16.7-18.2) | Smootherstep `x³(x(6x−15)+10)` (story.ts:99) — right shape. Default dur 24 f (story.ts:110); used 18-40 f, crane 93 f (story.ts:198-261) | Keep smootherstep. Default dur 24 → **36 f**; allow 18-90. Add an `easeIn` (x³) key type for dives into a dissolve and an `easeOut` (1−(1−x)⁴, story.ts:17 already has it) for moves that begin on a dissolve, decaying over 25-55 f | P2 |
| Cut rules / big reframes | 5 visible hard cuts in 16 videos; 0 in 12/16 (spear 28.00; pirate 2.20; jar 3.07, 38.97; random 14.30). Big reframes are done in-shot: crane −90 % (spear 8.4-10.8), ×4 reveal pull-out (slots 0.35-1.5), crash zoom (teleport 7.2-8.1). Cuts that exist are hidden at peak speed (jar 0.83; brain f967) | Rule "move > 360 px@720 or > 40 % zoom ⇒ `cut: true`" (story.ts:89-94). 6 hard cuts at shot boundaries + 10 in-shot cut keys (story.ts:215, 225, 230, 231, 235, 236, 237, 250, 254, 259) | **Delete the cut rule.** Max 1 hard cut per video, on an "enter/punch-in" beat 2-3 f before a line. Turn each cut key into (a) a 30-60 f glide, (b) a dissolve to a new shot id, or (c) a cut hidden on the peak frame of a crash zoom | P1 |
| Hold creep | Still frames 7-31 % (median ~23 %). Holds creep 0.1-0.6 %/f, typical 0.2-0.4 (burglar median 0.23; window 0.22-0.38; tree 0.2-0.4 + 2-3° roll drift). One locked beat allowed (spear 17.9-20.4; gravebell 4.70-8.00 = 3.3 s; stormoil 61.7-64.57) | `pushK` rate 0.0015-0.0035/f, punch 0.006 for 30-35 f (story.ts:117-122); "every hold creeps", QA flags ≥ 12 f frozen | Keep. Widen rate to 0.001-0.006/f. Add an optional 2-3° roll drift across a hold. Allow 1 locked hold ≤ 3.3 s per video (time-lapse/diagram) and whitelist it in QA | P3 |
| Snap / crash zoom | ~7/16. Snap push ×1.25 in 3-4 f, ×2 in 8 f, ×2.5 in 6 f, front-loaded (jar 4.73, 19.93, 47.27). Hook snap +15 %/f for 6 f, settled by f13 (japanjob 0.00). Symmetric 21 f ×6 snap on the story turn (knight 30.27). Crash-in ×3 in 3-4 f (seconddraw 14.37). Ease-in crash zoom to 8-15 %/f straight into a 3-6 f dissolve (teleport 7.2-8.1, 49.8-50.5) | None. Only `pushK` punch 0.6 %/f (story.ts:117) | Add `snap(f0, k, n)`: scale ×1.25-2.5 over 3-8 f with easeOut quart, start 0-2 f before the word; and `crashIn(f0, n)`: easeIn over 25-30 f ending at 8-15 %/f, into a dissolve or hidden cut. Use ≤ 3 per video | P2 |
| Whip pans | Inside shots in ~7/16; bells 12-36 f, peak 4-11 % width/f; light or no blur (spear 6.1-7.4 = 5 %w/f; pirate 6.4-6.85 peak 7.8 %w/f; japanjob 2.1-2.4 = 11.5 %h/f; teleport 39.9-41.2 = 8.3 %w/f, no blur; gravebell 34.2-35.1 = 4.2 %w/f) | None (REPO §4 "Whips: none"; no motion blur) | Add a whip preset: smootherstep 14-30 f, 40-85 % frame-width pan, used inside a shot to reach a new subject. Motion blur optional (3-5 sub-frames) — not needed for the look | P2 |
| Continuous joins | Match dissolves in 12/16 (jar 20.4 ball → goblet; stormoil 42.80, 49.80; gravebell 5 matches). Fly-throughs: windows (gravebell 17.27, 29.03), screens (brain 20.53, 31.6, 49.0), holes (pirate 2.3). Follow-the-object (seconddraw 0.9-3.3; stormoil 0.5-1.5). Push into a photo for a flashback (memory 38.4; burglar 51.73). Near-object wipes (knight 4.83, 5.80; brain 5.57) | None. `layersAt` crossfades whole worlds (story.ts:69-75); FOREGROUND has 2 props (story.ts:339-348) | Plan per story ≥ 2 match dissolves (align both layers' cameras so the shared shape sits on the same pixel) and ≥ 1 fly-through or follow-the-object join. Later: a render-to-texture helper for "fly into a screen/photo" | P2 |
| Impact kicks / shake | Rare: 3/16. 1 f 14 px jolt + ~10 f settle on the collapse (jar 46.80); ±2-5 px rattle at 5 Hz for 0.8 s on a scream (jar 39.0-39.8); 1-2 f jolt (pirate 60.8). 13/16 say "no screen shake" | 5 kicks, 7 f sign-flipping decay, ~4.5 px@1080 per unit (story.ts:266-282) | Max 1-2 per video, only on the biggest hit. Shape: 1 f offset 12-15 px then 10 f damped spring. No kicks on small hits | P3 |
| Lens FOV | Wides ~50-65° vertical in 10/16 (pirate 55-60; burglar 55-65; window 55-65; random 60-65; stormoil 50-60; seconddraw 50-55). Close shots 25-40° (memory 25-35; japanjob 30-35; stormoil 30-35). Outliers: tree 35-45, teleport 15-20 (2.5D) | Default fov 40 (story.ts:104; Bridge.tsx:99); shots use 34-46 | WS/EWS 50-55°, MS 40-45°, MCU/CU 30-36°. Re-check the ink and texel rules after the change (REPO §4 texel rule assumes 36°) | P2 |
| Camera height | Eye/chest level default in ~9/16 (gravebell 1.1-1.5 m for a 1.8 m character; random 1.3 m; slots 1.1-1.2 m seated). Low 0.3-1.0 m hero shots in ~7/16 (burglar 0.3-0.8 m; seconddraw 0.3-1.0 m; spear road ~1 m). ≥ 1 top-down/high shot in ~12/16 (burglar 25.65; random 31.8; gravebell 0.7) | ~0.8 × character height; low shots raised to 1.4 m (REPO §4) | Keep eye/chest default (0.75-0.85 × height). Add 1-2 low shots at 0.2-0.5 × height and 1 top-down per video | P3 |
| Dutch / roll | Held 5-20° on 1-3 tension beats in ~9/16 (memory −14° at 14.6; pirate 14° at 49-51; burglar 12° at 15.5-17.4; slots 10-15° at 11.4-14.1; stormoil 15-20° at 33-34). Banks 3-12° during lateral moves (gravebell). None in 5/16 | Keys hold ±0.02-0.04 rad (1-2.3°); "roll through level" 4-4.6° (story.ts:93-94, 216, 221) | Allow a held roll of 0.09-0.26 rad (5-15°) on ≤ 3 tension beats; bank 3-8° on lateral moves, settling level | P3 |

## Edit and transitions

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| Crossfade lengths and placement | Every shot change is a dissolve. Per-video medians 5-10 f (channel ~6-7 f). 7-22 per video (median 13.5). 9-11 f for time-passing montages (teleport 13.93-17.93), 3-5 f in fast action. The dissolve starts on the first word of a new clause (window: all 12; memory 31.57). Both cameras keep moving | `XFADE {9:6, 11:8, 12:8, 13:8, 14:8, 15:8}` on 6 of 14 boundaries (story.ts:64); the other 8 are hard cuts | XFADE on **every** shot id, default 7 f (4-10). Centre it so the new shot is fully in by the 2nd-3rd word of the new clause. Keep both layers gliding. (Fix the light leak first — see Light) | P1 |
| Flash after the hook | 0/16 use a white flash after the hook. Story-motivated flashes once, in 7/16: beam wipe 5 f (teleport 0.97-1.13); white 2 f (japanjob 25.6); bloom 2-3 f (brain 54.57); muzzle 3 f (seconddraw 0.60); red + blue wash 6 f (random 9.70-9.93); glow-out 15 f (memory 65.0-65.5) | `FLASH_AT = 130`, white 1/.75/.45/.2 (story.ts:65; Bridge.tsx:109, 113) + `flash_whoosh` cue (sfx.py:87-88) + music "button" chord (REPO §6.3) | **Delete** FLASH_AT, the flash cue and the button chord. Add an optional `glowTo(f, colour, n)` overlay (2-15 f) for one in-story light event | P1 |
| Dissolve blend | slots: mid-dissolve frames +8-12 luma brighter and 20-45 % less saturated (slots 8.30-8.50) — looks like a linear-light blend. Not measured in the others | CSS opacity on two stacked canvases (Bridge.tsx:96-103, 112) = display-space blend | Check 2 more videos. If confirmed, blend in linear light (or lift exposure ~+4 % at the dissolve midpoint) | P3 |

## Lens and post

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| DOF share and strength | Strong on MS/CU/inserts, ~10-20 px blur behind faces (jar §7; memory 10-25 px; seconddraw 8-20 px). Wides sharp in ~12/16 (jar "wide shots are mostly sharp"; gravebell; burglar deep focus except inserts 52-54.7; knight DOF in 4/17 shots). One rack focus in 16 videos (memory 34.9-35.6) | Blur on 58 % of frames; hook wide cInf 15 (story.ts:300); MS 10-12, CU 14, river 16 (story.ts:299-321); maxCoC 24 (Bridge.tsx:57) | cInf **0** on every WS/EWS/establishing shot. MS 10-12, CU/insert 14-16. Target 30-40 % of frames. Keep "no focus pulls" | P2 |
| Foreground framers | Blurred foreground props in many MS/CU (memory frog hat 37.5; slots reels 8.4-11.4; window cat and crates 27-37; jar banner 13.5) and near-object wipes (knight; brain; stormoil 23.4) | 2 FOREGROUND entries, ~12 % of frames (story.ts:339-348) | Add one foreground element to ~1/3 of MS/CU shots (0.3-0.5 × focus distance, 10-25 % of one edge, never over a face) | P3 |
| Vignette | 10-25 % in interiors/night (memory 10-15 %; seconddraw 15-25 %; brain 10-15 %), 30-40 % in night alleys (window shots 10, 12, 13); none in many day shots (pirate, slots, knight, random, teleport day) | Grade vignette day [0.10, 0.45], golden [0.16, 0.40] (grade.ts:99, 108); no night preset | Day 0-0.10; night/interior 0.25-0.35 in the new presets | P3 |

## World look

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| World ink colour | Never pure black in 16/16. Day: dark plum/brown tint of the surface (#2E1E2B pirate; #36323f spear; #4A3020 random; #1E0F05 on wood, gravebell; #4C2521 on wood, brain). Night: navy/indigo (#1a1630 window; #17152d japanjob; #1a1d40 seconddraw). Floor tiles even use gold-brown lines (spear §6) | `color: "#030303"` (ink.ts:52, DEF); only a ×0.3 fog tint | Per-light ink colour: day #2E1E2B, golden #3C1416, night #1a1630, interior #2a1b2e — or ink = surface albedo × 0.15-0.25 (needs albedo in the normal pass). This is an author-only rule (REPO §8) that the channel never uses | P1 |
| World ink width | 2-4 px at mid distance in 12/16 (spear, pirate, jar, slots, seconddraw); 1-2 px far (random; memory far buildings); thicker on near props in world units, 8-13 px (japanjob desk 9-11; stormoil 10-13; gravebell 9-13); inner/crease lines thinner and lighter | 5.1 px at 6 m → 3.3 px at 90 m, creases × 0.8 (ink.ts:53-54) | 3.5 px at 6 m → 1.8 px at 90 m; near boost to 8-10 px below ~1.5 m; creases × 0.6 and ~60 % opacity | P2 |
| Practical lights and night look | Night/interior scenes are lit by warm practical pools with bloom on a blue ambient: windows #fee7c2 (memory), #fefdc0 (window), #FFAD58 (gravebell), lanterns #EDB96E (gravebell) over ambient #0e2179 / #1C3783 / #07165F. Bloom on practicals in 16/16 | TWO_TONE throws away all non-sun light: `reflectedLight.indirectDiffuse = vec3(0.0)` (shade.ts:40). No point-light pools on world or cards (REPO §9.2). Bloom threshold 1.0, emissive only (Bridge.tsx:33) | Add 2-4 point-light "pool" uniforms to TWO_TONE and the card shader; emissive window/lamp materials > 1.0 so they bloom. Needed for any night or interior beat | P1 |
| Light states per beat | Light follows story time and mood in 16/16; 4-9 states per video; in-shot relights on the key word: ~10 f day → night on "You see," (japanjob 49.57-49.90); sunset switch on the rule line (random 24.6); sunrise relight (gravebell 51.9-52.4); time-lapse (spear 18.6-20.4; pirate 32.4-34.0); 3 f lamp-off (burglar 25.15); 20 % dip on an ominous word (jar 3.37-3.93) | Only `"day" \| "golden"` (`LIGHTS` lights.ts:15, `LOOK` lights.ts:45; story.ts:43); light fixed per shot (story.ts:46-62); one change in the film (day → golden → day) | Add **night, interior (warm practical) and dawn** presets: new keys in `LIGHTS`, `LOOK`, `GRADES`, `GRADE_STRENGTH`, `CONTACT`, story.ts `Light`, and every `"golden"` branch (REPO §11.D), using the measured night/interior numbers (REPO §4: night median Y' .243, black (9,10,38), vignette .46). Allow a per-frame blend between two presets for 3-20 f in-shot relights | P1 |
| Crossfade light leak (bug) | Channel dissolves cross light states all the time (memory 23.58-24.18 noon → night; stormoil 26.57-26.75 → storm blue) | **Bug H** (REPO §9.2): `TONE`/`CHAR` are module singletons (shade.ts:7-17) written in React render (Bridge.tsx:76 calls `world.update`, which sets them at world.ts:368-371); the outgoing layer shows the incoming light during the fade | Set the uniforms per World in `scene.onBeforeRender` (or clone per World). Must land before "every boundary is a dissolve" | P1 |
| In-world text / signage | Readable signs carry jokes in 15/16 (jar: heraldry only). Flip counters (spear 8.0 "YEARS AT WAR 100"; memory 20.4 "BAHAMAS 0300"), labels (pirate 17.2 LANGRAGE → GARBAGE; japanjob door sign), documents (knight 3.4 pardon; gravebell certificate 26.0), LED counters (random 3.6-5.0 $0 → $2,000,000; slots LED). Bold serif / slab / western caps; letters ≥ 40 px at 1080, readable in < 1 s (japanjob §13) | One sign sprite (`fxSign`, toon.ts:830), `clockTex` and `flagTex` (build.ts:568, 577) — no general label system | Add `labelTex(text, font, fill, ink, w, h)` on the `ctex` cache (paint.ts) + prop helpers: sign board, plaque, sticky note, paper document, LED counter and flip counter that change per frame. Plan 5-20 labels per video | P1 |
| HUD / explainer inserts | An "inside view" for the mechanism in ~10/16: blueprint (spear 33.1-38; teleport 37.2-44.4), x-ray / wireframe (slots 26.1-30.9; tree 40.73), cutaway (jar 61.7-64.8; gravebell 4.7-8.0), inside-the-head (seconddraw 44.7-54.3), screen UI (brain 21.4; japanjob 25.6). True screen HUD overlays only in tree (~19 % of runtime: satellite 15.3, thermal 62.3) and teleport split labels | None | Build one reusable insert kit: flat blueprint plane (paper #153a81 / #1d3c64, white/cyan line art, caps labels), x-ray look (cyan #3ca3a9 / #6FE0F0 edges on #00243F), ground cutaway (strata layers). Use one per explanation. Screen-space HUD stays optional | P2 |

## Characters

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| Outline | Tinted dark in 16/16 (#2E1E2B pirate; #2a1b2e burglar; #3b302c jar; #333963 tree; #1a1628 japanjob). Agents' width 1.5-5 % of head width, median ~2.7 %, mostly taken on the thin side. Verifier pixel check: thin (lit) side 2.0-2.1 %, thick (shadow) side 5.1-6.5 %, average ~3.5-4 % (tree 36.5: 10 px vs 25 px on a 491 px head; japanjob 19.75: 18 px vs ~55 px on ~850 px). Thick:thin 2.5-3:1. Scales with the card | `INK #241726` (toon.ts:6) — colour is fine. Body/limb width `ow = 5u` = **5 % of head width** on average, i.e. 2.75 % thin / 7.25 % thick with k 0.45; face ring 0.85 × 5u = 4.25 % (toon.ts:352, 457). Thick/thin k 0.45 = 2.6:1 (toon.ts:145) | `w0` 5u → **3.5-4u** (thin ~1.9-2.2 %, thick ~5.1-5.8 %). Not 3u: its 1.65 % thin side is below every measured card. Keep `thickAngle` on the shadow side (toon.ts:225); keep #241726 and let `cardShade` tint it per light | P1 |
| Head and fills | Heads near-white/cream in 16/16 (#fff6f0 spear; #FCF6F1 pirate; #f9f4ef teleport; #F9F2EC random; #fefcfe stormoil; one peach #fdd689 in japanjob). Identity comes from hats, hair caps and clothing colour. No nose/ears and ball hands in 16/16 | `SKIN #ffe2c2`, `SKINS ["#ffe2c2", "#f5c9a0", "#ecd0b6", "#c99067"]` (toon.ts:7, 57) → peach/tan heads | Default head fill **#F8F2EC** (variants #FFF9F5, #F2EEF2, #FCE9CD). Give identity through hair/hat/outfit (one saturated body colour + one signature item, REPO §11.E) | P1 |
| Shading and rim | Cards relit by scene light in 15/16 (not teleport). Soft gradient warm key → lavender/blue shade (memory 72.5 #c6d5fb → #384ba8; slots #dfc7ce; stormoil #e8def9; japanjob #d6d8e5). Thin pale rim in ~12/16: inner cream rim on the key edge (tree #E9DED1; memory #fdf8e3 8-12 px in CU; gravebell; random band #B0A8B8) or outer "sticker" rim 2-5 px (brain #FFF8FB; spear 2-4 px; knight 1-3 px) | `cardShade`: tint, head gradient ~14 % (`GRAD_K 5.5`, cardshade.ts:12-14), lavender far side, top +5 % (cardshade.ts:37). Rim **only in golden light**: `warm = smoothstep(.2, .4, 1 − charTint.b)`, colour (0.95, 0.52, 0.16) (cardshade.ts:43-54) | Turn the rim on in every light: day cream (0.96, 0.93, 0.86) ~2-3 px at 1080; night cool lavender; keep golden orange. (REPO §8 lists the rim as an author choice; the channel supports a cream one) | P2 |
| Ground shadows | Soft contact blob in 10/16 (pirate; jar; knight; random 35-40 %; teleport). Silhouette cast shadows in 3/16 (seconddraw #61719d noon, #534c75 sunset; tree #B89862 on sand; stormoil 23.9). None/faint in 6/16 (spear, burglar, japanjob, slots, window, brain) | Day: contact pool 0.52 × 0.40 m, multiply [.20, .21, .33] + a soft tail; golden: real card shadows (cast.ts:203-222) | Keep. Lighten the day contact to ~30-40 % opacity; tint it to the ground (warm brown on sand/wood, blue-violet on snow/pavement) | P3 |
| Mouth / lip | No lip-sync on narration in 16/16. Mouth flaps only during a character's quoted line (8/16 with dialogue): shapes held 2-6 f (memory 60.0-63.0); 3 shapes held 4-6 f (burglar 18.10-21.08); jar 3.4-5.1, 40.5-43.4; every 2-3 f (slots 8.48-11.40) | No lip-sync; mouths change only with expressions (REPO §4 Mouths) | Add a 3-shape flap (open oval / slit / closed) cycling every 3-5 f during a character's quoted line, driven by the `words.json` spans | P2 |
| Walk, bob, rate | Cut-out puppet on 1s in ~13/16 (faces on 2s in stormoil, slots). Expression swaps instant (1 f) or 2-3 f blends. Blinks 2-3 f, rare. Walks rubber-hose; extras often glide (spear messengers; slots 4.5-5.95) | On ones; march 15 f/step = 2 steps/s (story.ts:29); bob 5 % march / 3 % stroll (toon.ts:453-454); blink LID 4 f (cast.ts:173) | No change needed for the look. For a new story: stroll 2.5-3 steps/s, bob ~3 %, blinks 2-3 f; let crowd extras glide | P3 |

## Captions

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| Captions | CONSTANT 16/16: Montserrat Black/ExtraBold class, cap height 53 px (~76 px font); #FFFFFF; ~5 px black outline + black shadow 3-4 px right, 4-5 px down; centre x 540, baseline 1376, text centre 1350 (70.3 %); 1.25-1.5 words per caption, max 3; hard 1-frame swap 1-3 f before the word; always on screen from frame 0/1 to the last frame; sentence case + punctuation; no emphasis colour (memory §8; jar §8; pirate §8) | **None** — author rule "no captions" (REPO §8). `Root.tsx` has no caption layer. `public/fonts/Montserrat.ttf` is present | Build `Captions.tsx` drawn above both canvases (inside `BridgeShort`, after the layers, Bridge.tsx:111-114): `@font-face` from `staticFile("fonts/Montserrat.ttf")`, weight 800-900, 76 px, fill #FFFFFF, `paint-order: stroke` with a 10 px black stroke (5 px visible), `text-shadow: 2px 4px 3px rgba(0,0,0,0.85)` (measured), centre x 540, baseline 1376 = CSS `top: 1311px` at line-height 1 (Montserrat baseline is 65.2 px below the box top at 76 px; `top: 1323` would land it at ~1388). Chunks of 1-3 words (~1.25 per chunk) from the hand-fixed `words.json`; show at word start − 2 f; hold to the next chunk. Scale every px by height/1920 | P1 |

## Pacing and structure

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| Length, words, pace | 31-78 s (median 57.6); 112-295 words (median 220); 3.47-4.06 w/s (median 3.69) (CHANNEL_NUMBERS) | 67.5 s, 218 words = **3.2 w/s** (REPO §3.2, §9.1) | Target 50-60 s, ~210-230 words, 3.7 w/s. Write to the beat shape in Claim 5 | P1 |
| Shots, framings, places | Verified shots 7-24 (median 16.5), median shot 2.88 s; a new framing every ~1.4-2.1 s (brain 1.4; jar 1.6; slots 1.6; gravebell 1.7; memory 2.1); caption swap every 0.33-0.38 s; 5-18 locations (median ~8) | 15 shots (story.ts:46-62), median shot 130 f = 4.3 s; ~25 set-ups counting cut keys; 3 places (bridge, river, park) | 14-20 shots holding 30-40 framings; 6-10 locations; every sentence gets its own literal picture and one prop gag | P1 |
| Start and end | First word 0.00 in 16/16; tail median 0.09 s (2-6 f); audio stops with the last word (≤ 0.15-0.25 s fade); no sting (memory 77.52-77.82; jar 64.86) | TOTAL = last word × 30 + a few frames (REPO §3.4); mix fade 30 ms (mix.py:256); the score ends on a final Bb chord with a fade at 67.3-67.5 s (REPO §6.3) | TOTAL = last word end + 3 f; first word by frame 2; music cut (or ≤ 0.15 s fade) on the last word; no final chord | P1 |

## Sound

| Area | Channel (measured, evidence) | Our template now | Change needed | Pri |
|---|---|---|---|---|
| Loudness master | −14.1 LUFS median (10/16 at −14.0 to −14.3; 5 at −15.0/−15.1; tree −16.1); TP median −2.3 dBTP (−1.3 to −3.3); LRA median 2.3 (1.7-3.1) | `TARGET_LUFS = -15.0`, `CEIL_DBTP = -1.2` (mix.py:20-21); bridge result −15.0 LUFS, −1.2 dBTP, LRA 2.4 (sound\bridge\audio\cues.md:13) | `TARGET_LUFS = -14.0`, `CEIL_DBTP = -2.0`. Keep LRA ≤ 2.5 | P1 |
| Music level | Bed ~18 dB under the voice (median of 16; 10/16 in 16-22 dB: spear 18-20, japanjob 18-22, stormoil 16-20). Outliers 8-15 dB (seconddraw), 5-6 dB RMS but sub-bass only (brain). Mostly < 500 Hz | `MUSIC_TARGET` −9.5 to −12 LU per section (mix.py:27-28); duck −3 dB (mix.py:22). Bridge stems: voice −13.5, music −23.7 LUFS = **10.2 LU under** (cues.md:14) | `MUSIC_TARGET` ≈ **−18 LU** for every section (range −16 to −22); low-pass the bed at ~3-4 kHz; keep the duck. Fix the no-speech NaN bug first (mix.py:105-118, REPO §9.3) | P1 |
| Music style and ending | Soft pad / plucks / drone, no clear beat in ~12/16 (spear A-chord pad 220/440/660 Hz; jar D underscore; seconddraw ~500 Hz drone). Exception: brain ~100 BPM 808 sub. Flat energy; a brief drop under 1-2 turning lines in 3/16 (teleport 18-20, 30-32; gravebell 32.6-40.0; seconddraw 36.75). No ending sting or chord in 16/16. No music in 2/16 (burglar, pirate) | 120 bpm brass march (tuba, snare, fife, glock), tutti cut + "button" chord on the flash, dead stop at 32.985 s, final chord on the last word (music.py:1, 13; REPO §6.3) | Score a quiet pad/pluck bed in one key, no drums, no final chord. Optional 6-10 dB dip under the twist/pivot line. Choose "no music" for dialogue-heavy stories | P2 |
| SFX density and whooshes | Sparse. Low booms/thuds under the voice on visible impacts (pirate 22 events, cannon at 1.45 = +15.6 dB in the sub band; jar collapse 46.86 the loudest, ~3-8 dB under voice; knight hits 0-6 dB under). A diegetic motif may recur (gravebell bell at 11.9, 15.9, 32.7, 48.6). **0 whooshes on dissolves** in most (jar 0/23; burglar 0/14; gravebell 0/15; brain 1/20). No SFX found at all in 4/16 (burglar, memory, teleport, window) | 358 cues, incl. 14 `whoosh_cam` + 5 `whoosh_xfade` + `flash_whoosh` (sfx.py:86-105); events at naive − 6 LU (REPO §6.2); 78 stomps + 56 deck flexes + 147 tourist steps | Delete `whoosh_cam`, `whoosh_xfade`, `flash_whoosh`. Keep 5-25 event SFX on visible impacts at −6 to −12 LU under the voice. No per-footstep beds unless the action is the gag | P1 |
| Voice processing | Heavy levelling: sentence RMS spread 1.3 dB (random), 2.6 dB (jar), 3.5 dB (brain); dry; no breaths; strongest band 120-500 Hz (window §11; gravebell §10) | Voice is "gain only (no EQ, no compression, no pitch)" (mix.py:60, 291) | Add a levelling stage before the mix: gate breaths, compress ~3:1 above −24 dBFS, optional low-mid shelf; aim for sentence RMS within ±1.5 dB | P2 |

---

## Top 10 changes before our first video

1. **Captions overlay to the channel spec (P1).** New `Captions.tsx` above both canvases: Montserrat 800-900 76 px
   (`public/fonts/Montserrat.ttf`), #FFFFFF, 5 px black outline + black shadow 2 px right / 4 px down with ~3 px blur,
   centre x 540, baseline 1376 (CSS `top: 1311px` at line-height 1), 1-3 words per chunk (~1.25 average) from
   `words.json`, hard swap 2 f before each word, on from frame 0 to the last frame.
2. **Transition grammar (P1).** Every shot change becomes a 7 f dissolve (4-10); delete the "> 360 px or > 40 % zoom ⇒
   cut" rule and all 10 cut keys; at most 1 hard cut per video; delete `FLASH_AT = 130`, its flash cue and the button
   chord; plan ≥ 2 match dissolves and ≥ 1 fly-through per story.
3. **Fix the crossfade light leak and add light presets (P1).** Per-World uniforms in `onBeforeRender`; new night,
   interior and dawn presets with measured numbers; per-frame relight blends of 3-20 f on the key word; 2-4 point-light
   pools in TWO_TONE and the card shader so lamps and windows light the night.
4. **Audio master (P1).** `TARGET_LUFS = -14.0`, `CEIL_DBTP = -2.0`, `MUSIC_TARGET ≈ -18 LU` everywhere, delete the
   19 whoosh cues and the flash cue, keep 5-25 impact SFX at −6 to −12 LU, and add voice levelling (±1.5 dB sentence
   RMS, no breaths).
5. **Script and timing (P1).** 50-60 s, ~220 words at 3.7 w/s; first word by frame 2; TOTAL = last word + 3 f; music
   cut on the last word with no final chord; 14-20 shots, 30-40 framings, 6-10 locations, one literal picture per
   sentence.
6. **Character art (P1).** Outline `w0` 5u → 3.5-4u (thin side ~2 %, shadow side ~5-6 % of head width, as measured); head fill #F8F2EC
   instead of the peach/tan `SKINS`; identity from hats, hair and clothes; turn the card rim on in every light (cream
   by day).
7. **World ink (P1/P2).** Ink colour `#030303` → per-light tint (day #2E1E2B, golden #3C1416, night #1a1630,
   interior #2a1b2e); width 5.1 → 3.5 px at 6 m and 3.3 → 1.8 px at 90 m, with near props up to 8-10 px.
8. **Signage kit (P1).** `labelTex()` canvas painter plus sign, plaque, document, LED counter and flip-counter helpers;
   5-20 readable joke labels per video, bold serif/slab caps, letters ≥ 40 px at 1080.
9. **Camera grammar (P2).** Default glide 24 → 36 f (18-90 allowed); add `snap` (×1.25-2.5 in 3-8 f), `crashIn`
   (ease-in into a dissolve), a whip preset (14-30 f bell) and ease-out-after-dissolve keys; wides at fov 50-55°, MS
   40-45°, CU 30-36°.
10. **Depth of field (P2).** cInf 0 on all wides and establishing shots; MS 10-12, CU/inserts 14-16; target 30-40 % of
    frames blurred (now 58 %).
