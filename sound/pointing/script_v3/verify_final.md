# Final gate: SCRIPT_v3.md before the voice is recorded (pointing)

Verifier, 2026-11-19. I did not write the script, the draft, a candidate or an audit. Nothing was rendered, played
or recorded. I measured nothing by ear: every time comes from the files on disk.

Checked: `sound/pointing/SCRIPT_v3.md` (all of it), `script_v3/voice_lines_v3.json`, `script_v3/shot_outline_v3.json`,
against `audit_hook.md`, `audit_panel.md`, `audit_facts.md` (all three in full), the "must fix" lists of the three
judges, `voice/NOTES.md`, `voice/_full/words.json`, `voice_info.json`, `_build.json`, `voice/takes/picks.json`,
`gen_log.jsonl`, the probe files of the reused takes, `hook_lab/OPENINGS_DATA.md`, `PLAYBOOK.md` section 8,
`BIBLE_NOTES.md` section 10, `LEAD_DECISIONS.md`, and eight web sources opened again today (section 4).

Line numbers below are lines of `SCRIPT_v3.md` as it stands after this pass.

---

## 0. Verdict

**LOCKED for voice recording.**

| | result |
|---|---|
| The 17 blockers | **17 FIXED, 0 NOT FIXED, 0 WRONGLY FIXED.** Three were fixed with a small, written-down difference from the audit's exact text, each for a stated reason (blockers 3, 7, 15). |
| First 5 s, my recount | 9 words started by 3.0 s, 17 by 5.0 s on an average take (9 and 14 at the brief's flat speeds). Longest gap 0.15 s. Narrator first at 0.07 s. Cuts at 3.05 s and 4.88 s. It meets the lead's rule 8, at the floor. |
| Total length, my recount | Plan on paper 65.12 s. My like-line recount 64.95 s. With two beat pads that the script's own fact guard 5 needs (measured today): **65.27 s**. Honest range 64.2 to 66.7 s. Never over 70 s, because of the build rule. No time-stretch anywhere. |
| Do the three files agree | Yes. Words, tags, speakers and start times agree on all 26 voiced rows; all 25 shot times agree; both JSON files are valid. Two small "who is in the shot" differences and one rule that the shot lists did not follow were found and fixed (section 5). |
| Facts and guards | Every fact in the film, the description and the pinned comment matches its source, opened again today. No guard is broken. |
| Fixes made by me | Six small ones, in the three files (section 5). No spoken word, cut or planned time was changed. |

One thing the lead must confirm before the first paid take: the voice model (section 6, item 1).

---

## 1. The 17 blockers, one by one

| # | blocker | status | where in the final script |
|---|---|---|---|
| 1 | Hook B1: "He is not." and the recording gate | **FIXED** | (a) Line 192: "v3_n02: low and flat, at the same speed as the first sentence, 1.05-1.20 s; the drop in pitch is the joke, not a slow-down." The same words are in the voice list (line 585) and in the JSON direction of `v3_n02`. (b) Lines 123-126: "Measure the assembled hook after the three pauses are set to 0.15 s. Accept a take only if 'not' starts by 2.70 s, 'laugh' starts by 4.50 s and no gap is over 0.20 s. Prefer a take where 'finger' starts by 5.00 s. If none passes, record again. Never stretch." (c) Lines 129-130: "Cut 1 and cut 2 are placed from the accepted take's real word times, not at fixed times". |
| 2 | Hook B2: shot 2 too short for the jump back | **FIXED** | Line 105: "CUT 2 at 4.88 s, one frame before 'finger'"; the glove is "already 40 % raised"; line 107: full stretch at 5.60 s. Line 104: face held 10 frames (to 3.38 s), move at about 2.3 %/f, done at 4.38 s, still for the last 15 frames. Shot 2 = 1.83 s (line 637), shot 3 = 2.32 s (line 638). The total did not change. |
| 3 | Hook B3: lab 7.75 s, tourist gone 12.8 s, 18.6 s of narrator alone | **FIXED** (two written differences) | (1) The lab is entered at 46.55 s on the word "tested" (line 179), not on "two", because blocker 6 changed the line. (2) Line 181: "CUT 50.09, on the hang after 'looking...': from INSIDE the doorway (shot 15's camera): the yellow suitcase large in the near corner ... the tourist with his back to it, shoulders shaking at his phone. CUT back to the jars at 51.09". Her point and call sit on the second half's words (line 180). The giggle is a new take `v3_x02`, with `v3_x01` as the fallback. (3) Pause after "looking..." 1.00 s (line 366); "nothing!" 0.15, "behind him." 0.15, "saves it." 0.15, "do?" 0.35 (lines 348, 349, 353, 356). (4) "Keep p02 as written" was NOT kept: blocker 7 replaced that insert, and its beat (the boy looks from the bag to the tourist) now lives in the cutaway. This is the audit's own conflict, and the result is better than the target. (5) H5 and H8 carry the real numbers (lines 793, 796: lab 7.05 s in two halves of 3.54 and 3.51 s; lab narration 8.97 s). Result: the longest stretch without the tourist or the suitcase is 3.54 s (target 3.95 s). |
| 4 | Hook B4: the arm across the loop seam | **FIXED** | Line 185 and lines 458-463: "on 'gone.' the arm sags forward slowly for 12 frames, elbow soft, to about 60 % of full stretch; then it locks out straight over the last 6 frames at the driver's snap speed. The film ends 2 frames before the lock-out lands". Section 1.1 is as written. My frame count agrees: "gone." starts at 64.59 s, the film ends at 65.12 s = 16 frames = 12 + 6 - 2. |
| 5 | Panel 1: the number line sounds written | **FIXED** | Line 180: "For every six mistakes people made just looking... when they pointed and said it out loud: about one." Captions as ordered (section 5.5 and the JSON). The zero-cost fallback is kept in the voice list. |
| 6 | Panel 2: the dare buried under the thesis line; a method sentence | **FIXED** | Line 177: under v3_n11 "the phone's tiny speaker plays only his wordless giggle (v3_x01, thin)". Line 178: the replay runs 43.47-45.14 s, "about 8 dB under the narrator's level", it starts 0.30 s before the end of "phone." and plays in the clear. Line 179: "[intrigued] Japan's railway lab tested it." (the v1 take `c08c/t1`, 2.03 s) starts at 45.22 s, 0.08 s after "do?"; the cut to the jars is on "tested". "The same test" is carried by the two equal TRIES bars. |
| 7 | Panel 3: 5 s more without the tourist after the jars | **FIXED** (two points overruled by blocker 11) | Line 182: one shot from shot 15's camera at 54.60 s (suitcase, the boy's arm, mouth shut, the tourist's back); v3_n14 plays over it; the cab is 1.02 s with the glove already straight (line 657); then the plant framing. NOT taken, on purpose: "Doors..." spoken on the driver's picture, and the door leaves sliding into the doorway shot. Blocker 11 (truth) asks the opposite and the fact judge wins on truth. The tourist is now never off screen for more than 3.54 s. The lead may overrule this (script 10.7, item 2). |
| 8 | Panel 4: who is in CAPS | **FIXED** | Lines 217-218 carry the exact sentence. The first-5-s table, the alternate table (line 267: "SIGNAL... GREEN! / HE'S POINTING / AT NOTHING!") and section 5.5 follow it. I checked all 26 captions in the JSON: every character line is CAPS, every narrator line is sentence case, the last line is lower-case. |
| 9 | Facts 1: wrong source for the door order | **FIXED** | Line 513 cites ja.wikipedia 車側灯 and 鉄道合図 (section 知らせ灯式), keeps the JTSB report only for "the CONDUCTOR works the doors and checks the car-side lamp", says "It says nothing about a driver's cab lamp", and adds "The spoken English call is dramatized". I opened all three today (section 4). |
| 10 | Facts 2: "two ways" when the test had four set-ups | **FIXED** | The line is now "Japan's railway lab tested it." and line 723 of the description gives the four set-ups; the pinned comment gives the two halves. |
| 11 | Facts 3: "Doors..." before any door is seen to move | **FIXED** | Line 183: "CUT 58.32: PLATFORM B, the PLANT framing exactly. The doors are already sliding ... 'Doors...' is heard from the cab over this picture ... The driver is not on screen at any point of the call". Chime and doors start 58.12 s, seen from 58.32 s, the word at 58.47 s, doors meet 59.42 s, lamps out 59.72 s, "...closed!" 60.12 s. Guard 4 (line 542) and guard 5 ("The driver's hand is never on screen during the 1.0 s wait") carry it. |
| 12 | Facts 4: the jars read as 6 in 6 against 1 in 1 | **FIXED** | Lines 179-180 and 516: two plain TRIES bars, each at least 4 % of the frame height, no digits, the same end mark; a fast run of about three presses per ball on the EYE side; "no number (not '250') is printed". |
| 13 | Facts 5: two gestures with no time | **FIXED** | (a) Line 174: "He is ALREADY facing his own phone, stiff as a guard (no thumbs-up, no phone turn)"; the culture guard now reads "he never taps the glass and never blocks the driver" (line 559). (b) Line 184: the cap is pushed up "with the pointing hand (13 frames...)" AFTER "check!". I found one leftover here and fixed it (section 5, fix 2). |
| 14 | Facts 6: the green signal is 5 px | **FIXED** | Line 161: "a core of at least 18 px and a halo of at least 40 px at 1080 x 1920, on a dark background, never on the green bank", the fingertip right beside it. Guard 6 (line 552), the shot outline and the alternate hook say the same. Still one lamp, no readable head. |
| 15 | Facts 7: shot 2 cannot be built as written | **FIXED** (0.02 s difference) | Line 104: "He stands with his BACK to the cab glass and laughs into his own phone, held at chest height to his left: a selfie with the driver behind him"; the camera is in the aisle. The suitcase is fully in frame by about 3.72 s (the audit said 3.70 s) because the 10-frame face hold of blocker 2 comes first. Line 138: "Storyboard shot 2 before the voice is recorded." |
| 16 | Facts 8: ids collide; the model | **FIXED** | (a) Every id starts with `v3_`, and the JSON has `v1_take` and `expected_words` for all 8 reused takes; the build rule is on line 574. (b) Line 569: "all new takes on `eleven_v4` with the v1 settings". I checked `gen_log.jsonl`: 150 of 150 takes are `eleven_v4`, and each of the 8 reused takes says the words the script needs. I added the cut points of the reused takes (section 5, fix 6). |
| 17 | Facts 9: the length numbers | **FIXED** | Line 306 uses 2.69, 0.95 and 2.97; the N pauses are trimmed; the cut order starts with the N pauses and the vending line is fourth (lines 392-401); line 389: "If the assembly is over 66.0 s, apply the cut order ... If any assembly is over 70.0 s, refuse it." The plan is 65.12 s, not the 64.8 s the audit aimed at, because blockers 3, 5 and 6 added time; it is still under 66 s. |

---

## 2. My own recount

### 2.1 The first 5 seconds

Words of the hook: "His bag is on that train. / He is not. / All he did was laugh... / at a finger." (17 words, 18
syllables). A word counts when it has started. The three pauses are set to 0.15 s.

| reading | "not" (9th) starts | "laugh" (14th) starts | "finger" (17th) starts | started by 3.0 s | started by 5.0 s |
|---|---|---|---|---|---|
| A. Average take. Word lengths taken from like words on the v1 track (running one-syllable words 0.18-0.30 s, the last word of a sentence 0.45-0.55 s) | 2.38 s | 4.03 s | 4.84 s | **9** | **17** |
| The script's own plan | 2.42 s | 4.10 s | 4.92 s | 9 | 17 |
| B. The brief's flat speeds (3.28 words/s in a phrase, "He is not." at 2.35 words/s) | 2.90 s | 4.70 s | 5.76 s | 9 | 14 |
| C. A slow take (3.05 words/s, "He is not." at 2.2 words/s) | 3.10 s | 5.01 s | 6.15 s | 8 | 13 |

- **The lead's rule 8 is met on an average take:** the 9th word has started before 3.0 s and the 14th before 5.0 s.
  It is met at the floor of the 24 measured hits (9 and 14; their medians are 11.5 and 19), not above it.
- It still passes at the brief's flat speeds, by 0.10 s and 0.30 s. It fails on a slow take, and the recording gate
  ("not" by 2.70 s, "laugh" by 4.50 s, no gap over 0.20 s) is there to throw that take away.
- The 17th word has only about 0.1 s of room before 5.0 s. Count 16 if "finger" slips.
- Longest gap in 0-5 s: 0.15 s (the limit is 0.3 s). Lead-in 0.07 s.
- One speaker, the narrator, until 5.65 s. Under him from 3.05 s: a laugh with no words, 12 dB down, its owner on
  screen.
- Cuts: 3.05 s and 4.88 s. One cut in the first 4 s, two in the first 5 s.
- The loss is on screen in frame 0 and said by 1.72 s (the whole joke by 2.97 s).
- With the sound off the five caption chunks and the pictures tell the same thing (script 1.2, last paragraph).

### 2.2 The total length

I summed the script three ways. All three use the measured lengths of the 8 reused takes, which I checked against
`words.json`: Signal... green! 1.335 s, the plant call 1.425 s, "Stay. Be right back." 1.555 s, the vending call
1.865 s (its probe file), "Japan's railway lab tested it." 2.03 s, the payoff call 0.645 + 0.325 + 0.575 s, "Bag...
check!" 1.305 s, "Bag... gone." 1.515 s, and the first clause of the number line 2.685 s (to the true silence at
45.78 s). All match the script.

