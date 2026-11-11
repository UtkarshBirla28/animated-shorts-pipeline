# BUILD PLAN — "The Anti-Theft Sign That Made People Steal" (comp `AntiTheftShort`, 1080x1920, 30 fps)

Real video for the user's channel. Story, characters and voice are OUR OWN. Style target: `study/CHANNEL_STYLE_BIBLE.md`
(measured from 16 reference shorts; never copy their characters/shots, never name the channel). Facts: `sound/antitheft/SCRIPT.md`.
Pipeline knowledge: `study/REPO_KNOWLEDGE.md`. Template code we start from: `src/videos/bridge/` (the repo's sample short).

## Files and owners (each agent edits ONLY its own files)
| Owner | Files | Job |
|---|---|---|
| LEAD (orchestrator) | `plan.ts`, `story.ts`, `world.ts`, `words.ts` (generated), `ctx.ts`, `BUILD_PLAN.md` | contract, shots, cameras, DOF, kicks, integration |
| WORLD-EXT | `sets_ext.ts`, `paint.ts` | badlands terrain, petrified logs, paved trail + rail, vegetation, rocks, every exterior sign / plaque / counter / chip / stamp |
| WORLD-INT | `sets_int.ts`, `lights.ts`, `shade.ts` | classroom, night storeroom, blueprint space; all 9 light states + lamp/window pools |
| CHAR | `toon.ts`, `cast.ts`, `cardshade.ts` | every character design + pose + expression, staging per shot, thought bubbles, FX cards |
| POST | `AntiTheft.tsx`, `Captions.tsx`, `ink.ts`, `grade.ts`, `lensblur.ts` | captions to spec, ink tint/width, per-light grades, composer |
| AUDIO | `sound/antitheft/audio/*` | original playful score, SFX on actions, mix to -14 LUFS |

Contracts: anchors live in `plan.ts`; timing lives in `story.ts` (`SHOTS`, `BEAT`, `lightAt`, `camAt`, `dofAt`, `TOTAL`);
per-frame context `SetCtx` (`ctx.ts`) is passed to `Exterior.pose()` / `Interiors.pose()`; the cast API is
`stage(id, f, cam: CamInfo, L: LightState): Stage` (`cast.ts`). Need a new anchor? Add it to your own file as a local
constant derived from plan.ts anchors and say so in your report; do not edit plan.ts/story.ts (tell the LEAD).

Everything is a pure function of (shot id, frame): no clocks, no randomness without a fixed seed, no `useFrame`.
three is pinned at 0.175 (shade.ts / cardshade.ts string-patch shader chunks). Keep every pixel size relative to
1080x1920. Canvas text must be drawn with a font that exists in headless Chrome on Windows (Georgia, "Times New Roman",
Arial, Impact, "Arial Black", Verdana, Tahoma, "Courier New", "Trebuchet MS", or the loaded CapMontserrat). Signs that
must be READ use unlit (MeshBasic) faces so the side sun never greys them out; letters >= 40 px tall on screen.

## Global look (from the style bible, section 13)
- Sets: low-poly 3D with hand-painted Canvas2D textures; coloured shadows (never neutral/black); fog colour = horizon colour.
- World ink: ~3 px at mid distance (2-4; up to 8 on near props), tinted dark (wood brown #2B1A12, night navy #1A1D40,
  general plum #2A1A26); none on clouds, terrain silhouettes far away, sky.
- Characters: flat bean-head cards, head ~30 % of height (3.3-3.5 head-heights), no neck, no nose, no ears; face fill
  off-white #F8F3EE; dot eyes #2A2030 (default half-lid), thick acting brows; outline dark plum #2C1E2A drawn into the
  art, thin (lit) side ~2-2.5 % / thick (shadow) side ~5-6 % of head width (w0 ~3.5-4u); one saturated body colour +
  one signature item each; stick limbs, ball hands; scene-light tint + soft lavender far-side gradient + 2-4 px pale
  key-side rim; contact blob under the feet. Expression swaps in 1 frame, held >= 6 f, 0-3 f before the word.
  No mouth movement on narration — lip flaps ONLY on the whisper line (3 shapes, 2-5 f each).
- DOF on ~1/3 of screen time (MS/CU/inserts), wides sharp, sign text sharp enough to read.
- Captions: handled by `Captions.tsx` (do not draw any screen-space text anywhere else).
- Light states change on beats; the pivot (shot 11) is a new colour world.

## Characters (wardrobe = one body colour + one signature item; generic cartoons, no real likenesses, no logos)
| id | who | design |
|---|---|---|
| woman | the honest woman (fiancée; NEVER named, NEVER shown taking a rock) | bright teal sundress (#1FA6A0 class), big straw sun hat (#E9CF8F crown, wide brim) with a yellow band (#F2C230), camera on a strap across her body; default half-lidded calm eyes; SHIFTY side-eye on "steal" (shot 1); whisper pose: leans toward the fiancé, one hand raised beside her mouth |
| fiance | the grad student (NEVER named) | mustard-yellow T-shirt (#D9A21E) with a plain open-book icon (no logo), round glasses, backpack straps, khaki hiking shorts; goggle-shock eyes + light-blue sweat drop on "now" (shot 5) |
| prof | Professor Cialdini (generic, respectful, NOT a likeness) | grey hair (#B9B9C2) swept back, olive field vest (#6E7A3A) over a light-blue shirt (#A9CBEA), clipboard; calm confident; only in shot 7 |
| asst1, asst2 | research assistants | khaki vests (#C2A878), bucket hats (#8C7A52 / #5E7F6B), one holds a stopwatch reading 2:00:00, one holds tally sheets; kneel to place chips (shot 8), swap a sign panel (shots 8-9), scoop chips (shot 14) |
| tourist (crowd) | tourists, adults only | orange Hawaiian shirts (#F07A2A with paler flower print), red caps (#D8342C) or sun visors, cameras; the pocketing gesture = hand to the hip pocket with a sideways glance |
| ranger | background only | flat-brim ranger hat (#9C7A45), green shirt (#4E7A4A), NO patch, NO arrowhead logo |
| teacher | classroom | cardigan (#8A5A9E), glasses, chalk; writes on the board |
| student | the honest student, front row | neutral uniform (#5C7FA8 sweater / white collar), neat bowl cut (#3A2A1E), pencil behind the ear; shifty eyes on "everybody cheats" (mirrors the hook) |
| students | other pupils | neutral uniforms, seen from behind / side |
| raven | background gag on the trailhead sign | glossy blue-black bird card (#1E2233 with #3B4A7A sheen), yellow-grey beak; perched on the board's top edge (TH.ravenPerch); turns its head in 1-2 f snaps |
| clerk | thought bubble only (shot 1) | office clerk with a tie, surprised goggle eyes |

## Shots (frames come from story.ts; `BEAT.x` = the frame the word x starts)
Every shot change is a 7 f cross-dissolve (9 f into 10 and 16). Shots exist during their dissolve too (s.a - 4 .. s.b + 4).

| # | set / light | what we see (camera = LEAD; everything else = owners) |
|---|---|---|
| 1 | trailhead / noon | FRAME 0: centred medium shot of the woman reading the big brown warning sign on two posts; FULL TEXT readable. `BEAT.paperclip`: a thought-bubble card above her shows her handing a single paperclip with a tiny gift bow back to a surprised office clerk (bubble pops in 1-2 f, holds, out by `BEAT.wanted`). `BEAT.steal1`: her eyes swap to shifty side-eye; the sparkly rainbow rock at `TH.glintRock` glints (4-point star sparkle card, 8-12 f); the camera snap-pushes into the rock (fly-through feel into the next shot). Desert wind; soft "ding" on the glint. |
| 2 | vista / noon | smooth crane glide over the painted badlands: rounded hills striped purple / grey / blue (Blue Mesa style), dusty red-tan floor, low sagebrush + juniper, huge blue sky with puffy lavender-bottomed clouds; giant petrified logs broken into round slices like a sliced sausage, rainbow-quartz cut faces (red, orange, yellow, purple) with bark-brown edges; the paved trail with a low metal rail; tourists walking. |
| 3 | vista / noon | MS of a tourist at a sliced log (VISTA.pocketTourist). The rail plaque `VISTA.plaque` reads "TREES OVER 200 MILLION YEARS OLD" (it replaces the narration line that was cut). `BEAT.pocketing`: he slips a small rainbow chip into his hip pocket while looking around (eyes left-right). Gravel footsteps, a camera shutter. |
| 4 | trailhead / noon -> dim | "So the park put up a warning:" low wide of the sign (raven on top), then a push into the text as it is read. Sign text (in-world, routed cream letters on brown): "YOUR HERITAGE IS BEING VANDALIZED EVERY DAY BY THEFT LOSSES OF PETRIFIED WOOD OF 14 TONS A YEAR, MOSTLY A SMALL PIECE AT A TIME." Light dims ~20 % on `BEAT.vandalized` (lights). `BEAT.tons14`: the flip counter on the left post (`TH.flip`) flips its cards to "14 TONS / YEAR" (counter shows "-- TONS / YEAR" before; 2-3 f per flap). |
| 5 | trailhead / noon | close two-shot: `BEAT.leaned` she leans to her fiancé (lean ~8-12 deg toward him, hand by her mouth from `BEAT.whispered`); lip flaps ONLY during the whisper line `BEAT.whisper`..`BEAT.nowEnd`; `BEAT.now`: fiancé goggle-shock eyes + sweat drop. Background gag: the raven on the board top turns its head toward them (snap, ~`BEAT.whisper`). |
| 6 | trailhead / noon -> late | mystery: slow push-in on the sign; in-shot relight noon -> late afternoon (60 f); the couple still in front reading. Music turns curious; one woodblock tick on `BEAT.honest`. |
| 7 | trails / morning | early morning, low golden sun. Professor at TT + [1.8, 0, 2.4] with his clipboard, calm nod on `BEAT.testedIt`; the three trail heads, marker posts and the two sign posts behind him. Pen scratch. |
| 8 | trails / morning | low along the LONG LOGS path: two assistants kneel and place rainbow chips, each with a small white paint dot (`BEAT.marked`); one holds a stopwatch reading "2:00:00" (click), tally sheets on the ground; `BEAT.trails`: the three wooden marker posts read JASPER, LONG LOGS, CRYSTAL (routed letters); `BEAT.swapping`: an assistant lifts a sign panel off the Sign A posts and swaps it. |
| 9 | trails / morning | the two signs side by side. Sign A (at the JASPER head): "PLEASE DON'T REMOVE THE PETRIFIED WOOD FROM THE PARK." + picture: ONE visitor taking wood with a red circle-and-bar over his hand. Sign B (at the LONG LOGS head): "MANY PAST VISITORS HAVE REMOVED THE PETRIFIED WOOD FROM THE PARK." + picture: THREE visitors taking wood. Camera on A at `BEAT.oneSaid`, trucks to B at `BEAT.another`. |
| 10 | trails / noon | results: an LED counter above each sign reads "PIECES MISSING" + a % value. Sign A's rolls up to "1.67%" landing on `BEAT.pct2`; under Sign A one tourist reaches for a chip, sees the red bar on the sign, and puts it back. Sign B's rolls up to "7.92%" landing on `BEAT.pct8`; under Sign B a crowd of tourists all pocket chips at once (like a group activity). Counter clicks; a cash-register "cha-ching" on `BEAT.pct8`. |
| 11 | blueprint / blueprint | pivot "You see," — cross-dissolve into a cool blue blueprint space (grid lines, chalky white lines). One bean-head person stands on a path facing a fork with two arrows: "THE RULE" (one tiny figure on it) and "EVERYONE ELSE" (a huge crowd). `BEAT.copyEach`: the person walks off after the crowd. `BEAT.manySteal`: the "MANY PAST VISITORS" sign panel floats in and settles at `BP.signFloat`. `BEAT.everyone`: its picture of three thieves multiplies into dozens (thief figures pop out and spread, 2-3 per frame). |
| 12 | classroom / classroom | warm classroom, wooden desks, green chalkboard. The teacher (glasses, chalk) writes "HALF THIS CLASS CHEATED." letter by letter from `BEAT.teacher` to `BEAT.cheated` (chalk squeak). The honest student in the front row (bowl cut, pencil behind ear): `BEAT.everybody` thought bubble of a little crowd of cheating stick figures + her eyes go shifty (mirrors the hook). |
| 13 | trails / sunset (backlit) | back at Sign B at golden sunset, backlit (sun behind the sign). `BEAT.permission`: a giant rubber stamp slams "PERMISSION GRANTED" (red ink, slightly rotated) across Sign B's face; stamp lifts away after ~10 f; the camera kicks (story.ts). Stamp thump. |
| 14 | storeroom / night_int | park back room at night (blue) with a warm desk lamp: messy shelves, a wooden crate labelled "CONSCIENCE PILE" heaped with rainbow rocks, opened envelopes, parcels with stamps, letters reading "SORRY!", "I'M RETURNING THIS", "PLEASE FORGIVE ME". An assistant scoops chips from the pile into a bucket marked "BAIT" (`BEAT.pieces` .. `BEAT.apology`). Paper rustle; a mailbox clunk on `BEAT.mailed`. |
| 15 | trailhead / dusk | the trail at dusk: a tourist (TH.tourist) pockets one chip; a tiny tag on the chip reads "TIMES STOLEN: 1" and flips to "2" on `BEAT.twice` (one bright "ding"). Music ends on the last word. |
| 16 | trailhead / noon | loop button (silent but for desert wind): a short slow pull-back that lands EXACTLY on frame 0 (P0) on the last frame: the woman reading the warning sign, same pose/expression as frame 0. |

## Exterior details (WORLD-EXT)
- Terrain: ~1.2 km square. Near the trails (|x|, |z| < ~70 m around TH, VISTA, TT) the ground is flat-ish dusty red-tan
  desert floor (#C98E62 / #D7A57A with darker grit, pale gravel); beyond, rounded badlands mounds 6-35 m high with
  horizontal colour bands (lavender #9C8AB8, grey-blue #8FA3C4, slate #6F7FA6, cream #E6D6C0, rust #B9735A) that follow
  height (stripes), soft erosion streaks; a few flat-topped mesas on the horizon. Keep the camera paths in story.ts clear.
- Petrified logs (VISTA.logs + a few near TH and TT): broken into round slices with small gaps, each slice slightly
  rotated/tilted; bark side brown/grey-brown with cracks (#7A5A44, #5E4636); cut faces rainbow quartz rings (red #C84A3A,
  orange #E8893A, yellow #F2C64A, purple #8A5AA8, white crystal flecks). Loose chips (5-15 cm) scattered near them.
- Paved trail: pale grey-tan asphalt ribbon (#B7AEA2) along VISTA.trail and from TH toward -z, and three short trails
  from TT's heads; low metal rail (posts every 2.5 m, two tubes, dark green-grey #4E5A52) on the trail's west side.
- Vegetation: sagebrush (grey-green #8FA08A tufts) and junipers (dark olive #4F6A3C) — recolour Kenney bushes/trees.
- Main warning sign (TH): brown routed-wood board on two posts (posts and frame dark brown #5A3A22, face #6B4426 with
  wood grain), cream routed letters (#F1E2C0), 6 lines, readable; small "!" warning triangle at the top is OK.
  Flip counter (TH.flip): split-flap box, dark grey with white flap cards: "14 TONS / YEAR" (before `BEAT.tons14`
  the number shows "--"; flaps flip 2-3 f each).
- Plaque (VISTA.plaque): small brown interpretive plaque on the rail: "TREES OVER 200 MILLION YEARS OLD" (+ tiny
  "LATE TRIASSIC").
- TT: three trail heads with routed marker posts JASPER, LONG LOGS, CRYSTAL; Sign A and Sign B panels (cream face,
  brown text, the pictograms described in shot 9, simple park-sign figures); LED counters above each (black box, red/amber
  LED digits "PIECES MISSING" + value: rolls 0.00% -> 1.67% (A) and 0.00% -> 7.92% (B), counting up over ~20-30 f,
  landing on the BEAT frame; show the final values from then on, and "0.00%" before shot 10).
- Chips with white dots along the LONG LOGS path (TT.chipZ), visible in shots 8-10 (fewer under Sign B after its crowd
  pockets them in shot 10).
- Stamp (shot 13): a giant wooden rubber stamp (handle + block, ~0.9 m) falls onto Sign B's face at `BEAT.permission`
  (fall 4 f, squash 2 f, hold 6 f, lift 8 f); a red "PERMISSION GRANTED" stamp mark (rotated ~-8 deg, rough ink edges)
  appears on the sign face at the impact frame and stays.

## Interior details (WORLD-INT)
- Classroom: wooden floor, cream walls with wainscot, windows with warm daylight, 6 desks, the green chalkboard with chalk
  dust; chalk text written progressively (white chalk script, "HALF THIS CLASS CHEATED.").
- Storeroom: night window (deep blue), shelves with boxes, the CONSCIENCE PILE crate (stencilled letters), heaps of rainbow
  rocks, envelopes/parcels/letters with readable notes, desk with a warm lamp (emissive bulb > 1.0 so it blooms), the BAIT
  bucket; warm lamp pool vs blue night shade.
- Blueprint: deep blue (#1E4F9C -> #163E86) floor + backdrop with a faint white grid (1 m), chalky white path lines, the
  fork and two big flat arrows with labels "THE RULE" (thin, lonely) and "EVERYONE ELSE" (wide); everything unlit/emissive
  white-on-blue; the floating "MANY PAST VISITORS" panel (same art as Sign B) flies in on `BEAT.manySteal`.
- Lights: tune all 9 states in lights.ts (see plan.ts comments); add warm point-light pools (desk lamp, classroom windows)
  to the two-tone shading if you can, or fake them with the key direction + emissive.

## Sound events (AUDIO) — read frames from story.ts BEAT / SHOTS (export them to JSON with a small node script)
desert wind bed on exteriors (noon/late/dusk), ding (glint, `BEAT.steal1`), gravel footsteps + camera shutter (shot 3),
flip-counter flaps (`BEAT.tons14`), raven caw? (no — keep it silent, just the head turn), woodblock tick (`BEAT.honest`),
pen scratches (shot 7), stopwatch click (shot 8), counter clicks + cha-ching (`BEAT.pct8`), chalk squeak (shot 12),
stamp thump (`BEAT.permission`), paper rustle + mailbox clunk (`BEAT.mailed`), bright ding (`BEAT.twice`).
Music: original synth, playful and mischievous (light plucks + woodblock), curious on the mystery line (shot 6), small
swell on the final twist (shots 14-15), ends on the last word; ~-18 LU under the voice; no whooshes on plain dissolves.
Master -14 LUFS, true peak <= -2 dBTP.

## Safety
No NPS arrowhead/patches, no university logos, no police/arrests/fines, adults only in the tourist crowds, never name the
couple, the woman never takes a rock, Cialdini is a respectful generic cartoon, family-safe, never reference the channel.

## QUALITY BAR v2 — the user's direct requirements (2026-11-10). These override anything lighter above.
The user compares every frame with the 16 reference shorts: shadows and detail everywhere, correct light, good colour,
lively animation, a place that clearly IS the place. "Every shot should be very good; animation shouldn't look rigid;
everything should have life." The LEAD will audit every shot with scores (stills + 12-frame motion strips) and send
fixes back until each shot scores >= 8/10, so build to that bar now.

### LIFE (CHAR) — nobody and nothing is ever frozen
- Gaze: characters LOOK at what matters each beat (the sign while reading — eyes scan the lines left-right in small
  saccades; each other while whispering; the chip; the counter; the stamp). Heads tilt 3-8 deg toward the target.
- Expressions CHANGE on the beats (focal character every ~1.5-3 s): reading-neutral -> brows up at "vandalized" ->
  eyes widen at "14 tons" -> scheming smirk + shifty side-eye on "steal" / before the whisper -> etc. Swaps in 1 f,
  held >= 6 f, 0-3 f before the word. Reactions from listeners too (the fiance's shock, tourists' guilty glances,
  the professor's knowing nod, the student's eyes going shifty).
- Idle life on EVERY visible character every frame: breathing (torso/head 1-2 %, ~0.25 Hz), weight-shift sway (1-2 deg,
  ~0.3 Hz, per-character phase), small head bobs, blinks every 1.5-4 s (2-4 f) + a blink across each swap.
  Gestures: pointing at logs, lifting a camera to take a photo (small white flash sparkle), hands on hips, scratching head.
- Secondary motion: hat brims, the sundress hem, hair, camera strap and backpack sway with the WIND (same wind phase as
  the world), anticipation (2-4 f) before actions and a small overshoot after pose changes; walk cycles with bob + lean.
- The MAIN CHARACTER (the woman) must be instantly distinct: she alone wears saturated teal + the big straw sun hat with
  the yellow band; nobody else uses teal; keep her silhouette clean (no overlap), in focus, with a subtle key-side rim.
- Background people are busy: strolling, chatting (head turns), photographing logs, pointing, a ranger walking far off.
- The raven: hops, head-turn snaps, a wing ruffle; in the vista a pair of ravens circles high in the sky.

### PLACE & DETAIL (WORLD-EXT) — it must read as a desert national park
- Wind is visible everywhere outdoors: sagebrush / grass / juniper sway (vertex wind, phase by position), blowing sand
  wisps along the ground near the lens, a dust devil far off in the vista, a tumbleweed rolling through 1-2 shots,
  drifting clouds, heat haze on the far horizon at noon (subtle).
- Park dressing at the trailhead and the trail heads: a roofed info kiosk with a map board, "STAY ON TRAIL" and trail
  distance markers, benches, trash + recycling bins, a drinking fountain, a shade ramada (picnic shelter), a small
  paved parking lot with a few parked cars (Kenney car kit), a generic wooden park entrance sign reading "PETRIFIED
  FOREST" (no NPS logo) visible in the vista, rope/rail barriers, distant visitor-center building.
- Ground detail: pebbles, cracks, gravel edges along the paving, scattered petrified chips, small rocks, dry grass tufts,
  a lizard on a rock (tiny gag), contact shadows under every prop. No empty flat areas in any frame.
- Colour: vivid but believable desert palette (red-tan floor, purple/grey/blue banded badlands, deep blue sky, sage
  greens); coloured shadows; strong noon contrast; morning gold; sunset backlight with violet shade; dusk blue.

### INTERIORS & LIGHT (WORLD-INT)
- Lived-in clutter: classroom posters, a wall clock, globe, bookshelf, backpacks under desks, papers, a desk lamp and
  window light pools; storeroom: labelled boxes on shelves, a ranger hat on a hook, maps, a coffee mug, a wall
  calendar, a night window with a moon, dust motes in the lamp beam; blueprint: the diagram DRAWS ITSELF in (lines
  grow over 10-20 f as the narration names them), faint grid shimmer, chalk dust.
- Correct light for every place and time, shadows always present, practical light pools (lamp, windows) — the bible's
  section 6 palettes.

### CAMERA, COLOUR, POST (LEAD + POST)
- Camera like the references: always moving, smooth bell glides, low/eye-level angles, fly-throughs, match dissolves,
  follow-the-object; DOF on MS/CU; correct exposure; grades that keep colours rich and correct (no muddy or washed frames).

### VOICE (LEAD) — v2 in progress
- Natural, expressive delivery: per-line pace and pitch (excited lines up, serious lines down, key lines slower),
  correct pauses before punchlines and after "You see," — learned from the reference narrations (bible section 9).

### ROUND 2+ directive (user, 2026-11-10, after seeing round-1 previews)
The user liked the round-1 detail (desert park exterior, characters, interiors) and asked for MORE: "if you can make it
more better and detailed, that would be amazing". Every fix round must ADD detail and life on top of the audit fixes:
more props and set dressing per frame, layered foreground / midground / background, ground clutter, busier background
people, more wind / dust / particles outdoors, richer interior clutter and light — without hurting readability of the
story beats, faces and signs.
