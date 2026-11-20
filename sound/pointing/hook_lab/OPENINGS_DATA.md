PAUSED 17:30 (2026-11-19): next step = none required; the measurement and this report are COMPLETE (all 29 videos measured, strips + tables + pointing scorecard written, final report delivered to the lead). Optional on resume: (a) re-measure the rat-tail Short from its real uploaded final instead of hanoirats/preview2.mp4 (`scripts/hook_measure.py data/manifest.json . <slug>` after fixing its path in `data/manifest.json`, then `scripts/summary.py` + `scripts/build_report.py` and re-assemble); (b) re-score section 8 if the pointing opening (d01/t01/n01) is re-recorded: read `sound/pointing/voice/_full/words.json` again.

# Openings data: the first 5 s of 24 top animated Shorts vs our 5 (hook lab, 2026-11-19)

Private study. Measured by script (`hook_lab/scripts/hook_measure.py`, `first_sentence.py`, `summary.py`, `dense_sheets.py`, `build_report.py`) and coded by eye from the strips (`scripts/manual_coding.json`). Nothing was played out loud. Views from `research_notes/ricksclips/inventory_flat.txt` (19 Nov 2026). Tiers used below: **top** = 13M+ (6 videos), **bottom** = 1.6M or less (5), **mid** = the other 13.

Caveats: (1) Samurai (1.0M) was about 2 days old when counted, so it is a weak 'bottom' case. (2) The rat-tail Short is measured from `Desktop/hanoirats/preview2.mp4` (540x960 preview); the uploaded final is not on this PC. (3) His old 16 have segment-level transcripts only, so their word times inside a sentence are estimated (even spacing by characters); the new 8 and ours have word times. (4) Camera speed = similarity fit on tracked features (% of frame per frame, caption band masked), the same method as LOOK_REPORT; heavy character motion can leak into it. (5) Cuts were counted by eye on 0.2-s sheets; the automatic detector over-counts on fast moves.

Files: strips (0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5 s) in `strips/<slug>.jpg`; every-0.2-s cut sheets in `strips/dense/dense_01..10.jpg`; frame 0 full size in `strips/frame0/`; motion heat (frame 0 | change 0-1 s | change 1-3 s) in `strips/heat/`; per-frame numbers in `data/<slug>.json`.

## 1. His 24 openings, measured (sorted by views)

