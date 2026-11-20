# Audit of SCRIPT_v3_draft.md: truth, culture, length, buildability

Auditor, 2026-11-19. I did not write the draft. Nothing was rendered or played.
Draft audited: `C:/Users/utkar/Desktop/animated-shorts-studio/sound/pointing/script_v3/SCRIPT_v3_draft.md` (all 672 lines).

Also read: `judge_facts_production.md` (all), the "must fix" and "best elements" lists of the other two judges,
`BIBLE_NOTES.md` (all), `LEAD_DECISIONS.md`, `voice/NOTES.md`, `voice/_full/words.json`, `phrases.json` and
`voice_info.json` (every measured word, gap and inner silence), `voice/takes/picks.json` and `gen_log.jsonl` (the text,
tag and model of every reused take), `PLAYBOOK.md` section 8, `YOUTUBE_STUDY.md` 14C, and the kit notes that say what
is really built: `studio/src/videos3/pointing/cast/NOTES.md`, `studio/src/kit/rail/NOTES.md`,
`studio/src/kit/vehicles/NOTES.md`, `studio/src/kit/home/NOTES.md`.

## 0. Verdict

**FIX THEN LOCK. Score on this lens: 79 / 100.**

- Truth: every spoken fact is true. One line is a simplification that needs one sentence in the description
  ("two ways": the real test had four set-ups). One source in the fact table does not say what the table says
  (I read the JTSB report today; it is about a conductor, not a driver). Two pictures can mislead: the jars as
  staged read as "6 presses, 6 mistakes", and the driver says "Doors..." before any door is seen to move.
- Culture: clean. No Japanese text, no brand, the joke is on the tourist every time. Three small notes.
- Length: my line-by-line recount is **65.5 s** (range 64.6 to 67.3), not 64.75 s. Still under 66 s, with a thin
  margin. It cannot pass 70 s: the worst case I can build is 69.4 s uncut, and the script holds 6 to 7 s of cuts that
  touch no protected line.
- Buildability: all four places exist as sets and no new prop is needed, but the list of new acting is long, one
  framing in the hook (shot 2) does not fit the built car as written, and two gestures have less than 12 frames.
- Voice list: complete (25 of 25 lines). Two risks: the v3 line ids collide with the v1 ids that the build tools
  still use, and every recorded take is model `eleven_v4`, not "v3".

## 1. Sources I opened today

| source | result |
|---|---|
| Labour ministry safety glossary, https://anzeninfo.mhlw.go.jp/yougo/yougo72_1.html | Opened. The page is Shift_JIS; I decoded it and read the Japanese text. It says: a 1994 test by the Railway Technical Research Institute; wrong presses of an operation button 2.38 % with neither pointing nor calling, 1.0 % with calling only, 0.75 % with pointing only, 0.38 % with both; "about one-sixth". Section 2 gives the gesture: point with the right index finger while saying the item, bring the right hand back to the right ear, swing it down at the target on "Yoshi!". It also says pointing and calling cannot remove human error by itself |
| Wikipedia, "Pointing and calling" (raw text) | Opened. "pointing at important indicators and verbally calling out their status"; "It is especially common on Japanese railways"; "Gesturing at and verbalizing these indicators helps with focus."; "almost 85 percent when doing a simple task"; New York: "before opening the train doors, subway conductors are required to point to a black-and-white striped board ... every time when a train pulls into a station"; "implemented in 1996 after a series of incidents where doors opened in the tunnel" |
| nippon.com g02575 | Opened. "the error rate in confirmation operations falls to one-sixth"; "signals, the speedometer, track conditions"; "This sequence of actions focuses attention on one thing"; a conductor "uses pointing and calling to confirm door opening and closing" |
| Wikipedia, "E235 series" | Opened. "11 cars per Yamanote Line set"; capacity 1,628 |
| ja.wikipedia, JR East E233 series (raw text) | Opened. A 10-car set is rated for 1,582 people. The door chime sounds and the door lamp blinks in step with the doors opening and closing |
| Mental Floss 79767 | Opened. "required procedure is to point to it at every station before we open the doors" |
| JTSB report RI2015-3-1e (PDF) | **Opened and read (the draft and the fact judge could not).** It is about a JR Hokkaido sleeper express at Yakumo station on 17 May 2015. The CONDUCTOR "did not confirm properly both the car side pilot lamp and the indicator lamp showing all doors were closed in the conductor room in the 5th vehicle". It says nothing about a driver's cab lamp or a driver's call |
| ja.wikipedia, 鉄道合図 (railway signals between crew), section 知らせ灯式 | Opened. On JR East the DRIVER confirms that the pilot lamp in the cab is lit (it shows all doors are closed), and that counts as the conductor's departure signal. The lamp can be amber, white or green |
| ja.wikipedia, 車側灯 (car-side lamp) | Opened. The red car-side lamp stays lit while a door is not closed |
| ja.wikipedia, 日本の鉄道信号 | Opened. Signals stand above or on the left of their track. The lamp order of a three-lamp signal is shown only in diagrams; Wikimedia Commons refused my request for the diagram files (HTTP 429), so the lamp order stays UNVERIFIED |

