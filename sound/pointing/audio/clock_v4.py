# THE v4 CLOCK for the sound (2026-11-20, new PC). Every sound of v4 hangs on THIS: the DIRECTOR's clock (shots in frames,
# the script's words with keys like "go#3", lines "L01".."L22") with the VOICE's real word times laid over it when a voice
# exists. One command re-times everything: change the voice or the clock, run the mix again.
#
# Sources, in order:
#   1. the clock: briefs/v3/pointing/director/timeline_v4.json (the DIRECTOR's probe of v4/timeline.ts), or --clock=<json>,
#      or --probe (runs the DIRECTOR's probe_v4.mjs into sound/pointing/audio/_clock_v4.json: the freshest timeline.ts);
#   2. the voice's words (optional): a words json ([{w, s, e}] or {"words": [...]}) aligned to the clock's tokens by the
#      word sequence (difflib), so a voice that covers only the opening re-times only the opening;
#   3. --plan-grid: the Go run re-laid on the plan grid of sound/pointing/script_v4/voice_v4.json (run.grid_gaps) after
#      the end of line 1 (only when the clock and the voice have no Go words of their own).
# Picture events (the lamp's green, the red cut, the X) are the cuts of the clock's shots; when the voice's words drift
# from the clock by more than a frame the drift is reported (the picture follows the clock, the sound follows the voice
# for words and the clock for cuts).
import difflib
import json
import os
import subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
DIRECTOR = os.path.join(ROOT, "briefs", "v3", "pointing", "director")
CLOCK_JSON = os.path.join(DIRECTOR, "timeline_v4.json")
VOICE_PLAN = os.path.join(ROOT, "sound", "pointing", "script_v4", "voice_v4.json")
FPS = 30
SPEAKER = {"L12": "D", "L14": "H", "L16": "C"}


def norm(w):
    return "".join(c for c in str(w).lower() if c.isalnum())


def probe(out=os.path.join(HERE, "_clock_v4.json")):
    subprocess.run(["node", os.path.join(DIRECTOR, "probe_v4.mjs"), "json", out], check=True, cwd=ROOT)
    return out


def _load_words(path):
    d = json.load(open(path, encoding="utf-8"))
    if isinstance(d, dict):
        d = d.get("words") or d.get("toks") or d.get("WORDS") or []
    out = []
    for x in d:
        if isinstance(x, (list, tuple)):          # [w, s, e] or [line, w, s, e]
            x = dict(zip(("w", "s", "e") if len(x) == 3 else ("line", "w", "s", "e"), x))
        out.append(dict(w=str(x.get("w") or x.get("word") or x.get("text")), s=float(x.get("s", x.get("start"))), e=float(x.get("e", x.get("end")))))
    return out


