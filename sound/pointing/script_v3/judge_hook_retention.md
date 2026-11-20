# Judge review: hook and retention science (pointing, script v3 candidates A-D)

Judge, 2026-11-19. I did not write any candidate. Nothing was rendered or played. Sources read: `YOUTUBE_STUDY.md`
(sections 3, 4, 14), `hook_lab/HOOK_RESEARCH.md`, `hook_lab/OPENINGS_DATA.md`, `SCRIPT_v2.md`, `BIBLE_NOTES.md`
(1-5, 7-10), `notes_students.md` (part E), `LESSONS.md`, and the measured v1 voice (`voice/_full/words.json`).

## 0. Verdict in ten lines

1. **Ranking: C (77) > B (72) > A (65) > D (61).** No candidate earns 85. I would not bet that any of them beats our
   91.5 % average viewed as written.
2. **C has the best body.** It is the only script where the tourist or his suitcase is on screen almost all the
   time (off screen 22 % of the film; A 56 %, B 53 %, D 50 %), and the only one with a real near-miss (the first stop).
3. **B has the best first 3 seconds.** It is the only one where one person has already lost a concrete thing
   by 1.7 s. But B keeps v2's middle, and after 43.7 s the viewer knows both the answer and the ending.
4. **A is the weakest opening** on the measured patterns: a character speaks first (0 of 24 hits do that), three
   voices in 2.3 s, and the word count only reaches the floor with rushed takes, the kind that came out unclear
   for this driver voice in tests ("Speed check", p 0.39-0.53).
5. **D is the densest opening and the emptiest one.** It hits the word numbers and gives the viewer the famous fact
   and nothing to lose until 11.3 s.
6. **The writers' word counts are the best case, not the likely case.** James's real in-phrase pace on the v1 track
   is 3.28 words/s (4.16 syllables/s). D planned its 12-word clause at 4.1 words/s and B its first sentence at 4.1.
   On an average take every opening lands at 9-10 words by 3 s: the floor, not the median. Word density does not
   separate the four. Stake timing does.
7. **Best final from this lens:** C's spine, with B's three-sentence hook tested against C's two-sentence hook on
   the same body, plus five small grafts (section 7).
8. Biggest must-fix in C: the tourist and the bag are off screen for 10.7 s right before the payoff (45.6-56.3 s),
   and two key gags are given too little time (2.0 s and 2.9 s).
9. C's ending holds 1.0 s after the last word. Cut it. Nothing after the payoff.
10. All four stay under 70 s on a realistic voice (63-68 s). C has the least slack.

## 1. How I recounted (not the writers' numbers)

