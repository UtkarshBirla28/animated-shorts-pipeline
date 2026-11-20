# Writes SOUND_EVENTS_V2.md from the last mix: every cue (frame, sound file, level, pan, which picture action), what
# became of every line of the animators' three cue files, the bed, the measurements, the proof for the quiz hard rule
# and five timestamps for a headphone check. Called by mix.py (events_doc.write(J, R)); nothing is played.
import os
import time
import timeline as T

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "SOUND_EVENTS_V2.md")
FPS = T.FPS


def tc(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def esc(s):
    return str(s).replace("|", "/").replace("\n", " ")


def write(J, R):
    B = T.BEAT
    cues, rep = J["cues"], J["report"]
    ev = [c for c in cues if c["kind"] == "sync" and c["cls"] != "step"]
    loops = [c for c in cues if c["kind"] == "long"]
    steps = [c for c in cues if c["cls"] == "step"]
    L = []
    w = L.append
    w("# SOUND EVENTS v2: \"The Clown Nobody Saw\" (rebuild, script v6)")
    w("")
    w(f"Written by `mix.py` on {time.strftime('%Y-%m-%d %H:%M')} from the mix it just made (effects key `{R['key']}`). "
      f"Film: {R['frames']} frames = {R['seconds']:.3f} s = {R['samples']} samples at 48 kHz. Nothing was played: every number here is measured.")
    w("")
    p4 = os.path.join(HERE, "_p3", "p4_section.md")          # p4: the final acting round's note (written from _p3/verify_p4.json)
    if os.path.exists(p4):
        for line in open(p4, encoding="utf-8").read().rstrip("\n").split("\n"):
            w(line)
        w("")
    p3 = os.path.join(HERE, "_p3", "p3_section.md")          # p3: the polish round's own section (written from _p3/verify_p3.json)
    if os.path.exists(p3):
        for line in open(p3, encoding="utf-8").read().rstrip("\n").split("\n"):
            w(line)
        w("")
    w("## 1. Where the cues come from")
    w("The cue list is data-driven. `sfx.py` reads the three animators' files at mix time and its table `MAP` turns each cue "
      "name into a real sound of the library (CC0 recordings and ElevenLabs sound-effect generations; sources in `CREDITS.txt`), "
      "rotating takes across repeats. Levels are LU under the voice (the event's loudest 0.4 s); `near` in the cue sets the level, `pan` the place.")
    w("")
    w("| file | cues | sounded | not sounded |")
    w("|---|---|---|---|")
    for src, path in zip(("quiz", "story1", "story2"), rep["files"]):
        rows = [r for r in rep["rows"] if r["src"] == src]
        on = [r for r in rows if r["status"] in ("play", "step", "loop", "roll")]
        try:
            mt = time.strftime("%H:%M", time.localtime(os.path.getmtime(path)))
        except OSError:
            mt = "missing"
        w(f"| `{os.path.relpath(path, os.path.join(HERE, '..', '..', '..')).replace(os.sep, '/')}` (saved {mt}) | {len(rows)} | {len(on)} | {len(rows) - len(on)} |")
    w("")
    c = rep["counts"]
    w(f"Of the {len(rep['rows'])} cue lines: {c.get('play', 0)} events, {c.get('step', 0)} footsteps, {c.get('loop', 0) + c.get('roll', 0)} loop / roll cues are sounded; "
      f"{c.get('thin', 0)} were thinned (\"fewer, better\": {len(ev)} events sound in the whole film, the own moments included), {c.get('rule', 0)} were held back by the quiz rule, "
      f"{c.get('far', 0)} are too far to hear on their own, {c.get('silent', 0) + c.get('merged', 0)} are silent by design or carried by another cue, "
      f"{c.get('off', 0)} are empty, and **{c.get('UNMAPPED', 0)} have a name the table does not know** (section 7).")
    for p in rep["problems"]:
        w(f"- **Cue file problem:** {esc(p)}")
    w("")
    w(f"## 2. Events ({len(ev)}): frame, sound, level, pan, picture action")
    w("`sync` = where the sound's sync point (its onset; its peak for a whoosh) landed against the picture frame, in frames (+ = late). "
      "The mix stops if a cue is more than 1 frame early or 2 late. `own` = a moment keyed to the timeline by `sfx.py`, not from a cue file.")
    w("")
    w("| frame | time | shot | cue | sound file(s) | level LU (set / measured) | pan | sync f | picture action |")
    w("|---|---|---|---|---|---|---|---|---|")
    for q in sorted(ev, key=lambda q: q["frame"]):
        se = "" if q["sync_err"] is None else f"{q['sync_err']:+.2f} ({q['sync_mode']})"
        ms = "" if q["measured"] is None else f"{q['measured']:.1f}"
        w(f"| {q['frame']:.0f} | {tc(q['t'])} | {q['shot']} | {q['name']}{' (own)' if q['own'] else ''}: {esc(q['sound'])} | {esc(q['files'])} | {q['level']:.1f} / {ms} | "
          f"{q['pan']:+.2f} | {se} | {esc(q['action'])} |")
    w("")
    w(f"## 3. Loops and long sounds ({len(loops)})")
    w("| frames | time | shot | cue | sound file(s) | level LU | pan | picture action |")
    w("|---|---|---|---|---|---|---|---|")
    for q in sorted(loops, key=lambda q: q["frame"]):
        w(f"| {q['frame']:.0f}-{q['frame'] + q['dur_f']:.0f} | {tc(q['t'])} | {q['shot']} | {q['name']}{' (own)' if q['own'] else ''}: {esc(q['sound'])} | {esc(q['files'])} | "
          f"{q['level']:.1f} | {q['pan']:+.2f} | {esc(q['action'])} |")
    w("")
    walkers = {}
    for q in steps:
        walkers.setdefault((q["shot"], q["walker"]), []).append(q)
    w(f"## 4. Footsteps: {len(steps)} steps of {len(walkers)} walkers")
    w("One recorded step on every frame the animators list, one shoe per walker, takes rotating, the level following the distance only (no step is accented).")
    w("")
    w("| shot | walker | shoe | steps on frames | level LU | pan | worst sync f |")
    w("|---|---|---|---|---|---|---|")
    for (shot, who), qs in sorted(walkers.items(), key=lambda kv: kv[1][0]["frame"]):
        lv, pn = [q["level"] for q in qs], [q["pan"] for q in qs]
        se = max((abs(q["sync_err"]) for q in qs if q["sync_err"] is not None), default=0.0)
        frs = ", ".join("%.0f" % q["frame"] for q in qs)
        w(f"| {shot} | {esc(who)} | {qs[0]['shoe']} | {frs} | {min(lv):.1f} .. {max(lv):.1f} | {min(pn):+.2f} .. {max(pn):+.2f} | {se:.2f} |")
    w("")
    w("## 5. The living bed")
    w("| layer | level LU | what |")
    w("|---|---|---|")
    for name, lvl, desc in J["beds"]:
        w(f"| {name} | {lvl:.1f} | {esc(desc)} |")
    w("")
    w("The square bed is dulled once her mind is in the call (S15, from its relight) and in the slow motion (S20), is band-limited \"on tape\" in E3, "
      "dips for the breath before \"Did you see the money?\", and is loop-safe (its last sample runs into its first). The office bed replaces it under S2-S5, "
      "crossfaded on the picture's dissolves.")
    w("")
    off = [r for r in rep["rows"] if r["status"] not in ("play", "step", "loop", "roll", "UNMAPPED")]
    w(f"## 6. Listed by the animators, not sounded ({len(off)}), with the reason")
    w("| frame | shot | cue | why | the animator's note |")
    w("|---|---|---|---|---|")
    for r in off:
        w(f"| {r['frame']:.0f} | {r['shot']} | {r['name']} | {esc(r['why'])} | {esc(r['what'])[:110]} |")
    w("")
    un = [r for r in rep["rows"] if r["status"] == "UNMAPPED"]
    w(f"## 7. Unmapped cue names ({len(un)} cues)")
    if un:
        w("These names are not in `sfx.py MAP`, so they made no sound in this mix. Add a line to `MAP` (name -> a library sound) and re-run.")
        w("")
        w("| frame | shot | name | the animator's note |")
        w("|---|---|---|---|")
        for r in un:
            w(f"| {r['frame']:.0f} | {r['shot']} | **{r['name']}** | {esc(r['what'])[:140]} |")
    else:
        w("None: every cue name in the three files has an entry in `sfx.py MAP`.")
    w("")
    # ------------------------------------------------------------ measurements
    w("## 8. Measurements of the mix")
    ok = lambda b: "pass" if b else "**MISS**"
    words = R["words"]
    low = sorted(words, key=lambda r: r["margin"])[:8]
    ss = R["sync_summary"]
    seam = {s["stem"]: s for s in R["seam"]}
    w("| check | target | measured | |")
    w("|---|---|---|---|")
    w(f"| length | {T.TOTAL} f = {T.TOTAL * 1600} samples | {R['samples']} samples | {ok(R['samples'] == T.TOTAL * 1600)} |")
    w(f"| integrated loudness | -14 LUFS +-0.5 | {R['I']:.2f} LUFS | {ok(abs(R['I'] + 14) <= 0.5)} |")
    w(f"| true peak | <= -2 dBTP | {R['TP']:.2f} dBTP | {ok(R['TP'] <= -2.0)} |")
    w(f"| loudness range | (report) | {R['LRA']:.1f} LU; momentary max {R['Mmax']:.1f}, short-term max {R['Smax']:.1f} LUFS | |")
    w(f"| limiter | (report) | max gain reduction {R['limiter_max_gr']:.2f} dB, over 0.5 dB for {R['limiter_pct_over_0_5']:.2f} % of the film | |")
    w(f"| stems | (report) | voice {R['voice']:.1f}, score {R['music']:.1f}, effects {R['sfx']:.1f}, bed {R['amb']:.1f} LUFS | |")
    w(f"| score | one master gain | {R['music_gain']:+.2f} dB on `music_v2.wav` (it follows the voice chain's own level change; no per-section levelling) | |")
    w(f"| speech margin, every word (1-4 kHz, voice over everything else) | >= 7 dB | lowest {R['margin_min']:.1f} dB of {len(words)} words | {ok(R['margin_min'] >= 7.0)} |")
    w(f"| character lines vs narrator (same margin) | as clear | characters: median {R['margin_char']['median']:.1f} dB, lowest {R['margin_char']['min']:.1f} dB ({R['margin_char']['n']} words); "
      f"narrator: median {R['margin_narr']['median']:.1f} dB, lowest {R['margin_narr']['min']:.1f} dB | {ok(R['margin_char']['min'] >= 7.0)} |")
    w(f"| sync direction | every cue -1 .. +2 f | {ss['n']} picture-synced cues: {ss['min']:+.2f} .. {ss['max']:+.2f} f; {ss['bad']} outside | {ok(ss['bad'] == 0)} |")
    w(f"| mono fold-down | small loss | {R['mono_loss']:.2f} LU (side is {R['side_re_mid']:.1f} dB under mid) | {ok(R['mono_loss'] <= 1.0)} |")
    ps = R.get("phone_loss_stems", {})
    w(f"| phone speaker (400 Hz high-pass) | (report) | the mix loses {R['phone_loss']:.2f} LU (voice {ps.get('voice', 0):.1f}, score {ps.get('music', 0):.1f}, "
      f"effects {ps.get('sfx', 0):.1f}, bed {ps.get('amb', 0):.1f} LU): the voice keeps its lead | |")
    w(f"| loop seam: sample jump | no click | {seam['mix']['jump']:.5f} (typical step near the end {seam['mix']['step_p99_tail']:.5f}, near the start {seam['mix']['step_p99_head']:.5f}) | "
      f"{ok(seam['mix']['jump'] <= 3 * max(seam['mix']['step_p99_tail'], seam['mix']['step_p99_head'], 1e-4))} |")
    w(f"| loop seam: last 0.3 s into first 0.3 s | (report) | mix {seam['mix']['last_0_3s']:.1f} -> {seam['mix']['first_0_3s']:.1f} dBFS; "
      + "; ".join(f"{k} {seam[k]['last_0_3s']:.1f} -> {seam[k]['first_0_3s']:.1f}" for k in ("voice", "music", "sfx", "amb")) + " | |")
    w("")
    w("ffmpeg ebur128 on `mix.wav` (cross-check):")
    w("```")
    w(R["ebur"])
    w("```")
    w("The eight words with the lowest speech margin: " + ", ".join(f"\"{r['w']}\" @ {r['s']:.2f} s {r['margin']:.1f} dB" for r in low) + ".")
    if R["margin_fixes"]:
        w("Words whose bed was dipped to reach the margin: " + ", ".join(f"\"{r['w']}\" @ {r['s']:.2f} s (read {r['before']:.1f} dB, beds' 1-4 kHz -{r['dip']:.1f} dB)" for r in R["margin_fixes"]) + ".")
    w("")
    w("Voice lines after the leveller (loudness of each line; the narrator's median line is the reference):")
    w("")
    w("| line | speaker | time | before LUFS | gain dB | after LUFS | text |")
    w("|---|---|---|---|---|---|---|")
    for r in R["lines"]:
        w(f"| {r['id']} | {r['speaker']} | {r['s']:.2f}-{r['e']:.2f} | {r['loud']:.1f} | {r['gain']:+.1f} | {r['after']:.1f} | {esc(r['text'])[:60]} |")
    w("")
    # ------------------------------------------------------------ the quiz proof
    w("## 9. Proof for the quiz hard rule")
    import sfx
    w(f"The two ducks of the count are at film frames {', '.join(str(d) for d in sfx.DUCK_F)} (EDIT_V2 section 5: 1/3 and 2/3 of the count window). "
      f"Round each one lies a window of +-{sfx.HARD_PAD_F} frames ({2 * sfx.HARD_PAD_F / FPS:.1f} s). The rule, as `sfx.py hard_rule()` enforces it (the mix stops if it is broken):")
    w(f"- In all of Q1 there is no sound of the classes {', '.join(sorted(sfx.HARD_FORBIDDEN))}.")
    w("- Inside a window no sound may come from the ducker or from anyone else on the square (no cloth, step, rustle, paper, chime, laugh or murmur): such a sound "
      "never starts in a window; one that starts before it is cut so that it has ended before the window, or is not sounded when there is no room; and that whole "
      "bus is gated to digital silence inside the window.")
    w(f"- The lead's rule of 2026-11-18: the ONLY sounds allowed inside a window are the clown's, the pigeons' and the dog's ({', '.join(sorted(sfx.WINDOW_OK))}), and "
      f"only when panned at {sfx.WINDOW_PAN_MIN:+.2f} or further right. They happen on the right of the frame, away from the money (upper-left): fair misdirection away "
      "from the bills. They keep their normal level (set by `near`), never boosted.")
    w(f"- Nothing in Q1 sits further left than pan {sfx.HARD_PAN_MIN:+.2f} (the bills are upper-left); the animators' pans are clamped there.")
    w("")
    w("Measured in the written stems:")
    w("")
    w("Levels are K-weighted (as loudness is heard). Each window is read against every other window of the same length in Q1 "
      "(\"louder than x %\": 50 % = an ordinary moment of the count, near 100 % would be an accent). \"Rise\" = the largest climb of the 30 ms level over "
      "60 ms inside the window (a new sound starting shows as a large rise), again against the other windows. The score is read BEFORE its dips under the "
      "words (they lower the narrated stretches and would make the unspoken count look loud), and against the same slice of its groove two beats earlier and later.")
    w("")
    w("| duck frame | window | everything but the clown / pigeons / dog | the clown's / pigeons' / dog's sounds heard in the window | their L-R | bed level (Q1 p10 / median / p90) | "
      "bed louder than | bed rise (above x % of windows) | bed L-R (all Q1) | score level (Q1 p10 / median / p90) | score louder than | same slice two beats before / after | score L-R (all Q1) |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for q in R["quiz"]:
        b_, m_ = q["ranks"]["bed"], q["ranks"]["music"]
        nb = " / ".join("n/a" if m_.get(k) is None else f"{m_[k]:.1f}" for k in ("two_beats_before", "two_beats_after"))
        okc = "; ".join(f"{c_['name']} from f {c_['frame']:.0f} (pan {c_['pan']:+.2f}, {c_['level']:.1f} LU)" for c_ in q["ok_cues"]) or "none"
        okb = "n/a" if q["ok_balance"] is None else f"{q['ok_balance']:+.1f} dB (" + ("leans right" if q["ok_balance"] < 0 else "LEANS LEFT") + ")"
        w(f"| {q['duck']} | {q['window'][0]}-{q['window'][1]} | peak {q['rest_peak']:.7f} ({'digital silence' if q['rest_peak'] < 1e-7 else 'NOT silent'}) | {okc} | {okb} | "
          f"{b_['k_level']:.1f} dB ({b_['q1_p10']:.1f} / {b_['q1_median']:.1f} / {b_['q1_p90']:.1f}) | {b_['pct']:.0f} % | {b_['rise']:.1f} dB ({b_['rise_pct']:.0f} %) | "
          f"{q['bed_balance']:+.2f} dB ({q['bed_balance_q1']:+.2f}) | {m_['k_level']:.1f} dB ({m_['q1_p10']:.1f} / {m_['q1_median']:.1f} / {m_['q1_p90']:.1f}) | {m_['pct']:.0f} % | "
          f"{nb} dB | {q['music_balance']:+.2f} dB ({q['music_balance_q1']:+.2f}) |")
    for q in R["quiz"]:
        m_ = q["ranks"]["music"]
        nb = [m_.get(k) for k in ("two_beats_before", "two_beats_after") if m_.get(k) is not None]
        if m_["pct"] > 90 and nb:
            w("")
            w(f"Read with care: at the duck at f {q['duck']} the score is louder than {m_['pct']:.0f} % of Q1's windows. That is the score's own build (every bar of "
              f"the count is a little louder than the one before, toward \"How many?\"), not an accent on the duck: the same slice of the groove two beats earlier "
              f"reads {nb[0]:.1f} dB and two beats later {nb[-1]:.1f} dB, with this window ({m_['k_level']:.1f} dB) between or beside them. Only an ear can say whether "
              "the build itself draws attention there.")
    w("")
    q1 = sfx.SK["Q1"]
    near = [r for r in rep["rows"] if r["shot"] == "Q1" and any(abs(r["frame"] - d) <= 20 for d in sfx.DUCK_F)]
    w("Every animator cue within 20 frames of a duck, and what became of it:")
    w("")
    w("| frame | cue | status | reason |")
    w("|---|---|---|---|")
    for r in near:
        w(f"| {r['frame']:.0f} | {r['name']} | {r['status']} | {esc(r['why']) or 'sounded (it lies outside both windows)'} |")
    w("")
    w("The bed and the score are continuous through both windows. The bed is a seamless loop of real ambience (it has bird calls in it): it is ROTATED so that "
      "both windows fall on its calmest stretches (section 5). The score was changed for this rule in phase B (`music.py`): in the first version both ducks fell on a bar "
      "line (the harmony's step, a louder bar, a celesta spark, and the second clarinet phrase's entry). The bars now start on beats 2, 6, 10 and 14, so every step falls "
      "between the ducks; no spark and no phrase note starts in a window; the ostinato is spread evenly left and right. Only the steady pulse (pizzicato 8ths, the bass "
      "every two beats, the clock, the shaker) runs through.")
    w("")
    # ------------------------------------------------------------ five timestamps
    w("## 10. Five timestamps for the owner's headphones")
    rw = sfx.e3_rewind() or {}
    pops = sfx.e1_pops()
    s5, s18, s20 = sfx.SK.get("S5"), sfx.SK.get("S18"), sfx.SK.get("S20")
    s1 = sfx.SK.get("S1")
    w(f"1. **{tc(0)} - {tc(T.fr(B['youSawEnd']))}, the hook and the count.** Is the frame-0 honk-honk (two squeezes in the 0.34 s before \"Quick test.\") heard, "
      f"from a cold start and on the loop? After \"phone.\" does the count stay alive (score and effects lifted, flat, from \"phone.\" to \"How many?\")? The pigeons "
      f"({tc(T.fr(157))}, {tc(T.fr(183))}, {tc(T.fr(220))}): flaps now, or still thumps? At the two ducks, {tc(T.fr(sfx.DUCK_F[0]))} and {tc(T.fr(sfx.DUCK_F[1]))}: "
      f"does anything point at the bills? The ding on the big 5 at {tc(T.fr(B['five'] + 4))}; the wave honk on \"right?\".")
    if s1 and s5:
        w(f"2. **{tc(T.fr(s1['a']))} - {tc(T.fr(s5['b']))}, S1 and the office.** In S1 count the honks (three single squeezes) and hear the bell; then the "
          f"office gags (the crumpled note, its tock on the board, the door), and the reveal: zip, the bag flung open with the score's comic hit ON the opening "
          f"({tc(T.fr(B['clownSuit']) + 2 / FPS)}), confetti, the suit's boing, sparkles, the light-bulb ping on Hyman. Busy or funny? Is \"clown suit.\" still clear?")
    w(f"3. **{tc(T.fr(B['didYouSee']))} - {tc(T.fr(B['spunEnd']) if 'spunEnd' in B else T.fr(B['whatClownEnd']) + 0.5)}, the interviews and \"Many spun around to look.\"** "
      f"The claps under \"He was amazing!\", the '?' and '!' pops, the restored line's spin with the score leaving its D floor for one bar.")
    if s18:
        w(f"4. **{tc(T.fr(B['heHung']) - 2.0)} - {tc(T.fr(B['theirBodies']) if 'theirBodies' in B else T.fr(s18['b']))}, the money and the breath.** Hyman's jogger, "
          f"freeze and whistle; the peg's snap; the three ducks (two steps each now); the stopper's swat; then does everything stop dead after \"...stopped for "
          f"the money.\", with 0.5 s of real silence before \"Their bodies dodged it.\"?")
    if s20 and rw:
        w(f"5. **{tc(T.fr(s20['a']))} - {tc(T.DUR)}, the ending.** The near-silent mind-blow line, the five rising pips from "
          f"{tc(T.fr(pops[0])) if pops else '?'}, the hard cut into the tape rewind in the hush ({tc(T.fr(rw['a']))}), the hold: a soft freeze hit at "
          f"{tc(T.fr(rw['a'] + rw['r1']))} and the glint as the ring completes ({tc(T.fr(rw.get('ring_full', rw['a'] + rw['r1'] + 8)))}), nothing but the score's "
          f"swell over \"money?\", the short rewind to the seam and the stop on the last sample (then the loop: the honk-honk of frame 0).")
    w("")
    w("## 11. What only an ear can judge")
    w("- Whether the generated effects sound real in context (the door, the zip, the dog, the laughs and gasps are ElevenLabs generations that were only measured).")
    w("- Whether the horn on A sits well against the score in every section, and whether the count feels lively rather than busy.")
    w("- Whether the VCR whirr under \"Did you see the money?\" reads as a tape rewind, and whether the freeze hit and glint are soft enough.")
    w("- Whether the character lines sit in the same space as the narrator (they are levelled, not re-recorded).")
    w("- p3: whether the synthesized polish effects (the juggling pats, the '?' / '!' pops, the twinkles, the light-bulb ping, the whistle, the dust puff) "
      "sound like cartoon effects or like test tones; whether the new pigeon, sneaker, scuff, confetti and crumple generations sound real in context.")
    w("- p3: whether the S5 reveal (zip, fling + the score's hit, confetti, boing, sparkle, ping in 0.37 s under the student's \"clown\") reads as one funny burst or as clutter.")
    open(OUT, "w", encoding="utf-8").write("\n".join(L) + "\n")
    return OUT
