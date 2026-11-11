# 07 - Audio engine: DSP kit, instruments, march music, timeline, final mix

Repo: `mromidev/claude-animated-shorts` (read-only clone at `<ROOT>\repo`).
Slice: the synthesized sound engine in `templates/audio/`.

## Files read (every line)

| file | lines | bytes | role |
|---|---|---|---|
| `templates/audio/dsp.py` | 350 | 11,818 | DSP kit (signal processing helpers): filters, noise, envelopes, STFT shaping, stereo, reverb, loudness meter, WAV I/O |
| `templates/audio/instruments.py` | 291 | 13,413 | 15 synthesized instruments (brass, mallets, winds, whistle, drums, strings, pad) |
| `templates/audio/music.py` | 389 | 20,600 | the original march score for the bridge short: theme, chords, sections, per-track balance, reverb |
| `templates/audio/mix.py` | 354 | 16,279 | final mix: voice + music + SFX, ducking, per-section music level, master limiter, -15 LUFS, report |
| `templates/audio/timeline.py` | 169 | 5,642 | the picture timeline copied by hand from `story.ts` + `cast.ts`, so sound lands on the frame |

Also opened for context (not in the slice, read only the parts that connect):
- `templates/audio/sfx.py` lines 1-190 and 310-348 (the `Cue` class, `cues()`, `render()`; called by mix.py).
- `templates/audio/cues.md` (443 lines; the real output report of the bridge mix: measured loudness numbers below come from it).
- `SKILL.md` (166 lines; sound step 8 and the user mix rules), `README.md` (dependency line), `templates/SCRIPT_example.md` (the voice lines).
- `templates/bridge/story.ts` lines 1-30, 185-262 and `templates/bridge/cast.ts` lines 350-371 + grep hits (to check that timeline.py mirrors them).

---

## 0. The big picture in one screen

Everything is plain Python 3 + numpy + scipy. There are no samples, no plugins, no DAW. Every sound is computed from sine waves and noise.

Data flow (`python mix.py` runs it all):

```
voice/voice.wav ──────────────► load_voice() (mono → dual-mono stereo, NO EQ, NO compression)
voice/words.json ─► speech_spans() ─► duck_db()  (−3 dB music dip while words are spoken)
                                      │
music.build()  (all notes synthesized) ─► music.render() (each track set to its own loudness,
   uses instruments.py + timeline.py        hall + yard reverb, 30 Hz high-pass) ─► cache _cache/music_raw.npy
                                      │
                      × duck curve × section_db() curve (music N LU under the voice per section + 4 "rides")
                                      │
sfx.render(v_ref) (events at naive−6 LU vs voice, beds as-is, valley reverb) ─► cache _cache/sfx.npy
                                      │
mix0 = voice + music + sfx ─► master gain G (iterated) ─► limiter (4× oversampled, −1.2 dBTP)
   ─► −15.0 LUFS integrated ─► 30 ms fade-out ─► mix.wav (48 kHz, stereo, 24-bit, exactly N samples)
   + stem_voice.wav / stem_music.wav / stem_sfx.wav (same gain G, before the limiter) + cues.md report
```

Key words used below:
- **LUFS** = loudness units relative to full scale. A loudness number that matches how loud people hear it (ITU-R BS.1770). −15 LUFS is a normal web level.
- **LU** = a difference in LUFS (1 LU = 1 dB).
- **dBTP** = true peak in dB. The real peak between samples, found by 4× upsampling.
- **Integrated / momentary / short-term loudness** = loudness over the whole file (with gates that ignore silence) / over a 0.4 s window / over a 3 s window.
- **LRA** = loudness range (how much the loudness moves, in LU).
- **Ducking** = turning music down while the voice talks.
- **Biquad** = a tiny 2-pole filter (one EQ band).
- **STFT** = short-time Fourier transform: cut sound into short overlapping slices, look at frequencies in each slice.
- **Additive synthesis** = build a tone by adding many sine waves (harmonics).
- **Modal synthesis** = build a struck object (bell, bar, drum) as a sum of decaying sine "modes" at its own resonance frequencies.
- **IR / impulse response** = the "echo fingerprint" of a room. Convolving a dry sound with it adds that room's reverb.
- **RT60** = time for reverb to fall 60 dB.

---

## 1. dsp.py - the DSP kit (350 lines)

Header (dsp.py:1-4): "Own small DSP kit ... numpy + scipy only, no third-party audio code".
Imports: `wave`, `numpy as np`, `scipy.signal` (dsp.py:5-7).

### 1.1 Constants and tiny helpers
| name | code | meaning |
|---|---|---|
| `SR` | `48000` (dsp.py:9) | sample rate. **Everything assumes 48 kHz** (the loudness filter coefficients too). |
| `TAU` | `2*np.pi` (dsp.py:10) | one full circle in radians |
| `ns(t)` | `int(round(t*SR))` (dsp.py:13) | seconds → samples |
| `tt(dur)` | `np.arange(ns(dur))/SR` (dsp.py:17) | time axis in seconds |
| `dbg(db)` | `10**(db/20)` (dsp.py:21) | dB → linear gain |
| `rng(seed)` | `np.random.default_rng(seed)` (dsp.py:25) | seeded random generator (all sound is deterministic) |

### 1.2 Filters (dsp.py:29-92)
- `_sos(kind, f, order)` (dsp.py:30): Butterworth filter as second-order sections, `fs=SR`.
- `lp(x, f, order=2)` (dsp.py:34): low-pass. Cutoff is clamped to `SR*0.45` = 21,600 Hz. Works on the last axis, so it filters mono `(n,)` or stereo `(2, n)`.
- `hp(x, f, order=2)` (dsp.py:38): high-pass (no clamp).
- `bp(x, lo, hi, order=2)` (dsp.py:42): band-pass, `hi` clamped to 21,600 Hz. Note a Butterworth band-pass of `order` N is really 2N poles.
- All three use `signal.sosfilt` = causal (one direction), so they add a small phase delay.
- `biquad(kind, f0, q=0.707, gain_db=0.0)` (dsp.py:46-68): RBJ "Audio EQ Cookbook" formulas. `A = 10**(gain_db/40)`, `w = TAU*f0/SR`, `alpha = sin(w)/(2q)`. Kinds: `"peak"`, `"bpf"` (band-pass, 0 dB peak), `"lowshelf"`, `"highshelf"` (shelves use `sa = 2*sqrt(A)*alpha`). Returns `(b, a)` normalised by `a[0]`. Any other kind raises `ValueError`.
- `peq(x, f0, gain_db, q=1.0)` (dsp.py:71): one peaking EQ band.
- `shelf(x, f0, gain_db, kind="high", q=0.707)` (dsp.py:76): high or low shelf.
- `reson(x, f0, q)` (dsp.py:81): band-pass resonator (used for breath noise at the note pitch).
- `resbank(x, modes)` (dsp.py:86): parallel resonators, `modes = [(freq, q, gain)]`; modes at or above 21,600 Hz are skipped.

### 1.3 Noise (dsp.py:95-112)
- `colored(n, r, slope=0.0, lo=20.0)` (dsp.py:96): FFT-shaped noise with power ~ f^-slope (0 = white, 1 = pink, 2 = brown). Frequencies under `lo` (20 Hz) are treated as 20 Hz. Output scaled to standard deviation 1.
- `smooth_noise(n, r, rate_hz, ctrl=200)` (dsp.py:106): a slow random curve in about [-1, 1]. Made at a 200 Hz control rate, low-passed both ways (`sosfiltfilt`, Butterworth order 2, normalised cutoff `min(rate_hz/(ctrl/2), 0.99)`), scaled to max |1|, then linearly interpolated to audio rate. Used for pitch drift and gusts.

### 1.4 Envelopes and shaping (dsp.py:115-179)
- `ramp(n, kind="cos")` (dsp.py:116): 0 → 1 raised-cosine (`0.5-0.5cos(pi u)`), or linear if kind ≠ "cos".
- `fades(x, fin=0.003, fout=0.01)` (dsp.py:121): copies `x`, raised-cosine fade-in `fin` s and fade-out `fout` s. Safe when the fade is longer than the sound.
- `curve(n, pts, t0=0.0)` (dsp.py:132): piecewise-linear automation, `pts = [(time_s, value)]`.
- `shape(x, gain, nper=1024, hop=256)` (dsp.py:139): time-varying spectral EQ. STFT with Hann window, multiply by `gain(times[F], freqs[B]) -> (B, F)` array, inverse STFT, crop/pad to the input length. Mono only (uses `len(x)`).
- `phase(f)` (dsp.py:151): instantaneous frequency (Hz per sample, array) → phase `TAU*cumsum(f)/SR`. This is how every instrument does vibrato, scoops and glides without clicks.
- `modal(dur, modes, r=None, glide=0.0, glide_tau=0.02)` (dsp.py:156): sum of decaying sines, `modes = [(freq, amp, tau)]`, each `a*exp(-t/tau)*sin(...)`. Random start phase if `r` is given. Optional common pitch glide: frequency × `(1 + glide*exp(-t/glide_tau))` (starts sharp, falls to pitch; used by timpani). Modes ≥ 21,600 Hz are skipped.
- `impulse_train(times, dur, amps=None)` (dsp.py:173): clicks at given times.

