# SCORE v2 via ElevenLabs Music (Eleven Music, model music_v2_5, composition plan = one chunk per story section).
# The API key is read at run time by tools/el_api.py from ~/.claude.json and is NEVER printed, logged or written.
# Nothing is played: every take is saved to _music/, decoded to 48 kHz stereo wav and MEASURED (music_measure.py).
# The credit counter is read right before and right after every call and logged to _music/credits.jsonl (the account
# is shared with the voice work, so the log keeps both readings and the time).
# usage: python -s music_el.py test | full | plan <name> | credits
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "..", "..", "tools")))
import el_api  # noqa: E402

OUT = os.path.join(HERE, "_music")
LOG = os.path.join(OUT, "credits.jsonl")
CAP = 3000                     # the lead's cap for music, all calls together
MODEL = "music_v2_5"
FORMATS = ["pcm_48000", "mp3_48000_192", "mp3_48000_128", "mp3_44100_128"]   # best first; Starter may refuse the lossless / 192k ones

NEG = ["vocals", "singing", "choir", "humming", "whistling melody", "spoken words", "lyrics", "vocal chops",
       "circus music", "calliope", "kazoo", "slide whistle", "clown music", "cartoon sound effects", "big drums", "drum kit backbeat",
       "EDM", "trap", "dubstep", "rock guitar", "electric guitar", "synth lead", "cheesy", "goofy", "silly", "comedy honks",
       "fade in", "long reverb wash", "lo-fi hiss"]
GLOBAL = ["instrumental only", "playful mystery underscore for a short documentary-style cartoon", "intriguing, curious, premium and elegant",
          "small chamber ensemble", "pizzicato strings", "celesta and glockenspiel sparkle", "marimba", "upright bass",
          "clarinet and bassoon colour", "soft brushed snare", "woodblock", "light shaker", "finger snaps",
          "104 BPM", "D minor with bright major lifts", "clean modern film-score production", "wide stereo", "crisp high end"]


def sec(name, dur_s, styles, neg=(), adherence="high"):
    return {"text": f"[{name}]", "duration_ms": int(round(dur_s * 1000)), "positive_styles": GLOBAL[:1] + list(styles),
            "negative_styles": NEG + list(neg), "context_adherence": adherence}


# THE SECTION MAP (line times from voice_v6/phrases.json; section edges sit in the voice gaps)
def plan_full(total_s):
    S = [
        ("Quiz - the count", 9.10, ["starts instantly on beat one at full energy, no intro", "playful game-show thinking music", "ticking woodblock clock on every beat",
                                    "bouncy staccato pizzicato ostinato", "celesta sparkles", "light shaker", "curious, light, a little tense", "104 BPM"]),
        ("Quiz - the answer", 3.90, ["the ticking stops", "a bright little resolving sting", "then a cheeky wink: two plucked notes and a celesta flourish", "light and witty"]),
        ("The turn", 4.00, ["the floor drops away into intrigue", "sparse", "low sustained strings and a soft low piano note", "mysterious and curious", "no percussion"]),
        ("Origin - mischief", 7.00, ["playful mischief", "sneaky staccato bassoon and pizzicato", "soft brushes", "a muted trumpet answers", "curious, building a little"]),
        ("Origin - the suit and the ride", 5.10, ["one comic orchestral hit on the very first beat", "then a bouncy riding groove", "pizzicato and marimba", "brushes",
                                                   "upbeat, cheerful, light"]),
        ("Interviews", 8.50, ["light and quick", "very sparse and quiet", "staccato pizzicato and soft marimba", "lots of space between notes",
                              "stays out of the way of dialogue"], ["melody in the foreground"]),
        ("The number", 4.60, ["incredulous", "a held suspended chord", "a questioning celesta figure", "half-time feel", "surprised"]),
        ("Mystery", 7.80, ["hushed, curious, leaning in", "soft tremolo strings", "celesta and harp harmonics", "a soft low pulse", "intimate, very quiet",
                           "mysterious"], ["percussion"]),
        ("Money - tiptoe", 11.60, ["sneaky tiptoe pizzicato", "staccato bassoon", "brushes and finger snaps", "building steadily in intensity",
                                   "mischievous heist feel", "clever"]),
        ("Mind-blow", 3.80, ["almost everything drops out", "slow, wondering, suspended", "soft sustained high strings", "glassy celesta", "airy",
                             "time stands still"], ["percussion", "bass"]),
    ]
    used = sum(x[1] for x in S)
    S.append(("Final build", max(3.0, total_s - used), ["quick rising build", "pizzicato and percussion return", "bright rising energy",
                                                        "ends on a held bright chord"]))
    ch = [sec(x[0], x[1], x[2], x[3] if len(x) > 3 else ()) for x in S]
    # the FIRST chunk's styles set the mood, genre and band of the whole track (composition-plan guide): it carries all of them
    ch[0]["positive_styles"] = GLOBAL + S[0][2]
    return {"chunks": ch}