Not opened by me: the Hyman et al. 2010 paper (it is only in the fact table, not in any public text).

## 2. Every claim, graded

TRUE = the source says it. OVERSTATED = stronger or looser than the source. FALSE = wrong. UNVERIFIED = no source I
could open says it. "Story" = an event about our made-up characters.

### 2.1 Spoken lines

| id | line | grade | note |
|---|---|---|---|
| n01, n02 | "His bag is on that train." / "He is not." | story | |
| n03 | "All he did was laugh... at a finger." | story, a little unfair to the facts of the story | he also parked the bag in a doorway. The fact judge passed it as a hook line. Keep |
| d01 | "Signal... green!" | TRUE as dramatized English | drivers call the signal's aspect in Japanese. The description says the English is ours |
| t01 | "He's pointing at nothing!" | FALSE on purpose, said by the doubter | fine only if the viewer can SEE the green lamp. At the kit's size the lamp is about 5 px wide (blocker 6) |
| n04 | "But that driver has a thousand people behind him." | TRUE | 10-car E233: 1,582 (ja.wikipedia). 11-car E235: 1,628 |
| n05 | "So he checks with a finger and a shout." | TRUE, "shout" is a loose word for a clear call | the description says "call out". Keep |
| n06 to n10, t02 to t07, k01 | the story lines | story | no world claim in any of them |
| d02, d03 | "Doors... closed!" (the driver) | TRUE as a check, dramatized as a spoken call | ja.wikipedia 鉄道合図: on JR East the driver confirms the lit door lamp. That he says it out loud with a point is normal practice but is in no source we can cite. Do not claim it in the description (it does not) |
| n11 | "You see, his eyes looked right at it. His mind was on his phone." | story | no general claim. Good |
| n12 | "Japan's railway lab ran the same test two ways." | TRUE, but SIMPLIFIED | the lab ran it FOUR ways (neither, calling only, pointing only, both). The film shows the first and the last. Blocker 2 |
| n13 | "For every six mistakes people made just looking... pointing and saying it out loud: about one." | TRUE | 6 x 0.38 / 2.38 = 0.96. It is a ratio, as the lead ordered |
| n14 | "A finger and a shout drag your mind back." | TRUE (a figure of speech) | ministry page: it raises the level of awareness and makes checks more accurate. The line promises nothing more |

The narrator never says the driver points at nothing. Checked in the main hook and in the alternate.

### 2.2 Pictures and on-screen text

| picture | grade | note |
|---|---|---|
| captions "1,000", "6", "1"; no percent chip | TRUE | |
| the gesture: point on the name, hand back by the ear, snap on the status word | TRUE for the standard form | ministry page section 2, read today |
| the glove points at the speedometer (n05) | TRUE | nippon.com lists the speedometer |
| door order: doors meet, red side lamps go out, then the call | TRUE | ja.wikipedia 車側灯 and 鉄道合図. The JTSB report is the wrong source for the cab part (blocker 1) |
| the cab's small door lamp: dark with doors open, amber when closed | TRUE | ja.wikipedia 鉄道合図 names amber as one of the real colours |
| d03: the driver says "Doors..." in the cab at 57.80 s; the first door is seen moving at 58.55 s | **misleading as staged** | the chime at 57.45 s is sound only. With the sound off the caption "DOORS..." sits on the driver and THEN the doors shut: it reads as his order. Blocker 3 |
| the jars: six presses, six red balls; one point and call, one ball; "the same small press counter" | **OVERSTATED as a picture** | it reads as 6 mistakes in 6 tries against 1 in 1. The only thing that says "same number of tries" is a small counter. Blocker 4 |
| the counter number "250" (open question 1) | UNVERIFIED (made up) | the source gives rates, not a count of tries. 250 fits the real rates (5.95 and 0.95) but it is our number. Do not print it |
| p02: "The lamp above the door is steady" | UNVERIFIED | the only checked fact is that it blinks while the doors move. The train kit lights it while the doors stand open; nobody has checked that. Keep it out of frame (improvement 1) |
| the far green signal as a dot on the left | TRUE; lamp order UNVERIFIED | fine while only one glowing lamp can be seen |
| the lab box with one lamp and three buttons | dramatized | the source says only "operation button". The description should say the jars are our picture |
| the suitcase seen behind a door window | stylized | the shell is 0.83 m tall. It shows behind the glass only if the door glass starts low. On real JR cars the glass starts at about waist height (my estimate, not checked). The train owner already plans "tall clear door windows" |
| 1,067 mm gauge, driver on the left, signals on the left | TRUE | |

