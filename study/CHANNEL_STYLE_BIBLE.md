# CHANNEL STYLE BIBLE — 2D bean-head cards in painted 3D worlds

Written 2026-11-10 from 16 reference shorts (private study only). Purpose: one rulebook for making NEW shorts that
match the look, sound and pacing, using our pipeline (three.js r175 in Remotion 4.0.290 + synthesized Python audio).
Never copy the reference characters, shots or scripts. Never name the channel. Our stories, characters and voice are our own.

How to read this file:
- **CONSTANT** = seen in 15-16 of 16 videos. Treat as a rule.
- **COMMON** = seen in 9-14 of 16. Default choice; break it only for a reason.
- **VARIABLE** = 8 or fewer, or a free creative choice.
- Counts are written like "12/16". Evidence is cited as (short slug, time in seconds). "f" = frame at 30 fps.
  "%/f" = scale change per frame; "%w/f" = sideways shift as a share of frame width per frame. Pixels are at 1080x1920.

---

## 0. Sources, method, confidence

### 0.1 Inputs
| Input | Path | Used for |
|---|---|---|
| 16 frame-level breakdowns (6,482 lines, read in full) | `study\videos\*.md` | almost everything below |
| Structured summaries | `study\videos\_all_breakdowns.json` | cross-checks of hooks, transitions, captions |
| Auto + verified measurement table | `study\CHANNEL_NUMBERS.md` | section 1 numbers, voice pitch, grade numbers |
| Raw data (transcripts, voice.json) | `study\videos\_data\<slug>\` | my own counts: pivot words, sentence length, hook length |
| Pipeline notes | `study\REPO_KNOWLEDGE.md` (sections 4, 8, 11) | the older 20-short measurements and the recipe mapping |

### 0.2 Short slugs used in citations
| Short slug | Full slug | Title |
|---|---|---|
| spear | an-unstoppable-spear-vs-an-unbreakable-shield | An Unstoppable Spear vs an Unbreakable Shield |
| memory | every-memory-has-a-price | Every Memory Has a Price |
| cannonballs | levels-of-pirate-cannonballs | Levels of Pirate Cannonballs |
| jar | the-ancient-jar-that-warned-an-empire | The Ancient Jar That Warned an Empire |
| burglar | the-burglar-who-only-moved-furniture | The Burglar Who Only Moved Furniture |
| job | the-job-nobody-wants-in-japan | The Job Nobody Wants in Japan |
| slots | the-science-behind-slot-machines | The Science Behind Slot Machines |
| window | the-window-that-breaks-japan-s-gambling-law | The Window That Breaks Japan's Gambling Law |
| knight | this-knight-found-the-ultimate-loophole | This Knight Found the Ultimate Loophole |
| tree | this-tree-hates-you | This Tree Hates You |
| teleport | what-if-humans-invented-teleportation | What If Humans Invented Teleportation |
| gravebell | what-the-grave-bell-really-meant | What the Grave Bell Really Meant |
| random | why-humans-can-t-pick-random-numbers | Why Humans Can't Pick Random Numbers |
| stormoil | why-sailors-carried-storm-oil | Why Sailors Carried Storm Oil |
| seconddraw | why-the-second-draw-always-wins | Why the Second Draw Always Wins |
| upload | would-you-upload-your-brain | Would You Upload Your Brain |

### 0.3 Method
1. Each breakdown agent looked at every shot strip, mid frame, contact sheet and spectrogram, then made its own
   12-frame strips at every transition and measured captions, outlines, colours and camera speed with scripts.
2. I read all 16 reports in full, then merged them. Where agents disagree I say so.
3. I counted script features (pivot words, hook length, sentence length) myself from `transcript.json`.
4. Numbers in section 1 come from `CHANNEL_NUMBERS.md`. I use the `*_verified` columns when they exist.

### 0.4 Confidence notes (read before trusting a number)
- **Shot detector is wrong a lot.** Auto shot counts were off in every video (example: memory auto 13 vs verified 23;
  cannonballs auto 18 vs verified 9). Use only verified counts.
- **Nobody heard the audio.** All voice, music and SFX notes come from levels, spectrograms and pitch trackers.
  Treat music genre guesses as low confidence. Loudness numbers (LUFS, LRA, true peak) are measured and reliable.
- **Pitch has octave errors.** teleport and upload p10 values of ~70 Hz are the bass bed, not the voice.
  Real voice phrase ends sit at ~90-130 Hz.
- **`bed_vs_voice` in CHANNEL_NUMBERS has n=2 and is wrong** (its gap windows hit voice tails). The agents' own gap
  measurements (section 10) replace it.
- **Whisper word times are ±0.1 s.** Caption lead times are therefore ±3 f.
- **Colours** are sampled from compressed 1080p H.264 frames. Hexes are good to about ±5 per channel.
- **Lens FOV** values are estimates from perspective, not measured.
- **Font** identity is a guess (Montserrat Black/ExtraBold class). Size and position are measured to the pixel.
- **2 of 16 are not full 3D.** teleport is flat 2D vector layers (2.5D multiplane); knight is mostly 2.5D painted layers
  with 3D only in an aerial and a macro. Their camera and world numbers are flagged where they differ.
- **REPO_KNOWLEDGE section 4** holds measurements from an older 20-short study (13 of our 16 are in it). Where those
  numbers are more precise (blinks, walk cycles, grade curves) I quote them and say "older study".

---

## 1. Format numbers

| Measure | Median | Range | n | Note |
|---|---|---|---|---|
| Duration (s) | **57.6** | 30.9-77.8 | 16 | 12/16 are 45-65 s (not memory, slots, knight, tree) |
| Words | **220** | 112-295 | 16 | |
| Words per second | **3.69** | 3.47-4.06 | 16 | about 221 wpm |
| Words per sentence | **13** (mean 13.5) | p10 5, p90 23 | 244 sentences | my count from transcripts |
| Shots (verified set-ups) | **16.5** | 7-24 | 16 | |
| Median shot length (verified, s) | **2.88** | 1.9-6.2 | 16 | |
| Distinct framings per video | **~36** | 19-41 | 10 with counts | a new framing every **~1.7 s** (1.4-2.3) |
| Shot changes per video (verified) | **15.5** | 6-23 | 16 | about 16 per minute |
| Cross-dissolve length (f) | **6-7** | 2-18 | 16 | per-video medians 5.5-9 |
| Visible hard cuts per video | **0** | 0-2 | 16 | 12/16 have none; 5 cuts in all 16 videos |
| First word | **0.00 s** | 0.00 | 16 | voice at full level by 0.055-0.115 s = frame 1.6-3.5 (median frame 2); the first 40-50 ms of every track are digital silence (likely encoder priming) |
| Tail after last word (s) | **0.09** | -0.03 to 0.50 | 16 | 14/16 ≤ 0.15 s (tree 0.50, upload 0.21) |
| Pauses ≥ 0.3 s | **2** | 0-5 | 16 | longest 0.40 s (gravebell 19.36) |
| Integrated loudness (LUFS) | **-14.1** | -16.1 to -14.0 | 16 | 10 at -14.0 to -14.3; 5 at -15.0/-15.1; 1 at -16.1 |
| Loudness range (LU) | **2.3** | 1.7-3.1 | 16 | |
| True peak (dBTP) | **-2.3** | -3.3 to -1.3 | 16 | |
| Voice F0 median (Hz) | **195** | 174-211 | 16 | p10 median 131, p90 median 291 (~14 semitones; per video 12.1-14.4). upload's 174 is pulled down by its sub-bass bed; two other trackers give ~205 Hz, so the true range is ~178-211 |
| Frame lightness L* (mean) | **47** | 34.2-65.0 | 16 | contrast (L* sd) median 21.1 |
| Chroma (mean) | **29** | 19.8-49.0 | 16 | |
| Shots with a moving camera | **94.5 %** | 83-100 % | 16 | |
| Truly still frames (< 0.15 %/f) | **~23 %** (22.8 %) | 8.5-37.6 % | 16 | one uniform threshold on the auto motion fit (verification log); the agents' own figures in 3.1 use mixed thresholds |

Per-video verified values:

| Video | Dur s | Shots | Median shot s | Changes | Dissolve med f | Hard cuts | wps | LUFS | LRA | F0 med |
|---|---|---|---|---|---|---|---|---|---|---|
| spear | 45.0 | 8 | 4.54 | 7 | 7 | 1 | 3.67 | -15.1 | 2.3 | 183 |
| memory | 77.8 | 23 | 3.18 | 22 | 9 | 0 | 3.80 | -14.1 | 1.9 | 188 |
| cannonballs | 63.5 | 9 | 6.20 | 8 | 6 | 1 | 3.47 | -14.0 | 2.1 | 198 |
| jar | 64.8 | 24 | 2.36 | 23 | 5-6 | 2 (+2 hidden) | 3.62 | -14.1 | 2.1 | 182 |
| burglar | 58.4 | 18 | 2.67 | 17 | 7 | 0 | 4.06 | -14.1 | 1.7 | 178 |
| job | 60.5 | 20 | 2.54 | 19 | 7 | 0 | 3.71 | -14.1 | 1.8 | 199 |
| slots | 30.9 | 7 | 3.00 | 6 | 7 | 0 | 3.63 | -15.1 | 2.5 | 194 |
| window | 45.0 | 13 | 2.80 | 12 | 6 | 0 | 3.57 | -14.3 | 2.4 | 210 |
| knight | 40.6 | 17 | 1.97 | 16 | 5-6 | 0 | 3.90 | -15.0 | 2.4 | 210 |
| tree | 68.1 | 20 | 2.78 | 19 | 7 | 0 | 3.48 | -16.1 | 3.1 | 211 |
| teleport | 54.1 | 23 | 1.90 | 22 | 6 | 0 | 3.66 | -14.1 | 2.5 | 184 |
| gravebell | 59.5 | 16 | 2.96 | 15 | 9 | 0 | 3.71 | -14.0 | 2.3 | 180 |
| random | 47.1 | 10 | 3.84 | 9 | 6 | 1 | 3.52 | -15.1 | 2.6 | 210 |
| stormoil | 64.6 | 16 | 3.73 | 15 | 6 | 0 | 3.82 | -14.0 | 2.4 | 210 |
| seconddraw | 56.1 | 11 | 5.50 | 10 | 7-8 | 0 | 3.91 | -14.0 | 1.7 | 197 |
| upload | 56.9 | 18 | 2.42 | 17 | 6 | 0 (+1 hidden) | 3.79 | -15.0 | 1.8 | 174 (≈205, see note) |

What this means: a "shot" here is a camera set-up that often holds 2-4 framings joined by eased moves. Do not plan
one framing per shot. Plan ~16 set-ups but ~36 framings (one every ~1.7 s), one per clause.

---

## 2. Story engine

### 2.1 The story modes (3 modes cover all 16)
| Mode | Videos | Count | What it is |
|---|---|---|---|
| **A. Third-person tale** | spear, memory, jar, burglar, knight, gravebell, stormoil | 7/16 | A named everyman or a role ("a blacksmith", "a knight", "his wife"). Past-tense hook, then often present tense. Built around a real fact, object or legend, fictionalised. Narrator voices short character lines. |
| **B. Second-person "you" story** | tree, job, slots, window, seconddraw, teleport | 6/16 | The viewer is the hero, played on screen by a silent stand-in in a bright shirt. "Imagine you're..." in sentence 2 (4/6). POV shots in 3/6 (tree 60.8, job 17.47 and 21.5, slots 8.4). |
| **C. Explainer ladder** | cannonballs, random, upload | 3/16 | Facts in rising steps joined by signposts ("But the Navy...", "On top of that,", "The catch?", "Here's the creepy part."). Second-person hook, third-person facts. No dialogue. |

All three modes share one spine: hook → setting → escalation → mystery → pivot → mechanism → ironic payoff.

### 2.2 Beat template (timing as % of runtime)
| Beat | Starts at (median) | Range | Seen in | Job |
|---|---|---|---|---|
| **Hook** | 0 % (ends at **8 %**, ~4.2 s) | ends 4-15 % (2.8-6.1 s) | 16/16 | One sentence (median 14.5 words, 11-23). States the strange thing as plain fact. |
| **Setting** | 8 % (ends at **21 %**) | ends 15-30 % | 16/16 | 1-4 sentences: who, where, the rule. Often starts "Imagine..." (B) or "You see," (A, 4/7). |
| **Escalation** | 21 % | 3-6 beats | 16/16 | Each beat adds a threat, a cost, a person or a bigger number. One gag per beat. |
| **Mystery / open loop** | **42 %** | 21-63 % | 14/16 (9 say it as a line) | A stated question ("But how?", "How is that possible?", "Wait, practiced?", "The catch?") or a silent odd detail (stormoil 32.2; knight "which crime?"). |
| **Pivot** | **69 %** | 53-87 % | ~13/16 late; 4 also use an early "You see," | "You see," / "Well," / "Because" / "So let's crack it open." New light world here (6.3). |
| **Mechanism** | right after pivot | 1-3 sentences | 14/16 | The real reason, shown as a physical metaphor, cutaway or diagram. |
| **Ironic payoff** | **88 %** (last ~12 %, 5-8 s) | 82-94 % | 16/16 | 1-2 sentences. Ends on the last word. Often mirrors the hook's words. |

Notes:
- The hook is one sentence in 15/16 (slots uses two short ones).
- The early-pivot variant (memory 3.42, jar 7.28, knight 3.52, gravebell 3.20) uses "You see," in sentence 2 to give the
  world rule, then saves a second turn word for later ("Well," gravebell 37.04; "Inside the jar..." jar 48.60).
- Pace ramps up in the last third in only 4/16 (knight 3.4 → 5.2 w/s in the last 8 s; burglar 3.2 → 4.9; spear payoff 4.29;
  upload twist 4.07). In the rest it is flat or slows for the payoff (tree 3.8 → 3.2; teleport payoff 3.4).
- A 0.30-0.34 s pause sits before a key turn in 7/16: before the final sentence or punch (jar 60.26, gravebell 55.42,
  spear 31.28, teleport 46.06), at the world → hero switch (memory 31.22), or on a big location change (random 24.24, upload 42.62).

### 2.3 All 16 hooks and their formula
| Video | Hook line (study only — never reuse) | Words | Formula type |
|---|---|---|---|
| spear | "A blacksmith sold a spear that could pierce anything to one king and a shield that nothing could pierce to his worst enemy." | 23 | Paradox as a plain fact (old paradox told as a deal) |
| memory | "He sold his happiest memory to a stranger behind a counter." | 11 | Odd act as a plain fact |
| cannonballs | "If your ship got hit by a cannonball, you'd actually be one of the lucky ones." | 16 | "If you..." counter-intuitive claim |
| jar | "He put a bronze ball in a dragon's mouth and told the Emperor, if this ever falls out, run." | 19 | Odd act + warning with no reason |
| burglar | "A man snuck into a family's house every night and moved every single thing one inch to the left." | 19 | Odd act as a plain fact (a crime with no crime) |
| job | "It's impossible to get fired in Japan, but companies found something way worse." | 13 | Paradox + promise ("X is impossible, but... worse") |
| slots | "You just watched two jackpot symbols land. And the third one stopped one click short." | 15 | Second-person relatable moment |
| window | "Gambling is illegal in Japan, yet there's a gambling hall on almost every street." | 14 | Paradox as a plain fact ("illegal, yet everywhere") |
| knight | "A knight paid a priest to forgive a crime he hadn't committed yet." | 13 | Paradox as a plain fact |
| tree | "If you ever sit under this tree, it can kill you." | 11 | "If you ever..." threat |
| teleport | "When humans invent teleportation, billions of people will die, and nobody will even notice." | 14 | Future fact + shock + contradiction |
| gravebell | "They buried a man alive with a bell tied to his finger." | 12 | Dark strange fact |
| random | "If you ever fake a number, there's a way to tell a human made it up." | 16 | "If you ever..." threat/promise |
| stormoil | "He poured cooking oil into the sea, with a pirate ship so close behind them he could hear the pirates laughing." | 21 | Odd act + immediate threat |
| seconddraw | "The fastest gun in the West had one rule, never draw first." | 12 | Paradox rule |
| upload | "If you took your brain out and put it in a jar, you'd die, but your brain wouldn't." | 18 | "If you..." conditional paradox |

Formula families:
| Family | Videos | Count | Shape |
|---|---|---|---|
| Paradox stated as plain fact | spear, job, window, knight, seconddraw, teleport, upload | 7 | "[X], yet/but [opposite of X]" or a rule that sounds backwards |
| Odd act stated as plain fact | memory, jar, burglar, gravebell, stormoil | 5 | "He/A man/They + past verb + strange object + (threat)" |
| "If you (ever)..." aimed at the viewer | cannonballs, tree, random (+ upload) | 3 (+1) | Threat or promise to the viewer |
| Second-person relatable moment | slots | 1 | "You just..." |

Hook rules that hold in 16/16:
- The strange thing is said as fact, never as a question. No "Did you know".
- The picture shows the strange thing by 0.5-3 s (tree kill gag 2.30; cannonballs mug gag 3.1; upload skull lid 0.53).
- The answer is held back to the pivot or the last sentence. 7/16 plant the answer in frame 0 as a rewatch clue
  (burglar key on belt 0.00; window alley window 0.00; gravebell grin 0.00; teleport ghosts 2.0; knight pardon text 3.4;
  job STORAGE key 3.0; random tower shaped like "1" 11.5).

### 2.4 Pivot words (counted from transcripts)
| Word | Videos using it | Times | Where |
|---|---|---|---|
| **"You see,"** | **11/16** | 12 | late pivot at 65-91 % in 7 (spear 73, burglar 87, job 81, window 67, stormoil 67, seconddraw 65, gravebell 91); early world-rule at 4-11 % in 4 (memory 4, jar 11, knight 9, gravebell 5); mid in tree (29) |
| "Well," | 3/16 | 3 | gravebell 37.04 (pivot), random 10.72 (pivot), upload 22.70 (joke) |
| "Because" | 1/16 | 1 | teleport 37.18 |
| "So let's crack it open." | 1/16 | 1 | slots 16.54 |
| "Wait, ...?" | 2/16 | 2 | job 18.2 ("wait, I'm getting paid for this?"), gravebell 35.96 ("Wait, practiced?") |
| "Instead," | 2/16 | 2 | gravebell 46.06 (second twist), window 18.80 |
| "Imagine..." | 4/16 | 4 | tree 2.92, job 4.46, seconddraw 3.74, teleport 4.88 |
| Sentence-initial "But" | 12/16 | 18 | the mystery/turn line ("But nobody ever asks...", teleport 18.08) |
| Sentence-initial "So" | 15/16 | 23 | the step forward ("So the captain turns the wheel", "So America built...") |
| Sentence-initial "Then" | 7/16 | 10 | the inciting event ("Then, one day, a machine glitches.", teleport 21.18) |
| Signposts | 2/16 | — | "Not to be outdone," "Eventually," (cannonballs); "Problem is," "The catch?" "Here's the creepy part." (upload) |

Videos with no "You see,": cannonballs, slots, teleport, random, upload.

### 2.5 Analogy use
- Explicit everyday analogy, spoken: **3/16** — stormoil "Ever blown on a bowl of soup?" (47.28); seconddraw "think about the
  last time your phone slid off a table" (36.90); random "picture a building with 19 floors... Flip a coin a hundred times" (10.72, 29.8).
- Visual metaphor instead of words: **5/16** — job breaker panel HOPE/WORK/FRIENDS (53.9); upload corkboard, photocopier,
  deli slicer (18.3-41.7); slots par sheet → prize wheel (25.6); teleport blueprint (37.2); seconddraw control room in the head (44.7).
- Strength proof or simile only: tree "strip the paint off a car" (28.7); cannonballs "like a giant lantern" (34.6).
- None: spear, memory, jar, burglar, window, knight, gravebell (7/16).
- So the "Ever...?" line is VARIABLE (1/16). The rule is: when there is a mechanism, show it as a physical object.

### 2.6 Dialogue use
| Pattern | Videos | Count |
|---|---|---|
| 1-4 short quoted character lines, voiced by the narrator | spear 2, memory 2, jar 2, burglar 1, slots 1, gravebell 3, stormoil 4, seconddraw 1 | 8/16 |
| Reported or inner speech only | job ("your boss says"), knight ("the priest screamed that...") | 2/16 |
| No character speech | cannonballs, window, tree, teleport, random, upload | 6/16 |

Line rules (when used): 2-11 words; deadpan or sarcastic; usually the villain's or doubter's line that the payoff
flips (stormoil 24.20 "Why waste a cannonball when the storm will do it for free?"); narrator shifts pitch up +2 to +9
semitones (jar guard 271 Hz vs ~160 Hz narration; spear "Which one is real?" 297 Hz vs 183 Hz median; memory brother 215 Hz)
or down for grim/old men (memory shopkeeper ~130 Hz).
A 0.25-0.40 s gap often sits just before the quote (burglar 17.84, gravebell 19.36, seconddraw 12.74).

### 2.7 Joke types (all 16 use 5+ of these)
| Type | Seen in | Example |
|---|---|---|
| Sign/label that says the joke | 16/16 | "LANGRAGE" plaque falls off to show "GARBAGE" (cannonballs 17.2); "NOBODY HOME" (seconddraw 51-54) |
| Literal visual pun on the spoken word | 16/16 | "fired" = ejector seat (job 1.17); "crack it open" = door swings (slots 17.57) |
| Deadpan reaction face against chaos | 15/16 | half-lid cook pours while captain yells (stormoil 13-16) |
| Counter / number gag | 9/16 | YEARS AT WAR 100 → DAYS OF PEACE 001 (spear 44.4); BAHAMAS 0299 → 0300 (memory 20.5) |
| Running prop gag + callback | 9/16 | mug handle all video (cannonballs 3.1 → 62.9); belt drop (seconddraw 17.0 → 55.3) |
| Background / rewatch gag | 10/16 | pigeon and cobwebs for "weeks later" (jar 18.3); cat witness (burglar 6, 34.7, 46, 58) |
| Two-word deadpan tag line | 6/16 | "Big mistake." (tree 18.76); "Then nobody moved." (spear 17.10); "Once." (slots 21.3) |
| Fine print | 4/16 | flyer "*The procedure is 100% fatal." (upload 44.5); poster fine print (tree 6.2) |
| Anachronism | 3/16 | "BOSTON" fish crates (knight 5.9); smartphone in a saloon (seconddraw 37) |
| Silent last-second button | 8/16 | apple rolls in (tree 67.8); coin bonks the priest (knight 40.27) |

Rate: a gag every ~3-5 s (upload 15 gags in 57 s; seconddraw 12 in 56 s).

### 2.8 Payoff and loop-back endings
- **Ironic reversal: 16/16.** The plan, rule or villain line comes back on someone (pirates crushed by their "free"
  storm, stormoil 60.5; the seller is robbed with his own pardon, knight 36.8; the copy rates the trip "PERFECT!", teleport 50.5).
- **Last word lands on the last frame: 16/16.** 14/16 end ≤ 0.15 s after it.
- **Word loop to the hook: 7/16** (window "gambled." → "Gambling..."; random "a way to tell"; slots "jackpot."; teleport
  "step inside?" → "When humans invent teleportation"; tree; knight; upload).
- **Picture loop to frame 0: 6/16** (window same alley 43.6; teleport same pod 51.9; random magnifier on a scared face 46;
  slots 7-7-short reels 26-31; tree bright sand 64.9; spear same sign 43.4).
- **Question to the viewer: 2/16** (teleport, upload). Soft comment bait, not a subscribe ask. No CTA in any video.

### 2.9 Title formulas (all 16)
| Title | Words | Formula |
|---|---|---|
| An Unstoppable Spear vs an Unbreakable Shield | 7 | "X vs Y" (famous paradox) |
| Every Memory Has a Price | 5 | World-rule statement |
| Levels of Pirate Cannonballs | 4 | "Levels of X" |
| The Ancient Jar That Warned an Empire | 7 | "The [adj] [object] That [verb] [big thing]" |
| The Burglar Who Only Moved Furniture | 6 | "The [person] Who [odd act]" |
| The Job Nobody Wants in Japan | 6 | "The [thing] Nobody Wants in [place]" |
| The Science Behind Slot Machines | 5 | "The Science Behind X" |
| The Window That Breaks Japan's Gambling Law | 7 | "The [object] That [breaks a rule]" |
| This Knight Found the Ultimate Loophole | 6 | "This [person] Found [superlative]" |
| This Tree Hates You | 4 | "This [object] [verb] You" (personified + you) |
| What If Humans Invented Teleportation | 5 | "What If X" |
| What the Grave Bell Really Meant | 6 | "What [object] Really Meant" (hidden meaning) |
| Why Humans Can't Pick Random Numbers | 6 | "Why [group] Can't X" |
| Why Sailors Carried Storm Oil | 5 | "Why [group] [did odd thing]" |
| Why the Second Draw Always Wins | 6 | "Why [backwards claim]" |
| Would You Upload Your Brain | 5 | "Would You X" (question to viewer) |

Title rules: median **6 words** (4-7); Title Case; no numbers, colons, emoji or brackets; one concrete noun the viewer can
picture (16/16); never gives the answer (16/16). Families: "The [noun] That/Who/Nobody..." 4; "Why..." 3; "What..." 2;
"This [noun]..." 2; one each of "X vs Y", "Levels of", "The Science Behind", "Every X Has...", "Would You".
The title asks the question; hook sentence 1 states it as fact.

---

## 3. Camera and editing grammar

### 3.1 How much the camera moves
| Video | Truly still | Slow drift | Clearly moving | Source threshold | Uniform auto: still < 0.15 / drift 0.15-0.5 / move > 0.5 %/f |
|---|---|---|---|---|---|
| spear | 13.6 % | 13 % (0.1-0.2) | 46 % > 0.5 %/f | (spear §4) | 19.5 / 36.2 / 44.3 % |
| memory | 27 % | 25 % | 48 % | < 0.1 %/f still (memory §4) | 37.6 / 22.9 / 39.4 % |
| cannonballs | 17 % | 24 % | 59 % | (cannonballs §4) | 16.0 / 21.8 / 62.2 % |
| jar | 24 % | 19 % | 57 % | < 0.15 %/f (jar §4) | 22.3 / 34.9 / 42.8 % |
| burglar | ~10 % | 10 % | 80 % > 0.15 %/f | (burglar §4) | 23.4 / 33.9 / 42.6 % |
| job | 7 % | 29 % | 64 % | (job §4) | 8.5 / 21.5 / 70.0 % |
| slots | 24 % | 23 % | 53 % | < 0.2 %/f still (slots §4) | 19.4 / 27.5 / 53.1 % |
| window | ~0 % | 41 % < 0.3 | 24 % > 1 %/f | "never locked" (window §4) | 10.4 / 50.7 / 38.8 % |
| knight | 22 % | 24 % | 54 % | < 0.2 %/f (knight §4) | 23.4 / 35.0 / 41.6 % |
| tree | 12 % | 53 % | 35 % | < 0.05 %/f (tree §4) | 36.2 / 38.5 / 25.4 % |
| teleport | 28 % | 51 % | 22 % fast | 2.5D (teleport §4) | 32.9 / 36.1 / 30.9 % |
| gravebell | 14 % | 19 % | 67 % | (gravebell §4) | 21.1 / 26.2 / 52.6 % |
| random | 24 % | 16 % | 60 % | (random §4) | 24.7 / 31.6 / 43.7 % |
| stormoil | ~10 % | 24 % | 54 % > 0.5 %/f | (stormoil §4) | 20.8 / 27.2 / 52.0 % |
| seconddraw | 29 % | 23 % | 48 % | (seconddraw §4) | 29.8 / 18.8 / 51.4 % |
| upload | 31 % | 43 % | 26 % fast | (upload §4) | 30.9 / 35.7 / 33.4 % |
| **median** | | | | | **22.8 / 32.8 / 43.3 %** |

The last column is one threshold for all 16 (max of zoom, pan-x and pan-y per frame, from `frames.json`; the fit has
some noise, so "still" is a slight under-count). Use it when comparing videos. The agents' columns use different
thresholds (0.05-0.2 %/f), so window "~0 %" and stormoil "~10 %" read low: they measure 10.4 % and 20.8 %.

CONSTANT (16/16): **the camera is almost never locked.** Median truly-still ~23 % of frames (8.5-37.6 %), and most "still"
frames are inside the 1-2 locked beats. Every hold has a creep. The camera moves faster than 0.5 %/f in ~43 % of frames.
The older 20-short study agrees: hold 10 % / drift 24 % / move 65 %, about 6 moves per 10 s.

Locked shots are used only for: "nothing happens" or time-lapse (spear 17.9-20.4; upload 12.4-14.8), a split screen
(teleport 23.1-30.8), a frame full of text to read (gravebell 4.70-8.00, the only real lock-off there), the final crash or
button (stormoil 61.7-64.57; seconddraw 54.4-56.1). 0-2 per video.

### 3.2 Move vocabulary
| Move | Seen in | Numbers | Ease | Example |
|---|---|---|---|---|
| **Creep push on holds** | 16/16 | 0.1-0.6 %/f (3-18 %/s); typical **0.2-0.4 %/f (6-12 %/s)**; near linear | linear or soft ends | burglar median 0.23 %/f (~7 %/s); jar 0.27 %/f; tree 0.25 %/f for 9 s (+85 %, tree 50.9-59.9) |
| **Bell reframe (push / pull / truck)** | 16/16 | 0.6-2.5 s (18-75 f); peak 1-4 %/f in the middle; total 20-200 % | symmetric ease-in-out | spear breathing drift 1.5-2 s, peak 1.0-1.7 %/f (0-6.1); job S-curve 45-90 f, peak 3-4.4 %/f |
| **Reveal pull-out** | 15/16 | peak -2 to -11 %/f (photo reveal -22.5 %/f); 13-60 f | bell, or ease-out right after a dissolve (decay 25-55 f) | slots 4x in 1.15 s, peak -7.9 %/f at 0.9; random 5x in 28 f, peak -11.4 %/f at frame 14 |
| **Crane-up map reveal** | 10/16 | scale -75 to -99 % (or 20x) over 2.4-3.3 s; peak -4.7 to -10 %/f | ease-in-out S-curve | tree crane 2.3-5.5 (peak -10 %/f at 4.0-4.3); spear 8.4-10.8; random 24.6-27.5 (20x) |
| **Fly-through / dive into an object** | 16/16 | accelerate to 3-16 %/f; dissolve or cut at top speed; new shot keeps moving and decays | ease-in into the change | memory dive 0.3 → 15 %/f in 12 f (0.55-0.97); slots +0.2 → +7.8 %/f in 45 f (16.7-18.2); burglar under the door 11-16.5 %/f (33.8-35.0); upload screen fly-ins 19-27 f, peak 7-13.5 %/f |
| **Follow an object** | 12/16 | camera locked to the prop; 1.5-3 %w/f or prop speed | constant, ease-out into a hold | stormoil oil stream (0.5-1.5) and hook (19.2-20.0); seconddraw bullet (0.9-3.3); gravebell rope up to the bell (2.0-3.3) |
| **Snap / crash zoom on one word** | 7/16 | x1.25 in 3-4 f; x2 in 8 f; x2.5 in 6 f; 6x in 21 f; peak 8-16 %/f | front-loaded ease-out, or symmetric 21 f | jar "run." (4.73), "happened." (19.93), "pile of" (47.27); knight 6x on "waiting" (30.27-30.93); job hook +15 %/f for 6 f (0.0) |
| **Whip pan / whip truck (inside a shot)** | 9/16 | peak 4-8.3 %w/f (job tilt 11.5 %h/f); 12-36 f | bell (ramp ~10 f, decay 4-10 f); light motion blur | cannonballs 7.8 %w/f at 6.73; teleport 8.3 %w/f along the data arc (40.6); gravebell 4.2 %w/f past a head (34.4) |
| **Tracking truck with a walker** | 9/16 | 0.6-2 %w/f; seconddraw 23 %w/s constant | ease-in-out or linear | job 88 % of frame width over 3.2 s (4.67-7.87); seconddraw 107 %w over 4.6 s (21.05-25.70) |
| **POV walk** | 2/16 (job, tree hands) | forward push 0.3-2 %/f + vertical bob ±1.5 % at ~2 Hz + roll sway up to 8-10° | hand-held, ends in an ease-in push into a screen or prop | job walk past the staring coworkers into the phone's mailbox icon (21.50-25.70, push 0 → 12.8 → 0 %/f over 16 f) |
| **Crane / pedestal between a prop and a person** | at least 2/16 (VARIABLE) | -60 to -70 % scale over 1-2 s, or a vertical move of 1-2.7 %h/f | ease-out or ease-in-out | job crane down from the clock to the 3-year guy (9.47-13.80, -67 %); gravebell pedestal up from the post base to the bell (10.3-11.1) |
| **Orbit / arc** | 6/16 | 1-1.5 %w/f; roll 5-9° | steady | cannonballs opening orbit (0-1.4); jar 6 s orbit around the hero prop (7.47-13.50) |
| **Impact kick / shake** | 3/16 | 1 f jolt 12-15 px + 10 f settle; ±2-5 px at 5 Hz for 0.8 s | spring | jar collapse kick 14 px (46.80); jar scream rattle (39.0-39.8); cannonballs 1-2 f jolt (60.8) |
| **Locked** | 14/16 use 0-2 | 0 %/f | — | see 3.1 |

Easing profile (CONSTANT): **symmetric ease-in-out bells dominate.** Peak speed is in the middle of the move.
Ease-out "burst" shapes only appear right after a dissolve or a startle, and they decay over 25-55 f, not 8-10 f
(gravebell 41.67: -10.5 %/f → 0 over 27 f; stormoil 43.0-44.8 over ~55 f; burglar 35.33 over 35 f). Pure ease-in only for
dives that end in a dissolve, cut or screen fill. No video has a "fast first frame, 8-10 f decay" move as its main grammar.
This overturns the old STYLE_BIBLE claim (REPO 9.1).

Opening move (CONSTANT, 16/16): the camera is already moving on frame 0-1. 12/16 make the first big move inside 1 s
(memory dive 0.55; jar rush 0.67; slots reveal 0.35; random pull-out 0.03; seconddraw gunshot follow 0.9; job snap 0.0;
gravebell crane-in 0-0.7; stormoil follow-the-oil 0.5; burglar arc peak 0.87).

### 3.3 Transition catalogue
| Transition | Seen in | Numbers | When it is used | Example |
|---|---|---|---|---|
| **Plain cross-dissolve** | **16/16** | median **6-7 f**; 80 % of them 5-10 f; extremes 2 f (knight 31.37) and 18 f (memory 23.58-24.18) | default for every shot change; starts on or within 0.25 s of the first word of the new clause; both cameras keep moving | job: 16 of 19 changes are 6-8 f; gravebell: 10,9,8,9,10,9,10,8,10,5,10,9,9,9,10 |
| **Match dissolve (same shape, same screen spot)** | 12/16 | 4-11 f; median 2 per video (gravebell 5) | cause → effect, plan → reality, analogy → real event | stormoil bowl → bowl → oily sea (49.80, 52.40); jar ball → goblet (20.4); burglar key past → present (54.77) |
| **Fly-through as transition** (window, door, screen, photo, eye, muzzle) | 15/16 (random keeps its fly-through inside a shot) | the push hits 4-16 %/f, then a 3-8 f dissolve or a hidden cut on the full-frame moment | entering a place, a memory or a mechanism | gravebell 3 window fly-throughs (13.33, 17.40, 29.17); upload 5 screen fly-ins/outs; seconddraw pupil → porthole (44.7) |
| **Follow-object carry** | 12/16 | object leaves one framing and leads into the next | travel, cause → effect | tree drop falls from leaf to head (23.0-24.2) |
| **Long "time-passing" dissolve** | 3/16 | 9-11 f (memory 18 f) | montage, "within a year", vigil, crossing to the other side of a wall | teleport 9-11 f montage (11.8-17.9); gravebell vigil 9 f (49.10, 51.45) |
| **In-camera relight / time-lapse** | 8/16 | 3-20 f light crossfade on one camera; time-lapse 1.5-2 s | "a few minutes later", "night falls", the pivot | job day → night ~10 f on "You see," (49.57-49.90); burglar 3-4 f (25.15, 39.17); pirate noon → dusk (32.4-34.0) |
| **Foreground occluder wipe** | 5/16 | object crosses at 14-20 %w/f; 6-12 f full cover | travel montage, place change without cut | knight tree trunk 10 f (4.83-5.13), fish crates 12 f (5.8-6.2); upload pillar 6 f (5.57) |
| **Smoke-cloud wipe** | 1/16 | 10-11 f: cover in 2-3 f, hold 3-4 f, clear in 4-5 f | the 2 biggest turns | cannonballs (17.97, 59.67) |
| **Glow / bloom dissolve** | 4/16 | 5-15 f brighten, then 6-9 f dissolve | heat, a sale, a decision | spear forge 7 f (38.0); cannonballs 5 f glow + 6 f (30.10); memory gold-white 15 f (65.0) |
| **Light-leak / flash wipe** | 3/16 | 5-8 f | repeated time jumps; teleport beam | burglar light-leak 8 f (27.10, 28.65); teleport light column 5 f (0.97) |
| **Prop morph inside a shot** | 3/16 | 6-7 f | replace a cut | slots door swing (17.57), paper curls into a wheel (25.57); knight document slide-off (3.33) |
| **Magnify / iris window** | 2/16 | ~8 f | into a body or detail | tree square window grows from the blister (25.43-25.70) |
| **Hard cut** | 4/16 (5 cuts total) | 0-2 per video | a big place or time jump 2-3 f before a dialogue line (spear 28.00); an "enter" word (random 14.30 "and"); a cut-on-action punch-in (jar 38.97); right after a hit (cannonballs 2.20); after a reveal (jar 3.07) | |
| **Hidden cut** | 2/16 (3 cuts) | on a motion-blurred rush or a screen-filling frame | swap sets mid-move | jar rush push (0.83) and a second fast move (5.33); upload screen fill (f967) |

Not used as between-shot transitions: whip pans (they live inside shots), plain white flashes (0/16 as a standard
transition; the only flashes are motivated light events: muzzle (seconddraw 0.63), glitch (teleport 22.00), police
lights (random 9.70-9.93), lightning (tree 19.13, stormoil 39.37), a screen exit bloom (upload 54.57, 2-3 f)).

Linear-light dissolves: slots dissolves brighten mid-blend by +8-12 luma and lose 20-45 % saturation (slots §4). Only
slots measured this. Treat as VARIABLE until checked.

### 3.4 Framing and camera height
- **Framing mix (older 20-short study):** CU 3 %, MS 27 %, FS 28 %, WS 12 %, EWS 8 %, inserts 22 %.
- **Inserts / ECU of a prop: 16/16** (median ~3 per video). Every key noun gets its close-up (knight pardon 3.33; random cheque 0.0).
- **Top-down or high overhead: 11/16** (burglar bed 25.65; random coin grid 31.8; gravebell coffin 0.7; stormoil bowl 49.9).
- **Aerial / extreme wide: 10/16** (tree island 2.9; window city 3.0; knight walled town 24.4; random desert grid 24.6).
- **POV: 5/16** (tree hands 60.8; job desk 17.47, walk 21.5; burglar peephole 21.95; slots inside the machine 8.4; seconddraw porthole 44.7).
- **Camera height:** CONSTANT default at the character's eye or chest (older study: 0.79 × character height, 82 % at eye
  level, ≤ 10-15 % low). COMMON low shots (0.3-1 m) for hero props and big moments (cannonballs deck, burglar couch legs,
  seconddraw face in the dirt 17.6). Heights are mixed, not mostly low (job, random, gravebell, upload agents all say so).
- **Head-top position (older study):** y = .28 H (CU), .35 (MS), .38 (FS), .50 (WS); horizon ~.45 H.
- **Faces sit above the caption band** (y 300-1300) in most videos (jar §8; slots §8; upload §8). teleport often lets the
  caption cross a character's torso (faces at 45-75 % height).

### 3.5 Lens
| Use | Vertical FOV (estimate) | Evidence |
|---|---|---|
| Wides, decks, streets, rooms | **55-65°** (spread 45-70°) | burglar 55-65; slots 55-65; window 55-65; random exteriors 60-65; cannonballs 55-60; memory exteriors 60-70 |
| Two-shots, medium | **32-45°** | stormoil 30-35 two-shots; slots 32-40; random interiors 40-50 |
| Close-ups, inserts with heavy bokeh | **25-35°** | memory 25-35; job 30-35; gravebell ~30 |
| Flat 2.5D | 15-20° or orthographic | teleport |
Older 20-short study: fov 34-46° (repo default 40°). Our agents' estimates run wider for wides. Use 40° as the
neutral default, 55-60° for wides, 30-35° for close-ups.

### 3.6 Dutch angles
- **No held dutch on calm beats: CONSTANT.**
- **Banks of 2-12° during lateral moves, then back to level: COMMON (10/16)** (gravebell 12° in shot 2; tree 2-5° roll drift).
- **Held dutch 5-20° on danger, chaos or bad-news beats: 8/16, 1-3 per video** (stormoil pot 15-20° at 33-34;
  memory wall -14° at 14; burglar officer 12° at 15.5; job 7-8° on the empty desk 45.3; slots 10-15° on the bill 11.4;
  cannonballs 14° at 49-51; seconddraw 5-15°; jar 5° once on "run." 4.8).

### 3.7 How often the picture changes
- New framing: every **~1.7 s** (1.4-2.3) (section 1).
- Something visible changes (move, gag, expression swap, light change): about every **1 s** (random ~45 events in 47 s;
  job "a change roughly every 1-1.5 s"; tree "every 1-1.5 s").
- Caption swap: every **0.33-0.38 s**.
- A new place: every ~3.4 s in busy videos (memory 15 places; upload 18 places).

---

## 4. Characters

### 4.1 Universal design spec (CONSTANT unless marked)
| Part | Spec | Evidence |
|---|---|---|
| Head shape | Big circle or soft egg. Width:height 1.0-1.1 (slightly wider) in most; slight egg taller in spear | jar 1.05:1; job 1.1:1; teleport flatter bottom |
| Head size | **25-40 % of body height, typical ~30 %** (older study: adults 3.5 head-heights, kids 2.7-3.0) | tree 25 %; burglar 25 %; jar 1/3; memory 35-40 %; seconddraw 30-35 % |
| Neck | None. Head sits on or overlaps the torso | 16/16 |
| Face fill | Off-white, luma about .90-.97 on the lit side in neutral light: cool tint #F1F2F9-#F2F0F5 or warm #FCF6F1-#FDF8DF. Median about **#F8F3EE**. Some read greyer (job #EBEAED, luma .92, measured at 19.75) and tree is lavender-grey (#CCCFDE, luma .81, measured at 36.5, even in noon sun). A few cream/peach faces (#FDD689, #FCE9CD, #F3C298) for variety | cannonballs #FCF6F1; random #F9F2EC; gravebell #F1F2F9; burglar #F2F0F5; slots #FDF8DF; job #EAE9E7; tree #CCD1DE (outlier) |
| Eyes | Small solid dark ovals or dots (#262743-#4D4545), set close, no catchlight. **Default half-lidded** (flat lid line) = smug or deadpan | 15/16; slots CU adds a tiny white dot (14.1) |
| Eye swaps | goggle shock (white ring + dot pupil), ^^ happy arcs, >< pain, XX dead, spirals dizzy, side-eye, glowing (power-up), closed lines | tree 2.30 XX; seconddraw 13.9 glowing |
| Brows | Thick dark strokes. They do most of the acting | 16/16 |
| Mouth | One dark curve; D-grin with a row of square white teeth; **grid-teeth grimace** (rounded rectangle, 2x4 cells); wavy "~" worry; small "o"; dark maroon inside (#400D19) with a pink tongue when open wide | 16/16 |
| Nose, ears | None (rare side tufts on old men) | 16/16 |
| Hair | Solid shape with 2-4 inner stripe lines and one gloss highlight stroke; often replaced by a hat | job 3 gloss stripes; upload white highlight |
| Body | Bean / capsule / pill torso; clothes are fill colour + stripes, buttons, collar, badge | 16/16 |
| Limbs | Single thick dark strokes (rubber hose), **~5 % of head width** (range 3.5-6 %); some use double-line tubes with pale fill | burglar 19 px on a 310 px head (~6 %); random arms ~5 %; tree tubes 10-14 px at MS |
| Hands | Round dark ball hands, no fingers (mittens with 3-4 fingers in jar; rings in gravebell) | 15/16 |
| Feet | Tiny strokes or small flat shoes | 16/16 |
| Outline colour | **Dark tinted, never pure black.** Plum / purple-brown / warm brown / navy. Median about **#2C1E2A**. It takes the scene light (navy at night, maroon at sunset) | tree #333963; spear #36323F; cannonballs #2E1E2B; burglar #2A1B2E; job #1A1628; slots #432418; stormoil #2A1318; upload #3A2E34 |
| Outline width | **Lit (thin) side ~2-3 % of head width; shadow (thick) side ~4-6.5 %; average around the head ~3.5-4 %.** Most agents' "2.5-3 %" figures were taken on the thin side. Drawn into the art, so it scales with distance (3-5 px on far figures, 9-13 px thin side at MS, 15-25 px thin side and 40-55 px thick side in a big CU) | verification: tree 10 px lit / 25 px shadow on a 491 px head (2.0 % / 5.1 %, 36.5); job 18 px / ~55 px on an ~850 px head (2.1 % / ~6.5 %, 19.75). Agents (mostly thin side): burglar 3.3 %; job 2.2-2.5 %; window 2.5 %; gravebell 2 %; seconddraw 3 %; jar 4-5 %; knight 1.5-2.5 %; memory up to ~40 px on the ECU shadow side |
| Thick/thin side | Thicker on the shadow side and lower-right: **ratio ~2.5-3:1** (older study measured 2.9-3.5:1, thickest at ~64° bottom-right) | tree 10 px lit vs 25-26 px shadow (36.5, 2.5:1); job ~3:1 (19.75); spear 8 vs 15 px (39.9, 1.9:1); stormoil up to 2x lower/right |
| Inner lines | Same colour; 0.6-1x the outline | gravebell brows = outline width |
| Shading | Not flat cel. Soft lit gradient: warm toward the key, lavender/blue-violet on the far side (~10-25 % darker). Torso darkens toward the bottom | job lavender #D6D8E5 lower-left; stormoil #E8DEF9 lower/back; slots #DFC7CE; memory #C6D5FB → #384BA8 in blue light |
| Scene-light tint | **15/16** multiply the card by the scene light (teleport is the exception) | jar night #C8B0E2, rampart #AFAAE5, dawn #FBDECA; cannonballs sunset face #C9898C; burglar red then blue siren (14.93-15.30) |
| Rim | **COMMON 13/16, in three kinds:** (a) pale/cream rim inside the outline on the key side (tree #E9DED1; memory #FDF8E3 8-12 px in CU; random inner band #B0A8B8; job, burglar thin rim lines); (b) coloured rim from a nearby light or a low sun (cannonballs orange at sunset; slots orange #F65709 → #FFE6B7; window warm from practicals; seconddraw golden at sunset; gravebell orange on the lit edge); (c) thin pale "sticker" rim outside the outline (spear 2-4 px; knight 1-3 px; upload 2-5 px #FFF8FB) | the older 20-short study said "no rim"; see open questions |
| Ground shadow | **COMMON 10/16**: a soft contact blob (25-45 % opacity); silhouette shadows in 4/16 (seconddraw blue-violet #61719D noon, #534C75 sunset; stormoil head shadows 23.9; gravebell 24.6); none seen in job, burglar, slots, spear, window, upload (faint) | |
| Card behaviour | Flat billboard that always faces the camera; never edge-on; parallax with the 3D set; extra drawings for back, side-walk and lying views | job OTS back view (16.17); gravebell lying in coffin (40.25); window back view (shot 10) |

### 4.2 Costume as identity (CONSTANT)
- **One saturated body colour + one signature item per character.** Hats, hair or a prop carry identity (stormoil: toque,
  bicorne, tricorn with plume, parrot hat; cannonballs: bandana colour per pirate).
- **The "you" stand-in wears a solid bright shirt** (6/6 mode-B videos + upload): orange Hawaiian shirt (tree #DA7D2C),
  light-blue shirt (job #9CCAF4), teal Hawaiian shirt (slots #00C8B3), orange jacket (window #E8781E), red shirt
  (seconddraw #E2253B; upload #F57C64), purple hoodie (teleport #956FC6).
- **Colour-coded sides** when there are two camps: spear red #A92D2D vs teal #3C7980 (taught in frame 0).
- Body colours stay saturated but not neon. Faces stay pale so they read on any background.

### 4.3 Cast size
- Distinct designs per video: median **10** (1-17; tree 1, slots 4, random 5, burglar 6, upload ~17 + a 30-person queue).
- Recurring main cast: **1-3** in 16/16. Crowds are many tiny copies (spear instanced soldiers 21-23; upload queue 46.9).

### 4.4 Animation
| Item | Rule | Seen in | Evidence |
|---|---|---|---|
| Rig | Cut-out puppet; transforms change every frame (**on 1s**) | 14/16 (stormoil and slots read as 2s/3s for faces) | jar frame-diff test; teleport split-screen test |
| Expression change | **Instant 1-frame swap** of eyes+mouth (2-3 f dissolve sometimes); hold ≥ 3-6 f, often seconds | 16/16 | cannonballs shock 2.80 → deadpan 2.93 → grin 3.10 |
| Reaction timing | On the key word, 0-3 f before it (older study) | 16/16 | XX eyes on "kill" (tree 2.30); X-eyes on "punched" (cannonballs 42.9) |
| Blinks | 2-4 f; rare in most; older study: every 0.5-2.3 s with one over each swap | COMMON | jar 2 f (f141-142); memory 3 f (0.00-0.10) |
| Lip flaps | **Never on narration.** Only on quoted character lines: 3 shapes held 2-6 f | 6/16 | burglar officer (18.10-21.08); memory shopkeeper (60.0-63.0); stormoil all lines on 2s |
| Gestures | Big and clear: point, hold the prop to camera, lean 3-8°, one arm busy | 16/16 | knight pardon held to the lens (2.0) |
| Walks | Rubber-hose legs, smooth on 1s; older study: 9-12 f per step, bob 3-7 % of height | 8/16 show walks | seconddraw Eddie shuffle (21-25.7) |
| Squash/stretch, smears | Almost none; one drawn arm smear (seconddraw 14.40) | — | |
| Head turns | Drawing swap (memory 59.1-59.3) or a 2-frame blank face hidden in an orbit (seconddraw 40.50) | | |
| Prop and mechanism snaps (added) | Doors snap open in **1 f**; hinged panel doors swing in ~5 f; box lids flip; switches and breakers flip in 1-2 f; stamps land in 2-4 f (scale 0 → 1.1 → 1); tear-off calendar pages fly off as 2D sprites; counters roll on the word (section 5.5) | COMMON (not counted per video) | job door 29.67, panel 53.9, calendar 29.0-29.5; tree X stamps; spear IMPOSSIBLE stamp 36.7 |
| Pops and entrances (added) | A character or head pops in from a frame edge in 1-2 f; props appear on their word with no tween; ghost/hypothetical objects fade to ~60 % | COMMON | job boss head pops in (29.7); jar ghost ball 3.9 |

### 4.5 FX on characters
| FX | Seen in | Spec |
|---|---|---|
| Sweat drop | **13/16** (not slots, window, teleport) | light-blue teardrop (#7FC6EF-#8FD0F0) with an outline and a white highlight; pops on in 1 f |
| Blush ovals | 6/16 | pink (#D4ABC2, #EF8B7B) |
| Tears / laughter streams | 3/16 | blue streams (jar 6.2; memory 46, 76) |
| Face colour change | 3/16 | sick green #9FB9A0 (tree 2.30), angry red + steam (knight 33.5) |
| Steam puffs from the head | 2/16 | white puff with grey outline (tree, knight) |
| Shock hair, anger vein, Z Z Z, dizzy stars, stubble, icicle brows | 1-2 each | jar 36.1, tree 30.2, jar 33.1, knight 32.0, jar 18.3, tree 52 |

### 4.6 Costume and accessory kit (added by the verifier from the 16 reports)
Identity comes from one piece of headwear or hair plus one body colour. Build these as swappable layers on one rig.

| Layer | What the channel uses | Evidence |
|---|---|---|
| Hats (most common identity item) | crowns (gold / silver with gems), tricorn with gold trim, bicorne with cockade, pleated chef's toque, bandanas (dotted, coloured per pirate), kepi with crossed cannons, cowboy hats (cream wide-brim, black flat-brim with gold band), flat caps, police caps with a gold band and star, beanies (pompom, navy, black), nightcaps, a backwards baseball cap with sunglasses on top, raised-visor knight helmet, paper deli hat, lab/surgical caps | spear kings; cannonballs pirates and Navy; stormoil cook and captains; seconddraw Eddie and "you"; window officer; knight; upload deli man |
| Hair caps | one solid shape with 2-4 lighter stripe lines and a gloss stroke: bowl cut, centre-part helmet, spiky helmet, side-swept, topknot with a pin, bun with a pin or pencil, grey curls, a 3-point crown tuft, 2-3 curved hair spikes | job (3 gloss stripes); slots spiky #573120 + sheen stroke; jar topknot; random auburn bun + red pencil; teleport crown hair; tree spikes |
| Face extras | moustaches and beards stand in for the missing nose (handlebar, curled, walrus, goatee, white beard); stubble dots for time passing; round glasses; black sunglasses with white glints; eyepatch | spear blacksmith; seconddraw; gravebell Holt; jar stubble; window token guy; cannonballs |
| Body graphics | flat shirt colour + 1-2 graphics: stripes, a striped tie, white collar V, buttons, a badge or lanyard ID, an apron, a cape with a zigzag hem, a print (Hawaiian flowers, leaf print), a belt or sash | job "you" lanyard + striped tie; tree Hawaiian shirt; slots leaf print + red coiled lanyard; knight cape |
| Hand props | the character holds the story object to the lens or carries one running prop: mug, phone, key, coin cup, magnifier, shovel, lantern, quill, document, gun | cannonballs mug handle (3.1 → 62.9); knight pardon to the lens (2.0); random magnifier |
| Non-human cast | cats (calico, tabby, maneki-neko), pigeons, parrots, a crab, horses, a donkey, frogs, birds; personified props (a POWDER bag with brows and a sweat drop); translucent ghosts with a teardrop tail; a digital copy in lavender | burglar cat witness; job maneki-neko + pigeon; cannonballs POWDER bag; teleport ghosts; upload copy #CEA8FD |
| Crowds | many small copies of 1-3 designs (instanced), or a 25-30 person queue of recoloured extras | spear soldiers 21-23; upload queue 46.9; gravebell ~25 creditors |

---

## 5. Worlds, props and in-world text

### 5.1 Texture and paint style
- **3D low-poly sets with hand-painted textures: 11/16** (spear, memory, cannonballs, jar, burglar, job, window, tree,
  gravebell, stormoil, seconddraw). Painted wood grain, brick and mortar lines, stone cracks, grass blades, wallpaper
  patterns, knitted rugs. Detail goes into the texture, not geometry.
- **Cleaner graphic/vector textures on 3D: 3/16** (slots casino "mobile-game" look; upload flat fills + gradients; random clean vector).
- **2.5D flat layers: 2/16** (teleport fully; knight mostly).
- **CONSTANT:** stylised surfaces only; no photo textures and no film grain (16/16). Faceted low-poly snow, dirt and storm
  waves where used (gravebell, stormoil).
- Older study targets: painted lines 3-5 px @1080 at 0.7-0.9 × ink width and ≤ half its contrast; no per-tile ink on roofs.

### 5.2 Ink lines on 3D geometry
| Item | Spec | Evidence |
|---|---|---|
| Where | Silhouettes and hard creases (posts, rails, table edges, frames, roof edges, props) | 14/16 with 3D |
| Width | **2-4 px @1080 at mid distance**; up to 8-13 px on props very near the lens; 1-2 px far; older study: ~3 px, nearly constant with distance | job 8-11 px near desks; stormoil 10-13 px near; random 1-2 px architecture |
| Colour | Dark tint of the surface, not black: brown on wood (#1E0F05-#4C2521), navy at night (#1A1630, #1A1D40), plum in general (#2A1A23-#2E1E2B). Older study: #0B0A0C near-black | gravebell #1E0F05 on wood; window night #1A1630 / indoor #3A2A22 |
| Thinner than character lines | Yes, so characters pop | burglar §6 |
| No ink on | Far, blurred geometry; clouds (9/11 in the older study); sea horizon; terrain; forest backdrops (knight); screen worlds (upload game) | tree §6; cannonballs clouds |

### 5.3 Set types (VARIABLE, chosen by topic)
- Sea and ships (cannonballs, stormoil); historical towns (spear, jar, knight, gravebell, seconddraw);
  modern city and interiors (memory, burglar, job, slots, window, random, upload); nature (tree).
- Places per video: median **~8** (5-18). One set is reused under 2-4 different lights (seconddraw street noon/sunset/night;
  burglar living room 6 times; gravebell graveyard dusk/night/sunrise).

### 5.4 Props as jokes (CONSTANT)
- Every key noun becomes a prop on screen at the moment it is said (16/16).
- One **hero prop** recurs across most shots: jar in ~14/24 shots; teleport pod in ~17/23; tree in 9/20; slots machine 5/7.
- Props carry the hidden answer or the punch: the key on the burglar's belt (0.00 → 54.77); the frog motif planted 7 times (memory).

### 5.5 In-world text instead of overlays (CONSTANT 16/16)
- **No free-floating graphics on normal shots (16/16):** no title card, arrows, level numbers, progress bars, logos or
  end cards. Overlay-like text appears only inside full-frame insert screens (tree satellite/X-ray/thermal HUDs 15.3-64.9)
  or as two small labels (teleport split-screen "TOKYO" / "NEW YORK" 23.1-30.8; upload "a hair / a slice" 42.0).
- **All extra information is written on objects:** signs, plaques, LED counters, flip counters, gauges, ledgers, phone
  screens, documents, stamps, price tags, crate stencils, box labels.
- **Text is big and readable in under 1 s** (main letters ≥ 40 px tall at 1080, job §13), staged in the 25-60 % height band.
- **Font matches the world:** Trajan/Cinzel-like serif caps (spear); western slab serif (cannonballs, seconddraw);
  blackletter "Pardons" (knight); bold sans (teleport pods); bilingual English + Japanese (job, window); red LED digits
  (slots, random); handwritten notes (gravebell, random).
- Numbers on screen are exact and change on the word: YEARS AT WAR 099 → 100 on "hundred" (spear 8.0); LED $0 → $2,000,000
  landing on "million" (random 3.6-5.0); CREDITS 0 → 100 in 0.4 s (slots 13.45).

### 5.6 HUD and insert screens (COMMON, 14/16 have at least one)
| Insert | Videos | Use |
|---|---|---|
| Blueprint / diagram with self-drawing labels | spear 33.1, teleport 37.2, upload lens 27.0 | the mechanism |
| X-ray / wireframe | tree 40.7, slots 26.1, upload 38.2 | inside a body or machine |
| Cutaway / cross-section | tree skin 25.5, jar earth 61.7, gravebell diorama 4.7 | under the ground or skin |
| Phone / desktop / game UI | job 17.5 and 25.6, teleport survey 50.5, upload desktop 21.4 and game 32.2 | the modern "proof" |
| Satellite / thermal HUD | tree 15.3 and 62.3 | time stamp + danger |
| Top-down data board | random 10x10 coin grid 31.8; slots par sheet 18.1 | counting |
| Magnifier / peephole circle | random 1.5 and 45.5; burglar 21.95 | "being watched" |
| Split screen | teleport 23.1 | one person in two places |

### 5.7 Recurring asset types to build once
Flip counter, LED digit sign, gauge with needle, document with stamp, sign board, sticky note, price tag, phone screen,
hero prop with a changing status plate (teleport pod plate changes every shot: OPEN, ARRIVED, ERR 0x7F, DELETED, STEP INSIDE?).
Also seen often enough to build once (added by the verifier): wall clock with hands set per beat (job 10:03 → 6:00 → 9:00),
tear-off calendar, bulletin board with pinned notes, polaroid / framed photo (push-into-photo flashbacks), key with a tag,
padlock and chain, mug, money bag with a "$", coins, cash stacks, a "SOLD" / "FOR SALE" / "OUT OF ORDER" sign, tape outline
on a desk or floor, lanterns and candles (emissive), barrels and crates with stencils, a red X stamp.

### 5.8 Asset inventory per video (added by the verifier, from the reports' world sections)
| Video | Places | Hero prop (share of shots) | Recurring assets | Joke props (examples) |
|---|---|---|---|---|
| spear | 6 | spear + shield pair | red/teal colour code, war sign at start and end | anvil, IMPOSSIBLE stamp, $1 tags, flip counter, helmets as flower pots |
| memory | 15 | memory chip with a glowing photo window (~8 shots) | shop set ×3, frog motif ×7, polaroid, hospital room | HAPPINESS gauge, BAHAMAS flip counter, EMPTY/PAID meter, MEMORY SAVINGS passbook |
| cannonballs | 9 | cannon + ball | sea-stack backdrop, red pirate's mug handle, GARBAGE barrel | LANGRAGE → GARBAGE plaque, holed carcass ball, POWDER bag with a face |
| jar | 12 | the dragon jar (~14/24 shots) | throne hall, guards | ghost ball, bronze pendulum interior (heraldry only, no readable text) |
| burglar | 8 | the key on the belt | living room ×6 lights, red couch, cat, Halloween dressing | ruler, DON'T MOVE! notes, floor tape, carpet dents, 50% OFF, SOLD sign |
| job | 6 | the CDR door and sign (×4) | wall clock, calendars, KEN mug, the boss | FIRE EMPLOYEE button, STORAGE key, LABOR LAW padlock, breaker panel HOPE/WORK/FRIENDS |
| slots | 5 | Lucky 7s machine (5/7 shots) | 7-7-one-short reel, jackpot LED, red stools | par sheet, ONE CLICK SHORT prize wheel, $100 bill with a bean portrait |
| window | 6 | the token window | alley ×4, hall front ×3 | ¥0 register with a padlock, SHAMPOO bottle prize, PATROL LOG |
| knight | 10 | the pardon document (×4) | chest (×6), money bags, stamp | Price of Sins board, 3 HOURS queue sign, BOSTON fish crates |
| tree | ~6 | the tree (9/20 shots) | the "you" stand-in, red X, apples | field-guide poster with fine print, 4 diagnostic HUDs |
| teleport | 12+ | the pod with a status plate (~17/23) | ghost motif, NY and Tokyo streets | TELEPORTS TODAY counter, HERE LIES YOU TRIP #1046, survey UI |
| gravebell | 8 | S. HOLT bell post with a candy-striped rope (×4) | shovels (×4, one $1.25 tag), lanterns, tea cup | death certificate, practice log, tally boards |
| random | 9 | THE ONE tower (×3) and the cheque | magnifier, cop, digit skyline | DAYS WITHOUT AN AUDIT 412, "Totally Real Vendor LLC" cheque, coin tray |
| stormoil | 6 | the copper pot / STORM OIL can | Gravy Boat (8+ angles), pirate ship, storm-sea rig | soup bowl macro, GRAVY BOAT plate |
| seconddraw | ~6 | the head room (warm/empty) | street at noon, sunset, night | THINK BEFORE YOU DRAW plaque, NOBODY HOME sign, smartphone in a saloon |
| upload | 18 | brain jar (shots 1-4), then the copy | monitors, polaroids, EVERMORE brand, office set | NEUROCOPY lab, BRAIN DELI, consent form, "100% fatal" fine print |

Pattern: one hero prop in 1/3 to 3/4 of the shots, 2-4 recurring assets, and 5-20 readable joke props. Detail is high on the
hero and joke props and low on far sets.

### 5.9 Material cookbook (added by the verifier, from the reports' world sections)
| Surface | How it is drawn | Evidence |
|---|---|---|
| Wood | painted grain lines and nail dots in the texture; ink on plank silhouettes only; plank lines ~2 px | cannonballs decks; stormoil; seconddraw table |
| Brick, tile, ceiling grid | thin drawn lines in the texture, lighter than the ink, never inked per tile | job CDR brick and tiles; memory tenements |
| Stone, earth, rock | speckle and crack strokes; cutaways as flat painted strata | spear stone; jar ground cross-section; gravebell diorama |
| Snow, dirt mounds, storm waves | faceted low-poly with visible triangles | gravebell snow; stormoil storm swell |
| Calm water | flat cyan/turquoise toon plane, white foam lines and ripple rings, or crescent wave dashes; no ink at the horizon | tree sea #82CAE9 → #0C5BA9; cannonballs teal sea; memory animated caustics in the pool |
| Sky | painted gradient dome (deep blue top to pale horizon) with streaky or puffy clouds | tree sky top #1B82E8 (measured 36.5); seconddraw #1F80F7-#3FA1F5 |
| Clouds | soft white with lilac/lavender undersides, no outline | cannonballs; spear; older study 9/11 clouds un-inked |
| Foliage | many painted leaf cards with thin dark outlines; far trees as soft blobs or overlapping circles | tree canopy #29642D-#77B453; teleport circle-cluster trees |
| Glass | flat pale panel with 1-2 diagonal white glare streaks | job glass; teleport pod glass #3C597F |
| Metal | painted chrome highlight bands; gold can be a glossy PBR-like shader on a hero prop; rivets and rust streaks as texture | slots cabinet; jar gold dragon heads; cannonballs ironclad |
| Fabric and floors | knitted rugs, quilts, checker / terrazzo / damask patterns as flat texture | gravebell rugs; burglar quilt; seconddraw damask; random terrazzo |
| Emissive | windows, lamps, lanterns, candles, neon, LED digits and screens glow and bloom; everything else stays matte | 6.4 |
| Screens and UI | flat in-world UI on phone and monitor planes (iOS-style phone, XP-style desktop, PS1-style game) | job payroll phone; upload desktop 21.4 and game 32.2 |
| Fine grain | a light painted speckle on floors and walls at most (job 5-8 %); never film grain | job §6 |

---

## 6. Colour, lighting and grade

### 6.1 Overall numbers (CHANNEL_NUMBERS)
- Mean L* **47** (34-65), contrast L* sd **21** (17-25), chroma **29** (20-49), warm/cool b* median **-1.9** (-17 to +24).
- Older 20-short study, day: median Y' .571, non-ink p5 .234, colourfulness 82.8, black point RGB (35,19,20), vignette
  corner/centre .856. Golden: Y' .516, violet shadows, vignette .754. Night: Y' .243, black (9,10,38), shadow hue 239°,
  vignette .46. Interior: Y' .448, black (23,12,20), vignette .67.
- **Shadows are never neutral grey or black** (16/16). They are blue-violet, lavender, plum, mauve or warm brown.
- **Darkest pixels are coloured darks** (#1F192D, #2B0D26, #160A18), not #000 (jar §7; spear §7).

### 6.2 Palettes by mood
| Mood | Key hexes (examples) | L* / chroma / b* | Light | Evidence |
|---|---|---|---|---|
| **Day exterior** | sky #1F80F7-#3FA1F5, #519FDF → horizon #E6E3ED, #6B92D6 → #98C0F3; clouds #FFFFFF with lavender underside #7884DF; grass #6CB331 / #75C830; sand #CEA883 / #D2B783; red accent #E2253B; teal #54CCB7 | L* 55-71, chroma 12-46, b* -1 to +14 | warm-white sun high and to the side or behind; shadows blue-violet on ground (#61719D), lavender on rock (#837EA6), warm brown on wood (#986C50), mauve on stone (#897675) | seconddraw 0-25.7; cannonballs 0-2; spear 0-11.8; jar balcony L* 64.4 |
| **Golden / sunset / dawn** | jar #2B0D26 #FDCB9B #F69B8B #DD717C; knight #764369 #C26B82 #EEBD7F #FEF5D7; cannonballs dusk #4F256D #B45F83 #E67968; random #F2C492 #FBE198, shadow #5F4757; gravebell sunrise #6A7CE0 → #F7A3B7 → #FFB99F; tree dawn #E2869B → #FA9795 | L* 50-63, chroma 25-35, b* +12 to +26 | low sun **behind** the subject (backlight, long shadows toward camera); god rays; purple-plum silhouettes; never mix blue with orange (older study) | jar 30.5 (L* 52.6, chroma 32); jar dawn 46.5 (L* 63.1, b* +26); seconddraw 25.7-31.2 |
| **Night (blue)** | memory #0E2179 #253898 #04135D; burglar #1F328E #0C1E40 #3B4BD1; jar #3B458C #252E59 #2055CA; gravebell sky #07165F, snow #476AF8; stormoil storm #343FAA #3852CE #0E1F9B; seconddraw #030A52 #1E2565; warm practicals #FFAD58 #FEE7C2 #FCD5B1 #FFD2A0 | L* 29-44, chroma 41-78, b* -24 to -41 | saturated blue-violet ambient + warm practical pools (windows, lamps, lanterns) with bloom; faces tint lavender (#C8B0E2) | jar night 35.5 (L* 35.7, chroma 47, b* -41); burglar 3am chroma 75 (30.8) |
| **Warm interior** | stormoil galley #FBF1DA #E8A97A #B15426 #2B0F14; slots casino #34100D #632C22 #AF381D; spear forge #ED651D #DB411E; memory shop #19142A #342A43 + glow #F8BC5E; seconddraw saloon #4A1529 #803927; gravebell attic #A65D4A / #1F122C | L* 36-42, chroma 30-35, b* +17 to +21 | warm lamp/candle/forge key, deep brown-maroon or violet shadows, heavy vignette | slots shot 1 (L* 38.0, chroma 30.6, b* 17.6); spear forge (highest chroma, sat 173/255) |
| **Explainer / blueprint / "aha"** | blueprint #153A81 / #1D3C64 #224974 #0D2348, glow #BDDEF3; x-ray cyan #3CA3A9, tree x-ray bg #00243F, labels #6FE0F0; gold "aha" #F5CD7D #FCF38B; bowl macro #F4913E #FEE95B | blueprint sat 162/255 (teleport); slots inside L* 70.7, b* +41; stormoil macro L* 80 | cool flat or glowing; the "aha" is often the brightest moment of the video | teleport 37.2; slots 18.1; stormoil 49.9 |
| **Crime / danger** | fire #FAD189 #ED8546 #BD5425; lava #FFB23F, devils #D4301F; neon pink #F63D97, cyan #82DFE4, mint #E3E8D7; siren red then blue washes; police wash red #E07070 / blue #7080E0 | high contrast; hot accents on dark | hot accent inside a dark or muted world | cannonballs 37-49; knight 34.5; window 2.0; random 9.70 |

The explanation is **not** always night-blue: warm in stormoil (galley 42.9), jar (bronze interior 48.7), gravebell
(daylight flashback 37.4), random (sunset 24.6); blue in spear (blueprint 33.1), teleport (37.2), job (night 49.6),
seconddraw (night 51.1). Night-blue is used more for secret, danger and twist beats (older study agrees).

### 6.3 Light changes on story beats (CONSTANT 16/16)
- **Light states per video: median ~6-7** (3-10). Examples: burglar ~10 (night, day, sunset, night, morning, 3am, night,
  morning, day, night); slots 3 (red casino, gold inside, cool x-ray).
- **The pivot gets a new colour world in 12/16** (job day → night on "You see," 49.57; stormoil storm → warm galley 42.9;
  slots red → gold "Inside" 18.3; random day → sunset on "Real numbers work like that elevator" 24.6; spear night → blueprint 33.1).
- **In-shot relights for time passing: 8/16** (gravebell violet → orange sunrise 51.9-52.4; tree dusk → night in ~0.7 s 51.0;
  cannonballs noon → dusk time-lapse 32.4-34.0; spear day → night → dawn time-lapse 18.6-20.4; burglar lamp off 3 f 25.15).
- **Light dips on dread words:** jar scene darkens ~20 % on "if this ever" (3.37-3.93); spear candle blown out on "find out"
  (32.6, ~35 % darker).
- **Split light on the twist:** memory warm on the brother, blue on Jerry (71.3).

### 6.4 Bloom and glow (CONSTANT)
- Bloom only on emissive sources: candles, lanterns, windows, screens, neon, sun disc, fire, glowing props (16/16).
  White faces and white clouds never bloom (older study).
- Older study: glow e-fold 21-31 px @1080; whites reach .97-1.0.
- Glow is also used as a transition (6.3 glow dissolves) and to make a price or a sale visible (memory gauge 27.7; slots jackpot bar 21.6).

### 6.5 Depth of field
- **COMMON 14/16: strong in MS, CU and inserts; wides mostly sharp.** Background blur ~**10-20 px @1080** in MS/CU
  (jar 10-20; memory 10-25; seconddraw 8-20; job inserts 8-15). Bokeh discs from point lights.
- Foreground framers blurred (grass, banners, plants, crates, a cat) in 9/16 (jar banner 13.5; window cat 27-37; upload test tubes 25.1).
- Weak DOF: burglar (deep focus except inserts), cannonballs (mild, strong once at 24.5), stormoil (haze in storms instead).
- Older study: DOF on ~1/3 of screen time; background disc radius ≈ 12.5 px CU, 12 MS, 8 FS, 5.7 WS @1080; foreground
  framers in 38-39 % of MS/CU at 0.3-0.5 × focus distance; no focus pulls (memory rack focus 34.9 is the one exception).
- Note: our shipped bridge blurs 58 % of frames (REPO 9.2). That is too much.

### 6.6 Fog, haze, vignette
- Aerial haze in exterior wides: COMMON (nearly every video that has exterior wides; slots has none); fog colour = horizon
  colour (older study: skyline ~40 % toward the horizon colour).
- Warm haze down interiors (window pachinko aisle 4.7); milky haze in day scenes (burglar 15.5).
- Vignette: mild 10-25 % in most; strong in night interiors (window 30-40 %); none in teleport day shots and knight.

---

## 7. Captions — one definitive spec

| Item | Spec | Agreement |
|---|---|---|
| Font | Heavy geometric sans, **Black/ExtraBold**. Best guess **Montserrat Black (900) or ExtraBold (800)**; Poppins ExtraBold is close. Double-storey "a", single-storey "g", slanted cut on "t" | 16/16 same look |
| Font size | **~76 px** at 1080 wide (range 72-80) | |
| Cap / ascender height | **53 px** (52-54); x-height **40 px** (38-41); descender to y ≈ 1388-1389 | 16/16. The teleport report's 58 px included the stroke; re-measured at 53 px (caps y 1324-1376 on "Now", teleport 27.54) |
| Horizontal | Centred, **x = 540** (measured 537-541); single line | 16/16 |
| Vertical | Cap top **y ≈ 1322-1323**, baseline **y ≈ 1376** (71.7 % H), visual centre **y ≈ 1350 = 70.3 % H** (range 70.3-70.6 %). Never moves | 16/16 |
| Width | median ~260-340 px; max ~600-700 px (62 % of width, "The next morning," jar 46.05) | |
| Fill | **#FFFFFF** (measured 252-254) | 16/16 |
| Stroke | Black (#000000-#0A0A0A), **~5 px** visible outside the glyph (4-6 px; stormoil and seconddraw measured 6-8 px) | 16/16 black; width varies 4-8 |
| Shadow | Black drop shadow **~2 px right, ~4 px down**. Measured dark band beyond the white glyph edge: top ~4-5 px, left ~5-6 px, right ~7 px, bottom ~8-9 px | 16/16 have it; offsets from edge profiles on 12 videos (verification log) |
| Shadow softness | **One spec, small blur.** On all 12 measured videos the shadow's outer edge fades over ~5 px, while the stroke's own outer edge (top side) fades over ~2-3 px. That means a blur of about 2-3 px. The 5 videos the agents called "hard" (spear, cannonballs, job, knight, upload) show the same fade as the "soft" ones. The earlier hard/soft split was measurement noise | use `2px 4px 3px rgba(0,0,0,.85)` |
| Case | Sentence case **as spoken**, punctuation kept ("tree," "you." "real?" "at once!") | 16/16 |
| Words per caption | **1 word mostly; 2 when a short function word joins the next word; max 3.** Mean **~1.25** (measured 1.12-1.33). Distribution about 55-83 % one word, 17-35 % two, 0-10 % three | caption-swap counts (verification): memory 1.26, gravebell 1.28, tree 1.22, slots 1.14, job 1.12 (swap counting may over-count by a few %, so these are lower bounds); agents: slots 83/17/0 %; jar 55/32/9 %; cannonballs ~1.5 |
| Hold time | median **0.33 s (10 f)** (0.07-1.37 s); tiny words can flash 2-3 f | tree, cannonballs, teleport, gravebell, upload 0.33 s; jar 0.37 s |
| Timing | Swap **~2 f before** the word onset (per-video medians 0-5 f early; slots, burglar, random, tree 3-5 f early; spear, memory, cannonballs, window, knight, upload ~1 f early). Never more than ~3 f late. job: the next caption appears as soon as the previous word ends | 16/16 "on the word or slightly early" |
| Coverage | On screen from **frame 0 or 1** to the **last frame**; no blank gaps during pauses; last caption held through the tail | First caption on frame 0 in 10/16 (spear, memory, cannonballs, jar, burglar, job, knight, random, stormoil, seconddraw) and on frame 1 in 6/16 (slots, window, tree, teleport, gravebell, upload). Held to the last frame in 15/16 (spear hides it for the last 4 f). Swap counting found 0-1 blank frames per video (frame 0 only) |
| Animation | **None.** Hard 1-frame swap; no pop, scale, fade, bounce or karaoke highlight (measured: box width ratio 1.000 across frames after 155 swaps, memory §8) | 16/16 |
| Emphasis colour | **None.** Every word white | 16/16 |
| Number formatting | **Digits** for big numbers, years, units and money ("10,000", "1700s", "300", "19", "100%", "1000 lbs"); small numbers are inconsistent ("at two", "two through nine", "one", "ten" spelled out in random and gravebell). Split time as "at 3" / "a.m.," (burglar). Captions may edit the script ("hotshot" → "Hot" / "Shot."; "a thousand pounds," → "1000 lbs", cannonballs) | mixed |
| ASR slips | Some auto-caption errors left in ("Graves" capitalised mid-sentence, gravebell; "the emperor," lower case, jar 2.6) | proof-read ours |
| Swap on cuts | Captions keep swapping on words through dissolves; they never fade with the picture | 16/16 |
| Safe zones | Block lives in x ~150-930 and y ~1320-1392. Keep the bottom ~25-28 % (y > 1440) and the right-side button column free of key text. Faces and key in-world text at y 300-1300 | 16/16 |

Ready-to-use CSS (Remotion layer):
```css
font-family: "Montserrat", sans-serif; font-weight: 900; font-size: 76px; line-height: 1;
color: #FFFFFF; -webkit-text-stroke: 10px #000; paint-order: stroke fill;   /* 5 px visible outside */
text-shadow: 2px 4px 3px rgba(0,0,0,.85);   /* measured: ~2 px right, ~4 px down, ~2-3 px blur */
position: absolute; left: 0; right: 0; text-align: center; top: 1311px;
/* top is the line-box top, NOT the cap top. Montserrat.ttf metrics (studio/public/fonts): unitsPerEm 1000,
   ascender 968, descender -251, capHeight 700, xHeight 517. With font-size 76 and line-height 1 the baseline
   sits 65.2 px below the box top and the cap top 12 px below it. So top 1311 -> cap top ~1323, baseline ~1376.
   (top: 1323px would put the baseline at ~1388, 12 px too low.) */