### 1.5 Stereo (dsp.py:182-212)
- `pan(x, p=0.0)` (dsp.py:183): constant-power pan. `th = (clip(p,-1,1)+1)*pi/4`, returns `[x cos th, x sin th]*sqrt(2)`. Centre gives L = R = x. Hard left/right gives one channel at `sqrt(2)*x` (+3 dB).
- `st(x)` (dsp.py:189): mono → 2-channel copy. `(1, n)` → `(2, n)`. Stereo passes through.
- `place(buf, x, t, gain=1.0)` (dsp.py:196): adds a sound into a `(2, N)` buffer at time `t` (s). Clips at both buffer ends (a sound starting before 0 is cut, not shifted).
- `widen(x, r, ms=11.0, amount=0.5)` (dsp.py:205): fake stereo from mono. `L = x + amount*0.5*delayed(x)`, `R = x - amount*0.5*delayed(x)` with an 11 ms delay, both divided by `1 + 0.25*amount`. The centre image stays. (Argument `r` is unused.)

### 1.6 Reverb (dsp.py:215-245)
- `make_ir(rt60, seed, length=None, pre=0.012, hf=1.0, early=(), density_lp=None)` (dsp.py:216): synthetic stereo room.
  - Length = `length or rt60*1.25` s.
  - Each channel: own Gaussian noise × `exp(-6.91*t/rt60)` (6.91 = ln 1000, so −60 dB at rt60).
  - Then `shape()` (STFT 512/128) multiplies by `exp(-6.91*T/rt60*hf*(F/5000)^1.2)`: high frequencies die faster. With `hf=1`, at 5 kHz the decay rate doubles; at 10 kHz it is ~3.3×.
  - 20 ms raised-cosine onset ramp (dsp.py:225).
  - Optional `density_lp` low-pass (order 1).
  - `early = [(t, gain, pan)]` early reflections: single spikes, low-passed at 6 kHz, panned, scaled by `eg*sqrt(mean(ir^2)*2000)` (dsp.py:229-235).
  - Normalised so each channel has unit energy on average: `ir /= sqrt(sum(ir^2)/2)`.
  - `pre` seconds of silence in front (pre-delay).
- `convolve_st(x, ir)` (dsp.py:240): FFT convolution of a mono or stereo send with the stereo IR. **The tail is cropped to the input length** (fine because the master file has a fixed length).

### 1.7 Loudness meter, ITU-R BS.1770-4 / EBU R128 (dsp.py:248-314)
- K-weighting filter coefficients **for 48 kHz only** (dsp.py:249-252):
  - stage 1 (high shelf): `b = [1.53512485958697, -2.69169618940638, 1.19839281085285]`, `a = [1, -1.69065929318241, 0.73248077421585]`
  - stage 2 (RLB high-pass): `b = [1, -2, 1]`, `a = [1, -1.99004745483398, 0.99007225036621]`
- `kfilt(x)` (dsp.py:255): applies both stages.
- `_blocks(x, win, hop)` (dsp.py:259): stereo (mono is copied to 2 ch), K-filter, square, cumulative sum trick for fast block means. Loudness of a block = `-0.691 + 10*log10(sum over channels of mean square)` (channel weights 1.0 for L and R). If the sound is shorter than one window it returns one block (energy / full window).
- `integrated(x)` (dsp.py:272): 400 ms blocks, 100 ms hop (75 % overlap), absolute gate −70 LUFS, relative gate −10 LU. Returns `-inf` for silence.
- `momentary(x, hop=0.01)` (dsp.py:282): 400 ms window, 10 ms hop (array). `momentary_max(x)` (dsp.py:286): the maximum.
- `short_term(x, hop=0.1)` (dsp.py:290): 3 s window.
- `lra(x)` (dsp.py:294): 3 s blocks, gates −70 abs / −20 rel, `p95 - p10`.
- `true_peak(x)` (dsp.py:304): `resample_poly(..., 4, 1)` then max |x| in dB.
- `norm_to(x, target_lufs, mode="momentary")` (dsp.py:309): scale so max momentary (events) or integrated (beds) hits a target. Silence is returned unchanged.

Note: a dual-mono stereo file measures +3 LU louder than the same audio measured as one mono channel. The whole pipeline always measures stereo, so it is self-consistent.

### 1.8 WAV I/O (dsp.py:317-350)
- `read_wav(path)` (dsp.py:318): Python `wave` module. Supports PCM 16-bit, 24-bit (manual 3-byte decode with sign fix), 32-bit int. Returns `(channels, n)` float64 and the file's sample rate. **Float WAV (format 3) is not supported** (the `wave` module refuses it).
- `write_wav(path, x, bits=24)` (dsp.py:335): 24-bit (int32 little-endian, keep the low 3 bytes) or 16-bit. Clips to ±1, rounds, **no dither**. Always writes `SR` as the rate.

---

## 2. instruments.py - 15 synthesized instruments (291 lines)

Header (instruments.py:1-4): "all own additive / modal synthesis". Imports dsp helpers (instruments.py:7).
Every function takes `r` (a numpy Generator); `r = r or rng(0)` falls back to seed 0. All return mono numpy arrays except `pad` (stereo) and `whistle` (returns `(start_time, mono)`).

### 2.0 Helpers
- `m2f(m)` (instruments.py:10): MIDI note → Hz, `440*2**((m-69)/12)` (A4 = 69 = 440 Hz; Bb4 = 70 = 466.2 Hz).
- `_env(n, att, dur_n, rel, curve=1.5)` (instruments.py:14): attack = `linspace(0,1)^curve` over `att` s; after `dur_n` samples a squared fade (`linspace(1,0)^2`) to the end of the buffer. The `rel` argument is not used inside (the release length is simply `n - dur_n`).

### 2.1 `brass(f, dur, vel=0.8, r=None, kind="tuba", scoop=-22.0, rel=0.07, fall=0.0)` (instruments.py:24-47)
Additive brass where louder = brighter.
- Length = `dur + rel` (release 70 ms default).
- Attack time per kind: tuba 0.035, horn 0.025, stab 0.012, soft 0.09 s.
- Envelope extras:
  - attack "blat" bump: × `1 + (0.25 stab | 0.14 other)*vel*Gaussian(t - att, width 0.035 s)`.
  - fast initial decay to sustain: stab × `0.72 + 0.28*exp(-t/0.09)`; others × `0.85 + 0.15*exp(-t/0.16)`.
- Pitch (cents): `scoop*exp(-t/0.03)` (lip scoop up into the note, −22 cents default) + `4*smooth_noise(n, r, 3.0)` (±4 cents slow drift). Optional `fall` adds `fall*100` cents over the last 45 % of the note (positive = goes UP; music.py never uses it).
- Formant bump (centre Hz, width Hz): tuba (420, 260), horn (900, 450), stab (1100, 700), soft (380, 220).
- Highest harmonic frequency: tuba 2400, horn 5000, stab 7000, soft 1500 Hz; harmonic count `K = min(48, top/f)`.
- Brightness cutoff (time-varying, follows the envelope): `bc = (1.8 + 6.5*vel*env**1.4) * (1.3 if stab)`.
- Harmonic k amplitude: `k**-0.75 / (1 + (k/bc)**3) * (1 + 1.2*exp(-((k f - form0)/form1)**2))`, random phase per harmonic.
- Breath noise: band-pass 300-3000 Hz (order 1) × `exp(-t/0.02)` × `0.04*vel`.
- Output: `(y*env + noise) * vel` (velocity also enters `bc`, so loud notes get more harmonics).

### 2.2 Mallets and bells
- `glock(f, vel=0.7, r=None, dur=1.8)` (instruments.py:51): modal bar. Mode ratios 1, 2.756, 5.404, 8.933. Amps 1, 0.30v, 0.12v, 0.05v. Decay taus `1.25k, 0.22k, 0.07, 0.025` s with `k = (880/f)**0.35` (lower notes ring longer). Click: high-pass 3 kHz noise × `exp(-t/0.0007)` × 0.25v. Fades 0.5 ms / 50 ms.
- `vibes(f, vel=0.6, r=None, dur=1.6, damp=None, trem=5.2, trem_depth=0.25)` (instruments.py:60): vibraphone. Modes 1 (tau 2.2 s), 3.98 (0.16v, 0.32 s), 9.9 (0.04v, 0.06 s). Soft-mallet noise hp 1.5 kHz, 1.5 ms, 0.05v. Motor tremolo `× (1 - depth*(0.5+0.5 sin(2π·5.2·t + φ)))`. Damper at `damp` s: after it, `exp(-t/0.06)`. Fades 2 ms / 50 ms.
- `musicbox(f, vel=0.6, r=None, dur=1.6)` (instruments.py:73): cantilever tine, ratios 1 (1.0, 1.1 s), 2.0 (0.04, 0.4 s), 6.27 (0.13v, 0.08 s), 17.55 (0.05v, 0.02 s). Pluck click hp 4 kHz, 0.6 ms, 0.12v.
- `triangle(vel=0.5, r=None, dur=1.6, f=1320.0)` (instruments.py:82): 6 modes, ratios 1, 2.71, 4.63, 6.02, 7.75, 9.4; amps 1, .6, .45, .3, .2, .12; taus 1.4, .9, .7, .5, .35, .25 s. Hiss hp 5 kHz, 1 ms, 0.3. Output × `vel*0.4`.