| # | Short | views | first sentence (words, ends s) | type | words by 3 s / 5 s | max voice gap 0-5 s | first sound / voice onset s | cuts 0-5 s (first) | cam %/f 0-1 / 1-3 s | px changing 0-1 s | frame-0 L* / chroma |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | The Ancient Jar That Warned an Empire | 35M | "He put a bronze ball in a dragon's mouth and told the Emperor, if this ever falls out, run." (19, 5.1) | odd action + warning dialogue | 13 / 19 | 0.24 | 0.05 / 0.13 | 3 (0.8) | 0.454 / 0.276 | 0.27 | 43 / 17 |
| 2 | Why Perfect Railroads Don't Work | 30M | "He sawed gaps into a railroad every 39 feet." (9, 3.2) | odd action | 9 / 16 | 0.30 | 0.05 / 0.12 | 3 (1.9) | 0.769 / 1.922 | 0.25 | 29 / 26 |
| 3 | The Job Nobody Wants in Japan | 18M | "It's impossible to get fired in Japan, but companies found something way worse." (13, 4.3) | paradox statement | 10 / 14 | 0.26 | 0.05 / 0.07 | 5 (0.13) | 0.744 / 1.201 | 0.34 | 39 / 38 |
| 4 | The Window That Breaks Japan's Gambling Law | 16M | "Gambling is illegal in Japan, yet there's a gambling hall on almost every street." (14, 4.4) | paradox statement | 10 / 15 | 0.54 | 0.08 / 0.16 | 2 (2) | 1.337 / 1.291 | 0.21 | 24 / 30 |
| 5 | Why Sailors Carried Storm Oil | 16M | "He poured cooking oil into the sea, with a pirate ship so close behind them he could hear the pirates laughing." (21, 5.5) | odd action + threat | 13 / 21 | 0.00 | 0.05 / 0.11 | 2 (2.3) | 0.667 / 4.088 | 0.34 | 58 / 49 |
| 6 | What the Grave Bell Really Meant | 13M | "They buried a man alive with a bell tied to his finger." (12, 3.1) | odd action | 12 / 20 | 0.14 | 0.06 / 0.15 | 3 (0.5) | 6.013 / 3.04 | 0.46 | 54 / 39 |
| 7 | This Shape Saved Roller Coasters | 12M | "He bent the rollercoaster's loop out of shape." (8, 2.2) | odd action | 11 / 19 | 0.28 | 0.05 / 0.1 | 3 (1.3) | 1.054 / 1.726 | 0.15 | 46 / 37 |
| 8 | The Pink Prison Cell Experiment | 11M | "They painted the jail cell pink." (6, 1.7) | odd action (6 words) | 11 / 16 | 0.32 | 0.05 / 0.13 | 2 (2.45) | 0.239 / 0.53 | 0.04 | 36 / 14 |
| 9 | The Instinct That Makes You Crash | 10M | "If you plant a tree beside an empty road, cars will steer right into it." (15, 4.1) | If you... -> outcome | 12 / 20 | 0.22 | 0.06 / 0.21 | 2 (1.1) | 0.784 / 0.107 | 0.31 | 61 / 18 |
| 10 | The Burglar Who Only Moved Furniture | 10M | "A man snuck into a family's house every night and moved every single thing one inch to the left." (19, 5.3) | odd action | 11 / 18 | 0.00 | 0.05 / 0.08 | 3 (1.8) | 0.966 / 0.631 | 0.22 | 39 / 44 |
| 11 | Levels of Pirate Cannonballs | 9.9M | "If your ship got hit by a cannonball, you'd actually be one of the lucky ones." (16, 3.9) | If you... -> paradox | 13 / 20 | 0.16 | 0.05 / 0.07 | 4 (1.5) | 2.999 / 2.846 | 0.42 | 66 / 26 |
| 12 | Why the Second Draw Always Wins | 9.8M | "The fastest gun in the West had one rule, never draw first." (12, 3.6) | paradox statement (a rule) | 11 / 16 | 0.18 | 0.09 / 0.26 | 4 (0.75) | 0.348 / 4.36 | 0.19 | 60 / 27 |
| 13 | An Unstoppable Spear vs an Unbreakable Shield | 9.6M | "A blacksmith sold a spear that could pierce anything to one king and a shield that nothing could pierce to his worst enemy." (23, 6.1) | odd action / paradox | 11 / 19 | 0.00 | 0.05 / 0.23 | 0 (-) | 0.422 / 0.989 | 0.13 | 59 / 26 |
| 14 | Why Humans Can't Pick Random Numbers | 9.5M | "If you ever fake a number, there's a way to tell a human made it up." (16, 3.5) | If you... -> claim | 14 / 22 | 0.18 | 0.06 / 0.22 | 1 (3.6) | 7.652 / 0.298 | 0.38 | 52 / 18 |
| 15 | How One Cart Stopped an Entire Army | 9.2M | "He drilled 82 holes into the wood, because down the hill, an army is marching straight for his fort, and while everyone else sharpens swords, he's in the corner still drilling." (31, 9.3) | odd action (31 words) | 10 / 17 | 0.22 | 0.05 / 0.13 | 3 (1.15) | 0.239 / 1.478 | 0.24 | 60 / 25 |
| 16 | What If Humans Invented Teleportation | 7.3M | "When humans invent teleportation, billions of people will die, and nobody will even notice." (14, 4.6) | outcome claim | 9 / 15 | 0.26 | 0.06 / 0.14 | 3 (1.1) | 0.865 / 0.335 | 0.11 | 71 / 15 |
| 17 | How Mine Salting Worked | 6.7M | "He loaded the shotgun with gold and fired it into the walls of the mine." (15, 3.5) | odd action | 13 / 21 | 0.22 | 0.05 / 0.14 | 4 (0.9) | 0.259 / 2.221 | 0.39 | 22 / 16 |
| 18 | Why Drivers Started Filming The Road | 4.7M | "He slammed the brakes on the highway, and the car behind him smashes right into his bumper." (17, 4.3) | odd action + outcome | 13 / 20 | 0.30 | 0.05 / 0.12 | 3 (1.3) | 1.289 / 0.663 | 0.34 | 36 / 24 |
| 19 | Would You Upload Your Brain | 3.9M | "If you took your brain out and put it in a jar, you'd die, but your brain wouldn't." (18, 4.1) | If you... -> paradox | 15 / 21 | 0.10 | 0.06 / 0.27 | 1 (4.3) | 0.297 / 0.391 | 0.12 | 64 / 25 |
| 20 | This Knight Found the Ultimate Loophole | 1.6M | "A knight paid a priest to forgive a crime he hadn't committed yet." (13, 3.4) | odd action (abstract: a future crime) | 12 / 19 | 0.14 | 0.06 / 0.12 | 3 (3.35) | 0.482 / 0.988 | 0.24 | 56 / 29 |
| 21 | Why Samurai Feared The Flying Thunder | 1M | "He rolled the bomb into the enemy camp, but made sure it wouldn't go off." (15, 3.7) | odd action | 13 / 19 | 0.24 | 0.05 / 0.15 | 2 (0.9) | 2.181 / 1.901 | 0.20 | 31 / 17 |
| 22 | This Tree Hates You | 1M | "If you ever sit under this tree, it can kill you." (11, 2.8) | If you... -> threat | 12 / 20 | 0.12 | 0.05 / 0.07 | 1 (2.9) | 0.404 / 0.777 | 0.28 | 63 / 27 |
| 23 | Every Memory Has a Price | 0.572M | "He sold his happiest memory to a stranger behind a counter." (11, 3.3) | odd action (fantasy world) | 11 / 17 | 0.16 | 0.05 / 0.08 | 2 (0.9) | 0.493 / 0.515 | 0.22 | 25 / 20 |
| 24 | The Science Behind Slot Machines | 0.147M | "You just watched two jackpot symbols land, and the third one stopped one click short." (15, 4.5) | You just... moment | 10 / 17 | 0.16 | 0.05 / 0.22 | 1 (0.8) | 0.902 / 0.7 | 0.55 | 45 / 32 |

## 2. His 24 openings, coded by eye

