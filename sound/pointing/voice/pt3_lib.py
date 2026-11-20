"""pointing, SCRIPT v3 (LOCKED 2026-11-19): the v3 lines for the voice tools. Source of truth =
sound/pointing/script_v3/voice_lines_v3.json (every line: id, speaker, text, tags, pause_after_s, reuse_v1_take, and
for the 8 reused takes the take path + cut span). Importing this module ADDS the v3 line ids (v3_n01 ...) to
pt_lib.TEXT / SPEAKER, so pt_probe.py and the measurement helpers work on v3 takes. The v1 ids are untouched (in v1
d02 was "Speed... check!"; a v3 id can never be mixed up with it)."""
import json
import re
from difflib import SequenceMatcher

import pt_lib as L

V3_JSON = L.HERE.parent / "script_v3" / "voice_lines_v3.json"
V3 = json.loads(V3_JSON.read_text(encoding="utf-8"))
# the alternate hook's gated FALLBACK first sentence (SCRIPT_v3 section 3: "If no take passes, use the shorter first sentence
# 'He points down an empty track.' with the caption chunks 'He points' / 'down an' / 'empty track.'"): its own id, v3_a01f
_a01 = next(l for l in V3 if l["id"] == "v3_a01")
V3.append({**_a01, "id": "v3_a01f", "text": _a01["fallback_text"], "caption": "He points / down an / empty track.", "note": "the gated fallback of v3_a01"})
BY = {l["id"]: l for l in V3}
WORDLESS = [l["id"] for l in V3 if l.get("wordless")]                       # v3_x01, v3_x02 (laugh / giggle)
FILM = [l["id"] for l in V3 if l.get("in_film") and not l.get("wordless")]  # 26 voiced rows in film order (25 spoken + the phone replay)
SPOKEN = [i for i in FILM if not BY[i].get("from_phone")]                   # the 25 spoken lines
ALT = [l["id"] for l in V3 if not l.get("in_film")]                         # v3_a01, v3_a02 (alternate hook)
TEXT = {l["id"]: l["text"] for l in V3 if not l.get("wordless")}
SPEAKER = {l["id"]: l["speaker"] for l in V3}
L.TEXT.update(TEXT)
L.SPEAKER.update(SPEAKER)

VOICE = {"N": L.JAMES, "D": "2Jg786yPJ6zSdiI0EAAH", "T": "3lqN2QjRfNc5KxYJLLOR", "KID": "bA58y3FqVI6b6gTNh0oT"}
NAME = {"N": "James", "D": "Masaki", "T": "Flackoo", "KID": "Kavya"}

# story sections (the `beat` of phrases.json)
SECTION = {"v3_n01": 1, "v3_n02": 1, "v3_n03": 1, "v3_d01": 2, "v3_t01": 2, "v3_n04": 3, "v3_n05": 3, "v3_n06": 4, "v3_n07": 4,
           "v3_n08": 4, "v3_t02": 4, "v3_d02": 5, "v3_t03": 5, "v3_n09": 6, "v3_t04": 6, "v3_n10": 6, "v3_t05": 7, "v3_t06": 7,
           "v3_n11": 8, "v3_r01": 8, "v3_n12": 9, "v3_n13": 9, "v3_n14": 10, "v3_d03": 11, "v3_k01": 11, "v3_t07": 11,
           "v3_a01": 1, "v3_a01f": 1, "v3_a02": 1}
SECTIONS = {1: "hook: the outcome first", 2: "the call + the doubter", 3: "stakes + what the pointing is for", 4: "first stop: the near miss",
            5: "the door plant + the film's question", 6: "second stop: the bag plant", 7: "the mock call + the look that does not see",
            8: "the turn + the phone's dare", 9: "the test + the number", 10: "the why", 11: "payoff + the loop"}


def caption_markup(lid):
    """the line's caption (voice_lines_v3.json `caption`: 1-3 word chunks split by ' / ') mapped on its spoken words ->
    (markup, chunks). markup = one token per spoken word in display form, '{DISPLAY|spoken words}' where they differ
    (CAPS for character lines, digits for numbers); a spoken word the caption does not show (the 'is' of the first
    sentence) stays in the markup as itself (it is in words.json for the lip-sync / beats; captions.json leaves it out).
    chunks = [(chunk text, [spoken word indices])]."""
    l = BY[lid]
    spoken = l["text"].split()
    cap = re.sub(r"\([^)]*\)", " ", l.get("caption") or l["text"])
    chunks_raw = [c.split() for c in cap.split(" / ")]
    disp = [w for c in chunks_raw for w in c]
    which = [k for k, c in enumerate(chunks_raw) for _ in c]
    n = lambda w: " ".join(L.norm_text(w)) or w.lower()
    a, b = [n(w) for w in spoken], [n(w) for w in disp]
    toks = []          # (display or None, [spoken idx], chunk idx or None)
    for op, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal":
            for q in range(i2 - i1):
                toks.append((disp[j1 + q], [i1 + q], which[j1 + q]))
        elif op == "delete":                      # heard, not shown
            for q in range(i1, i2):
                toks.append((None, [q], None))
        elif op == "replace":                     # "a thousand" -> "1,000", "six" -> "6"
            if i2 - i1 == j2 - j1:
                for q in range(i2 - i1):
                    toks.append((disp[j1 + q], [i1 + q], which[j1 + q]))
            else:
                assert j2 - j1 == 1, (lid, spoken[i1:i2], disp[j1:j2])
                toks.append((disp[j1], list(range(i1, i2)), which[j1]))
        else:
            raise AssertionError((lid, "caption word with no spoken word", disp[j1:j2]))
    mk = []
    for d, idx, _ in toks:
        sp = " ".join(spoken[i] for i in idx)
        mk.append(sp if d is None or d == sp else "{%s|%s}" % (d, sp))
    chunks = []
    for k, c in enumerate(chunks_raw):
        idx = [i for d, ii, ck in toks if ck == k for i in ii]
        chunks.append((" ".join(c), idx))
    return " ".join(mk), chunks


def hidden_words(lid):
    """indices of the spoken words the caption does not show"""
    _, chunks = caption_markup(lid)
    shown = {i for _, idx in chunks for i in idx}
    return [i for i in range(len(BY[lid]["text"].split())) if i not in shown]


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    print(len(FILM), "voiced rows,", len(SPOKEN), "spoken lines,", sum(len(TEXT[i].split()) for i in SPOKEN), "words")
    for i in FILM + ALT:
        mk, ch = caption_markup(i)
        print(f"{i} {SPEAKER[i]:3s} {mk}   ||  " + " / ".join(c for c, _ in ch) + (f"   HIDDEN {hidden_words(i)}" if hidden_words(i) else ""))
