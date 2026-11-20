# p3 VERIFY (read-only, nothing is played): measures the written mix + stems against the p3 brief (FIX2 D11 + the p2 sound
# audit) and writes _p3/verify_p3.json + prints a table.  usage (repo root):
#   PYTHONNOUSERSITE=1 PYTHONIOENCODING=utf-8 tools/.venv/Scripts/python.exe -s sound/clown/audio/_p3/verify_p3.py
import glob
import json
import os
import sys
import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
AUD = os.path.dirname(HERE)
sys.path.insert(0, AUD)
from dsp import SR, ns, read_wav, integrated, short_term, momentary_max, kfilt  # noqa: E402
import timeline as T  # noqa: E402
import sfx  # noqa: E402

FPS = T.FPS
OUT = {}


def rd(n):
    x, sr = read_wav(os.path.join(AUD, n))
    assert sr == SR
    return x


mix, v, mu, fx, amb = (rd(n) for n in ("mix.wav", "stem_voice.wav", "stem_music.wav", "stem_sfx.wav", "stem_amb.wav"))
N = mix.shape[1]
R = json.load(open(os.path.join(AUD, "mix_report.json"), encoding="utf-8"))
J = json.load(open(sorted(glob.glob(os.path.join(AUD, "_cache", "v2_cues_*.json")), key=os.path.getmtime)[-1], encoding="utf-8"))
CUES = J["cues"]
f2s = lambda f: f / FPS
db = lambda p: 10 * np.log10(p + 1e-20)


def L(x, a, z):
    """integrated loudness (LUFS) of x over a..z s (short spans padded with silence: a gated 'momentary-like' read)"""
    seg = x[:, max(0, ns(a)):min(N, ns(z))]
    if seg.shape[1] < ns(0.4):
        seg = np.concatenate([seg, np.zeros((2, ns(0.4) - seg.shape[1]))], axis=1)
    v_ = integrated(seg)
    return float(v_) if np.isfinite(v_) else -99.0


def peak_db(x, a, z):
    seg = x[:, max(0, ns(a)):min(N, ns(z))]
    return float(20 * np.log10(np.max(np.abs(seg)) + 1e-12)) if seg.size else -240.0


def rms_db(x, a, z):
    seg = x[:, max(0, ns(a)):min(N, ns(z))]
    return float(db(np.mean(seg ** 2))) if seg.size else -240.0


EDGES = 1000.0 * 2.0 ** (np.arange(-12, 13) / 3.0)          # 1/3-octave centres 63 Hz .. 16 kHz


def bands(m):
    w = np.hanning(len(m))
    X = np.abs(np.fft.rfft(m * w)) ** 2
    f = np.fft.rfftfreq(len(m), 1 / SR)
    return np.array([X[(f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))].sum() for c in EDGES])


def best_band(t, dur=0.25, lo=250.0, hi=8000.0, pre=0.005):
    """the event's best 1/3-octave band against everything else (voice + score + bed) over [t - pre, t + dur]: dB, Hz"""
    a, z = max(0, ns(t - pre)), min(N, ns(t + dur))
    e = bands(fx[:, a:z].mean(0))
    r = bands((v + mu + amb)[:, a:z].mean(0))
    k = (EDGES >= lo) & (EDGES <= hi)
    mg = db(e[k]) - db(r[k])
    j = int(np.argmax(mg))
    return float(mg[j]), float(EDGES[k][j])


def cue(name, near_f=None, tol=4):
    cs = [c for c in CUES if c["name"] == name and (near_f is None or abs(c["frame"] - near_f) <= tol)]
    return cs[0] if cs else None


# ---------------------------------------------------------------- 1. the hook: the frame-0 honk + the count
q_on = float(T.word("quick")["s"])
v_ref = integrated(v)
h = cue("honk", 0, 1)
OUT["open_honk"] = dict(set_LU=h["level"] if h else None, measured_LU=h["measured"] if h else None, files=h["files"] if h else None,
                        sfx_peak_0_to_quick_dBFS=peak_db(fx, 0, q_on), sfx_peak_after_quick_30ms_dBFS=peak_db(fx, q_on, q_on + 0.03),
                        sfx_first_10ms_peak=peak_db(fx, 0, 0.01), quick_s=q_on,
                        honk_K_level_re_voice_LU=L(fx, 0, q_on) - float(v_ref),
                        honk_vs_voice_around_it_dB=peak_db(fx, 0, q_on) - peak_db(v, q_on, q_on + 0.4))
