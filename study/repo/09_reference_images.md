# 09 — Reference images: 38 frames + 20 contact sheets

Study notes for the repo `mromidev/claude-animated-shorts` (read-only clone at
`<ROOT>\repo`). Slice: every image in `references/frames/` and
`references/sheets/`, plus the text files needed to understand them.

## Files read

| File | Count / lines | Notes |
|---|---|---|
| `references/frames/short01_0060.jpg` … `short20_0180.jpg` | **38 images**, each 540x960 JPEG (ffmpeg "Lavc62.28.101") | two per short, except **short15 and short17 have only `_0060`** (no `_0180`) |
| `references/sheets/short01_sheet.jpg` … `short20_sheet.jpg` | **20 images**, each 1800x1920 JPEG | a 10 x 6 grid of 180x320 thumbnails = 60 thumbnails per short (1,200 in all) |
| `references/reports/CONTEXT.md` | 55 lines | the brief given to the measuring agents; says what the 20 reference shorts are |
| `references/STYLE_BIBLE.md` | 44 lines | the first, rough study of the 20 shorts (format, script formula, picture, camera) |
| `README.md` | 34 lines (33 by `wc -l`) | lines 18-19 describe frames/ and sheets/ |
| `references/reports/motion.md`, `outlines.md`, `depth.md` | searched only (grep for `vNN`) | used to confirm that their "v01..v20" numbering is the same as `shortNN` |

I opened and looked at all 58 images with the Read tool. I also ran small read-only Python/PIL scripts (in my
scratchpad, not in the repo) to: match each frame to its thumbnail on the sheet, take palettes (median-cut, 6 colours
per frame, 8 per sheet), measure brightness ("luma" = how bright a pixel looks, 0 = black, 1 = white) and
saturation ("sat" = how strong the colour is, 0 = grey, 1 = pure colour), find the caption box, and compare corners
with the centre (vignette). The caption band (64-76 % of height) was masked out of the colour statistics.

---

## 1. What these images are (format facts)

### 1.1 Frames (`references/frames/`)
- 540x960 = exactly half of the 1080x1920 output size. CONTEXT.md:13 says the source videos were 720x1280, 30 fps,
  so these are downscaled from 720p. README.md:18 calls them "full-size" (they are not; see Bugs).
- Name pattern: `shortNN_0060.jpg` and `shortNN_0180.jpg`. The numbers are **not documented**.
  I matched every frame against the 60 thumbnails of its own sheet (lowest pixel difference, caption band masked):

| short | `_0060` best tile (0-based) | `_0180` best tile | implied video length |
|---|---|---|---|
| 01 | 11 | 35 | ~62 s |
| 02 | (no clean match: frame is mid-dissolve) | 35 | ~62 s |
| 03 | 11 | 35 | ~62 s |
| 04 | 13 | 41 | ~53 s |
| 05 | 9 | (no clean match; visually tile 28 "the hospital,") | ~78-80 s |
| 06 | 12 | 36 | ~60 s |
| 07 | 12 | 38 | ~57 s |
| 08 | 13 | 40 | ~54 s |
| 09 | 12 | 38 | ~57 s |
| 10 | 13 | 39 | ~55 s |
| 11 | 19 (2nd best 11) | 35 | ~62 s |
| 12 | 12 | 36 | ~60 s |
| 13 | 18 | 57 | ~38 s |
| 14 | 29 (probably a look-alike tile; 17 expected) | 51 | ~42 s |
| 15 | 22 | — (missing) | ~33 s |
| 16 | 16 | 51 | ~42 s |
| 17 | 24 | — (missing) | ~30 s |
| 18 | 18 | 55 | ~39 s |
| 19 | 16 | 51 | ~42 s |
| 20 | 19 | 59 | ~37 s |

  The `_0180` tile is almost always ~3x the `_0060` tile, so both names are frame numbers on the same clock.
  Everything fits **`_0060` = 12.0 s and `_0180` = 36.0 s into the video** (frame index at 5 fps).
  Length estimate: `D ≈ 36 s x 60 / tile_0180` (or `12 x 60 / tile_0060`). The results (30-80 s) agree with
  STYLE_BIBLE.md:6 ("31-78 s"). This also explains why short15 and short17 have no `_0180`: those videos are
  shorter than 36 s (estimated ~33 s and ~30 s).
- Interesting trend: CONTEXT.md:13 says "01 = newest". The newest ten (01-12) run ~53-80 s; the older ones (13-20)
  run ~30-45 s. The channel's shorts got longer over time.

### 1.2 Contact sheets (`references/sheets/`)
- 1800x1920 = 10 columns x 6 rows of 180x320 thumbnails. Reading order is left-to-right, top-to-bottom.
- The 60 thumbnails are spread **evenly over the whole video** (about one every D/60 s: ~0.5 s for a 30 s short,
  ~1.0 s for a 60 s short, ~1.3 s for the 80 s one). Proof: the burned-in caption words run through the whole
  story from the first tile to the last ("cooking … pirates" in short01), and the frame-match table above.
- This is **not** what CONTEXT.md:14 and STYLE_BIBLE.md:3 describe ("each = 2 s = 60 frames", in
  `references/measure/…`). Those private 2-second sheets were not shipped. See Bugs.
- Every thumbnail has a caption word in the same place (about 68-72 % down the tile), so the sheets also show the
  script, roughly one word per second.

### 1.3 Shot-change measure used below
For each sheet I took the RMS colour difference between each pair of neighbouring thumbnails (59 pairs, caption rows
removed). "Big" (> 55 of 255) means a new set-up, a cut, a dissolve or a large camera move. "Small" (≤ 30) means the
same composition held. Results are in each short's section.

---

## 2. shortNN → title map

The user has 16 downloaded titles. 13 of them are among the 20 reference shorts; 7 reference shorts are not in the
user's list; 3 of the user's titles are not among the 20.