| method | narrator speech | whole film |
|---|---|---|
| The script's plan (line by line) | 30.97 s | **65.12 s** |
| Mine, line by line from like lines on the v1 track | 30.79 s | 64.95 s |
| Per syllable (0.243 s, short landed sentences at 2.35 words/s) | 30.06 s | 64.2 s |
| The brief's flat words-per-second (3.28 in a phrase, 2.35 on the five short sentences) | 32.49 s | 66.65 s |

- I added every line and pause myself: speech 46.775 s (narrator 30.97, driver 4.10, tourist 10.40, kid 1.305) plus
  silence 18.355 s = 65.13 s. The chain "start = end of the line before + its pause" holds for all 25 lines and ends
  at 65.12 s. The 25 framings also add up to 65.12 s. 131 words in 25 lines (99 + 24 + 6 + 2): correct.
- **Two measured beats are under the script's own floor of 0.35 s** (fact guard 5: the hand is by the ear for
  0.35-0.45 s). The reused vending take has 0.24 s between "machine..." and "check!" (`ch_t04/t2.probe.json`). The
  kid's reused take has 0.31-0.325 s (`ch_k01/t5.probe.json`, `voice_info.json`). The script already said "check
  the vending take's beat; if not, add silence". The numbers exist, so the answer is known: add 0.11 s and 0.04 s
  of silence. **The plan is then 65.27 s.** I wrote this into guard 5, into 4.2 as a second allowance and into the
  JSON notes. I did not re-time the rows.
