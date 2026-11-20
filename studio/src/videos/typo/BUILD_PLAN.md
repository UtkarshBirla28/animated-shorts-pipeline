# BUILD PLAN — "The Oil Tanks That Were Mostly Water" (slug `saladoil`, comp `SaladOilShort`, 1080x1920, 30 fps, 2712 f = 90.4 s)

Real video for the user's channel. Story, characters and voice are OUR OWN. Story authority: `briefs/saladoil.md`
(= `sound/saladoil/SCRIPT.md`, facts with sources at its top). Style target: `study/CHANNEL_STYLE_BIBLE.md` (measured
from 16 reference shorts; never copy their characters/shots, never name the channel). Pipeline knowledge:
`study/REPO_KNOWLEDGE.md`. Engine and techniques: `src/videos/antitheft/` (READ-ONLY reference, never edit it).
The contract's own report (frames, stubs, owner notes): `studio/out/saladoil/contract_report.md`.

## FACT FIX (2026-11-14, binding) — TIME, 4 June 1965
"De Angelis' men duped Amexco with surprising ease." One of TINO'S OWN MEN (the tank man) climbs to the top of a tank,
drops in a weighted tape measure, then SHOUTS DOWN to an American Express inspector ON THE GROUND that the tank is
"90% full". The inspector NEVER climbs and NEVER shouts; he stays on the ground and believes it. The man on the tank roof
in shots 1, 4 and 16 is always the tank man. The mystery (shot 7) is a LENDER (suit, fedora) peering into the hatch.

## Files and owners (each agent edits ONLY its own files)
| Owner | Files | Job |
|---|---|---|
| LEAD (orchestrator) | `plan.ts`, `story.ts` (BEAT, SHOTS, XFADE, relights, KICKS), `world.ts`, `ctx.ts`, `BUILD_PLAN.md`; `words.ts` + `voicewarp.ts` are GENERATED (never hand-edit) | contract, shot list, beats, integration, audits |
| CAM | `story.ts` CAMS / DOFS (+ their frame constants) only | framings, creeps, the one gentle move per framing, lens blur |
| WORLD-EXT | `sets_ext.ts`, `paint.ts` | tank top (hatch, oil, tape, LOANS counter, ladder, rail, harbour, skyline), tank farm (gate sign, fence, tanks, pipes, valve drip, storm, BANKRUPT), street (newsstand headline, SHARES board, CLOSED door); every exterior board |
| WORLD-INT | `sets_int.ts`, `lights.ts`, `shade.ts` | bank (receipt, stamp, cash, chart insert, window), trading floor, tank cutaway, kitchen, pump room, office; ALL 12 light states + lamp / window pools |
| CHAR | `toon.ts`, `cast.ts`, `cardshade.ts` | every character design + pose + expression, staging per shot, the joke cast (oil blob, fish), effect cards (clipboard board, reflection, umbrellas) |
| POST | `SaladOil.tsx`, `Captions.tsx`, `ink.ts`, `grade.ts`, `lensblur.ts` | captions to spec, ink tint/width, per-light grades, composer, dissolves |
| AUDIO | `sound/saladoil/audio/*` | original 1960s caper score, SFX on actions, the shout's metal echo, mix to -14 LUFS |

Contracts: anchors live in `plan.ts` (`TK`, `TF`, `BK`, `TR`, `CU`, `KI`, `PR`, `ST`, `OF` + place helpers `tk()`, `tf()` ...);
timing lives in `story.ts` (`SHOTS`, `BEAT`, `COUNT_AT`, `lightAt`, `camAt`, `dofAt`, `TOTAL`, `XFADE`, `XPAD`); the
per-frame context `SetCtx` (`ctx.ts`) is passed to `Exterior.pose()` / `Interiors.pose()`; the cast API is
`stage(id, f, cam: CamInfo, L: LightState, vf): Stage` (`cast.ts`). Need a new anchor? Add it to your own file as a local
constant derived from plan.ts anchors and say so in your report; do not edit plan.ts / story.ts BEAT / SHOTS (tell the LEAD).
Sound reads `sound/saladoil/audio/timeline.json` (`node scripts/export_timeline.mjs`): every BEAT name below is a key there.