### 2.3 Winds
- `fife(f, dur, vel=0.7, r=None, rel=0.05)` (instruments.py:92): small flute.
  - Envelope: attack 18 ms (curve 1.2), +10 % bump at 20 ms.
  - Vibrato 11 cents at 5.6 Hz, fades in from 0.18 s over 0.2 s. Onset +18 cents sharp, decays in 15 ms. Drift 3 cents (4 Hz).
  - Harmonics 1, 0.20, 0.10, 0.035 (2nd phase 0.5, 3rd 1.1).
  - Breath: resonator at the pitch (Q 5) × 0.10 + hp 3 kHz × 0.015, both × envelope.
  - "Chiff" (attack noise): band-pass `1.5f .. min(4f, 16000)` × `exp(-t/0.012)` × 0.25.
- `whistle(notes, r, detune=0.0, jit=0.010, lag=0.0, vib_rate=5.7, vib_depth=16.0, breath=0.05, bright=0.035, falter=None, gate=0.93, scoop=-70.0, ctrl=1000)` (instruments.py:108-176): one person whistling a whole phrase. This is the star instrument.
  - `notes = [(t, dur, midi, vel)]`. Returns `(t0, mono)` where `t0 = first note + lag - 0.15`. Ends 0.4 s after the last note.
  - Works at a 1000 Hz control rate (`ctrl`) for pitch and amplitude lines, then interpolates to audio.
  - Per note: start = `t + lag + Normal(0, jit)` (10 ms human timing). End = `start + dur*gate` (93 %). A note is **legato** if it starts less than 60 ms after the previous note ended.
  - Non-legato notes: pitch starts `scoop` = −70 cents low and rises with tau 28 ms.
  - Legato notes: a "tongued" dip of the amplitude to 0.45·vel from 18 ms before to 6 ms after the start (instruments.py:134-136).
  - Notes longer than 0.3 s get vibrato that fades in after 0.16 s over 0.22 s.
  - Rests: pitch is filled by `np.interp` between known pitches (see bug list: comment says "last pitch").
  - Portamento (glide between notes): one-pole smoothing of log-pitch, tau 16 ms.
  - Amplitude smoothing: attack tau 12 ms, release tau 35 ms (Python loop).
  - Pitch wobble: `vib_depth * vib_env * sin(2π vib_rate t + φ)` + 5 cents slow drift (2.5 Hz low-passed noise).
  - `falter = (time, semitones)`: pitch droops by `semitones*100*u**1.6` cents over 0.38 s, and the amplitude fades from `time+0.12` to `time+0.42` (a nervous whistler giving up).
  - Tone: `sin + bright*sin(2ph+0.4) + 0.008*sin(3ph+1.0)` (almost pure sine, like a real whistle).
  - Breath: white noise shaped by STFT (2048/256) into a Gaussian band around the current pitch (sigma 0.09 octave), × `breath*0.7`, plus "air" = hp 2500 Hz noise × `0.25*breath`.
  - Fades 5 ms / 50 ms.

### 2.4 Drums
- `snare(vel=0.8, r=None, dur=0.34, tune=1.0, snappy=1.0, buzz=False)` (instruments.py:180): field (military) snare.
  - Head: `f0 = 196*tune*(1 + 0.07*vel*exp(-t/0.01))` (tension pitch drop). Modes ratio 1, 1.593, 2.136, 2.296, 2.653; amps .9, .5, .3, .22, .14; taus 50, 35, 28, 22, 18 ms.
  - Wires: band-pass 1700-10500 Hz (order 2), decay `0.055 + 0.07*vel` s (0.035 s when `buzz`), 1.2 ms attack, then +3 dB peak at 4.2 kHz (Q 0.8).
  - Stick click: hp 2.5 kHz, 0.7 ms.
  - Mix: `0.55*body*vel**1.2 + 0.85*snappy*wires*vel**1.15 + 0.3*click*vel`. Fades 0.2 ms / 20 ms.
- `snare_roll(t_start, t_end, v0, v1, r, rate=28.0)` (instruments.py:199): returns a list of `(t, vel)` strokes at 28 per second. Velocity ramps `v0 → v1` with curve `u**1.3`, alternate hands × 0.85 / 1.15, × random 0.9-1.08, timing jitter 2 ms.
- `cymbal(vel=0.7, r=None, dur=2.4, bright=1.0)` (instruments.py:213): clash cymbal. 150 random log-spaced partials 380-12,500 Hz, each decay `1.6*(900/f)**0.45` s, amp random 0.3-1.0 / sqrt(150). Hiss hp 5200 Hz (order 2), decay `0.7*bright` s, × 0.6. 2 ms onset. Crash transient bp 2-9 kHz, 6 ms, × 0.8. Fades 0.5 ms / 200 ms.
- `timpani(f, vel=0.8, r=None, dur=2.2)` (instruments.py:229): modes ratio 1, 1.504, 1.742, 2.0, 2.245, 2.494; amps 1, .55, .3, .35, .18, .12; taus 1.5, .9, .6, .5, .4, .3 s; pitch glide `0.025*vel` decaying 60 ms. Thump: lp 400 Hz noise, 18 ms, × 0.9.
- `brush(vel=0.5, r=None, dur=0.35, swish=False)` (instruments.py:238): band-pass 900-9000 Hz noise. Swish envelope `sin(π t/dur)**1.5`; tap envelope `exp(-t/0.045)*(1-exp(-t/0.003))`. × `vel*0.5`.

### 2.5 Strings and pad
- `pluck(f, vel=0.7, r=None, dur=0.9, bright=0.5, pos=0.17)` (instruments.py:251): pizzicato string. Harmonics `K = min(28, 7000/f)`. Amp `|sin(π k pos)| / k**(1.3 - 0.6*bright)` (pluck position 17 % = comb shape). Decay `tau0 = 0.55*(110/f)**0.35`, `tau_k = tau0/(1 + 0.45(k-1)(f/150)**0.4)`. Slight stiffness `f_k = k f sqrt(1 + 2e-5 k²)`. Thump lp 700 Hz, 8 ms, × 0.15. Attack 1.5 ms.
- `pad(freqs, dur, vel=0.5, r=None, att=0.6, rel=0.9, warm=900.0, detune=7.0, trem=None)` (instruments.py:267): warm stereo pad. Per note 3 saw-like voices at −7 / 0 / +7 cents, panned −0.6 / 0 / +0.6. Each voice has its own slow 3-cent LFO (0.15-0.4 Hz). Harmonics `1/k` with soft roll-off `1/(1 + (k f/warm)**2)`, up to `min(30, 4000/f)`. Raised-cosine attack `att` and release `rel`. Optional `trem(t)` gain function. Normalised by `1/sqrt(3*len(freqs))`. Returns `(2, n)`. (Its pan law has no `sqrt(2)`, unlike `dsp.pan`.)

---

## 3. music.py - the original march (389 lines)

### 3.1 Concept (music.py:1-6)
"Original light comedic military march ... Bb major, 120 bpm: one quarter note = one footfall, the beat grid t = k * 0.5 s is the soldiers' step grid in every marching shot." The music is the soldiers' own song: it starts as a band, becomes whistling, falters when they get nervous, stops dead before the snap, and comes back changed (warm, then a waltz for the swing analogy, then golden, then hammer stabs, then a lazy swung "tourist" version).

Imports: `dsp` (SR, ns, rng, pan, place, fades, dbg, make_ir, convolve_st, integrated, lp, hp), `instruments as I`, `timeline as T` (music.py:7-10).

### 3.2 Constants
- `N = ns(T.DUR)` = 3,240,000 samples (music.py:12). `Q = 0.5` s = one quarter note (music.py:13). One 4/4 bar = 2.0 s.
- `F = I.m2f` (music.py:39).
- `R = rng(1831)` (music.py:84): global random source (1831 = bridge year). `_r()` (music.py:87) makes a fresh child generator per note from `R`. **The whole score is deterministic only if the order of calls never changes** (see gotchas).

### 3.3 Theme A (music.py:15-26): `(bar, beat, length in quarters, MIDI)`
Whistle/fife register. MIDI: 70 Bb4, 74 D5, 75 Eb5, 77 F5, 79 G5, 81 A5, 82 Bb5, 84 C6, 86 D6, 87 Eb6, 89 F6. All notes are in Bb major.

