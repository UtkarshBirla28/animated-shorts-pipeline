#!/usr/bin/env python3
"""Pack everything needed to continue the POINTING v4 Short on another PC into ONE zip.

Run from anywhere:
    python make_handover_zip.py            # dry run: prints what would go in, with sizes
    python make_handover_zip.py --build    # writes the zip to the Desktop

What goes in: source code, kit assets, scripts, briefs, the locked script and facts, all sound
tools and paid voice takes, the yardstick films, research notes, reference Shorts, owner rules
(memory files), the handover notes. What stays out: node_modules, Python venvs, render caches,
temp folders, old renders of other videos, and every secret (API keys).
"""
import os, sys, time, zipfile, fnmatch

HOME = os.path.expanduser("~")
ROOT = os.path.dirname(os.path.abspath(__file__))
DESKTOP = os.path.dirname(ROOT)
TOP = "animated-shorts-studio"          # folder name inside the zip
OUT_ZIP = os.path.join(os.path.expanduser("~"), "Desktop", "POINTING_V5_HANDOVER_2026-11-20.zip")

# Folder names that never go in, wherever they are.
SKIP_DIRS = {"node_modules", ".venv", "venv", "__pycache__", ".git", "_remotion-tmp",
             "_remotion-tmp-sound", ".stills_slots", "_cache", ".cache", "chunks", "_chunks",
             "frames", "_frames", ".secrets", "_v3", "preview", "_backup_old"}
# File patterns that never go in.
SKIP_FILES = ["*.pyc", "*.tmp", "Thumbs.db", "desktop.ini", "*.lock.tmp", "*api_key*", "*.env", ".env*",
              "*.part", "*.crdownload"]

def rel(*p):  # path inside the project
    return os.path.join(ROOT, *p)

# (label, source path, path inside the zip, optional list of extra skip dir names, optional max file MB)
GROUPS = [
    # ---- the project itself
    ("root docs",        ROOT,                              TOP,                         "FILES_ONLY", None),
    ("handover",         rel("_handover"),                  TOP + "/_handover",          None, None),
    ("briefs",           rel("briefs"),                     TOP + "/briefs",             None, None),
    ("tools",            rel("tools"),                      TOP + "/tools",              None, None),
    ("skills",           rel("skills"),                     TOP + "/skills",             None, None),
    ("workflows",        rel("workflows"),                  TOP + "/workflows",          None, None),
    ("studio config",    rel("studio"),                     TOP + "/studio",             "FILES_ONLY", None),
    ("studio scripts",   rel("studio", "scripts"),          TOP + "/studio/scripts",     None, None),
    ("studio src",       rel("studio", "src"),              TOP + "/studio/src",         None, None),
    ("studio public",    rel("studio", "public"),           TOP + "/studio/public",      None, None),
    # ---- sound: this film, plus the older films used as yardsticks
    ("sound pointing",   rel("sound", "pointing"),          TOP + "/sound/pointing",     None, None),
    ("sound clown",      rel("sound", "clown"),             TOP + "/sound/clown",        None, 60),
    ("sound antitheft",  rel("sound", "antitheft"),         TOP + "/sound/antitheft",    None, 30),
    ("sound saladoil",   rel("sound", "saladoil"),          TOP + "/sound/saladoil",     "MD_ONLY", None),
    # ---- chosen outputs: reports, yardstick films, stills (never render caches)
    ("out pointing",     rel("studio", "out", "pointing"),  TOP + "/studio/out/pointing", None, 60),
    ("out pointing_v4",  rel("studio", "out", "pointing_v4"), TOP + "/studio/out/pointing_v4", None, 120),
    ("out pointing_cast", rel("studio", "out", "pointing_cast"), TOP + "/studio/out/pointing_cast", None, 120),
    ("out kit_vehicles", rel("studio", "out", "kit_vehicles"), TOP + "/studio/out/kit_vehicles", None, 30),
    ("out kit_home",     rel("studio", "out", "kit_home"),  TOP + "/studio/out/kit_home", None, 30),
    ("film antitheft",   rel("studio", "out", "antitheft"), TOP + "/studio/out/antitheft", "FINAL_ONLY", None),
    ("film clown",       rel("studio", "out", "clown", "upload"), TOP + "/studio/out/clown/upload", None, 200),
    ("owner previews",   rel("pointing_preview"),           TOP + "/pointing_preview",   None, 60),
    ("channel art",      rel("channel_art"),                TOP + "/channel_art",        None, 30),
    # ---- things that live OUTSIDE the project on this PC
    ("research notes",   os.path.join(DESKTOP, "_external", "research_notes") if os.path.isdir(os.path.join(DESKTOP, "_external", "research_notes")) else os.path.join(HOME, "research_notes"), "_external/research_notes", None, 40),
    ("reference shorts", os.path.join(DESKTOP, "yt short videos"), "_external/yt short videos", None, 200),
]