class Clock:
    def __init__(self, clock=None, words=None, plan_grid=False, do_probe=False):
        path = probe() if do_probe else (clock or CLOCK_JSON)
        TL = json.load(open(path, encoding="utf-8"))
        self.path = path
        self.source = TL.get("source", "?")
        self.frames = int(TL["total"])
        self.L = self.frames / FPS
        self.order = [s["id"] for s in TL["shots"]]
        self.shots = {s["id"]: (s["from"] / FPS, s["to"] / FPS) for s in TL["shots"]}
        self.shot_rows = TL["shots"]
        # the DIRECTOR's exported clock events (2026-11-21: press[6] = the fingertip lands, redPress, goFlashes, red, ...);
        # a fresh probe (--probe) carries no EV: then the EV of his timeline_v4.json is used when it is on the same clock
        self.EV = TL.get("EV")
        if not self.EV and os.path.exists(CLOCK_JSON) and os.path.abspath(path) != os.path.abspath(CLOCK_JSON):
            D = json.load(open(CLOCK_JSON, encoding="utf-8"))
            if int(D.get("total", -1)) == self.frames and D.get("EV"):
                self.EV = D["EV"]
                self.notes.append("EV (press events) from " + os.path.relpath(CLOCK_JSON, ROOT))
        self.EV = self.EV or {}
        self.toks = [dict(t) for t in TL["toks"]]
        self.clock_toks = [dict(t) for t in TL["toks"]]
        self.voice_words = None
        self.drift = []
        self.notes = []
        if words:
            self.overlay(_load_words(words), words)
        if plan_grid:
            self.plan_go()
        self.recut = False
        if self.voice_words is not None and len(self.drift) > 2:
            self.recut_on_voice()
        self._index()

    def recut_on_voice(self):
        """the voice drifts from the clock (the DIRECTOR's clock is still on the plan): re-cut the shots on the voice with
        the clock's OWN rules ('word:go#7' / 'line:L03'), each shot keeping its frame offset from its rule word on the plan;
        every word and cut after the last voiced word moves by the voice's delta there. An estimate until the DIRECTOR
        re-probes his clock on the same voice (then the two agree)."""
        plan = {t["key"]: t for t in self.clock_toks}
        voiced = [t for t in self.toks if t.get("heard")]
        if not voiced:
            return
        last = max(voiced, key=lambda t: t["e"])
        delta = last["e"] - plan[last["key"]]["e"]
        for t in self.toks:
            if not t.get("heard") and plan[t["key"]]["s"] > plan[last["key"]]["s"]:
                t["s"], t["e"], t["src"] = t["s"] + delta, t["e"] + delta, "plan+voice_delta"
        cur = {t["key"]: t for t in self.toks}
        first_of = {}
        for t in self.toks:
            first_of.setdefault(t["line"], t["key"])
        froms = []
        for s in self.shot_rows:
            rule = str(s.get("start", ""))
            k = rule.split(":", 1)[1] if ":" in rule else None
            k = first_of.get(k, k) if rule.startswith("line:") else k
            if k in cur and k in plan:
                off = s["from"] - int(np.floor(plan[k]["s"] * FPS))
                f = int(np.floor(cur[k]["s"] * FPS)) + off
            else:
                f = s["from"] + int(round(delta * FPS))
            f = 0 if s["from"] == 0 else max(f, (froms[-1] + 1) if froms else 0)
            froms.append(f)
        total = self.frames + int(round(delta * FPS))
        for i, s in enumerate(self.shot_rows):
            to = froms[i + 1] if i + 1 < len(froms) else total
            self.shots[s["id"]] = (froms[i] / FPS, to / FPS)
        self.frames, self.L = total, total / FPS
        self.recut = True
        self.notes.append(f"RE-CUT on the voice (the clock still on the plan): shots keep their rule offsets; after the voice +{delta:.3f} s; "
                          f"v02 {self.shots.get('v02', (0,))[0]:.3f}, v04 {self.shots.get('v04', (0,))[0]:.3f}, v05 {self.shots.get('v05', (0,))[0]:.3f}, "
                          f"v06 {self.shots.get('v06', (0, 0))[0]:.3f}-{self.shots.get('v06', (0, 0))[1]:.3f} s")

    # ------------------------------------------------------------ the voice over the clock
    def overlay(self, vw, name=""):
        a = [norm(t["w"]) for t in self.toks]
        b = [norm(w["w"]) for w in vw]
        sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
        hit = 0
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                t, w = self.toks[blk.a + k], vw[blk.b + k]
                d = w["s"] - t["s"]
                if abs(d) > 1.0 / FPS:
                    self.drift.append((t["key"], round(t["s"], 3), round(w["s"], 3)))
                t["s"], t["e"], t["src"], t["heard"] = w["s"], w["e"], "voice", True
                hit += 1
        self.voice_words = vw
        self.notes.append(f"voice words {os.path.basename(str(name))}: {hit} of {len(vw)} matched to the clock's {len(self.toks)} tokens; "
                          f"{len(self.drift)} drift from the clock by more than a frame")

    def plan_go(self):
        P = json.load(open(VOICE_PLAN, encoding="utf-8"))["run"]
        go = [t for t in self.toks if t["key"].startswith("go#")]
        l1 = [t for t in self.toks if t["line"] == "L01"]
        if not go or not l1:
            return
        t0 = l1[-1]["e"] + P.get("gap_before", 0.15)
        on = [t0]
        for g in P["grid_gaps"]:
            on.append(on[-1] + g)
        for t, s in zip(go, on):
            d = t["e"] - t["s"]
            t["s"], t["e"], t["src"] = s, s + d, "plan_grid"
        self.notes.append("Go run on the plan grid " + str(P["grid_gaps"]))

    def _index(self):
        self.key = {t["key"]: t for t in self.toks}
        self.lines = {}
        for t in self.toks:
            a, b = self.lines.get(t["line"], (t["s"], t["e"]))
            self.lines[t["line"]] = (min(a, t["s"]), max(b, t["e"]))

    # ------------------------------------------------------------ lookups
    def w(self, key, edge="s"):
        t = self.key.get(key)
        return None if t is None else float(t[edge])

    def line(self, lid, edge="s"):
        lid = lid if isinstance(lid, str) else "L%02d" % lid
        if lid not in self.lines:
            return None
        return float(self.lines[lid][0 if edge == "s" else 1])

    def shot(self, sid, edge="a"):
        if sid not in self.shots:
            return None
        return float(self.shots[sid][0 if edge == "a" else 1])

    def spoken_lines(self):
        """the lines that are really in the voice file (all when the voice covers the film; plan mode: none)"""
        if self.voice_words is None:
            return []
        return [lid for lid in self.lines if all(t.get("heard") for t in self.toks if t["line"] == lid)]

    # ------------------------------------------------------------ the formats score_v4 / cues_v4 read
    def v4_lines(self):
        """22 entries in script order (index k-1 = line k); a cut line (6) is a zero-length placeholder at the end of the
        line before it, marked absent"""
        out, last = [], 0.0
        for k in range(1, 23):
            lid = "L%02d" % k
            if lid in self.lines:
                s, e = self.lines[lid]
                out.append(dict(id=k, lid=lid, s=s, e=e, speaker=SPEAKER.get(lid, "N")))
                last = e
            else:
                out.append(dict(id=k, lid=lid, s=last, e=last, speaker="N", absent=True))
        return out

    def v4_words(self):
        return [dict(w=t["w"], s=float(t["s"]), e=float(t["e"]), id=int(t["line"][1:]), key=t["key"], line=t["line"]) for t in self.toks]

    def hook_times(self):
        """the opening's events (all seconds): the Go onsets, the lamp's green, the red cut, the held beat, 'Did you tap?',
        the X on 'She', the end of line 3"""
        go = [self.w("go#%d" % i) for i in range(1, 8)]
        go = [g for g in go if g is not None]
        red_word = go[-1]
        cut = self.shot("v04")
        red = cut if cut is not None and abs(cut - red_word) <= 0.1 else red_word
        if cut is not None and abs(cut - red_word) > 1.0 / FPS:
            self.notes.append(f"the red cut (v04, {cut:.3f} s) and the word go#7 ({red_word:.3f} s) differ by {1000 * (red_word - cut):.0f} ms")
        did = self.w("did#1") or self.line("L03")
        she = self.w("she#1") or (self.line("L03", "e") - 0.5)
        green = self.w("green#1") if self.w("green#1") is not None else self.shot("v02")      # the lamp snaps green ON the word (v02 is a cut-in before it)
        press = self.EV.get("press")
        press = [float(p) for p in press] if press and len(press) == len(go[:6]) else None
        red_press = float(self.EV["redPress"]) if self.EV.get("redPress") is not None else None
        if press is None or red_press is None:
            self.notes.append("no EV.press / EV.redPress on this clock: the clicks use hook_v4's fixed lags")
        return dict(press=press, red_press=red_press, line1=(self.line("L01"), self.line("L01", "e")), go=go[:6], go_all=go, red=red, red_word=red_word,
                    go7_end=self.w("go#7", "e") or red_word + 0.2, did=did, she=she, she_did=(she, self.line("L03", "e")),
                    l3_end=self.line("L03", "e"), green=green, line4=self.line("L04"), silence=((self.w("go#7", "e") or red + 0.2), did))

    def summary(self):
        src = "voice + clock" if self.voice_words is not None else "clock only (plan words)"
        return (f"clock {os.path.relpath(self.path, ROOT)} ({self.source}); {self.frames} f = {self.L:.2f} s; {len(self.order)} shots; "
                f"{len(self.toks)} words; timing: {src}" + ("; " + "; ".join(self.notes) if self.notes else ""))
