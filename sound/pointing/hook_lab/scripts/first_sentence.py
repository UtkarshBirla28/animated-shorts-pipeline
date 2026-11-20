"""First sentence per video: words, word count, end time (word times when present, else a char-proportional
estimate inside the segment). Writes data/first_sentences.json. Light, text only."""
import json
import re
from pathlib import Path

his = json.loads(Path("data/his_first_lines.json").read_text(encoding="utf-8"))
ours = json.loads(Path("data/ours_first_lines.json").read_text(encoding="utf-8"))


def first_sentence(lines):
    # flatten to (token, start, end) with estimates where word times are missing
    toks = []
    for l in lines:
        if l.get("words"):
            toks += [(w, a, b) for w, a, b in l["words"]]
        else:
            ws = l["text"].split()
            total = sum(len(w) + 1 for w in ws)
            acc = 0
            for w in ws:
                a = l["s"] + (l["e"] - l["s"]) * acc / total
                acc += len(w) + 1
                b = l["s"] + (l["e"] - l["s"]) * acc / total
                toks.append((w, round(a, 2), round(b, 2)))
    out = []
    for w, a, b in toks:
        out.append((w, a, b))
        if re.search(r"[.?!]$", w) and not re.fullmatch(r"\$?\d+\.", w):
            break
    second = []
    rest = toks[len(out):]
    for w, a, b in rest:
        second.append((w, a, b))
        if re.search(r"[.?!]$", w):
            break
    return {"text": " ".join(w for w, _, _ in out), "n_words": len(out), "start": out[0][1], "end": out[-1][2],
            "second_text": " ".join(w for w, _, _ in second),
            "second_end": second[-1][2] if second else None,
            "words_by_3s": sum(1 for w, a, b in toks if a < 3.0),
            "words_by_5s": sum(1 for w, a, b in toks if a < 5.0),
            "max_gap_0_5s": round(max([toks[i + 1][1] - toks[i][2] for i in range(len(toks) - 1)
                                       if toks[i][2] < 5.0] or [0]), 2),
            "timed": "words" if all(l.get("words") for l in lines[:1]) else "segment-estimate"}


res = {}
for s, d in his.items():
    res[s] = first_sentence(d["lines"])
for s, lines in ours.items():
    res[s] = first_sentence(lines)
Path("data/first_sentences.json").write_text(json.dumps(res, indent=1))
for s, r in res.items():
    print(f"{s:<46} {r['n_words']:>2}w end {r['end']:>5.2f} | by3s {r['words_by_3s']:>2} by5s {r['words_by_5s']:>2} "
          f"gap {r['max_gap_0_5s']:.2f} | {r['text'][:80]}")