| bar | notes (pitch / length) |
|---|---|
| 1 | Bb5 q, Bb5 dotted-8th, C6 16th, D6 q, Bb5 q |
| 2 | F5 q, G5 8th, A5 8th, Bb5 q, (rest), F5 8th on beat 3.5 |
| 3 | G5 dotted-8th, A5 16th, Bb5 8th, G5 8th, Eb6 q, D6 8th, C6 8th |
| 4 | C6 half, (rest), F5 8th on 3.5 |
| 5 | Bb5 q, Bb5 dotted-8th, C6 16th, D6 q, F6 q |
| 6 | Eb6 8th, D6 8th, C6 8th, Bb5 8th, A5 q, Bb5 8th, C6 8th |
| 7 | D6 dotted-8th, C6 16th, Bb5 8th, A5 8th, G5 q, C6 q |
| 8 | Bb5 q, F5 8th, D5 8th, Bb4 q (cadence) |

`PICKUP3` (music.py:26): bar 0, beats 2.5 / 3 / 3.5 = D5, Eb5, F5 (8ths), i.e. 0.75, 0.5, 0.25 s before bar 1.

### 3.4 Harmony
`CHB` chords per bar, per beat (music.py:27-28):
1 Bb | 2 F F Bb Bb | 3 Cm Cm Eb Eb | 4 F7 | 5 Bb | 6 Eb Eb F F | 7 Gm Gm Cm F7 | 8 Bb.

`CH` voicings (music.py:29-38): `oom` = tuba (root, fifth), `pah` = after-beat horn chord, `hi` = upper voicing for plucks/vibes.

| chord | oom | pah | hi |
|---|---|---|---|
| Bb | 34, 41 (Bb1, F2) | 53, 58, 62 | 58, 62, 65 |
| F | 41, 36 | 53, 57, 60 | 57, 60, 65 |
| F7 | 41, 36 | 51, 57, 60 | 57, 60, 63 |
| Cm | 36, 43 | 55, 60, 63 | 60, 63, 67 |
| Eb | 39, 46 | 55, 58, 63 | 58, 63, 67 |
| Gm | 43, 38 | 55, 58, 62 | 58, 62, 67 |
| F#o7 | 42, 42 | 54, 57, 60, 63 | 57, 60, 63 |
| G#o7 | 44, 44 | 56, 59, 62, 65 | 59, 62, 65 |

### 3.5 Sections (music.py:42-46) - used by the cue sheet AND by mix.py level automation
| name | start s | end s | picture / words |
|---|---|---|---|
| hook | 0.0 | FLASH = 4.333 | shot 1 flash-forward: "Seventy-four soldiers knocked down an iron bridge just by walking across it." |
| town | 4.333 | 9.0 | shot 2: "It's 1831 ... pride of the whole town." |
| march | 9.0 | 15.0 | shot 3: "The men are marching home four across ..." |
| bounce | 15.0 | 21.0 | shots 4-5: "Halfway over, the bridge starts bouncing ... think it's hilarious." |
| whistle | 21.0 | 27.43 | shot 6: "Somebody starts whistling ... a little harder every step." |
| tension | 27.43 | 33.0 | shot 7: "The bounce gets bigger, the chains start groaning ... breaks step." |
| dropout | 33.0 | 43.43 | shots 8-10: "Then, a single bolt snaps ... Luckily / Unluckily ..." (NO music) |
| sway | 43.43 | 47.24 | shot 11: "every bridge has a rhythm it naturally likes to sway at." |
| swing | 47.24 | 54.0 | shot 12: "Ever pushed a kid on a swing? ... higher and higher." |
| march2 | 54.0 | 57.83 | shot 13: "Seventy-four men stepping together were pushing that bridge like a swing." |
| rule | 57.83 | 62.0 | shot 14: "Nobody died, but the army made a rule: never cross a bridge in step." |
| tourists | 62.0 | 67.5 | shot 15: "So now, the best drilled soldiers ... like a crowd of tourists." |

### 3.6 Building blocks
- `swingb(b)` (music.py:49): swing feel. A beat fraction of .5 or .75 moves to 2/3; .25 moves to 1/3 (triplet swing). Exact float compare (fine for these binary fractions).
- `theme(t_bar1, bars=range(1,9), transpose=0, pickup=False, swing=False, late=0.0)` (music.py:55): turns THEME into sorted `(t_seconds, dur_seconds, midi)`. Bar b starts at `t_bar1 + (b-1)*2.0`.
- `class Band` (music.py:67): `tr` = name → `(2, N)` track buffer; `send` = name → reverb send; `cues` = list of `(t, text)` for the report. `add(name, x, t, p=0.0, g=1.0, send=0.15)` pans mono with `dsp.pan` and places it (stereo is placed as-is).
- `oompah(b, t_bar, chords, vel=0.6, every=True, pah_vel=0.4, bounce=False, pah=True)` (music.py:91): one bar of march accompaniment.
  - `every=True`: tuba on every beat, alternating root/fifth, beats 1 & 3 at full vel and 2 & 4 at ×0.88; horn chord on every "&" (`t + Q/2`), 0.15 s long, voices staggered 4 ms, pans 0.32 / 0.20 / 0.08, scoop −12.
  - `every=False` (light): tuba on beats 1 and 3 (root then fifth), horns ON beats 2 and 4, 0.17 s.
  - `bounce=True`: tuba plays octave 8ths (root raised an octave if under MIDI 36), 0.2 s + 0.16 s at ×0.85, scoops −30 / −45.
  - Tuba is always 0.3 s, pan −0.1.
- `SN` snare patterns, 16 sixteenth-steps per bar (music.py:112-116). 0 = none, 1 = ghost (×0.5), 2 = normal (×0.9), 3 = accent with flam (×0.95 + grace note 26 ms early at ×0.4):
  - light `[1,0,0,0, 2,0,0,0, 1,0,0,0, 2,0,1,1]`
  - march `[3,0,1,1, 2,0,1,0, 3,0,1,1, 2,0,1,0]`
  - drive `[2,1,1,1] × 4`
- `snare_bar(b, t_bar, pat, vel, steps=range(16), cres=0.0)` (music.py:119): step = `Q/4` = 0.125 s; vel × `(1 + cres*s/16)` × weight × random 0.93-1.05; 2 ms timing jitter; pan 0.05.
- `roll(b, t0, t1, v0, v1, accent=None, at=None)` (music.py:131): buzz roll (snare dur 0.14, `buzz=True`) + optional accented flam at `at` (default `t1`).
- `melody(b, name, notes, vel, transpose=0, fn="glock", p=0.0, gate=0.9)` (music.py:140): plays notes on glock / fife (`dur*gate`) / vibes (`dur=max(1.2, d+0.8)`, damper at `d+0.35`) / musicbox, random vel ±.
- `chorus(b, name, notes, voices, seed, joins=None, falters=None, spread=0.75, vel=1.0, solo_gain=1.0)` (music.py:154): a column of soldiers whistling. Voice 0 = the soloist, centre, no detune, no lag, gain `solo_gain`. Others: own `rng(seed*101+v)`, detune ±11 cents, lag 0-22 ms, vibrato 5.0-6.6 Hz and 10-22 cents, breath 0.04-0.07, note vel × 0.85-1.0, gain 0.45-0.8, pan `spread*U(-1,1)`, low-pass 5-9 kHz ("further away, a little duller"). `joins[v]` = time voice v starts; `falters[v]` = when it droops by 1.2-3.2 semitones. The chorus has its own seeds, so it does NOT depend on the global `R`.

### 3.7 `build()` - the score, section by section (music.py:172-358)
Tracks and their hall-reverb send (music.py:174-177): whistle 0.0 (whistle goes to a separate "yard" reverb instead), fife 0.16, glock 0.22, tuba 0.10, pah 0.18, snare 0.13, cymbal 0.16, stab 0.16, timpani 0.18, pad 0.25, vibes 0.26, musicbox 0.26, pluck 0.18, brush 0.12, triangle 0.25.