- **Honest range: 64.2 to 66.7 s**, the same as the script's. The flat words-per-second reading lands at 66.65 s.
  That reading is too slow for this script, because its words are shorter than v1's (1.19 syllables per word
  against 1.24-1.27), but it shows that about one build in three or four will pass 66.0 s and need steps 1 and 2 of
  the cut order (1.04 s, nothing lost that a viewer would miss).
- **70 s:** the script says the worst uncut case is about 69.2 s. That number counts about 1.1 s of the narrator's
  small inner pauses inside his "overall" pace. If 2.8 words/s is read as pure speech on all 99 words, the uncut
  sum is 70.3 s. So the 70 s promise does not rest on that number. It rests on the build rule (over 66.0 s apply
  the cut order, over 70.0 s refuse) and on 6.5 s of cuts that touch no protected line. With that rule the film
  cannot ship over 70 s. I checked the cut order's sums: 0.45 + 0.59 + 1.15 + 1.5 + 2.8 = 6.49 s.
- The allowances can stack: +0.30 s (the boy's second point at 1.40 s), +0.30 s (the replay started later), +0.60 s
  (if the door kit stays at 1.6 s), +0.15 s (the two beats). All of them together give 66.5 s, and the cut order
  brings that back under 66 s.
- The bag plant has 4.2 s of picture (28.55-32.75 s) and the bag is alone for 2.2 s. Every two-word call keeps its
  measured length; none is squeezed; the payoff call is made longer with silence only.

---

## 3. Do the three files agree?

| check | result |
|---|---|
| Both JSON files parse | yes: 30 voice entries, 25 shots |
| Script table (section 2) against `voice_lines_v3.json`: words, audio tag, speaker, start time | 26 of 26 voiced rows agree. `v3_p01` and `v3_p02` have no words and no JSON entry, by design |
| Voice line list (section 7) against the JSON: words, tags, reuse or new, take path | all 24 rows agree; all 8 take files exist on disk; `gen_log.jsonl` shows the right words and tag for each |
| Totals in section 7 | correct: 8 reused takes; 8 new narrator takes for 13 pieces; 4 new tourist lines; 17 of 25 lines are new |
| Shot table (section 8) against `shot_outline_v3.json`: start, end, length, place | 25 of 25 agree; no gap or overlap; sum 65.12 s |
| The same two tables: who is in the shot | two differences found and fixed (shot 16b: the JSON had the boy and "the boy looks up at the sound", the table did not; shot 24: the JSON had the boy's cap brim and hand in the window, the table did not) |
| Cut times named inside the script rows against the shot list | all 24 cuts agree (3.05, 4.88, 7.20 ... 63.23) |
| Pause plan (4.2) against the row times | every pause matches; the pauses add up to 18.355 s; the N pauses add up to 1.80 s |
| Captions: section 5.5 against the JSON `caption` fields | agree, 1-3 words per chunk everywhere |
| Sound cues (2.3), loops (5.1), beat positions (4.1), checklist numbers (10.x) against the rows | agree. I recomputed the percentages (39, 44-50, 61, 67-73, 73-83, 84-89, 90, 97.5 %), the 10.9 s from the number to the end, the 13.3 s of narrator-only words, the 11.7 s (18 %) without tourist or suitcase |

---

## 4. Facts and guards, checked again today

Sources opened by me today (2026-11-19):

| source | what I read there |
|---|---|
| Labour ministry safety glossary, https://anzeninfo.mhlw.go.jp/yougo/yougo72_1.html (Shift_JIS, decoded) | 1994, the Railway Technical Research Institute, an effect test on wrong presses of an operation button: 2.38 % with neither pointing nor calling, 1.0 % calling only, 0.75 % pointing only, 0.38 % both, "about one-sixth". The habit began with Japanese National Railways steam-locomotive drivers checking signals. The steps: point with the right index finger while saying the item; bring the right hand back to the right ear while asking yourself if it is right; swing the hand down at the target on "Yoshi!". It says pointing and calling cannot wipe out human error by itself and calls it an effective way to raise the level of awareness and the accuracy of checks |
| Wikipedia, "Pointing and calling" (raw text) | "pointing at important indicators and verbally calling out their status"; "It is especially common on Japanese railways"; "Gesturing at and verbalizing these indicators helps with focus."; "almost 85 percent when doing a simple task"; New York: conductors "are required to point to a black-and-white striped board ... every time when a train pulls into a station"; "If the conductor cannot see the striped board, they are not permitted to open the doors." |
| nippon.com g02575 | "the error rate in confirmation operations falls to one-sixth"; "signals, the speedometer, track conditions"; "This sequence of actions focuses attention on one thing"; a conductor "uses pointing and calling to confirm door opening and closing" |
| Mental Floss 79767 | "required procedure is to point to it at every station before we open the doors" |
| ja.wikipedia, E233 series (raw text) | "編成定員 = 1,582名", noted as the standard for a fixed 10-car set; "ドアの開閉に合わせてドアチャイムの鳴動とドア開閉表示灯の点滅機能を装備する" |
| ja.wikipedia, 鉄道合図, section 知らせ灯式 | on JR East the driver confirms that the cab lamp showing all doors are closed is lit, and that counts as the conductor's departure signal; the lamp can be orange-yellow, white or green |
| ja.wikipedia, 車側灯 | "ドアが閉まっていない間に赤色灯を点灯し続ける": the red car-side lamp stays lit while a door is not closed |
| JTSB report RI2015-3-1e (PDF) | Hokkaido Railway Company, Yakumo station, 17 May 2015, a sleeper limited express: the CONDUCTOR worked the door control and "did not confirm properly both the car side pilot lamp and the indicator lamp showing all doors were closed in the conductor room". Nothing about a driver's cab lamp |
| Crossref, doi 10.1002/acp.1638 | Hyman and others, 2010, "Did you see the unicycling clown? ..." (it is only an inside note, not in any public text) |
| Wikipedia, "E235 series" | 11 cars per Yamanote set, capacity 1,628 |

Every spoken line and public sentence against these:

| line or text | grade |
|---|---|
| v3_n04 "But that driver has a thousand people behind him." | TRUE (a 10-car set is rated for 1,582) |
| v3_n05 "So he checks with a finger and a shout." | TRUE ("shout" is a loose word for a clear call; the description says "call out") |
| v3_d01, v3_d02, v3_d03, the gesture rhythm | TRUE as a dramatized English form; the three steps are the ministry's; the description says the real calls are in Japanese |
| v3_n12 "Japan's railway lab tested it." | TRUE |
| v3_n13 "For every six mistakes people made just looking... when they pointed and said it out loud: about one." | TRUE as a ratio: 6 x 0.38 / 2.38 = 0.96 |
| v3_n14 "A finger and a shout drag your mind back." | TRUE as a figure of speech; it promises no more than the sources |
| v3_t01 "He's pointing at nothing!" and the title | false on purpose, said only by the tourist; the green lamp is on screen from 4.88 s, before he speaks. The narrator never says "nothing" (I searched every narrator line, the alternate hook included) |
| all other lines | story about made-up people; no claim about the world |
| Description: the 1994 test, 2.38 % and 0.38 %, "about one mistake for every six", the four set-ups, 1,582 people | TRUE |
| Pinned comment: New York conductors; "Only saying it: 1.0% wrong. Only pointing: 0.75%. Both together: 0.38%." | TRUE; no year, no tunnel claim |
| The door order in the plant and the payoff (doors meet, red side lamps go out, then the status word) | TRUE to the two ja.wikipedia pages; the spoken English call is marked as dramatized |

Guards (the lead's decision 5 and the script's section 6):

| guard | result |
|---|---|
| The number is a ratio; the jars show the same number of tries; no "-85 %" chip; no digits on the bars | holds |
| The ministry page is cited for the 1994 test | holds (section 6 and the description) |
| The narrator never states "he points at nothing" | holds |
| No door lamp blinks unless the doors move; the lamp above the door is never in frame | holds on paper: every doorway shot is "framed below the door header"; in the two knee-high shots the doors are always moving or shut |
| The driver never closes the doors himself | holds: in both calls the chime and the doors start before his word; in the payoff the doors are seen sliding 0.15 s before "Doors...", and he is not on screen during the call |
| The true gesture rhythm; no gesture under 12 frames; no call under 1.3 s | holds after this pass. Calls: 1.455, 1.425, 2.225, 1.86, 1.305, 1.515 s. Two gestures were under 12 frames on paper and one beat pair was under 0.35 s; see section 5, fixes 1, 2 and 5 |
| No large signal head until its lamp order is checked | holds: one glowing lamp, no readable head |
| No Japanese text, no brands | holds in the film (icons and digits only; "NEW YORK" on the shirt is the only word) |
| The joke is on the tourist only; he is never rude; he stays behind the yellow line | holds: no tap on the glass, no put-on accent, the late salaryman gives up, nobody rushes the doors |
| The boy is with his mum in every shot he is in | the rule was in section 6, but 9 shot rows did not list her; fixed (section 5, fix 3) |
| 60-70 s, hard maximum 70 s, never stretch | holds (section 2.2) |
| AI voices only; cast James, Masaki, Flackoo, Kavya; no "subscribe" | holds |
| Ends on the payoff; the last shot is frame 0's camera about 1.9 s earlier | holds: 0.10 s after "gone.", last shot 1.89 s |
| New York, the kitchen and "Speed... check!" are out of the film | holds. The speedometer point is still shown, silent (shot 6). One trap: the reused driver take `cast_d/masaki1` is a three-call audition take that contains "Speed... check!"; see fix 6 |

---

## 5. What I changed in the files (six small fixes)

No spoken word, audio tag, cut time or planned line time was changed. Backups of the three files as I found them
are in my scratch folder for this session; the changes are also easy to see by the phrases below.

1. **The phone swing in shot 2 had 10.8 frames.** The script said "On 'at a' (4.52-4.88)" and the JSON said "12
   frames". Now both say: from 4.48 s, in the pause after "laugh" and then through "at a", 12 frames, to the cut
   (script line 105; JSON `v3_s02`). The pause plan already gave that pause to the swing.
2. **The boy's "points again" had 0 frames in shot 23.** "check!" ends at 62.785 s and the cut is at 63.23 s; the
   cap push takes all 13 frames. Now: "he is pointing again when the last shot opens (the arm comes back down
   across the cut)" (script line 184; JSON `v3_s23`). Section 5.4 already said he is pointing in the last shot.
3. **The mum was missing from 9 shot rows** (2, 7, 8, 9, 11, 13, 16a, 16b, 22), though the binding culture guard
   says "The boy is with his mum in every shot he is in; her hand is on him whenever he is near the open doorway",
   and the shots right before and after show her. Added to the section 8 table and to the `who` lists in the JSON,
   with one paragraph under the table. In the two door-glass shots she "may be half hidden", so the three cards
   that must read stay three. "New work" item 7 now says 15 framings, not "at least 6".
4. **Two "who" cells in the shot table did not match the JSON.** Shot 16b now has the boy and "the boy looks up at
   the sound"; shot 24 now has "the boy's cap and hand in the door window" (as frame 0 and section 5.4 say).
5. **The two measured beats under 0.35 s** (vending take 0.24 s, kid's take 0.31-0.325 s) are written into fact
   guard 5, into 4.2 as a second allowance (plan 65.27 s), and into the JSON (`measured_inner_silence_s` and the
   notes of `v3_t05` and `v3_k01`). The rows are not re-timed; the lead may instead take the 0.11 s out of the
   0.33 s pose hold after the mock call.
6. **The cut points of the reused takes** are now in the JSON as `v1_build_take_on_off_s` (from `_build.json`; for
   the vending take from its probe file), with one sentence in the section 7 build rule. The reason: `cast_d/masaki1`
   holds three calls ("Signal... green! Speed... check! Doors... closed!"), so a build that loads the whole file
   would play a line the lead removed, and a transcript check of the whole file can never equal "Signal green".

Also added: three lines near the top of the script that say this pass happened.

---

## 6. Left open (none of these blocks the voice recording)

### For the lead to confirm

1. **The voice model.** The brief says "ElevenLabs v3 with audio tags". The script says `eleven_v4` with the v1
   settings, as the fact audit ordered, because all 150 logged takes and every measured speed are v4. If the lead
   wants another model, the 8 reuse rows become new takes and every call must be measured again. Confirm before the
   first paid take.
2. **"Doors..." over the platform, not on the driver** (blocker 11 over part of blocker 7). The panel wanted the
   doors to start closing as seen from beside the bag. The script chose the stricter reading of the truth guard.
3. **The two beat pads** (65.27 s), or the same 0.11 s out of the pose hold.

### Risks for production

1. The hook sits on the floor: 9 words by 3.0 s, and the 17th word has about 0.1 s of room before 5.0 s. Only the
   recording gate makes this true on the real take. Best of 6-8 may not be enough; plan for a second round.
2. The first cut is at 3.05 s (18 of the 24 hits cut by 2.3 s). Export B (the cut-in at 1.87 s) must really go
   through the feed-sandwich test, as the script says.
3. Length: about one build in three or four will pass 66.0 s and need cut steps 1 and 2. The door kit's cycle is
   1.6 s today; if it stays, add 0.6 s.
4. Eight reused v1 takes sit beside new ones. Voice test 4 (tone colour) decides if they stay. The reused "Bag...
   gone." was a very quiet raw take (the v1 build lifted it by 11.7 dB); check its noise when it is mixed no more
   than 6 dB under the narrator.
5. The build still has v1 ids in `picks.json` and `pt_lib.py`, and `pt_timing.json` is the v2 pause plan. The v3
   build must load takes by path and span from `voice_lines_v3.json` and needs a new timing plan made from 4.2.
6. `BIBLE_NOTES.md` section 10 and `bible.json` still hold the old door-order source (the JTSB report) and the v2
   shot list (New York, the kitchen, the thumbs-up). The bible must be re-cut from SCRIPT_v3 before builders use it.
7. Nothing has been drawn. Seven things must read at phone size and each needs its storyboard still first: frame 0
   (a straight arm and a suitcase behind door glass on one line; the 0.25 s flash test), shot 2 (the whole suitcase
   in frame by 3.72 s inside the 4.2 %/f cap), the foot hook, the catch at the door, the boy's second point in
   1.10 s, the 0.7 s look, the two TRIES bars. Also the muted payoff test ("who closed the doors?").
8. The green signal lamp must be made big (core 18 px, halo 40 px) on a dark background; the kit's default glow is
   about 5 px, and the fact audit notes a "flat green wall behind the windscreen" bug in the cab.
9. The loop seam needs the platform set, the train and the cast to run shot 1 at film time + L, and L will change
   with the real voice.
10. Shot 6 is crowded: the glove's point, the boy's first full copy, the brake, the suitcase bump, the cap drop and
    the cap push in 2.83 s, with 40 frames after the brake.
11. Wherever the red car-side lamps are in frame while a door is open (shots 13, 16a, 16b, the start of 22) they
    must be lit; the script only times them going out.
12. The mum's card is "legacy, not polished" and is now in 15 framings.
13. The late middle is better but not gone: 13.3 s where only the narrator has words (45.1-58.5 s), and the lab
    still leans on its captions with the sound off.
14. ElevenLabs credits: 28,411 of 40,000 used at 22:09, so 11,589 are left. One pass of all new lines (the
    alternate hook included) is 690 characters. The planned run (best of 8 for the hook, best of 4 for the rest) is
    about 3,050 characters. It fits, almost four times over, but not without limit.
15. The description still has a marked place for the clown Short's link.

---

## 7. Limits of this check

- I heard nothing and saw no picture. Lengths rest on one recorded track; a new take can move any line by 0.2 to
  0.4 s.
- "Average take" is a model built from like words on the v1 track.
- Buildability is taken from the audits and the builders' notes they quote; I did not open the kit code.
- The lamp order of a three-lamp signal and what the lamp above the door does while the doors stand open are still
  unverified. Both are kept out of the picture.