| # | Short | frame 0 (what is in it) | face / eyes to camera / hands | text on frame 0 | first motion (type) | 2nd character or opposing force (s) | conflict by 3 s | recognisable topic | odd act visible at frame 0 | open question at 3 s |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | The Ancient Jar That Warned an Empire | inventor at left reaching a bronze ball to a gold dragon head on a giant jar; throne room | Y / side / Y | caption | frame 1: character (arm) + slow push | 2.3: the Emperor + 2 guards (authority); court laughs at 5.3 s | Y | med | Y | What happens if the ball falls out? |
| 2 | Why Perfect Railroads Don't Work | worker crouched sawing a rail; steam train head-on behind him, headlamp lit, black smoke | Y / Y / Y | caption | frame 1: character (sawing) + push | 0: oncoming train in frame 0 | Y | Y | Y | Why saw gaps in a railroad, with a train coming? |
| 3 | The Job Nobody Wants in Japan | defocused desk with a red FIRE EMPLOYEE button; worried employee behind; an arm reaches for it at 0.2 s | Y / Y / Y | caption + sign (0.2 s) | frame 1: rack focus + arm (character) | 0.2: the boss's arm on the FIRE button; boss face 2.8 s | Y | Y | part | What is worse than being fired? |
| 4 | The Window That Breaks Japan's Gambling Law | night alley: a frowning man walks past a lit window booth where two men sit | Y / side / N | none (caption 0.25 s) | frame 1: character walk + push | 0: the booth men (the law is only in words) | N | Y | part | How is gambling everywhere if it is illegal? |
| 5 | Why Sailors Carried Storm Oil | ship's cook pouring a big pot of oil over the side; oil stream already falling | Y / Y / Y | caption | frame 1: object (oil stream) + tilt down | 2.4: pirate ship chasing (2.4 s), laughing pirates 3.6 s | Y | Y | Y | Why pour cooking oil into the sea with pirates behind? |
| 6 | What the Grave Bell Really Meant | smiling man at the edge of his own open grave, gravedigger's hand on his shoulder, bell post behind | Y / Y / Y | none (caption 0.2 s) | frame 1: fast crane into the grave | 0: gravedigger; being buried alive | Y | Y | Y | Why tie a bell to a buried man's finger? |
| 7 | This Shape Saved Roller Coasters | engineer mid-swing with a sledgehammer on a rail, gritted grin, clean blue sky | Y / Y / Y | caption | frame 1: character (hammer swing) | -: none in 0-5 s (rival at 33 %) | N | Y | Y | Why bend the loop out of shape? |
| 8 | The Pink Prison Cell Experiment | guard rolling paint up a grey-blue cell wall; first hot-pink stroke at 0.5 s | Y / side / Y | caption | frame 1: character (rolling) + object (pink stroke) | 3.7: scientist mixing the paint (not an opponent) | N | Y | Y | Why paint a jail cell pink? |
| 9 | The Instinct That Makes You Crash | man about to drop a seed in a hole beside an empty straight road; a car far away | Y / Y / Y | caption | frame 1: character, then object (tree bursts up 0.6 s) | 0: car in frame 0 (tiny), steers in 3.0 s, crash 3.6 s | Y | Y | Y | Why would a car hit the only tree? |
| 10 | The Burglar Who Only Moved Furniture | masked burglar beside a house at night | Y / Y / N | caption | frame 1: character (sneaks, climbs) | -: none (he is the threat) | N | Y | part | Why move everything one inch? |
| 11 | Levels of Pirate Cannonballs | sailor holding a cannonball beside a cannon; pirate behind | Y / Y / Y | caption | frame 1: fast camera orbit, cannon fires 1.4 s | 0: pirate in frame 0; ship battle | Y | Y | Y | Why is a cannonball hit the lucky case? |
| 12 | Why the Second Draw Always Wins | gunslinger aiming a revolver straight at the lens | Y / Y / Y | caption | frame 1: character (aim), muzzle flash 0.8 s, bullet follow | 1.6: the opponent in the street | Y | Y | Y | How does drawing second win? |
| 13 | An Unstoppable Spear vs an Unbreakable Shield | blacksmith between a red king (spear) and a teal king (shield) on a red/teal split floor | Y / Y / Y | caption | frame 1: push + spear thrust 2.0 s | 0: two rival kings, colour-coded | Y | Y | Y | What happens when spear meets shield? |
| 14 | Why Humans Can't Pick Random Numbers | macro: a pen writing $87,43_ on a cheque | N / N / Y | caption + cheque numbers | frame 1: very fast pull-out (7.7 %/f) to the man | 1.2: investigator's magnifying glass | Y | Y | Y | How can they tell a human made it up? |
| 15 | How One Cart Stopped an Entire Army | man drilling holes in a board below a fort wall | Y / side / Y | caption | frame 1: character (drilling) | 2.6: army on the hill, commander 3.4 s | Y | med | Y | Why drill holes while an army comes? |
| 16 | What If Humans Invented Teleportation | man stepping into a NEW YORK teleport booth | Y / Y / N | sign NEW YORK (caption 0.2 s) | frame 1: character walk; flash 1.0 s | 1.8: TELEPORTS TODAY counter + queues (deaths) | Y | Y | Y | How would teleporting kill billions? |
| 17 | How Mine Salting Worked | miner in a top spotlight holding a shotgun, dark cave | Y / Y / Y | caption | frame 1: character + slow push, snap push 0.6 s | 2: buddy watching (doubter line 6.7 s) | N | med | Y | Why shoot gold into a mine? |
| 18 | Why Drivers Started Filming The Road | smug driver in his seat, hands on the wheel | Y / Y / Y | caption | frame 1: character (brake jolt) + push | 1.4: the car behind; crash 3.0-3.4 s | Y | Y | part | Why brake on purpose? |
| 19 | Would You Upload Your Brain | man at a workbench lifting the top of his skull beside a jar of yellow liquid | Y / Y / Y | none (caption 0.2 s) | frame 1: character (lifts skull lid) | -: none | N | med | Y | Would my brain live in a jar? |
| 20 | This Knight Found the Ultimate Loophole | knight tossing a coin purse to a priest at a Pardons booth | Y / Y / Y | caption + sign Pardons | frame 1: object (coin purse) + slow push | 0: priest (a deal, no conflict) | N | N | Y | How can you be forgiven for a crime not yet done? |
| 21 | Why Samurai Feared The Flying Thunder | samurai at night about to roll a bomb | Y / side / Y | caption | frame 1: character + bomb rolls, follow | 1.8: enemy camp | Y | N | Y | Why a bomb that will not go off? |
| 22 | This Tree Hates You | man strolling under a tree on a beach, smiling | Y / Y / N | none (caption 0.2 s) | frame 1: character walk | -: none (death gag on 'kill' at 2.2 s) | N | N | N | How can a tree kill you? |
| 23 | Every Memory Has a Price | dark shop: worried man at a counter, a hooded figure in the shadow behind | Y / Y / N | caption | frame 1: character + slow push | 0: hooded stranger (barely visible, L* 25) | Y | N | N | What does selling a memory mean? |
| 24 | The Science Behind Slot Machines | slot reels spinning, no character | N / N / N | machine text | frame 1: object (reels) | -: none (buddy at 8.5 s) | N | Y | Y | Will it hit? (weak) |