1. **HOOK 0-4.33** (music.py:179-202): theme bars 1-2 at 0.0; 7 whistlers (seed 11); glock one octave up (vel .5, pan −.35); oom-pah full (vel .68, pah .42) for bars at 0 and 2; snare "march" .62 (bar 2 only steps 0-7); buzz roll 3.0 → 4.28 (.25 → .62) under "...across it."; cymbal .45 at 0. Then **all tracks are cut**: linear fade from `FLASH-0.03` to `FLASH+0.015` (45 ms), zero after. Then the "button" ON the white flash (frame 130 = 4.333 s): brass stab chord MIDI 46, 53, 58, 62, 65 (0.2 s, vel .8, pan `(m-56)/20`), tuba Bb1, glock Bb6 (94), short cymbal .4 (1.2 s).
2. **STORY MARCH 4.5-21** (music.py:204-229): bars sit on ODD seconds (5, 7, 9 ...) "so 'Then,' = 33.0 is a downbeat". Roll 4.5 → 4.96 with accent at 5.0. Bars 1-2 at 5.0 light: glock .36 (+12), fife .42 (pan .25), oom-pah light (vel .5, pah .34), snare light .36. Bars 3-8 (9.0-21.0): glock .5, fife .58, cymbal .42 at 9.0, full oom-pah (vel .64, pah .44), **tuba bounces in octaves from 15.0** ("as the bridge starts bouncing"), snare march .58 (bar 8 steps 0-11). Roll 20.5 → 20.96, accent at 21.0. Vamp bar at 21.0 (Bb oom-pah .58, snare light .45, no melody: room for "Somebody starts whistling"). Comment at 9.0: "boots are the bass drum" (there is no kick drum; the SFX stomps play that role).
3. **WHISTLE 22.25-29.7** (music.py:231-244): solo whistler pickup D-Eb-F at 22.25/22.5/22.75 into theme bars 1-3 at 23.0, plus a held C6 at 29.0 for 1 s. 9 voices (seed 22, spread .8, solo gain 1.05). Voices 1-8 join between 23.75 and 24.75 (`linspace`). Falter times `[29.42, 29.22, 29.3, 29.36, 29.25, 29.5, 29.33, 29.45, 29.28]` - the whistlers die out one by one 29.2-29.7 ("faces turn nervous"). Cymbal .3 at 23.0. Oom-pah grows per bar (vel .64/.68/.72, pah .43/.46/.49), snare march .58/.64/.70.
4. **TENSION 29-33** (music.py:246-270): F7 pedal bar at 29.0 (vel .7, pah .5); snare march steps 0-7 (.66) then drive steps 8-15 (.55, cres .4). Chromatic climb F7 31.0 → F#dim7 31.5 → Gm 32.0 → G#dim7 32.5: tuba root 8ths (vel .7 + .05i), horn chord on the "&", glock ticking 16ths at MIDI 96-99 (C7 → D#7). Snare drive at 31.0 (cres .5) and roll 32.0 → 33.0 (.45 → 1.0). **DEAD STOP**: every track except whistle is cut at 32.985 with a 12 ms fade. Music is silent from 33.0 to ~43.3 (bolt, snap, drop, "Luckily / Unluckily" joke).
5. **SWAY 43.4-47.3** (music.py:273-283): tied to the bridge's own 0.7 Hz sway (story.ts shot 11 bounce = `0.75*sin(2π·0.7·(t-43.4))`). 0.7 Hz × 2 extremes = 1.4 per s = 84 bpm. Vibes notes on each sway extreme `43.4 + (0.25 + k/2)/0.7` = 43.757, 44.471, 45.186, 45.900, 46.614 (D6, Bb5, Eb6, Bb5, C6; vel .5, damper .7, trem .12). Pad chords: 43.3-44.47 Bb (46, 58, 62, 65), 44.47-45.9 Eb/Bb (46, 55, 63, 67), 45.9-46.61 Bb, 46.61-47.4 F7 (41, 57, 60, 63); vel .55, attack .5 (first) / .25, release .6, tremolo `1 + 0.1 sin(2π·0.7·...)` locked to the sway. Soft low brass under each chord (Bb1 / F1, `kind="soft"`, scoop −8).
6. **SWING 47.24-54** (music.py:285-308): music-box waltz in 3/4, one bar per swing cycle. `bar_t = PUSH0 + (k-1)*SWING_T` = 47.24, 48.79, 50.34, 51.89, 53.44 (the 4 pushes are downbeats). Beat = 1.55/3 = 0.517 s = 116 bpm. Bass pizz (pluck) Bb2, Bb2, Eb2, F2, Bb2 (vel .8); upper "pah-pah" plucks on beats 2-3 (`CH[c]["hi"][1:]`, vel .4); music-box melody climbs every bar: `[_, _, F5] [Bb5, D6, F6] [Eb6, G6, Bb6] [F6, A6, C7] [Bb6]` (vel .62); triangle ting on each push (vel .35). "Higher and higher" run D7-F7-Bb7 at 53.62 / 53.75 / 53.88. Soft pad underneath (vel .32).
7. **MARCH 2 54-57.6** (music.py:310-320): soft golden march, theme bars 1-2 at 54.0 (notes before 57.6 only), 6 whistlers (seed 54, vel .8, solo .8), glock .32, cymbal .22, light oom-pah (.48 / .32), light snare .32.
8. **RULE 58.85-62** (music.py:322-332): rolls 58.85 → 59.77 (.12 → .55) and 60.5 → 61.67 (.1 → .6). On the three hammer blows `T.HITS` 59.79 / 60.33 / 61.69: brass stabs Bb (46, 53, 58, 62, 65) / F (41, 53, 57, 60, 65) / Bb + top Bb (… 70) = I-V-I, vel .70 / .72 / .75, pan `(m-56)/22`, plus timpani Bb2 / F2 / Bb2; cymbal .25 on blow 3. Words: 'rule' / 'Never' / 'step'.
9. **TOURISTS 62-67.5** (music.py:334-357): lazy swung version. Theme bars 1-2 at 62.0, swung, 25 ms late, on vibes (vel .6), plus the cadence tail Bb5 66.025, F5 66.525, D5 66.858, Bb4 67.02. Walking pizz bass every 0.5 s from 62.0: 46, 50, 53, 50, 41, 45, 46, 48, 46, 41, 34 (last one at 67.0). Brushes: swish on each beat (alternating .55/.35) and a swung tap at `+Q*2/3`. Vibes comp chords at 62.5 / 63.5 / 64.5 / 65.5 (Bb, Bb, F, Bb). Final Bb chord 58, 62, 65, 70 at 67.0 on 'tourists' (66.72-67.24) + triangle. Global fade from 67.3 to 67.5 (`linspace(1,0)**1.5`).

`b.cues` collects 22 text cues (time, description) for cues.md "Music map".

### 3.8 Balance and reverb: `TARGET` + `render(b, ref=-20.0)` (music.py:361-389)
`TARGET` (LU relative to `ref = -20` LUFS, measured with `integrated()` on each whole track, which ignores silence thanks to the gates): whistle 0.0, fife −3.0, glock −6.0, tuba −2.5, pah −7.5, snare −5.5, cymbal −11.0, stab −3.0, timpani −5.0, pad −3.5, vibes −2.0, musicbox −1.5, pluck −4.0, brush −13.0, triangle −15.0 (unknown names → −6).

`render()`:
- Two synthetic rooms: `hall = make_ir(1.5, 7, pre=0.018, hf=1.4)` and `yard = make_ir(0.9, 8, pre=0.008, hf=1.8, early=[(0.11, 0.5, -0.4), (0.19, 0.35, 0.5)])` (yard has 2 early echoes like walls).
- Each non-empty track is scaled to `ref + TARGET[k]`. So **velocities only shape dynamics inside a track; the track's overall level is always forced to its TARGET**.
- Whistle → yard send 0.16 (hard-coded branch); others → hall with their own send.
- `out = dry + 0.7*conv(hall_send mono-average, hall) + 0.8*conv(yard_send mono-average, yard)`, then `hp(out, 30, 2)`.
- Returns `(out, levels)`; mix.py throws `levels` away.

---

## 4. timeline.py - the picture clock (169 lines)

Header (timeline.py:1-3): "Picture timeline mirrored (read-only) from your Remotion project/src/videos/bridge/story.ts + cast.ts so every sound lands on the frame". **It is a hand copy. Nothing reads story.ts automatically.** If the picture changes, this file must be edited by hand and the sound re-run (SKILL.md:70 "Lock the picture's time constants before the sound is made").

### 4.1 Constants (checked against the TS source)
| name | value | source |
|---|---|---|
| `FPS` | 30 | story.ts:5 |
| `TOTAL` | 2025 frames | story.ts:6 |
| `DUR` | 2025/30 = 67.5 s | |
| `fr(f)` | f/30 | |
| `SNAP, DROP0, DROP1` | 34.62, 36.35, 36.95 | story.ts:30 |
| `FLASH` | `fr(130)` = 4.333 s | story.ts:65 `FLASH_AT = 130` |
| `HITS` | 59.79, 60.33, 61.69 | cast.ts:371 |
| `SWING_T, PUSH0` | 1.55, 48.79 | cast.ts:394 |
| `PUSHES` | 48.79, 50.34, 51.89, 53.44 | cast.ts:395 |
| `TOURIST_T0` | 62.08 | cast.ts:353 |
| `SHOTS` | 15 shots `(first frame, end frame, light, crowd)` | story.ts:46-61 (matches) |
| `XFADE` | {9: 6, 11: 8, 12: 8, 13: 8, 14: 8, 15: 8} frames | story.ts:64 (matches) |

SHOTS (frames): 1 0-130 march, 2 130-283, 3 283-444, 4 444-534, 5 534-643, 6 643-823, 7 823-987 (all day/march), 8 987-1134 fall, 9 1134-1212 water, 10 1212-1303 water, 11 1303-1411 golden none, 12 1411-1620 golden none, 13 1620-1735 golden march, 14 1735-1863 day bank, 15 1863-2025 day tourists.

