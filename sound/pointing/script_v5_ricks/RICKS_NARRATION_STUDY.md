# How a Ricks Clips Short is told, measured, and where our v4 differs (STORY owner, 2026-11-20)

**Data.** All 32 of his story Shorts (the 31 of our 2026-11-19 study + "The Prisoner Who Tunneled Into a Bank",
posted today, 118K views so far; on the Shorts tab it is the only one newer than our study). 11 transcripts existed; I made 21 more
today with faster-whisper small.en (word times): `research_notes\ricksclips\transcripts_older_2026-11-20\` (13 local
videos) and `transcripts_new_2026-11-20\` (8 downloaded with yt-dlp in a scratch venv into
`yt short videos\new_2026-11-20\`). Counts by script: `research_notes\ricksclips\narration_stats.py` ->
`narration_stats_32_2026-11-20.json`. Views from the channel page today. Ours: SCRIPT_v4 (today's cut) timed on James's real takes (method in
`SCRIPT_v5_proposal.md`). Whisper punctuation decides sentence counts, so they are close, not exact. Quotes are a
few words, for study only.

## 1. His telling, measured (median of 32, range)

| measure | his median (range) | example |
|---|---|---|
| words per second | **3.70** (3.36-4.07) | almost no pauses: 1 gap of 0.4 s+ per video |
| words started by 3 s / 5 s / 10 s | **12 / 19 / 36.5** (floor 9 / 15 / 31) | |
| first sentence | **14 words** (6-31), ends at **3.6 s** | "He sawed gaps into a railroad every 39 feet." |
| words per sentence | **14.1** mean per video (9.1-27.5); 3.5 sentences of 20+ words | long running sentences joined by "and", "while", "so" |
| sentences of 4 words or fewer | **1** (0-6) | "Rail touching rail." "Not really." |
| sentence starts | "So" 54x in 29/32 videos; "But" 45x in 25/32; "You see," in 22/32; "Then" in 16/32; "Well," in 8/32 | "So the town nails a giant flashing arrow to it." "Yet the crashes double." |
| questions | **1** per video; 2 of 3 fall at 12-41 % or 62-78 % | "But why?" (7 s), "So what's in there?", "Wait, what?" |
| "you" words per 100 | **1.25** (0-9.7); the "you" stories 5-10 | |
| numbers | about **4** per video, small and physical | "82 holes", "300 pounds of tattoos", "15 miles an hour" |
| years said | **1 in 32** videos ("the 1700s") | dates live on boards |
| real names | 1 in 32 (Edison, "rumored") | "a scientist", "the youngest engineer" |

**First sentence.** None of the 32 opens on a task. 31 open on a statement: 18 a strange act in the past tense
("They painted the jail cell pink."), 6 "If you..." ("If you plant a tree beside an empty road, cars will steer right
into it."), 5 a strange claim ("Gambling is illegal in Japan, yet..."), 1 "You just...", 1 an order to look ("Look
at these two scratch cards. One's a winner and one's garbage.", 6.7M). The only question opener ("How do painkillers
know...") is one of his two flops. The act is drawable, the reason hidden, and it often defeats itself ("made sure it
wouldn't go off", "yet it didn't lead out to freedom"). His one true experiment is told the same way: "A scientist
dropped people off a tower just to find out what happens to time right before you die." (6.7M).

**How the story moves.** A second sentence of stakes ("You see, 10,000 samurai are camped outside his city"), then
3-6 steps, each a choice ("So...") or a setback ("But...", "Yet..."), with one odd exact detail per step. Story
events per 10 s (BENCHMARK_story 2.3): Instinct 2/3/3/3/0/0, Railroads 2/3/2/2/2/2; Prisoner (new) 2/2/2/3/1/1.

**The question** is raised once by the hook and held to about 70 %, with a turn line at 40-70 % ("Then summer comes,
and something weird happens.", "But it gets weirder."). Often a character says it for the viewer: a doubter in
about 19 of 32 ("A bomb that doesn't even explode? Get out of my tent!"; today's: "Congrats! You're the first guy to
ever break back in."). Sometimes the narrator does it himself: "Sounds like the worst nap ever." (16M).

**Jokes** come every 3-5 s and are always also a plot step: a sarcastic doubter, a deadpan tag ("Not really."), an
absurd exact detail, a side character profiting (the tow-truck guy "with a lawn chair"). Counted laughs: Instinct
6 in 59 s, Burglar 4, Pink cell 4, Railroads 4 (BENCHMARK 2.4).

**The why** is 1-3 sentences, physical, after the answer, with at most one everyday comparison ("Ever blown on a
bowl of soup?"); often a named trick: "Well, it's called target fixation." "You see," opens it: 10 of 24 uses come
at 4-15 % (stakes), 13 at 65-92 % (the reason), 1 in the middle.

**Tense and tone.** Past-tense hook, then present tense for the action in 15 of his 19 past-tense tales ("He
climbs out furious, grabs an ax..."). Warm, brisk, deadpan, never comments ("amazingly" never appears), never
greets, never asks to subscribe.

**Twist and last line.** The answer lands at about 72 %; the last sentence (median 17 words) is an ironic picture
that lands on the doubter or the rule, often timed "right as / just as" (4 of 32), and the film ends on its last
word. Two "would you" endings ask the viewer a question; they get the most comments per view, fewer views. No loop
mechanic beyond word loops ("on paper, nobody gambles").

## 2. The same measures for OUR v4 (today's cut text, 71.3 s on median takes)

| measure | his median | our v4 | our v5 proposal |
|---|---|---|---|
| words per second (whole film) | 3.70 | **2.64** (2.99 inside speech) | 2.69 (3.05) |
| words by 3 / 5 / 10 s | 12 / 19 / 36.5 | **9 / 13 / 26** (4 of the 13 are "Go") | 9 / 13 / 27 |
| first sentence | a 14-word strange fact, 3.6 s | **a 7-word order** ("Tap your foot on every green light."), 2.4 s | same (opening 2 in the proposal: 16-word fact) |
| words per sentence (narrator) | 14.1 | **7.2** (median 6); 1 sentence of 15+ | 7.6 |
| sentences of 4 words or fewer | 1 | **9** + the 7 "Go" | 5 + the 7 "Go" |
| sentence starts So / But / You see / Then | in 29 / 25 / 22 / 16 of 32 | **2 / 0 / 0 / 1** | 3 / 1 / 1 / 0 (+ "but" inside line 5) |
| questions | 1 | 2 ("Did you tap?" 7 s; "And where did it come from?" 40 s) | 1 |
| "you" per 100 words | 1.25 | 3.2 (the game) | 3.9 |
| years said | 1 in 32 | **1** ("In 1994") | 0 (on the board) |
| tense | past hook, present action | past throughout | lab in the present |
| doubter | about 19 of 32 | none (the viewer is the one who is sure) | same |
| story events per 10 s | 2-3 | 3/2/2/1/2/3/3 (16 in 71 s) | 3/3/1/1/3/3/2 (16 in 67 s) |
| laughs or "no way" beats | 4-6 a minute | 7 ("She did.", five pressed, not one, cereal, eyes gone bad, "He never knew", the sign + "had to point") | same 7, about 4 s sooner |
| longest stretch with no laugh or surprise | under 10 s in the hits | **about 15 s**, lines 10-13 (29 to 44 s) | about 14 s (27 to 41 s) |
| the twist | about 72 % | 78 % ("He never knew about the eyes.") | 77 % |
| last line | ironic picture on the doubter | ironic picture (line 21) then an order to replay (line 22) | same |
| loop | word loops only | line 22 sends you back into frame 0 | same |

**Where v4 is already in his manner (leave alone):** one narrator, no greeting, no names; small physical numbers;
the why in three short sentences with one everyday comparison (the cereal, like his soup); the deadpan tags "She
did." and "Not one pressed." (his "Not really."); "His boss rode along, loved it, and made it a rule." (his run-on of
three verbs); the twist at 78 %; an ironic last picture that lands on a rule ("And the conductors had to point.").

## 3. Where ours differs, ranked (line numbers are v4's)

1. **Pace and density: 26 words by 10 s against his floor of 31.** Mostly the voice (James 2.9-3.4 words a second
   inside sentences; we may not stretch him), plus the 0.5 s held beat and the "Go" grid (lines 1-3). Not fixable by
   wording; only by not wasting time (point 2).
2. **Short tag sentences: 9 against his 1** (lines 1 "Only green.", 3, 4 "A hundred lights." "Then, red.", 5 x2,
   8, 22 "Now try again."). On James they are the slowest words (2.0-2.4 w/s; "Then, red." 1.32 s for 2 words).
   Sentences half his length (7.2 against 14.1).
3. **The first sentence is an order, not a strange fact** (lines 1-2). 0 of his 32 do this; 9 words by 3 s is his
   floor and 13 by 5 s is under his floor (15). Our own data cut both ways: five of five blind readers chose this
   opening over the time-order one; our only feed test of a task opening (clown) lost 32 % at the start.
4. **No "So / But" chain at the joins** (lines 11 "Which is why", 13 "And where did it come from?", 5). The film
   reads as three stories (lab, steam cab, New York) set side by side; his reads as one line of pressure.
5. **No doubter and no growing pressure after 20 s** (lines 9-13). His stakes rise step by step ("Yet the crashes
   double."); ours restarts at line 13 with a new story. The cut line 6 ("three of them did it again") was the one
   escalation step. This is where four of five readers said they would swipe.
6. **Past tense throughout** (lines 4-8); he tells the action in the present after a past hook.
7. **A year in the voice** (line 4 "In 1994"); he says one in 1 of 32.
8. **The why comes at 35 %, not 70 %** (line 9). That is the experiment variant our study allows (result early, a
   bigger twist within about 10-20 s); ours has the twist at 78 %, so it holds.

The changes this study supports are in `SCRIPT_v5_proposal.md`; the read-aloud comparison is in `SIDE_BY_SIDE.md`.

**Could not research:** YouTube's auto-captions (HTTP 429), so all transcripts are Whisper's; per-video retention
(not public); likes and comments only as listed. The "doubter in 19 of 32" and the laugh counts are my reading.