### 2.3 Title, description, pinned comment, poll, alternate hook

| text | grade | note |
|---|---|---|
| title "Why Japanese Train Drivers Point at Nothing" | false as a plain statement, kept by the lead as the question the film answers | the description's second sentence corrects it in words. The film corrects it only through "Signal... green!" and the green lamp, so the lamp must be readable (blocker 6) |
| "Dramatized cartoon. The tourist, the boy and the suitcase are made up." | TRUE | add "The jars are our picture of the numbers." |
| "Japanese train drivers point at signals and gauges and call out what they see." | TRUE | |
| "The real calls are in Japanese; the English ones here are ours." | TRUE | |
| "In a 1994 test by Japan's Railway Technical Research Institute, people pressed the wrong button 2.38% of the time when they only looked, and 0.38% of the time when they pointed and said it out loud." | TRUE | "only looked" is a fair way to say "neither pointing nor calling" |
| "That is about one mistake for every six." | TRUE | the page says "about one-sixth" |
| the four source links | all open, all say what is claimed | the film's train has 10 cars; the 10-car figure (E233, 1,582) fits better than the 11-car E235 |
| "The same science with a clown" | OVERSTATED | the clown film is about looking without seeing (Hyman 2010). The railway test is about checking errors. The draft's own fact table says they are not the same finding. Improvement 2 |
| pinned 1: "New York subway conductors point too. At every station they must point at a black-and-white striped board before they open the doors." | TRUE | Wikipedia and Mental Floss, both read today. No year, no tunnel claim. Good |
| pinned header "Two true things" + item 2 (the stove tip) | OVERSTATED header | item 2 is a question and a tip, not a fact. Nobody tested stoves. Improvement 3 |
| day-2 poll | no claim | |
| alternate hook: "He points down an empty track." | TRUE as stated | he points along the line and no train is on it. The lamp at 1.30 s and "Signal... green!" correct the hint |
| alternate hook: T "He's pointing at nothing!" | FALSE on purpose, by the tourist | as the lead ordered |

## 3. Culture guards

| guard | result |
|---|---|
| no Japanese text, no logos, no brands; "NEW YORK" on the shirt is the only word | pass. Jar labels are icons, the vending machine is plain, prices are digits |
| the joke is on the tourist only | pass. The sleeping salaryman and the late salaryman are life, not punch lines. Keep music stings off them |
| no eating, makeup or phone calls on the train | pass |
| nobody rushes the doors | pass |
| the tourist stays behind the yellow line, never touches the train, never walks beside it | pass in the text. Check shots 13, 16 and 20 on the storyboard: he films the cab from the platform and stands "in front" in the knee-high shot |
| the tourist is never rude to staff | pass, with two notes. (1) "a jab of his finger at the glass" (7.3 s): the finger must stop short of the glass, with no tap sound. Knocking on a cab window is the one thing here that reads as rude. (2) t05's direction says "stiff, fake-deep, too loud": add "never a put-on accent" |
| the boy is with his mum | partly. She is named in 5 rows. In p01 (35.45 s) a six-year-old "steps up" to an open train doorway alone. Keep her hand on his shoulder or backpack in that shot |
| original departure melody, no pastiche | pass |
| the thumbs-up to the cab | the culture guard text relies on it, but it has 0.25 s on screen (blocker 5) |

Logic note that touches culture: nobody in the car, not even the mum, reacts to a bag left in a doorway. The draft
admits this (10.4 item 5). One silent look from the mum at the bag and then at the tourist's back (in shot 12, where
she now looks "down the car") would close it at no cost in time.

## 4. Length, line by line

### 4.1 Method

I used the real v1 track, not a flat rate. From `voice_info.json`: James's 13 lines are 147 syllables in 37.99 s
with their inner pauses (3.05 words/s), or 0.237 s per syllable without them. Short landed lines are slow: "The
doors." 0.91 s, "No board? No doors." 1.67 s, "Japan's railway lab tested it." 2.03 s.

