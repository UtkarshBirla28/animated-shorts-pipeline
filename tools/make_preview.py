"""Local preview page: plays the voice (press play, no autoplay) with the channel-style captions timed exactly like
Captions.tsx, the current shot / beat, and the latest still of each shot behind the caption.
Usage: python make_preview.py <name> <stills_dir_relative_to_studio_out>   e.g.  antitheft antitheft/skel"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
name, stills = sys.argv[1], sys.argv[2]
snd = ROOT / "sound" / name
words = json.loads((snd / "voice" / "words.json").read_text(encoding="utf-8"))
tl = json.loads((snd / "audio" / "timeline.json").read_text(encoding="utf-8"))
sdir = ROOT / "studio" / "out" / Path(stills)
imgs = {int(p.stem.split("_")[-1]): p for p in sdir.glob("*.jpg") if p.stem.split("_")[-1].isdigit()}
out = snd / "preview"
out.mkdir(exist_ok=True)

def rel(p):
    import os
    return os.path.relpath(p, out).replace("\\", "/")

shot_img = {}
for s in tl["shots"]:
    cand = [f for f in imgs if s["a"] <= f < s["b"]]
    if cand:
        mid = (s["a"] + s["b"]) // 2
        shot_img[s["id"]] = rel(imgs[min(cand, key=lambda f: abs(f - mid))])
data = {"words": words, "shots": tl["shots"], "total": tl["total"], "imgs": shot_img, "voice": rel(snd / "voice" / "voice.wav"),
        "font": rel(ROOT / "studio" / "public" / "fonts" / "Montserrat.ttf")}
html = """<!doctype html><html><head><meta charset="utf-8"><title>Voice + captions preview</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
@font-face { font-family: CapM; src: url("__FONT__"); font-weight: 100 900; }
:root { --bg: #111317; --fg: #e9e6df; --mute: #9a968d; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.45 system-ui, sans-serif; display: flex; gap: 28px; padding: 22px; flex-wrap: wrap; }
.frame { position: relative; width: 405px; height: 720px; background: #2b3340; overflow: hidden; border-radius: 10px; flex: none; }
.frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .9; }
.cap { position: absolute; left: 0; right: 0; top: calc(720px * 1311 / 1920); text-align: center; font-family: CapM, sans-serif;
  font-weight: 900; font-size: calc(720px * 76 / 1920); line-height: 1; color: #fff; -webkit-text-stroke: calc(720px * 10 / 1920) #000;
  paint-order: stroke fill; text-shadow: calc(720px * 2 / 1920) calc(720px * 4 / 1920) calc(720px * 3 / 1920) rgba(0,0,0,.85); white-space: nowrap; }
.side { max-width: 520px; }
h1 { font-size: 20px; margin: 0 0 6px; } .mute { color: var(--mute); }
audio { width: 100%; margin: 14px 0; }
#shot { font-size: 17px; margin: 8px 0; } #line { font-size: 15px; min-height: 3em; }
.note { margin-top: 18px; padding: 10px 12px; border: 1px solid #333; border-radius: 8px; color: var(--mute); }
</style></head><body>
<div class="frame"><img id="img" alt=""><div class="cap" id="cap"></div></div>
<div class="side">
  <h1>The Anti-Theft Sign That Made People Steal</h1>
  <div class="mute">Final voice (Kokoro am_fenrir, 1.2x), captions timed exactly as in the video (2 frames early, 1-3 words).</div>
  <audio id="au" controls preload="auto" src="__VOICE__"></audio>
  <div id="shot"></div>
  <div id="line" class="mute"></div>
  <div class="note">Pictures behind the captions are PLACEHOLDER test frames from the skeleton build (stand-in sets and
  people). The real sets, characters and music are being built now; this page is for judging the voice and caption timing.</div>
</div>
<script>
const D = __DATA__;
const JOIN = new Set(["a","an","the","of","to","in","on","at","and","so","is","it","you","her","his","with","one"]);
const clean = w => w.replace(/["\\u201c\\u201d]/g, "");
const ends = w => /[.,!?:;\\u2026]$|\\.\\.\\.$/.test(w);
const caps = []; let cur = null;
D.words.forEach(w => { const t = clean(w.w); if (!cur) cur = { words: [], start: Math.round(w.s * 30) };
  cur.words.push(t); const bare = t.toLowerCase().replace(/[^a-z']/g, "");
  const jn = JOIN.has(bare) && !ends(t) && cur.words.length < 3; if (!jn || cur.words.length >= 3) { caps.push(cur); cur = null; } });
if (cur) caps.push(cur);
const C = caps.map((c, i) => ({ text: c.words.join(" "), f0: i ? Math.max(0, c.start - 2) : 0, f1: i + 1 < caps.length ? caps[i + 1].start - 2 : D.total }));
const SN = {1:"Hook: the woman reads the sign",2:"Vista: the painted badlands",3:"Pocketing tourist + 200-million-year plaque",4:"The warning sign",5:"The whisper",
  6:"Mystery (light turns late afternoon)",7:"The professor (morning)",8:"The team hides marked wood",9:"The two signs",10:"Results: 1.67% vs 7.92%",
  11:"Pivot: blueprint space",12:"Classroom analogy",13:"PERMISSION GRANTED (sunset)",14:"The conscience pile (night)",15:"Tagged chip: stolen twice (dusk)",16:"Loop back to frame 0"};
const au = document.getElementById("au"), cap = document.getElementById("cap"), img = document.getElementById("img");
const shotEl = document.getElementById("shot"), lineEl = document.getElementById("line");
let lastShot = -1;
function tick() {
  const f = Math.floor(au.currentTime * 30);
  const c = C.find(k => f >= k.f0 && f < k.f1) || C[C.length - 1]; cap.textContent = c.text;
  const s = D.shots.find(k => f >= k.a && f < k.b) || D.shots[D.shots.length - 1];
  if (s.id !== lastShot) { lastShot = s.id; if (D.imgs[s.id]) img.src = D.imgs[s.id];
    shotEl.textContent = `Shot ${s.id} / 16  -  ${SN[s.id]}  (${s.light})`; }
  const ws = D.words.filter(w => w.s <= au.currentTime + 2.5 && w.e >= au.currentTime - 2.5).map(w => w.w).join(" ");
  lineEl.textContent = ws;
  requestAnimationFrame(tick);
}
au.addEventListener("loadedmetadata", () => { tick(); });
tick();
</script></body></html>"""
html = html.replace("__DATA__", json.dumps(data)).replace("__VOICE__", data["voice"]).replace("__FONT__", data["font"])
(out / "voice_captions.html").write_text(html, encoding="utf-8")
print(out / "voice_captions.html")