```
Check the result by measuring: cap height 53 px, baseline 1376 px, centre 1350 px. Check that `paint-order` works on
HTML text in the Remotion Chrome build on one still. If it does not, draw the stroke with stacked text-shadows or an SVG
`<text>` element.

---

## 8. FX and secondary animation catalogue

All FX are flat 2D sprites outlined in the same plum ink as the characters unless marked.

| FX | Seen in | Typical numbers | Example |
|---|---|---|---|
| Bloom glow on practicals | 16/16 | emissive only | everywhere |
| Light shafts / god rays | 11/16 | soft additive quads 10-25 % opacity | tree noon 35-41; knight forest; stormoil 59.6-64.6; job flat yellow quad #D9D143 |
| Sweat drops | 13/16 | 1 f pop | section 4.5 |
| 4-point star glint / shine sweep | 6/16 | 6-10 f | spear weapons 10.9; jar ball 1.8; knight gauntlet 3.13; slots jackpot bar 21.6 |
| Dust motes / bokeh specks | 6/16 | slow drift | memory 66-77; slots interior; random most shots |
| Counter roll / flip digits | 5/16 | split-flap 4-6 f per digit; LED roll 0.4-1.4 s ease-out | spear 8.0, 44.2; memory 20.4; slots 13.45; random 3.6; upload 21.9 |
| Stamp / tick / ring pop | 6/16 | 2-4 f, no bounce | spear IMPOSSIBLE 36.7; window tick 43.67; upload red ellipse 46.0; tree X stamps (scale 0 → 1.1 → 1 in 4 f) |
| Impact ring / star burst | 5/16 | white ring + 15-25 streaks, 6-10 f | spear anvil 1.8; seconddraw holster 14.47; knight hits 31.7 |
| Smoke puffs / clouds | 5/16 | white with grey crescent lines; dark columns | cannonballs; job chair 1.3 |
| Speed lines | 4/16 | 12-20 white radial strokes | jar "run." 4.77; seconddraw bullet; cannonballs ball follow 60.3 |
| Dust puffs / pebble rings | 4/16 | soft beige | jar 27.8; knight 36.2; seconddraw 14.5 |
| Rain / snow | 7/16 | rain 1-2 px white streaks in layers; snow 2-8 px dots | memory 5-15; stormoil 27.1+; tree 17-30; teleport 17.9; window drizzle; gravebell snow; knight snow 6.0 |
| Lightning / sky flash | 3/16 | +15 luma for 2-4 f | tree 19.13; stormoil 39.37, 40.6, 41.97 |
| Time-passing props | 3/16 | cobweb, nest, stubble, candles, beanie colour | spear 18.9; jar 18.3; upload 12.4 |
| Ghost / hypothetical object | 2/16 | see-through, dashed outline, ~60 % opacity | jar ghost ball 3.9; teleport ghosts 2.0 |
| Shake / kick | 3/16 | rare (3.2 rules) | jar 46.80; cannonballs 60.8; seconddraw 14.5 |
| Motion blur | 8/16 | only on the fastest camera moves | memory dive 0.9; window fly 5.0 |
| Secondary motion | 16/16 | flags and banners sway, candle flicker every frame, tails, idle sway, bubbles, props dangle | spear banners; tree apples swing |

Not used anywhere as a style habit: film grain, screen-space emoji, comic text bursts (one "NOM!" in a game world, upload 34.5).

---

## 9. Voice

| Item | Spec | Evidence |
|---|---|---|
| Narrators | **One narrator** voices everything, including character lines (16/16) | |
| Pace overall | **3.69 w/s** median (3.47-4.06) | section 1 |
| Pace per beat | hook 3.0-4.6 (median ~3.8); setting often the fastest (4.1-4.4: memory, jar 4.57, stormoil 4.37, gravebell 4.28); action and chase clauses 4.5-5.2; punch lines and key lines slowed to 2.6-3.0 | seconddraw "Eddie never decides anything." 2.63; job "At first, it's paradise." 2.56; spear "Then nobody moved." 2.05; upload "100% fatal" 2.97 |
| Clause range | 2.0-6.4 w/s inside one video | spear |
| Sentence gaps | **0.10-0.28 s** (median ~0.16-0.20 s) | jar 0.10-0.24; upload median 0.20 |
| Pauses ≥ 0.3 s | median 2 (0-5), max 0.40 s; placed before the answer or punch, after "You see,", at the world → hero switch, before the final sentence, before a quote | spear 31.28 before "attack and find out"; memory 31.22 world → hero |
| Breaths | None audible (16/16): edited out or TTS | |
| Start / end | Word 1 at 0.00 s, at full level by frame 1.6-3.5 (median frame 2; the first 40-50 ms of all 16 tracks are digital silence); ends on the last word, tail ≤ 0.15 s in 14/16 | section 1; onset measured from `audio16k.wav` |
| Pitch | median F0 **~195 Hz** (174-211; ~178-211 once upload's bass-biased 174 is corrected to ~205), p10 ~131 Hz, p90 ~291 Hz, **~14 semitones** p10-p90 (12.1-14.4 per video). Phrase ends fall to ~90-130 Hz | CHANNEL_NUMBERS; voice.json; seconddraw ends 91-93 Hz |
| Pitch arc over a video (added) | calm and lower on the hook, higher and excited through the escalation, a drop for the pivot word and the explanation, a low settled last word | job: hook median 148 Hz, escalation 200-232 Hz, explanation 176 Hz, "forever." ~128 Hz (job §10) |
| Spectral balance of the full mix (added) | the average spectrum level is highest in 120-500 Hz; about 16 dB lower in 500 Hz-3 kHz, 23 dB lower in 3-8 kHz and 26 dB lower in 8-11 kHz. So the voice is warm and full, never bright or hissy. Use it as a tilt target for the voice EQ (relative values only) | median `band_mean_db` (audio.json, average level per band) over 16: sub 20-120 Hz +0.6, low 120-500 +4.7, mid 500-3k -10.9, high 3-8k -18.0, air 8-11k -21.6 dB |
| Pitch moves | statements fall at the end; questions and punch words rise (+5 to +9 semitones: burglar "him." 309 Hz; window "yen." 329 Hz); secret or ominous lines drop ~5 semitones (knight "That's where the knight was waiting" 151 Hz; window "little window" ~150 Hz); the last line often falls low and settled (memory 132 Hz, last word ~110 Hz) | |
| Character lines | same voice; +2 to +9 semitones for doubters, guards, kids (215-297 Hz); lower for grim/old men (~130 Hz) | jar, spear, memory |
| Loudness by line | sentence RMS inside a 1.3-5 dB spread; the pivot or twist line punched +2.5-3 dB (teleport "Because the machine never moved anyone." -13.9 dB; memory twist -14.1 dB) | |
| Delivery | fast, warm storyteller; deadpan on jokes; conspiratorial on secrets; playful, never shouty | |
| Gender | **Unclear.** Most agents: one bright, animated male or an AI/TTS storyteller; 4 agents (tree, window, stormoil, upload) say the range also fits a female voice | open question |
| Processing | heavy compression/limiting (LRA 1.7-3.1); dry, no room; warm low-mids (120-500 Hz loudest band); true peak -1.3 to -3.3 dBTP | |

---

## 10. Music and SFX

### 10.1 Music bed
| Video | Bed under the voice | Character (low confidence) | Changes |
|---|---|---|---|
| spear | 18-20 dB | soft pad, A chord (220/440/660 Hz) | none; no sting |
| memory | 18-20 dB | slow, sad, low bed (< 500 Hz) | 0.25 s fade with the last word |
| cannonballs | none, or ≥ 15-20 dB | faint 59 Hz element, maybe 104-108 BPM | — |
| jar | 20-28 dB | soft tonal underscore in D, weaker 24-44 s | ends ≤ 0.15 s after the last word |
| burglar | ≥ 22-30 dB (effectively none) | faint A/D/E pad in some windows | — |
| job | 18-22 dB | light corporate-comedy bed, B♭ major | flat; decays with the last word |
| slots | 12-23 dB | light plucks/bells | — |
| window | 16-23 dB | soft melodic loop, B minor / D major | flat |
| knight | ~11 dB (gap median), 15-20 dB true floor | light medieval whimsy | flat; fades in 0.12-0.17 s |
| tree | 12-18 dB | playful plucks/marimba/pad with bass | runs 0.5 s past the last word |
| teleport | 9-20 dB (sub-heavy; perceived 12-20) | dark slow minor bass notes G1-D2 | **drops ~10 dB under the 2 turning lines** (18-20 s, 30-32 s); small swell in the last 4 s |
| gravebell | 12-20 dB | quiet minor "sneaky mystery" | **thins for "Wait, practiced?"** (32.6-40) |
| random | ~20 dB | light "curious caper" | flat |
| stormoil | 16-20 dB | quiet melodic bed, D major | storm rumble bed removed in the galley explainer (43-52) |
| seconddraw | 8-15 dB | sustained pad/drone ~500 Hz + bass | **brief dip at "You see,"** (36.75-37.0) |
| upload | 5-6 dB raw / 8-12 perceived (all sub) | ~100 BPM 808-style sub + soft pad | flat; cut on the last frame |

Rules:
- **Bed level: median ~18 dB under the voice (range 8-28).** The old claim "only 5-10 dB below speech" is FALSE for 13/16
  (only upload's sub-bass bed, seconddraw and knight's gap median come close).
- **Character: soft, tonal, sustained (pad, plucks, mallets, low strings); no drums or clear beat in 13/16.**
- **Energy curve: flat in ~11/16.** When it moves, it **drops under a turning line** (teleport, gravebell, seconddraw) or
  removes a danger bed for the calm explainer (stormoil).
- **No end sting in 16/16.** Music fades with the last word in ≤ 0.25 s, or runs to the last frame and is cut.

### 10.2 SFX catalogue (what syncs to what)
SFX density is VARIABLE:
- **Rich (6/16):** cannonballs, knight, stormoil, jar, random, seconddraw.
- **Sparse (5/16):** tree, slots, job, upload, gravebell (one bell motif).
- **None found (5/16):** memory, burglar, teleport, window, spear (nothing provable).

| Sound | Syncs to | Level (above the low-band floor or vs voice) | Evidence |
|---|---|---|---|
| Boom / sub thump | cannon fire, impacts, collapses, final crash | +15 to +20 dB sub; the climax is the loudest hit | cannonballs explosion +19.5 dB (60.82); jar collapse -13.3 dB, the loudest (46.86); stormoil crash +17 (63.3) |
| Low thud | bag drop, landing, stamp, shovel bite, door slam | +12 to +22 dB | knight bag 0.66, stamp 23.84; jar gate 29.2; gravebell shovel 44.33 |
| Whoosh | fly-throughs, insert cut-ins, wipes, hook flight | in word gaps; up to voice level | knight 3.38, 7.60; random 3.50 (-13.6 dB), 6.36; cannonballs smoke wipe 18.03 |
| Clang / ping / spark | metal hits, ricochets | high band +13 to +20 dB | cannonballs iron plates 50.85; stormoil hook 20.0 |
| Chime / ting / glint | sparkles, coins, magnifier | high band | knight coin sparkle 0.5-2; random glint 1.46, coin flick 29.85 |
| Diegetic motif | the story object, every time it is named | ~1 s rings | gravebell bell partials ~1.3/3.6/6.7 kHz at 11.9, 15.9, 32.7, 48.6 |
| Thunder / rumble | lightning flashes, quake | ~+10 dB | stormoil 39.5-42.3; jar 61.3-63.6 |
| Gunshot / zap | muzzle flash | medium | seconddraw 0.70, 55.0 |
| Click / clunk | lever, counter, curtain, bin | in gaps | upload lever 31.01, bin 16.70, curtain 36.41 |
| Siren blip | police light wash | medium | random 9.80 |
| Ambience bed | storm rain/wind | sub floor +4-6 dB | stormoil 26.7-42.9 only |

SFX rules:
- **Plain dissolves get no whoosh** (0-2 of ~15 transitions have an onset in most videos). Whooshes go on fly-throughs,
  inserts and wipes only.
- SFX sit **under the voice or in word gaps**, synced to the on-screen event within ~0-3 f.
- **The biggest hit is the climax** (jar, cannonballs, stormoil). Cannon fires get no screen shake; the boom carries it.

### 10.3 Loudness targets
- **Integrated -14 LUFS** (median -14.1; 10/16 at -14.0 to -14.3). **LRA ~2.3 LU** (1.7-3.1). **True peak ≤ -2 dBTP** (median -2.3).

---

## 11. Retention mechanics (ranked by how many videos use them)

| # | Mechanic | Count | Example |
|---|---|---|---|
| 1 | Voice, caption and camera motion on frame 0-2; no intro, logo, title card, outro or CTA | 16/16 | job snap push +15 %/f on frame 1 |
| 2 | Strange claim stated as fact in sentence 1, shown on screen within 0.5-3 s | 16/16 | tree "kill you" + XX eyes at 2.30 |
| 3 | Every clause illustrated literally on the word | 16/16 | burglar ruler shows "one inch" (4.5) |
| 4 | A gag every ~3-5 s, mostly carried by props and signs | 16/16 | upload 15 gags |
| 5 | Lighting / time-of-day change on beats (~6-7 states) | 16/16 | burglar ~10 light states |
| 6 | Constant visual change: new framing ~1.7 s, caption swap ~0.35 s, camera always drifting | 16/16 | memory "no dead holds" |
| 7 | Ironic payoff in the last ~12 %, ending on the last word | 16/16 | knight 36.8-40.6 |
| 8 | One open loop from the hook held until the pivot or last sentence (33-51 s) | 15/16 | burglar 51 s of "why?"; stormoil 43 s |
| 9 | An explicit mystery line at ~42 % ("But how?", "How is that possible?", "The catch?") | 9/16 | random 9.94; seconddraw 19.76 |
| 10 | New colour world at the pivot | 12/16 | slots luma ~95 → ~170 at "Inside" (18.3) |
| 11 | Match dissolves and fly-throughs as small "how did they do that" rewards | 16/16 | seconddraw pupil → porthole 44.7 |
| 12 | Rewatch clue planted in frame 0-11 s | 7/16 | burglar key 0.00 |
| 13 | Running gag + callback in the final shot | 9/16 | cannonballs GARBAGE barrel 62.3 |
| 14 | Pattern-interrupt inserts (x-ray, blueprint, UI, POV, split screen) every ~10-15 s | 14/16 | tree 4 diagnostic screens |
| 15 | Pace ramp in the last third (+0.5 to +1.3 w/s) | 4/16 | knight 4.5-5.2 w/s in the last 8 s |
| 16 | Word or picture loop back to the hook | 10/16 | window same alley + "gambled" → "Gambling" |
| 17 | Silent visual button in the last 0.3-1.5 s | 8/16 | tree apple 67.8 |
| 18 | Question to the viewer at the end | 2/16 | upload consent form to the lens 55.6 |

---

## 12. Per-video index

| Title | Mode | Dur s | Hook formula | Standout technique |
|---|---|---|---|---|
| An Unstoppable Spear vs an Unbreakable Shield | A tale | 45.0 | Paradox as fact | Colour-coded sides in frame 0; locked time-lapse with a nest and web (17.9-20.4); blueprint tears on "exist" (37.4) |
| Every Memory Has a Price | A tale (sad fable) | 77.8 | Odd act as fact | Push into / pull out of a photo for the flashback (38.4, 42.3); split warm/blue light on the twist (71.3) |
| Levels of Pirate Cannonballs | C ladder | 63.5 | "If you..." claim | 9 long takes; "the moving object is the cut" fly-throughs; 2 smoke-cloud wipes (17.97, 59.67) |
| The Ancient Jar That Warned an Empire | A tale | 64.8 | Odd act + warning | Snap pushes on "run." / "happened." / "pile of"; dashed ghost ball for a hypothetical (3.9) |
| The Burglar Who Only Moved Furniture | A tale | 58.4 | Odd act as fact | Answer (key) on the belt in frame 0; locked overhead bed time-jumps with light-leak wipes (25.7-30.8) |
| The Job Nobody Wants in Japan | B you | 60.5 | Paradox + promise | Ejector-seat pun on "fired" (1.17); in-camera day → night relight on "You see," (49.57); 12.9 s final one-take |
| The Science Behind Slot Machines | B you | 30.9 | Relatable "You just..." | Prop morphs replace cuts (door 17.57, paper → wheel 25.57); stamper montage that speeds up (23.3-25.5) |
| The Window That Breaks Japan's Gambling Law | B you (switches at 13.7) | 45.0 | Paradox as fact | Answer window planted in frame 0 and the same alley at the end; glass auto-door dissolve (4.57) |
| This Knight Found the Ultimate Loophole | A tale | 40.6 | Paradox as fact | Foreground occluder wipes for "town to town" (3.8-7.6); one 6x snap zoom on the turn (30.27) |
| This Tree Hates You | B you | 68.1 | "If you ever..." threat | Survival clock; 4 diagnostic HUD screens (satellite, X-ray, skin, thermal); magnify-window wipe (25.43) |
| What If Humans Invented Teleportation | B you (hypothetical) | 54.1 | Future fact + contradiction | Fully 2.5D vector; split screens (23.1); music drops under turning lines; ends on a question |
| What the Grave Bell Really Meant | A tale | 59.5 | Dark strange fact | 5 object match dissolves; 3 window fly-throughs; bell as visual + sound motif; "Wait, practiced?" (35.96) |
| Why Humans Can't Pick Random Numbers | C ladder (true crime) | 47.1 | "If you ever..." promise | The world is the chart (tower shaped like "1", digit skyline 25.9); 10 s lesson hold; sunset switch on the rule (24.6) |
| Why Sailors Carried Storm Oil | A tale | 64.6 | Odd act + threat | "Ever blown on a bowl of soup?" macro + bowl → bowl → sea match dissolves (49.8, 52.4) |
| Why the Second Draw Always Wins | B you | 56.1 | Paradox rule | Follow-the-bullet into bullet-time (0.9-4.4); push into the pupil → control room in the head (43.4-51) |
| Would You Upload Your Brain | C ladder (hypothetical) | 56.9 | "If you..." conditional paradox | 5 screen fly-throughs; style switches (XP desktop, PS1 game, neon, purple cyber room); consent form to the lens |

---

## 13. Production recipe for our pipeline

Paths are inside a new project folder (never `an older unrelated project folder` or `an older unrelated project folder`).
File names follow the repo templates (`story.ts`, `toon.ts`, `cast.ts`, `cardshade.ts`, `ink.ts`, `lensblur.ts`,
`grade.ts`, `lights.ts`, `mix.py`, `music.py`, `sfx.py`). "Shipped" = what the bridge template does today (REPO section 4).

### A. Format and script
1. **Composition:** 1080x1920, 30 fps. Render the master at 1080x1920 (the reference is 1080p); 1440x2560 is optional.
2. **Length:** 45-65 s (target ~58 s). **Words = seconds × 3.7** (e.g. 58 s → ~215 words). Sentences ~13 words (5-23).
3. **Pick a mode** (2.1): A third-person tale (a named everyman + a real object or fact), B second-person "you" story
   (a silent stand-in in a bright shirt), or C explainer ladder (facts joined by signposts).
4. **Script template** (% of runtime):
   - 0-8 %: hook, 11-23 words, the strange thing as plain fact (paradox / odd act / "If you ever...").
   - 8-21 %: setting, 1-3 sentences ("Imagine you're..." for mode B; optional early "You see," world rule for mode A).
   - 21-65 %: 3-6 escalation beats; each adds a cost, threat, person or number; one prop gag each; 0-4 short quoted
     lines (2-11 words), including the doubter's or villain's line the payoff will flip.
   - ~42 %: one mystery line ("But how?", "How is that possible?", "Wait, X?", "The catch?") or one odd precise detail.
   - ~69 %: pivot word ("You see," default; "Well," / "Because" / "So let's crack it open." as variants).
   - 69-88 %: mechanism in 1-3 sentences, shown as a physical object (cutaway, blueprint, x-ray, top-down board, metaphor set).
     Add an everyday analogy only if it is truly familiar ("think about the last time...").
   - 88-100 %: ironic payoff in 1-2 sentences, last word = last frame; echo the hook's words if you can.
5. **Title:** 4-7 words, Title Case, one concrete noun, a question the hook answers as fact. Use a family from 2.9.
6. **Gags:** plan one every 3-5 s. At least: 3 sign/label gags, 1 counter gag, 1 running prop with a callback in the last
   shot, 1 rewatch clue in frame 0-10 s, 1 silent button in the last 0.5-1.5 s.

### B. Voice and timing
7. **Voice:** one narrator, 3.5-4.0 w/s, sentence gaps 0.10-0.25 s, no breaths, dry, compressed (LRA ≤ 3).
   1-3 pauses of 0.30-0.34 s only: before the answer/punch, after "You see,", before the last sentence. Slow the key
   line to ~2.6-3.0 w/s; speed action clauses to ~4.5-5 w/s. Character lines: same voice, +3 to +8 semitones
   (or lower for a grim old man).
8. **words.json:** hand-fix every word time; frame = round(s × 30). **TOTAL = last word end × 30 + 2-3 f**
   (up to +15 f only for a silent visual button).
9. **Voice starts on frame 0-2.** Put a real first word at 0.00 s.

### C. Shots, camera and transitions (`story.ts`)
10. **SHOTS:** 14-20 set-ups, median ~2.8 s, but **~30-40 framings** (one per clause, ~1.7 s). Each shot holds 1-4 `CAMS` keys.
11. **Creep on every hold:** `pushK` rate **0.002-0.004 per frame** (0.2-0.4 %/f = 6-12 %/s). No frame range ≥ 12 f with zero motion
    except 0-2 deliberate locks (time-lapse, split screen, final crash/button, a text-heavy frame).
12. **Reframes:** smootherstep glides of **20-45 f** (peak = 1.875 × move ÷ dur, aim 1-4 %/f); crane reveals **75-100 f**
    (scale change 75-99 %, peak ≤ 10 %/f). Centre each glide on its word (`f = wordFrame − dur/2`).
13. **After a dissolve:** the incoming camera is already moving; an ease-out decay of **25-55 f** is allowed. No 8-10 f bursts.
14. **Dives / fly-throughs:** ease-in to **4-16 %/f** over 12-45 f; change shots at top speed (6-8 f dissolve, or a
    `cut: true` on the frame where a window/screen/pupil fills the frame). Plan **≥ 1 fly-through** and **≥ 2 match dissolves**
    (same object, same screen spot) per video, plus **1 follow-the-object move** per hero prop.
15. **Snap push:** at most 1-3 per video, on the most emphatic word: x1.25-2.5 in 3-8 f (front-loaded ease-out) or a
    symmetric 21 f 6x; start 0-2 f before the word; 2-3 f of motion blur.
16. **Whips:** inside shots only, 12-36 f bells peaking 4-8 %w/f, light motion blur. Never a whip as a between-shot transition.
17. **XFADE:** default **7 f** (allow 5-9); **9-11 f** for time-passing montages; 4-5 f for one fast beat. Start on (or within
    0.25 s of) the first word of the new clause; both shots moving. Plain dissolves get no whoosh.
18. **Hard cuts:** 0 by default, **1 maximum**, only on a big place/time jump 2-3 f before a dialogue line or on an
    "enter" word. Replace the shipped 6 plain cuts + ~10 cut keys (REPO section 4) with dissolves, fly-throughs and follow moves.
19. **FLASH_AT:** do not add a white flash after the hook (0/16 do). Use a flash only when the story has a light event
    (muzzle, glitch, lightning, police lights): 2-5 f, or a 5-15 f glow-bloom into a dissolve.
20. **Lens:** default vFOV 40°; wides 55-60°; close-ups/inserts 30-35° (strong DOF). Camera at **0.8 × character height**
    (~1.35 m for a 1.68 m adult); low 0.3-1 m for hero-prop moments; 1-3 top-down or aerial shots; lens ≥ 2 m from props.
21. **Dutch:** level on calm beats; bank 3-10° during lateral moves and settle level; held 5-15° only on 1-3 danger or
    bad-news beats.
22. **Inserts:** every key noun gets a CU insert; 1-4 explainer inserts per video on the mechanism.

### D. Characters (`toon.ts`, `cast.ts`, `cardshade.ts`)
23. **Proportions:** head ≈ 30 % of height (3.3-3.5 head-heights; shipped `BUILD` adult 3.5 HH is fine); no neck.
24. **Face fill** off-white **#F8F3EE** (cool #F2F0F5 or warm #FCF6F1 variants); aim for luma ~.92-.96 on the lit side
    after the grade (the reference ranges ~.90-.97; job .92, tree .81 is an outlier).
25. **Outline** dark plum **#2C1E2A** (tint toward navy at night, maroon at sunset), drawn into the texture so it scales.
    Measured: **thin (lit) side ~2-2.5 % of head width, thick (shadow, lower-right) side ~5-6 %, average ~3.5-4 %**,
    thick:thin ~2.5-3:1 (tree 36.5: 2.0 % / 5.1 %; job 19.75: 2.1 % / ~6.5 %). The shipped `w(θ) = w0(1 + 0.45 cos …)`
    with w0 = 5u gives 2.75 % thin / 7.25 % thick, so it is ~25-40 % too heavy. Set **w0 ≈ 3.5-4u** and keep k ≈ 0.45
    (2.6:1). Do not go to 3u: that gives a 1.65 % thin side, thinner than any measured reference card.
26. **Face kit:** dot eyes #2A2030 (~3 % of head width), default half-lid; swaps: goggle shock, ^^, ><, XX, side-eye, closed;
    thick brows (they act); mouths: line, D-grin with square teeth, **grid-teeth grimace**, wavy "~", "o". No nose, no ears.
27. **Body kit:** bean torso; stick limbs ~5 % of head width; ball hands; tiny feet; one saturated body colour + one
    signature item per character; the "you" stand-in in a solid bright shirt.
28. **Card light:** multiply by the scene light colour (`cardShade` charTint); soft lavender far-side gradient (~10-25 %);
    soft contact blob under the feet at 30-40 % multiply. Rim (13/16 have some kind): default a 2-4 px pale rim inside the
    outline on the key side, turned orange/gold next to fire, lamps or a low sun (the shipped golden-only inner rim is close).
29. **Animation:** on 1s; expression swaps in 1 f, held ≥ 6 f; reactions 0-3 f before the word; blinks 2-4 f, every
    1.5-4 s and over every swap (a compromise: the breakdowns see blinks rarely, e.g. none in job, 2 f in jar, 3 f in
    memory, while the older study measured one every 0.5-2.3 s); small idle sway. **No mouth movement on narration.** If a character speaks a quoted line,
    add a 3-shape mouth flap held 2-5 f per shape (needs new code; nothing exists).
30. **Views:** draw front, 3/4, back and side-walk views for the lead; a lying view if a top-down shot needs it.

### E. World, light and post (`world.ts`, `build.ts`, `paint.ts`, `lights.ts`, `ink.ts`, `lensblur.ts`, `grade.ts`)
31. **Sets:** low-poly 3D with hand-painted canvas textures; 5-10 places; reuse one set under 2-4 lights.
32. **World ink:** **~3 px @1080 at mid distance** (allow 2-4; up to 8 px on near props), tinted dark (wood brown #2B1A12,
    night navy #1A1D40, general plum #2A1A26), none on clouds, terrain, sea horizon and far blurred geometry. The shipped
    `InkPass` (5.1 → 3.3 px, #030303) is ~1.5x too thick and too black for this reference.
33. **In-world text:** every key noun on a sign, label, LED, gauge or document; letters ≥ 40 px tall at 1080; era-matched
    font; staged at 25-60 % height. No screen-space graphics except the captions.
34. **Light states:** 4-8 per video, changed on beats; give the pivot a new colour world; relight in-shot over 10-20 f for
    time passing. Add **night** and **interior** presets (the template has only day/golden): use the 6.2 hexes, warm
    practical pools (needs point-light pools in TWO_TONE), night fog violet (#877AEA, older study).
35. **Grade targets:** mean L* ~47, chroma ~29, contrast sd ~21; coloured darks (never #000); day vignette corner/centre ~.86,
    golden ~.75, night ~.46.
36. **Bloom:** emissives only (shipped threshold 1.0, intensity .5 is right).
37. **DOF:** `cInf` CU 12-16, MS 10-12, inserts 12-16, wides 0-3; target background blur 10-20 px @1080 on MS/CU, about
    1/3 of screen time (shipped bridge: 58 % — too much). Foreground framers on ~1/3 of MS/CU, blurred, never over a face.
38. **Haze:** fog colour = horizon colour on every exterior wide.

### F. Captions (new Remotion layer; the repo has none)
39. Montserrat 900, 76 px, #FFFFFF, 5 px visible black stroke (`-webkit-text-stroke: 10px #000; paint-order: stroke fill`),
    black shadow 2 px right / 4 px down with ~3 px blur at ~85 %, centred x 540, cap top 1323 / baseline 1376
    (centre 1350 = 70.3 %). With line-height 1 that means CSS `top: 1311px` (see the CSS block in section 7).
