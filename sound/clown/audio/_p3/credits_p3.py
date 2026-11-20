# p3: append the polish round's ElevenLabs generations (and the rejected ones) to CREDITS.txt, from _el/credits_p3.json.
# Runs once (skips if the p3 block is already there). The account's key is never read here.
import json
import os

AUD = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(AUD, "CREDITS.txt")
LOG = json.load(open(os.path.join(AUD, "_el", "credits_p3.json"), encoding="utf-8"))
REJ = set(json.load(open(os.path.join(AUD, "samples_reject.json"), encoding="utf-8"))["reject"])
txt = open(P, encoding="utf-8").read()
MARK = "SOUND p3 (polish round 2)"
if MARK not in txt:
    tail = "\nEverything else (the bed's fallback layers, the score) is synthesized in this repo's own code."
    body = txt.rstrip("\n")
    if body.endswith(tail.strip()):
        body = body[: -len(tail.strip())].rstrip("\n")
    lines = [f"", f"{MARK}: ElevenLabs Sound Effects generations made for this film by el_batch_p3.py "
             f"(account counter {LOG['_start']} -> {LOG['_last']}: {LOG['_last'] - LOG['_start']} credits)."]
    for k, v in LOG.items():
        if k.startswith("_"):
            continue
        st = "NOT USED (failed its measurement, in samples_reject.json)" if k in REJ else "used"
        lines.append(f"- {k}.wav | ElevenLabs Sound Effects | prompt: \"{v['prompt']}\" | {v['seconds']} s | {st}")
    lines += ["Synthesized in this repo for p3 (sfx.py): the juggling pats, the '?' / '!' pops (the '!' over a CC0 pop), the twinkles, "
              "the light-bulb ping (a CC0 click + glockenspiel), the two-note whistle, the dust puff, the jogger (recorded hard-sole steps).", "",
              tail.strip()]
    open(P, "w", encoding="utf-8").write(body + "\n" + "\n".join(lines) + "\n")
    print("CREDITS.txt: p3 block added")
else:
    print("CREDITS.txt: p3 block already there")
