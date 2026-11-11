# 08 - Audio: SFX synthesis, cue list and cue sheet

Repo: `mromidev/claude-animated-shorts` (read-only clone at `<ROOT>\repo`).

## Files read

| file | lines | how read |
|---|---|---|
| `templates/audio/sfx.py` | 348 | every line (slice) |
| `templates/audio/sfx_gen.py` | 570 | every line (slice) |
| `templates/audio/cues.md` | 442 (+1 empty) | every line (slice) |
| `templates/audio/dsp.py` | 350 | every line (context: every helper the SFX code calls) |
| `templates/audio/timeline.py` | 169 | every line (context: every time constant the cues use) |
| `templates/audio/mix.py` | 354 | every line (context: how `sfx.render()` is called and how cues.md is written) |
| `SKILL.md` | 166 | every line (context: sound rules) |
| `templates/bridge/story.ts` | 80-264 of 348 | camera keys, so I could check the whoosh frames |
| `templates/bridge/cast.ts` | 366-401 of 473 | hammer and swing timing |
| `references/reports/motion.md` | 220-239 | march cadence note |
| `references/STYLE_BIBLE.md` | grep for audio lines | reference loudness |

Words used below:
- **LUFS**: loudness unit (EBU R128 / BS.1770). **LU**: a difference in loudness (1 LU = 1 dB).
- **Momentary loudness**: loudness over a 400 ms window. "max momentary" = the loudest 400 ms of a sound.
- **Integrated loudness**: average loudness over the whole sound (gated). Used for long beds.
- **Event**: a short sound (a boot, a crash). **Bed**: a long ambience (wind, river).
- **Send**: how much of a sound goes into the shared reverb.
- **IR** (impulse response): the "echo fingerprint" of a space, used for reverb.
- **Modal synthesis**: a hit sound built from a few decaying sine waves (the "modes" of an object).
- **Stick-slip**: friction that grabs and lets go many times per second. It makes creaks and squeaks.
- **Formant**: a resonance of the human mouth. Vowels are made by moving 4 formants (F1-F4).
- **Anchor**: the time inside a sound that must land exactly on the cue time (for example the peak of a whoosh).

---

## 1. How the SFX part fits in the pipeline

```
story.ts / cast.ts (picture)  --mirrored by hand-->  timeline.py (time constants, distances)
                                                         |
sfx_gen.py (sound generators: numpy synthesis)  <-- sfx.py cues()  (one Cue per sound, with time + level)
                                                         |
                                       sfx.render(v_ref) -> one stereo SFX stem (2 x 3,240,000 samples)
                                                         |
mix.py: voice + music + sfx -> master gain -> limiter -> mix.wav + stems + cues.md (the cue sheet)
```

- Everything is own synthesis with numpy + scipy. There are no sample files at all.
- Sample rate `SR = 48000` (dsp.py:9). Length `N = ns(T.DUR)` = 3,240,000 samples = 67.500 s (sfx.py:12, timeline.py:7-9: `FPS = 30`, `TOTAL = 2025`).
- `mix.py:231-243` imports `sfx`, calls `sfx.render(v_ref)` where `v_ref` = integrated loudness of the voice stem. The result is cached to `audio/_cache/sfx.npy` (mix.py:48-56).
- `mix.py:284-350` (`write_cues`) writes `cues.md`. So **cues.md is generated output**, not hand-written. It is the record of the bridge render.

---

## 2. `sfx.py` in detail

### 2.1 Imports and constants (sfx.py:1-13)
- Imports from dsp: `SR, ns, tt, rng, dbg, lp, hp, bp, peq, shelf, pan, st, place, fades, widen, make_ir, convolve_st, momentary_max, integrated, colored, smooth_noise, modal`.
- `import sfx_gen as G`, `import timeline as T`.
- `N = ns(T.DUR)` (3,240,000).
- `SFX_DB = -6.0` - the user's standard mix rule "SFX -6 dB" (SKILL.md:23).

### 2.2 The `Cue` class (sfx.py:16-22)

```python
class Cue:
    def __init__(self, t, name, desc, gen, naive, kind="event", p=0.0, extra=0.0, lpf=None, send=0.12, group=None, cut=None):
        ...
        self.applied = naive + (SFX_DB if kind == "event" else 0.0) + extra
```

| field | meaning |
|---|---|
| `t` | time in seconds where the sound's anchor lands |
| `name` | short id (shown in cues.md, e.g. `stomp`) |
| `desc` | plain description (shown in cues.md) |
| `gen` | function with no arguments that returns `(signal, anchor_seconds)`; signal is mono `(n,)` or stereo `(2, n)` |
| `naive` | the level the designer wants, in LU relative to the voice stem, before the -6 dB rule |
| `kind` | `"event"` (measured as max momentary, gets -6 dB) or `"bed"` (measured as integrated, no -6 dB) |
| `p` | pan, -1 left .. +1 right. **Only used if the signal is mono** |
| `extra` | extra dB (distance, intensity, ducking tweaks) |
| `lpf` | optional low-pass cutoff in Hz (applied after level matching) |
| `send` | reverb send amount (default 0.12; beds use 0.0) |
| `group` | label (defaults to name). Never read anywhere (metadata only) |
| `cut` | optional absolute time where the sound is chopped (with a 20 ms fade) |
| `applied` | final target = `naive + (-6 if event) + extra` |
| `measured` | filled by `render()`: real loudness after processing, minus `v_ref` |

### 2.3 Random seeds (sfx.py:27-28)
- `R = rng(1831)` - master generator. 1831 is the year of the Broughton bridge story.
- `rr = lambda: rng(int(R.integers(1 << 30)))` - each call gives a fresh generator, seeded from R **in creation order**.
- Many cues instead use fixed seeds that encode their time: `rng(160)` = 16.0 s, `rng(130)` = frame 130, `rng(3462)` = SNAP 34.62, `rng(3487)` = 34.87, `rng(3635)` = DROP0 36.35, `rng(3695)`..`rng(3697)` = DROP1 36.95, `rng(3705)` = 37.05, `rng(4042)` = 40.42, `rng(62)` = 62.0. Bed seeds 1, 41, 43, 44, 45.
- Output is fully deterministic. Same code = same audio, bit for bit.

### 2.4 `cues()` - the full cue list (sfx.py:25-187)

Below, "naive" = designer level (LU vs voice), "applied" = naive - 6 for events.

#### a) Ambience beds (sfx.py:31-54) - `kind="bed"`, `send=0.0`, not reduced by -6 dB

`amb_day(dur, river=0.5, flags=0.25, seed=1)` builds (sfx.py:32-43):
- `G.breeze(dur, r, 1.0, 0.15, 850)` (stereo wind, gusts at 0.15 Hz, low-pass 850 Hz)
- river: `bp(colored(n, r, 0.8), 180, 1800, 1) * river * (0.8 + 0.2 * smooth_noise(n, r, 0.3))`, centred (`st`)
- sparrows: `bird_chirps(dur, r, 0.45, "sparrow") * 0.08` pan +0.5, and `bird_chirps(dur, r, 0.3, "sparrow") * 0.05` pan -0.6
- flags: `flag_flutter(dur, r) * flags` pan +0.3
- `fades(x, 0.4, 0.6)`, anchor 0.0

| cue | start s | length s | recipe | fades in/out s | naive (integrated) |
|---|---|---|---|---|---|
| `amb_day` | 0.0 | 37.2 | `amb_day(37.2, river 0.55)` (shots 1-8) | 0.4 / 0.5 | -30 |
| `amb_water` | DROP1 = 36.95 | `wd` = 6.75 | `G.water_bed(wd, rng(41), close 1.0, slosh_rate 0.9)` (shots 9-10) | 0.35 / 0.3 | **-19** (loudest bed: the music is silent here) |
| `amb_golden` | 43.3 | 14.65 | `_golden(14.65, rng(43))` (shots 11-13) | 0.5 / 0.4 | -29 |
| `amb_bank` | 57.7 | 4.5 | `amb_day(4.5, river 1.3, flags 0.0, seed 44)` (shot 14) | 0.25 / 0.35 | -26 |
| `amb_town` | 61.95 | 5.55 | `amb_day(5.55, river 0.45, flags 0.3, seed 45)` (shot 15) | 0.3 / 0.05 | -29 |

- `wd = T.shot_t(11)[0] + T.XFADE[11] / T.FPS - T.DROP1` (sfx.py:46) = 43.433 + 8/30 - 36.95 = 6.75 s. The water bed ends exactly at the end of the 8-frame crossfade into shot 11.
- Beds overlap at every place change: amb_day runs 0.25 s past the splash; amb_golden starts 0.13 s before shot 11 (43.433); amb_bank starts 0.13 s before shot 14 (57.833); amb_town starts 0.15 s before shot 15 (62.1).

#### b) Marching column: one stomp per footfall on screen (sfx.py:56-79)

Loop over `T.footfalls()` (timeline.py:111-123): every `t = k * 0.5` s (2 steps/s = 120 bpm; music quarter note = footfall) when the shot's crowd mode is `"march"` or `"fall"`, and in shot 8 only while `tau <= SNAP + 0.25`. Returns `(t, shot, tau, foot)` with `foot = k % 2` (left/right).

Per footfall:
- `d = T.column_distance(t)` - camera-to-column distance in metres (eased between camera keys, timeline.py:88-99).
- `g, lpf, send = T.dist_fx(d)` (timeline.py:102-108):
  - `d = max(d, 3.5)`
  - `g = -14 * log10(d / 3.5)` dB (about -4.2 dB per doubling of distance; softer than inverse-square -6)
  - `lpf = clip(17000 * (3.5/d)**0.55, 1800, 17000)` Hz
  - `send = 0.06 + 0.45 * clip(ln(d/3.5) / ln(25), 0, 1)`

  | d (m) | gain dB | low-pass Hz | send |
  |---|---|---|---|
  | 3.5 | 0.0 | 17000 | 0.060 |
  | 4 | -0.8 | 15796 | 0.079 |
  | 5 | -2.2 | 13972 | 0.110 |
  | 7 | -4.2 | 11611 | 0.157 |
  | 10 | -6.4 | 9543 | 0.207 |
  | 15.2 | -8.9 | 7580 | 0.265 |
  | 20 | -10.6 | 6518 | 0.304 |
  | 25 | -12.0 | 5765 | 0.335 |
  | 51 | -16.3 (clamped to -13 for stomps) | 3895 | 0.435 |
  | 80 | -19.0 (clamped to -13) | 3041 | 0.497 |
  | >= 87.5 | ... | ... | 0.510 (max) |