| short | Likely title | Confidence | Evidence on screen |
|---|---|---|---|
| 01 | **Why Sailors Carried Storm Oil** | high | "STORM OIL" can, cook pouring oil over the side, words "sailors / oil / They called / oil. / a bowl / The broth / the oily" |
| 02 | (not in list) — horse-race "Milk Run 100-1" betting trick with a telescope signal | — | "MILK RUN 100-1", "BETS OPEN", "HILLSIDE DOWNS", buddy with telescope on a hill |
| 03 | (not in list) — a town built in rings around a guarded button under glass | — | "a button / of town / circles. / guards / so tall / At night, / a glow / 47 tiny / scratches" |
| 04 | **Why the Second Draw Always Wins** | high | Western duel, "Never / first.", frame text "After you.", reaction analogy with a falling phone |
| 05 | **Every Memory Has a Price** | high | shop sign "MEMORIES bought & sold / CASH ON THE SPOT · ALL GRADES", ledger "YEAR 2018 … SOLD", "WE BUY SUMMERS" |
| 06 | (not in list) — scratch-card "Vault Buster" number-pattern trick | — | "Vault BUSTER $2 WIN UP TO $500,000", glowing number grids, words "numbers / on the front, / loners" |
| 07 | **What the Grave Bell Really Meant** | high | bell on a post with a rope into the coffin, "S. HOLT 1842-1894", Morse note, "every debt" |
| 08 | (not in list) — lottery clerk "Kyle" keeps a winning ticket; undercover sting | — | "REEL BIG CASH", name tag "KYLE", "PRIZE CLAIMS", "OUR WINNERS", "undercover / as bait" |
| 09 | **The Job Nobody Wants in Japan** | high | "CAREER DEVELOPMENT ROOM", "FIRE IMPOSSIBLE" button, 誠 scroll, word "Japanese" |
| 10 | **The Burglar Who Only Moved Furniture** | high | masked burglar moving the couch one inch a night, "DON'T MOVE!" note, "FOR SALE / SOLD", "the buyer" |
| 11 | **The Ancient Jar That Warned an Empire** | high | bronze jar with 8 dragons and frogs, emperor, "the jar / pendulum / the Empire" |
| 12 | **Levels of Pirate Cannonballs** | high | "SHOT", "LANGRAGE", "GARBAGE", "HOT SHOT" furnace, "CARCASS KEEP FROM FLAME", "1000 lbs" |
| 13 | **This Knight Found the Ultimate Loophole** | high | "Pardons" stall, pardon "absolves the bearer of the sin of One Crime to be committed Next Week" |
| 14 | **An Unstoppable Spear vs an Unbreakable Shield** | high | "YEARS AT WAR 099/100", blueprint "PIERCE ANYTHING / PIERCED BY: NOTHING", "IMPOSSIBLE" stamp |
| 15 | (not in list) — how painkillers "find" a headache | — | "ACID SPA 98.6 °F", "HEADACHE ↑ 20 MIN", "BRAIN NOT INCLUDED", body-as-a-house |
| 16 | **The Window That Breaks Japan's Gambling Law** | high | "PRIZE HALL PACHINKO · SLOTS", "PRIZE COUNTER", alley exchange window, "Gambling / illegal / Yet" |
| 17 | **The Science Behind Slot Machines** | high | "LUCKY 7s", "REEL 3: EVERY STOP", "ONE CLICK SHORT" |
| 18 | (not in list) — does time slow down when you are scared (free-fall experiment) | — | "FREE FALL" tower, "CRASH SURVIVORS TUESDAYS 7PM", "CHRONO-2", "HYPOTHESIS: IF TIME SLOWS" |
| 19 | **Why Humans Can't Pick Random Numbers** | high | fake checks "87,439", "random, / avoided / doubles / randomness / streaky. / the opposite." |
| 20 | (not in list) — Edison's steel-ball nap / hypnagogia | — | "fall asleep / holding / steel balls, / wake up / a genius,", "Thomas", "HYPNAGOGIA", "MAGNET CAR" |

User titles **not** found in the 20 references: *This Tree Hates You*, *What If Humans Invented Teleportation*,
*Would You Upload Your Brain* (no tree, teleport or brain-upload story on any sheet; short03 is a thought-experiment
town story but nothing on it suggests brain upload — low confidence at most).

The `vNN` numbers in the reports are the same as `shortNN`. Checks: motion.md:72/126 "v14 spear" = short14;
motion.md:143 "v04 cowboy", "v13 carriers" (two men carry the chest, short13 tiles 42-43), "v03 kid", "v03 crowd";
motion.md:146 "v08 cashier" = Kyle; "v10 officer", "v10 bed"; motion.md:144 "v16 turn purple/orange";
motion.md:148 "v20 sleeper"; outlines.md:40/47 "v15 arches" = short15 hallway; outlines.md:45 "v12 rock arch",
"v07 snow mound".

---

## 3. Per-short visual notes

Palette hexes are measured (median-cut). "Frame" = the full-size frames, "sheet" = all 60 thumbnails together.
"Luma by row" = average brightness of the 10 thumbnails in each sheet row, row 1 → row 6 (rough time arc).

### short01 — Why Sailors Carried Storm Oil (~62 s)
- **Setting:** an 18th-century sailing ship at sea. Honey-coloured plank deck, red-and-white striped sails, brass
  ship's wheel; a pirate ship with orange sails and a cartoon dog-skull Jolly Roger (pink gums, big teeth, one green
  eye); sea stacks with little houses; night storm with huge waves; a warm galley (wood cabinets, porthole, lantern,
  copper pot, "STORM OIL" can); a top-down macro of a golden oily bowl; at the end a giant curling wave and an
  explosion with smoke.
- **Characters:** ship's cook (tall white toque, white body = apron, half-closed smug eyes); navy captain (navy
  bicorne with a red-white-blue cockade, navy coat, gold epaulettes, big brown moustache); pirates (blue bandana with
  white polka dots, orange shirt, brown belt; red-coated pirate captain with feathered hat; green parrot on a head);
  a crewman in a yellow sou'wester.
- **Palette:** frame 0060 (dusk deck, mid-dissolve) `#3c4270 #2c3b73 #917b7f #69414f #e0e9f0`; frame 0180 (night)
  `#0a0430` 30 %, `#5b67dd`, `#3042ba`, `#221d6e`, sat 0.75. Sheet `#2f57c8` 23 %, `#f8d79a` 15 %, `#632c3f`,
  `#100c43`, `#1b2b91`.
- **Light / time:** day → stormy dusk → night storm (blue, rain streaks, god-ray light shafts from the clouds) →
  warm galley (the bowl macro is the brightest thumbnail of all 20 sheets, luma 0.91) → night storm again.
  Luma by row: 0.33-0.56 | 0.36-0.57 | 0.24-0.45 | 0.17-0.32 | 0.30-0.91 | 0.23-0.38.
- **Camera:** high angles down onto the deck; dutch tilt (frame 0180: mast leaning ~10-15°); very wide shots of
  ships among waves; follow-the-object move (the yellow oil stream poured over the side leads to the sea);
  frame 0060 is caught in a crossfade dissolve (deck wide + cook close-up overlaid).
- **Frame 0180:** a pirate in the polka-dot bandana swings on a rope ("And up"), a tiny second pirate far away,
  low angle, night blue, rain, anchor in the foreground.
- **Depth of field:** mild in wides; the sky and sea are painted and soft.
- **Sheet pacing:** 43 big changes, 8 mid, 8 small; about 10 locations.

### short02 — (not in list) the "Milk Run" horse-race bet (~62 s)
- **Setting:** an early-1900s Western-style town with a dirt racetrack. Betting parlour with a chalk odds board
  ("WINNER", "MILK RUN 100-1", "RACE 5"), "BETS OPEN" sign, ticket stubs on the floor; green rolling hills with
  telegraph poles; grandstand "HILLSIDE DOWNS" full of tiny spectators, bunting; a dairy wagon ("MILK RUN DAIRY");
  a telegraph room with numbered boards; a back room with a deep red tufted (chesterfield) wall, a horse picture,
  "CREDIT – NO CREDIT" sign, green-felt counter piled with cash.
- **Characters:** the hero (mint/teal-green body, red polka-dot bow tie, small brown boater with a band); his buddy
  on the hill (straw hat, blue overalls, telescope on an easel, little chalkboard); a bookie (brown plaid suit,
  black bowler, cigar); the cashier (green visor, lavender shirt, pens in pocket, sweat drop); jockeys; a white
  dappled milk horse with red ribbons; a pink piggy bank.
- **Palette:** frame 0060 (telescope view) `#281e34 #cadac0 #88d58c #8f6c54`; frame 0180 (cashier room)
  `#22161b #380d19 #a3876b #d9dac1 #5b1527` (deep red wall). Sheet `#ddd1c9 #a17d6a #563b44 #94483a #87b9c2`.
- **Light / time:** sunny day (luma 0.42-0.70) → dim warm interiors (0.22-0.28) → magenta-orange sunset over the
  hill at the end ("hill."). Last row is blue night.
