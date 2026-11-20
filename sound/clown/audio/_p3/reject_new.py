# p3: add the new takes that failed their measurement (_p3/measure_new.txt) to samples_reject.json (samples.py never plays them)
import json
import os

P = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples_reject.json")
R = json.load(open(P, encoding="utf-8"))
NEW = {"pigeon_settle_1": "p3 measure: a sub-bass thump (top edge 1.0 kHz, 0.5-6 kHz share -25 dB): not a wing flutter",
       "juggle_1": "p3 measure: sub-bass thumps (top edge 394 Hz, 0.5-6 kHz share -32 dB): not a hand catch",
       "idea_ping_1": "p3 measure: near-silent file (peak -44.9 dBFS): no real event, poor signal-to-noise"}
for k, why in NEW.items():
    if k not in R["reject"]:
        R["reject"].append(k)
    R.setdefault("why", {})[k] = [why]
json.dump(R, open(P, "w", encoding="utf-8"), indent=1)
print("reject list:", len(R["reject"]), "takes")