spans = [(a + 0.02, b - 0.05) for a, b in T.SILENCES if b - a > 2.0 and 0.5 < a < 10.0]
st = short_term(mix)
st_t = np.arange(len(st)) * 0.1 + 3.0                        # dsp.short_term: 3 s windows, 0.1 s hop (window END times)
OUT["count"] = dict(spans=spans, mix_LUFS=[L(mix, a, z) for a, z in spans], score_LUFS=[L(mu, a, z) for a, z in spans],
                    sfx_LUFS=[L(fx, a, z) for a, z in spans], bed_LUFS=[L(amb, a, z) for a, z in spans],
                    short_term_min_first_10s=float(np.min(st[st_t <= 10.0])) if np.any(st_t <= 10.0) else None,
                    short_term_min_whole=float(np.min(st)), short_term_max_whole=float(np.max(st)))
P2 = os.path.join(HERE, "mix_report_p2.json")

# ---------------------------------------------------------------- 2. S1's honks + bell, the featured steps, pigeons, rumble
OUT["s1"] = []
for nm, f in (("honk", 452), ("honk", 462), ("bell_ring", 490), ("honk", 498), ("unicycle_brake", 504)):
    c = cue(nm, f)
    if c:
        bb = best_band(f2s(c["frame"]), 0.25)
        OUT["s1"].append(dict(name=nm, frame=c["frame"], set_LU=c["level"], measured_LU=c["measured"], best_band_dB=bb[0], at_Hz=bb[1]))
steps = [c for c in CUES if c["cls"] == "step" and c["name"] == "step"]
by = {}
for c in steps:
    bb = best_band(f2s(c["frame"]), 0.12)
    by.setdefault((c["shot"], c["walker"]), []).append(bb[0])
OUT["steps_best_band_median_dB"] = {f"{k[0]} {k[1]}": round(float(np.median(x)), 1) for k, x in sorted(by.items(), key=lambda kv: kv[0])}
OUT["pigeons"] = []
for c in CUES:
    if c["cls"] == "pigeon":
        bb = best_band(f2s(c["frame"]), 0.3)
        OUT["pigeons"].append(dict(name=c["name"], frame=c["frame"], files=c["files"], measured_LU=c["measured"], best_band_dB=bb[0], at_Hz=bb[1]))
m_fx = fx.mean(0)
Xf = np.abs(np.fft.rfft(m_fx)) ** 2
ff = np.fft.rfftfreq(len(m_fx), 1 / SR)
OUT["sfx_energy_share_under_90Hz_pct"] = float(Xf[ff < 90].sum() / Xf.sum() * 100)
del Xf, ff, m_fx

# ---------------------------------------------------------------- 3. density per shot (events, steps) and S8-S9
dens = []
for s in T.SHOTS.values():
    a, b = s["a"], s["b"]
    ev = [c for c in CUES if a <= c["frame"] < b and c["kind"] == "sync" and c["cls"] != "step"]
    stp = [c for c in CUES if a <= c["frame"] < b and c["cls"] == "step"]
    dens.append(dict(shot=s["key"], seconds=round((b - a) / FPS, 2), events=len(ev), steps=len(stp), events_per_s=round(len(ev) / ((b - a) / FPS), 2)))
OUT["density"] = dens
fr_ev = sorted(c["frame"] for c in CUES if c["kind"] in ("sync", "long"))
gaps = [(x, y) for x, y in zip(fr_ev, fr_ev[1:]) if y - x > 150]
OUT["longest_gaps_without_a_cue_f"] = sorted([(int(x), int(y), round((y - x) / FPS, 2)) for x, y in gaps], key=lambda g: -g[2])[:5]

