"""Generate takes for the clown narration (ElevenLabs with-timestamps, a fixed seed per take: the same seed + settings
+ text gives the same audio again, so every take can be repeated). The API key is read by tools/el_api.py at run time
and is never printed or stored.

  python clown_gen.py test                         settings test: first 6 sentences, stability x style grid, one seed
  python clown_gen.py takes <stab> <style> [chunk ...] [--n 4] [--first 1] [--tag _x] [--speed 1.2]    (first passes)
  python clown_gen.py run <folder> <a-b> <stab> <speed> <seed0> <n> [--first 1] [--ctx 5] [--text "variant text"]
        takes t<first>.. of script sentences a..b (inclusive) into takes/<folder>/; --ctx N sends the N sentences
        before as previous_text and the 2 after as next_text (context only: not spoken, not billed);
        --text = the same words with other punctuation (the word count must not change)

Every call is logged to takes/gen_log.jsonl (file, seed, settings, characters sent)."""
import base64
import json
import sys
import time

import clown_lib as L

sys.path.insert(0, str(L.ROOT / "tools"))
import el_api  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
LOG = L.TAKES / "gen_log.jsonl"


def gen(text, out, stab, style, speed, seed, model=L.MODEL, voice=L.VOICE, prev=None, nxt=None, idxs=None):
    body = {"text": text, "model_id": model, "seed": seed,
            "voice_settings": {"stability": stab, "similarity_boost": 0.75, "speed": speed, "style": style}}
    if prev:
        body["previous_text"] = prev      # context only: not spoken
    if nxt:
        body["next_text"] = nxt
    for attempt in range(3):
        d = el_api.req("POST", f"/text-to-speech/{voice}/with-timestamps", body, params={"output_format": "mp3_44100_128"})
        if "audio_base64" in d:
            break
        print("  retry", json.dumps(d)[:300])
        time.sleep(3)
    else:
        sys.exit("generation failed")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(d["audio_base64"]))
    json.dump({k: d.get(k) for k in ("alignment", "normalized_alignment")}, open(out.with_suffix(".json"), "w", encoding="utf-8"))
    out.with_suffix(".txt").write_text(text, encoding="utf-8")
    rec = {"file": str(out.relative_to(L.TAKES)).replace("\\", "/"), "chars": len(text), "seed": seed, "model": model,
           "voice": voice, "stability": stab, "style": style, "speed": speed, "text": text,
           "previous_text": prev, "next_text": nxt, "sentences": idxs}
    out.with_suffix(".meta.json").write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print("ok", rec["file"], len(text), "chars")


def main():
    cmd = sys.argv[1]
    rest = sys.argv[2:]
    opt = lambda k, d=None: rest[rest.index(k) + 1] if k in rest else d
    if cmd == "test":
        text = L.text_of(range(6))
        for stab in (0.35, 0.5, 0.65):
            for style in (0.0, 0.3):
                out = L.TAKES / "settings_test" / f"st{int(stab * 100)}_sy{int(style * 100)}.mp3"
                if not out.exists():
                    gen(text, out, stab, style, 1.2, 4101)
    elif cmd == "takes":
        stab, style = float(rest[0]), float(rest[1])
        n, first = int(opt("--n", 4)), int(opt("--first", 1))
        speed_over = float(opt("--speed", 0)) or None
        chunks = [c for c in rest if c in L.CHUNKS] or list(L.CHUNKS)
        tag = opt("--tag", "")
        for c in chunks:
            spoken, _, speed = L.CHUNKS[c]
            for t in range(first, first + n):
                out = L.TAKES / (c + tag) / f"t{t}.mp3"
                if not out.exists():
                    gen(L.text_of(spoken), out, stab, style, speed_over or speed, 5000 + 100 * list(L.CHUNKS).index(c) + t, idxs=spoken)
    elif cmd == "run":
        folder, rng, stab, speed, seed0, n = rest[0], rest[1], float(rest[2]), float(rest[3]), int(rest[4]), int(rest[5])
        a, b = (int(v) for v in rng.split("-"))
        idxs = list(range(a, b + 1))
        first, ctx = int(opt("--first", 1)), int(opt("--ctx", 0))
        text = opt("--text") or L.text_of(idxs)
        assert len(text.split()) == len(L.text_of(idxs).split()), "variant text changes the word count"
        prev = L.text_of(range(max(0, a - ctx), a)) if (ctx and a > 0) else None
        nxt = L.text_of(range(b + 1, min(len(L.S), b + 3))) if (ctx and b + 1 < len(L.S)) else None
        for t in range(first, first + n):
            out = L.TAKES / folder / f"t{t}.mp3"
            if not out.exists():
                gen(text, out, stab, 0.0, speed, seed0 + t, prev=prev, nxt=nxt, idxs=idxs)


main()
