"""Per-script acting checks for tools/beat_select2.py (saladoil). Phrase indices are the global voice_build.P indices.
acting(bn, r, H) -> 0..10, H = helper namespace (st, med, f0_track, rms_db, band, voiced_ratio, DB)."""
import numpy as np

BRISK = {3, 5, 7, 12}     # setting / montage lines: 2.9-4.2 w/s
QUESTION_END = {6}        # the beat itself ends on a question
TARGET_ST = {8: -3}       # the hushed reveal sits a little lower
HIGH_OK = {4}             # the shout may sit high


def _rise(H, x, a, b):
    """end of the phrase vs its body, semitones (questions should rise)"""
    return H.st(H.med(H.f0_track(x, b - 0.35, b + 0.05)), H.med(H.f0_track(x, a, max(a + 0.1, b - 0.35))))


def _flat(H, x, a, b):
    """p90-p10 pitch range of a phrase in semitones (deadpan = small)"""
    f = H.f0_track(x, a, b)
    return float(H.st(np.percentile(f, 90), np.percentile(f, 10))) if len(f) > 10 else 9.0


def acting(bn, r, H):
    x, ph = r["x"], r["ph"]
    if bn == 2 and False:   # (cut list: P4 is out) deadpan 'Or so everyone thought.': flat and not louder than the set-up
        return 0.6 * H.band(_flat(H, x, *ph[4]), 0, 5, 4) + 0.4 * H.band(H.rms_db(x, *ph[4]) - H.rms_db(x, *ph[3]), -5, 1, 4)
    if bn == 4:   # the shout 'Ninety percent full!': louder and higher than 'and shout:'
        d = H.rms_db(x, *ph[8]) - H.rms_db(x, *ph[7])
        up = H.st(H.med(H.f0_track(x, *ph[8])), H.med(H.f0_track(x, *ph[7])))
        return 0.5 * H.band(d, 3, 12, 4) + 0.5 * H.band(up, 3, 10, 4)
    if bn == 5 and False:   # (cut list: P12 is out) deadpan tag 'Somehow, the money kept coming.'
        return 0.6 * H.band(_flat(H, x, *ph[12]), 0, 5, 4) + 0.4 * H.band(H.rms_db(x, *ph[12]) - H.rms_db(x, *ph[11]), -5, 1, 4)
    if bn == 5:   # 2026-11-14: deadpan 'And the inspector, on the ground... believed them.' (flat, not louder than the shout's set-up)
        return 0.6 * H.band(_flat(H, x, *ph[35]), 0, 5, 4) + 0.4 * H.band(r["rng"], 10, 18, 6)
    if bn == 6:   # the mystery question rises
        return H.band(_rise(H, x, *ph[13]), 2, 9, 4)
    if bn == 8:   # hushed reveal: 2-8 dB under the read
        return H.band(H.rms_db(x, ph[17][0], ph[18][1]) - H.DB, -8, -2, 4)
    if bn == 9:   # 'Ever left salad dressing out?' rises
        return H.band(_rise(H, x, *ph[20]), 2, 9, 4)
    if bn == 11:  # 'And the real oil?' rises; 'The hardest-working oil in America.' deadpan
        return 0.5 * H.band(_rise(H, x, *ph[24]), 2, 9, 4) + 0.5 * H.band(_flat(H, x, *ph[27]), 0, 5, 4)
    if bn == 13:  # 'His name?' rises, a lively read around it
        return 0.6 * H.band(_rise(H, x, *ph[31]), 2, 9, 4) + 0.4 * H.band(r["rng"], 10, 18, 6)
    return H.band(r["rng"], 10, 18, 6)