def plan_test():
    """the first three sections only (17.0 s): the opening, the sting / wink, and the drop into intrigue"""
    return {"chunks": plan_full(71.0)["chunks"][:3]}


def used():
    d = el_api.req("GET", "/user/subscription")
    return int(d.get("character_count", -1)), int(d.get("character_limit", -1)), d.get("tier")


def log(row):
    os.makedirs(OUT, exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")


def spent_so_far():
    if not os.path.exists(LOG):
        return 0
    tot = 0
    for l in open(LOG, encoding="utf-8"):
        r = json.loads(l)
        if r.get("event") == "compose" and r.get("ok"):
            tot += max(0, r.get("delta", 0))
    return tot


def compose(name, plan):
    os.makedirs(OUT, exist_ok=True)
    est = sum(c["duration_ms"] for c in plan["chunks"]) / 60000.0 * 900
    if spent_so_far() + est > CAP:
        sys.exit(f"STOP: {spent_so_far()} spent + ~{est:.0f} estimated > cap {CAP}")
    body = json.dumps({"composition_plan": plan, "model_id": MODEL}).encode()
    for fmt in FORMATS:
        c0, lim, tier = used()
        r = urllib.request.Request(f"{el_api.API}/music?output_format={fmt}", data=body, method="POST",
                                   headers={"xi-api-key": el_api.key(), "Content-Type": "application/json"})
        t0 = time.time()
        try:
            with urllib.request.urlopen(r, timeout=600) as f:
                audio = f.read()
                hdr = {k: v for k, v in f.headers.items() if k.lower() in ("content-type", "song-id", "x-song-id", "character-cost", "x-character-count",
                                                                          "request-id", "history-item-id")}
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:400]
            time.sleep(3)
            c1 = used()[0]
            log({"event": "compose", "name": name, "format": fmt, "ok": False, "http": e.code, "msg": msg, "before": c0, "after": c1, "delta": c1 - c0,
                 "time": time.strftime("%H:%M:%S")})
            print(f"  {fmt}: HTTP {e.code} {msg[:200]}  (counter {c0} -> {c1})", flush=True)
            continue
        dt = time.time() - t0
        ext = "pcm" if fmt.startswith("pcm") else "mp3"
        raw = os.path.join(OUT, f"{name}.{ext}")
        open(raw, "wb").write(audio)
        wav = os.path.join(OUT, f"{name}.wav")
        if ext == "pcm":
            sr = int(fmt.split("_")[1])
            # Eleven's pcm is 16-bit little-endian; try stereo first, fall back to mono (checked by the length below)
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "s16le", "-ar", str(sr), "-ac", "2", "-i", raw,
                            "-c:a", "pcm_s24le", wav], check=True)
        else:
            subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-ar", "48000", "-c:a", "pcm_s24le", wav], check=True)
        time.sleep(15)                                   # the counter lags a little
        c1 = used()[0]
        row = {"event": "compose", "name": name, "format": fmt, "ok": True, "bytes": len(audio), "seconds_planned": sum(c["duration_ms"] for c in plan["chunks"]) / 1000.0,
               "before": c0, "after": c1, "delta": c1 - c0, "limit": lim, "tier": tier, "headers": hdr, "wall_s": round(dt, 1), "time": time.strftime("%H:%M:%S"),
               "model": MODEL, "plan": plan}
        log(row)
        print(f"  {name}: {fmt} ok, {len(audio)} bytes in {dt:.0f} s; counter {c0} -> {c1} (delta {c1 - c0}); headers {hdr}", flush=True)
        return wav
    sys.exit("no output format was accepted")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "credits":
        c, lim, tier = used()
        print(f"account counter {c} of {lim} ({tier}); music spent so far (by counter deltas) {spent_so_far()} of {CAP}")
    elif cmd == "test":
        compose(sys.argv[2] if len(sys.argv) > 2 else "test_1", plan_test())
    elif cmd == "full":
        total = float(sys.argv[2])
        compose(sys.argv[3] if len(sys.argv) > 3 else "full_1", plan_full(total))
    elif cmd == "plan":
        print(json.dumps(plan_full(float(sys.argv[2])), indent=1))