All 24 have pixel motion from frame 1 (0.033 s): no opening starts on a still frame. First sound (-50 dBFS) is at 0.05-0.09 s in 24/24 (frame 1-3), i.e. the narrator starts on frame 0-2; the first voice is the narrator in 24/24.

## 3. Our 5 openings, measured and coded

| Short | views | first sentence (words, ends s) | type | words by 3 s / 5 s | max voice gap 0-5 s | first sound / voice | cuts 0-5 s | cam %/f 0-1 / 1-3 s | px changing 0-1 s | voice-bed level 0.5-3 s dBFS | frame 0 | face / eyes / hands | 2nd char / force | recognisable | odd act at f0 | open question at 3 s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| anti-theft sign | 24,600 | "She'd never stolen anything, not even a paperclip, then she read one sign, and wanted to steal." (17, 7.0) | character statement -> odd outcome (3.6-7.0 s) | 8 / 13 | 0.38 | 0 / 0.01 | 0 | 0.132 / 0.157 | 0.11 | -15.5 | woman in a sunhat, centred, under a giant WARNING! 14 TONS STOLEN EVERY YEAR sign; crow on the sign | Y / Y / N | -: none; the sign is the tempter; thought bubble of her stealing at 3.0 s | Y | N | Why tell me she never stole? (the twist line ends 7.0 s) |
| salad oil | 7,400 | "A man had borrowed over $150 million dollars against tanks that were mostly water." (14, 6.0) | outcome statement + big number (+ date on screen) | 8 / 11 | 0.00 | 0 / 0.14 | 0 | 0.223 / 0.043 | 0.37 | -12.8 | top-down macro of an open tank hatch with golden liquid and a dipstick; title card at 0.2 s | N / N / Y | -: none | med | part | How do you fake oil? (answered at 5.6 s: 'mostly water') |
| typo | 1,500 | "One typo cost a Tokyo bank $40 billion yen, and it sold shares that didn't even exist." (17, 6.6) | outcome + numbers + place | 8 / 14 | 0.24 | 0 / 0.15 | 0 | 0.117 / 0.112 | 0.08 | -14.8 | smiling clerk at a desk under a SHARES SOLD 000,000 board and a J-COM: ONLY 14,500 EXIST sign | Y / Y / Y | -: none (red alarm light 2.8 s) | med | Y | What did the typo do? (answered in the same sentence) |
| clown | 1,400 | "Quick test!" (2, 0.8) | quiz / task | 8 / 8 | 2.80 | 0 / 0 | 0 | 0.213 / 0.114 | 0.28 | -23.0 | busy wide plaza: clown on a unicycle right of centre (small), suit man, ~10 walkers, pigeons; lower 40 % empty brick | Y / Y / N | 0: crowd only, no opposition | Y | N | How many phones? (a task, no story question) |
| Hanoi rat tails (preview2 540x960 proxy; final file not on this PC) | 1,300 | "In 1902, Hanoi paid 1 cent for every rat tail and ended up with more rats." (16, 6.4) | date + place + backfire outcome | 8 / 11 | 0.64 | 0 / 0.11 | 0 | 0.197 / 0.144 | 0.05 | -15.9 | high-angle gutter, a tiny rat head at a drain grate, steam; no person | N / N / N | -: none | med | N | Why pay for rat tails? |

Notes: anti-theft's first sentence by the script is "She'd never stolen anything." (4 words, ends ~1.7 s); the transcriber merged the three short sentences. Salad oil's "$150" is the transcriber's spelling of "150". His voice-bed level 0.5-3 s: median -15.7 dBFS (range -19.4--13.5).

## 4. Top vs mid vs bottom (his) vs ours: medians and counts

