# Copies the CC0 recordings this film uses from the sound-effects reference library into sound/award/audio/_lib/
# (the .ogg as it is + a 48 kHz mono .wav the engine reads) and writes CREDITS.txt: every file with author, source link
# and licence, plus the ElevenLabs generations. Read-only on the library; nothing of it is run or installed.
# usage: python -s lib_setup.py            (safe to re-run)
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = r"C:\Users\utkar\research_notes\skills_ref\sound-effects\sfx"
OUT = os.path.join(HERE, "_lib")
# library file -> what it is (the cue list of the film is being re-written: these are reusable sounds, not cue assignments)
PICKS = {
    # pops and small graphics
    "pop/fs-824189-pop-in-sfx.ogg": "text / title pop-in (a real 'pop in', 410-1090 Hz)",
    "kit/pop.ogg": "neutral small pop",
    "pop/fs-258269-mouth-pop.ogg": "organic low mouth pop (thought bubble, small appear)",
    "pop/fs-447910-plop.ogg": "tiny plop (a dotted line landing, a small UI point)",
    "whoosh/fs393811.ogg": "a very short flick / swish (a card or chip flipping)",
    # bells
    "ding/fs-349504-triangle-open-04.ogg": "a struck open triangle (a clear 'answer' ding, rings 3.5 s: fade as needed)",
    "ding/kenney-interface-confirmation-002.ogg": "a short rising confirmation chime",
    "ding/kenney-interface-glass-001.ogg": "a glassy glint",
    # paper / board
    "impact/fs745291.ogg": "a soft ceramic / board knock (a page or card landing; body 340-2260 Hz, plays on a phone)",
    "transition/fs-702773-swipe-wav.ogg": "a paper-like swipe, 0.84 s (a page sliding in or out; also the MEDIUM camera whoosh)",
    # whooshes: body moves
    "whoosh/fs-127197-fast-simple-chop-5-aif.ogg": "a fast chop whoosh, 0.48 s (a quick duck / arm move)",
    "whoosh/fs-683101-quick-woosh.ogg": "a quick thin woosh, 0.28 s of sound (an arrow drawing, a small move)",
    "kit/whoosh.ogg": "the library's default whoosh, 0.42 s",
    "transition/fs-786514-swoosh-v2.ogg": "a low swoosh, 0.30 s",
    "whoosh/fs830856.ogg": "a low whoosh, 0.40 s",
    "whoosh/fs810485.ogg": "a wide analog sweep whoosh, 0.59 s (something leaving / floating off)",
    "transition/fs-683096-woosh.ogg": "a slow deep woosh with a 0.39 s rise, 1.5 s (slow motion)",
    # camera whoosh set, three lengths (short / medium = the swipe above / long), plus an extra-long one
    "transition/fs-816262-broomstick-whoosh-3-quiet-okm1.ogg": "CAMERA WHOOSH, SHORT (0.41 s): a real broomstick air whoosh, quiet",
    "whoosh/fs-169867-swoosh.ogg": "CAMERA WHOOSH, LONG (2.2 s): a real air swoosh",
    "whoosh/fs-264777-swoosh.ogg": "CAMERA WHOOSH, EXTRA LONG (4.0 s): a slow air swoosh (a long pull-back)",
    # hits and risers
    "kit/impact.ogg": "a soft low impact (weight on a reveal; 105-480 Hz)",
    "impact/kenney-impact-impactsoft-heavy-000.ogg": "a soft heavy thump, 0.53 s (a FREEZE-frame hit without any scratch)",
    "impact/kenney-impact-impactsoft-heavy-001.ogg": "a soft heavy thump, 0.57 s (second take of the freeze hit)",
    "impact/fs524817.ogg": "an oil-drum soft impact, 0.66 s (a rounder freeze / landing hit)",
    "riser/fs-685256-riser-sound-effect-short-wav.ogg": "a 2.5 s riser (must END on a hit)",
    "riser/fs-396161-scary-hits-risers-001.ogg": "a 6 s dark riser (tension; use low and filtered)",
    # ticks
    "tick/fs384187.ogg": "a real tick, 0.07 s", "tick/fs721514.ogg": "a very short tick, 0.02 s", "kit/click.ogg": "a classic click, 0.09 s",
    "click/fs788933.ogg": "a bright click, 0.12 s", "kit/tick.ogg": "a tiny tick, 0.02 s",
}


