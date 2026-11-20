# Download the SURFACES CC0 library from Poly Haven into studio/public/kit/surfaces/<kit name>/
import json, os, sys, urllib.request, time
OUT = r"C:\Users\utkar\Desktop\animated-shorts-studio\studio\public\kit\surfaces"
# kit name, poly haven id, near (2k + 1k) or far-only (1k)
SETS = [
 ("brick_pavers", "short_bricks_floor", True), ("herringbone_pavers", "herringbone_pavement", False),
 ("cobbles", "cobblestone_floor_08", True), ("asphalt", "asphalt_02", True),
 ("concrete_sidewalk", "concrete_pavement", True), ("concrete_floor", "concrete_floor_worn_001", True),
 ("gravel", "gravel_stones", True), ("dirt_path", "dirt_floor", True), ("sand", "sand_01", False),
 ("rock", "rock_face_03", False), ("lawn_soil", "leafy_grass", True), ("leaf_litter", "forest_leaves_02", False),
 ("planks", "weathered_planks", True), ("wood_floor", "wood_floor_worn", True), ("floor_tiles", "floor_tiles_06", True),
 ("carpet", "dirty_carpet", False), ("plaster", "plastered_wall_04", True), ("painted_wall", "painted_plaster_wall", True),
 ("brick_wall", "brick_wall_09", True), ("painted_brick", "painted_brick", False), ("stone_wall", "stone_wall", True),
 ("stone_trim", "sandstone_blocks_08", False), ("roof_tiles", "clay_roof_tiles_02", False), ("roof_slates", "roof_slates_02", False),
 ("corrugated_metal", "corrugated_iron", False), ("painted_metal", "painted_metal_shutter", False), ("rusty_metal", "rusty_metal_02", False),
 ("marble", "marble_01", False), ("fabric", "fabric_pattern_07", False), ("concrete_wall", "concrete_wall_008", False), ("tunnel_concrete", "concrete_wall_006", True),
]
MAPS = [("Diffuse", "diff"), ("nor_gl", "nor_gl"), ("arm", "arm"), ("Displacement", "disp")]
def get(url):
    for k in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "kit-fetch/1.0"}), timeout=120) as r:
                return r.read()
        except Exception as e:
            print("retry", url, e, flush=True); time.sleep(3 + 5 * k)
    raise RuntimeError(url)
only = set(sys.argv[1:])
for name, pid, near in SETS:
    if only and name not in only: continue
    d = os.path.join(OUT, name); os.makedirs(d, exist_ok=True)
    info = json.loads(get(f"https://api.polyhaven.com/info/{pid}").decode("utf-8"))
    files = json.loads(get(f"https://api.polyhaven.com/files/{pid}").decode("utf-8"))
    dims = info.get("dimensions") or [2000, 2000]
    meta = {"name": name, "source": "Poly Haven", "id": pid, "url": f"https://polyhaven.com/a/{pid}",
            "authors": list((info.get("authors") or {}).keys()), "license": "CC0 1.0",
            "tileM": round(dims[0] / 1000.0, 3), "tileM_xy": [round(dims[0] / 1000.0, 3), round(dims[1] / 1000.0, 3)],
            "res": ["2k", "1k"] if near else ["1k"]}
    for res in meta["res"]:
        for key, short in MAPS:
            f = os.path.join(d, f"{name}_{short}_{res}.jpg")
            if os.path.exists(f) and os.path.getsize(f) > 1000: continue
            try:
                url = files[key][res]["jpg"]["url"]
            except KeyError:
                print("MISSING", name, key, res, flush=True); continue
            data = get(url); open(f, "wb").write(data)
    json.dump(meta, open(os.path.join(d, "meta.json"), "w"), indent=1)
    sz = sum(os.path.getsize(os.path.join(d, x)) for x in os.listdir(d)) / 1e6
    print("done", name, pid, meta["tileM"], meta["authors"], f"{sz:.1f} MB", flush=True)
print("ALL DONE")