- **Camera:** POV through the telescope (a brass ring as a circular mask; frame 0060 has big dark out-of-focus
  shapes in the foreground framing it); a circular iris carries us from the telescope to the race (tile 14 is black
  with a round race image); the horse runs at a low camera; medium two-shots at the counter with slow push-ins.
- **Depth of field:** strong in 0060 (the street behind the telescope is a blur) and in the counter two-shots.
- **Sheet pacing:** 47 big, 12 mid, **0 holds**; about 10 locations.

### short03 — (not in list) the town around the button (~62 s)
- **Setting:** a suburb of small houses laid out in **concentric rings** (bullseye plan) inside an enormous
  cylindrical wall (blue panels with rivets). In the middle: a stone pedestal with a big red button under a glass
  dome, guarded. Night: lit windows, lamp posts, and a ring of orange-violet glow in the sky (like an eclipse).
  A wooden bedroom; bronze statues of founders; a stopwatch counter "0047" → "0048"; final scenes on a bright green
  lawn with huge crowds.
- **Characters:** a boy (black bowl hair, round glasses, red sweater); guards (navy cap with gold badge, moustache);
  friends (orange beanie, bike helmet); a woman with sunglasses; crowds of tiny townsfolk; the boy as an adult in a
  red striped shirt.
- **Palette:** frame 0060 (wall) `#7095d8 #78a1e5 #576ca5 #c9c6bf`; frame 0180 (night plaza)
  `#3e2c4d #244091 #1b2a6b #ae95a6`. Sheet `#2d417c #e1cda5 #a9968c #629590 #81b977` (lawn green).
- **Light / time:** overcast day (0.44-0.64) → **night blue** (row 4 all ~0.28) → orange dawn bloom (0.79) →
  bright green day (0.51-0.69).
- **Camera:** straight-down overhead of the ring town (tiles 4-7); frame 0060 looks **up** a very long ladder on the
  wall with the beanie friend huge in the bottom-left corner (forced perspective); macro of the button and the
  counter; dutch tilts; wide crowd shots.
- **Frame 0180:** medium shot of the boy (sweat drop) at the pedestal at night, glass dome, warm lamp post behind.
- **Sheet pacing:** 37 big, 21 mid, 1 small.

### short04 — Why the Second Draw Always Wins (~53 s)
- **Setting:** Wild-West main street at noon: deep blue sky (`#197aef`), sand street, clapboard fronts
  ("FEED & LIVERY", "LAND OFFICE", "PHOTOGRAPHS", "BEER 5¢", barber pole), telegraph wires, cacti, mesas. A sunset
  shoot-out street with very long shadows; a saloon poker table (red wallpaper, chips, cards, plates of beans, and an
  out-of-period **smartphone** with lock screen "6:22" — the "imagine you…" analogy shown inside the old world); a
  telegraph/sheriff office with porthole windows and "REWARD" posters; a blue night street ("FIRST BANK").
- **Characters:** Eddie (black hat, red shirt, revolver, gritted teeth); the hero (cream cowboy hat, thick black
  moustache, straw in mouth, teal shirt, brown leather vest, holster, belt buckle); townsfolk; poker players
  (purple shirt + brown hat, yellow); a clerk in a green visor.
- **Palette:** frame 0060 `#197aef` 26 % (sky), `#e1ceba` 24 %, `#4e3443`; frame 0180 (saloon)
  `#240f1e #632b2f #391425 #824746 #c79e99`, sat 0.61. Sheet `#b38869 #21122c #e8c9a5 #587db3`.
- **Light / time:** noon (0.50-0.64) → sunset (0.39-0.56) → dark warm interior (0.21-0.30) with one white flash
  (0.67) → blue night (0.17-0.23).
- **Camera:** very low hero angles (frame 0060: camera at belt height looking up, figure centred, legs run off the
  bottom); bullet follow-cam with a motion trail; a yellow "slow-motion aura" glow around the drawing hand; dust
  impacts and falls; an extreme close-up of an eye (black pupil fills the frame) used as a match cut; framing through
  round windows; high angle over the poker table.
- **Depth of field:** strong. 0060: the street behind is soft; 0180: saloon windows become bokeh.
- **Sheet pacing:** 42 big, 14 mid, 3 small.

### short05 — Every Memory Has a Price (~78-80 s, the longest)
- **Setting:** a rainy city at night — brick tenements with fire escapes, a deli with a red scalloped awning and
  glowing shelves of colourful goods, chain-link fence, wet cracked pavement, rain streaks. The memory shop
  ("MEMORIES bought & sold / CASH ON THE SPOT · ALL GRADES"; dark wood drawers; a brass "HAPPINESS" gauge; a
  salon-hood-dryer memory machine on a checkerboard floor). A bright Bahamas pool with palms and a pink flamingo
  float; a lake dock at a golden summer sunset; a hospital (teal tiles, "OPERATING" sign); a bedroom with polaroids
  ("the frog!"); a ledger "YEAR 2025 … 2016 SOLD, YEAR 2018 ★"; a sign "WE BUY SUMMERS".
- **Characters:** the hero (ginger-orange swoop quiff, mustard jacket, frog patch); the hooded buyer (black hood,
  white glowing eyes, wide toothy grin); the little brother in hospital (ginger hair, light gown); grandparents on a
  bench; a green frog plush.
- **Palette:** frame 0060 (deli at night) `#544b88 #282d70 #17205b #856e8d #e7d1ae`; frame 0180 (bedroom)
  `#271d3c #ae97a7 #635987 #8e7fa1 #ceb0a5`. Sheet `#42568a #0a0a20 #e5ccad #856873 #1f2257`.
- **Light / time:** very dark shop (0.12-0.15) → rainy blue street → bright pool day (0.63-0.81) → night →
  golden dock (0.49-0.52) → dim interiors → a warm white flash (0.70) → blue night.
- **Camera:** high-angle street wides (frame 0060: storefront at left, kid fallen off a bike, oranges rolling);
  medium two-shots; macro inserts (gauge, ledger, polaroid); several thumbnails are mid-dissolve; frame 0180 uses a
  huge cropped face on the right edge as foreground with the polaroid in the middle and the wall out of focus.
- **Sheet pacing:** 41 big, 16 mid, 2 small; about 9 locations.

