# FIX ROUND 1: the film-specific foley as ElevenLabs SOUND-EFFECT generations (never voice), 2-4 takes per sound so a
# repeated cue is never the same file twice. Budget: at most 2,500 credits for this round (the lead's cap). The API key
# is read at run time by tools/el_api.py from ~/.claude.json and is NEVER printed, logged or written anywhere. Nothing is
# played: every take is saved to _el/, decoded to 48 kHz mono wav and MEASURED by el_measure.py before it may be used.
# usage: python -s el_batch.py <group> [<group> ...] | all | list | credits      (takes that already exist are skipped)
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

OUT = os.path.join(HERE, "_el")
LOG = os.path.join(OUT, "credits_fix1.json")
CAP = 2500
ND = ", close microphone, dry, no reverb, no background noise, no music, no voices"

# group: (seconds, takes, prompt influence, prompt)
JOBS = {
    # ---- steps on brick: single steps are cut out of these by onset (samples.py)
    "step_soft": (4.0, 3, 0.6, "Footsteps of one person in soft rubber-soled sneakers walking at a relaxed pace on outdoor brick paving, eight clear separate steps" + ND),
    "step_hard": (4.0, 3, 0.6, "Footsteps of one person in hard leather-soled shoes walking briskly on outdoor brick pavement, eight clear separate steps" + ND),
    "step_slow": (4.0, 2, 0.6, "Slow strolling footsteps of one person in canvas shoes on brick paving, six separate steps with long gaps" + ND),
    # ---- the tally: hand-drawn pencil marks
    "pencil_ticks": (3.0, 3, 0.7, "A pencil making seven quick separate check marks on paper on a wooden clipboard, small gaps between the strokes, very close microphone, dry, no background noise, no voices"),
    "pencil_cross": (2.0, 3, 0.7, "A pencil drawing three quick X marks on paper on a clipboard, each X is two short strokes, very close microphone, dry, no background noise, no voices"),
    "pencil_one": (1.0, 2, 0.7, "One firm pencil check mark drawn on paper on a clipboard, a single stroke with a flick, very close microphone, dry, no background noise"),
    # ---- paper and wood
    "page_slide": (1.0, 2, 0.7, "A sheet of paper on a clipboard slides quickly in and lands with one soft tap on a table" + ND),
    "peg": (0.5, 3, 0.8, "One wooden clothespin snapping shut, a small sharp wooden click with a tiny spring ring, very close microphone, dry, no reverb, no background noise"),
    "bill_flick": (1.0, 3, 0.7, "A single paper banknote flapping once as it swings on a clip, one short crisp paper flick, close microphone, dry, no wind noise, no background noise"),
    "bills_bed": (5.0, 2, 0.6, "Three paper banknotes fluttering gently in a light breeze, soft crisp paper rustle, steady and quiet, close microphone, dry, no wind rumble, no background noise, no voices"),
    "bill_hair": (1.5, 2, 0.7, "A sheet of paper dragging slowly across long hair, soft and close, slow, dry, no background noise, no voices"),
    "stamp": (0.5, 2, 0.8, "One rubber stamp thumped down on a sheet of paper on a wooden desk, short and dull, very close microphone, dry, no background noise"),
    # ---- bodies, cloth, leaves
    "duck_cloth": (0.7, 4, 0.7, "A person ducking quickly, one short soft cloth swish of a jacket, close microphone, dry, no background noise, no voices, no footsteps"),
    "leaf_brush": (0.8, 3, 0.7, "A head brushing once under a leafy branch, a short soft rustle of fresh leaves, close microphone, dry, no wind, no background noise"),
    "spin_scuff": (0.7, 2, 0.7, "A quick shoe scuff on pavement as a person spins around on the spot, with a short cloth swish" + ND),
    "pigeon": (1.5, 3, 0.7, "A single pigeon takes off from the ground, a short burst of five wing flaps, close microphone, dry, no background noise, no cooing"),
    # ---- the clown
    "horn": (0.6, 5, 0.8, "Two very short quick honks from a small rubber bulb bicycle horn, comedic clown horn, honk-honk, close, dry, no reverb, no background"),
    "horn_low": (0.6, 3, 0.8, "Two short honks from a big old brass bulb horn with a deep low pitch, honk-honk, close, dry, no reverb, no background"),
    "tyre_roll": (4.0, 2, 0.6, "A small rubber bicycle tyre rolling steadily over brick paving, a soft continuous rolling patter, no squeak, no chain, no bell" + ND),
    "squeak": (1.5, 3, 0.8, "Two soft short squeaks of a bicycle saddle spring, gentle and slow, close microphone, dry, no background noise"),
    "boing": (0.7, 3, 0.8, "A soft comic cartoon boing, a small rubbery spring, short, dry, no reverb, no background"),
    # ---- voices that must stay wordless
    "murmur_f": (4.0, 2, 0.6, "A woman talking quietly on a phone heard through a wall, muffled wordless mumbling, calm, completely unintelligible, no clear words, no background noise"),
    "murmur_m": (4.0, 2, 0.6, "A man talking quietly on a phone heard through a wall, muffled wordless mumbling, calm, completely unintelligible, no clear words, no background noise"),
    "crowd": (10.0, 2, 0.5, "Soft distant crowd murmur of students on a sunny outdoor campus square, friendly wordless walla, light, no music, no traffic, no shouting, no clear words"),
    # ---- the square
    "square_amb": (15.0, 2, 0.5, "Sunny spring campus square ambience, a light breeze in fresh leaves, a few songbirds, a small fountain far away, no traffic, no music, no voices, no footsteps"),
    "clock": (2.5, 2, 0.7, "An old tower clock mechanism spinning fast, a soft ratcheting gear whirr for two seconds, then one soft wooden tock as the hand stops, dry, no bell, no background"),
    "headphones": (1.5, 2, 0.7, "Tinny music leaking from big headphones heard from outside, a faint fast hi-hat and beat, thin and quiet, no bass, no voices"),
    # ---- the reveal and the small graphics
    "shimmer": (4.5, 3, 0.6, "A magical rising shimmer, glassy chimes and airy sparkle swelling upward over four seconds and ending in a soft bright bloom, no impact, no low rumble, clean"),
    "impact": (1.0, 3, 0.7, "A soft low cinematic whump, one gentle deep thud with a warm body, short, no sub rumble, no long reverb tail, clean, no background"),
    "chime": (1.0, 3, 0.7, "A happy little three-note rising chime on a glockenspiel, bright and sweet, short, clean, no reverb, no background"),
    "pop": (0.5, 3, 0.8, "One small soft cartoon pop, a bubbly blip as a title appears, short, clean, dry, no background"),
    # ---- added when the script / edit / music were re-opened (reusable, not tied to a cue list)
    "crowd_ooh": (1.5, 2, 0.7, "A small group of people outdoors react with one soft surprised 'ooh', friendly, short, a few metres away, no words, no music, no background"),
    "crowd_laugh": (1.5, 2, 0.7, "A small group of friends share one short warm laugh outdoors, a light chuckle, a few metres away, no words, no music, no background"),
    "cam_whoosh_s": (0.5, 1, 0.8, "A very short soft airy camera whoosh, a quick smooth swish of air, clean, dry, no impact, no bass rumble, no background"),
    "cam_whoosh_m": (0.9, 1, 0.8, "A soft airy camera whoosh, a smooth swish of air passing the microphone, medium length, clean, dry, no impact, no bass rumble, no background"),
    "cam_whoosh_l": (1.6, 1, 0.8, "A long slow soft airy camera whoosh, a smooth gliding swish of air, clean, dry, no impact, no bass rumble, no background"),
    "drone": (6.0, 2, 0.6, "A soft low tension drone, a quiet warm sustained hum with slow gentle movement, mysterious but playful, steady, no melody, no percussion, no impact, no voices"),
    "low_riser": (3.5, 2, 0.7, "A soft low riser, a gentle swelling tone rising slowly in pitch over three seconds, building quiet tension, no impact at the end, clean, no percussion"),
    "freeze_hit": (0.8, 3, 0.8, "A short soft freeze-frame hit, one muted thump with a tiny glassy ping as time stops, clean, no record scratch, no vinyl, no reverb tail, no background"),
    # ---- retakes after the measurements: both drones came back near-silent (peak -61 dBFS); three of the four phone
    # murmurs were only "hmm" or read as real words to the recogniser
    "murmur_gib_f": (4.0, 1, 0.7, "A woman mumbling nonsense gibberish syllables in a steady chatty rhythm, like a muffled cartoon adult voice going wah wah wah, no real words in any language, close, dry, no background"),
    "murmur_gib_m": (4.0, 1, 0.7, "A man mumbling nonsense gibberish syllables in a steady chatty rhythm, like a muffled cartoon adult voice going wah wah wah, no real words in any language, close, dry, no background"),
    "drone_b": (5.0, 1, 0.7, "A low sustained synth drone, warm, full and clearly audible at a steady level, a deep hum with slow gentle movement, mysterious but playful, no melody, no percussion, no voices"),
}