# ---------------------------------------------------------------- 4. sync: the E1 pips, the ding, the chip, the 'suit' hit
syn = {r["pe"]: r for r in R["sync"]}
pops = sfx.e1_pops()
OUT["e1_pips"] = [dict(pop=p, cue=[r["frame"] for r in R["sync"] if r["name"] == "count_pip" and abs(r["frame"] - p) < 3], err=[r["err"] for r in R["sync"] if r["name"] == "count_pip" and abs(r["frame"] - p) < 3]) for p in pops]
for nm in ("five_ding", "chip_flip", "chip_in", "freeze_hit", "ring_glint", "tape_rewind", "tape_rewind_on"):
    rr = [r for r in R["sync"] if r["name"] == nm]
    OUT[f"sync_{nm}"] = [dict(frame=r["frame"], err=r["err"], mode=r["mode"]) for r in rr]
bag = None
try:
    import music
    bag = music.bag_open_t()
except Exception:  # noqa
    pass
# the score's comic hit: the strongest onset of the score stem within 0.35 s of the bag opening
if bag:
    # the hit's onset: the first 5 ms block after bag - 0.1 s whose RMS is 6 dB over the median of the 150 ms before it
    a = ns(bag - 0.25)
    m_ = mu[:, a:ns(bag + 0.4)].mean(0)
    hop = ns(0.005)
    lv = np.array([db(np.mean(m_[i:i + hop] ** 2)) for i in range(0, len(m_) - hop, hop)])
    tb = (a + np.arange(len(lv)) * hop) / SR
    pre = float(np.median(lv[(tb >= bag - 0.25) & (tb < bag - 0.1)]))
    k = int(np.argmax((tb >= bag - 0.1) & (lv >= pre + 6.0)))
    # the hit's own attack, read on the RAW score (music_v2.wav: the stem's 1-4 kHz dips under the student's "clown" blur it):
    # the first 5 ms block from bag - 0.05 s that is 5 dB over the block before it
    raw = rd("music_v2.wav")[:, a:ns(bag + 0.4)].mean(0)
    lv = np.array([db(np.mean(raw[i:i + hop] ** 2)) for i in range(0, len(raw) - hop, hop)])
    jw = np.flatnonzero((tb[1:] >= bag - 0.05) & (lv[1:] - lv[:-1] >= 5.0)) + 1
    j = int(jw[0]) if len(jw) else k
    OUT["suit_hit"] = dict(bag_open_s=bag, bag_open_f=bag * FPS, first_rise_s=float(tb[k]), first_rise_f=float(tb[k] * FPS), pre_level_dBFS=pre,
                           attack_s=float(tb[j]), attack_f=float(tb[j] * FPS), attack_jump_dB=float(lv[j] - lv[j - 1]), level_after_attack_dBFS=float(np.max(lv[j:j + 4])),
                           word_suit_s=float(T.word("suit", 24.0)["s"]))

# ---------------------------------------------------------------- 5. the mind-blow line and the hush before it
mh = sfx.mind_hush()
n17 = [p for p in json.load(open(os.path.join(T.ROOT, "voice", "phrases.json"), encoding="utf-8")) if p["id"] in ("n14", "n16", "n17", "n18")]
P = {p["id"]: (float(p["s"]), float(p["e"])) for p in n17}
money_end = float(T.word("money", T.bt("stoppedFor") - 0.1)["e"])
OUT["mindblow"] = dict(hush=mh, score_rms_in_hush_dBFS=rms_db(mu, money_end + 0.06, P["n17"][0] - 0.02), score_peak_in_hush_dBFS=peak_db(mu, money_end + 0.08, P["n17"][0] - 0.02),
                       sfx_peak_in_hush_dBFS=peak_db(fx, mh[0] + 0.03, mh[1]) if mh else None, mix_rms_in_hush_dBFS=rms_db(mix, mh[0] + 0.03, mh[1]) if mh else None,
                       score_LUFS_under_line=L(mu, *P["n17"]), score_LUFS_money_section=L(mu, P["n14"][0], money_end),
                       voice_LUFS_under_line=L(v, *P["n17"]), air_after_line_s=P["n18"][0] - P["n17"][1], air_before_line_s=P["n17"][0] - money_end)