| median (range) | top 6 (13-35M) | mid 13 (3.9-12M) | bottom 5 (0.15-1.6M) | all 24 his | ours 5 |
|---|---|---|---|---|---|
| first sentence words | 13.5 (9-21) | 16 (6-31) | 13 (11-15) | 15.0 (6-31) | 16 (2-17) |
| first sentence ends (s) | 4.36 (3.06-5.48) | 4.08 (1.72-9.28) | 3.38 (2.8-4.54) | 3.97 (1.72-9.28) | 6.36 (0.78-7.04) |
| words by 3 s | 11.0 (9-13) | 11 (9-15) | 12 (10-13) | 11.5 (9-15) | 8 (8-8) |
| words by 5 s | 17.5 (14-21) | 19 (15-22) | 19 (17-20) | 19.0 (14-22) | 11 (8-14) |
| max voice gap 0-5 s (s) | 0.25 (0-0.54) | 0.22 (0-0.32) | 0.16 (0.12-0.24) | 0.2 (0-0.54) | 0.38 (0-2.8) |
| cuts 0-5 s | 3.0 (2-5) | 3 (0-4) | 2 (1-3) | 3.0 (0-5) | 0 (0-0) |
| first cut (s) | 1.35 (0.13-2.3) | 1.3 (0.75-4.3) | 0.9 (0.8-3.35) | 1.3 (0.13-4.3) | None (-) |
| camera 0-1 s (%/f) | 0.76 (0.454-6.013) | 0.78 (0.239-7.652) | 0.49 (0.404-2.181) | 0.76 (0.239-7.652) | 0.2 (0.117-0.223) |
| camera 1-3 s (%/f) | 1.61 (0.276-4.088) | 0.66 (0.107-4.36) | 0.78 (0.515-1.901) | 0.99 (0.107-4.36) | 0.11 (0.043-0.157) |
| px changing 0-1 s | 0.3 (0.211-0.464) | 0.22 (0.044-0.424) | 0.24 (0.195-0.546) | 0.25 (0.044-0.546) | 0.11 (0.054-0.371) |
| px changing 1-3 s | 0.41 (0.231-0.471) | 0.26 (0.122-0.507) | 0.28 (0.201-0.451) | 0.29 (0.122-0.507) | 0.15 (0.078-0.239) |
| frame-0 L* | 41.0 (23.6-58.3) | 59.3 (21.9-70.7) | 45.3 (24.8-62.7) | 49.1 (21.9-70.7) | 48.3 (46.9-49.8) |
| frame-0 chroma | 33.55 (17.4-48.6) | 25.0 (13.8-44) | 26.6 (17-32.2) | 25.6 (13.8-48.6) | 35.6 (29.3-43.1) |
| frame-0 L* sd (contrast) | 19.5 (16.6-27) | 20.4 (15.3-24.2) | 24.4 (17.1-31.1) | 20.35 (15.3-31.1) | 21.5 (19.7-30.9) |
| level 0.5-3 s (dBFS) | -15.55 (-17.6--13.5) | -15.8 (-17.1--13.8) | -16.1 (-19.4--14.7) | -15.7 (-19.4--13.5) | -15.5 (-23--12.8) |
| first sound (s) | 0.05 (0.05-0.08) | 0.05 (0.05-0.09) | 0.05 (0.05-0.06) | 0.05 (0.05-0.09) | 0.0 (0-0) |

| count | top 6 | mid 13 | bottom 5 | all 24 his | ours 5 |
|---|---|---|---|---|---|
| face in frame 0 | 6/6 | 12/13 | 4/5 | 22/24 | 3/5 |
| eyes to camera in frame 0 | 4/6 | 10/13 | 3/5 | 17/24 | 3/5 |
| hands doing something in frame 0 | 5/6 | 11/13 | 2/5 | 18/24 | 2/5 |
| odd act fully visible in frame 0 | 4/6 | 11/13 | 3/5 | 18/24 | 1/5 |
| 2nd character / opposing force on screen by 3.0 s | 6/6 | 9/13 | 3/5 | 18/24 | 1/5 |
| conflict (rival, threat, authority, crash) on screen by 3.0 s | 5/6 | 8/13 | 2/5 | 15/24 | 0/5 |
| recognisable everyday topic (Y or med) | 6/6 | 13/13 | 1/5 | 20/24 | 5/5 |
| unfamiliar topic (N) | 0/6 | 0/13 | 4/5 | 4/24 | 0/5 |
| >= 1 cut in 0-5 s | 6/6 | 12/13 | 5/5 | 23/24 | 0/5 |
| >= 2 cuts in 0-5 s | 6/6 | 10/13 | 3/5 | 19/24 | 0/5 |
| first cut <= 2.3 s | 6/6 | 9/13 | 3/5 | 18/24 | 0/5 |
| camera >= 0.23 %/f in 0-1 s | 6/6 | 13/13 | 5/5 | 24/24 | 0/5 |
| camera >= 1.0 %/f in 1-3 s | 5/6 | 5/13 | 1/5 | 11/24 | 0/5 |
| >= 9 words by 3 s | 6/6 | 13/13 | 5/5 | 24/24 | 0/5 |
| >= 14 words by 5 s | 6/6 | 13/13 | 5/5 | 24/24 | 1/5 |
| max voice gap 0-5 s <= 0.55 s | 6/6 | 13/13 | 5/5 | 24/24 | 3/5 |
| first sentence ends <= 5.5 s | 6/6 | 11/13 | 5/5 | 22/24 | 1/5 |
| first sound <= 0.1 s | 6/6 | 13/13 | 5/5 | 24/24 | 5/5 |

## 5. What his 13-35M openings share that his 1-2M openings lack

Top 6 = Jar 35M, Railroads 30M, Job in Japan 18M, Storm oil 16M, Gambling window 16M, Grave bell 13M.
Bottom 5 = Knight 1.6M, Samurai 1.0M (2 days old), Tree 1.0M, Memory 0.57M, Slots 0.15M.

| measure | top 6 | bottom 5 | separates? |
|---|---|---|---|
| unfamiliar topic (medieval pardons, a samurai bomb, the manchineel tree, a fantasy memory shop) | 0/6 | 4/5 (0/19 for every video above 1.6M) | **yes, strongest** |
| a 2nd character or opposing force on screen by 3.0 s | 6/6 | 3/5 (and two of those are weak: a priest making a deal, a hooded figure at L* 25) | yes |
| a conflict on screen by 3.0 s (train coming, boss at the FIRE button, pirates, burial alive, the Emperor) | 5/6 | 2/5 | yes |
| camera in 1-3 s, median %/f | 1.61 (>= 1.0 in 5/6) | 0.78 (>= 1.0 in 1/5) | yes |
| share of pixels changing per frame, 1-3 s (median) | 0.41 | 0.28 | yes |
| frame-0 chroma (median) | 33.6 | 26.6 | some |
| hands doing the act in frame 0 | 5/6 | 2/5 | some |
| >= 2 cuts in 0-5 s / first cut <= 2.3 s | 6/6 / 6/6 | 3/5 / 3/5 | some |
| words by 3 s / 5 s (median) | 11 / 17.5 | 12 / 19 | **no** (bottom is not slower) |
| first-sentence words (median) | 13.5 | 13 | no |
| first sound | 0.05 s | 0.05 s | no |
| frame-0 L* / contrast (median) | 41 / 19.5 | 45 / 24.4 | no |
| eyes to camera in frame 0 | 4/6 | 3/5 | no |
| first sentence = an odd act stated as fact | 4/6 (2 are paradox statements) | 3/5 | no |

