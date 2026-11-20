#!/usr/bin/env bash
# stills with a machine-wide slot limit (16 GB PC, many agents): at most 2 stills renders run at the same time.
# usage (from studio/): [PROPS='{"post":{"captions":false}}'] bash scripts/stills_locked.sh <out prefix> <frames> [scale]
# Same arguments as scripts/stills.mjs. Waits for a free slot (up to 30 min), runs, always frees its slot.
cd "$(dirname "$0")/.."
SLOTS=${STILLS_SLOTS:-2}
dir=out/.stills_slots; mkdir -p "$dir"
mine=""
for try in $(seq 1 900); do
  for k in $(seq 1 "$SLOTS"); do
    s="$dir/slot$k"
    # a slot older than 20 minutes is stale (its owner died): clear it
    if [ -d "$s" ] && [ $(( $(date +%s) - $(stat -c %Y "$s" 2>/dev/null || echo 0) )) -gt 1200 ]; then rmdir "$s" 2>/dev/null || rm -rf "$s"; fi
    if mkdir "$s" 2>/dev/null; then mine="$s"; break; fi
  done
  [ -n "$mine" ] && break
  sleep 2
done
if [ -z "$mine" ]; then echo "stills_locked: no free slot after 30 min"; exit 1; fi
trap 'rmdir "$mine" 2>/dev/null' EXIT
node scripts/stills.mjs "$@"