Everything is a pure function of (shot id, frame): no clocks, no `Date`, no `Math.random` (seeded hashes only), no
`useFrame`. three is pinned at 0.175 (shade.ts / cardshade.ts string-patch shader chunks). No npm / pip installs.
Keep every pixel size relative to 1080x1920. Canvas text must use a font that exists in headless Chrome on Windows
(Georgia, "Times New Roman", Arial, Impact, "Arial Black", Verdana, Tahoma, "Courier New", "Trebuchet MS", or the loaded
CapMontserrat). Boards that must be READ use unlit (MeshBasic) faces so the side sun never greys them out; letters
>= 40 px tall on screen. Every board <= 6 words. Idle motion runs on the VIDEO clock (`ctx.vf` / cast `VF`) in WHOLE
cycles over `VOICE_TOTAL` (loop seam). One render at a time (concurrency 1); renders are silent; never play audio.

## Global look — a 1960s caper palette (style bible section 13 + 6)
- Sets: low-poly 3D with hand-painted Canvas2D textures; coloured shadows (never neutral/black); fog colour = horizon
  colour. Caper palette: cream-white steel, mustard / honey gold, burnt orange, brick red, olive, navy, slate; the GOLD of
  the oil is the film's hero colour (it should glint), the BLUE of the water its twist colour (keep blue water out of
  every frame until shot 10, except the tiny drip of shot 2 and the parting in shot 16).
