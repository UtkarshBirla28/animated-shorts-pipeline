# Download Poly Haven (CC0) models: python -I fetch_ph.py <out_root> <fmt gltf|blend> <res> id1 id2 ...
# Writes <out_root>/<id>/<files> and appends a line per asset to <out_root>/_fetched.tsv (id, url, authors, licence).
import json, os, sys, urllib.request
root, fmt, res, ids = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
UA = {"User-Agent": "kit-asset-fetch/1.0"}
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r: return r.read()
for aid in ids:
    try:
        info = json.loads(get(f"https://api.polyhaven.com/info/{aid}"))
        files = json.loads(get(f"https://api.polyhaven.com/files/{aid}"))
        f = files[fmt]; r = res if res in f else sorted(f.keys())[0]
        main = f[r][fmt]
        d = os.path.join(root, aid); os.makedirs(d, exist_ok=True)
        todo = [(main["url"], os.path.basename(main["url"]))] + [(v["url"], k) for k, v in main.get("include", {}).items()]
        tot = 0
        for url, rel in todo:
            p = os.path.join(d, rel.replace("/", os.sep)); os.makedirs(os.path.dirname(p), exist_ok=True)
            if not os.path.exists(p):
                b = get(url); open(p, "wb").write(b); tot += len(b)
        authors = ", ".join(info.get("authors", {}).keys())
        with open(os.path.join(root, "_fetched.tsv"), "a", encoding="utf8") as o:
            o.write(f"{aid}\thttps://polyhaven.com/a/{aid}\t{authors}\tCC0\t{fmt} {r}\n")
        print("ok", aid, r, round(tot / 1e6, 1), "MB", flush=True)
    except Exception as e:
        print("FAIL", aid, e, flush=True)