def used():
    d = el_api.req("GET", "/user/subscription")
    return int(d.get("character_count", -1))


def spent():
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    return log


def gen(name, seconds, prompt, influence):
    body = json.dumps({"text": prompt, "duration_seconds": float(seconds), "prompt_influence": float(influence)}).encode()
    r = urllib.request.Request(el_api.API + "/sound-generation", data=body, method="POST",
                               headers={"xi-api-key": el_api.key(), "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(r, timeout=240) as f:
            audio = f.read()
    except urllib.error.HTTPError as e:
        print("  ERROR", name, e.code, e.read().decode()[:200])
        return False
    mp3 = os.path.join(OUT, name + ".mp3")
    open(mp3, "wb").write(audio)
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", mp3, "-af", "volume=-3dB", "-ar", "48000", "-ac", "1", "-c:a", "pcm_s24le", os.path.join(OUT, name + ".wav")], check=True)
    return True


def main():
    os.makedirs(OUT, exist_ok=True)
    args = sys.argv[1:]
    log = spent()
    if args == ["list"]:
        tot = 0.0
        for k, (s, n, _, p) in JOBS.items():
            tot += s * n
            print(f"{k:<14} {s:4.1f} s x {n}  {p[:90]}")
        print(f"total {tot:.1f} s of generation")
        return
    if args == ["credits"]:
        print(f"account counter now {used()}; start of this round {log.get('_start')}; spent this round {used() - log.get('_start', used())} of {CAP}")
        return
    groups = list(JOBS) if args == ["all"] else args
    if "_start" not in log:
        log["_start"] = used()
    for g in groups:
        s, n, infl, prompt = JOBS[g]
        for k in range(n):
            name = f"{g}_{k + 1}"
            if os.path.exists(os.path.join(OUT, name + ".wav")):
                continue
            now = used()
            if now - log["_start"] > CAP - 150:
                print(f"STOP: {now - log['_start']} credits spent this round, cap {CAP}")
                json.dump(log, open(LOG, "w"), indent=1)
                return
            ok = gen(name, s, prompt, infl)
            log[name] = {"seconds": s, "prompt": prompt, "influence": infl, "ok": ok, "t": time.strftime("%H:%M:%S")}
            print(f"  {name}: {'ok' if ok else 'FAILED'} ({s} s)", flush=True)
            json.dump(log, open(LOG, "w"), indent=1)
    time.sleep(20)                       # the account counter lags a little
    log["_last"] = used()
    json.dump(log, open(LOG, "w"), indent=1)
    print(f"spent this round so far: {log['_last'] - log['_start']} credits of {CAP} (account counter {log['_last']})")


if __name__ == "__main__":
    main()
