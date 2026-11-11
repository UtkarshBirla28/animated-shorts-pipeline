# The Anti-Theft Sign That Made People Steal

Real video (not a test). Built in `<ROOT>` (picture: `studio\src\videos\antitheft\`,
sound: `sound\antitheft\`), following `study\CHANNEL_STYLE_BIBLE.md`.

## Facts and sources (checked)
- **Paper:** Cialdini, R. B., Demaine, L. J., Sagarin, B. J., Barrett, D. W., Rhoads, K., & Winter, P. L. (2006).
  "Managing social norms for persuasive impact." *Social Influence* 1(1): 3-15.
  PDF: https://research.fs.usda.gov/download/treesearch/45277.pdf
- **The park's real old sign:** "Your heritage is being vandalized every day by theft losses of petrified wood of 14 tons
  a year, mostly a small piece at a time." The park estimated more than a ton stolen per month.
- **The fiancee story:** Cialdini's US House Science subcommittee testimony (25 Sept 2007) and Cialdini (2003): a graduate
  student visited with his fiancee, "the most honest person he had ever known, someone who had never taken a paperclip or
  rubber band without returning it". After reading the sign she whispered, "We'd better get ours now."
  Rules: never name the couple; never show her actually taking a rock (the source never says she did).
- **The experiment:** 2,655 visitors, 5 weekends, 3 trails (Jasper, Long Logs, Crystal). 3-foot square signs at the start
  of each path, rotated between trails. 20 marked pieces of wood per path per 2-hour block, counted and replaced.
  - Sign A (injunctive): "Please don't remove the petrified wood from the park." Picture: ONE visitor taking wood with a
    red circle-and-bar over his hand. Result: 1.67 % stolen.
  - Sign B (descriptive): "Many past visitors have removed the petrified wood from the park, changing the state of the
    Petrified Forest." Picture: THREE visitors taking wood. Result: 7.92 % stolen (about 4.7 x Sign A).
- **The bait wood** came from the park's "conscience pile": pieces stolen by visitors who later "sent them back by mail,
  often with profuse apologies". The park could not put them back (random placement would spoil the natural, scientifically
  important layout). Paper footnote 1; Smithsonian:
  https://www.smithsonianmag.com/smart-news/one-more-weird-aspect-americas-strangest-national-park-conscience-pile-180961377/
- **Age of the trees:** over 200 million years (Late Triassic). Re-checked 2026-11-10 on nps.gov: the park's rocks were
  deposited 208-228 million years ago (Paleontology page, https://www.nps.gov/pefo/learn/paleontology.htm); the Geodiversity
  Atlas gives 223-208 Ma (https://www.nps.gov/articles/nps-geodiversity-atlas-petrified-forest-national-park.htm). The
  narration says only "over 200 million", which all NPS figures support.

## Settings (user, 2026-11-10)
- About 58 s (54-62), 217 words at ~3.7 w/s. Kokoro brighter male narrator (~195 Hz), one steady, slightly amused tone;
  speed-up to 1.15-1.2x only if it stays natural. Whispered line: +4 semitones, softer.
- Captions ON (CHANNEL_STYLE_BIBLE.md section 7). Digits: 200 million, 14, 2%, 8%. English, US spelling.
- Music: original synth, playful and mischievous (light plucks + woodblock); curious at the mystery line; small swell on
  the final twist; not sad, not a march; ends on the last word.
- Loop: the last frame is the warning sign at the trail start, matching frame 0.
- Description: "Based on Cialdini et al. (2006), Social Influence." Pin the paper link in a comment.
- Safety: no NPS arrowhead/patches, no university logos; never name the couple; she never takes a rock; Cialdini shown
  respectfully as a generic cartoon (not a likeness); stealing is mild and comic (no police, arrests or fines); family-safe;
  never mention or copy the reference channel.

## Script (voice-over, 217 words)
She'd never even kept a borrowed paperclip. Then she read one sign... and wanted to steal.

Arizona's Petrified Forest. Trees over 200 million years old, turned into rainbow-colored stone. Visitors kept pocketing
little pieces. So the park put up a warning:

"Your heritage is being vandalized every day... fourteen tons a year, mostly a small piece at a time."

She read it, leaned over to her fiancé, and whispered: "We'd better get ours now."

But why would a warning make an honest person want to steal?

Her fiancé's professor, psychologist Robert Cialdini, tested it. His team hid marked wood along the trails, and kept
swapping the signs.

One said: "Please don't remove the petrified wood." Another said: "Many past visitors have removed the petrified wood."

With "please don't," fewer than 2% of the pieces vanished. With "many past visitors"... almost 8%. Nearly five times more.

You see, we don't copy rules. We copy each other. "Many people steal" doesn't sound like a warning. It sounds like what
everyone does.

It's like a teacher announcing, "Half this class cheated." The other half hears: everybody cheats.

The sign didn't stop thieves. It gave them permission.

And the bait wood? It came from the park's "conscience pile": pieces people stole, then mailed back with apology letters.
So some of it got stolen twice.

## Cut list (only if the voice runs past 62 s), in order
1. Drop "Trees over 200 million years old, turned into rainbow-colored stone." (show it in the picture instead).
2. Drop "Nearly five times more."
3. Analogy -> "Like a teacher saying, 'Half this class cheated.'"

## Build log
(see the end of this file; updated after every step)

### 2026-11-10 voice (done)
- Kokoro `am_fenrir` (Kokoro's top-graded US male, the brightest/most expressive of the three top voices: median F0
  139 Hz, p10-p90 103-205 Hz, 11.9 semitones; no Kokoro male reaches the channel's ~195 Hz), speed 1.2 (the cap).
- At 1.2x the full script ran 65.9 s, so the cut list was applied in order: cut 1 (65.9 -> 64.2 s, still > 62),
  cut 2, cut 3 -> 61.67 s (last word ends 61.46 s; video 62.0 s with a 14 f loop button). The "200 million years" fact
  moves to an in-world plaque in shot 3.
- Whispered line generated at 1.05x, +4 semitones (rubberband, formants preserved), -5 dB, soft top cut + breath layer.
- Soft sentence onsets (The / It / pieces / So) generated after the previous phrase and cut at the pause.
- Files: voice/voice.wav (48 kHz 24-bit), voice/words.json (205 caption tokens with times), voice/phrases.json,
  voice/voice_info.json; picture timing: studio/src/videos/antitheft/words.ts (generated), audio/timeline.json.

### 2026-11-10 build + audit round A1
- Voice v3 FINAL (expressive): Kokoro am_fenrir 1.2x, per-line style blends (am_puck for excited lines, am_michael for
  deadpan) + small pitch nudges, each Whisper-checked and kept only if as clear as plain (8/10 kept); 2 dramatic 0.30 s
  pauses; punch lines +1-2.5 dB. v2's global +1.5 st brightening was dropped: rubberband shifting blurred consonants.
  61.61 s; word onsets refined (refine_onsets.py, 5 words moved 41-138 ms earlier).
- Build round 1 (5 sandboxed builders) merged; frame 0 reframed (low hero angle, face above the caption band, board
  raised 0.45 m); preview1.mp4 (540x960 with mix) rendered in 11 min.
- Audit A1 (9 auditors): overall 4.8/10 (framing 4.6, camera 4.9, light 5.8, colour 6.5, place 5.5, characters 5.7,
  acting 4.2, life 4.3, readability 4.7, intrigue 5.1). Fix round 1 launched with 6 owners incl. a camera owner.