### 4.2 Functions
- `shot_t(i)` → (start s, end s). `shot_at(t)` → shot id (falls back to 15).
- `tau_of(shot, t)` (timeline.py:43): story time. Shot 1 = `29.5 + t` (the hook is a flash-forward to the bouncing climax), shot 13 = `t - 31`, else `t`. Matches story.ts.
- `AMP` bounce amplitude table `[(14.85, 0), (17.8, .07), (21.4, .13), (27.4, .26), (33.0, .46), (SNAP, .55), (SNAP+.35, 0)]` and `STOMP` `[(21.4, 1.0), (27.4, 1.35), (33, 1.5)]` ("a little harder every step") - identical to story.ts:31-33. `amp(tau)`, `stomp(tau)` = linear interpolation.
- `hh(i, s=0)` (timeline.py:63): the same hash as cast.ts `hh` (`frac(sin(i*127.1 + s*311.7)*43758.5453)`) so Python gets the same "random" tourist speeds as JS.
- `easeout(u)` = `1 - (1-u)**4` (story.ts `easeOut`).
- `COLUMN_CAM` (timeline.py:75-85): per shot, `(frame, move frames, metres)` = camera distance to the marching column. First tuple = start distance, later keys glide in log-distance with `easeout` over the move frames. Values are approximations of the story.ts keys (see bug list).
- `column_distance(t)` (timeline.py:88): metres; 60 m for shots without keys.
- `dist_fx(d)` (timeline.py:102): distance → (gain dB, low-pass Hz, reverb send) for every column sound. `d` is clamped to ≥ 3.5 m.
  - gain `-14*log10(d/3.5)` (≈ −4.2 dB per doubling, gentler than real −6)
  - low-pass `clip(17000*(3.5/d)**0.55, 1800, 17000)`
  - send `0.06 + 0.45*clip(ln(d/3.5)/ln 25, 0, 1)`
  - Worked values: 3.5 m → 0 dB, 17 kHz, .06; 5 m → −2.2, 13.97 kHz, .11; 10 m → −6.4, 9.5 kHz, .21; 20 m → −10.6, 6.5 kHz, .30; 40 m → −14.8, 4.5 kHz, .40; 80 m → −19.0, 3.0 kHz, .50.
- `footfalls()` (timeline.py:111): every 0.5 s on the global grid (`k*0.5`) while the shot's crowd is "march" or "fall"; in shot 8 stops after `SNAP + 0.25` (column halts). Returns `(t, shot, tau, foot 0/1)`. Because shot 1 tau = 29.5 + t and shot 13 tau = t − 31, story footfalls stay on the same 0.5 s grid as the music beats.
- `tourist_steps()` (timeline.py:126): shot 15, 24 strollers. Speed `sp = 0.55 + hh(i)*0.5`, phase `hh(i,5)`, x `(hh(i,3)-0.5)*4`. A footfall at stroll phase 0 and 0.5, where phase = `((t - t0)*sp/1.4 + ph0) % 1` → `t = t0 + (k*0.5 - ph0)*1.4/sp` (0.7 m per step). z = `-4 + (i/24)*28 + hh(i,2)*1.5 - sp*(t - t0)` (same as cast.ts:355). Steps before `shot start - 0.1` are skipped. Returns `(t, i, x, z, sp)`.
- `tourist_cam(t)` (timeline.py:149): approximate shot-15 camera position from keys 1857 / 1905 / 1962 (start `[1.7, 7.75, -15.5]` + 0.006 m/frame in z; then `[-1.3, 7.6, -13]` eased in 10 f; then `[17, 15, -44]` eased in 24 f).
- `swing_amp_deg(t)` (timeline.py:162): `6 + Σ 11*smoothstep((t - push)/0.3)` degrees (same as cast.ts:396).
- `words(path)` (timeline.py:167): `json.load` of `words.json`. Format used by mix.py: a list of objects with `"s"` (start s) and `"e"` (end s).

### 4.3 How cues are timed (important)
- **No cue is computed from words.json automatically.** words.json is used only for (a) the −3 dB duck and (b) the report. Every music and SFX time (33.0 "Then,", 66.72-67.24 "tourists", the 4 DIPS, the hammer HITS on 'rule' / 'Never' / 'step', FLASH, PUSH0 ...) was read off words.json and story.ts by a person/agent and typed in as a number.
- The music beat grid (0.5 s) = the march step grid (`marchPhase` in story.ts: 1 Hz cycle, footfalls at phase 0 and 0.5). The script was voiced and shots placed so that key words land on beats (e.g., the dead stop at 33.0 is a bar line because the march bars were put on odd seconds).

---

## 5. mix.py - final mix and loudness (354 lines)

Header (mix.py:1-5): voice (gain only) + march (ducked, per-section level relative to voice) + SFX stem; master to −15 LUFS integrated; own 4× oversampled look-ahead limiter ≤ −1 dBTP; exactly 67.500 s / 48 kHz / stereo / 24-bit. Writes mix.wav, stems, cues.md; caches stems in `_cache/`.

Imports: os, sys (unused), time, json, subprocess, numpy, `scipy.ndimage`, `scipy.signal`, dsp helpers, `timeline as T` (mix.py:6-14). `music` and `sfx` are imported inside functions.

### 5.1 Constants (mix.py:16-41)
| name | value | meaning |
|---|---|---|
| `HERE` | folder of mix.py (the `audio/` folder) | outputs go here |
| `ROOT` | parent of `audio/` | expects `ROOT/voice/voice.wav` and `ROOT/voice/words.json` |
| `CACHE` | `HERE/_cache` | `.npy` float32 caches |
| `N` | `ns(T.DUR)` = 3,240,000 | exact length |
| `TARGET_LUFS` | −15.0 | integrated master loudness |
| `CEIL_DBTP` | −1.2 | limiter ceiling (spec ≤ −1 dBTP, 0.2 dB safety) |
| `DUCK_DB` | −3.0 | music dip during speech (keyed from words.json, not the audio) |
| `MUSIC_TARGET` | hook −9.5, town −10.5, march −10.0, bounce −10.0, whistle −9.5, tension −10.0, sway −12.0, swing −11.5, march2 −10.5, rule −11.5, tourists −11.0 | music loudness in LU below the voice, per section, after ducking. Comment: user standard "+3 dB music" = bed −10 instead of the old −13; sway/swing softer and warmer; rule/tourists leave room for hammer blows and footsteps. |
| `DIPS` | (3.65-4.30, −3) "...walking across it."; (26.95-27.36, −2) "...every step."; (32.20-32.77, −4) "...breaks step."; (61.25-61.98, −3) "...in step." | "rides": extra music dips so quiet sentence-final words stay on top |
| `REPORT` | 13 rows = shots (hook (1), town (2), march (3), bounce (4-5), whistle (6), groan (7), snap+fall (8), water (9-10), sway (11), swing (12), march2 (13), rule (14), tourists (15)) | report table only |

### 5.2 Voice chain (mix.py:60-66) - there is none, on purpose
`load_voice()`: reads `ROOT/voice/voice.wav`, `assert sr == SR` (must be 48 kHz), mono = channel 0 or mean of channels, pad/crop to exactly N, return dual-mono stereo. **No EQ, no compression, no de-essing, no pitch** (cues.md:4 states the same). The only change is the master gain G that is applied equally to all stems (bridge: +1.20 dB). This follows the user rule "voice unchanged" (SKILL.md:23).

### 5.3 Ducking (mix.py:69-93)
- `speech_spans(words, merge=0.3)`: joins words with gaps < 0.3 s into spans.
- `duck_db(spans, depth=-3.0, pre=0.08, post=0.12, att=0.07, rel=0.45)`: 1000 Hz control rate. "Voice active" from 80 ms before each span to 120 ms after. One-pole follower: attack tau 70 ms, release tau 450 ms. Output dB curve 0 → −3 dB, interpolated to audio rate.

### 5.4 Per-section music level (mix.py:97-127) `section_db(m_ducked, v)`
1. For each music section except "dropout": `gain = Lv + MUSIC_TARGET[name] - Lm`, with `Lv`, `Lm` = integrated loudness of voice and ducked music inside that section. If the music is silent there, gain 0.
2. `gains["dropout"] = gains["tension"]` (so the hall tail after the dead stop decays at the tension level).
3. Step curve; the "sway" step is moved earlier to 43.1 s (`a_eff`, hard-coded).
4. Smoothed by a 0.4 s moving average, **except** ±0.25 s around `T.FLASH` and 43.1 where it stays a hard switch (the music is silent there anyway).
5. The DIPS are added with 60 ms smoothed edges.
6. Returns `(curve_dB, gains)`.

Bridge result (cues.md:52): applied section gains hook −7.6, town −3.2, march −6.8, bounce −7.1, whistle −6.0, tension −6.2, sway −7.2, swing −6.5, march2 −4.9, rule −3.4, tourists −7.2, dropout −6.2 dB.

### 5.5 Master limiter (mix.py:131-160) `limiter(x, ceil_db=-1.2, look=0.003, rel=0.08)`
1. 4× upsample (`resample_poly`), abs, max of L/R (linked stereo), max of each group of 4 → per-sample true-peak estimate.
2. Needed gain `min(1, ceiling/peak)`.
3. "Look-ahead": centred minimum filter over `2*La+1` samples (La = 3 ms = 144 samples).
4. Release: one-pole back to 1 with tau 80 ms, only run over clusters of reduced samples (cluster gap = 8×rel = 0.64 s), in a Python loop.
5. Centred moving average over `2*La+1`, clipped ≤ 1.
6. Returns `(x*gain, gain)`.