**The real narrator pace.** From `voice/_full/words.json` (the v1 track, James), 21 narrator phrases:
115 words, 146 syllables, 35.07 s of speech = **3.28 words/s, 4.16 syllables/s (0.24 s per syllable)**. Range per
phrase 2.2-4.4 words/s. Lines of 8 words or more ran at 3.0-4.0 words/s (median 3.4). Lines made of one-syllable
words ran slower per syllable ("So he points at the speed." 3.37, "A finger and a shout drag your mind back to
it." 3.79); lines with longer words ran faster (4.3-5.0). The two fast lines the writers quote ("Give him a
minute." 4.44 w/s, "And the man he's laughing at?" 4.27 w/s) are his two fastest of 21.
Characters, measured: "Signal... green!" 1.34 s, "Bro's pointing at nothing!" 1.57 s, "Doors... closed!" 1.43 / 1.55 s.

**The counting rule.** The hook lab counts a word once it has STARTED before 3.0 s (`first_sentence.py`: `a < 3.0`).
That is the rule behind "floor 9 / 14, median 11.5 / 19". A and C counted only ENDED words (stricter). I give both.

**Three speeds per opening:** PLAN = the writer's own times (his fastest takes). REAL = an average James take:
0.24 s/syllable, a little slower for runs of one-syllable words (B's first sentence 1.60 s, D's clause at 3.5 w/s),
sentence gaps 0.20 s, characters at measured lengths. SLOW = the brief's flat 3.1 words/s, gaps 0.25 s.

| opening | PLAN started by 3 s / 5 s | REAL started (ended) by 3 s | REAL started (ended) by 5 s | SLOW started by 3 s / 5 s | longest gap (REAL) |
|---|---|---|---|---|---|
| A | 10 / 16 | **9 (8)** with clipped, overlapped takes; **6 (6)** at v1 take speeds | 14 (14); 13 at v1 speeds | 6 / 13 | 0.15-0.30 s |
| B | 11 / 17 | **9 (9)** | 17 (16) | 9 / 15 | 0.22 s |
| C | 11 / 17 | **9 (8)**; 10 if the long sentence runs at his 4.5 syllables/s | 16 (15) | 8 / 16 | 0.20 s |
| D | 12 / 19 | **10 (9)** | 17 (16) | 9 / 16 | 0.08 s |
| floor of the 24 hits | 9 / 14 | | | | 0.54 s |
| median of the 24 hits | 11.5 / 19 | | | | 0.20 s |

Reading: on an average take B, C and D sit on the floor or one word above it, and A sits on it only if three new
takes all come out fast. The planned 11-12 needs James's fastest reads. None reaches the median on an average
take, because James speaks at least 10 % slower than the reference narrator (3.67 w/s) and we may not stretch audio. OPENINGS_DATA section 5 also says word count does **not** separate his 13-35M openings from his
1M ones. What separates them is a second force or conflict on screen by 3 s, a familiar topic, and a camera that
keeps travelling. So the floor is hygiene. The candidates differ on these other measures:

| measure | A | B | C | D |
|---|---|---|---|---|
| first voice | driver (character) | narrator | narrator | narrator |
| the tourist's loss first SHOWN | 4.5 s (bag rolls an inch) | **0.0 s** (frame 0) | 2.6 s (bag rolls away) | 19.5 s (bag left in the doorway) |
| the loss first SAID (plan / REAL) | 5.80 / about 6.4 s, as a riddle | **1.52 / 1.67 s** | 4.65 / 5.26 s | 11.3 / about 12.3 s |
| first sentence ends (REAL) | driver 1.2 s; narrator's first 3.5 s | 1.67 s | 1.22 s | **5.8 s** (over the 5.5 s that 22 of 24 meet) |
| first cut | 1.20 s | 1.60 s | 1.30 s | 1.00 s |
| cuts in 0-5 s | 2 | 3 | 2 | 2 |
| driver call-outs in the first 20 s | 3 + the kid's echo | 2 | 2 | 3 + the kid's echo |
| tourist and bag both off screen after the hook | 36.3 s (56 %) | 34.1 s (53 %) | **14.7 s (22 %)** | 31.6 s (50 %) |
| longest narrator-only stretch | 22.7 s | 21.8 s | **15.3 s** | 20.3 s |
| end of the number to the end of the film (our rule: 12-15 s) | 16.2 s | **20.6 s** | 12.3 s | 16.5 s |
| realistic total length | 65.5-67 s | 62-67 s | 67-68 s | 65-67 s |

## 2. Scores

| candidate | score 0-100 | hook, first 3 s (0-10) | holds to the end (0-10) | predicted stayed-to-watch | predicted average viewed |
|---|---|---|---|---|---|
| C one thread | **77** | 7.5 | 8 | 76-82 % | 79-87 % |
| B outcome first | **72** | 8.5 | 6 | 78-84 % | 72-79 % |
| A tightened | **65** | 5.5 | 6 | 72-77 % | 72-78 % |
| D narrator dense | **61** | 6.5 | 5 | 71-77 % | 68-75 % |

The predictions are forecasts from the rules, not data. The clown's 68 % stayed is beaten by all four on paper. The
anti-theft's 91.5 % average viewed is not clearly beaten by any; C with the fixes in section 8 has the best chance.

Rule tallies (pass 1, partial 0.5, fail 0):

| | A | B | C | D |
|---|---|---|---|---|
| HOOK_RESEARCH rules 1-10 (core) | 7.5 | **9.5** | 7.5 | 7 |
| HOOK_RESEARCH rules 11-20 | 9 | 9 | **10** | 8.5 |
| OPENINGS_DATA 10 patterns, at REAL speed | 7.5 | 9.5 | **9.5-10** | 9 |
| YOUTUBE_STUDY 14A body tactics (5, 6, 8, 11, 26, 27 and the hook ones), out of 9 | 6.75 | 6.75 | **7.5** | 6.75 |

## 3. Candidate C, "one thread" (rank 1, score 77)

**Opening, quoted:** "He points at nothing." (0.07-1.15) then "And the tourist laughing at him is about to lose
his suitcase." (1.30-4.65), then D: "Signal... green!" at 4.85 s.

**Recount.** PLAN 11 started by 3 s, 17 by 5 s. REAL 9-10 (8-9 ended) and 16. SLOW 8 and 16. So the claim "10 by
3 s" needs a quick read of the long sentence. The word "suitcase" ends between 4.65 s (the plan, his fast pace)
and **5.26 s** (his average pace).

**Hook rules.**
- Pass: rule 1 (the glove lands on frame 3-4), 4 (two nameable questions by 4.7 s), 8, 9, 10, 11 (4 caption words
  in 0-1.5 s), 13, 14 (the doubter is in frame 0 and named at 1.3 s), 15, 16 (the roll and the no-look foot hook at
  3.0-3.7 s, the shout at 4.85 s), 17 (a glove coming at the lens is the strongest looming frame of the four), 20.
- Partial: rule 2. Frame 0 has the glove and face, and also a laughing tourist, the boy's cap and a yellow sliver in
  the window behind. That is three faces. Rule 3 and 7: the loss is shown from 2.6 s and said by 4.65-5.26 s, not
  by 3 s. Rule 5: the first 1.3 s is the famous picture. Rule 6: the finger points at the lens, and the "nothing"
  it points at is not shown until 4.8 s.
- Words against picture: the narrator says "nothing" over a front view that cannot show the empty track. The proof
  comes 3.7 s later. YOUTUBE_STUDY 14A tactic 2 wants the words to match the picture at that moment.

**Measured patterns.** Narrator first at 0.07 s (pass). No gap over 0.20 s (pass). Density at the floor (pass,
no spare). First sentence is a strange act as fact, 4 words, ends 1.2 s: the closest of the four to the hits' own
form ("They painted the jail cell pink."). Cuts at 1.30 and 4.80 s (pass). Second force by 3 s: the tourist full
frame at 1.30 s and the bag rolling at 2.6 s (pass). Familiar topic (pass).

**Body, against 14A.**
- **Main thread (tactic 27): best of the four.** Tourist and bag off screen only 14.7 s in total.
- **Two threads (tactic 6): pass.** New York and the kitchen are gone. R4 and R5 are solved by removal.
- **Emotion change (tactic 5): the only real variety.** Alarm, relief, hope and exasperation exist in no other
  candidate. The others cycle through four shades of the tourist being cocky.
- **A real near-miss.** "First stop. The suitcase rolls for the door... and one small finger saves it." then
  "Bad suitcase." This gives the viewer something that can still go either way, even though the outcome was told.
- **The loop line lands hardest here.** "What's a finger gonna do?" at 22.4 s (34 %), five seconds after a finger
  saved his bag. YOUTUBE_STUDY R8 asked for 30-35 %.
- **The science is shown before it is said.** "This kid gets it!": he looks straight at the bag and misreads the
  boy. Then "You see, his eyes looked right at it. His mind was on his phone."
- **Comment triggers (tactic 11): weakest of the four inside the film.** No stove line, no New York reversal. Both
  were proven triggers in the study's review (R7 says keep the stove line). They live only in the pinned comment.

**Predicted retention curve.**
- First drop: 0.3-1.3 s. A viewer who has seen "Japanese drivers point" recognises the picture, and the laugh is
  playing under the narrator's first words.
- 7.7-10.8 s: "Over a thousand people ride behind that finger." The only early stretch with no tourist. Small dip.
- 19.2-22.4 s: the door plant, 1.1 s with no words. Needed, and the bag is visible behind the glass. Flat.
- 32.2-33.6 s: the wordless thumbs-up. 1.4 s with no new information. A viewer has no reason to stay for it.
- **45.6-56.3 s: the largest risk.** The jars (7.6 s) and then the cab line (3.1 s) keep the tourist and the bag
  off screen for 10.7 s at 70-86 % of the film, exactly when the melody says the doors are about to close.
- 61.9-65.5 s: the last shot is 3.6 s for two words: 1.1 s of grin draining, a 0.5 s beat, and a **1.0 s hold after
  "gone."** That last second is where people swipe instead of looping.
- Replay: **the best meaning of the four.** The last picture is a man pointing at an empty track, and the first
  line of the loop is "He points at nothing." It needs the hold cut to work.

**Timing honesty.** The plan gives 2.9 s to: the boy's point, the tourist's eyes, the lunge, the catch with two
wheels over the gap, the haul, the finger wag, the boy's nod, and two spoken lines. The house rule is 12-18 frames
per gesture. That is 3.5-4 s. The proof beat ("This kid gets it!": the look, the half-second hold, the grin, two
finger guns, the turn, the cap drop) has 2.0 s and needs about 3 s. Short sentences also run slow for James
("The doors." took 0.91 s), and C has six of them. Real length: about **67-68 s**, not 65.5.

**Fixes.**
1. Cut the end hold from 1.0 s to 0.3 s or less and the grin drain from 1.1 s to 0.5 s.
2. Break the 10.7 s absence: put a 1.0-1.2 s shot of the doorway (the bag, the boy, the door lamp) between the jars
   and the cab line, or cut the jars to about 6 s.
3. Give the rescue 3.6 s and the proof beat 3.0 s. Pay for it with the thumbs-up shot (1.4 s) and fix 1.
4. Get "suitcase" to end by 5.0 s on a real take: drop "And" (0.17 s) and set a recording gate.
5. Keep the tourist in frame 0's window small, soft and darker, and hold his laugh 12 dB under until "nothing."
6. Decide the stove and New York losses on purpose (section 8, item 12).

## 4. Candidate B, "outcome first" (rank 2, score 72)

**Opening, quoted:** "His bag is on that train." (0.07-1.52) "He is not." (1.67-2.49) "All he did was laugh... at a
finger." (2.67-4.82), then D: "Signal... green!" at 5.0 s.

**Recount.** PLAN 11 and 17. REAL 9 (9 ended) and 17. SLOW 9 and 15. B planned at 4.1-4.2 syllables/s, which is
James's average over all lines; but these three sentences are almost all one-syllable words, which he read at
3.4-4.0, and "He is not." is directed "low, flat and slow" in 0.82 s when his two-syllable sentences took
0.56-0.91 s. On an average take "at a finger." ends about 5.45 s, and the driver's shout moves to about 5.6 s.
The loss itself is still said by 1.7 s on any take.

**Hook rules. The best tally (9.5 of 10 core).**
- Pass: rule 3 (the result is in frame 0 and said by 1.7 s), 5 (the first picture is the part nobody has seen),
  6 (his fingertip is in line with the yellow suitcase: the pointing finger aims at the hook object), 7 (one person
  has lost one thing by 1.7 s), 9, 10 (HIS BAG / IS ON / THAT TRAIN. / HE IS NOT. over that picture is the best
  sound-off hook of the four), 12 (the yellow singleton is on the key object in frame 0), 14, 16, 18.
- Partial: rule 2. Frame 0 is a medium shot with two subjects (his face at 15 % of frame height on the left, the
  suitcase behind moving glass on the right) plus the kid's hand and cap. Rule 11: six caption words by 1.5 s plus
  NEW YORK on the shirt. Rule 17: the key object moves AWAY from the viewer, which does not grab the eye the way
  an approaching one does.
- It is also the shape of our own best hook: "She'd never stolen anything. Not even a paperclip. Then she read one
  sign, and wanted to steal." Three short sentences, one person, one tiny cause.

**Measured patterns.** Narrator first (pass). Three cuts in 0-5 s, first at 1.60 s (pass). A real opposing force in
frame 0, the train taking the bag (pass, the only candidate with a conflict on screen at 0.0 s). Weak point: the
film's odd act, the driver's point, is not on screen until 3.95 s, and the first sentence is a loss, not a strange act.

**Risks inside the hook.** Cut 2 at 2.6 s is a jump back in time with no marker, 1.0 s after cut 1. The blank face
turning into the same face laughing is a good match, and "did" is past tense, so I expect most viewers to follow.
Some will not on a phone. Three cuts in 2.35 s is also the fastest thing this channel has planned.

**Body, against 14A.**
- **Good:** "So he checks with a finger and a shout." replaces two call-out lines and plants the phrase that
  returns at 54 s. The dare runs straight into the test: "What's a finger gonna do, bro?" then "Japan's railway
  lab tested it." No other candidate puts the question and the test next to each other. The 1.2 s doorway shot at
  43.7 s (the lamp blinks, the melody starts, the kid looks) restarts the clock.
- **Bad:** New York is still 9.5 s of three narrator lines with no main character (R4 asked to save 5-6 s; B
  saved 1.5 s). The tourist and the bag are off screen for 9.1 s right after the hook (8.3-17.4 s).
- **The structural cost.** The answer lands at 43.7 s and the film ends at 64.3 s: **20.6 s**, the longest tail of
  the four (our rule is 12-15 s). In that tail the viewer already knows the number and has already SEEN the last
  picture. The stove line now comes after the answer, so it no longer works as a clue. Three narrator lines in a
  row (44.9-57.6 s) carry it.

**Predicted retention curve.**
- First drop: 2.6-4.0 s, for viewers who do not read the time jump. Smaller than any other candidate's first drop.
- 8.3-14.9 s: two narrator lines, 6.6 s, no tourist. A slow leak.
- 21.7-31.2 s: New York. The tunnel gag holds 3.7 s; the striped-board line (3.7 s) does not.
- **44.9-57.6 s: a steady leak.** Nothing is unknown any more. Only the kid waving keeps it alive.
- 57.6-64.3 s: the payoff replays frame 0. Some viewers will recognise the opening scene coming and leave early.
- Replay: the picture seam is the cleanest of the four (the same shot continues). "His bag is on that train. He is
  not." works as a tag on "Bag... gone." and earns about 2.5 s of the second pass. After that the second viewing
  has nothing new to find.

**Fixes.** Put B's hook on C's body: C's story is literally "how laughing at a finger cost him a bag", which is
the question B's hook asks and B's own body only half answers. If B's body is kept: cut New York to one line and
one picture, move the stove before the lab or drop it, and get the tail under 15 s.

## 5. Candidate A, "the same story, sharpened" (rank 3, score 65)

**Opening, quoted:** D: "Signal... green!" (0.05-1.00), T (off screen): "He's pointing at nothing!" (0.90-2.15),
N: "Give him a minute. He'll be pointing too... at his own suitcase." (2.22-5.80).

**Recount.** PLAN 10 started (9 ended) by 3 s and 16 (15) by 5 s. REAL, with a clipped call, a faster tourist take
and the 0.1 s overlap: 9 (8) and 14 (14). At the takes we already have: **6 and 13**, which A admits. The plan
needs three things at once:
- The driver's call in 0.95 s (measured 1.34 s). The hand goes to his ear and back in 0.13 s (4 frames); the bible
  gives that move 8 + 6 frames. And the voice notes say the tag that speeds Masaki up made "Speed check" unclear
  (p 0.39-0.53). So the first two words of the film depend on a kind of take that measured badly.
- The tourist's line in 1.25 s (measured 1.57 s).
- Two voices on top of each other at 0.90-1.00 s. The owner's rule is lines that are easy to hear clearly.

**Hook rules.**
- Pass: 1, 2 (the cleanest frame 0 of the four: one glove, one face, nothing behind), 4, 8, 9, 10, 12, 13, 14, 16
  (the bag rolls an inch at 4.5 s), 17, 19, 20.
- Fail: rule 7. Nobody can lose anything until "suitcase" at 5.3-6.4 s, and even then it is a riddle ("pointing at
  his own suitcase"), not a loss.
- Partial: rule 3 (a tease, done by 5.8 s), rule 5 (the first 1.2 s is the famous picture), rule 18.

**Measured patterns.** Pattern 1 fails: a character speaks first, and the narrator arrives at 2.22 s on the plan
and about 2.6 s on real takes. That is 0 of 24. Three voices and three places (cab, phone view, car) in 2.3 s also
strains "one idea in 3 s". Pattern 5 is well done: the first cut at 1.20 s goes to the thing he points at, an
empty track, which is how the hits cut. Shot 2 brings back the phone layers (record dot, 00:12) for 1.05 s.

**Body, against 14A.**
- **The hole after the hook.** The hook names the suitcase at 5.8 s. Then the tourist is gone from 6.75 to 17.75 s
  and the suitcase from 5.95 to 18.05 s: **11-12 s** without the thing the viewer was just told to watch.
- Three driver call-outs in 17 s ("Signal... green!", "Speed... check!", "Doors... closed!"). The kid's late
  "Check!" with the cap slip is a good small laugh, but it decorates the repeat; it does not remove it (R3).
- New York is 8.7 s (R4 half done).
- 34.8-49.7 s: stove, then a 1.4 s insert, then the lab. Three place changes in 6 s. The insert asks the viewer
  to read a small railway signal turning green behind a suitcase and to know that green means this train leaves.
  Second 1 did not teach that. B's doorway shot does the same job more clearly.
- The sixth ball bouncing out of the jar is a good gag in the calm spot (14B item 2).
- Tourist and bag off screen: 36.3 s of 64.9 s (56 %), the worst of the four.

**Predicted retention curve.**
- First drop: 0.3-1.5 s (famous picture, a shouted character voice, no narrator).
- **6-18 s: the main loss.** A new viewer was promised a suitcase and gets a crowd, a speedometer and two more calls.
- 27.2-30.3 s: the striped-board line.
- 38.9-42.8 s: the insert and "Japan's railway lab ran a simple test." 3.9 s of setup.
- 55.05-58.15 s: the cab line (short, and the melody covers it).
- Replay: a fair match cut. "Bag... gone." and "Signal... green!" share a two-word rhythm, so the seam sounds like
  one more call. The second viewing rewards little.

**Fixes.** Narrator first. Move the suitcase tease inside 3 s. Drop "Speed... check!". Bring the tourist or the
bag back inside 6-18 s. Replace the signal insert with the doorway shot.

## 6. Candidate D, "narrator dense" (rank 4, score 61)

**Opening, quoted:** "This train driver points at a green light and shouts at it," (0.05-2.95), D: "Green!"
(3.03-3.45), "with a thousand people behind him." (3.53-5.25). Then T: "Yo! He's pointing at nothing!" (5.30-7.00),
then N: "Give him a minute. He'll be pointing too... at his own suitcase." (7.10-11.30).

**Recount.** PLAN 12 and 19. REAL 10 (9 ended) and 17 (16). SLOW 9 and 16. D's plan needs 4.14 words/s on a
12-word clause. James's six lines of 8 words or more ran at 3.0-4.0 (median 3.4). On an average take the first sentence ends at about
**5.8 s** (SLOW 6.4 s), past the 5.5 s that 22 of 24 hits meet. D's own "pessimistic check" says the same, and its
recording gate is the right idea. Every later time then slips by 0.6-0.9 s: the tease ends at about 12.3 s.

**Hook rules.**
- Pass: 1, 2, 4, 6 (the insert at 1.0 s puts the green light at his fingertip), 8, 9, 10, 11, 13, 16, 17 (the lamp
  growing from a dot and whipping past is strong motion toward the viewer), 18 ("a thousand people"), 19.
- **Fail: rule 3, rule 5 and rule 7.** The first 5.25 s is the famous fact and only that. No outcome. Nobody can
  lose anything. The tease lands at 7.1-11.3 s, the latest of the four by 5 s.
- Partial: rule 14 (the tourist is a soft shape behind the driver's shoulder at 2.6 s and does not speak until
  5.3 s), rule 15, rule 12 ("a mid-tone cab" may read dim).

**Words against picture: the best of the four.** "points" over the glove, "a green light" over the insert, "shouts
at it" one beat before "Green!". The proof arrives within a second of each claim (YOUTUBE_STUDY 4.4).
**But the line spends the mystery.** The title says he points at nothing. The first sentence says he points at a
green light. The tourist's "He's pointing at nothing!" at 5.3 s then reads as wrong, two seconds after we saw the
lamp fill a quarter of the frame. A viewer has the whole premise by 3 s and no reason to expect more.

**Body, against 14A.**
- 11.45-19.5 s: "The driver points at the speed." "Speed... check!" "Check!" "Then the doors." "Doors... closed!"
  With "Green!" at 3 s that is three calls and an echo in 19 s (R3 not fixed).
- New York 8.2 s. The idea of the tourist standing under the striped board with his eyes on his phone is the best
  New York idea in any candidate: it puts the main character in the detour. As written it is an unexplained
  second copy of a man who is in Tokyo.
- 35.65-47.0 s: the stove runs straight into the lab with no cut back to the bag. R5 is not fixed; the yawn gag is
  small. 35.65-55.93 s is 20.3 s of narrator alone over four places.
- "A finger and a shout drag it back." "it" points back across a pause to "your mind". Less clear than v2's line.
- **The tail.** After "Bag... gone." comes "Which is why..." and a push: about 1.5-2 s after the payoff.

**Predicted retention curve.**
- First drop: 1-3 s. The picture is strong, but the content is the known fact stated plainly.
- 5.3-7.0 s: the foraging re-check with no stake yet.
- 11.5-19.5 s: the call-out run with no tourist.
- 23.5-32.1 s: New York.
- **35.7-47.8 s: 12 s in a kitchen and a lab** with the bag unseen.
- 62.35-63.5 s: the tail. Some viewers leave on "gone."
- Replay: the hanging "Which is why..." is the strongest pull across the seam of the four, because a cut-off
  sentence makes people wait for its end (the one part of the open-loop idea that survived the 2025 meta-analysis).
  It costs 1.5-2 s after the payoff and breaks "end on the last word".

**Fixes.** Put the loss in the first sentence in place of "with a thousand people behind him". Cut "Speed...
check!". Cut back to the bag between the stove and the lab. Keep "Which is why..." only if it is 1.0 s or less.

## 7. Best elements to graft (exact lines and beats, from any candidate)

From C:
1. Line 1 and the loop: "He points at nothing." over the glove coming at the lens, with the last picture a man
   pointing at an empty track, so the line means two things on the second pass.
2. "And the tourist laughing at him is about to lose his suitcase." while the suitcase creeps at 2.6 s, rolls, and
   his sneaker hooks a wheel at 3.7 s without a look.
3. "First stop. The suitcase rolls for the door... and one small finger saves it." then T: "[firmly] Bad suitcase."
4. T: "[laughing] What's a finger gonna do?" at about 34 %, right after the rescue.
5. T: "Stay. Be right back." then N: "[deadpan] It stays."
6. N: "The small finger points again... at the suitcase." then T: "[laughing] This kid gets it!" (his eyes come
   straight down the boy's arm to the bag, hold half a second, then two finger guns).
7. N: "You see, his eyes looked right at it. His mind was on his phone."
8. N: "Over a thousand people ride behind that finger."
9. The jars as one picture with the platform's departure melody still playing under it, one ball per beat.

From B:
10. The hook, as the A/B alternative on the same body: "His bag is on that train. He is not. All he did was laugh
    at a finger." with frame 0 = his fingertip in line with the yellow suitcase behind the door glass.
11. N: "So he checks with a finger and a shout." (one line for two call-outs; it plants "a finger and a shout").
12. The dare next to the test: "What's a finger gonna do, bro?" straight into "Japan's railway lab tested it."
13. The 1.2 s doorway shot: the lamp above the door starts to blink, the first notes of the departure melody, the
    kid looks at the lamp, at the suitcase, then at the tourist's back.
14. The seam: the last shot is frame 0's camera 1.9 s earlier; his hand comes up beside his ear on "Bag...", and
    the arm starts forward on the last two frames.
15. The sound-off caption run: HIS BAG / IS ON / THAT TRAIN. / HE IS NOT.

From A:
16. The first cut at about 1.2 s onto the thing he points at: the glove from behind, its fingertip on a
    dead-straight EMPTY track (without the record dot and timer).
17. The sixth red ball bounces out of the jar; the researcher stops it with his clipboard without looking up.
18. The boy's too-big toy cap drops over his eyes and he pushes it up with one finger, still pointing.

From D:
19. One picture per phrase inside the first sentence, with the proof inside one second ("shouts at it," then
    D: "Green!" tucked into the comma). The one-word call saves 0.9 s against "Signal... green!".
20. Shot B: the green lamp grows from a dot to a lamp and whips past the fingertip.
21. N: "Which is why..." hanging into line 1, as a tested option of 1.0 s or less.
22. The recording gate: accept an opening take only if the word targets are met on the real audio; never stretch;
    if no take is fast enough, cut a word.
23. The tourist standing under the striped board with his eyes on his phone (only if New York is kept).
24. Voice and bed at about -15 dBFS from 0.5 s (the clown opened at -23).

## 8. Must fix in the final (from this lens)

1. **The narrator speaks first, by 0.09 s.** No character voice before him. A's opening cannot be used as it is.
2. **The loss must be on screen by 3.0 s and said by 5.0 s on a REAL take** (0.24 s per syllable). C's "suitcase"
   ends at 5.26 s on an average take: drop "And", or use B's hook. D's 11.3 s and A's riddle at 5.8-6.4 s fail.
3. **Plan the opening at 3.3 words/s, not 4.1.** Gate the take on the lab's own rule: the 9th word has started
   before 3.0 s and the 14th before 5.0 s, no gap over 0.3 s. Cut pauses in silence to 0.15 s. Never stretch.
4. **Run the hook A/B before voicing the body:** C's two sentences against B's three, on the same body, in the
   feed-sandwich test (HOOK_RESEARCH section 11). Both fit C's story.
5. **Never leave the tourist and the bag for more than about 4 s in 5-20 s,** and never for more than about 6 s
   after that. C breaks this at 45.6-56.3 s (10.7 s): add the doorway shot between the jars and the cab line.
6. **At most two driver call-outs before the payoff,** and no "Speed... check!".
7. **No third story of more than about 4 s.** New York is either out (C) or one line and one picture tied to the
   tourist.
8. **No two calm explaining beats in a row,** and the number block no longer than about 7 s, with the departure
   melody audible under it.
9. **From the end of the number to the end of the film: 15 s or less.** B's 20.6 s is out.
10. **Nothing after the payoff.** After "gone.": 0.3 s or less, then the cut. C's 1.0 s hold and 1.1 s grin drain,
    A's 0.6 s hold and D's 1.5-2 s tail all need cutting.
11. **Time the two gags that carry C honestly:** the first-stop rescue needs about 3.6 s and the "This kid gets it!"
    look needs about 3.0 s with a clean view of his eyes landing on the bag. Without that look, "his eyes looked
    right at it" has no proof. Pay for them with the wordless thumbs-up (1.4 s) and item 10.
12. **Decide the comment loss on purpose.** C drops the stove line and the New York reversal, the two proven comment
    triggers. From a retention view that is right. Put both in the pinned comment and the day-2 poll, and do not
    add either back into the film unless the real voice comes in under 64 s.
13. **Frame 0 is one subject.** In C's frame 0 the tourist in the window stays small, soft and darker than the
    driver; his laugh stays 12 dB under the voice until "nothing."; no yellow except the sliver. In B's frame 0 the
    suitcase must read through clean glass in 0.25 s, and the caption count in 0-1.5 s must drop to 5 words.
14. **Words match the picture.** If line 1 is "He points at nothing.", show the empty track by about 2 s (graft 16)
    or accept that the proof comes at 4.8 s with "There's nothing there!". Note for the fact check: the narrator
    states "nothing" as fact while the picture shows a signal.
15. **Length: 68 s or less on the real voice, hard maximum 70 s.** C will run 67-68 s after item 11. Change its
    cut order: cut the wordless thumbs-up shot first (1.4 s), then the end hold, then shorten the jars. "It stays."
    saves only 0.8 s and pays off at 58 s, so it should not be the first cut.