def flat(name):
    d, f = name.split("/")
    return ("kit-" + f if d == "kit" else f)[:-4]


def main():
    os.makedirs(OUT, exist_ok=True)
    m = json.load(open(os.path.join(SRC, "manifest.json"), encoding="utf-8"))
    meta = {e["file"]: e for e in m["bundled"]}
    for e in m["default_kit"]:
        if e.get("file"):
            meta[e["file"]] = dict(e, attribution=f"{e.get('creator')} via {e.get('source')}")
    rows = []
    for f, use in PICKS.items():
        src = os.path.join(SRC, *f.split("/"))
        if not os.path.exists(src):
            print("MISSING in the library:", f)
            continue
        name = flat(f)
        shutil.copyfile(src, os.path.join(OUT, name + ".ogg"))
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", src, "-af", "volume=-6dB", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le",
                        os.path.join(OUT, name + ".wav")], check=True)
        e = meta.get(f, {})
        rows.append((name, f, e.get("attribution") or e.get("creator") or "?", e.get("source_url", "?"), e.get("license", "?"), use))
    json.dump([dict(file=r[0], library_path=r[1], author=r[2], source=r[3], licence=r[4], use=r[5]) for r in rows],
              open(os.path.join(OUT, "_sources.json"), "w", encoding="utf-8"), indent=1)
    print(f"{len(rows)} library files copied to {OUT}")
    write_credits()


def write_credits(used=None):
    """CREDITS.txt (paste-ready). used = {file label: plays} from the last mix (samples.USED); None = list everything."""
    L = ["CREDITS: sound of \"The Clown Nobody Saw\"", "",
         "Voice: ElevenLabs text-to-speech (the channel's narrator voice), licensed through the owner's ElevenLabs plan.",
         "Music: no third-party music. The score (music_v2.wav) is original: written and synthesized in sound/award/audio/music.py with the instruments of this repository.", ""]
    try:
        rows = json.load(open(os.path.join(OUT, "_sources.json"), encoding="utf-8"))
    except OSError:
        rows = []
    L.append("Recorded sound effects, all Creative Commons 0 1.0 (public domain dedication, https://creativecommons.org/publicdomain/zero/1.0/),")
    L.append("copied from the sound-effects reference library into sound/award/audio/_lib/. CC0 needs no credit; this list is the proof of source.")
    L.append("Sources can change their terms: re-check each source page before publishing.")
    for r in rows:
        n = (used or {}).get(r["file"])
        if used is not None and not n:
            continue
        L.append(f"- {r['file']}.ogg | {r['author']} | {r['source']} | {r['licence']} | {r['use']}" + (f" | played {n}x" if n else ""))
    if used is not None:
        spare = [r["file"] for r in rows if not used.get(r["file"])]
        if spare:
            L.append(f"  (copied but not played in this mix: {', '.join(spare)})")
    L.append("")
    L.append("Generated sound effects: ElevenLabs Sound Effects (text-to-sound, SFX only, never voice), made for this film with the owner's")
    L.append("ElevenLabs account (el_batch.py / el_sfx.py); commercial use is covered by the owner's paid plan. Files in sound/award/audio/_el/.")
    for logf in ("credits.json", "credits_fix1.json", "credits_v2.json"):
        try:
            d = json.load(open(os.path.join(HERE, "_el", logf), encoding="utf-8"))
        except OSError:
            continue
        items = d.items() if isinstance(d, dict) else [(x.get("name"), x) for x in d]
        for name, x in items:
            if not isinstance(x, dict) or str(name).startswith("_") or not x.get("prompt"):
                continue
            n = (used or {}).get(name)
            if used is not None and not n:
                continue
            L.append(f"- {name}.wav | ElevenLabs Sound Effects | prompt: \"{x['prompt']}\" | {x.get('seconds', '?')} s" + (f" | played {n}x" if n else ""))
    L.append("")
    L.append("Everything else (the bed's fallback layers, the score) is synthesized in this repo's own code.")
    open(os.path.join(HERE, "CREDITS.txt"), "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("CREDITS.txt written")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "credits":
        write_credits()
    else:
        main()