### short06 — (not in list) the "Vault Buster" scratch cards (~60 s)
- **Setting:** a home desk at night under a warm lamp; a glass-front office lobby ("1200"); a convenience store
  (lottery terminal, cigarette shelves); full-frame scratch-card graphics ("$2 Vault BUSTER WIN UP TO $500,000,
  MATCH 3 AMOUNTS, WIN THAT AMOUNT!", "$5 FIVE", "$5.00 WINNER"); dark grids of dot-matrix numbers on tickets with
  some numbers glowing yellow; a yellow ticket-printing factory ("WINNERS 400,000"); an apartment carpeted with
  tickets; a state road map with pins; a lottery office (navy and white, star seal, security guard with a headset);
  "GAME CLOSED".
- **Characters:** the hero (brown bowl hair, mustard-yellow body, lanyard ID, blue tie); a security man with a
  headset; a store clerk in orange.
- **Palette:** frame 0060 `#240d17 #180b16 #f1c166 #b97738 #6e0712` (gold title, red); frame 0180
  `#211b37 #343248 #161730 #0e0e21`. Sheet `#f1debc #b17d5a #181c3c #6b6d7c #110a19`.
- **Light / time:** warm desk at night → white office day → dark navy with glowing numbers → bright office day.
- **Camera:** flat, frame-filling macro of the ticket (frame 0060, with 4-point sparkle stars and silver scratch
  flakes); slow moves over the number grids (frame 0180: three stacked tickets, highlighted numbers); map with a
  pointer; giant phone keypad close-up; wide office.
- **Sheet pacing:** 45 big, 12 mid, 2 small.

### short07 — What the Grave Bell Really Meant (~57 s)
- **Setting:** an 1890s snowy village. A bell on a wooden post with a red-and-white striped rope down into the grave;
  a **cut-away side view of the ground** (grass, orange soil layers, coffins with strings); snowfall at night; clapboard
  houses in teal, purple and mint; a bedroom with a patchwork quilt and candles; a porch with lanterns; the widow's
  parlour (floral wallpaper, rocking chair, rainbow braided rug, coffin on trestles); a Morse-code note; a summer
  garden with cabbages and a queue of townsfolk; a pink sunrise over snow at the end.
- **Characters:** S. Holt (ginger hair and moustache, black suit; stone "S. HOLT 1842-1894"); his wife (dark hair in
  a bun, maroon dress); a sleeper in a red-white striped nightcap; townsfolk with shovels and lanterns; a doctor in
  glasses; a debt collector in a green cap.
- **Palette:** frame 0060 (graveyard at night) `#455cdb #0d1a65 #0f2a9f #aebfef #7986c3`, sat 0.70; frame 0180
  (parlour) `#6c503a #90a1a4 #37303c #63372f`. Sheet `#5564b7 #e5bbb4 #6a3849 #986e75 #1b0c2c`.
- **Light / time:** autumn dusk (orange, 0.36-0.42) → night snow (blue) → warm porch → dark parlour (0.17-0.34) →
  day garden (0.55-0.61) → pink sunrise (0.60-0.69).
- **Camera:** low wide graveyard frames (frame 0060: bell post big and close on the left, house in the middle,
  graves, falling snow, dark corners — corner/centre brightness 0.42); the dollhouse cut-away; a close-up of the widow
  with a bright light stripe across her eyes; macro on the Morse note.
- **Sheet pacing:** 42 big, 14 mid, 3 small.

### short08 — (not in list) clerk Kyle and the winning ticket (~54 s)
- **Setting:** a rural bait shop ("LIVE BAIT · LOTTO"; green walls, wood wainscot, ticket display, register); a dream
  sequence — a boat "FINDERS KEEPERS" under a huge pink full moon with a mansion on an island rock, fireworks; a night
  bedroom; a red pickup drive; the State Lottery "PRIZE CLAIMS" office (teal); the "OUR WINNERS" waiting room
  (yellow wall, winners' photos, red and teal chairs, aquarium, star rug); top-down desk shots; "BAIT · GAS" outside.
- **Characters:** Kyle (brown hair with a curl, red polo with a fish logo, white tag "KYLE"); the fisherman customer
  (green bucket hat with lures, yellow jacket); the prize clerk (big afro, glasses, gold chain); police.
- **Palette:** frame 0060 (iris close-up) `#0e0e18` 32 %, `#181d2a`, face `#f2ebe5`; frame 0180 (winners room)
  `#d4d9d8 #dfc62b #f5f3ed #616964`, luma 0.74 (very high-key). Sheet `#e3ddc7 #324b82 #d4b47b #211832 #85b6b3`.
- **Light / time:** warm interior day → night iris → purple-pink moonlight fantasy → pink dawn haze → flat bright
  office daylight (0.64-0.74) → cool blue → warm.
- **Camera:** low angle across the counter; over-the-shoulder past a huge silhouette of the customer's head; frame
  0060 is a **spotlight iris**: a circle of light around Kyle's face with radial speed lines and almost black
  surroundings (corner/centre 0.13, the strongest vignette in the set); top-down on desks and posters.
- **Sheet pacing:** 38 big, 21 mid, 0 small.

### short09 — The Job Nobody Wants in Japan (~57 s)
- **Setting:** a Japanese company. The boss's office (wood panels, calligraphy scroll 誠, a red "FIRE — IMPOSSIBLE"
  button); the "CAREER DEVELOPMENT ROOM" — pale green tiled walls, one desk, a wall clock, a hard yellow sunbeam patch
  on the wall, blue-grey floor tiles; an open-plan office (white ceiling panels, royal-blue carpet, cubicles, cat
  figurine); a phone screen "Inbox (0)"; the office tower at night with a city skyline and a pink-violet dusk.
- **Characters:** the slacker (brown hair, teal hoodie, feet on the desk, phone); a salaryman (black side-part hair,
  blue suit, tie, ID lanyard); the boss (grey hair, navy suit, red tie, big toothy grin).
- **Palette:** frame 0060 `#7cbd84` 33 % (green tiles), `#7b9ca3`, `#d5d479` (sun patch), `#44526f`; frame 0180 (tower
  at night) `#091967 #1a2791 #3140a5 #4697e4`, **sat 0.78 — the most saturated frame of all 38**. Sheet
  `#e9e8e0 #3f61b0 #7a9c93 #3f2f54 #85b896`.
- **Light / time:** bright day with a strong directional sunbeam → night tower (blue, warm lit window) → evening blue
  interior with a warm wall lamp.
- **Camera:** high-angle wides; eye-level close-ups; a phone insert; an extreme close-up of the boss's grin; a slow
  push to the door sign. Frame 0060: 3/4 high angle into the room corner, two characters leaning in.
- **Sheet pacing:** 46 big, 12 mid, 1 small.

### short10 — The Burglar Who Only Moved Furniture (~55 s)
- **Setting:** a suburban house. Night exterior (blue clapboard, AC unit, pumpkins); living room (red couch, lamp,
  framed pictures, yellow curtains); kitchen (yellow walls, teal cabinets, teal-and-white checkered floor, red wall
  phone, "DON'T MOVE!" fridge note, "OCTOBER" calendar); bedroom seen from straight above; a night watch with a bat and
  a headlamp; a door peephole view of a police car; day exterior with "FOR SALE" → "SOLD".
- **Characters:** the burglar (black balaclava/beanie, black clothes; later the "buyer" with a beard and beanie);
  dad (glasses, teal-green shirt; headlamp cap); mom (pink); a police officer (blue cap with a yellow star); an orange
  tabby cat.
- **Palette:** frame 0060 (kitchen) `#fbe071` 29 % (yellow wall), `#326f79` (teal floor), `#dbe3c5`, `#fdf1c5`,
  luma 0.74; frame 0180 (night couch) `#555fb0 #141f5d #392456 #662744`. Sheet `#f3e9d3 #3c61a0 #c6bbba #51274c`.
- **Light / time:** night blue (0.26-0.39) → bright day interiors (0.57-0.75) → night (0.33-0.40) → day exterior →
  evening.
- **Camera:** top-down bed shot; fisheye peephole circle; floor-level shots of slippers; high-angle wide of the
  living room with the couch's tape marks; close-up of dad with a lens-flare headlamp (frame 0180, low angle, moon in
  the window). Frame 0060 is an eye-level room-corner wide with almost no blur (deep focus).
- **Sheet pacing:** **51 big** changes (the most varied sheet), 7 mid, 1 small.