def skip_file(name):
    return any(fnmatch.fnmatch(name.lower(), pat.lower()) for pat in SKIP_FILES)

def walk_group(label, src, arc, mode, max_mb):
    """Yield (absolute path, path in zip, size)."""
    if not os.path.exists(src):
        print(f"  !! {label}: MISSING on this PC: {src}")
        return
    if mode == "FILES_ONLY":
        for name in sorted(os.listdir(src)):
            p = os.path.join(src, name)
            if os.path.isfile(p) and not skip_file(name):
                yield p, arc + "/" + name, os.path.getsize(p)
        return
    for dirpath, dirnames, filenames in os.walk(src):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if skip_file(name):
                continue
            if mode == "FINAL_ONLY" and "FINAL" not in name:
                continue
            if mode == "MD_ONLY" and not name.lower().endswith(".md"):
                continue
            p = os.path.join(dirpath, name)
            try:
                size = os.path.getsize(p)
            except OSError:
                continue
            if max_mb is not None and size > max_mb * 1024 * 1024:
                SKIPPED_BIG.append((p, size))
                continue
            r = os.path.relpath(p, src).replace(os.sep, "/")
            yield p, arc + "/" + r, size

SKIPPED_BIG = []
STORE_EXT = {".mp4", ".mp3", ".jpg", ".jpeg", ".png", ".webp", ".zip", ".glb", ".ktx2", ".webm", ".m4a", ".ogg", ".exr"}

def main():
    build = "--build" in sys.argv
    t0 = time.time()
    total = 0
    count = 0
    biggest = []
    zf = zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=3, allowZip64=True) if build else None
    seen = set()
    for label, src, arc, mode, max_mb in GROUPS:
        gsize = 0
        gcount = 0
        for p, a, size in walk_group(label, src, arc, mode, max_mb):
            if a in seen:
                continue
            seen.add(a)
            gsize += size
            gcount += 1
            biggest.append((size, a))
            if zf is not None:
                ext = os.path.splitext(p)[1].lower()
                try:
                    zf.write(p, a, compress_type=zipfile.ZIP_STORED if ext in STORE_EXT else zipfile.ZIP_DEFLATED)
                except (OSError, ValueError) as e:
                    print(f"  !! could not add {p}: {e}")
        total += gsize
        count += gcount
        print(f"{label:18s} {gcount:7d} files {gsize / 1e6:10.1f} MB")
    if zf is not None:
        start = os.path.join(ROOT, "_handover", "START_HERE.txt")
        if os.path.exists(start):
            zf.write(start, "START_HERE.txt")
        zf.close()
    print(f"{'TOTAL':18s} {count:7d} files {total / 1e6:10.1f} MB   ({time.time() - t0:.0f} s)")
    if SKIPPED_BIG:
        print("\nLeft out because they are over the size limit of their group (old renders, not needed):")
        for p, size in sorted(SKIPPED_BIG, key=lambda x: -x[1])[:40]:
            print(f"   {size / 1e6:8.1f} MB  {p}")
    if not build:
        print("\nThe 25 biggest files that WOULD go in:")
        for size, a in sorted(biggest, reverse=True)[:25]:
            print(f"   {size / 1e6:8.1f} MB  {a}")
        print("\nDry run only. Add --build to write", OUT_ZIP)
    else:
        print("\nWrote", OUT_ZIP, f"{os.path.getsize(OUT_ZIP) / 1e6:.0f} MB")

if __name__ == "__main__":
    main()
