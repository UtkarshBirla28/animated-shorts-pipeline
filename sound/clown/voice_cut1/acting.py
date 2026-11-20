"""Per-script acting checks for tools/beat_select2.py (typo). Phrase indices are the global voice_build.P indices.
acting(bn, r, H) -> 0..10, H = helper namespace (st, med, f0_track, rms_db, band, voiced_ratio, DB)."""
import numpy as np

BRISK = {2, 10}           # setting line, crash-and-grab montage
QUESTION_END = {7}        # 'doesn't exist?' ('And the cancel button?' sits mid-beat: acting checks it)
TARGET_ST = {}
HIGH_OK = {8}             # the boss's shout may sit high


def _rise(H, x, a, b):
    """end of the phrase vs its body, semitones (questions should rise)"""
    return H.st(H.med(H.f0_track(x, b - 0.35, b + 0.05)), H.med(H.f0_track(x, a, max(a + 0.1, b - 0.35))))


def _flat(H, x, a, b):
    """p90-p10 pitch range of a phrase in semitones (deadpan = small)"""
    f = H.f0_track(x, a, b)
    return float(H.st(np.percentile(f, 90), np.percentile(f, 10))) if len(f) > 5 else 9.0


def acting(bn, r, H):
    x, ph = r["x"], r["ph"]
    if bn == 5:   # 'He types... 610,000 shares... for one yen.': curious, a dry drop on 'one yen' (not louder)
        return 0.5 * H.band(r["rng"], 8, 16, 6) + 0.5 * H.band(r["end_st"], -9, -1, 3)
    if bn == 6:   # deadpan 'Easy mistake.': flat, not loud, falling
        return 0.6 * H.band(_flat(H, x, *ph[9]), 0, 4, 4) + 0.4 * H.band(H.rms_db(x, *ph[9]) - H.DB, -6, 0, 4)
    if bn == 7:   # the mystery question rises (accepted if it cannot: LESSONS 36)
        return 0.6 * H.band(_rise(H, x, *ph[11]), 1, 9, 4) + 0.4 * H.band(r["rng"], 10, 18, 6)
    if bn == 8:   # the boss SHOUTS 'Cancel it!': louder and higher than the narration
        d = H.rms_db(x, *ph[12]) - H.DB
        up = H.st(H.med(H.f0_track(x, *ph[12])), 180.0)
        return 0.5 * H.band(d, 3, 14, 4) + 0.5 * H.band(up, 3, 12, 4)
    if bn in (15, 17):   # deadpan 'Nothing.': VOICED (not whispered), flat, at or a little under the narration level
        i = 14 if bn == 15 else 16
        a, b = ph[i]
        return (0.4 * H.band(_flat(H, x, a, b), 0, 4, 4) + 0.3 * H.band(H.rms_db(x, a, b) - H.DB, -5, 0, 4)
                + 0.3 * H.band(H.voiced_ratio(x, a, b), 0.45, 1.0, 0.35))
    if bn == 16:  # 'Again.': tense, pressing harder (a touch louder / higher than the narration)
        return 0.5 * H.band(H.rms_db(x, *ph[15]) - H.DB, 0, 5, 4) + 0.5 * H.band(H.voiced_ratio(x, *ph[15]), 0.45, 1.0, 0.35)
    if bn == 12:  # 'And the cancel button?' rises, the bug line lands flat
        return 0.6 * H.band(_rise(H, x, *ph[22]), 1, 9, 4) + 0.4 * H.band(_flat(H, x, *ph[23]), 0, 6, 4)
    if bn == 13:  # 'The bill: about forty billion yen.' dry, falling
        return 0.5 * H.band(_flat(H, x, *ph[26]), 0, 6, 4) + 0.5 * H.band(r["rng"], 10, 18, 6)
    return H.band(r["rng"], 10, 18, 6)