### short11 — The Ancient Jar That Warned an Empire (~62 s)
- **Setting:** an imperial throne room (red velvet throne, gold, stained-glass rose window, red and navy carpets);
  the bronze earthquake jar with 8 gold dragons and bronze frogs — these are **realistic sculpted 3D models with
  metal/stone materials and no ink lines**; a palace courtyard with thousands of soldiers and a red carpet; a castle
  gate in European style (crenellated walls, red banners); a sunset hill; a night prison seen through an arched
  barred window; castle walls under a full moon; dust and smoke of a far-away collapse; the jar's insides (pendulum,
  levers, seen from above); a final earth cross-section with a glowing crack under the city.
- **Characters:** the inventor (black court hat with jade pins, blue robe); the emperor (black crown hat, red-and-gold
  robe with an "X" pattern); guards (chainmail, red, helmets); courtiers laughing.
- **Palette:** frame 0060 (jar close-up) `#3d4050 #40414f #222133 #978267`, sat 0.33; frame 0180 (barred window)
  `#292b4d #7c6e93 #5d4861 #6a5b7c` (moonlit lavender). Sheet `#2d2033 #534150 #bf9883 #a37765 #6d6d80`.
- **Light / time:** candle-warm interior (0.30-0.52) → bright day courtyard (0.62-0.65) → sunset → moonlit night blue
  (0.31-0.38) → golden light (0.47-0.74).
- **Camera:** big crane moves over the crowd; macro of dragon heads (frame 0060: low angle, a 3D frog with open mouth
  in front of the jar); a ball dropping into a frog's mouth; framing through bars (0180, torches either side, moon);
  straight down into the mechanism; cut-away earth layers.
- **Sheet pacing:** 32 big, **26 mid**, 1 small — more continuous camera moves, fewer jumps.
- Note: the story is Chinese but the castle is European. The channel takes liberties with period detail.

### short12 — Levels of Pirate Cannonballs (~60 s)
- **Setting:** an 1700s pirate deck (honey planks, barrels "LANGRAGE" and "GARBAGE", crate "SHOT", grey cannons on
  red carriages); tall rock arches and sea stacks with greenery and waterfalls; turquoise sea; a US Navy frigate; an
  island fort with a brick "HOT SHOT" furnace and glowing molten balls; a purple sunset with a ship burning; an iron
  hull; a US fort with a wooden tripod hoist and a 1000-lb ball; a mushroom-cloud blast.
- **Characters:** pirates (red bandana with white dots, red-and-white striped shirts); the pirate captain (black
  tricorn with a skull, maroon coat, yellow sash); navy gunners (blue uniform, white cap); a "POWDER" sack with a face.
- **Palette:** frame 0060 (deck) `#bf8e5f` 28 %, `#78402a`, `#84b9df` (sky); frame 0180 (crate at sunset)
  `#654647 #3c1d32 #782b35 #a35933`. Sheet `#c4906d #9c6350 #e3d1b8 #823d38 #87bed3`.
- **Light / time:** bright day (0.51-0.73) → furnace glow → purple-orange sunset (row 4, 0.25-0.36) → day; one
  white smoke flash (0.92).
- **Camera:** the "levels" format re-uses the same deck composition for each new ammo type; POV from behind the
  cannon; looking out from inside the barrel (a circle); close-up of the powder sack; wide ship and fort shots.
  Frame 0180: CARCASS crate (straw, "KEEP FROM FLAME") with huge blurred foreground arms/legs.
- **Sheet pacing:** 39 big, 19 mid, 1 small.

### short13 — This Knight Found the Ultimate Loophole (~38 s)
- **Setting:** a medieval market town (half-timbered houses with red tile and thatch roofs, a church steeple, green
  hills with round trees); the "Pardons" stall (red-white scalloped awning, crossed-keys banner, iron-bound chest of
  coins, "Wait from here 3 HOURS" sign); a "Price of Sins" menu board (Stealing, Lying… with prices); a donkey cart on a
  bridge; a snowy village at night; a forest of tall trunks with sun shafts; a sunset field with castle silhouettes and
  a windmill.
- **Characters:** the knight (full silver plate armour, visor up, smug); the priest (brown tonsure, red robe with gold
  stripes); a queue of peasants (bucket hats, hoods, bonnets); two chest carriers; small red imps in fire.
- **Palette:** frame 0060 (stall) `#56463f #ad6d58 #8ccfc7 #974841 #e9e8dc`, sky top `#7eb6e6`; frame 0180 (sunset
  dissolve) `#e2b690 #926867 #a98274 #d49f83`. Sheet `#eee0c4 #9c6b4f #c29d79 #b4cac8 #943f35`.
- **Light / time:** bright day (0.40-0.61) → a brief snowy night → day → forest with light shafts (0.55-0.72) →
  sunset (0.56-0.63). Never dark (min 0.40).
- **Camera:** mostly eye-level medium shots at the stall (the same set-up re-used with small changes); macro on the
  pardon paper (fancy blackletter "Pardon", "Fee paid ~~10 coins~~ 40 coins!", red "Forgiven" stamp); an aerial over
  the village; forest wides; a close-up of the knight. Frame 0180 is a dissolve between the paper and the sunset field.
- **Sheet pacing:** 38 big, 16 mid, **5 small**.

### short14 — An Unstoppable Spear vs an Unbreakable Shield (~42 s)
- **Setting:** a royal courtyard with banners (red with an arrow sigil vs teal with a circle sigil), an anvil, a floor
  disc half red / half teal; a flip-counter sign "YEARS AT WAR 099 → 100"; a river valley with a stone bridge;
  patchwork fields with two armies (red vs teal) in arrow formations; a poppy and cornflower meadow with a dirt path
  and small marker stones; a tent with candles and a map "THE BORDER"; the blacksmith's shop at night (moon, mist);
  the forge ("SPEARS | SHIELDS"); a blueprint table ("PIERCE ANYTHING", "PIERCED BY: NOTHING", red "IMPOSSIBLE"
  stamp); at the end "DAYS OF PEACE 001".
- **Characters:** the red king (gold crown, red robe, spear); the teal king (silver crown, teal robe, round shield);
  the blacksmith (moustache, headband, apron); hooded messengers in red and teal; thousands of tiny soldiers.
- **Palette:** frame 0060 (field) `#9ea351 #8b7445 #dfe0d7 #9ab454 #a2bf58`; frame 0180 (forge)
  `#401e1e #ac5d2f #dc8549 #843e21 #f5ca7a`, sat 0.66. Sheet `#916c59 #8eb5b3 #ddded3 #354167 #c3a27f`.
- **Light / time:** bright day (0.54-0.71) → dusk/night (0.16-0.41) → warm forge → day (0.57-0.67).
- **Camera:** a symmetrical **one-point perspective** down the path with the armies either side (re-used and held);
  high aerials over the armies (frame 0060, with sparkles, strong haze to the horizon, castles far away); close-ups
  of the kings; the blueprint from above.
- **Sheet pacing:** 22 big, 25 mid, **12 small** — many more holds than the newer shorts.

### short15 — (not in list) how painkillers find the pain (~33 s)
- **Setting:** a kitchen (pizza, pill packs, water glass); inside the body — the stomach as "ACID SPA 98.6 °F, NO
  DIVING · NO PILLS AFTER 9" (green acid pool, red fleshy walls), a "HUMAN BODY official road map"; blood-vessel
  tunnels (pink, red blood-cell discs); motorway signs "HEADACHE ↑ 20 MIN / EXIT 1"; a capsule labelled "BRAIN NOT
  INCLUDED"; the body as a house (blue house at night, pink-lit); an endless arched hallway of rooms (red carpet, wall
  lamps, doors, smoke alarms, "FOR RENT", "HEAD" door).
