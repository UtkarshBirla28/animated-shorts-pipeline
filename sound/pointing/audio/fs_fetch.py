# Freesound helper for the 'pointing' soundtrack: CC0 ONLY.
#   search:  python -s fs_fetch.py search "suitcase wheels" [--max 12] [--dur 1-40]
#   get:     python -s fs_fetch.py get <sound id> <short_name> ["what it is used for"]
# 'get' opens the sound's own page, REFUSES anything whose page does not say Creative Commons 0, downloads the HQ
# preview (mp3) into _dl/<id>/ (its own folder: downloads are data, never code), converts it with ffmpeg to a 48 kHz
# 24-bit WAV in _lib/<short_name>.wav and records author / URL / licence / use in _lib/_sources.json.
# No account, no key: only public pages and public preview files are read. Nothing about the owner is sent.
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DL = os.path.join(HERE, "_dl")
LIB = os.path.join(HERE, "_lib")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
CC0_URL = "creativecommons.org/publicdomain/zero/1.0"
import threading
LOCK = threading.Lock()


LAST_URL = [""]


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        b = r.read()
        LAST_URL[0] = r.geturl()
    return b if binary else b.decode("utf-8", "replace")


def page_of(sid):
    """the sound's own page + its author (from the address the short link redirects to)"""
    req = urllib.request.Request(f"https://freesound.org/s/{sid}/", headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        page, url = r.read().decode("utf-8", "replace"), r.geturl()
    m = re.search(r"/people/([^/]+)/sounds/", url)
    return page, (m.group(1) if m else "?")


def search(q, mx=12, dur=None, page=1):
    f = 'license:"Creative Commons 0"'
    if dur:
        a, b = dur.split("-")
        f += f" duration:[{a} TO {b}]"
    url = "https://freesound.org/search/?" + urllib.parse.urlencode({"q": q, "f": f, "page": page})
    h = fetch(url)
    out = []
    for blk in h.split('class="bw-search__result"')[1:]:
        g = lambda k: (re.search(k + r'="([^"]*)"', blk) or [None, ""])[1]
        sid = g("data-sound-id")
        if not sid:
            continue
        desc = re.search(r'class="[^"]*bw-search__result-description[^"]*"[^>]*>(.*?)</', blk, re.S)
        if not desc:
            desc = re.search(r'<div class="v-spacing-top-1[^"]*"[^>]*>\s*(.*?)\s*</div>', blk, re.S)
        d = re.sub(r"<[^>]+>", " ", desc.group(1)) if desc else ""
        out.append(dict(id=sid, user=g("data-username"), title=html.unescape(g("data-title")), dur=float(g("data-duration") or 0),
                        dl=g("data-num-downloads"), mp3=g("data-mp3").replace("-lq.mp3", "-hq.mp3"), desc=html.unescape(re.sub(r"\s+", " ", d)).strip()[:150]))
        if len(out) >= mx:
            break
    return out


def get(sid, name, use=""):
    os.makedirs(LIB, exist_ok=True)
    page, user = page_of(sid)
    if CC0_URL not in page:
        print(f"REFUSED {sid}: its page does not link the CC0 deed")
        return None
    lic = re.search(r'href="(https?://creativecommons\.org/[^"]+)"', page)
    if not lic or CC0_URL not in lic.group(1):
        print(f"REFUSED {sid}: licence link is {lic.group(1) if lic else None}")
        return None
    m = re.search(r'data-mp3="([^"]+)"', page)
    title = html.unescape(re.search(r'data-title="([^"]*)"', page).group(1))
    dur = float(re.search(r'data-duration="([^"]+)"', page).group(1))
    mp3 = m.group(1).replace("-lq.mp3", "-hq.mp3")
    dm = re.search(r'id="soundDescriptionSection"[^>]*>(.*?)</div>', page, re.S)
    desc = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", dm.group(1)))).strip()[:300] if dm else ""
    d = os.path.join(DL, str(sid))
    os.makedirs(d, exist_ok=True)
    raw = os.path.join(d, "preview.mp3")
    open(raw, "wb").write(fetch(mp3, binary=True))
    wav = os.path.join(LIB, name + ".wav")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-ar", "48000", "-c:a", "pcm_s24le", wav], check=True)
    src = os.path.join(LIB, "_sources.json")
    with LOCK:
        rows = json.load(open(src, encoding="utf-8")) if os.path.exists(src) else []
        rows = [r for r in rows if r["file"] != name]
        rows.append(dict(file=name, freesound_id=int(sid), title=title, author=user, source=f"https://freesound.org/people/{user}/sounds/{sid}/",
                     licence="CC0 1.0", licence_url="https://creativecommons.org/publicdomain/zero/1.0/", duration_s=round(dur, 2),
                     note="Freesound HQ preview (mp3) of a CC0 sound, converted to 48 kHz WAV", description=desc, use=use))
        json.dump(rows, open(src, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(f"OK {name}.wav  <- {sid} '{title}' by {user}, {dur:.1f} s, CC0")
    return wav


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "search":
        mx = int(a[a.index("--max") + 1]) if "--max" in a else 10
        dur = a[a.index("--dur") + 1] if "--dur" in a else None
        for q in [x for i, x in enumerate(a[1:]) if not x.startswith("--") and a[i] not in ("--max", "--dur")]:
            print(f"== {q}")
            try:
                for r in search(q, mx, dur):
                    print(f"  {r['id']:>7} {r['dur']:7.1f}s dl{r['dl']:>5} | {r['title'][:60]} | {r['user']} | {r['desc'][:110]}")
            except Exception as e:
                print("  search failed:", e)
    elif a and a[0] == "get":
        get(a[1], a[2], a[3] if len(a) > 3 else "")
    elif a and a[0] == "batch":           # batch <list file>: lines of id|name|use, 6 at a time
        from concurrent.futures import ThreadPoolExecutor
        rows = [l.strip().split("|") for l in open(a[1], encoding="utf-8") if l.strip() and not l.startswith("#")]

        def one(r):
            try:
                if os.path.exists(os.path.join(LIB, r[1] + ".wav")) and "--force" not in a:
                    return f"have {r[1]}"
                return get(r[0], r[1], r[2] if len(r) > 2 else "") or f"FAILED {r}"
            except Exception as e:
                return f"FAILED {r[0]} {r[1]}: {e}"
        with ThreadPoolExecutor(6) as ex:
            for res in ex.map(one, rows):
                if str(res).startswith(("FAILED", "have")):
                    print(res)
    else:
        print(__doc__ or "usage: search | get")


def info(sid):
    page, user0 = page_of(sid)
    title = html.unescape((re.search(r'data-title="([^"]*)"', page) or [0, "?"])[1])
    dur = (re.search(r'data-duration="([^"]+)"', page) or [0, "?"])[1]
    user = user0
    d = re.search(r'id="soundDescriptionSection"[^>]*>(.*?)</div>', page, re.S)
    desc = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", d.group(1)))).strip() if d else ""
    tags = re.findall(r'href="/browse/tags/([^/"]+)/"', page)
    cc0 = CC0_URL in page
    print(f"{sid} | {title} | {user} | {dur}s | CC0={cc0}\n   {desc[:700]}\n   tags: {' '.join(dict.fromkeys(tags))[:300]}")


if __name__ == "__main__" and sys.argv[1:2] == ["info"]:
    for s in sys.argv[2:]:
        try:
            info(s)
        except Exception as e:
            print(s, "failed:", e)