OUT["mindblow"]["score_under_line_re_money_LU"] = OUT["mindblow"]["score_LUFS_under_line"] - OUT["mindblow"]["score_LUFS_money_section"]

# ---------------------------------------------------------------- 6. E3
rw = sfx.e3_rewind()
mq = sfx.money_q()
cut_s, h0, h1 = f2s(rw["a"]), f2s(rw["a"] + rw["r1"]), f2s(rw["a"] + rw["r1"] + rw["hold"])
OUT["e3"] = dict(cut_s=cut_s, hold=[h0, h1], ring_full_s=f2s(rw["ring_full"]), money_q=mq,
                 voice_peak_cut_to_did_dBFS=peak_db(v, cut_s, float(T.word("did", 71.0)["s"]) - 0.01),
                 score_rms_rewind1_dBFS=rms_db(mu, cut_s, h0), sfx_rms_rewind1_dBFS=rms_db(fx, cut_s, h0),
                 sfx_peak_over_money_dBFS=peak_db(fx, mq[0], mq[1]), bed_peak_over_money_dBFS=peak_db(amb, mq[0], mq[1]),
                 score_LUFS_over_money=L(mu, mq[0], mq[1]), voice_LUFS_money=L(v, mq[0], mq[1]),
                 sfx_peak_hold_after_money_dBFS=peak_db(fx, mq[1], h1 - 0.005), sfx_rms_rewind2_dBFS=rms_db(fx, h1, T.DUR),
                 last_3ms_peak_mix=peak_db(mix, T.DUR - 0.003, T.DUR), last_sample=[float(x) for x in mix[:, -1]], first_sample=[float(x) for x in mix[:, 0]],
                 seam_jump=float(np.max(np.abs(mix[:, 0] - mix[:, -1]))))
OUT["e3"]["freeze_peak_dBFS"] = peak_db(fx, h0 - 0.005, h0 + 0.2)
OUT["e3"]["glint_peak_dBFS"] = peak_db(fx, f2s(rw["ring_full"]) - 0.005, mq[0])
# the score: stops dead after "money." (S19), the hush before "Did you" (E2 -> E3)
OUT["score_marks"] = dict(after_money_rms_dBFS=rms_db(mu, money_end + 0.12, P["n17"][0] - 0.02),
                          hush_clown_to_cut_rms_dBFS=rms_db(mu, float(T.word("clown", 70.9)["e"]) + 0.06, cut_s - 0.002),
                          rewind_starts_on_cut=rms_db(mu, cut_s + 0.01, cut_s + 0.2))

# ---------------------------------------------------------------- 7. the master + the report's checks
OUT["master"] = dict(I=R["I"], TP=R["TP"], LRA=R["LRA"], frames=R["frames"], samples=R["samples"], mono_loss=R["mono_loss"],
                     margin_min=R["margin_min"], margin_narr=R["margin_narr"], margin_char=R["margin_char"], sync=R["sync_summary"],
                     stems=dict(voice=R["voice"], music=R["music"], sfx=R["sfx"], amb=R["amb"]), phone_loss=R["phone_loss"])
OUT["quiz"] = [dict(duck=q["duck"], rest_peak=q["rest_peak"], ok=[(c["name"], round(c["frame"]), round(c["pan"], 2)) for c in q["ok_cues"]],
                    ok_balance=q["ok_balance"], bed_pct=q["ranks"]["bed"]["pct"], music_level=q["ranks"]["music"]["k_level"],
                    music_2b=[q["ranks"]["music"].get("two_beats_before"), q["ranks"]["music"].get("two_beats_after")]) for q in R["quiz"]]
low = sorted(R["words"], key=lambda w: w["margin"])[:10]
OUT["lowest_words"] = [(w["w"], round(w["s"], 2), round(w["margin"], 1)) for w in low]
json.dump(OUT, open(os.path.join(HERE, os.environ.get("VERIFY_OUT", "verify_p3.json")), "w", encoding="utf-8"), indent=1, default=float)
print(json.dumps(OUT, indent=1, default=float)[:20000])