- **Characters:** a man with brown hair in a purple shirt; pill characters (teal-and-white capsules with faces and
  stick limbs); crowds of pills.
- **Palette:** frame 0060 `#83152a #c86c77 #481b32 #aa4f62 #963449`, sat 0.62 (almost all red/pink). Sheet
  `#d16565 #f0c9ba #ab4448 #53121c #962935`.
- **Light / time:** kitchen day → red interior world (0.31-0.47) for most of the video → back to the kitchen.
  Hue by thumbnail is "red" in 50 of 60.
- **Camera:** one-point-perspective corridors (re-used); fly-throughs down tunnels; close-ups of pill faces; big
  signage. Frame 0060: a dark capsule "brain" graphic in front of a blurred pink wall of round portals.
- **Sheet pacing:** 29 big, 23 mid, 7 small.

### short16 — The Window That Breaks Japan's Gambling Law (~42 s)
- **Setting:** a Tokyo back street at night (neon, Japanese signs: 新台入替 "NEW MACHINES", "PRIZE HALL
  PACHINKO · SLOTS", 桜セブン "Sakura Seven", karaoke, a red paper lantern, a blue vending machine, crates of bottles,
  wet reflective ground); the pachinko hall (long rows of machines, red stools, red patterned carpet, white strip
  lights); the prize counter ("PRIZE COUNTER", "THANK YOU ありがとうございました", shelves of goods); the small lit
  exchange window in the alley (lucky cat, hand passing tokens and cash); a police officer with a sign "GAMBLING: NONE ✓".
- **Characters:** a police officer (blue cap with a star); an old man in glasses carrying stacked red/black buckets of
  steel balls; the hero (brown hair, orange jacket); the clerk (black outfit); a man in sunglasses (purple jacket,
  beanie); a cat.
- **Palette:** frame 0060 `#0c1436 #27192e #6d5e70 #591c28 #d2b59a`; frame 0180 `#1e1c41 #0f163c #634254 #401b3c`.
  Sheet `#353c60 #e1cdb3 #4e1d2a #a28575 #172046`. Sheet mean luma 0.34 (dark).
- **Light / time:** neon night (0.20-0.40) → warm bright interior (0.50-0.56) → night alley (0.20-0.31).
- **Camera:** frame 0180 is a **tilt-shift-style** high angle (sharp middle band, blurred top and bottom, so the street
  looks like a miniature); eye-level mediums; one-point perspective down the hall aisle; hand close-ups at the window.
  Frame 0060: lit doorway in the centre, dark all round (corner/centre 0.25).
- **Sheet pacing:** 27 big, 22 mid, 10 small.