- `inten = T.stomp(tau)`: piecewise linear (21.4, 1.0) -> (27.4, 1.35) -> (33, 1.5), clamped outside (timeline.py:52, 59-60). The march gets heavier.
- `a = T.amp(tau) / 0.55`: deck bounce amplitude normalised to its max 0.55 (timeline.py:51, 55-56; AMP keys (14.85,0) (17.8,0.07) (21.4,0.13) (27.4,0.26) (33.0,0.46) (SNAP,0.55) (SNAP+0.35,0)).
- `cut = T.FLASH + 0.02` (= 4.3533 s) for shot 1 only: the hook is a flash-forward, so its stomps and deck flexes are chopped on the white flash (sfx.py:63).
- Shot 1, `t >= 3.5`: `g -= 3.0` "keep '...walking across it.' on top" (sfx.py:64-65). This also lowers the deck flex (by 0.6 x 3 = 1.8 dB) because `g` is used for both.

The stomp cue (sfx.py:67-71):
```python
x, pre = G.column_stomp(r, inten, foot, width=float(np.clip(5.0 / d, 0.15, 1.0)), boom_gain=0.6)
return peq(x, 2400, 5.0, 0.7), pre          # +5 dB presence bump at 2.4 kHz, Q 0.7
Cue(t, "stomp", ..., naive=-8, extra=max(g, -13.0) + 20*log10(inten), lpf=lpf, send=send, group="stomps", cut=cut)
```
- Stereo width of the column shrinks with distance: `clip(5/d, 0.15, 1.0)`.

The deck-flex cue (sfx.py:72-76), only if `a > 0.02 and tau < T.SNAP`:
- `G.deck_flex(r, min(a, 1.0))`, naive -10, `extra = max(g, -13)*0.6 + 6*log10(min(a, 1))`, same lpf/send/cut, group "deck".

Extra one-off: `bounce_first` at 16.0 s (sfx.py:77-79): `deck_flex(rng(160), 0.9)` + `creak(0.55, rng(161), 60, 140, TIMBER, rough=0.2) * 0.8` (padded 0.2 s at the end); naive -10, extra -4, lpf 11000, send 0.18. "The bridge starts bouncing (faces react 16.17)".

Counts in the bridge: **78 stomps** (shots 1:9, 2:10, 3:11, 4:6, 5:7, 6:12, 7:11, 8:4, 13:8) and **56 deck flexes** (none in shots 2-3 because amp is 0 before tau 14.85; shot 4 starts at 15.5).

Shot 13 (golden reprise) uses `tau = t - 31` (timeline.py:43-44), so it replays the march at tau 23-26.8 with bounce amp ~0.16-0.24: the reprise also has deck flex.

#### c) Hook extras (sfx.py:81-88)

| cue | time | recipe | naive | pan | send |
|---|---|---|---|---|---|
| `chain_groan_hook` | 0.0 | `chain_groan(4.3, rng(11), i0 0.55, i1 0.8, rate 26->34, beats every 0.5 s k=0..8)` times envelope `interp(t, [0, 3.55, 4.1, 4.3], [1, 1, 0.5, 0.5])` (dips under the last words) | -10 | -0.3 | 0.15 |
| `whoosh_cam` | fr(48) = 1.600 | `whoosh(0.45, r, peak 0.07, 400->2400 Hz, width 0.8, tail 0.13, air 0.2)`, anchor 0.07 | -12 | 0 | 0.1 |
| `whoosh_cam` | fr(88) = 2.933 | same | -12 | 0 | 0.1 |
| `flash_whoosh` | FLASH = fr(130) = 4.333 | `_flash(rng(130))`: reverse swell into the white flash + 62 Hz whoomp, anchor 0.33 | **-5** | stereo | 0.2 |

#### d) Town crowd (shot 2) (sfx.py:90-94)

| cue | time | recipe | naive | lpf | send |
|---|---|---|---|---|---|
| `crowd_murmur` | FLASH 4.333 | `_murmur(6.0, rng(21), 22 voices, early=True)` (4 early hurrahs) | -10 | 3600 | 0.35 |
| `crowd_cheer` | 7.6 (on "pride of the whole town") | `_cheer(3.4, rng(22))` | -6 | 5000 | 0.35 |

#### e) Camera / transition whooshes (sfx.py:96-105)

`whoosh_cam` (12 cues): `whoosh(0.6, r, peak 0.09, 330->2000 Hz, width 0.8, tail 0.18, air 0.15)`, **anchor 0.09** = the whoosh peak lands on the cue frame. naive -11, send 0.12.

| frame | time s | description in code | what story.ts has at that frame |
|---|---|---|---|
| 283 | 9.433 | wide -> low front of the column | shot 3 starts (cut) |
| 444 | 14.800 | cut to the side view | shot 4 starts (cut on "Halfway") |
| 534 | 17.800 | swing round to the faces | shot 5 starts (cut) |
| 643 | 21.433 | push to the whistler's face | shot 6 starts (cut) |
| 717 | 23.900 | crane up over the column | hard cut "up over the column" |
| 823 | 27.433 | low wide from behind | shot 7 starts (cut, S7a "wide ahead of the column") |
| 987 | 32.900 | whip to the anchor bolt | shot 8 starts (cut to the bolt) |
| 1062 | 35.400 | crane out over the bridge | hard cut to the aerial |
| 1685 | 56.167 | drift in (golden march) | hard cut on "pushing" |
| 1770 | 59.000 | move to the sign | hard cut to the officer |
| 1905 | 63.500 | move along the tourists | centre of the 30 f glide (key f 1890 dur 30) |
| 1962 | 65.400 | crane out, ending | crane glide (key 1932, 93 f), "whoosh at 1962 mid-acceleration" |

`whoosh_xfade` (5 cues): `whoosh(0.8, r, peak 0.32, 300->1600 Hz, width 0.9, tail 0.22, air 0.1)`, **anchor 0.32**, naive -12, send 0.15. Placed on the **first frame** of a crossfade shot (the 8-frame crossfade runs from that frame):

| frame | time s | crossfade |
|---|---|---|
| 1303 | 43.433 | to golden light (shot 11) |
| 1411 | 47.033 | to the park (shot 12) |
| 1620 | 54.000 | back to the bridge (shot 13) |
| 1735 | 57.833 | to the bank (shot 14) |
| 1863 | 62.100 | to the rebuilt bridge (shot 15) |

(The 6-frame crossfade into shot 9 at frame 1134 = 37.8 s gets no whoosh: the splash and water bed cover it.)

story.ts:89-94 confirms the rule from the picture side: "Glides are centred on the old key frame (the whoosh in the sound mix peaks there), so a glide key starts dur/2 earlier." The sound timeline was fixed first; the camera glides were then shifted so their centre sits on the whoosh peak.

#### f) Chains and bolt, the build-up to the snap (shots 7-8) (sfx.py:107-125)

| cue | time s | recipe | naive | pan | send |
|---|---|---|---|---|---|
| `chain_groan` | 28.9 -> SNAP+0.03 (5.75 s) | `chain_groan(5.75, rng(29), i0 0.45, i1 1.0, rate 20->46 Hz, beats = 29.0, 29.5 ... 34.5, t0=28.9)` - rises in pitch and strength with each footfall | -6 | -0.35 | 0.12 |
| `chain_groan_swell` | 29.95 ("right after the word 'groaning,'") | `chain_groan(1.1, rng(295), 0.9, 1.0, 22->30, beats [30.0, 30.5])` | -4 | -0.35 | 0.15 |
| `bolt_strain` x4 | 33.0, 33.5, 34.0, 34.5 (on the footfalls) | `bolt_strain(r, a = 0.5 + 0.17k)` -> a = 0.50, 0.67, 0.84, 1.01 (pitch rises) | -12, -11, -10, -9 (+1 dB each) | -0.15 | 0.05 |
| `bolt_tick` x3 | SNAP-0.31, -0.15, -0.05 = 34.31, 34.47, 34.57 (accelerating) | `clink(r, uniform 2600-3600 Hz, 0.1 s)` "metal fatigue tick" | -14 | -0.15 | 0.05 |
| `bolt_snap` | SNAP = 34.62 | `bolt_snap(rng(3462))` | **0** (loudest cue; applied -6) | -0.2 | 0.18 |
| `chain_whip` | SNAP | `chain_whip(rng(3463))` | -4 | -0.4 | 0.2 |
| `bolt_land` x2 | SNAP+0.93 = 35.55 (p -0.5), SNAP+1.05 = 35.67 (p +0.1) | `_bounces(r)`: tink, tink-tink | -16 | -0.5 / +0.1 | 0.25 |
| `column_halt` | SNAP+0.25 = 34.87 (the column "stands") | `_scuffle(rng(3487))` | -16 | stereo | 0.25 (lpf 7000) |

#### g) The drop (DROP0 36.35) and the hit (DROP1 36.95) (sfx.py:127-144)

| cue | time s | recipe | naive | pan | send |
|---|---|---|---|---|---|
| `timber_tear` | DROP0-0.55 = 35.80 | `timber_tear(rng(3620), dur 0.62)`; its envelope peaks at 0.85 x 0.62 = 0.527 s -> 36.33 = the moment the deck lets go | -6 | +0.1 | 0.2 |
| `fall_air` | DROP1 (anchor 0.6) -> starts at DROP0 | `whoosh(0.66, rng(3635), peak 0.6, 220->1300 Hz, width 1.0, tail 0.05, air 0.1)`: an accelerating rush that peaks exactly on the impact | -8 | 0 | 0.1 |
| `wood_crack` | DROP1 | `wood_crack(rng(3695))` | -4 | 0 | 0.15 |
| `splash_big` | DROP1 | `_splashes(rng(3696))` (6 splash sources along the deck) | **-2** | stereo | 0.15 |
| `oofs` | DROP1+0.02 | `_oofs(rng(3697))` (12 voices) | -4 | stereo | 0.18 |
| `debris` | DROP1+0.1 | `_debris(rng(3705))` planks and kit into the shallows | -12 | stereo | 0.25 |
| `groans` | 40.42 (in the gap before "Unluckily...") | `_groans(rng(4042), [(0.0,"ugh",1.0), (0.09,"ow",0.7), (0.2,"ugh",0.5)])` | -12 | stereo, lpf 5000 | 0.2 |
| `groans` | 41.95 ("ow"), 42.7 ("ugh") | `_groans(r, [(0.0, kind, 1.0)])` | -18 | stereo, lpf 4500 | 0.25 |

#### h) Sway (shot 11) (sfx.py:146-151)
- 5 `sway_creak` cues at `tm = 43.4 + (0.25 + k/2) / 0.7`, k = 0..4 -> 43.757, 44.471, 45.186, 45.900, 46.614 s.
- These are the extremes of the picture's sway `bounce = 0.75 * sin(2*pi*0.7*(t - 43.4))` (story.ts:81).
- Recipe: `creak(0.55, r, 55, 95, TIMBER, env [(0,0),(0.4,1),(0.8,0.6),(1,0)], rough 0.2, noise 0.04) * 0.8`, anchor 0.12.
- naive -12, pan alternates -0.2 / +0.2 (`0.2 if k % 2 else -0.2`), lpf 7000, send 0.3.