One measured number in the draft is wrong. Section 4.1 says the first clause of n13 ("For every six mistakes people
made just looking...") is "word for word the same as a measured v1 clause (2.40 s)". `words.json` ends "looking..." at
45.495 s, but that is the word-end bug named in the first lines of `voice/NOTES.md` ("opening" / "looking" end at the
dip before "-ing"). `voice_info.json` puts the true silence after "looking..." at 45.78 s. The clause is
45.78 - 43.095 = **2.69 s**, not 2.40 s.

### 4.2 The table

| id | words | draft (s) | mine (s) | basis |
|---|---|---|---|---|
| n01 | 6 | 1.65 | 1.65 | six one-syllable words; v1 "So he points at the speed." took 1.78. Fine, +/- 0.15 |
| n02 | 3 | 1.10 | 1.10 | v1 "New York does." 0.99 |
| n03 | 8 | 2.35 | 2.35 | with the pause cut to 0.15 in silence |
| d01 | 2 | 1.45 | 1.455 | measured take 1.335 + 0.12 of added silence |
| t01 | 4 | 1.55 | 1.55 | v1 "Bro's pointing at nothing!" 1.57 |
| n04 | 9 | 2.85 | 2.85 | v1 "He's got over a thousand people behind him." 2.32 for 12 syllables |
| n05 | 9 | 2.60 | 2.60 | v1 "A finger and a shout" 1.51 |
| n06 | 2 | 0.85 | 0.85 | v1 "The doors." 0.91 |
| n07 | 6 | 1.85 | 1.85 | |
| n08 | 6 | 1.80 | 1.80 | |
| t02 | 2 | 0.95 | 0.95 | new line |
| d02 | 2 | 1.43 | 1.425 | measured |
| t03 | 5 | 1.67 | 1.67 | v1 take 1.935 minus "bro?" 0.275 |
| n09 | 2 | 0.85 | **0.95** | three syllables, not two |
| t04 | 4 | 1.55 | 1.555 | measured |
| n10 | 2 | 0.85 | 0.85 | |
| t05 | 3 | 1.87 | 1.86 | measured (probe span of `ch_t04/t2`) |
| t06 | 4 | 1.30 | 1.30 | new line with a laugh tag; could be 1.5 |
| n11 | 14 | 4.35 | 4.35 | v1 "You see," 0.50, "your eyes can look right at something" 2.00 |
| n12 | 9 | 2.75 | **3.00** | v1 "Japan's railway lab" alone is 1.37 s. "ran the same test two ways" is six stressed one-syllable words, at least 1.6 s |
| n13 | 16 | 5.54 | **5.83** | first clause 2.69 measured (see 4.1), 0.30, "pointing and saying it out loud" 1.74 measured, 0.30, "about one." 0.80 |
| n14 | 9 | 2.85 | **2.97** | v1 measured 2.835 up to "back" inside a longer line; as the last word it is longer |
| d03 | 2 | 0.64 + 0.57 | 0.645 + 0.575 | measured, with 1.31 s of silence between |
| k01 | 2 | 1.30 | 1.305 | measured |
| t07 | 2 | 1.52 | 1.515 | measured |
| **speech** | 133 | 48.04 | **48.81** | (the draft's 47.44 leaves n13's two inner pauses in the pause list) |
| pauses between lines, lead 0.07, tail 0.10, the 1.31 inside d03 | | 16.71 | 16.71 | the pause plan in 4.2 of the draft; I checked every pause against the row times and they all match |
| **film** | | **64.75** | **65.52** | |

Word count checked: 133 (narrator 101, tourist 24, driver 6, kid 2), 25 lines. The 22 framings add up to 64.75 s.
Cross-check: at James's measured overall pace of 3.05 words/s (inner pauses included) the film is 65.6 s.

**My honest length: 65.5 s. Range 64.6 to 67.3 s** (narrator 3 % either way; the four new tourist lines up to 0.6 s
longer). Roughly one build in three will pass 66 s and need the cut order.

### 4.3 Do the pauses hold the pictures?

They do, with four exceptions:

1. **33.00 to 33.25 s (shot 13).** A thumbs-up toward the cab AND a turn of the phone onto himself, before
   "Vending machine..." starts at 33.25 s. That is 7 frames for two gestures. The rule is 12 frames each. Blocker 5.
2. **61.10 s (k01).** The boy "pushes his cap up and does the full point", with one hand on the suitcase handle, and
   "Bag..." starts on the cut frame. The cap push has 0 frames. Blocker 5.
3. **22.05 to 22.80 s (the plant).** The doors go from fully open to shut in 0.75 s. In the payoff they take about
   1.3 to 1.65 s (the kit's door cycle is 1.6 s). The plant is meant to be "the exact picture, sound and order the
   payoff reuses". Improvement 5 fixes it with no added time.
4. **62.40 to 62.85 s (shot 21).** "At the right frame edge the tourist's shoulder comes into view ... his grin
   drains". If only his shoulder is in frame, nobody sees the grin drain. Improvement 6.

Fine as timed: the rescue (3.85 s), the bag plant (4.2 to 4.7 s of picture), the look in shot 15 (0.4 s head turn,
0.7 s look, line, turn back), the last shot (arm up 18 f, to the ear 14 f, forward 18 f, ending two frames short of
frame 0 exactly as written).

### 4.4 What to cut, and the 70 s guarantee

The plan is under 66 s, so nothing must be cut now. Because the margin is 0.5 s, change the order of the cut list in
the draft's 4.3 so the free cuts come first:

1. Trim the N pauses: "do?" 0.53 to 0.35, "phone." 0.45 to 0.30, "nothing!" 0.30 to 0.20, inside n11 0.57 to 0.40.
   **Saves 0.70 s. Costs nothing.** Do this now and the plan is back at 64.8 s.
2. n12 becomes the recorded v1 line "Japan's railway lab tested it." **Saves about 0.95 s** (3.00 to 2.03). It also
   removes the "two ways" simplification and the hard "railway lab ran" cluster.
3. t05 "Vending machine... check!" becomes a silent stiff mock point of 0.9 s. **Saves 1.5 s** (the whole shot: 2.45 s).
4. n05 and its shot. **Saves 2.9 s.**

Total on the shelf: 6.1 to 7.0 s. None of it touches the lead's protected lines.

**Can it pass 70 s? No.** Worst case: James at 2.8 words/s for all 101 words (slower than any measured line group)
gives 68.6 s, plus 0.8 s if all four new tourist lines run long: 69.4 s uncut. The cut list then brings it to 62.4 s
or less. Add one line to the build: refuse any assembly over 70.0 s, and apply the cut order to any assembly over
66.0 s. No time-stretch is planned anywhere: the only edits are silence added inside d01 (+0.12 s) and d03 (+0.98 s)
and pauses trimmed in silence.

### 4.5 The opening floor (lead decision 8)

On an average take: the 9th word ("not") starts at 2.42 s, the 14th ("laugh") at 4.10 s, the longest gap is 0.15 s,
the narrator starts at 0.07 s. A slow first sentence (1.9 s, like v1's "So he points at the speed.") still puts "not"
at about 2.8 s. It fails only if James reads "His bag is on that train." at under 2.6 words/s, and the recording gate
in the draft's 1.2 catches that. **Pass.**

## 5. Can it be built?

Places: the cab, the car, the Tokyo platform and the lab jars all exist as sets (`videos3/pointing/sets/`). No new
place, no new prop. The move library already has `stun`, `hook`, `lunge`, `wag`, `urgent`, `capDrop`, `frown`,
`proud`, `deadpan`, `call` in driver / kid / mock styles, and the suitcase rolls and tilts by itself.

### 5.1 Each framing: what is new and how hard

| shot | time (s) | new framing, pose or animation | how hard |
|---|---|---|---|
| 1 + 22 | 62.85 to 3.05 | one platform camera across the loop. The train must be at the same place on both sides of the seam, so every time-driven part of the platform set (train run, cast beats, dust, birds) needs a time offset for shot 1. New card work: straight-arm point across the chest, hand by the ear, a slow limp version of `call` | medium to hard. The seam is the risk |
| 2 | 3.05 to 4.45 | a face-matched close-up of the tourist inside the car, then a sink to the suitcase and the boy, in 1.4 s | **hard. Does not fit the built car as written (blocker 7)** |
| 3 | 4.45 to 7.20 | the old s05 camera with new blocking (the track ahead). The built orbit is 50 degrees and the driver reads as a three-quarter back view, not a true profile. The cab still has the "flat green wall behind the windscreen" bug in the train owner's log | medium |
| 4 | 7.20 to 9.00 | two-shot at the cab glass; five things in 1.8 s (laugh, jab, the boy's three-part copy, the glove and dot through glass, the suitcase) | medium |
| 5 | 9.00 to 12.10 | a forward glide over a packed car that sinks to knee height; creep and foot hook (`hook` exists) | medium to hard. Flat cards and a camera passing between them: the old s04 already had the lens inside a card |
| 6 | 12.10 to 15.00 | new framing from the cab looking back through the partition; a soft foreground glove; `capDrop` | medium |
| 7 | 15.00 to 18.20 | the first view that holds the car interior and the platform together; the train's last half metre of arrival; commuters WALKING off (the crowd cards only have standing bits today); the suitcase trundle | medium |
| 8 | 18.20 to 22.05 | the boy's point, the tourist's look, a dash plus `lunge` (the rig's arm is about 0.2 m, so he must first cover the 1.5 m from the cab glass), the catch with a tilted suitcase, the haul, `wag`, the nod | medium to hard |
| 9 | 22.05 to 25.05 | the old s07 with three cards readable behind door glass | easy to medium |
| 10 | 25.05 to 27.35 | a finger wiggle at his own phone (new small move); `frown` | easy |
| 11 | 27.35 to 30.80 | doors open, he wheels the bag, parks it, two pats (new small move), skips out | medium |
| 12, 14, 18 | | tight doorway shots; `urgent` exists | easy |
| 13 | 33.00 to 35.45 | `call` in mock style; the station kit already puts the vending corner so he has his back to the bag | easy (after blocker 5) |
| 15 | 36.55 to 39.65 | new view from inside the doorway; his look to the lens; a double point (the library has `guns`: a no-recoil variant is needed); a suitcase edge and the boy's arm very close to the lens | medium |
| 16 | 39.65 to 45.75 | the old s18 orbit without the phone screen; a focus pull | medium |
| 17 | 45.75 to 53.50 | the old s17, shorter. The volunteer's acting is still keyed to script v2 words (cast notes: "legacy, not polished"). The baked ball simulation cannot easily make ball 3 "teeter on the rim" on cue | easy to medium without the teeter |
| 19 | 54.60 to 58.55 | the cab at the station; the door lamp "barely reads" in the train owner's own stills | medium |
| 20, 21 | 58.55 to 62.85 | the old s20 and s21 | easy to medium |

Also new: the boy's mum is in 6 shots, and her card is "legacy, not polished" in the cast notes. A 10 s departure
melody with six ball drops on its beats. The phone-speaker replay. One laugh take.

### 5.2 Unclear at phone size

1. **The green signal (4.45 to 9.00 s).** The rail kit keeps the lamp's glow at "about 5 px". On a phone that is
   nothing. It is the film's only picture of what the driver points at. Blocker 6.
2. **The jar counters.** "Small" counters cannot be read. Blocker 4.
3. **Shot 2.** The suitcase comes into frame at the end of a 1.4 s move and has about 8 frames on screen. Blocker 7.
4. **The cab door lamp (shot 19).** A 4 cm dark lamp. He seems to point at the desk. Improvement 8.
5. **The 0.7 s look (shot 15).** Bean-head eyes are small. His face needs at least 15 % of the frame height, and the
   yellow edge of the suitcase must be in the near corner, or nobody knows what he is looking at. Improvement 9.
6. **The foot hook (shot 5)** and **"phone DOWN at his side" (shot 7)**: the draft already lists the first; the
   second is the detail that makes the first stop differ from the second, and it is small.
7. **Shot 4:** "through the glass, small: the glove and the tiny green dot". Do not count on it.
8. **Shot 21:** the grin drain at the frame edge (see 4.3).

### 5.3 Plants and payoffs

Every story plant is paid: the suitcase that wants to leave (10.6 s, 16.4 s, 59.1 s), "Stay." / "It stays." (59.1 s),
the door framing (22 s, 58.6 s), "a finger and a shout" (12.3 s, 54.7 s), "check!" (33.3 s, 61.1 s), the boy's copy
(7.3 s to 61.1 s), the selfie at 25.3 s (replayed at 43 s), the boy's hand in frame 0 (61.1 s).

Plants with no payoff:
- **The lamp above the door in p02** ("is steady"). It does nothing later and it is unverified. Remove it.
- **The dark cab lamp in shot 19.** It is never seen to light; the payoff is sound only. Acceptable. With blocker 3
  the side lamps going out carry it.
- **The thumbs-up.** It pays nothing; it is there for the culture guard. See blocker 5.
- **The mum looking down the car** (shot 12). It sets up that she misses the bag and then nothing comes of it.

One contradiction in the text: frame 0 says the arm "lands on frame 2 (4 % overshoot, steady by frame 6)" and calls
it "thrust". The last shot says the same move is "slow and limp (18 frames)". A slow limp arm has no overshoot and
barely moves in its last two frames. Improvement 10.

## 6. Voice line list

- Complete: all 25 spoken lines are in section 7, plus the laugh (x01) and the alternate (a01-a02). The totals are
  right (7 reused takes, 9 new narrator takes for 14 lines, 4 new tourist lines).
- The 7 reused takes are real and say the right words. I checked each in `gen_log.jsonl`: `cast_d/masaki1`
  ("[firmly] Signal... green! ..."), `ch_d03/t3` ("[firmly] Doors... closed!"), `ch_d04/t4` ("[calmly] Doors...
  closed!"), `ch_t02/t3` ("[playful] Stay. Be right back."), `ch_t04/t2` ("[mocking] Vending machine... check!",
  1.86 s), `ch_k01/t5` ("[proudly] Bag... check!"), `ch_t06/t4` ("[flatly] Bag... gone."). Their lengths match the
  draft.
- Tags in the script table match the takes for the tourist and the kid. The three driver rows show no tag; the
  takes were recorded with "[firmly]" or "[calmly]". Harmless, but write the real tag in the table.
- **Id collision (blocker 8).** The draft reuses the ids d02, d03, t02 to t06 and n01 to n13 for different lines
  than `picks.json` and `pt_lib.py`. Example: the draft's d02 is the "Doors... closed!" plant; in `picks.json` d02 is
  `ch_d02/t3`, "Speed... check!", a line the lead removed. A build that maps by id plays the wrong take.
- **Model (blocker 8).** All 150 logged takes, the 7 reused ones included, are model `eleven_v4`. The lead's
  decision 7 says "v3". Every measured speed in this plan is a v4 number.
- t03 is used twice (the line, and the thin replay from his phone at 43.0 to 44.67 s). The replay runs under
  James's "His mind was on his phone." Only "...do?" is in the clear. That is for the sound audit, but note it.

## 7. The judges' "must fix" items that touch this lens

Met: the 66 s plan, no percent chip, the ministry URL, "for every six", the narrator never says "nothing", New York
without a year, no blinking lamp while doors stand open, a far dot for the signal, one speaker in the first 3 s, the
two stop signposts, a clean 6 against 1, the end on the last word, no "bro", untagged first for James and the driver,
the description wording.

Not fully met, though the draft's 10.2 says "met":
- **F7** (the driver is never shown to close the doors): d03, with the sound off. Blocker 3.
- **F8** (no gesture under 12 frames): shot 13 and k01. Blocker 5. The stretched call also breaks the 0.35 to 0.45 s
  beat in sound (1.31 s); that is the lead's own decision 3 and is fine as long as his hand is never on screen
  waiting by his ear.
- **F4** (the jars show the same number of tries): only by a small counter. Blocker 4.
- **F11** (caption chunks of 1 to 3 words): section 5.5 has five chunks of four words. Improvement 4.

## 8. Blockers (must change before the lock)

1. **Section 6, the row "d02, d03: the door order" (and guard 4's source).** Wrong source. JTSB RI2015-3-1e is
   about a conductor on a JR Hokkaido sleeper express who did not check "the car side pilot lamp and the indicator
   lamp ... in the conductor room". Fix: cite ja.wikipedia 鉄道合図, section 知らせ灯式
   (https://ja.wikipedia.org/wiki/鉄道合図: on JR East the driver confirms the lit cab lamp that shows all doors are
   closed) and ja.wikipedia 車側灯 (https://ja.wikipedia.org/wiki/車側灯: the red car-side lamp is lit while a door
   is not closed). Keep the JTSB report only for "the conductor works the doors". Add: "the spoken English call is
   dramatized".
2. **n12, 44.65 s, "ran the same test two ways".** The test had four set-ups. Keep the line and add this to the
   description after the 0.38 % sentence: "The test had four set-ups: only looking 2.38%, only saying it 1.0%, only
   pointing 0.75%, pointing and saying it 0.38%. The cartoon shows the first and the last." If the description
   cannot carry it, n12 becomes the recorded line "Japan's railway lab tested it."
3. **d03, 57.80 s.** Move the cut to the platform from 58.55 s to **57.60 s**. The doors are then SEEN sliding from
   57.65 s, "Doors..." (57.80 s) is heard over the plant framing as it was in the plant, the doors meet at 59.1 s,
   the lamps go out at 59.45 s, "...closed!" at 59.75 s. Shot 19 becomes 3.00 s (it keeps n14 and the glove rising
   to the dark lamp, with no word). Shot 20 becomes 3.50 s. The total does not change. Add to guard 5: "the
   driver's hand is never on screen during the 1.31 s wait".
4. **The jars, 45.75 to 53.50 s.** Replace "the same small press counter" and the "250" idea with two identical
   TRIES bars, one under each jar, each at least 4 % of the frame height, with no digits. Both fill to the same end
   mark. In the EYE phase she presses in a fast run (about 3 presses per ball) and only six of them drop a red
   ball; the FINGER bar fills just as far and one ball drops. Close open question 1 as "no number".
5. **Two gestures with no time.** (a) Shot 13, 33.00 s: cut in with him already facing his own phone, stiff. Delete
   "A quick thumbs-up toward the cab, then he turns the phone on himself". Either drop the thumbs-up and change the
   culture guard sentence to "he never taps the glass and never blocks the driver", or add 0.6 s before t05 and
   take it from the N pauses (4.4, cut 1). (b) k01, 61.10 s: delete "pushes his cap up" before the call; he pushes
   the cap up with the pointing hand AFTER "check!" (62.40 to 62.85 s, 13 frames), chin up.
6. **The green signal, 4.45 to 9.00 s.** In the cab shots set the lamp's glow to a core of at least 18 px and a halo
   of at least 40 px at 1080 x 1920 (`signalJP`'s `bright`, or a nearer signal at about 250 m), against dark
   background, never against the green bank, with the fingertip right beside it at full stretch. Still one glowing
   lamp and no readable head, so decision 5 holds.
7. **Shot 2, 3.05 to 4.45 s.** The train owner's notes say the built car has no room for a three-quarter-front view
   of the tourist at the cab glass; the old s02 is his right profile from 2.4 m. A phone held "up at the cab glass"
   also sits between his face and any camera on that side. Fix the staging sentence: he stands with his BACK to the
   cab glass and laughs into his own phone, held at chest height to his left (a selfie with the driver behind him);
   the camera is in the aisle looking toward the cab, so his face matches shot 1 in size and place, the driver's
   back and the boy at the glass are behind him, and the camera can ease back down the aisle. The suitcase must be
   fully in frame by 3.70 s. Storyboard this shot before the voice is recorded.
8. **Voice list.** (a) Give the v3 lines ids that cannot collide (for example v3_d02) or write the take path and the
   expected words into `voice_lines_v3.json` and make the build compare each reused take's transcript with the
   script text. (b) State the model in section 7: all new takes on `eleven_v4` with the v1 settings, the model of
   the 7 reused takes. If the lead wants v3, the 7 REUSE rows become NEW and every call-out length must be measured
   again.
9. **Section 4.1 numbers.** n13's first clause is 2.69 s, not 2.40 s. Use: n09 0.95, n12 3.00, n13 5.83, n14 2.97.
   The plan is 65.5 s, range 64.6 to 67.3 s. Apply cut 1 of 4.4 now (0.70 s of N pauses) so the plan is 64.8 s, and
   put the cut list in the order of 4.4. Add the build rule: over 66.0 s apply the cut order, over 70.0 s refuse.

## 9. Improvements (optional)

1. p02, 53.50 s: delete "The lamp above the door is steady (nothing blinks while the doors stand open)" and frame
   below the door header in shots 12, 14, 15 and 18. What that lamp does while the doors stand open is unverified.
2. Description: change "The same science with a clown" to "More on looking without seeing: [link]". Fill the link.
   Add the Mental Floss link for the New York line. Change the last source to the 10-car figure: "ja.wikipedia,
   E233 series: a 10-car Tokyo commuter train is rated for 1,582 people". Add "The jars are our picture of the
   numbers."
3. Pinned comment: item 2 is a tip, not a "true thing". Make it: "2. The lab also tried each half alone. Only saying
   it: 1.0% wrong. Only pointing: 0.75%. Both together: 0.38%." Then the stove question as the question line.
4. Section 5.5 captions: split the five four-word chunks: "tries to / get off...", "and the / boy's finger",
   "ran the / same test", "looked right / at it.", "was on / his phone."
5. The plant, 22.05 s: start the door chime at 21.70 s under the nod, and cut into the plant with the doors already
   half shut, so the plant and the payoff use the same door speed (about 1.5 s). No time added.
6. Shot 21, 62.40 s: the tracking camera must hold the tourist's whole head by 62.40 s, or move the grin drain to
   the first frames of shot 22 (the `stun` take).
7. Lab: drop the rim teeter on ball 3. At 0.4 s per ball it clutters the one count the viewer must make, and it is
   hard in a baked simulation. Re-key the volunteer to the v3 words.
8. Shot 19: the door lamp with its door pictogram should be at least 6 % of the frame width, at his fingertip.
9. Shot 15: his face at least 15 % of the frame height during the look; the yellow suitcase edge in the near corner.
10. Frame 0: choose one arm. Recommended: slow and limp, no overshoot. The motion in frames 0 to 6 is then the
    sliding suitcase, the push-in and his head; put the rail click on a rail joint, not on the arm.
11. t01, 7.30 s: his finger stops short of the glass, no tap. t05 direction: add "never a put-on accent".
12. The mum: her hand on the boy in p01; one look from her at the bag and at the tourist's back in shot 12. Her card
    needs a v3 pass (6 shots).
13. n12: at James's pace the cut at 45.75 s lands on "lab", not on "the same test". Relabel it; the word "lab" on the
    lab picture is good.
14. Alternate hook: the shot from 1.30 to 2.00 s is 0.7 s long, too short to read a glove and a far lamp. Move cut B
    to 2.30 s or drop cut A.
15. The door glass: extend the suitcase handle with its red tag so yellow and red show above the sill even if the
    glass is drawn at a realistic height.
16. The loop: brief STATION, TRAIN and CAST that shot 1 runs at film time + 64.75 s, so the seam is one continuous
    shot and the loop gate can pass, not warn.

## 10. Limits

- Lengths rest on one measured voice track; a new take can move any line by 0.2 to 0.4 s.
- I did not see any picture. Buildability is judged from the builders' own notes as of about 21:05 today.
- The signal lamp order and the door-lamp state with doors open stay unverified.
- The door-glass height on real cars is my estimate.