### 5.6 `main()` (mix.py:206-281)
1. Load words, spans, voice; `v_ref = integrated(v)`; log voice LUFS and true peak.
2. `music.build()` (always runs), then `m_raw = cached("music_raw", render)`.
3. Duck: `m_d = m_raw * dbg(duck)`. Section curve: `m = m_d * dbg(sec_curve)`. 30 ms linear fade at the very end.
4. SFX: `s_st = cached("sfx", sfx.render(v_ref))`. On a cache hit the cue list is rebuilt with `sfx.cues()` and `measured = None`.
5. Master: `mix0 = v + m + s_st`; `G = -15 - lufs(mix0)`; up to 5 passes of `limiter(mix0*G)` → measure → `G += -15 - L` until within 0.02 LU.
6. 30 ms fade-out; `assert y.shape == (2, N)`.
7. Write `mix.wav`, `stem_voice.wav`, `stem_music.wav`, `stem_sfx.wav` (24-bit, 48 kHz, stereo) to `HERE`. Stems are at gain G but BEFORE the limiter (they sum to the pre-limiter mix).
8. Measure: integrated, true peak, LRA, max momentary, max short-term, limiter stats (max GR, % samples > 0.1 dB and > 0.5 dB), stem peaks, per-section table (`section_table`), `ffmpeg_ebur()` cross-check.
9. `write_cues()` → `HERE/cues.md`.

### 5.7 Report helpers
- `section_table(v, m, s, words)` (mix.py:169): per REPORT row: voice / music / sfx / bed (= music + sfx) integrated LUFS, margin (voice − bed), and the median and 10th percentile of the momentary (400 ms) margin over windows centred on spoken words (word ±30 ms, and voice momentary > voice integrated − 10).
- `ffmpeg_ebur(path)` (mix.py:187): runs `ffmpeg -hide_banner -nostats -i mix.wav -af ebur128=peak=true -f null -`, returns the "Summary:" block (timeout 300 s; any failure becomes a text message, so ffmpeg is optional).
- `write_cues(...)` (mix.py:284-350): writes the Markdown cue sheet: files, master loudness, ffmpeg check, per-section table, music map (`b.cues` with frame numbers), and the full SFX event table (`naive`, `applied`, measured mix LUFS, pan).

### 5.8 Bridge results (from the real cues.md)
- Master: **−15.0 LUFS integrated, −1.2 dBTP, LRA 2.6 LU**, max momentary −9.0, max short-term −12.5. ffmpeg agrees (I −15.0, TP −1.2, LRA 2.6, LRA low −16.2 / high −13.6).
- Stems: voice −15.4, music −25.8, sfx −29.1 LUFS. Voice gain +1.20 dB.
- Limiter: max GR 1.45 dB; active (> 0.1 dB) on 3.53 % of samples, > 0.5 dB on 0.63 %.
- Voice-over-bed margins per section: 8.2-11.6 LU (water section 18.1 because there is no music). Speech p10 margins are low in hook (0.7), rule (1.1), tourists (1.0): a few 400 ms windows have the bed almost as loud as the voice.

### 5.9 Export format
`mix.wav` = PCM WAV, 48,000 Hz, 2 channels, 24-bit, exactly 3,240,000 frames (67.500 s). Then (SKILL.md:77) it is muxed onto the Remotion video with ffmpeg `-map 0:v:0 -map 1:a:0` (Remotion writes a silent audio track of its own).

---

## 6. Dependencies and how to run

- Python 3 (no version pin), `numpy`, `scipy` (`signal`, `ndimage`). Standard library: `wave`, `json`, `subprocess`, `os`, `time`, `math`.
- `ffmpeg` on PATH (optional; only the loudness cross-check). README.md:23 lists "Node, Python 3 and ffmpeg".
- Other repo files needed at run time: `sfx.py` and `sfx_gen.py` (same folder). All imports are plain `import dsp`, `import timeline as T` etc., so the 7 files must sit in one folder.
- Expected layout (SKILL.md:42-44, 67):
  ```
  <project>/voice/voice.wav      48 kHz PCM int WAV (16/24/32-bit), mono or stereo
  <project>/voice/words.json     [{"s": start_s, "e": end_s, ...}, ...]  (hand-fixed word times)
  <project>/audio/dsp.py instruments.py music.py mix.py timeline.py sfx.py sfx_gen.py
  ```
- Run: `python <project>/audio/mix.py` (the script folder is put on `sys.path` automatically). Do **not** use `python -I` (isolated mode removes the script folder from `sys.path`, so `import dsp` fails).
- Outputs in `<project>/audio/`: `mix.wav`, `stem_voice.wav`, `stem_music.wav`, `stem_sfx.wav`, `cues.md`, `_cache/music_raw.npy`, `_cache/sfx.npy`.
- **Delete `<project>/audio/_cache/` after ANY change** to music.py, instruments.py, sfx.py, sfx_gen.py, timeline.py or dsp.py. The cache has no version check.
- Run time is not stated in the repo. Heavy parts are pure-Python loops (whistle amplitude follower, limiter release, duck follower) and thousands of additive notes; expect minutes, not seconds.

---

## Bugs / contradictions

1. **Stale cache, silently.** `cached()` (mix.py:48-56) loads `_cache/music_raw.npy` / `_cache/sfx.npy` if they exist, with no hash of the code or inputs. Edit the score or SFX and re-run → you get the OLD music/SFX. Must delete `_cache/` by hand.
2. **The music cache does not save the expensive part.** `music.build()` (mix.py:216) runs before the cache check and synthesizes every note; only `render()` (normalise + 2 convolutions) is cached. The header claim "a crash never costs a full re-render" (mix.py:5) is only true for SFX.
3. **On an SFX cache hit, cues.md shows planned levels as if measured.** mix.py:239-242 sets `measured = None`, and write_cues (mix.py:347) then prints `applied` in the "mix LUFS" column.
4. **A section with no narration would mute its music.** `section_db` (mix.py:105-106) checks `isfinite(Lm)` but not `Lv`; if the voice is silent in a section, `Lv = -inf` → gain −inf → music = 0 there, and the 0.4 s smoothing spreads −inf into neighbours. Any instrumental bar (intro, outro, a pause) needs a fixed level instead.
5. **Section names are hard-wired in mix.py.** `"dropout"` is special-cased and copies `gains["tension"]` (mix.py:102-107); the sway switch time 43.1 and the hard-switch list `(T.FLASH, 43.1)` are literal (mix.py:115, 120). Any new `SECTIONS` name not in `MUSIC_TARGET` → `KeyError`. Renaming "tension" breaks the dropout line.
6. **cues.md text is partly hard-coded, not computed.** mix.py:288 title "The Bridge That Fell for a Song"; mix.py:296 "3,240,000 samples = 67.500 s"; mix.py:323 "Bb major, 120 bpm"; mix.py:330 "The hook's last two footfalls (3.5, 4.0) ...". These will be wrong for any other video.
7. **timeline.py camera keys are approximations and partly out of date vs story.ts.**
   - `COLUMN_CAM` uses move centres with short eases (e.g. shot 1 `(48, 9, 6.7)`, `(88, 9, 4.3)`), while story.ts has 37 f and 32 f moves starting at frames 30 and 72; shots 3/4/6 hard cuts (283, 444, 497, 717) are modelled as 12-14 frame glides. So distance-based gain/low-pass glides for ~0.4 s after some cuts instead of switching on the cut.
   - `tourist_cam` uses keys 1905 (10 f ease) and 1962 (24 f ease straight to `[17, 15, -44]`), but story.ts:257-259 now has `{f:1890, dur:30}` and `{f:1932, cut:true}` with a 93-frame Bezier crane that only reaches `[17, 15, -44]` at frame 2025. Tourist footsteps therefore get quiet/dull ~1.3 s earlier than the picture suggests.
8. **whistle(): comment vs code.** instruments.py:143 says "fill pitch through rests with the last pitch", but `np.interp` (instruments.py:144-145) draws a straight line between the previous and next note. Mostly inaudible (amplitude is ~0 in the rest), but release tails bend toward the next pitch.
9. **Dead or misleading parameters/code** (harmless, but confusing when adapting): `Band.add(..., send=0.15)` is ignored because all tracks are pre-created in `build()` (music.py:73-81, 174-177); `late = {}` unused (music.py:271); `widen(x, r, ...)` never uses `r` (dsp.py:205); `_env(..., rel, ...)` never uses `rel` (instruments.py:14); `brass(fall=...)` positive values bend UP, not down (instruments.py:34-35); the else branch at instruments.py:136 is a no-op; `import sys` unused (mix.py:7); `music.render` returns `levels` that mix.py drops (mix.py:219-220).
10. **Global RNG order dependence.** `R = rng(1831)` (music.py:84) feeds `_r()` and `snare_bar`'s random velocity/timing. Inserting, removing or reordering ANY call in `build()` changes the random detail of everything after it. `build()` is also only reproducible once per process (a second call continues the RNG).
11. **TARGET normalisation side effect.** Each music track is set to one integrated loudness over the whole 67.5 s (music.py:376-381). Adding a loud passage to a track in one section makes that track quieter in all other sections. Velocities are relative, never absolute.
12. **Pan law mismatch.** `dsp.pan` gives +3 dB to a hard-panned channel (×√2); `instruments.pad` uses cos/sin without √2 (centre voice at 0.707). Not wrong, but levels of panned material differ by method.
13. **Comment vs sections.** music.py:231 labels the whistle block "22.25 - 29.7", but `SECTIONS` puts "whistle" at 21.0-27.43 and "tension" from 27.43, so the last 2 s of whistling are levelled with the "tension" target. Intentional (sections = shots), but easy to misread.
14. **Hook button level.** The button at FLASH sits in the "town" section, whose gain (−3.2 dB) is 4.4 dB higher than the hook's (−7.6 dB), because town's level is computed from the quiet light march. The button can therefore sound louder than the hook band. Check by ear when re-using.
15. `timeline.words()` opens the file without closing it (timeline.py:169). Minor.
16. Low speech p10 margins in hook / rule / tourists (cues.md:37, 48, 49: 0.7 / 1.1 / 1.0 LU): in some 400 ms windows the bed is almost as loud as the voice. A known weak spot of this mix, not a code bug.