Reading: the voice and text craft is the same at every view level (he never opens slowly). What the big ones add on
top is **a topic you already know + someone or something pushing against the hero on screen by 3 s + a camera that
keeps travelling in 1-3 s**. The bottom set's hooks are just as well written ("A knight paid a priest to forgive a
crime he hadn't committed yet") but the picture of the first 3 s is two people standing at a booth (knight: one
continuous shot to 3.35 s), a man strolling on a beach (tree), a dark room (memory, L* 25), or a reel close-up with
no person (slots).

## 6. How our openings differ from his

Our 5 vs his 24, on the numbers that every one of his openings meets:

| his floor (24/24 unless stated) | his median | anti-theft (24.6k) | salad oil (7.4k) | typo (1.5k) | clown (1.4k) | rat tails (1.3k) |
|---|---|---|---|---|---|---|
| >= 9 words by 3 s | 11.5 | 8 | 8 | 8 | 8 | 8 |
| >= 14 words by 5 s | 19 | 13 | 11 | 14 | **8** | 11 |
| max word gap 0-5 s <= 0.54 s | 0.20 | 0.38 | 0.00 | 0.24 | **2.80** | 0.64 |
| >= 1 cut in 0-5 s (23/24) | 3 | 0 | 0 | 0 | 0 | 0 |
| camera >= 0.23 %/f in 0-1 s | 0.76 | 0.13 | 0.22 | 0.12 | 0.21 | 0.20 |
| camera in 1-3 s (23/24 >= 0.27) | 0.99 | 0.16 | 0.04 | 0.11 | 0.11 | 0.14 |
| pixels changing per frame 0-1 s | 0.25 | 0.11 | 0.37 | 0.08 | 0.28 | 0.05 |
| first sentence ends <= 5.5 s (22/24) | 4.0 s | 7.0 s (script: 1.7 s) | 6.0 s | 6.6 s | 0.8 s | 6.4 s |
| no date / year in sentence 1 (24/24) | - | ok | date on screen (1963 chip) | ok | ok | **"In 1902"** |
| 2nd character / force on screen by 3 s (18/24) | - | no (thought bubble 3.0 s) | no | no | crowd, no opposition | no |
| voice-bed level 0.5-3 s (his range -19.4 to -13.5 dBFS) | -15.7 | -15.5 | -12.8 | -14.8 | **-23.0** | -15.9 |
| caption on frame 0 (18/24) | - | 0.2 s | 0.2 s | 0.2 s | 0.2 s | 0.2 s |

All 5 of ours: one continuous framing for 5 s, a camera at a third of his slowest, and 8 words in the first 3 s
(his minimum is 9). Our pace (2.7-3.0 w/s) vs his 3.67 w/s explains most of the word gap.

### Clown (32 % swiped away) vs anti-theft (91.5 % viewed)

| | anti-theft | clown |
|---|---|---|
| frame 0 | one woman, centred, face and eyes to camera, under a giant readable sign carrying the story's number ("14 TONS STOLEN EVERY YEAR") | a wide busy plaza: the clown small at right, a suit man, about 10 walkers, pigeons; the lower ~40 % is empty brick |
| first line | "She'd never stolen anything. Not even a paperclip." (a person + a tiny stake) | "Quick test! Count the people on a phone!" (a task) |
| words by 3 s / 5 s | 8 / 13 | 8 / **8** (lowest of all 29 videos) |
| longest word gap 0-5 s | 0.38 s | **2.80 s** (2.28-5.08 s), 5x his maximum (0.54) |
| voice/bed level 0.5-3 s | -15.5 dBFS (in his range) | **-23.0 dBFS** (3.6 dB under his quietest, 7.3 dB under his median) |
| cuts / camera 0-1 s / 1-3 s | 0 / 0.13 / 0.16 | 0 / 0.21 / 0.11 |
| open question at 3 s | "why tell me she never stole?" then at 7.0 s "a sign made her want to steal?" | "how many phones?": a counting task, no story question, no person with a stake |
| odd act in frame 0 | no (the sign is the hook object) | no (by design: the clown is in plain view) |

The two share the same slow, uncut picture. What only the clown has: **2.8 s without a word, a quiet bed under it,
a crowded wide frame with no single subject, and a task instead of a person**. Anti-theft survives its slow picture
because frame 0 is one face plus one readable sign, and the voice never stops.

## 7. The measurable patterns (his 24)

1. **Voice from frame 1-3:** first sound at 0.05-0.09 s in 24/24; the first voice is the narrator in 24/24.
2. **No dead air:** longest gap between words in 0-5 s is <= 0.54 s in 24/24 (median 0.20 s).
3. **Word density:** >= 9 words by 3.0 s in 24/24 (median 11.5); >= 14 words by 5.0 s in 24/24 (median 19).
4. **The first sentence is a strange act, outcome or claim stated as fact:** 24/24 (one is a "You just..." moment:
   slots, his lowest); median 15 words (6-31); ends by 5.5 s in
   22/24 (median 4.0 s); no date in 24/24; a place name in 2/24 (both "Japan"); a number in 2/24 ("39 feet", "82 holes").
