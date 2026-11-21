#!/usr/bin/env python3
"""Copy this studio's code and text into a checkout of the GitHub repo (animated-shorts-pipeline), ready to commit.

Usage (from the studio root, Git Bash):
    tools/.venv/Scripts/python.exe -s tools/repo_sync.py <checkout_dir> [--dry-run]

Rules:
- A file the checkout already tracks is always brought up to date (whatever its type).
- A NEW file is added only if it is text (code, notes, json ...), at most 1.5 MB, and not in a skipped folder.
- Media, renders, frames, packages, temp bundles, reference downloads and anything that looks like a secret are never
  copied. The checkout's own .gitignore still applies when you `git add -A` afterwards.
- Nothing is deleted in the checkout; files it tracks that no longer exist here are only listed.
Then: review `git -C <checkout> status`, commit with the personal identity, push (see LESSONS / memory notes).
"""
import fnmatch
import filecmp
import os
import shutil
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent
SKIP_ANYWHERE = ["node_modules", ".venv", "__pycache__", ".git", "_remotion-tmp*"]  # folder names at any depth
SKIP_PATHS = [  # folder paths from the studio root
    "studio/out", "studio/backup", "studio/_downloads", "out", "kit_preview", "lookpilot", "channel_art",
    "pointing_preview", "study/videos", "study/voices/pool", "upstream", "repo", "_handover/memory",
    "sound/*/audio/_cache", "sound/*/audio/_bak*",
]
NEW_ONLY_IF_TRACKED = ["studio/public"]  # assets travel separately; only already-tracked files there are updated
TEXT_EXT = {
    ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".py", ".md", ".txt", ".ps1", ".sh", ".bat", ".cmd", ".yml",
    ".yaml", ".toml", ".css", ".html", ".csv", ".glsl", ".frag", ".vert", ".ini", ".cfg", ".ignore", ".rgignore",
}
SECRET = ["*api_key*", "*.key", ".env", "*secret*", "*token*.txt"]
MAX_NEW = 1_500_000


def skipped_dir(rel: str) -> bool:
    base = rel.rsplit("/", 1)[-1]
    return (any(fnmatch.fnmatch(base, pat) for pat in SKIP_ANYWHERE)
            or any(fnmatch.fnmatch(rel, pat) for pat in SKIP_PATHS))


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    dst = Path(sys.argv[1]).resolve()
    dry = "--dry-run" in sys.argv
    if not (dst / ".git").exists():
        sys.exit(f"{dst} is not a git checkout")
    tracked = set(subprocess.run(["git", "-C", str(dst), "ls-files", "-z"], capture_output=True, text=True,
                                 check=True).stdout.split("\0")) - {""}
    updated, added, big = [], [], []
    for root, dirs, files in os.walk(SRC):
        rel_root = Path(root).relative_to(SRC).as_posix()
        rel_root = "" if rel_root == "." else rel_root
        dirs[:] = [d for d in dirs if not skipped_dir(f"{rel_root}/{d}".lstrip("/"))]
        for name in files:
            rel = f"{rel_root}/{name}".lstrip("/")
            if any(fnmatch.fnmatch(name.lower(), p) for p in SECRET):
                continue
            src = SRC / rel
            out = dst / rel
            if rel in tracked:
                if not out.exists() or not filecmp.cmp(src, out, shallow=False):
                    updated.append(rel)
                    if not dry:
                        out.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(src, out)
                continue
            if any(rel.startswith(p + "/") for p in NEW_ONLY_IF_TRACKED):
                continue
            ext = Path(name).suffix.lower() or ("." + name.lstrip(".") if name.startswith(".") else "")
            if ext not in TEXT_EXT:
                continue
            parts = rel.split("/")
            if (len(parts) > 4 and parts[0] == "sound" and parts[2].startswith("voice")
                    and ext not in {".py", ".md", ".ps1", ".sh"}):
                continue  # per-take measurement data deep inside voice folders: regenerated, not worth committing
            if src.stat().st_size > MAX_NEW:
                big.append((rel, src.stat().st_size))
                continue
            if not out.exists() or not filecmp.cmp(src, out, shallow=False):
                added.append(rel)
                if not dry:
                    out.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, out)
    missing = sorted(t for t in tracked if not (SRC / t).exists())
    print(f"{'DRY RUN: ' if dry else ''}updated {len(updated)} tracked files, added {len(added)} new text files")
    for rel, size in big:
        print(f"  skipped (over 1.5 MB): {rel} ({size / 1e6:.1f} MB)")
    print(f"  {len(missing)} tracked files do not exist in the studio (left alone; repo-only docs or old files)")
    if "--list" in sys.argv:
        for rel in added:
            print("  +", rel)


if __name__ == "__main__":
    main()