---

## Hard-coded paths & versions

- `SR = 48000` everywhere (dsp.py:9); the K-weighting coefficients (dsp.py:249-252) are the 48 kHz set, so the loudness meter is wrong at any other rate. `load_voice` asserts 48 kHz (mix.py:62): TTS output at 44.1/24 kHz must be resampled first (e.g. `ffmpeg -i in.wav -ar 48000 -c:a pcm_s24le voice.wav`). Float WAV is not readable (dsp.py:318-331).
- Folder layout: `ROOT = dirname(HERE)`, `ROOT/voice/voice.wav`, `ROOT/voice/words.json`, outputs into `HERE` (mix.py:16-18, 61, 208, 259-262, 350). In the repo the files sit in `templates/audio/`, so running them in place would look for `templates/voice/` (not present). Copy to `<project>/audio/` first.
- SKILL.md:67 names `~/bridge-short/audio/` (a POSIX home path). On this machine that folder is `an older unrelated project folder`, which Codex is using: a new story must get its own new project folder.
- timeline.py:1 refers to "your Remotion project/src/videos/bridge/story.ts + cast.ts" (placeholder text). The mirror is manual.
- `ffmpeg` called by bare name (mix.py:189): must be on PATH (Windows: `ffmpeg.exe`); failure is tolerated.
- No version pins for Python, numpy or scipy anywhere. APIs used (`default_rng`, `sosfilt`, `sosfiltfilt`, `stft/istft(boundary=...)`, `resample_poly`, `fftconvolve`, `ndimage.uniform_filter1d / minimum_filter1d`) need numpy ≥ 1.17 and a modern scipy (≥ 1.2 or so).
- Seeds: music `rng(1831)`; whistle choruses 11 / 22 / 54; music IRs 7 (hall), 8 (yard); SFX `rng(1831)` + valley IR seed 77 (sfx.py:27, 343).
- Exact-length assumptions: `N = ns(T.DUR)` in music.py:12, mix.py:19, sfx.py:12; `assert y.shape == (2, N)` (mix.py:257).
- Story-specific literal times in music.py: 4.5, 4.96, 5.0, 9.0, 15.0, 20.5, 21.0, 22.25 (pickup), 23.0, 23.75-24.75, 29.0, 29.22-29.5, 31.0-32.5, 32.985, 43.3-47.4, 47.1-54.05, 53.62, 54.0, 57.6, 58.85-61.67, 62.0, 66.0-67.3; in mix.py: DIPS, 43.1, MUSIC_TARGET keys.

---

## What to change for a new story

Rule from SKILL.md:70: **lock the picture first** (story.ts / cast.ts time constants), then make the sound. Any later picture change = edit timeline.py + re-run with an empty `_cache/`.

### A. Files and folders
1. Make a NEW project folder (not `bridge-short`): `<new>/voice/voice.wav` (48 kHz PCM) + `<new>/voice/words.json` (`s`/`e` per word, hand-fixed), and copy the 7 audio files to `<new>/audio/`.
2. Delete `<new>/audio/_cache/` before every run after a code change.

### B. timeline.py (rewrite almost all of it)
- `TOTAL` (frames) → `DUR`; keep `FPS = 30` unless the composition changes.
- Replace bridge events (`SNAP`, `DROP0/1`, `HITS`, `SWING_T`, `PUSH0`, `TOURIST_T0`, `FLASH`) with the new story's event times, copied from the new story.ts / cast.ts.
- Replace `SHOTS`, `XFADE`, `tau_of` (flash-forward offsets), `AMP` / `STOMP` (or delete them if nothing bounces), `COLUMN_CAM` (camera distance to the main sound source per shot; better: copy the real key frames and use dur 0 for cuts), `footfalls()` / `tourist_steps()` / `tourist_cam()` / `swing_amp_deg()` (story-specific motion → sound triggers).
- Keep: `fr`, `shot_t`, `shot_at`, `hh`, `easeout`, `dist_fx`, `words`.

### C. music.py (the score)
- **Tempo** `Q`: pick the beat from the picture's main rhythm (bridge: footfall 0.5 s = 120 bpm; sway 0.7 Hz = 84 bpm; swing 1.55 s per bar = 116 bpm 3/4). Put bar lines on the big story beats (the bridge put bars on odd seconds so the stop lands on "Then," at 33.0).
- **Key and theme**: new `THEME` (bar, beat, quarters, MIDI), `PICKUP3`, `CHB`, and `CH` voicings. Keep melodies in the whistle range (~MIDI 70-89) if whistling is used.
- **Sections**: new `SECTIONS` list (name, start, end) aligned to shots; rewrite `build()` block by block. Reusable devices from the bridge:
  - tutti hook that is cut on the white flash, with a short "button" chord exactly on the flash;
  - light → full band growth as the action escalates; accompaniment change when the physics changes (tuba octave bounce);
  - a vamp bar to leave room for a key line;
  - characters' own diegetic tune (whistling chorus with joins and falters);
  - dominant pedal + chromatic climb + snare roll + **dead stop** one beat before the disaster, then silence through the punchline;
  - warm pad + vibes locked to a natural frequency for the explanation; a waltz locked to the analogy's rhythm;
  - brass stabs + timpani on on-screen impacts (I-V-I);
  - a relaxed swung variation of the theme for the callback ending, ending on the last word.
- **Mood palettes** (built from the existing instruments):
  - comedic / military: `brass` tuba + horn after-beats, `snare`, `fife`, `glock`, `cymbal` (current).
  - wonder / science: `musicbox`, `glock`, `vibes`, `pad`, `triangle`, slow tempo.
  - mystery / spooky: `pad` (low `warm`, more `detune`), `vibes` with long damp, `timpani` rolls, minor key (e.g. D minor), `pluck` low bass.
  - sad / reflective: `pad`, `brass(kind="soft")`, slow `pluck`, sparse `vibes`.
  - lazy / ending: swung `theme(swing=True, late=0.025)`, walking `pluck` bass, `brush`.
- **Balance** `TARGET` (LU per track) and reverbs in `render()` (`hall` 1.5 s, `yard` 0.9 s with early echoes): pick rooms to fit the world (shorter/drier for indoors, longer for valleys/halls).
- Change the seed `rng(1831)` if you want a fresh random feel.

### D. mix.py
- `MUSIC_TARGET`: one key per new section name (LU under the voice; user standard ≈ −10, softer −11.5 to −12 for calm explanation parts).
- Remove/replace the bridge special cases: `"dropout"` → `"tension"` copy, the 43.1 sway switch, the `(T.FLASH, 43.1)` hard-switch list (use the new silent switch points).
- Handle sections with no narration (give them an absolute music level instead of `Lv + target`).
- `DIPS`: re-derive from the new words.json: quiet sentence-final words that get covered (usually 2-4 rides of −2 to −4 dB).
- `REPORT`: the new shot list.
- `write_cues()`: replace the hard-coded title, length text, key/tempo text and the hook footnote.
- Keep: `TARGET_LUFS = -15.0` (or −14 to match YouTube's playback reference; my note, not in the repo), `CEIL_DBTP = -1.2`, `DUCK_DB = -3.0`, the limiter, the voice "gain only" rule, 24-bit 48 kHz output.

### E. sfx.py (other slice, but wired to this one)
- `cues()` is entirely bridge events; it reads `T.footfalls()`, `T.column_distance()`, `T.dist_fx()`, `T.stomp()`, `T.amp()`, `T.FLASH`, `T.SNAP`, `T.DROP0/1`, `T.PUSH0/PUSHES`, `T.swing_amp_deg()`, `T.HITS`, `T.tourist_steps()`, `T.tourist_cam()`, `T.shot_t()`, `T.XFADE`, `T.FPS`, `T.DUR`. Changing timeline.py names means changing sfx.py too. Its level rule stays: events at naive − 6 LU vs the voice (`SFX_DB = -6.0`), beds at their naive level.