5. **Cut early, cut often:** >= 1 cut or dissolve in 0-5 s in 23/24 (median 3, range 0-5); >= 2 in 19/24; first cut
   by 2.3 s in 18/24 (6/6 of the top). Typical first cut = an insert of the hook object (dragon mouth 0.8 s, gold in the
   barrel 0.9 s, drill bit 1.15 s, the bullet 0.75 s).
6. **The camera is never still:** >= 0.23 %/f in 0-1 s in 24/24 (median 0.76); >= 0.27 %/f in 1-3 s in 23/24
   (median 0.99; top 6 median 1.61).
7. **Something moves from frame 1:** pixel change at frame 1 in 24/24; median 25 % of the frame changes per frame in
   0-1 s (ours 11 %). The first move is the character doing the act in 17/24, an object (oil stream, coin purse,
   slot reels) in 3/24, the camera alone in 4/24 (crane into the grave, ship orbit, push on the kings, pull-out
   from the cheque).
8. **Frame 0 = a face doing the odd act:** a face in 22/24, eyes to camera in 17/24 (side-glance in 5, incl. the 35M
   jar), hands on the act in 18/24, the hook's act visible in 18/24 (partly in 4 more). Captions already on frame 0
   in 18/24.
9. **A second force by 3 s:** a 2nd character or opposing force on screen by 3.0 s in 18/24 (top 6/6, bottom 3/5);
   a real conflict (threat, rival, authority, crash) by 3 s in 15/24 (top 5/6, bottom 2/5).
10. **A topic you already know:** 20/24 are built on an everyday thing (railroad, jail paint, a cheque, a tree by a
    road, a slot machine); the 4 that are not are 4 of the 5 lowest (0/19 above 1.6M).

Things that do NOT separate hits from misses in his set: frame-0 brightness (L* 22-71), contrast, sentence length,
words by 3 s, eyes-to-camera, voice onset.

## 8. Our planned opening (pointing) against these patterns

Inputs: `SCRIPT_v2.md` lines at 0-7 s, `BIBLE_NOTES.md` sections 1-2 (s01-s03), and the voice already built at
`sound/pointing/voice/_full/` (words.json + voice.wav, read-only; 17:14 build, the opening is marked swappable).
Measured word times: SIGNAL 0.12-0.65, (held beat, -67 dBFS) GREEN 0.91-1.46, soft laugh 1.65-2.30 (-38 to -42 dBFS),
"Bro's pointing at nothing!" 2.30-3.87, narrator "Give him a minute." 4.17-5.07, "He'll be pointing too." 5.20-6.50,
"And the man he's laughing at?" 6.85-8.25, "He's got over 1,000 people behind him." 8.41-10.73.

| # | pattern (his number) | planned opening (measured or from the plan) | verdict |
|---|---|---|---|
| 1 | first sound <= 0.09 s; narrator first (24/24) | first audible 0.10 s (-41 dBFS), full level 0.25 s (lead 0.12 s); first voice = the DRIVER, narrator first at 4.17 s | borderline / deviation (0/24 open on a character) |
| 2 | max word gap <= 0.54 s | true silence 0.15 s and 0.30 s; but 0.85 s between GREEN and "Bro's" filled only by a laugh ~25 dB under the words, plus the 0.25-s held beat | borderline |
| 3 | >= 9 words by 3 s, >= 14 by 5 s | **4 by 3 s, 10 by 5 s** (below his minimum and below all 5 of ours) | **fail** |
| 4 | strange act as fact, ends <= 5.5 s, no date | "SIGNAL... GREEN!" ends 1.46 s and "Bro's pointing at nothing!" ends 3.87 s; no date; the oddity is named by the doubter | pass (form differs) |
| 5 | >= 1 cut in 0-5 s, median 3, first cut <= 2.3 s | one framing change: the phone UI slides away (bible 1.4 s on the linter; ~2.4-2.8 s on the real voice), then s02 glides to ~6.8 s; 0 hard cuts | **fail** |
| 6 | camera >= 0.23 %/f 0-1 s; ~1.0 in 1-3 s | s01 0.28 %/f (phone wobble) for ~2.5 s, s02 0.78 %/f | 0-1 s pass; 1-3 s weak (~0.3-0.5 vs his 0.99, top 1.61) |
| 7 | something moves from frame 1 | glove snap on frame 0-2, boy copies 6 f late, mast shadows every 2.3 s, the world scrolling past | pass (planned) |
| 8 | frame 0: face + eyes to camera + hands on the act | glove mid-snap at the signal (hands on the act: yes); driver in right profile, eyes on the signal (no eyes to camera); the boy is a cheek and a hand; plus phone UI and partition glass; the target is a tiny dot | partial |
| 9 | 2nd character / force by 3 s | the boy at frame 0; the tourist's voice 2.30 s, on screen ~2.4-2.8 s; but the only opposition is mockery: the stake ("1,000 people behind him") arrives 8.4-10.7 s | partial |
| 10 | recognisable topic | a train driver pointing, a tourist filming on his phone | pass |

Tally: 3 pass, 1 pass-with-different-form, 4 partial or borderline, 2 fail.

### The 3 weakest points (all measurable)
1. **Word density in 0-5 s: 4 words by 3 s and 10 by 5 s** (his floor 9 / 14, median 11.5 / 19; even our clown had
   8 by 3 s). Causes: the 0.25-s held beat inside SIGNAL... GREEN!, the 0.85-s laugh gap, and the narrator not
   starting until 4.17 s. Options: start "Bro's" under the end of GREEN (~1.5 s), or let the narrator enter by ~3 s.
2. **No cut and a slow 1-3 s:** one slide-away framing change in 5 s and s02 holding ~4 s (his 23/24 cut in 0-5 s,
   median 3, the top 6 cut 2-5 times with the first by 2.3 s; his 1-3 s camera median is 0.99 %/f vs the planned 0.28
   in s01). His usual first cut is an insert of the hook object at 0.75-1.15 s: here that would be the tiny green
   signal or the glove snap close-up, then the boy copying.