- World ink: ~3 px at mid distance (2-4; up to 8 on near props), tinted dark (steel navy #1A1D40 outdoors, wood brown
  #2B1A12 in the bank / office, plum #2A1A26 elsewhere); none on sky, clouds, far silhouettes.
- Characters: flat bean-head cards, head ~30 % of height (3.3-3.5 head-heights), no neck, no nose, no ears; face fill
  off-white #F8F3EE; dot eyes #2A2030 (default half-lid), thick acting brows; outline dark plum #2C1E2A drawn into the
  art (thin lit side ~2-2.5 % / thick shadow side ~5-6 % of head width); one saturated body colour + one signature item
  each; stick limbs, ball hands; scene-light tint + soft lavender far-side gradient + 2-4 px pale key-side rim; contact
  blob under the feet. Expression swaps in 1 frame, held >= 12 f, 0-3 f before the word. No mouth movement on narration
  — lip flaps ONLY on the shouted line "Ninety percent full!" (the tank man, `BEAT.ninety` .. `BEAT.shoutEnd`; 3 shapes,
  2-5 f each).
- DOF on ~1/3 of screen time (MS / CU / inserts), wides sharp, board text always sharp enough to read.
- Captions: `Captions.tsx` only (no screen-space text anywhere else). Digits: 1963, $150 million, 90%.
- Light states change on beats; the pivot (shot 11, "You see,") is a new warm colour world.

| light state | shots | look |
|---|---|---|
| `dawn_gold` | 1, 16 | low golden sun rising over the harbour (-z), peach-apricot horizon to pale blue zenith, honey tanks, long violet shadows, the oil glints |
| `noon` | 2, 4, 7 (start) | deep blue sky + puffy lavender-bottomed clouds, cream-white tanks with rust streaks, red-orange rails, blue-violet shade, strong contrast |
| `late` | 7 (relight from `BEAT.soHow` + 6, 70 f) | warm amber low sun, long shadows, honey highlights, violet shade: time passing, the mood turning |
| `storm` | 9 | flat grey-blue, wet dark ground with puddles, rain streaks, black umbrellas, no sun disc |
| `bank_warm` | 3, 5, 6 | mahogany / walnut panels, brass + green banker's-lamp pool, cream paper, plum-brown shade, cool window daylight |
| `trading` | 8 | stormy grey window light, green-grey walls, white shirts pop, dark-green chalk board |
| `cutaway` | 10, 12 | the diagram world: deep navy backdrop, clear blue water, a saturated gold oil band, red cut edges, flat cool light |
| `kitchen` | 11 | the pivot's NEW world: sunny yellow walls, red-cream checker floor, mint cabinets, warm golden window light |
| `pump_night` | 13 | royal-blue night shade, warm amber work-lamp pools, copper / rust pipes, red valve wheels, the glowing gold blob |
| `street_grey` | 14 | overcast grey city, slate facades, green newsstand, red accents only on the story boards (WATER, arrows, CLOSED) |
| `office_sun` -> `office_glow` | 15 (relight from `BEAT.warren` - 6, 40 f) | warm cream walls, sunlit window onto a bright cafe, honey wood; warms and brightens on "Warren Buffett" |

## Characters (one body colour + one signature item each; generic cartoons, NO likenesses, NO logos)
| id | who | design + acting |
|---|---|---|
| tino | Tino De Angelis (generic, NOT a likeness) | round cartoon shape, slicked black hair (#141018), double-breasted grey suit (#8A8F99), gold tie (#E0A92A) with little oil-drop dots, big confident grin; signature: a gold oil-can lapel pin. The MAIN character: nobody else wears grey + gold. Shot 2 proud, arms wide (grin on "king", smug on "oil."); shot 4 on the ground beside the inspector: smiles up at his man, happy thumbs-up on "believed" |
| tankman | TINO'S TANK MAN (new, fact fix) | denim overalls (#3F6FA8 bib / #2C4F80), a red cap (#C8452C), the weighted measuring tape on a big red-orange reel (#B8472E) clipped to his belt. Shots 1 / 16 kneels at the hatch, tape in hand (loop pose); shot 4 climbs the top flight of the spiral ladder, kneels at the hatch, pays the tape in, steps to the rail, leans over and SHOUTS "Ninety percent full!" DOWN from `TK.shout` (left of the ladder top, leaning on the rail; mitten hand at the mouth, lip flaps ONLY on that line), then proud / smug |
| inspector | the American Express inspector (no logo, never named on screen) | khaki work jacket (#B79A62), flat cap (#7A6440), a clipboard, a plain "INSPECTOR" badge. ONLY ON THE GROUND (shot 4; optionally a tiny figure walking up to the far tank in the shot-3 window). Eyes on the clipboard the whole time; on "believed" ticks it WITHOUT LOOKING UP; deadpan; he never climbs, never shouts |
| banker | bank lender | navy pinstripe suit (#24345E), round glasses, a red tie, the rubber stamp. Shot 3 stamps APPROVED on "money", slides the cash on "against it"; shot 5 stamps happily with eyes closed on each "more" |
| lenders | suits + fedoras | grey / brown / blue-grey suits, fedoras, black umbrellas. Shot 7: ONE lender kneels at the hatch and peers in (curious "ponder", eyes wide on "inside"), his face reflected in the golden oil; shot 9: in the rain, climbing the hero tank's ladder |
| traders | 1963 trading floor | white shirts (#F2EFE8) with rolled sleeves, thin ties (navy / red / green), phones; shouting, then shock on "crashed" (staggered 0-2 f) |
| workers | pump workers (Tino's men) | denim overalls (#3E5F8A), slate caps (#4A5A72), wrenches; turn the valve wheels (shot 13, backs to camera) |
| investor | the young investor (generic, NOT a likeness of Warren Buffett; respectful) | horn-rimmed glasses, crew cut, white shirt (#F4F2EC), thin dark tie (#1E2230). Reads the paper, small smile + writes "BUY" on "bought", a knowing look on "trusted", a warm smile on "Warren" |
| cafe | cafe people (through the office window) | happy customers handing plain cards (no logos) to a waiter, coffee cups; small, busy, warm |
| walkers | street passers-by | muted coats and hats; one reads the paper, one stops at the newsstand |
| blob | joke cast: the oil blob | a little golden drop (#F2B62E) with dot eyes and a smile; rides the pipe A -> B -> C (shot 13); a sweat drop + a 18 f brow wipe on "hardest-working" |
| fish | joke cast: the fish | a small orange cartoon fish (#F59A3A) swimming calmly across the water body (shots 10 / 12), unbothered |

## Shots (frames from story.ts / timeline.json; `BEAT.x` = the frame the word x starts)
Every shot change is a ~10 video-f cross-dissolve (12 f into 10 "Inside..." and 11 "You see,"), centred on the
boundary; each shot is alive from s.a - 6.5 to s.b + 6.5 (XPAD). Camera = CAM (current contract cameras listed);
everything else = owners. Boards <= 6 words.

| # | frames (s) | set / light | framing (camera) | action on BEAT words | boards | sound |
|---|---|---|---|---|---|---|
| 1 | 0-259 (8.6 s) | tanktop / dawn_gold | FRAME 0 = P0: ~83 deg down the open hatch onto shiny golden oil, the tape going in; at 48 ONE 96 f crane pull up and out to the tank man kneeling at the hatch, the counter on the rail, tank rows, hazy harbour skyline (lands ~144, slow creep) | tape slides into the oil from frame 0; counter rolls from "borrowed" (75) and lands "$150,000,000" on "$150 million" (97..103); the tank man glances at the counter, back to the tape on "water" (229) | "LOANS: $150,000,000" | gulls, a distant ship horn, the tape-reel whirr, split-flap clatter 75-103 |
| 2 | 259-465 (6.9 s) | tankfarm / noon | outside the gate, the gate sign readable ~1.5 s, then ONE slow 100 f glide in through the gate (305-405) onto Tino, arms wide, the hero tank behind him | "Meet Tino" (256-269) arms wide, proud; grin on "king" (355); smug glance on "oil." (442); the valve at his left drips ONE tiny water drop as "oil." ends (leaves 446, lands ~458) | "ALLIED / VEGETABLE OIL" | industrial waterfront bed, gulls, flag snap, a tiny "plip" on the drip landing (~458) |
| 3 | 465-618 (5.1 s) | bank / bank_warm | MS of the banker at the desk, the window with the far tank at right; on "inspectors" (570-12) a slow 80 f push toward the window | APPROVED stamp lands on the OIL RECEIPT on "money" (490, small kick); the cash stack slides across on "against it" (499); through the window, on "sent inspectors to check" (560-606), a tiny khaki inspector walks up to the far tank | "OIL RECEIPT", "APPROVED" | stamp thump (490), cash slide + register "ka-ching" (499-511), office murmur, a typewriter |
| 4 | 618-917 (10.0 s) | tanktop / noon | A (618-797): high 3/4 medium-wide of the tank top from off the rim (ladder top, rail, hatch), 0.12 %/f creep; then ONE slow 72 f crane DOWN the wall (smoothstep, from `BEAT.andInspector` - 10 = 797, lands 869) to B: a slightly high medium two-shot of the inspector + Tino ON THE GROUND at the foot of the tank; hold to the cut | tank man climbs the top flight from the shot start, over the rim on "up" (669); walks to the hatch and kneels by "drop" (681+6); the tape pays out "drop a tape inside," (681-717); stands on "shout" (728-8), steps to the rail, leans over by "down:" (735+6); SHOUTS DOWN "Ninety percent full!" (756-796, lip flaps ONLY here); crane down on "And the inspector, on the ground..." (807-870); on "believed" (880) the inspector ticks his clipboard WITHOUT LOOKING UP, Tino beside him gives a happy thumbs-up (16 f); deadpan hold ~1.2 s to the cut | clipboard "90% FULL ✓" (tick drawn in from 880) | ladder clangs on the climb, the tape whirr + plumb "plunk" (~705), boots on the roof, THE SHOUT (metal-tank echo, AUDIO), a real pause after "ground", a pencil tick (880) |
| 5 | 917-1002 (2.8 s) | bank / bank_warm | frontal MS of the banker at the desk, 0.25 %/f creep | stamping happily, eyes closed; the three cash stacks grow taller on "more" (949) and again on "more" (980) | — | stamp thumps in rhythm, a register ding on each "more" |
| 6 | 1002-1159 (5.2 s) | bank / bank_warm | the easel chart square-on (~75 % of the width), very slow 0.12 %/f creep | "Soon, his papers showed..." (999); TINO'S OIL pile grows on "more" (1046) and again on "United" (1106), ending clearly bigger than ALL US OIL by "had" (1134) | "ALL US OIL" (US map + drums), "TINO'S OIL" | paper rustle, a comic ratchet / "boing" as the pile grows |
| 7 | 1159-1241 (2.7 s) | tanktop / noon -> late | MYSTERY: a high 3/4 of a LENDER kneeling at the far side of the hatch, leaning over it (the hatch between him and us); ONE slow 72 f push + tilt down (from `BEAT.soHow` + 4 = 1160, lands 1232 just after "inside?") into the hatch; hold on his face reflected in the golden oil | "But what if someone did look inside?" (1156-1226): he leans further over on "someone" (1181); "ponder" on "look" (1202); eyes wide on "inside" (1211); the light turns late (1162, 70 f) | — | music turns curious, one soft "bloop" (~1212) |
| 8 | 1241-1396 (5.2 s) | trading / trading | wide of the trading floor: the SOYBEAN OIL chalk board (~73 % W) over shouting traders, 0.15 %/f creep | traders shouting into phones; on "crashed" (1364) the chalk line dives (big kick), ticker tape falls, the traders' shock (staggered) | "SOYBEAN OIL" (line chart only, NO price numbers) | ticker chatter, phones, crowd shouting; a crash thud on "crashed"; a thunder roll leading into shot 9 |
| 9 | 1396-1514 (3.9 s) | tankfarm / storm | from outside the gate in the rain, 0.16 %/f push toward the hero tank | "His company went bust." BANKRUPT notice slaps onto the gate sign on "bust" (1420); "Lenders finally checked the tanks." lenders with umbrellas climbing the hero tank's ladder (1438-1499) | "BANKRUPT" | rain, thunder, a paper slap on "bust", ladder clangs |
| 10 | 1514-1608 (3.1 s) | cutaway / cutaway | close on the thin golden layer ("Inside...") -> on "was" a 56 f reveal pull-out (1526-1582) to the whole cross-section | the thin gold layer on a HUGE blue water body; one small fish swims by (joke prop) | — | MUSIC TO SILENCE on "Inside" (1511); a single slosh after "water" (~1596) |
| 11 | 1608-1799 (6.4 s) | kitchen / kitchen | PIVOT "You see," (1605, 12 f warm dissolve): the dressing bottle on the table, ~40 % of the frame height, 0.15 %/f creep | the bottle stands separated (oil on top); on "Ever" (1677) a hand gives it a shake (mixed, cloudy); from "The oil always rises" (1724) the golden oil rises to the top in slow, clear motion, settled by "top" (1780) | — | the music returns warm; a shake rattle on "Ever", a soft glug as it settles |
| 12 | 1799-1976 (5.9 s) | cutaway / cutaway | the cross-section, then on "hatch" a 58 f crane up (1885-1943) to the hatch view | water pours in ("Fill a tank with water," 1796-1840), a thin pour of oil ("add a thin layer of oil," 1853-1889); from the hatch it looks completely golden; LOOKS FULL from "hatch" - 6 (1909) | "LOOKS FULL" | water pour, a thin oil trickle, a tiny "ding" on "full" (1951) |
| 13 | 1976-2254 (9.3 s) | pumproom / pump_night | tank A, worker 1 at a valve, the SATURDAY calendar -> on "tank to tank" a 105 f follow along the back wall with the blob (2053-2158) -> a 36 f glide into the blob MCU (2167-2203) | "And the real oil?" (1973); workers turn valves; the blob rides the pipe and each COUNTED plate ticks as it arrives: 1 at 2055, 2 at "got" (2109), 3 at the second "again" (2156); on "hardest-working" (2185) the blob sweats and wipes its brow (18 f) | "SATURDAY", "COUNTED: 1" / "2" / "3" | pump hum, valve squeaks, a "tick" on each plate, the blob's tired sigh |
| 14 | 2254-2363 (3.6 s) | street / street_grey | from 2.6 m up: the newsstand headline poster (upper-middle, ABOVE the caption band), the SHARES board above the kiosk roof, the firm's door at right; 0.12 %/f creep centred on the shot | a newspaper spins in onto the stand on "came out" (2259); the CLOSED sign goes up on "shares" (2314); the SHARES arrows drop red on "crashed" (2324) | "OIL TANKS FULL OF WATER", "SHARES ▼", "CLOSED" | city bed, a newspaper whoosh-spin (2259), a sign clack (2314), a downward "bwomp" (2324) |
| 15 | 2363-2596 (7.8 s) | office / office_sun -> office_glow | the investor MS reading -> on "He bet" a 46 f glide back and up (2438-2484): him at the desk, the sunny window behind; DOF racks to the cafe on "trusted" (2483) and back on "Warren" (2547) | small smile + writes "BUY" on "bought" (2396); "cheap" (2428); through the window, people happily paying with cards; the room warms on "Warren Buffett" (2541, 40 f) | "BUY" | pencil scribble on "bought", cha-ching on "cheap", cafe murmur, the WARM MUSIC SWELL on "Warren Buffett" (2547) |
| 16 | 2596-2712 (3.9 s) | tanktop / dawn_gold | the loop: a steady push down into the hatch that lands EXACTLY on P0 on the last frame (2711) | on "fake" (2620) the golden layer parts (a blue water disc opens, 16 f); on "trust" (2657) it settles back (24 f) to the perfect golden surface of frame 0 by "real" (2677) | — | music ends ON "real." (2690) with no sting; the tank-top ambience (gulls) carries through the tail into frame 0 |

## Exterior details (WORLD-EXT)
- TANK TOP (`TK`): the hero tank (r 7, h 11, flat roof) in cream-white steel with rust streaks, rivet seams and weld
  lines; the rim handrail (red-orange, posts every ~1 m); the round hatch (r 0.42) with its collar, lip and a hinged lid
  propped open; the GOLDEN OIL inside must look like real glossy oil (painted ripple normal / sheen, soft highlights; the
  oil may glint in the bloom). The tape: shots 1 / 16 from the reel at `TK.tapeTop` into the oil at `TK.tapeIn`
  (static, the loop pose); shot 4 it pays out from `TK.tape4Top` (his hand) to `TK.tape4In` between `BEAT.drop` and
  `BEAT.inside1` + 16 and stays; shot 7 NO tape, NO reel. The LOANS flip counter (`TK.counter`, shots 1 / 16 only):
  "LOANS:" / "$0" -> split-flap roll from "borrowed", landing "$150,000,000" on `BEAT.million` (+6). The spiral stair:
  its top flight passes `TK.ladderOut` (the shot-4 climb, feet y 8.2 -> 11) and arrives at `TK.ladderTop`. The ground at
  the foot of the tank around `TK.inspGround` / `TK.tinoBelow` (shot 4 B): gravel yard, oil stains, a puddle, a pipe
  run, a drum or two, so B is not an empty floor. Behind: rows of other tanks (`TK.tanks`) with ladders and roof rails,
  catwalks, the harbour water (-z) with a ship and harbour cranes, a hazy city skyline. Gulls circling; a flag; steam
  wisps from a vent.
- TANK FARM (`TF`): a 1960s waterfront with dozens of tall round tanks (cream-white, rust streaks, spiral ladders, roof
  railings), catwalks and pipes snaking between them, the chain-link fence (+ barbed wire) along z = 16 with the open
  gate, a guard hut, the gate sign "ALLIED" / "VEGETABLE OIL" (readable from the shot-2 start camera), puddles, oil
  drums, a parked 1960s tanker truck, gulls. The valve on the hero tank wall (`TF.valve`, at Tino's left in the shot-2
  landing framing) drips ONE tiny clear drop as "oil." ends. Storm version (shot 9): rain streaks + splashes, dark wet
  ground with reflections, the BANKRUPT notice slapped on the gate sign on `BEAT.bust` (slightly rotated, red border),
  the lenders on the hero tank's ladder (`TF.ladder`, `TF.lenders`).
- STREET (`ST`): a grey 1963 city street: asphalt, kerb, sidewalk, slate facades with windows, lamp posts, a fire
  hydrant, a mailbox, a parked 1960s car, pigeons; the green newsstand with the headline board "OIL TANKS" / "FULL OF" /
  "WATER" (a paper spins in onto it on `BEAT.cameOut`); the stock board "SHARES" with generic red arrows dropping on
  `BEAT.crashed2` (NO company names or logos); the firm's dark-wood door that gets a "CLOSED" sign on `BEAT.shares`.

## Interior details (WORLD-INT)
- BANK (`BK`): warm wood panels, wainscot, a portrait frame (generic), a safe, a wall clock, venetian blinds, a potted
  plant, ledgers, an adding machine, the brass + green banker's lamp (emissive bulb > 1.0 so it blooms); the desk with the
  OIL RECEIPT ("OIL RECEIPT" + small "1,000,000 LBS"), the stamp + ink pad, the red "APPROVED" mark from `BEAT.money` + 2,
  the cash stack (slides on `BEAT.againstIt`), the three stacks of shot 5 (grow on `BEAT.more1` / `BEAT.more2`), the
  window with a tank on the horizon (shot 3: a tiny khaki inspector walks up to it on `BEAT.sent`), the easel chart of
  shot 6: "ALL US OIL" (a US map + a drum pile) | "TINO'S OIL" (a pile that grows on `BEAT.moreOf` and `BEAT.united`).
- TRADING FLOOR (`TR`): the big chalk board "SOYBEAN OIL" with a line chart that dives on `BEAT.crashed1` (no price
  numbers), phone desks, ticker-tape machines, paper on the floor, ticker tape falling, a wall clock, tall grey windows
  with rain.
- CUTAWAY (`CU`): a clean diagram: the half tank shell, the cut edges in red, a THIN gold oil layer (0.25 m) on a HUGE
  blue water body (bubbles, caustics), the fish, the roof hatch; shot 12: water pours in (`BEAT.waterIn` .. `BEAT.add`),
  then a thin pour of oil (`BEAT.thin` .. `BEAT.oilIn` + 14); the "LOOKS FULL" board on the roof from `BEAT.hatch` - 6.
- KITCHEN (`KI`): sunny cartoon kitchen: checker floor, yellow walls, mint cabinets, curtains, a radio, a fruit bowl, a
  salad bowl + plates; the glass dressing bottle (gold oil over ruby vinegar): separated -> shaken on `BEAT.ever` ->
  the oil rises again from `BEAT.theOilRises` to `BEAT.top`, slow and clear.
- PUMP ROOM (`PR`): three tank walls with "COUNTED:" plates ("-" until the blob arrives at `COUNT_AT`, then 1 / 2 / 3),
  the pipe jungle (glass sections where the gold travels), red valve wheels, pressure gauges, hard hats on hooks, a
  toolbox, a thermos, a lunch box, the wall calendar "SATURDAY" (weekday only: no date, no month), two warm work lamps
  (emissive > 1.0, warm pools on the floor), deep blue night shade.
- OFFICE (`OF`): a small warm office: desk, the newspaper "OIL TANKS FULL OF WATER", the "BUY" slip (from
  `BEAT.bought` + 4), bookshelf, typewriter, rotary phone, desk lamp, coffee cup; the window across the street onto a
  bright cafe where people happily pay with plain cards (no logos).
- Lights: tune all 12 states in lights.ts on the real cameras (faces stay readable off-white); warm practical pools
  (desk lamps, work lamps, windows) in the two-tone shading via shade.ts POOL.

## Sound events (AUDIO) — frames from `sound/saladoil/audio/timeline.json` (BEAT / SHOTS names)
Tank-top ambience (gulls, distant ship horn, light harbour wind) on shots 1, 4, 7, 16 and through the loop tail; the
tape-reel whirr (shot 1 from frame 0; shot 4 `drop`..`inside1`); split-flap clatter (shot 1, `borrowed`..`million`);
plip on the drip (`oil1End` + 6); stamp thump (`money`) + cash slide / register (`againstIt`); ladder clangs (shot 4
from the start to `up`; shot 9 from `lenders`); the SHOUT "Ninety percent full!" (`ninety`..`shoutEnd`: a slight
metal-tank echo / short metallic delay on that phrase only, at most +1 semitone formant-preserving lift if it stays
clear, NEVER time-stretch); the real silence after "ground" (`ground`..`believed`); pencil tick (`believed`); stamp
thumps + register dings (`more1`, `more2`); ratchet as the pile grows (`moreOf`, `united`); curious music + one soft
"bloop" (shot 7, ~`insideQ`); ticker chatter + phones (shot 8), crash thud (`crashed1`), thunder roll into shot 9;
rain + thunder (shot 9), paper slap (`bust`); MUSIC TO SILENCE on `inside`, single slosh after `waterEnd`; the music
returns warm on `youSee`, shake rattle (`ever`), soft glug (`theOilRises`..`top`); water pour (`waterIn`..`add`), oil
trickle (`thin`..`oilIn`), tiny ding (`looksFull`); pump hum + valve squeaks (shot 13), a tick per COUNTED plate
(`COUNT_AT`), the blob's sigh (`hardestW`); newspaper whoosh-spin (`cameOut`), sign clack (`shares`), downward bwomp
(`crashed2`); pencil scribble (`bought`), cha-ching (`cheap`), cafe murmur (shot 15), the WARM SWELL on `warren`; the
music ENDS on `end` ("real.", 2690) with no sting.
Music: an ORIGINAL 1960s caper score (walking upright bass, brushed snare, muted-trumpet lead, light vibes / piano),
playful and sly, ~-18 LU under the voice; no whooshes on plain dissolves. Master -14 LUFS, true peak <= -2 dBTP,
exact length 2712 f / 30.

## Safety
NO logos anywhere (no American Express centurion or logo, no Berkshire, no company logos; names are only spoken); the
inspector's badge reads only "INSPECTOR"; Warren Buffett is a generic, respectful cartoon (NOT a likeness); Tino is a
generic cartoon (NOT a likeness); no JFK; no prices or percentages beyond the script (the SOYBEAN OIL board has a line,
not numbers); adults only; family-safe; the fraud is comic, not violent (no police, no arrests on screen); never reference
the channel. Description: "Based on the 1963 Salad Oil Scandal." (sources pinned in a comment).

## QUALITY BAR v2 — the user's direct requirements (2026-11-10). These override anything lighter above.
The user compares every frame with the 16 reference shorts: shadows and detail everywhere, correct light, good colour,
lively animation, a place that clearly IS the place. "Every shot should be very good; animation shouldn't look rigid;
everything should have life." The LEAD audits every shot with scores (stills + 12-frame motion strips) and sends fixes
back until each shot scores >= 8/10, so build to that bar now.

### PACING — the user's standing direction (verbatim)
framings hold >= 2.5-3 s with a gentle creep; favour medium/wide; few whips/snaps; gestures >= 12-18 f; every board
readable and long enough on screen; short board text; clear funny beats ("Ninety percent full!", "...believed them.",
"The hardest-working oil in America.") and a clear mystery beat ("But what if someone did look inside?").
From the brief: hold each framing for at least 2.5-3 s, and favour medium and wide shots over tight close-ups; make
every gesture take 12-18 frames or more; use few whips and snaps, and gentle camera speeds; keep every board on screen
long enough to read. Voice quality comes first: the picture re-times to the voice, never the other way round.

### LIFE (CHAR) — nobody and nothing is ever frozen
- Gaze: characters LOOK at what matters each beat (the tank man at the tape, then down at the pair while shouting; the
  inspector ONLY at his clipboard; Tino up at his man, then at us on the thumbs-up; the lender into the hatch; the banker
  at the stamp; the traders at the board; the investor at the paper, then out of the window). Heads tilt 3-8 deg toward
  the target.
- Expressions CHANGE on the beats (focal character every ~1.5-3 s; swap in 1 f, held >= 12 f, 0-3 f before the word),
  with reactions from listeners too (Tino's grin while his man shouts, the inspector's deadpan, the traders' shock).
- Idle life on EVERY visible character every frame: breathing (1-2 %, ~0.25 Hz), weight-shift sway (1-2 deg, ~0.3 Hz,
  per-character phase), small head bobs, blinks every 1.5-4 s (2-4 f) + a blink across each swap; anticipation (2-4 f)
  before actions and a small overshoot after pose changes; the climb with alternating hands and a body bob.
- Secondary motion: ties, coat tails, cap brims and the tape on its reel sway in the harbour wind outdoors; umbrellas
  bob in the rain; the fish's tail; the blob's wobble.
- The MAIN CHARACTER (Tino) is instantly distinct: grey double-breasted suit + gold tie + gold oil-can pin; nobody else
  uses that grey + gold; keep his silhouette clean.
- Background people are busy: traders shouting / waving slips, workers turning wheels, passers-by reading and walking,
  cafe customers paying and chatting.
- The joke beats must READ: "Ninety percent full!" (the shout, lip flaps, the echo), "...believed them." (the tick
  without looking up, Tino's thumbs-up, a deadpan ~1 s hold), "The hardest-working oil in America." (the sweaty blob's
  brow wipe); the mystery beat (the lender's curious face reflected in the gold, the light turning late).

### PLACE & DETAIL (WORLD-EXT) — it must read as a 1960s New Jersey waterfront tank farm
- Life outdoors: gulls circling and gliding, steam wisps, a flag snapping, ripples on the harbour, a slow ship, drifting
  clouds; rain + splashes + puddle rings in the storm; pigeons and a passing car on the street.
- Industrial dressing: rivets, weld seams, rust streaks, spiral stairs with landings, catwalks, pipe runs with flanges
  and valves, oil drums, pallets, a tanker truck, the guard hut, chain-link + barbed wire, puddles with an oil sheen.
- Ground detail: gravel, oil stains, cracks, weeds at the fence, contact shadows under every prop. No empty flat areas.
- Colour: vivid but believable (cream tanks, red-orange rails, blue sky, gold oil); coloured shadows; strong noon
  contrast; dawn gold; storm grey-blue.

### INTERIORS & LIGHT (WORLD-INT)
- Lived-in clutter in every room (see the interior list); practical light pools (lamps, windows); correct light for
  every place and time, shadows always present (the bible's section 6 palettes); the cutaway is a clean diagram (no
  clutter) but with bubbles and caustics so the water lives.

### CAMERA, COLOUR, POST (CAM + POST)
- Camera like the references but at the user's pace: smooth bell glides, low / eye-level angles, at most one gentle
  move per framing, match dissolves; DOF on MS / CU; correct exposure; grades that keep colours rich and correct (no
  muddy or washed frames). Current contract peaks (camMotion, px per video frame at 1080x1920): shot 12 crane up ~103,
  shot 13 follow ~83, shot 4 crane down ~76, shot 1 pull-out ~46, shot 7 push ~36; CAM should bring every peak toward
  <= ~60 without shortening any hold.

### ROUND 2+ directive (user, 2026-11-10, after seeing the antitheft round-1 previews)
The user liked the round-1 detail and asked for MORE: "if you can make it more better and detailed, that would be
amazing". Every fix round must ADD detail and life on top of the audit fixes: more props and set dressing per frame,
layered foreground / midground / background, ground clutter, busier background people, more wind / steam / rain /
particles outdoors, richer interior clutter and light — without hurting readability of the story beats, faces and
boards.
