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