3. **Frame 0 reads as layers, not a face:** the driver's eyes are off camera, the boy is only a cheek, the hook
   object is a tiny dot behind two layers (phone UI + partition glass), and there is no threat or stake on screen
   until 8-10 s (his 17/24 eyes to camera; 22/24 a face; 15/24 a conflict by 3 s). The clown's 32 % swipe opening
   was also a frame with no single clear subject.

## Strips (0, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5 s)

Cut-check sheets (every 0.2 s): [dense_01](strips/dense/dense_01.jpg), [dense_02](strips/dense/dense_02.jpg), [dense_03](strips/dense/dense_03.jpg), [dense_04](strips/dense/dense_04.jpg), [dense_05](strips/dense/dense_05.jpg), [dense_06](strips/dense/dense_06.jpg), [dense_07](strips/dense/dense_07.jpg), [dense_08](strips/dense/dense_08.jpg), [dense_09](strips/dense/dense_09.jpg), [dense_10](strips/dense/dense_10.jpg).

**The Ancient Jar That Warned an Empire** (35,000,000, his): ![the-ancient-jar-that-warned-an-empire](strips/the-ancient-jar-that-warned-an-empire.jpg)

**Why Perfect Railroads Don't Work** (30,000,000, his): ![why-perfect-railroads-don-t-work](strips/why-perfect-railroads-don-t-work.jpg)

**The Job Nobody Wants in Japan** (18,000,000, his): ![the-job-nobody-wants-in-japan](strips/the-job-nobody-wants-in-japan.jpg)

**The Window That Breaks Japan's Gambling Law** (16,000,000, his): ![the-window-that-breaks-japan-s-gambling-law](strips/the-window-that-breaks-japan-s-gambling-law.jpg)

**Why Sailors Carried Storm Oil** (16,000,000, his): ![why-sailors-carried-storm-oil](strips/why-sailors-carried-storm-oil.jpg)

**What the Grave Bell Really Meant** (13,000,000, his): ![what-the-grave-bell-really-meant](strips/what-the-grave-bell-really-meant.jpg)

**This Shape Saved Roller Coasters** (12,000,000, his): ![this-shape-saved-roller-coasters](strips/this-shape-saved-roller-coasters.jpg)

**The Pink Prison Cell Experiment** (11,000,000, his): ![the-pink-prison-cell-experiment](strips/the-pink-prison-cell-experiment.jpg)

**The Instinct That Makes You Crash** (10,000,000, his): ![the-instinct-that-makes-you-crash](strips/the-instinct-that-makes-you-crash.jpg)

**The Burglar Who Only Moved Furniture** (10,000,000, his): ![the-burglar-who-only-moved-furniture](strips/the-burglar-who-only-moved-furniture.jpg)

**Levels of Pirate Cannonballs** (9,900,000, his): ![levels-of-pirate-cannonballs](strips/levels-of-pirate-cannonballs.jpg)

**Why the Second Draw Always Wins** (9,800,000, his): ![why-the-second-draw-always-wins](strips/why-the-second-draw-always-wins.jpg)

**An Unstoppable Spear vs an Unbreakable Shield** (9,600,000, his): ![an-unstoppable-spear-vs-an-unbreakable-shield](strips/an-unstoppable-spear-vs-an-unbreakable-shield.jpg)

**Why Humans Can't Pick Random Numbers** (9,500,000, his): ![why-humans-can-t-pick-random-numbers](strips/why-humans-can-t-pick-random-numbers.jpg)

**How One Cart Stopped an Entire Army** (9,200,000, his): ![how-one-cart-stopped-an-entire-army](strips/how-one-cart-stopped-an-entire-army.jpg)

**What If Humans Invented Teleportation** (7,300,000, his): ![what-if-humans-invented-teleportation](strips/what-if-humans-invented-teleportation.jpg)

**How Mine Salting Worked** (6,700,000, his): ![how-mine-salting-worked](strips/how-mine-salting-worked.jpg)

**Why Drivers Started Filming The Road** (4,700,000, his): ![why-drivers-started-filming-the-road](strips/why-drivers-started-filming-the-road.jpg)

**Would You Upload Your Brain** (3,900,000, his): ![would-you-upload-your-brain](strips/would-you-upload-your-brain.jpg)

**This Knight Found the Ultimate Loophole** (1,600,000, his): ![this-knight-found-the-ultimate-loophole](strips/this-knight-found-the-ultimate-loophole.jpg)

**Why Samurai Feared The Flying Thunder** (1,000,000, his): ![why-samurai-feared-the-flying-thunder](strips/why-samurai-feared-the-flying-thunder.jpg)

**This Tree Hates You** (1,000,000, his): ![this-tree-hates-you](strips/this-tree-hates-you.jpg)

**Every Memory Has a Price** (572,000, his): ![every-memory-has-a-price](strips/every-memory-has-a-price.jpg)

**The Science Behind Slot Machines** (147,000, his): ![the-science-behind-slot-machines](strips/the-science-behind-slot-machines.jpg)

**anti-theft sign** (24,600, ours): ![ours-antitheft](strips/ours-antitheft.jpg)

**salad oil** (7,400, ours): ![ours-saladoil](strips/ours-saladoil.jpg)

**typo** (1,500, ours): ![ours-typo](strips/ours-typo.jpg)

**clown** (1,400, ours): ![ours-clown](strips/ours-clown.jpg)

**Hanoi rat tails (preview2 540x960 proxy; final file not on this PC)** (1,300, ours): ![ours-hanoirats-preview2](strips/ours-hanoirats-preview2.jpg)

