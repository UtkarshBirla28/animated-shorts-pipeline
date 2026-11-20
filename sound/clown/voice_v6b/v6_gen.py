"""Generate takes (ElevenLabs /with-timestamps). The API key is read by tools/el_api.py at run time and is never
printed or stored. A take that already exists is skipped (re-runnable, never pays twice).

  python v6_gen.py <jobs.json> [--dry]

jobs.json: [{"folder": "n01", "take": "t1", "voice": "<id>", "model": "eleven_v4", "text": "...", "stability": 0.5,
             "speed": 1.0, "seed": 1234, "prev": null, "next": null, "lines": ["n01"], "note": "..."}, ...]
Every call is logged to takes/gen_log.jsonl (file, seed, settings, characters sent)."""
import base64
import json
import sys
import time

import v6_lib as L

sys.path.insert(0, str(L.ROOT / "tools"))
import el_api  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
LOG = L.TAKES / "gen_log.jsonl"


def gen(job):
    out = L.TAKES / job["folder"] / f"{job['take']}.mp3"
    if out.exists():
        return 0
    body = {"text": job["text"], "model_id": job.get("model", L.MODEL),
            "voice_settings": {"stability": job.get("stability", 0.5), "similarity_boost": job.get("similarity", 0.75),
                               "speed": job.get("speed", 1.0)}}
    if job.get("seed") is not None:
        body["seed"] = job["seed"]
    if job.get("style") is not None:
        body["voice_settings"]["style"] = job["style"]
    if job.get("prev"):
        body["previous_text"] = job["prev"]
    if job.get("next"):
        body["next_text"] = job["next"]
    for attempt in range(3):
        d = el_api.req("POST", f"/text-to-speech/{job['voice']}/with-timestamps", body, params={"output_format": "mp3_44100_128"})
        if "audio_base64" in d:
            break
        print("  retry", json.dumps(d)[:400])
        if d.get("error") in (400, 401, 403, 404, 422):
            return -1
        time.sleep(3)
    else:
        return -1
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(base64.b64decode(d["audio_base64"]))
    json.dump({k: d.get(k) for k in ("alignment", "normalized_alignment")}, open(out.with_suffix(".json"), "w", encoding="utf-8"))
    out.with_suffix(".txt").write_text(job["text"], encoding="utf-8")
    rec = {"file": f"{job['folder']}/{job['take']}.mp3", "chars": len(job["text"]), **{k: v for k, v in job.items() if k not in ("folder", "take")},
           "time": time.strftime("%H:%M:%S")}
    out.with_suffix(".meta.json").write_text(json.dumps(rec, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print("ok", rec["file"], len(job["text"]), "chars", flush=True)
    return len(job["text"])


def main():
    jobs = json.loads(open(sys.argv[1], encoding="utf-8").read())
    if "--only" in sys.argv:
        keep = sys.argv[sys.argv.index("--only") + 1].split(",")
        jobs = [j for j in jobs if j["folder"] in keep or f"{j['folder']}/{j['take']}" in keep]
    todo =[j for j in jobs if not (L.TAKES / j["folder"] / f"{j['take']}.mp3").exists()]
    print(f"{len(jobs)} jobs, {len(todo)} to generate, {sum(len(j['text']) for j in todo)} characters")
    if "--dry" in sys.argv:
        for j in todo:
            print("  ", j["folder"], j["take"], repr(j["text"]), j.get("stability"), j.get("speed"))
        return
    L.TAKES.mkdir(parents=True, exist_ok=True)
    total = 0
    for j in todo:
        n = gen(j)
        if n < 0:
            print("FAILED", j["folder"], j["take"])
        else:
            total += n
    print("characters sent:", total)


if __name__ == "__main__":
    main()