### short17 — The Science Behind Slot Machines (~30 s)
- **Setting:** a casino floor (red-and-gold slot machines "LUCKY 7s", "GOLD RUSH", "PLAY 3 CREDITS · 1 LINE · $1 GAME",
  a progressive jackpot LED "$1,284,530.88"); inside the machine (reel unit, green circuit board, orange wires); a huge
  paper strip "REEL 3: EVERY STOP" (#9 = 7 JACKPOT); "ONE CLICK SHORT" stamps and a counter "x01 → x14"; a cyan
  wireframe cage with a prize wheel.
- **Characters:** the player (black spiky hair, teal jacket with a yellow leaf pattern, red lanyard); his buddy (red
  backwards cap, gold chain).
- **Palette:** frame 0060 `#271412 #961413 #563f33 #ac9276 #dce9bc` (red + banknote green); sheet
  `#622c1f #fbe4a1 #bc7b48 #a02b1c #270504`.
- **Light / time:** warm red casino (0.26-0.45) → bright warm machine interior (0.55-0.71) → casino.
- **Camera:** frame 0060 is a POV: your blurred black hand pushes a $100 bill into the slot, strong dutch tilt (~20°),
  **very shallow depth of field** (only the bill and slot sharp); slow vertical pans down the paper list (one long
  continuous move); x-ray wireframe overlay. This short looks the most "realistic 3D" (glossy plastic, reflections,
  few ink lines on the machines).
- **Sheet pacing:** 38 big, 19 mid, 2 small.

### short18 — (not in list) does time slow down when you're scared (~39 s)
- **Setting:** an amusement park free-fall tower (orange lattice, vertical blue "FREE FALL" sign, "LONE STAR THRILLS",
  safety net); a study (a pink brain character at a desk drawing, bookshelf, porthole windows, rainbow rug); a support
  group room "CRASH SURVIVORS TUESDAYS 7PM" (mint wall, ring of yellow chairs, US flag, poster "ONE MILE AT A TIME");
  a blueprint "HYPOTHESIS: IF TIME SLOWS → CAN READ #"; a wrist display "CHRONO-2" (red LED digits); a diner wall of
  numbers "418073"; a flip-book; an evening rest stop.
- **Characters:** the scientist (black hair, glasses, white lab coat); the volunteer (brown hair, orange harness
  jumpsuit); group members with name tags (GUS, CARL, DEB, RAY, MO); the pink brain (with glasses); a red-cap guy;
  pigeons.
- **Palette:** frame 0060 (group) `#d1d0b5 #6a4e48 #aed0b8 #92a487 #e8ead9`, sat 0.26 (the least saturated frame);
  frame 0180 `#84503c #d7c6aa #dfd0b9 #aa916e`. Sheet `#d1d5c5 #f4ead7 #30537c #6d98ae #d5a77f`.
- **Light / time:** bright day (0.53-0.74) → blue blueprint (0.29-0.40) → dusk orange → day.
- **Camera:** vertigo shots straight down the tower with a falling person and the ground far below; big dutch angles;
  an extreme close-up of a terrified face; frame 0180 is a POV over a flip-book; frame 0060 is a high angle onto the
  circle of chairs.
- **Sheet pacing:** 48 big, 10 mid, 1 small.

### short19 — Why Humans Can't Pick Random Numbers (~42 s)
- **Setting:** a desert Southwest town (palms, cacti, mesas); an "ACCOUNTS PAYABLE" office (teal walls, fake treasury
  checks "87,439"); "Desert State Bank" drive-through ("$2,000,000" sign, tube); a tower "THE ONE" with 19 floors marked
  by big gold numerals and a round glass elevator; an audit office with a sunset window; a grid of 100 coins; jail bars.
- **Characters:** the accountant (black bowl hair, mustard-yellow shirt, brown tie); the auditor (red-brown bun,
  glasses, purple suit, magnifying glass); a police officer; a teller on a video screen.
- **Palette:** frame 0060 (tower) `#5f8aaa #a98b77 #d7b092 #5a616d #e7d9bd`; frame 0180 (sunset office)
  `#f9c28b` 26 %, `#754238`, `#ad7d5f`, `#db9480`. Sheet `#e9b386 #f1deb8 #c58469 #835344`.
- **Light / time:** warm hazy day (0.44-0.70) → golden-pink sunset for the second half (0.53-0.70). The most even
  sheet: never dark (min 0.44).
- **Camera:** magnifying-glass close-ups; low angle up the tower (frame 0060); an overhead city with giant numerals
  rising out of it (a chart built into the world); top-down coin grid; mediums; foreground bars at the end.
  Frame 0180: medium shot at a desk, window behind with a soft blurred desert.
- **Sheet pacing:** 32 big, 24 mid, 3 small.

### short20 — (not in list) Edison's steel-ball nap (~37 s)
- **Setting:** a dark, stage-like room: one bare hanging bulb (warm), dark green wall, a floor of concentric
  brown/cream rings (a hypnotic target), a wooden chair or stool, steel balls held over metal plates; an x-ray view
  (see-through blue body, pink brain, a yellow nerve line); Edison's lab (wood, phonograph horns, shelves); an
  underwater "depth of sleep" diagram (AWAKE / LIGHT SLEEP / DEEP SLEEP); close-up eyes with glowing blue irises
  ("HYPNAGOGIA"); a corkboard of idea cards with red strings ("MAGNET CAR"); an elevator going down to "DEEP SLEEP".
- **Characters:** "you" (brown hair, blue body); Thomas Edison (grey hair, black suit, bow tie).
- **Palette:** frame 0060 `#140d0a #0b090c #050408` (near-black, 58 % together), `#8eb5c3` (x-ray blue); frame 0180
  `#29231b #0f0d0d #5e585d #b99d89`. Sheet `#211a15 #746759 #3b1d14 #5f3f2c`. Sheet mean luma 0.25 (the darkest).
- **Light / time:** low-key single-source light all the way (0.12-0.47): a pool of light under the bulb, deep shadow.
- **Camera:** symmetrical, frontal, locked compositions; slow push-ins; a floor-level POV of the balls; eye close-ups.
- **Sheet pacing:** only 16 big, 30 mid, **13 small** — the most static short.

---

## 4. Burned-in caption spec (measured)

Every one of the 38 frames and every one of the 1,200 thumbnails carries a caption.

| Property | Measured value (at 540x960) | At 1080x1920 |
|---|---|---|
| Vertical position | word box rows 661-694 → **y = 0.689-0.723 of height**; baseline ~0.716 | baseline ≈ y 1375 px |
| Horizontal position | centred, **x-centre = 0.50** | centred |
| Ascender-to-baseline height | 26-27 px = 2.8 % of H ("brain", "the") | ~53 px |
| Full height with descenders | 33-34 px = 3.5 % of H ("The guy", "money") | ~67 px |
| Font size (estimate) | ~37 px em | ~75 px |
| White stem width | 6-7 px (≈ 1.2 % of W) | ~13 px |
| Black outline | 2-4 px around every glyph, plus a soft dark drop shadow below/right | ~5-8 px |
| Fill colour | `#fcfcfc` (measured 250-252 per channel) | |
| Word box width | 10-54 % of W (one short word ≈ 60 px, three words ≈ 290 px) | |
| Words per caption | 1-3 ("off", "He owed money", "from the store.", "if they want") | |
| Case / punctuation | sentence case (first word of a sentence capitalised), commas, full stops and "?" kept | |
| Font look | very heavy sans (single-storey "g", double-storey "a"), like Montserrat Black/ExtraBold class (my guess, not confirmed) | |
| Behaviour | sits on top of everything (faces, props), never moves, hard swap per word (STYLE_BIBLE.md:9) | |

CONTEXT.md:18 says "roughly 60-74 % of frame height"; the measured box is tighter: 69-72 %.
Our own rule (STYLE_BIBLE.md:10): **no captions unless the user asks**. If the user asks, use the numbers above.
When measuring reference colours, always mask rows ~0.64-0.76 H first (CONTEXT.md:18-19).

---

## 5. Cross-short visual constants

**Characters (all 20 shorts)**
- Flat 2D "bean" people: a vertical capsule/bean body, taller than wide, in one strong costume colour; a big head
  that is **almost** round (slightly flattened or wider on one side, not a perfect circle) sitting on or overlapping
  the top of the body; thin black stick arms and legs; small round black ball hands; tiny or no feet.
- Faces: off-white with soft grey-blue shading (`#f2ebe5` measured on Kyle's face); black oval or dot eyes, often
  half-closed with a lid line (the "smug" look); thick short brow strokes; tiny mouths; a teeth grid for grimaces;
  light-blue sweat drops; red stress lines; round glasses are common.
- One signature item per character: a hat (toque, bicorne, cowboy hat, bucket hat with lures, crown, police cap),
  a hair shape (ginger quiff, black bowl cut, afro, bun), or a prop (lanyard, badge, telescope). Each main character
  gets a different saturated body colour (teal, mustard, red, purple, orange, blue) so two people never blend.
- Black outline around head and body, clearly **thicker than the world's lines** (about 1 % of frame width on a
  medium shot; thicker on close-ups). Limbs are single black strokes.
- Characters are **lit by the scene**: blue faces at night, orange faces by firelight, a light stripe across the
  widow's eyes (short07), shadow side on heads. They cast soft contact shadows.
- Expressions change often, and reactions are big (eyes popping, gritted teeth).

**World**
- A real 3D world (camera moves through it, parallax, perspective) with toon shading, painted textures (plank grain,
  brick, cobbles, grass blades, wallpaper patterns) and black ink lines on silhouettes and creases. The lines get
  softer and fainter in blurred backgrounds.
- Exceptions: hero props are sometimes realistic sculpted 3D with no ink (short11 bronze jar, dragons and frogs;
  short17 glossy slot machines).
- **Diegetic text everywhere**: signs, posters, labels, documents, counters ("Pardons", "PRIZE HALL", "OUR WINNERS",
  "CRASH SURVIVORS", "STORM OIL", "YEARS AT WAR 099"). The signs carry exposition and jokes, so the narration can stay
  short.
- **Explainer inserts** for the "You see," part: cut-aways (short07 ground section, short11 earth crack), blueprints
  (short14, short18), maps (short06), number grids (short06, short19), the reel list (short17), the sleep-depth
  diagram (short20), the body-as-a-house (short15). They are drawn in the same style and placed inside the world.
- Effects: 4-point sparkle stars, sweat drops, impact bursts, speed and radial lines, smoke puffs, fire, coins, paper
  flurries, rain and snow particles, god-ray light shafts, bloom on bulbs, windows and neon.

**Colour and light**
- Strong, saturated colour. Frame sat mean 0.26-0.78 (median ~0.46); frame luma mean 0.20-0.74.
- Each short moves through **2-4 lighting states**, usually ending in a different one from the start. Typical states:
  - day sky: `#197aef` → `#368bf1` → lighter near the horizon; soft white cumulus clouds;
  - night: deep saturated blue `#0d1a65`, `#1b2b91`, `#3042ba`, `#455cdb`, with warm windows/lamps (`#f0c070` class);
  - sunset/dawn: `#f9c28b`, `#e8ad8b`, `#dc8549`, with magenta-violet skies;
  - warm interiors: `#f1c166`, `#dc8549`, `#632b2f` (red rooms) lit by practical lamps;
  - one-colour "inside" worlds: red/pink for the body (short15), green for the Japanese room (short09).
- Bright subject in the middle, darker edges: corner/centre brightness median **0.68**; 25 of 38 frames are below
  0.8; strongest 0.13 (short08 iris), 0.25 (short16), 0.30 (short20).

**Camera and editing**
- New composition about every 1-2 s. Big tile-to-tile changes per sheet: 43, 47, 37, 42, 41, 45, 42, 38, 46, 51,
  32, 39, 38, 22, 29, 27, 38, 48, 32, 16 (shorts 01-20). The newer shorts (01-12) change almost every thumbnail; the
  older ones (14, 15, 16, 20) hold one composition longer.
- About 6-12 locations per short, and each location gets several set-ups (wide, two-shot, close-up, insert).
- Common framings: very low hero angles; high angles and straight-down overheads; dutch tilts for drama and falls;
  POV shots (hand with a banknote, telescope, flip-book); extreme close-ups of eyes and props; one-point-perspective
  corridors and paths; big foreground shapes (heads, arms, posts) cropping the frame edge for depth.
- Transitions (seen in the stills): crossfade dissolves (frames caught mid-dissolve in short01, 02, 05, 13), circular
  masks and irises (telescope, peephole, porthole, spotlight), following an object (bullet, oil stream), whip pans
  with motion blur, fly-throughs.
- Depth of field: strong in mediums and close-ups (blurred backgrounds, bokeh lights); wides mostly sharp with haze;
  one tilt-shift miniature shot (short16_0180).

**Style families inside the channel** (useful when choosing a look)
1. Clean bright cel look, mostly flat light, high-key: short08, 09, 10, 13, 18, 19.
2. Rich lit 3D with bloom, rain/snow, shafts and strong colour arcs: short01, 05, 07, 11, 16, 17, 02 (interiors).
3. Graphic/diagram-heavy: short06, 15, 20, plus the inserts in 14, 17, 19.

---

## 6. Bugs / contradictions

1. **Contact-sheet description is wrong for the shipped sheets.** CONTEXT.md:14 and STYLE_BIBLE.md:3 say each sheet
   is 2 s = 60 consecutive frames (`references/measure/NN_<id>_sheets/sNN.jpg`). The shipped `sheets/shortNN_sheet.jpg`
   are 60 frames spread over the **whole** video (0.5-1.3 s apart). README.md:19 is correct ("60 frames each"). Any
   agent that measures motion from these sheets as if they were 30 fps strips will be off by 15-40x.
2. **Paths that do not exist in the repo:** `references/vids/`, `references/measure/`, `measure/summary.json`, `tx/`,
   `references/refs_sheet.jpg`, and the work folders `references/<topic>/` (CONTEXT.md:13-16, 47; STYLE_BIBLE.md:2-3).
   The reports also cite crops/sheets that are not shipped (e.g. outlines.md:235-242 `sheets/v01..v20.jpg`, `crops/`;
   motion.md:143-150 file names). Only `frames/` and `sheets/` were shipped.
3. **Frame names are undocumented.** `_0060` / `_0180` are not 30 fps frame numbers (that would be 2 s and 6 s); the
   sheet matching shows they are ~12 s and ~36 s (frame index at 5 fps). Nothing in the repo says this.
4. **Two frames missing without explanation:** `short15_0180.jpg` and `short17_0180.jpg`. Most likely those videos are
   shorter than 36 s. README.md:18's "38 frames" count is right, but the gap is not explained.
5. **"Full-size" is not true.** README.md:18 says "38 full-size reference frames (540x960)"; the output is 1080x1920
   and the sources were 720x1280 (CONTEXT.md:13). Compare like with like: downscale our frames to 540x960 first.
6. **Privacy rule vs publishing.** CONTEXT.md:12 says the reference material is "private study only: never upload,
   publish or send any of it anywhere", yet the repo publishes 58 frames/sheets from another creator's channel, and
   CONTEXT.md:16 even names a source video ID (`01_Mz72MuPgnGY.mp4`). README.md:33 says "for style study only".
   For the user: never put these images (or traced copies of these characters) into a video.
7. **"Thin" outlines.** STYLE_BIBLE.md:9 says the captions have a "thin black outline" and STYLE_BIBLE.md:26 says the
   characters have a "thin black outline". Measured: caption outline 2-4 px at 540 wide (about a third of the letter
   stem) plus a drop shadow; character outlines are clearly thicker than the world lines. "Thin" undersells both.
8. **"Ink lines on all 3D geometry" has exceptions.** STYLE_BIBLE.md:27 states it as a rule, but short11's bronze jar,
   dragons and frogs and short17's slot machines are realistic 3D with almost no ink.
9. **Caption band.** CONTEXT.md:18 gives 60-74 % of height; measured 69-72 %. Not wrong, but a mask of 60-74 % throws
   away more of the picture than needed (I used 64-76 % to be safe).
10. Some frame-to-tile matches fail (short02_0060, short05_0180, short11_0060, short14_0060) because the frame lands in
    a dissolve or a look-alike set-up. That is a limit of the matching, not a repo bug.

## 7. Hard-coded paths, OS assumptions and versions (from this slice)

- CONTEXT.md:13 reference specs: 20 shorts, 720x1280, 30 fps; file pattern `references/vids/NN_<id>.mp4`, "01 = newest".
- CONTEXT.md:16 ffmpeg example with a real video ID: `ffmpeg -v error -ss 12.4 -i references/vids/01_Mz72MuPgnGY.mp4 -frames:v 1 out.png`.
- CONTEXT.md:22-42 placeholder project path `your Remotion project/out/bridge/test/`, `src/videos/bridge/`; stack pins
  **Remotion 4.0.290, three 0.175, @react-three/fiber 9.1.2, @react-three/postprocessing 3.0.4, postprocessing 6.37.2**;
  composition `BridgeShort` 1080x1920 30 fps.
- CONTEXT.md:43 tool pins on the author's PC: python with **numpy 2.4, PIL 12, scipy 1.18, no OpenCV**, ffmpeg/ffprobe.
  This machine has **PIL 11.1.0 and numpy 2.2.6**; scripts written against PIL 12 APIs may need checking.
- Windows gotcha found while measuring: `python -I` (isolated mode) cannot import numpy here because the packages live in
  the user site-packages. Run helper scripts without `-I`, from a folder outside the repo.
- Image formats: frames 540x960 JPEG, sheets 1800x1920 JPEG (10x6 grid of 180x320), all encoded by ffmpeg "Lavc62.28.101".

## 8. What to change for a new story

1. **Do not reuse the reference content.** Use these images only to judge look and quality (CONTEXT.md:9-12,
   README.md:30). New characters, props, signs and shots must be our own.
2. **Pick a setting family and a light arc first.** Choose 2-4 lighting states from section 5 (e.g. day → sunset →
   night-blue explanation → dawn) and give each one a hex set. Use the per-short palettes above as starting points
   for a similar setting (sea: short01/12; Western: 04; snowy village: 07; city night: 05/16; office: 09; house: 10;
   medieval: 13/14; inside the body: 15).
3. **Cast design.** 2-4 named characters, each with one saturated body colour that differs from the others and one
   signature item. Off-white faces, near-round heads (not perfect circles), stick limbs, ball hands. Plan expressions
   per beat.
4. **Write signage and an explainer insert.** List the in-world signs and documents the story needs (names, prices,
   counters, labels) and design one diagram-style insert for the "You see," pivot (cut-away, blueprint, map, counter).
5. **Shot plan density.** Aim for a new composition every 1-2 s (35-50 big changes per 60 sheet thumbnails for a
   ~55-60 s short), 6-12 locations, and a mix of: wide establishing, medium two-shot, close-up reaction, macro prop
   insert, POV, overhead, a dutch tilt for drama. Use dissolves, irises and follow-the-object moves instead of hard cuts.
6. **Length.** The newest references run ~53-62 s (one ~80 s); older ones 30-45 s. The skill's 55-70 s target matches
   the newer ones.
7. **Captions** stay off unless the user asks; if on, use the section 4 spec.
8. **Reference set for a new topic.** If the new story's setting is not covered (e.g. a tree, a teleporter, a brain
   upload lab — the user's three titles missing from these 20), add matching frames from the user's own
   `C:\Users\utkar\Desktop\yt short videos` study instead of relying on these 20.
9. **When comparing our stills** with these frames, downscale ours to 540x960, mask the caption band on the reference,
   and compare in the same lighting state (day vs day, night vs night).