40. Chunking: 1 word; join a, an, the, of, to, in, on, at, and, so, is, it, you to the next word; max 3; target ~1.25 words
    per caption; ~10 f each.
41. Timing: show each caption **2 f before** its word's start; hold through pauses; first caption on frame 0; last caption to
    the last frame; hard swap, no animation, no colour emphasis. Sentence case with punctuation. Digits for big numbers,
    years, units and money.

### G. Audio (`timeline.py`, `music.py`, `sfx.py`, `mix.py`)
42. **Master:** `mix.py` target **-14.0 LUFS** (shipped -15.0), true-peak ceiling **-2.0 dBTP** (shipped -1.2), expect LRA ~2-2.5.
43. **Music:** soft tonal pad/plucks/mallets, no drums by default. **MUSIC_TARGET ≈ -16 to -18 LU under the voice**
    (shipped ~-10 LU is ~8 dB too loud for this reference). Drop the bed a further ~6-10 dB under the 1-2 turning lines or
    remove it for the explainer. No end sting; fade with the last word in ≤ 0.25 s or cut on the last frame.
    Fix the no-speech NaN bug (REPO 9.3) before any instrumental gap.
44. **SFX:** on physical actions only (impacts, drops, stamps, clicks, the hero object's motif each time it is named), synced
    0-3 f to the picture, under the voice or in word gaps; medium actions ~-8 to -14 LU, the climax hit ~0 to -4 LU.
    Whooshes only on fly-throughs, inserts and wipes; none on plain dissolves. Choose a density: rich (impact story),
    sparse, or none (talky story).
45. **Lock the picture first,** copy every frame constant into `timeline.py`, delete `_cache`, run `mix.py`, check the
    cue sheet: integrated -14.0, TP ≤ -2.0, bed margins ~15-20 LU.

### H. QA before delivery
46. Caption pixel check (cap 53 px, cap top 1322-1323, baseline 1376, descender 1388-1389, x 540) on 3 stills; check the
    dark band around the glyph: ~5 px top/left, ~7 px right, ~8-9 px bottom.
47. Motion check: no ≥ 12 f frozen run except planned locks; ≤ 1 hard cut; median dissolve 6-8 f.
48. Timing check: voice audible by frame 2-4; last frame ≤ 3 f after the last word (unless a button gag).
49. Loudness check with ffmpeg ebur128: -14 ±0.5 LUFS, TP ≤ -2 dBTP.
50. Ethics check: no reference character, shot, line or title reused; channel never named.

---

## 14. Constants vs common vs variable

| Area | CONSTANT (15-16/16) | COMMON (9-14/16) | VARIABLE (≤ 8/16 or free choice) |
|---|---|---|---|
| Length / pace | 3.5-4.1 w/s; voice from frame 0-4; no intro/outro/CTA | 45-65 s (12/16); tail ≤ 0.15 s (14/16) | 31 s (slots) or 78 s (memory) |
| Story | strange claim as fact in sentence 1; literal illustration of every clause; ironic payoff in the last ~12 % ending on the last word; some open loop (14/16 — near constant) | "You see," (11/16); stated mystery line (9/16); sentence-initial "So"/"But" chains (15/16, 12/16) | story mode A/B/C; dialogue lines (8/16); "Wait...?" (2/16); "Ever...?" analogy (1/16); question to viewer (2/16); pace ramp at the end (4/16) |
| Gags | prop/sign gags; deadpan faces | running gag + callback (9/16); counter gags (9/16) | rewatch clue in frame 0 (7/16); fine print, anachronism; silent button (8/16) |
| Camera | never locked for long; creep 0.1-0.6 %/f on holds; ease-in-out bell moves; moving on frame 0-1 | first big move inside 1 s (12/16); crane-up reveal (10/16); follow-object (12/16); whip inside shots (9/16); aerial (10/16); top-down (11/16) | snap zoom (7/16); held dutch on danger (8/16); orbit (6/16); POV (5/16); shake (3/16) |
| Transitions | cross-dissolves 5-10 f (median 6-7); fly-through or dive used (15/16 as a transition, 16/16 as a move); captions keep swapping through dissolves | 0 hard cuts (12/16); match dissolves (12/16) | wipes (smoke, occluder, curtain, light-leak); glow dissolves (4/16); prop morphs (3/16); 1-2 hard cuts (4/16) |
| Characters | bean-head billboard cards; off-white face; no nose/ears/neck; dot eyes + thick brows; stick limbs + ball hands; tinted plum outline drawn into the art (~2-2.5 % of head width on the lit side, ~5-6 % on the shadow side); one colour + one signature item; instant expression swaps; no lip-sync on narration; scene-light tint (15/16) | rim of some kind (13/16); soft far-side gradient; contact shadows (10/16); sweat drops (13/16); on-1s rig (14/16) | mouth flaps on quoted lines (6/16); blush (6/16); silhouette cast shadows (4/16); cast size 1-17 |
| World | stylised textures, no photo textures or grain; props + diegetic signs carry information; no free-floating graphics on normal shots | hand-painted textures (11/16); full 3D low-poly (14/16); tinted ink 2-4 px on 3D edges; HUD/explainer inserts (14/16) | clean graphic textures (3/16); 2.5D flat layers (2/16); set type and era; number of places (5-18) |
| Light / grade | light changes on beats; bloom on emissives only; coloured (never neutral) shadows | new colour world at the pivot (12/16); DOF strong on MS/CU (14/16); aerial haze on exterior wides | in-shot relights (8/16); which mood carries the explanation (warm vs blue); number of light states (3-10); vignette strength |
| Captions | white heavy sans, ~53 px cap, baseline 1376, centre x 540, ~5 px black stroke + down-right shadow (~2 px right, ~4 px down, slight blur), 1-3 words (~1.25), hard swap 0-5 f early, no animation, no colour, on every frame | first caption on frame 0 (10/16) vs frame 1 (6/16) | digits vs spelled small numbers |
| Voice | one narrator; dry, compressed, no breaths; ≤ 5 pauses ≥ 0.3 s | median F0 175-211 Hz; key line slowed; pivot punched | gender/voice identity; character pitch shifts |
| Music / SFX | no end sting; bed well under the voice | bed 12-23 dB under (13/16); flat energy (~11/16); no drums (13/16) | SFX density (rich 6 / sparse 5 / none 5); music drop at the turn (4/16); beat-based bed (1-2/16) |
| Loudness | LRA 1.7-3.1 LU | -14.0 to -14.3 LUFS (10/16); TP -1.3 to -3.3 | -15 LUFS (5/16) |

---

## Appendix — open decisions (need the user's call)

| # | Question | Reference evidence | Our default until decided |
|---|---|---|---|
| 1 | Captions on? (the repo author's rule says no captions) | 16/16 references burn in captions (section 7) | ON, spec in section 7 |
| 2 | Master loudness -14 or -15 LUFS? | 10/16 at -14.0 to -14.3; 5/16 at -15 | -14.0 LUFS, TP ≤ -2 dBTP |
| 3 | Music bed level | median ~18 dB under the voice; shipped bridge ~-10 LU | -16 to -18 LU under the voice |
| 4 | Narrator voice | one bright storyteller, F0 ~195 Hz, gender unclear, likely TTS | choose one voice and keep it for every video |
| 5 | Character outline width | verifier pixel check: lit side ~2-2.5 %, shadow side ~5-6.5 %, average ~3.5-4 % of head width (tree 36.5, job 19.75). Most agents quoted the thin side (~2.5-3 %); the older study's ~5 % is near the average-to-thick side; shipped `toon.ts` w0 = 5u gives 2.75 % / 7.25 % | w0 ≈ 3.5-4u, keep k 0.45; then check 9-10 px thin side and ~25 px thick side on a ~480 px head |
| 6 | World ink | reference ~3 px tinted; shipped 5.1 → 3.3 px pure black | ~3 px tinted |
| 7 | Rim on cards | 13/16 have some rim; older study said none | pale key-side rim, warm near fire/sunset |
| 8 | DOF amount | ~1/3 of screen time; shipped 58 % | ~1/3 |
| 9 | Hard cuts | 12/16 have zero; shipped bridge has ~16 cut points | 0-1 per video |
| 10 | Lip flaps for quoted lines | 6/16 flap mouths on quoted lines only; our code has no flap system | avoid quoted lines until built, or build a 3-shape flap |
| 11 | SFX density | rich 6 / sparse 5 / none 5 | sparse-to-rich: every physical action, no whoosh on plain dissolves |
| 12 | Story mode for the first videos | A tale 7, B "you" story 6, C ladder 3 | A or B |

---

## Verification log

Written 2026-11-10 by the adversarial verifier. Method: recomputed numbers from `transcript.json`, `audio.json`,
`voice.json`, `frames.json` and `audio16k.wav` (read as data, never played); measured pixels on decoded frames with
numpy; read the matching report sections; checked code references with grep. Saved frame files (12, all named
`verify_*`): `_data\this-tree-hates-you\extra\` (frames 0/1, caption-band strip, a 10-video frame-0 caption tile, 36.50 s),
`_data\the-job-nobody-wants-in-japan\extra\` (19.75 s + edge crop, 56.50 s), `_data\what-if-humans-invented-teleportation\extra\`
(caption cap-height tile). Other measurements decoded frames in memory only: frames 0-1 and the last 12 frames of all 16,
4-6 caption frames in 12 videos, and the caption band of 5 whole videos for swap counting. No renders, no installs, no audio playback.

| # | Statement checked | Result | Evidence |
|---|---|---|---|
| 1 | Hook word counts for all 16 (median 14.5, 11-23) | OK | first sentence of every `transcript.json` matches the 2.3 table word for word and count for count |
| 2 | Hook ends at ~8 % / ~4.2 s (4-15 %, 2.8-6.1 s) | OK | computed median 7.65 % / 4.21 s, range 4.1-14.7 % / 2.80-6.14 s |
| 3 | 244 sentences, median 13 words, mean 13.5, p10 5, p90 23 | OK | computed 244 / 13 / 13.55 / 5 / 23 |
| 4 | "You see," in 11/16, 12 uses, at spear 74 %, burglar 87, job 82, window 67, stormoil 67, seconddraw 65, gravebell 5 and 91, memory 4, jar 11, knight 9, tree 29 % | OK; two roundings FIXED (spear 73 %, job 81 %) | word times: spear 33.02, burglar 50.98, job 49.15-49.26, window 30.38, stormoil 42.94, seconddraw 36.48, gravebell 3.20 and 54.0, memory 3.42, jar 7.28, knight 3.52, tree 19.66. CLAIMS had missed gravebell 54.0 and called tree "early": FIXED there |
| 5 | Sentence-initial So 15/16 (23), But 12/16 (18), Then 7/16 (10), Well 3/16, Instead 2/16, Because 1/16 | OK | transcript sentence starts |
| 6 | "Imagine..." in 4/16 (tree, job, seconddraw, teleport) | OK | tree 2.92, job 4.46-4.6, seconddraw 3.74, teleport 4.88. CLAIMS said "'Imagine you' (8/16)": FIXED there |
| 7 | "11/16 are 45-65 s" | FIXED → 12/16 | only memory 77.8, slots 30.9, knight 40.6 and tree 68.1 fall outside |
| 8 | LUFS median -14.1; 10 at -14.0..-14.3, 5 at -15.0/-15.1, tree -16.1 | OK | CHANNEL_NUMBERS `lufs` column |
| 9 | TP median -2.3 (-3.3 to -1.3); LRA median 2.3 (1.7-3.1) | OK | CHANNEL_NUMBERS `tp`, `lra` |
| 10 | Tail median 0.09 s; 14/16 ≤ 0.15 s (tree 0.50, upload 0.21) | OK | CHANNEL_NUMBERS `tail` |
| 11 | Voice audible by frame 1-4 | OK (detail added) | `audio16k.wav`: speech level reached at 0.055-0.115 s = frame 1.6-3.5, median frame 2 (spear 0.055, random 0.115); all 16 start with 40-50 ms of exact digital silence |
| 12 | F0 p10-p90 "~13 semitones" | FIXED → ~14 (12.1-14.4 per video) | voice.json p10/p90 per video, e.g. gravebell 120.1/276.0 = 14.4, memory 131.6/264.3 = 12.1. upload's 174 Hz median is bass-biased; its report measures ~205 Hz with two trackers (note added) |
| 13 | 0.30-0.34 s pauses before key turns at jar 60.26, gravebell 55.42, spear 31.28, teleport 46.06, memory 31.22, random 24.24, upload 42.62; longest real pause 0.40 s (gravebell 19.36) | OK | audio.json `pauses_ge_0.3s`; window's 0.54 s and job's 0.46 s are whisper errors per those reports (window §10, job §2) |
| 14 | Truly still frames median ~23 % (7-31 %) | OK median, FIXED range → 8.5-37.6 % | one uniform threshold (< 0.15 %/f) on `frames.json` for all 16: median 22.8 %; window 10.4 % (table said ~0 %), stormoil 20.8 % (~10 %), memory 37.6 %, job 8.5 %. Column added to 3.1 |
| 15 | Caption baseline 1376, cap top 1322-1323, descender ~1389, centre x 540 | OK | baselines 1376-1377 in all 16 (4 frames each); glyph tops 1321-1324 and descender bottoms 1388-1389 in 12 videos |
| 16 | teleport captions have a 58 px cap height | FIXED → 53 px, 16/16 | teleport 27.54 "Now": caps y 1324-1376; the 58 px figure included the 5 px stroke |
| 17 | CSS `top: 1323px` puts the cap top at 1323 | FIXED → `top: 1311px` | Montserrat.ttf: upm 1000, ascender 968, descender -251, capHeight 700; at 76 px and line-height 1 the baseline is 65.2 px below the box top |
| 18 | Shadow ~3-4 px right, 4-5 px down; hard (0 blur) in 5 videos, soft in 11 | FIXED | edge profiles on 12 videos: dark band ~4-5 px top, 5-6 left, ~7 right, 8-9 bottom, so offset ~2 px right, ~4 px down; the shadow's outer fade is ~5 px vs ~2-3 px for the stroke in all 12, including the 5 called "hard" (spear, cannonballs, job, knight, upload). CSS now `2px 4px 3px rgba(0,0,0,.85)` |
| 19 | Stroke ~5 px visible | OK | top/left dark band 4-6 px in all 12 |
| 20 | First caption on frame 0 in 11/16 (CLAIMS) | FIXED → 10/16 frame 0, 6/16 frame 1 | frames 0 and 1 decoded for all 16; tree's "If you" appears on frame 1 (`verify_f0f1_capband.png`); 10-video tile confirms frame 0 for the rest |
| 21 | Caption held to the last frame in 15/16; spear hides it for the last 4 f | OK | spear's last 4 frames have 0 caption pixels; the other 15 keep the caption to the end |
| 22 | ~1.35 words per caption (1.18-1.5) | FIXED → ~1.25 (1.12-1.33) | caption-swap counts: memory 234 captions / 295 words = 1.26 (agent 1.29), gravebell 1.28 (agent 1.33), tree 1.22, slots 1.14, job 1.12 (agent "about 1.4") |
| 23 | Caption hold median ~10 f | OK | median swap interval 9-10 f in the same 5 videos; 0-1 blank frames each (frame 0 only) |
| 24 | Character outline "~2.5-3 % of head width" | FIXED | pixel runs across the head edge: tree 36.5 lit 10 px / shadow 25 px on a 491 px head (2.0 % / 5.1 %); job 19.75 18 px / ~55 px on ~850 px (2.1 % / ~6.5 %). The 2.5-3 % figures are the thin side; average ~3.5-4 % |
| 25 | Thick:thin ~2-2.6:1 | FIXED → ~2.5-3:1 | same two heads: 2.5:1 and ~3:1; older study 2.9-3.5:1 |
| 26 | Face fill luma ≥ .93 | FIXED → ~.90-.97 | job 19.75 lit face #EBEAED (luma .92), job report #EAE9E7; tree 36.5 #CCCFDE (.81) in full sun |
| 27 | Hex spot checks: tree shirt #DA7D2C, sand #D2B783, day sky #1F80F7-#3FA1F5, job night ambient #112DBF / floor #00158A / lamp pool #ECCAA5 / face #F8D7AC | OK | measured tree 36.5: shirt #DB7C2B, sand #D2B67E, sky top #1B82E8; job 56.5: ceiling #1131BB, floor #021392, lamp pool #F3CAA0, boss face #F8D3A3 |
| 28 | Hidden cuts in 3/16 | FIXED → 2/16 (3 cuts) | jar 0.83 and 5.33 (jar §4), upload f967 |
| 29 | 5 visible hard cuts in 4 videos, 0 in 12/16 | OK | spear 28.00, cannonballs 2.20, jar 3.07 and 38.97, random 14.30 (reports §3-4) |
| 30 | Per-video dissolve medians (spear 7, memory 9, burglar 7, slots 7, window 6, tree 7, teleport 6, gravebell 9, random 6, stormoil 6, upload 6, jar 5-6) | OK | each report's transition line (e.g. memory "typical 9-10", gravebell "typical 9", window "median 6") |
| 31 | Light states 3-10 per video (bible) vs 4-9 (CLAIMS) | OK bible, FIXED CLAIMS → 3-10 | slots §7: red casino, gold interior, cool x-ray = 3; burglar §7: ~10 changes |
| 32 | Older-study numbers quoted from REPO_KNOWLEDGE (camera .79 × height, 82 % eye level, hold/drift/move 10/24/65 %, grade Y' .571/.516/.243/.448, vignette .856/.754/.46/.67, black points, glow e-fold 21-31 px, framing mix, ink ~5 % head width, thick/thin 2.9-3.5, fov 34-46°) | OK | REPO_KNOWLEDGE lines 213, 227-229, 239-243, 249-250 |
| 33 | CLAIMS Part B code references | OK except one | story.ts:64-65, 89-94, 110, 117-122, 300; ink.ts:52-53; toon.ts:6, 7, 57, 145, 352, 457; cardshade.ts:12-14, 43-54; shade.ts:40; Bridge.tsx:57, 99, 109-114; mix.py:20-22, 27-28; sfx.py 14 whoosh_cam + 5 whoosh_xfade + 1 flash_whoosh; cues.md -15.0 LUFS, -1.2 dBTP, LRA 2.4, voice -13.5 / music -23.7 LUFS all match. `lights.ts:18` FIXED → `LIGHTS` lights.ts:15, `LOOK` :45; Bridge.tsx:76 clarified (writes happen in world.ts:368-371) |
| 34 | Smootherstep peak = 1.875 × move ÷ dur | OK | derivative of 6x⁵-15x⁴+10x³ at x = 0.5 is 1.875 |
| 35 | Shipped k = 0.45 gives 2.6:1 | OK | (1 + 0.45) / (1 - 0.45) = 2.64 |
| 36 | ~16 shot changes per minute; ~221 wpm | OK | 15.5 changes / 57.6 s = 16.1/min; 3.69 × 60 = 221 |

### Completeness: what was missing or thin, and what was added
| Gap | Filled in |
|---|---|
| Camera stillness numbers used mixed thresholds, so videos could not be compared | 3.1: uniform still / drift / move column for all 16, with medians |
| No POV walk preset; no crane between a prop and a person | 3.2: two new rows (job 21.5-25.7; job 9.47-13.80; gravebell 10.3-11.1) |
| Prop and mechanism animation timing | 4.4: door snaps (1 f), panel swings (~5 f), stamps (2-4 f), pages, pops and entrances |
| Costume and accessory detail | 4.6: hat, hair, face-extra, body-graphic, hand-prop, non-human-cast and crowd kit |
| Assets per video | 5.7 extended asset list; 5.8 per-video inventory (places, hero prop and its share of shots, recurring assets, joke props) |
| Materials and surface detailing | 5.9 material cookbook (wood, brick, stone, snow, water, sky, clouds, foliage, glass, metal, fabric, emissive, screens, grain) |
| Caption build detail | 7: measured stroke and shadow band, font-metric CSS `top`, a `paint-order` check note, the frame-0 / frame-1 split |
| Voice shape and tone | 9: pitch arc over a video, spectral balance target, leading-silence note |
| Outline width recipe | 13 item 25 and appendix 5: w0 3.5-4u instead of 3u |

Still thin (not fixable from the evidence; treat as low confidence): music key and tempo (pitch-peak guesses only), SFX
levels (inferred from spectrograms), lens FOV (estimated from perspective), blink rate (rare in the breakdowns vs every
0.5-2.3 s in the older study), per-video framing mix (only the older 20-short study has one). Only two outline
measurements were made; check one more CU before locking w0.
