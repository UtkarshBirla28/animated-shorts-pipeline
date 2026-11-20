# Download ambientCG CC0 sets (zip per resolution) into public/kit/surfaces/<kit name>/ with the Poly Haven naming the
# kit loader expects: <n>_diff / _nor_gl / _arm (R AO, G roughness, B metalness) / _disp _<res>.jpg + kit.json + meta.json.
# Zips are unpacked into their own empty temp folder (untrusted data), only the JPGs are read.
import io, json, os, sys, time, zipfile, urllib.request, shutil, tempfile
from PIL import Image
OUT = r"C:\Users\utkar\Desktop\animated-shorts-studio\studio\public\kit\surfaces"
# kit name, ambientCG id, tileM (real metres per repeat, set from the texture content), resolutions
SETS = [("tactile_paving", "TactilePaving005", 0.9, ["2K", "1K"]), ("subway_tiles", "Tiles036", 1.2, ["2K", "1K"]),
        ("steel_brushed", "Metal012", 1.0, ["1K"]), ("vinyl_speckled", "Terrazzo005", 1.0, ["2K", "1K"]),
        ("ballast", "Gravel040", 1.6, ["2K", "1K"]), ("worktop_laminate", "Granite002A", 1.0, ["1K"])]
def get(url):
    for k in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kit-fetch/1.0"}), timeout=180) as r:
                return r.read()
        except Exception as e:
            print("retry", url, e, flush=True); time.sleep(3 + 5 * k)
    raise RuntimeError(url)
only = set(sys.argv[1:])
for name, aid, tileM, resl in SETS:
    if only and name not in only: continue
    d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
    for R in resl:
        r = R.lower()
        if os.path.exists(os.path.join(d, f"{name}_arm_{r}.jpg")): continue
        tmp = tempfile.mkdtemp(prefix="acg_")
        try:
            z = zipfile.ZipFile(io.BytesIO(get(f"https://ambientcg.com/get?file={aid}_{R}-JPG.zip")))
            files = {}
            for n in z.namelist():
                if not n.lower().endswith(".jpg") or "/" in n or "\\" in n or ".." in n: continue
                for key in ("Color", "NormalGL", "Roughness", "AmbientOcclusion", "Displacement", "Metalness"):
                    if n.endswith(f"_{key}.jpg"): files[key] = n
            def img(key, mode):
                return Image.open(io.BytesIO(z.read(files[key]))).convert(mode) if key in files else None
            col = img("Color", "RGB"); col.save(os.path.join(d, f"{name}_diff_{r}.jpg"), quality=92)
            img("NormalGL", "RGB").save(os.path.join(d, f"{name}_nor_gl_{r}.jpg"), quality=92)
            rough = img("Roughness", "L"); ao = img("AmbientOcclusion", "L"); met = img("Metalness", "L")
            W, H = rough.size
            ao = ao if ao else Image.new("L", (W, H), 255); met = met if met else Image.new("L", (W, H), 0)
            Image.merge("RGB", (ao, rough, met)).save(os.path.join(d, f"{name}_arm_{r}.jpg"), quality=92)
            dp = img("Displacement", "L")
            if dp: dp.save(os.path.join(d, f"{name}_disp_{r}.jpg"), quality=92)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    json.dump({"tileM": tileM}, open(os.path.join(d, "kit.json"), "w"))
    json.dump({"name": name, "source": "ambientCG", "id": aid, "url": f"https://ambientcg.com/a/{aid}", "authors": ["ambientCG (Lennart Demes)"],
               "license": "CC0 1.0", "tileM": tileM, "res": [x.lower() for x in resl]}, open(os.path.join(d, "meta.json"), "w"), indent=1)
    print("done", name, aid, flush=True)
print("ALL DONE")