#### i) Swing (shot 12) (sfx.py:153-164)
- `swing_squeak` at `tm = PUSH0 + 0.3875 + k*0.775`, k = -2..6 -> 47.628, 48.403, 49.178 ... 53.828 (9 cues). 0.775 s = half the 1.55 s swing period, 0.3875 = a quarter: the squeak sits on the **bottom of the arc** (fastest point).
- Even k = forward ("eee"), odd k = back ("aww").
- `a = T.swing_amp_deg(tm) / 50` where `swing_amp_deg = 6 + sum(11 * smoothstep((t - tp)/0.3))` over the 4 pushes (timeline.py:162-164; same as cast.ts:396). Arc grows 6 -> 17 -> 28 -> 39 -> 50 degrees.
- `G.swing_squeak(r, a, fw)`, anchor `0.12 + 0.1a` (about the squeak's centre). naive -12, `extra = 8*log10(max(a, 0.12))` (-7.4 dB at 6 deg, 0 at 50 deg), pan +0.15, send 0.2.
- `swing_push` x4 at `T.PUSHES` = 48.79, 50.34, 51.89, 53.44 (the downbeats of the music-box waltz): `G.push_thump(r)`, naive -14, pan +0.1, send 0.15.

#### j) The rule (shot 14): hammer on the sign (sfx.py:166-172)
For each `th` in `T.HITS = [59.79, 60.33, 61.69]` (same as cast.ts:371):
- `hammer_swish` at `th - 0.09`: `whoosh(0.18, r, peak 0.08, 600->2500, width 0.6, tail 0.04, air 0.2)`, anchor 0.08 -> the swish peaks 0.09 s (2.7 frames) before contact. naive -20, pan +0.3, send 0.1.
- `hammer` at `th`: `G.hammer_hit(r, big)` with `big = 1.0` for blows 1-2 and 1.25 for blow 3. naive -5, -5, -4. pan +0.3, send 0.22.
- The music lands a brass stab + timpani on each blow (cues.md:76).

#### k) Tourists (shot 15) (sfx.py:174-186)
- `T.tourist_steps()` (timeline.py:126-146): 24 strollers, each with speed `sp = 0.55 + hh(i)*0.5`, phase `ph0 = hh(i, 5)`, side position `x = (hh(i,3) - 0.5)*4`, footfalls at phase 0 and 0.5 of a 1.4/sp-second cycle, from `TOURIST_T0 = 62.08`. `hh()` is the same sine hash as cast.ts so sound and picture agree.
- Steps with `t < 61.97` or `t > DUR - 0.05` are skipped. **147 steps** in the bridge.
- Distance from the approximate shot-15 camera `T.tourist_cam(t)` to `(x, 6.0, z)` (6.0 = `D0` deck height, story.ts:7) -> `dist_fx(d)`.
- Pan: `clip(-(x - cam_x) / max(d, 1) * 1.6, -0.8, 0.8)`.
- Recipe: `shelf(G.stroll_step(r, scuff uniform 0.2-1.0), 1500, +4 dB, "high")`.
- naive -9, `extra = max(g, -8) + R.uniform(-2, 1)` (random +-, so not every step is the same loudness).
- `town_murmur` at 62.0: `_murmur(5.5, rng(62), 14 voices, early=False)`, naive -11, lpf 3200, send 0.35.
- Point of the shot in sound: the in-step march is gone; everyone walks out of step.

### 2.5 Composite helpers (sfx.py:190-312)

| helper | what it builds | key numbers |
|---|---|---|
| `_cut(gen, dur, fin, fout)` (191) | wraps a generator and adds fades | `dur` is ignored |
| `_env(...)` (198) | identical alias of `_cut` | - |
| `_golden(dur, r)` (202) | golden-hour bed | `breeze(dur, r, 0.7, gust 0.1, bright 650)` + river `lp(bp(colored 0.8, 150-1400), 1200) * 0.35` + blackbirds `0.35 density *0.06 pan -0.5` and `0.25 *0.04 pan +0.6` + `widen(crickets(dur, r, 3) * 0.008, r, 9 ms, 1.0)` |
| `_flash(r)` (212) | flash stinger | `whoosh(0.75, r, peak 0.33, 500->4200, width 0.9, tail 0.09, air 0.4)` + boom `exp(-(t-0.33)/0.12) * sin(2*pi*62*(t-0.33)) * 0.8` after 0.33 s; `widen(.., 12 ms, 0.9)`; anchor 0.33 |
| `_murmur(dur, r, voices, early)` (220) | crowd chatter | per voice: 45 % men (base 95-140 Hz, formant scale 0.95-1.05), 40 % women (175-235 Hz, 1.12-1.2), 15 % children (260-330 Hz, 1.25-1.35); `babble(dur, r, base, scale, rate 3.6-4.8 syll/s, active 0.55-0.8, fmax 3400)`, `lp 2200-3600`, gain 0.3-1.0, pan +-0.85. `early`: 4 hurrahs at 0.2-1.6 s, lp 3000, x0.5. fades 0.25/0.8 |
| `_cheer(dur, r)` (237) | cheering crowd | 26 voices, every 6th a kid (v%6==5: base 270-340, scale 1.3), odd men 105-160 (scale 1.0), even women 180-250 (1.15); 1 or 2 hurrahs each (40 % get 2), time 0.25-1.1 s + rep x 0.75-1.0 s, lp 4000, gain 0.35-1.0, pan +-0.9; plus `applause(dur, r, 40 people, env)` x0.9 with env points (0, 0.4, 1.0, 1.9, 3.4 s) -> (0, 0.5, 1.0, 0.75, 0); fades 0.05/0.5 |
| `_bounces(r)` (254) | bolt half bouncing | 4 clinks at 0.0 / 0.11 / 0.19 / 0.24 s, gains 1.0 / 0.45 / 0.25 / 0.12, f 2600-3400 Hz, 0.12 s each; 0.6 s buffer |
| `_scuffle(r)` (262) | column stopping dead | 18 `stroll_step(scuff 0.6-1.2)` x0.3-1.0 within 0.3 s, pan +-0.6; 0.6 s |
| `_whoas(r)` (270) | 9 "whoa" voices in 0.18 s | **never used** |
| `_splashes(r)` (278) | the big splash | 6 x `splash_big` with (pan, gain, delay s): (0, 1.0, 0), (-0.55, 0.75, 0.025), (0.5, 0.7, 0.04), (-0.3, 0.55, 0.06), (0.35, 0.5, 0.075), (0.75, 0.35, 0.09); all but the first low-passed at 9 kHz; 2.8 s |
| `_oofs(r)` (288) | 12 men landing in water | kinds `oof oof ugh oh oof ow ugh oof oh oof ugh ow`; time `abs(normal(0.06, 0.08))` (+0.1 s for voices 5-11), capped 0.45 s; gain 0.45-1.0, pan +-0.85; 0.9 s |
| `_groans(r, parts)` (298) | hurt groans | `oof(r, kind, base 90-125, scale 0.95-1.05)`, per part (time, kind, gain), pan +-0.6; 0.9 s |
| `_debris(r)` (306) | planks + kit into shallows | 7 x [`modal(0.3, [(180-320, 1.0, 40 ms), (450-900, 0.6, 20 ms), (1200-2400, 0.3, 10 ms)])` knock + `bubbles(0.3, r, 120/s, 400-2200 Hz, tau 5-20 ms, env exp(-t/0.08)) * 0.5`] x0.3-1.0, pan +-0.8, times 0-0.8 s; 1.2 s |

### 2.6 `render(v_ref, on_event=None)` step by step (sfx.py:316-348)

For every cue `c` in `cues()`:
1. `x, anchor = c.gen()`; make it a float array.
2. If mono: `pan(x, c.p)` (constant-power pan, dsp.py:183-186; centre gives L = R = x). If already stereo: **p is ignored**.
3. If `c.cut`: keep `k = ns(c.cut - (c.t - anchor))` samples and fade the last 20 ms (`fades(x[:, :k], 0.0, 0.02)`).
4. Level match: `tgt = v_ref + c.applied`; `cur = momentary_max(x)` (event) or `integrated(x)` (bed); `x *= dbg(tgt - cur)`. So every generator's own output level does not matter: only `naive`/`extra` decide the level.
5. If `c.lpf`: `lp(x, c.lpf, 1)` (1st-order Butterworth, gentle 6 dB/oct) - **after** level matching.
6. `c.measured = momentary_max(x) - v_ref` (or integrated for beds).
7. `t0 = c.t - anchor`; `place(out, x, t0)` (adds into the (2, N) buffer, clipping at the edges, dsp.py:196-202).
8. `on_event(c, x, t0)` if given (mix.py never gives it).
9. Reverb send: `G._place_mono(send, c.send * x.mean(0), t0)` - a **mono** sum goes to one send bus, so the reverb does not keep the pan.

After all cues:
- Valley reverb IR: `make_ir(1.1, 77, pre=0.01, hf=1.6, early=[(0.09, 0.45, -0.5), (0.14, 0.3, 0.6), (0.23, 0.2, -0.2)])` = RT60 1.1 s, seed 77, 10 ms pre-delay, highs decay 1.6x faster, three early reflections (time s, gain, pan). IR length 1.25 x RT60 = 1.375 s; energy normalised (dsp.py:216-237).
- `out += 0.55 * convolve_st(send, valley)` (wet return gain 0.55).
- `out = hp(out, 25, 2)` - 25 Hz high-pass, 2nd order (removes sub rumble/DC).
- Last 0.12 s: `out[:, end:] *= linspace(1, 0) ** 2` (squared fade to silence).
- Returns `(out, C)`.

---

## 3. `sfx_gen.py` in detail (the generator library)

All functions take a numpy random generator `r` and return mono `(n,)` unless noted. Header (sfx_gen.py:1-4) lists the families.

### 3.1 Utility
- `_place_mono(buf, x, t)` (11-15): add mono `x` into mono `buf` at time `t`, **clipped at the buffer end (no fade)**. Also used by sfx.py for the reverb send.

### 3.2 Creak engine (stick-slip friction) (18-52)
- `stick_slip(dur, rate, r, jitter=0.12, amp=None, accel_noise=0.0)` (19-32): impulse train; instantaneous rate follows `rate` (float or array, Hz, interpolated to n samples); each impulse amplitude `uniform(0.55, 1.0) * amp[k]`; next interval `1/rate * (1 + normal(0, jitter))`. `accel_noise` is unused. Docstring says it returns (impulses, times) but it **returns only the impulses**.
- Mode tables `(freq Hz, Q, gain)` (35-38):

  | table | modes |
  |---|---|
  | `WOOD` | (230,9,1.0) (520,12,0.8) (940,14,0.55) (1650,16,0.35) (2800,18,0.18) |
  | `TIMBER` | (95,7,1.0) (180,9,0.9) (330,11,0.7) (560,12,0.5) (930,14,0.3) (1500,15,0.15) |
  | `CHAIN` | (190,28,0.9) (430,34,1.0) (760,38,0.8) (1180,42,0.6) (1720,45,0.45) (2500,50,0.3) (3400,55,0.18) |
  | `SMALLMETAL` | (1850,40,1.0) (3100,45,0.8) (4600,50,0.6) (6900,55,0.35) |

- `creak(dur, r, rate0=110, rate1=180, modes=WOOD, shape_pts=None, rough=0.12, noise=0.05, scale=1.0)` (41-52): rate curve of 64 points gliding rate0 -> rate1 plus a random bend `0.15 * mean_rate * sin(pi*u) * uniform(-1,1)`; envelope from `shape_pts` (default `[(0,0),(0.15,1),(0.7,0.85),(1,0)]`); `stick_slip(dur, rate, r, rough, env)` -> `resbank` with each mode freq x `scale` x uniform(0.94, 1.06); plus `noise * bp(white, 400-4000) * env`; fades 4 ms / 30 ms. Rate = how many grabs per second (pitch of the creak); modes = what material it sounds like.

### 3.3 Metal clinks and rattles (55-78)
- `clink(r, f0=None, dur=0.12, bright=1.0)` (55-62): f0 log-uniform 1800-5200 Hz if not given; 3 modes `(f0, 1.0, tau 12-30 ms)`, `(f0 x 2.3-2.9, 0.5*bright, 10 ms)`, `(f0 x 3.9-5.1, 0.25*bright, 6 ms)` + a click `hp(white, 3000) * exp(-t/0.8 ms) * 0.4`.
- `rattle(dur, r, density=30.0, env=None, heavy=False)` (65-78): `density*dur + 1` clinks at sorted random times; skip where env < 0.02; each clink f log-uniform 1600-5500 Hz (heavy: 700-2600), 0.1 s, gain `env * uniform(0.4, 1.0)`.

### 3.4 Marching boots (81-130)
- `boot(r, hard=1.0)` (82-93): 0.22 s. thump = sine 78-118 Hz with an 18 % pitch drop (tau 12 ms), decay 28-45 ms; plank = modal (170-260 Hz, 0.6, 18-35 ms) (380-620, 0.45, 12-25 ms) (800-1300, 0.25, 10 ms); slap = `bp(500-3500) * exp(-t/6 ms) * 0.5`; hobnail click = `hp(3500) * exp(-t/1.2 ms) * 0.22 * hard`.
- `column_stomp(r, intensity=1.0, foot=0, boots=30, spread=0.007, width=0.6, boom_gain=1.0)` (96-116) -> **stereo**, anchor `pre = 0.03`. 0.6 s.
  - 30 boots (stands in for 74 men), `row = i // 4`, gain `uniform(0.6, 1.0) * 10**(-0.35*row/20)` (-0.35 dB per row back).
  - timing `dt = 0.03 + |normal(0, 7 ms)| * (1, or -0.6 with 30 % chance)` -> a tight flam around the beat.
  - pan `clip((i%4 - 1.5)/1.5 * width * 0.6 + normal(0, 0.1) + (+0.05 right foot / -0.05 left foot), -1, 1)`.
  - deck boom: `exp(-t/0.13) * sin(47-56 Hz with a 25 % pitch drop, tau 20 ms) * 2.2 * intensity * boom_gain`, shifted by `pre` with `np.roll`.
  - kit jingle: `rattle(0.25, r, 50, exp(-3u)) * 0.35`, `widen(.., 9 ms, 0.8)`, at pre + 0.02 s.
- `deck_flex(r, a)` (119-130) -> stereo, 0.75 s: whump `exp(-t/0.2) * sin(38-48 Hz falling 12 %/s) * (1 - exp(-t/15 ms)) * 1.6`; creak `creak(0.2-0.32 + 0.2a, r, 70-110 -> 150-260, WOOD, rough 0.15, scale 0.85-1.2) * (0.35 + 0.65a)` at 70-130 ms; hanger rattle `rattle(0.35, r, 25 + 40a, exp(-2.5u), heavy) * 0.3a` at 40 ms; `widen(.., 13 ms, 0.6)`.
- `chain_groan(dur, r, i0=0.2, i1=1.0, rate0=22, rate1=40, beats=None, t0=0.0)` (133-151): intensity `i0 + (i1 - i0) * (t/dur)**1.4`; swell per beat `exp(-u/0.22) * (1 - exp(-u/0.03))` with `u = t + t0 - (beat + 0.04)` over a floor of 0.35, clipped at 1.2; stick-slip rate 64 points rate0 -> rate1 x (1 + 0.1 sin) through `CHAIN` modes (+-3 %); plus a moan: sawtooth-like `sum(sin(k*ph)/k, k=1..13)` at 48 -> 72 Hz with 3 % wobble (1.5 Hz), `bp(180-900, order 2) * env * 0.4`; fades 0.2 / 0.05 s. `beats` are absolute times (shifted by `t0`).

### 3.5 Metal and bolt (154-207)
- `bolt_strain(r, a=1.0, dur=0.32)` (155-161): `creak(dur, r, 320-420 * (0.9 + 0.3a), 520-760 * (0.9 + 0.3a), SMALLMETAL, [(0,0),(0.2,1),(0.75,0.7),(1,0)], rough 0.1, noise 0.02)` + `clink(r, 2500-3800, 0.08) * 0.6` at 0. Higher `a` = higher pitch.
- `bolt_snap(r)` (164-184): 1.6 s.
  - crack `bp(white, 900-14000, order 2) * exp(-t/2.8 ms) * 2.2` + a 0.4 ms spike of 1.5.
  - two ringing halves: f0 1760 Hz (delay 0, pitch glide -7 %) and 2090 Hz (delay 9 ms, glide -5 %, x0.8); glide `1 + gl * (1 - exp(-t/0.35))` = a small Doppler drop as they fly; partial ratios 1, 2.756, 5.404, 8.933 (free-bar ratios) with gains 1, 0.55, 0.3, 0.12 and decays 0.55, 0.22, 0.08, 0.03 s; 1.5 ms attack.
  - release thunk `exp(-t/0.07) * sin(105 Hz falling 30 %/s) * 1.2`.
  - chain jolt `rattle(0.35, r, 70, exp(-3u), heavy) * 0.6` at 10 ms. fades 0 / 0.1 s.
- `whoosh(dur, r, peak=0.3, f_lo=350, f_hi=2200, width=0.8, tail=0.25, air=0.15)` (187-196): the main whoosh engine.
  - noise `colored(n, r, 0.6)` (between white and pink).
  - level envelope: `(t/peak)**2.2` before the peak, `exp(-(t-peak)/tail)` after.
  - band centre: `f_lo + (f_hi - f_lo) * (t/peak before, exp(-(t-peak)/(1.3*tail)) after)` - it sweeps up then back down.
  - STFT filter (1024/256): Gaussian in octaves around the centre, std `width` octaves.
  - plus "air": `air * hp(noise, 4000) * env**2`. fades 5 ms / 40 ms.
  - Early `peak` = "ease-out burst" (fast attack, long tail, for cuts). Late `peak` = a swell (crossfades, the falling deck).
- `chain_whip(r)` (199-207): `whoosh(0.75, peak 0.07, 500->2600, width 0.7, tail 0.18, air 0.3)` + `rattle(0.6, r, 90, exp(-2.2u), heavy) * 0.5` at 20 ms + clank `modal(0.5, [(310, 0.8, 90 ms), (690, 0.6, 60 ms), (1130, 0.4, 40 ms), (1870, 0.25, 30 ms)])` + `lp(white, 500) * exp(-t/30 ms) * 0.8`, x0.7 at 0.6 s (see Bugs: truncated).

### 3.6 Timber and water (210-306)
- `timber_tear(r, dur=0.8)` (211-225): `creak(dur, r, 28, 75, TIMBER, [(0,0),(0.3,0.8),(0.85,1),(1,0.3)], rough 0.25, noise 0.08)` + splinter crackle: Poisson clicks with density `10 + 120 * (t/dur)**2` per second, each `modal(0.06, [(600-1800, 1, 6 ms), (2000-5000, 0.6, 3 ms)]) + hp(white, 1500) * exp(-t/2 ms)`, gain `uniform(0.2, 1.0) * t/dur`; crackle x0.5. It thickens toward the break.
- `wood_crack(r)` (228-241): 1.2 s. 9 splinters (first exactly at 0, others at `|normal(0, 30 ms)| + i*6 ms`), each `modal(0.15, [(500-1400, 1.0, 12 ms), (1500-3500, 0.7, 6 ms), (3500-7000, 0.4, 3 ms)]) + hp(1200) noise tau 3 ms`, gains 1.0 then 0.3-0.8; boom `exp(-t/0.32) * sin(52 Hz with +40 % start, tau 30 ms) * 3.0` + `resbank(lp(white, 900) * exp(-t/50 ms), TIMBER[:4]) * 0.5`.
- `bubbles(dur, r, rate, f_lo=300, f_hi=2500, tau=(0.008, 0.035), env=None, rise=(4, 12))` (244-262): Minnaert-style bubble "plinks": Poisson arrivals at `rate` per second (scalar or array); each: f0 log-uniform in [f_lo, f_hi], decay tau random in range, length 6 x tau, sine with upward glide `f0 * (1 + rise * t)`, gain `env * uniform(0.2, 1.0) * (600/f0)**0.3` (big low bubbles louder).
- `splash_big(r)` (265-280): 2.6 s. thump `exp(-t/0.2) * sin(58 Hz with +50 % start, tau 25 ms) * 2.0`; slap `bp(250-7000) * exp(-t/35 ms) * 1.6`; water body: STFT-shaped `colored(0.4)` noise, Gaussian band centred `900 + 1800 * exp(-t/0.4)` Hz (1.4 oct), env `(1 - exp(-t/0.02)) * (0.6 exp(-t/0.18) + 0.4 exp(-t/0.7))` x1.4; bubble cloud `bubbles(rate 900 exp(-t/0.5) + 20, 250-2600, tau 6-30 ms, env exp(-t/0.8)) * 1.1`; spray raining back: env `clip((t-0.25)/0.2) * exp(-max(t-0.45, 0)/0.55)`, `bubbles(500*env + 5, 1200-5000, tau 3-12 ms, rise 8-25) * 0.6` + `hp(3000) * env * 0.06`; fades 0 / 0.3.
- `water_bed(dur, r, close=1.0, slosh_rate=0.8)` (283-306) -> stereo. Per channel: lapping `0.65 + 0.35 smooth_noise(0.5 Hz)`; flow `bp(colored 0.8, 180-2600) * lap * 0.5`; babble `bubbles(70*close + 15 /s, 350-2400, tau 6-25 ms) * 0.9 * close`; rumble `lp(colored 2.0 (brown), 160, order 2) * 0.35`. Sloshes every `exponential(1/slosh_rate) + 0.3` s (until dur - 0.5): STFT noise Gaussian at 700 Hz (1.2 oct) with 30 ms attack / 120 ms decay x0.9 x close + `bubbles(120/s, 300-1500, tau 6-20 ms, env exp(-t/0.15)) * 0.7 * close`, pan +-0.7. Drips `bubbles(3.5*close /s, 1500-4200 Hz, tau 4-12 ms, rise 10-30) * 0.9` widened 7 ms.

### 3.7 Formant voices (309-466)
- `VOW` (310-312): vowel -> (F1, F2, F3, F4) Hz:

  | key | F1 | F2 | F3 | F4 | as in |
  |---|---|---|---|---|---|
  | a | 730 | 1090 | 2440 | 3400 | "father" |
  | o | 570 | 840 | 2410 | 3400 | "oh" |
  | u | 300 | 870 | 2240 | 3300 | "boot" |
  | U | 440 | 1020 | 2240 | 3300 | "book" |
  | A | 640 | 1190 | 2390 | 3400 | "but" |
  | e | 530 | 1840 | 2480 | 3500 | "bed" |
  | i | 270 | 2290 | 3010 | 3600 | "see" |
  | ae | 660 | 1720 | 2410 | 3400 | "cat" |
  | er | 490 | 1350 | 1690 | 3300 | "her" |
  | E | 580 | 1700 | 2500 | 3500 | "hey" start |
  | ei | 400 | 2000 | 2550 | 3500 | "ay" glide |

- `BWS = [85, 110, 160, 220]` Hz formant bandwidths (313).
- `vox(f0, forms, amp, r, scale=1.0, tilt=1.15, breath=0.12, fmax=5500, jitter=0.012)` (316-333): additive voice. f0 jitter 1.2 % (18 Hz smooth noise). For each harmonic k up to `fmax / max(min f0, 60)`: gain = product over 4 formants of `F^2 / sqrt((F^2 - fk^2)^2 + (fk * BW * (1 + 0.3(scale - 1)))^2)` x `k**(-tilt)`, random phase. Aspiration = `peq(bp(white, 500-5000), mean F2, +8 dB, Q 1.5)`. Both normalised by their std, mixed with `breath`, times `amp`. `scale` > 1 = smaller (female/child) vocal tract.
- `_track(n, pts, t_rel)` (336-338): piecewise-linear curve from (time, value) points.
- `vowel_track(n, segs)` (341-347): (n, 4) formant tracks gliding between (time, vowel) points.
- `oof(r, kind="oof", base=None, scale=None)` (350-378): base f0 95-150 Hz, scale 0.95-1.1 by default.

  | kind | length d | vowels | f0 multipliers (time: value) | tail |
  |---|---|---|---|---|
  | oof | 0.20-0.26 | U -> u | 0: 1.3, 0.05: 1.2, d: 0.82 | 0.12 s + "f" fricative `hp(1300)` with `peq +6 dB at 4 kHz`, x0.35 |
  | ugh | 0.18-0.24 | A -> er | 0: 1.25, 0.6d: 1.05, d: 0.7 | 0.04 |
  | oh | 0.22-0.30 | o -> U | 0: 1.4, 0.06: 1.45, d: 0.9 | 0.04 |
  | ow | 0.28-0.36 | a, a (0.45d), u | 0: 1.2, 0.3d: 1.5, d: 0.85 | 0.04 |

  amp: 12 ms attack, falls 35 % over d, then 25 ms release at x0.65; `vox(..., tilt 1.05, breath 0.35)` + pushed air `bp(300-3000) * exp(-t/30 ms) * 0.5`; fades 2 / 20 ms.
- `whoa(r, base=None, dur=None)` (381-389): base 105-165, d 0.38-0.55; f0 1.0 -> 1.35 (0.4d) -> 1.1; vowels u -> o (0.07) -> a (0.6d) -> A; 50 ms attack / 80 ms release; tilt 1.0, breath 0.25. (Only used by the unused `_whoas`.)
- `babble(dur, r, base, scale, rate=4.2, active=0.75, fmax=3600)` (392-417): one far-away talker. Random syllables of length `uniform(0.6, 1.4)/rate` with random vowels from `VOW`; with probability `1 - active` a pause of 0.25-0.8 s; pitch points 0.9-1.2 / 0.8-1.1 x base, slow 8 % fall over the clip; amp points per syllable (0.05, 0.6-1.0, 0.4-0.8, 0.05); `vox(tilt 1.25, breath 0.2)`; consonant puffs `hp(white, 2500) * clip(|d amp/dt| * SR * 0.02, 0, 1) * 0.3`. Returns zeros if fewer than 2 syllables.
- `hurrah(r, base, scale, kid=False)` (420-441): one of 3 kinds at random:
  - hur-RAH: d 0.6-0.85, vowels er, er (0.08), a (0.16), A (d); f0 1.15, 1.2, 1.6 (0.2), 1.5 (0.7d), 1.15.
  - hoo-RAY: d 0.55-0.8, u, U (0.1), e (0.2), ei (0.6d), i (d); f0 1.2, 1.25 (0.15), 1.65 (0.25), 1.3.
  - HEY: d 0.3-0.45, E, ei (0.7d), i; f0 1.5, 1.7 (0.08), 1.35.
  - amp 40 ms attack, 100 ms release, +30 % after 0.15 s; onset breath `hp(800) * clip(1 - t/0.06) * 0.4`; tilt 0.9 (kid 0.95), breath 0.3.
- `applause(dur, r, people=36, env=None)` (444-466) -> stereo. Per person: clap rate 3.6-5.6 Hz (+-10 % jitter), each clap 50 ms = `reson(white, fc 900-2600 (+-10 %), Q 1.4) * exp(-t/5-9 ms)` + `cup * reson(white, 400-700, Q 4) * exp(-t/12 ms)` (cup 0-0.6 = cupped hands), gain 0.6-1.0, pan +-0.9; whole thing x env.

### 3.8 Nature (469-526)
- `bird_chirps(dur, r, density=0.5, kind="sparrow")` (470-494): stops 1 s before the end; first phrase at 0.2-1.5 s.
  - sparrow: 2-5 chips of 40-80 ms, 60 % falling (3800-5600 Hz, -35 %), 40 % rising (3000-4200, +40 %), `sin^2` envelope, chips 90-160 ms apart; next phrase after `exponential(1/density) + 0.6` s.
  - blackbird: 3-6 fluted notes of 90-220 ms, f0 1500-2900 Hz with a bend of -25..+30 %, 2nd harmonic x0.15, `sin^1.5` envelope, 30-120 ms gaps; next phrase after `exponential(1/density) + 1.0` s.
- `crickets(dur, r, voices=3)` (497-507): per voice a 4200-4900 Hz sine gated by a 28-34 Hz pulse (`sin > 0.2`) and a 1.6-2.4 Hz chirp gate (`sin > 0.55`), gate smoothed `lp 200 Hz`, gain 0.4-1.0.
- `breeze(dur, r, level=1.0, gust=0.18, bright=900)` (510-518) -> stereo. Per channel `lp(pink, bright, order 2) * g + 0.25 * bp(colored 0.5, 1200-4000) * g^2`, `g = 0.6 + 0.4 * smooth_noise(gust Hz)`.
- `flag_flutter(dur, r)` (521-526): `bp(white, 300-3000) * m^3 * (0.5 + 0.5 smooth_noise(0.2 Hz))`, `m = 0.5 + 0.5 sin(phase(5.5 +- 1.5 Hz drifting))` -> flapping at ~4-7 Hz.

### 3.9 Park, sign, tourists (529-570)
- `swing_squeak(r, a=1.0, fwd=True)` (530-536): d = 0.22 + 0.2a; forward: rate 520 -> 760 Hz with `SMALLMETAL` ("eee"); back: 380 -> 470 Hz with `CHAIN[2:]` (760-3400 Hz modes, "aww"); env `[(0,0),(0.35,1),(0.65,1),(1,0)]`, rough 0.06, noise 0.01, scale 0.9-1.1.
- `push_thump(r)` (539-547): 0.3 s; hands `lp(white, 350, 2) * exp(-t/35 ms) * 1.5` + cloth `bp(900-4500) * exp(-t/50 ms) * 0.25` + jingle `rattle(0.25, r, 30, exp(-3u)) * 0.25` at 20 ms.
- `hammer_hit(r, big=1.0)` (550-559): 0.9 s; steel "tink" `modal([(3150, 0.6, 50 ms), (5070, 0.45, 30 ms), (7900, 0.25, 15 ms)])`; board "thock" `modal([(165, 1.0, 90 ms), (345, 0.8, 70), (610, 0.55, 50), (990, 0.35, 30), (1520, 0.2, 20)], glide 3 %)`; hit `bp(400-6000) * exp(-t/4 ms) * 1.2`; post `exp(-t/80 ms) * sin(82 Hz, +30 % start, tau 10 ms) * 1.3`; mix `(tink*0.8 + sign*1.2 + hit + post) * big`; fades 0 / 0.1.
- `stroll_step(r, scuff=0.5)` (562-570): 0.3 s; heel `exp(-t/30 ms) * sin(90-130 Hz, +15 %, tau 10 ms) * 0.7`; plank `modal([(180-280, 0.5, 25 ms), (420-700, 0.35, 15 ms)])`; tap `bp(700-4000) * exp(-t/5 ms) * 0.4`; scuff `bp(400-3000) * clip(t/20 ms) * exp(-t/70 ms) * 0.25 * scuff`.

### 3.10 dsp.py helpers the SFX code relies on (short)
- `ns(t)` seconds -> samples; `tt(dur)` time array; `dbg(db)` dB -> gain; `rng(seed)` numpy default_rng.
- `lp/hp/bp(x, f, order=2)` Butterworth SOS (cutoff capped at 0.45 SR); `peq` (peaking), `shelf` (high/low shelf), `reson` (biquad band-pass), `resbank` (parallel resonators).
- `colored(n, r, slope)`: noise with power ~ f^-slope (0 white, 1 pink, 2 brown), unit std. `smooth_noise(n, r, rate_hz)`: slow random curve in about [-1, 1].
- `fades(x, fin, fout)` raised-cosine fades; `shape(x, gain(T, F), nper, hop)` STFT time-varying EQ; `phase(f)` cumulative phase; `modal(dur, [(f, amp, tau)], r, glide)` decaying sines with random phases.
- `pan` constant-power with sqrt(2) so centre = unity per channel; `st` mono -> stereo; `place`; `widen(x, r, ms, amount)` mono -> stereo with short complementary delays.
- `make_ir`, `convolve_st` (reverb); `integrated`, `momentary` (400 ms window, 10 ms hop), `momentary_max` (BS.1770-4 K-weighting); for a clip shorter than 400 ms, momentary = its energy spread over 400 ms.

---

## 4. SFX catalogue (everything available)

"naive" = level used in the bridge (LU vs voice, before -6 dB). Mono unless "st".

| # | sound | function | length | what it sounds like / recipe in one line | bridge naive | reuse value |
|---|---|---|---|---|---|---|
| 1 | creak (wood/timber/metal) | `G.creak` | any | stick-slip impulses through a mode bank (WOOD/TIMBER/CHAIN/SMALLMETAL) | via others | high: doors, ships, floors, ropes |
| 2 | clink | `G.clink` | 0.12 s | 3-mode metal tick + click | -14 (bolt_tick) | high |
| 3 | rattle | `G.rattle` | any | cloud of clinks; light or heavy | via others | high: chains, kit, coins, keys |
| 4 | single boot on planks | `G.boot` | 0.22 s | thump + plank modes + slap + hobnail click | via stomp | medium |
| 5 | marching column stomp (st) | `G.column_stomp` | 0.6 s | 30 boots flammed +-7 ms + deck boom + kit jingle | -8 | high: armies, crowds stamping |
| 6 | deck flex (st) | `G.deck_flex` | 0.75 s | low whump + plank creak + hanger rattle | -10 | bridges, floors |
| 7 | chain groan | `G.chain_groan` | any | rising-tension chain stick-slip + 48-72 Hz moan, swells on beats | -10 / -6 / -4 | tension builds |
| 8 | bolt strain | `G.bolt_strain` | 0.32 s | high metal creak + tick | -12..-9 | stress before a break |
| 9 | bolt snap | `G.bolt_snap` | 1.6 s | crack + two ringing halves with Doppler drop + thunk + jolt | 0 | any snap/shear |
| 10 | whoosh | `G.whoosh` | any | band-swept shaped noise, early or late peak | -11/-12/-8/-20 | **every transition** |
| 11 | chain whip | `G.chain_whip` | 0.75 s | fast swish + rattle + clank | -4 | whips, cables |
| 12 | timber tear | `G.timber_tear` | 0.8 s | huge low creak + thickening splinter crackle | -6 | trees, beams, ships |
| 13 | wood crack | `G.wood_crack` | 1.2 s | splinter burst + 52 Hz timber boom | -4 | crashes |
| 14 | bubbles | `G.bubbles` | any | Minnaert plinks, rising pitch | via others | water anything |
| 15 | big splash | `G.splash_big` | 2.6 s | thump + slap + water body + bubble cloud + spray | -2 (x6 layered) | falls into water |
| 16 | water bed (st) | `G.water_bed` | any | flow + babble + rumble + sloshes + drips | -19 (bed) | rivers, people in water |
| 17 | impact grunts | `G.oof` | 0.2-0.5 s | formant "oof/ugh/oh/ow" | -4 (x12), -12/-18 groans | falls, hits, pain |
| 18 | whoa | `G.whoa` | 0.4-0.55 s | rising formant "whoa" | unused | surprise |
| 19 | babble | `G.babble` | any | one distant talker, random syllables | via murmur | crowds |
| 20 | hurrah | `G.hurrah` | 0.3-0.85 s | "hur-RAH" / "hoo-RAY" / "HEY" | via cheer/murmur | celebrations |
| 21 | applause (st) | `G.applause` | any | per-person claps with cupped-hand resonance | via cheer | audiences |
| 22 | birds | `G.bird_chirps` | any | sparrow chips or blackbird phrases | in beds | outdoor beds |
| 23 | crickets | `G.crickets` | any | gated 4.2-4.9 kHz sines | in golden bed | dusk/night |
| 24 | breeze (st) | `G.breeze` | any | gusting low wind + bright hiss | in beds | all outdoor |
| 25 | flag flutter | `G.flag_flutter` | any | 4-7 Hz flapping band noise | in beds | flags, sails, cloth |
| 26 | swing squeak | `G.swing_squeak` | 0.22-0.42 s | "eee" forward / "aww" back metal squeak | -12 (+8 log a) | swings, hinges |
| 27 | push thump | `G.push_thump` | 0.3 s | hand thump + cloth + jingle | -14 | pushes, pats |
| 28 | hammer on a sign | `G.hammer_hit` | 0.9 s | steel tink + board thock + post thump | -5 / -4 | nailing, knocking |
| 29 | stroll step | `G.stroll_step` | 0.3 s | heel + plank + tap + scuff | -9 | casual footsteps |
| 30 | flash stinger (st) | `sfx._flash` | 0.75 s | reverse swell peaking on the flash + 62 Hz whoomp | -5 | hook -> story cut |
| 31 | crowd murmur (st) | `sfx._murmur` | any | N babblers (men/women/kids), optional early hurrahs | -10 / -11 | towns, markets |
| 32 | crowd cheer (st) | `sfx._cheer` | 3.4 s | 26 hurrahs + 40-person applause swell | -6 | applause beats |
| 33 | bolt bounce (mono) | `sfx._bounces` | 0.6 s | tink, tink-tink | -16 | small metal landing |
| 34 | scuffle (st) | `sfx._scuffle` | 0.6 s | 18 shuffling steps in 0.3 s | -16 | a crowd stopping |
| 35 | splash layer (st) | `sfx._splashes` | 2.8 s | 6 splashes spread in stereo and 0-90 ms | -2 | big water impact |
| 36 | oof chorus (st) | `sfx._oofs` | 0.9 s | 12 grunts within ~0.45 s | -4 | group impact |
| 37 | groans (st) | `sfx._groans` | 0.9 s | low pained oofs | -12 / -18 | aftermath |
| 38 | debris (st) | `sfx._debris` | 1.2 s | 7 wooden knocks + spritz | -12 | wreckage |
| 39 | whoa chorus (st) | `sfx._whoas` | 0.75 s | 9 whoas | unused | crowd surprise |
| 40 | day bed (st) | `amb_day` (inner fn of `cues`) | any | breeze + river + sparrows + flags | -30 / -26 / -29 | outdoor day |
| 41 | golden bed (st) | `sfx._golden` | any | soft breeze + blackbirds + crickets + distant river | -29 | evening |

---

## 5. The cue sheet `cues.md` (generated by mix.py)

### 5.1 Files and master loudness (cues.md:6-30)
- `mix.wav`: 48 kHz, stereo, 24-bit, 3,240,000 samples = 67.500 s. Stems `stem_voice/music/sfx.wav` at mix gain (they sum to the mix before the limiter).
- Master: integrated **-15.0 LUFS**, true peak **-1.2 dBTP**, LRA 2.6 LU, max momentary -9.0 LUFS, max short-term -12.5 LUFS.
- Stems: voice -15.4, music -25.8, **sfx -29.1 LUFS**; voice gain +1.20 dB (same gain on every stem).
- Limiter (4x oversampled look-ahead, ceiling -1.2 dBTP): max GR 1.45 dB; active (>0.1 dB) on 3.53 % of samples, >0.5 dB on 0.63 %.
- ffmpeg ebur128 cross-check agrees: I -15.0, LRA 2.6 (low -16.2, high -13.6), peak -1.2 dBFS.

### 5.2 Voice-on-top table (cues.md:32-49)
bed = music + sfx; margin = voice - bed (integrated); speech median / p10 = 400 ms momentary margin on spoken-word windows.

| section (shots) | time s | voice | music | sfx | bed | margin | speech median | speech p10 |
|---|---|---|---|---|---|---|---|---|
| hook (1) | 0.00-4.33 | -15.4 | -25.2 | -28.7 | -23.6 | 8.2 | 8.4 | **0.7** |
| town (2) | 4.33-9.43 | -15.5 | -25.7 | -29.6 | -24.2 | 8.7 | 9.6 | 2.5 |
| march (3) | 9.43-14.80 | -15.8 | -25.9 | -31.2 | -24.8 | 9.0 | 7.5 | 2.4 |
| bounce (4-5) | 14.80-21.43 | -15.4 | -25.6 | -32.0 | -24.7 | 9.2 | 8.7 | 4.6 |
| whistle (6) | 21.43-27.43 | -16.0 | -25.5 | -30.7 | -24.3 | 8.4 | 9.0 | 2.6 |
| groan (7) | 27.43-32.90 | -14.0 | -24.6 | -27.2 | -22.7 | 8.7 | 9.9 | 2.3 |
| snap+fall (8) | 32.90-37.80 | -15.1 | -29.0 | **-24.3** | -24.2 | 9.1 | 9.0 | 2.6 |
| water (9-10) | 37.80-43.43 | -15.6 | **-59.7** | -33.7 | -33.7 | 18.1 | 17.2 | 12.1 |
| sway (11) | 43.43-47.03 | -15.3 | -27.5 | -35.8 | -26.9 | 11.6 | 11.1 | 7.4 |
| swing (12) | 47.03-54.00 | -15.7 | -27.3 | -36.1 | -26.7 | 11.0 | 10.5 | 5.1 |
| march2 (13) | 54.00-57.83 | -15.2 | -25.7 | -31.8 | -24.8 | 9.6 | 9.8 | 5.9 |
| rule (14) | 57.83-62.10 | -14.3 | -26.5 | -28.7 | -25.0 | 10.7 | 10.3 | **1.1** |
| tourists (15) | 62.10-67.50 | -15.4 | -26.3 | -26.8 | -23.6 | 8.2 | 7.5 | **1.0** |

Read: in the snap+fall section the SFX are louder than the music (-24.3 vs -29.0) - the SFX carry the climax. In the water section the music is silent (-59.7). Low p10 values (hook 0.7, rule 1.1, tourists 1.0) mean some word windows have the bed almost as loud as the voice (hook footfalls, hammer blows, dense tourist steps).

### 5.3 Music map (cues.md:51-78; produced by music.py, listed here because it is in the cue sheet)
- Original march, Bb major, 120 bpm, quarter note = footfall.
- Music target LU under voice (after a -3 dB speech duck keyed from words.json): hook -9.5, town -10.5, march -10.0, bounce -10.0, whistle -9.5, tension -10.0, sway -12.0, swing -11.5, march2 -10.5, rule -11.5, tourists -11.0.
- Applied section gains (dB): hook -7.6, town -3.2, march -6.8, bounce -7.1, whistle -6.0, tension -6.2, sway -7.2, swing -6.5, march2 -4.9, rule -3.4, tourists -7.2, dropout -6.2.
- Rides (music only): 3.65-4.30 s -3.0; 26.95-27.36 s -2.0; 32.20-32.77 s -4.0; 61.25-61.98 s -3.0 - quiet sentence-final words stay on top, the band blooms after. Hook footfalls 3.5 and 4.0 also -3 dB in the SFX.
- Map (time s / frame / event): 0.00/0 hook tutti, 7 whistlers, snare fill 3.0-4.3 | 4.33/130 Bb button + light clash exactly on the white flash, then the band is gone | 5.00/150 story theme light | 9.00/270 full band, "boots are the bass drum" | 15.00/450 tuba bouncing octaves | 21.00/630 vamp bar, no melody (room for "Somebody starts whistling") | 22.25/668 solo whistler pickup D-Eb-F | 23.75/712 column joins whistling | 29.22/877 whistlers falter | 29.50/885 tension F7 pedal | 31.00/930 chromatic climb + snare roll crescendo | **33.00/990 DEAD STOP on "Then," - music silent through the bolt, the drop and the two-feet-deep joke** | 43.43/1303 warm return pad, vibes on each sway extreme (84 bpm) | 47.24/1417 music-box waltz 116 bpm 3/4, one bar per swing | 48.79/1464 pushes = downbeats (triangle ting) | 53.62/1609 run up "higher and higher" | 54.00/1620 march returns soft and golden | 58.85/1766 snare roll into the rule | 59.79/1794 brass stab + timpani on each hammer blow | 62.00/1860 relaxed swung tourist version | 67.00/2010 final Bb chord on "tourists", faded to silence at 67.5.

### 5.4 SFX events table (cues.md:80-442)
- Columns: `# | time s | frame | cue | what | naive LU | applied LU | mix LUFS | pan`. Sorted by (time, name). `frame = t * 30` (can be fractional, e.g. 898.5).
- `mix LUFS = (voice stem integrated at mix gain = -15.4) + measured` (mix.py:345-348). If the SFX stem came from cache, `measured` is None and the column shows the *target* instead.
- **358 rows**: 147 stroll_step, 78 stomp, 56 deck_flex, 14 whoosh_cam, 9 swing_squeak, 5 whoosh_xfade, 5 sway_creak, 4 swing_push, 4 bolt_strain, 3 hammer_swish, 3 hammer, 3 groans, 3 bolt_tick, 2 bolt_land, 5 beds, and 1 each of wood_crack, town_murmur, timber_tear, splash_big, oofs, flash_whoosh, fall_air, debris, crowd_murmur, crowd_cheer, column_halt, chain_whip, chain_groan_swell, chain_groan_hook, chain_groan, bounce_first, bolt_snap.

Level ranges in the final mix (max momentary LUFS):
- stomps: applied -27.0 (shot 2, 51-80 m, clamped) to -11.5 (shot 7, 4 m, stomp x1.49) -> mix -42.6 to -26.9.
- deck_flex: -29.7 (amp 0.02) to -17.1 -> mix -45.1 to -32.5.
- whoosh_cam -17.0 (hook ones -18.0) -> -32.4 / -33.4; whoosh_xfade -18.0 -> -33.4.
- loudest: bolt_snap -6.0 -> **-21.4**, splash_big -8.0 -> -23.4, chain_groan_swell / chain_whip / wood_crack / oofs -10.0 -> -25.4, hammer 3 -10.0 -> -25.4, hammer 1-2 -11.0 -> -26.4, flash_whoosh -11.0 -> -26.4.
- stroll_step: applied -25.0 .. -20.9 -> mix -41.0 .. -36.3.
- beds: amb_day -45.4, amb_water -34.4, amb_golden -44.4, amb_bank -41.4, amb_town -44.4 (integrated).

All one-off rows (the non-repeating events), exactly as in cues.md:

| # | t s | frame | cue | naive | applied | mix LUFS | pan |
|---|---|---|---|---|---|---|---|
| 1 | 0.000 | 0 | amb_day (bed) | -30 | -30.0 | -45.4 | 0 |
| 2 | 0.000 | 0 | chain_groan_hook | -10 | -16.0 | -31.4 | -0.30 |
| 11 | 1.600 | 48 | whoosh_cam (push-in to the boots) | -12 | -18.0 | -33.4 | 0 |
| 16 | 2.933 | 88 | whoosh_cam (push-in, boot level) | -12 | -18.0 | -33.4 | 0 |
| 23 | 4.333 | 130 | crowd_murmur | -10 | -16.0 | -31.5 | 0 |
| 24 | 4.333 | 130 | flash_whoosh | -5 | -11.0 | -26.4 | 0 |
| 32 | 7.600 | 228 | crowd_cheer | -6 | -12.0 | -27.5 | 0 |
| 52 | 16.000 | 480 | bounce_first | -10 | -20.0 | -35.4 | 0 |
| 109 | 28.900 | 867 | chain_groan | -6 | -12.0 | -27.4 | -0.35 |
| 114 | 29.950 | 898.5 | chain_groan_swell | -4 | -10.0 | -25.4 | -0.35 |
| 128/131/134/139 | 33.0/33.5/34.0/34.5 | 990-1035 | bolt_strain 1-4 | -12/-11/-10/-9 | -18/-17/-16/-15 | -33.4..-30.4 | -0.15 |
| 137/138/142 | 34.31/34.47/34.57 | 1029.3-1037.1 | bolt_tick | -14 | -20.0 | -35.4 | -0.15 |
| 143 | 34.620 | 1038.6 | bolt_snap | +0 | -6.0 | -21.4 | -0.20 |
| 144 | 34.620 | 1038.6 | chain_whip | -4 | -10.0 | -25.4 | -0.40 |
| 145 | 34.870 | 1046.1 | column_halt | -16 | -22.0 | -37.5 | 0 |
| 147/148 | 35.55/35.67 | 1066.5/1070.1 | bolt_land | -16 | -22.0 | -37.4 | -0.50/+0.10 |
| 149 | 35.800 | 1074 | timber_tear | -6 | -12.0 | -27.4 | +0.10 |
| 150 | 36.950 | 1108.5 | amb_water (bed) | -19 | -19.0 | -34.4 | 0 |
| 151 | 36.950 | 1108.5 | fall_air | -8 | -14.0 | -29.4 | 0 |
| 152 | 36.950 | 1108.5 | splash_big | -2 | -8.0 | -23.4 | 0 |
| 153 | 36.950 | 1108.5 | wood_crack | -4 | -10.0 | -25.4 | 0 |
| 154 | 36.970 | 1109.1 | oofs | -4 | -10.0 | -25.4 | 0 |
| 155 | 37.050 | 1111.5 | debris | -12 | -18.0 | -33.4 | 0 |
| 156 | 40.420 | 1212.6 | groans | -12 | -18.0 | -33.7 | 0 |
| 157/158 | 41.95/42.70 | 1258.5/1281 | groans | -18 | -24.0 | -39.8/-39.7 | 0 |
| 159 | 43.300 | 1299 | amb_golden (bed) | -29 | -29.0 | -44.4 | 0 |
| 161-165 | 43.757..46.614 | 1312.7..1398.4 | sway_creak x5 | -12 | -18.0 | -34.8 | -0.2/+0.2 |
| 167..179 | 47.628..53.828 | 1428.8..1614.8 | swing_squeak x9 (arc 6/6/17/17/28/28/39/39/50 deg) | -12 | -25.4/-21.7/-20.0/-18.9/-18.0 | -40.7..-33.4 | +0.15 |
| 169/172/175/178 | 48.79/50.34/51.89/53.44 | 1463.7.. | swing_push 1-4 | -14 | -20.0 | -35.4 | +0.10 |
| 198 | 57.700 | 1731 | amb_bank (bed) | -26 | -26.0 | -41.4 | 0 |
| 201/203/205 | 59.70/60.24/61.60 | 1791/1807.2/1848 | hammer_swish | -20 | -26.0 | -41.4 | +0.30 |
| 202/204/206 | 59.79/60.33/61.69 | 1793.7/1809.9/1850.7 | hammer 1-3 | -5/-5/-4 | -11/-11/-10 | -26.4/-26.4/-25.4 | +0.30 |
| 207 | 61.950 | 1858.5 | amb_town (bed) | -29 | -29.0 | -44.4 | 0 |
| 208 | 62.000 | 1860 | town_murmur | -11 | -17.0 | -32.6 | 0 |

(whoosh_cam / whoosh_xfade rows are listed in section 2.4 e.)

---

## 6. Sound-design rules (what the code actually does)

1. **Picture first, sound second.** timeline.py is a hand copy of story.ts/cast.ts constants. "Lock the picture's time constants before the sound is made. Any later timing change means re-running the sound." (SKILL.md:70).
2. **Every on-screen footfall is a stomp**, on the march grid (`t = k*0.5`, 2 steps/s, the music's quarter note). The boots are the band's bass drum (cues.md:61). No footfalls when the column is off screen (shots 9-12, 14).
3. **Distance sells space.** Column sounds get gain `-14 log10(d/3.5)` (clamped -13 dB), a low-pass from 17 kHz down to ~3 kHz, and reverb send 0.06 -> 0.51 from the camera-to-subject distance, per footfall. Stereo width also shrinks with distance (`5/d`).
4. **Whoosh on every big camera change, peak ON the frame.** Cuts and big moves get a short ease-out burst (0.6 s, peak at 0.09 s, anchored to the peak); hook push-ins get a shorter, brighter one (0.45 s, peak 0.07); crossfades get a slow soft swell (0.8 s, peak 0.32 s) whose peak lands on the crossfade's first frame. The camera glides were shifted so their centre sits on the whoosh peak (story.ts:89-94). Not every cut gets one: cuts that coincide with a big event (the snap at 1039, the drop at 1099), and in-shot cuts at 497, 871, 925, plus small glides (333, 754, 1546) and the shot-2 zoom keys, have none.
5. **Hook stinger and hard stop.** The hook is a flash-forward: its stomps and deck flexes are chopped 20 ms after the white flash (frame 130). A reverse-swell whoosh (`_flash`) peaks exactly on the flash with a 62 Hz whoomp, and the music lands a Bb button + clash on the same frame, then the band is gone. The town crowd starts on that frame.
6. **Voice always on top.** Events are -6 dB under their "naive" level. Specific sounds are pulled down under quiet sentence-final words: hook footfalls 3.5/4.0 -3 dB, `chain_groan_hook` envelope dips to 0.5 from 3.55 s.
7. **Sounds answer words.** Cheer on "pride of the whole town" (7.6 s); chains "groan out loud right after the word 'groaning,'" (29.95); groans "in the gap before the line" (40.42); hammer blows on 'rule' / 'Never' / 'step' with brass stabs. (SKILL.md:53: every visual reaction lands 0-3 frames before its word.)
8. **Tension ladders.** The chain groan rises in pitch (20 -> 46 Hz grab rate) and strength (power 1.4 curve) and swells on every footfall from 28.9 s to the snap; the bolt creaks 4 times, each +1 dB and higher pitched; fatigue ticks speed up (0.31, 0.15, 0.05 s before the snap). Then the loudest cue of the film: the snap.
9. **Silence as a tool.** The music stops dead on "Then," at 33.0 s and stays silent until 43.43 s. The snap, fall, splash, groans and the water bed carry those 10 s alone; the water bed is the loudest bed (-19) because nothing else is there.
10. **Layered impacts with tiny offsets.** The hit at DROP1: fall_air (peaks on impact), wood_crack, 6 splashes spread 0-90 ms and across the stereo field, oofs +20 ms, debris +100 ms. timber_tear is placed so its own envelope peak lands on DROP0.
11. **Foley locked to motion extremes.** Sway creaks on each sway extreme (0.7 Hz); swing squeaks on each bottom of the arc, louder as the arc grows; pushes on the waltz downbeats.
12. **Sound tells the story's point.** In-step march (one big flammed stomp) vs the ending's 24 out-of-step tourists with their own paces.
13. **One ambience bed per place/light**, overlapping 0.1-0.25 s at each change with 0.25-0.6 s fades.
14. **One shared "valley" reverb** (RT60 1.1 s, early reflections) for all events via per-cue sends; distant crowds get big sends (0.35) and low-passes (3.2-5 kHz).
15. **Variation everywhere.** Every boot, clink, voice and step is re-synthesised with random parameters; tourist steps get a random -2..+1 dB.

---

## 7. Bugs / contradictions

(a) Likely bugs
1. **`big` in `hammer_hit` does nothing.** `hammer_hit(r, big)` multiplies the whole sound by `big` (sfx_gen.py:559), but `render()` re-normalises every event to its target loudness (sfx.py:330-333). Blow 3 is louder only because its naive is -4 instead of -5. Same pattern: any pure gain inside a single generator is cancelled; only relative gains inside a composite matter.
2. **`chain_whip` clank is truncated with no fade.** The clank (+0.3 s zero pad) is placed at 0.6 s into a 0.75 s whoosh buffer (sfx_gen.py:201-206). `_place_mono` clips at the buffer end, so only the first 0.15 s of a ~0.5 s clank (310 Hz mode, tau 90 ms, still ~20 % amplitude) is kept. Likely a small click at about 34.62 + 0.75 = 35.37 s. Fix: make the buffer ~1.1 s or fade the end.
3. **`np.roll` wraps tails to the front.** `bolt_snap` rolls the second ring by 9 ms (sfx_gen.py:179): its last 9 ms (~5 % of the ring amplitude) jump to before the crack (a tiny pre-echo). `column_stomp` rolls the boom by 30 ms (sfx_gen.py:113): negligible there. Should be a pad/shift, not a roll.
4. **Low-pass after level matching.** `lpf` is applied after the loudness match (sfx.py:330-335), so low-passed cues end up quieter than their "applied" target: sway_creak -1.4 dB (mix -34.8 vs -33.4 expected), groans -0.3/-0.4 dB, crowd_murmur -0.1 dB, far stomps ~-0.1 dB. The cue sheet's "mix LUFS" column shows the truth; "applied" is only the target.
5. **Editing sfx.py has no effect while the cache exists.** mix.py caches the SFX stem as `audio/_cache/sfx.npy` keyed only by the name "sfx" (mix.py:48-56, 238). You must delete `_cache/sfx.npy` (and `music_raw.npy` for music) after any change. On a cache hit the cue sheet also loses its measured values (mix.py:239-242).
6. **Seeds shift when you edit the list.** `rr()` draws from the master RNG in creation order, and the tourist loop also draws `R.uniform(-2, 1)` (sfx.py:184). Adding, removing or reordering any `rr()` cue changes the random seed (so the sound) of every later `rr()` cue.

(b) Contradictions / stale bits
7. Comment "everything stops on the white flash" (sfx.py:63): only stomps and deck flexes are cut. amb_day keeps running through the flash (chain_groan_hook happens to end at 4.3 s, before it).
8. timeline.py `COLUMN_CAM` (distance model) is an approximation of story.ts: it eases from the key frame over a few "move frames" (e.g. shot 1 `(48, 9, 6.7)`, `(88, 9, 4.3)`), while story.ts uses smootherstep glides of 37/32 frames centred on 48/88, and several keys became hard cuts (497, 717, 871, 925, 1039, 1062, 1099, 1685). The distance timing (so the stomp gain/LPF changes) can be a few frames off.
9. Whoosh descriptions are stale in places: frame 1685 says "drift in (golden march)" but story.ts has a hard cut on "pushing"; frame 823 says "low wide from behind" while story.ts S7a is "wide ahead of the column". Labels only.
10. Hammer swish peaks 2.7 frames before contact, but the picture holds the hammer still at the top from 7 frames before contact and strikes in one frame (cast.ts:373-381). The swish plays over the visual hold.
11. Docstring of `stick_slip` says it returns `(impulses, times)`; it returns only impulses. Its `accel_noise` parameter is unused.
12. `if tm > 53.95: continue` in the swing loop (sfx.py:156) never fires (last squeak 53.828).
13. Reference loudness in references/STYLE_BIBLE.md:8 is -14 LUFS integrated, but mix.py targets -15 LUFS (`TARGET_LUFS = -15.0`, mix.py:20). The bridge ships 1 dB quieter than the reference.

(c) Dead code (harmless)
14. `_whoas()` (sfx.py:270-275) and `G.whoa()` are never used. `Cue.group` is never read. `render(on_event=...)` is never passed by mix.py. `_env` is an alias of `_cut`, and `_cut`'s `dur` parameter is ignored. `impulse_train`, `ramp` and `scipy.signal` are imported in sfx_gen.py but unused.
15. Double fades: beds built with `amb_day` get the inner `fades(0.4, 0.6)` and then the outer `_cut` fades, so the real fade curve is the product of two ramps.

(d) Gotchas
16. Pan `p` is ignored for stereo generators (sfx.py:325). To place a stereo sound, pan inside the generator.
17. Reverb send is mono (`x.mean(0)`, sfx.py:342): the reverb does not follow the pan.
18. For sounds shorter than 400 ms, "max momentary" spreads the energy over 400 ms, so very short clicks (bolt_tick 0.1 s) are pushed hotter in peak terms than a long sound at the same reading.
19. `vox()` loops over every harmonic for every sample (O(harmonics x samples)); crowds of 22-26 voices are slow to render. That is one reason for the cache.

---

## 8. Hard-coded paths, OS assumptions, versions

- No absolute paths in sfx.py / sfx_gen.py / cues.md. Paths live in mix.py:
  - `HERE = dirname(abspath(__file__))`, `ROOT = dirname(HERE)`; voice at `ROOT/voice/voice.wav`, words at `ROOT/voice/words.json`; cache `HERE/_cache/`; outputs `HERE/mix.wav`, `HERE/stem_*.wav`, `HERE/cues.md`. So the layout must be `<project>/audio/*.py` + `<project>/voice/`.
  - SKILL.md:67 puts the sound code in `~/bridge-short/audio/` (user home folder). On this PC the user's copy is `an older unrelated project folder` (do not touch: another session works there).
- `voice.wav` must be 48 kHz (`assert sr == SR`, mix.py:62).
- External tool: `ffmpeg` on PATH for the ebur128 cross-check (mix.py:187-202). It fails soft ("ffmpeg check failed").
- Python libs: numpy, scipy (`scipy.signal`, `scipy.ndimage`), stdlib `wave`. **No version pins anywhere.** Uses `np.random.default_rng` (numpy >= 1.17) and `signal.butter(..., output="sos", fs=...)` (scipy >= 1.2).
- Hard-coded story numbers in sfx.py: seed 1831; every cue time (e.g. 7.6, 16.0, 28.9, 29.95, 33.0-34.5, 40.42, 41.95, 42.7, 43.3, 43.4, 53.95, 57.7, 61.95, 61.97, 62.0); whoosh frame lists; `D0` 6.0 at sfx.py:179; tourist count "24"; voice counts 22 / 26 / 14 / 12.
- Bridge title hard-coded in mix.py:288 ("The Bridge That Fell for a Song - soundtrack cue sheet").
- The timeline constants (FPS 30, TOTAL 2025, SNAP 34.62, DROP0 36.35, DROP1 36.95, FLASH 130, HITS, PUSH0 48.79, SWING_T 1.55, TOURIST_T0 62.08, SHOTS, XFADE) are copied by hand from story.ts / cast.ts. They must be kept in sync manually.

---

## 9. What to change for a new story

Keep as-is (the reusable engine):
- `dsp.py`, the whole `sfx_gen.py` library, the `Cue` class, `render()`, `SFX_DB = -6.0`, the level convention (naive vs voice, events by max momentary, beds by integrated), the cut/anchor mechanism.

Must change:
1. **timeline.py first**: new FPS/TOTAL/DUR, new `SHOTS` and `XFADE`, new event constants (the new story's "snap", "drop", "hits", ...), new camera-distance keys copied from the new story.ts (`COLUMN_CAM` -> distance to your main subject), new `footfalls()` rule (or remove it if nobody marches), new crowd/extra step generators instead of `tourist_steps()`.
2. **`cues()` in sfx.py is fully story-specific: rewrite it.**
   - Beds: one per place/light of the new world (e.g. city street, desert wind, ship deck, indoor hall). Build them from `breeze`, `water_bed`, `bird_chirps`, `crickets`, `flag_flutter`, `_murmur`, or new generators. Keep 0.1-0.25 s overlaps and 0.25-0.6 s fades at place changes.
   - Repeating action sounds tied to the picture's rhythm (like stomps): drive them from the same functions the picture uses (`marchPhase`, cycle times) and use `dist_fx` for distance.
   - Whoosh lists: take every hard cut frame and every big glide centre from the new `CAMS` in story.ts (the glide centre = key f + dur/2), and every `XFADE` start frame. Decide explicitly which cuts get no whoosh (cuts on big impacts).
   - Word-synced cues: read the new `words.json` and place reactions on/just after their words; pull SFX down under quiet sentence-final words.
   - Climax: rebuild the tension ladder -> loudest hit -> silence (music dead stop) pattern for the new "snap" moment.
   - Change the master seed (1831) and the time-coded fixed seeds; write new `desc` strings (they print into cues.md).
3. **New generators** for sounds the library lacks (fire, engines, explosions, animals, electricity, glass, rain, doors...). Write them in the same style: modal hits (`modal`), stick-slip creaks (`creak` with a new mode table), shaped noise (`shape`, `bp`), formant voices (`vox`), with a random generator `r` and an anchor.
4. **Reverb**: the "valley" IR (RT60 1.1 s, sfx.py:343) fits an open river valley. Change RT60 / early reflections for the new place (e.g. 0.4 s street, 2-3 s cathedral), or use more than one send bus for indoor/outdoor shots.
5. **mix.py**: title in `write_cues`, `MUSIC_TARGET`/`DIPS`/`REPORT` sections, and consider `TARGET_LUFS` -14 to match the reference.
6. Remove or replace bridge-only cues: chain_groan*, bolt_*, chain_whip, timber_tear, wood_crack, splash/oofs/groans, sway/swing, hammer, tourists, crowd cheer on "pride of the whole town".
7. After any change: delete `audio/_cache/sfx.npy` (and `music_raw.npy` if music changed), re-run mix.py, check cues.md (per-section margins ~8-11 LU, speech p10 > ~2 LU) and listen.
