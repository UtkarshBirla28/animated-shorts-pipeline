#!/usr/bin/env bash
# stills with a machine-wide slot limit (4-core / 16 GB PC, many agents).
# usage (from studio/): [PROPS='{"post":{"captions":false}}'] bash scripts/stills_locked.sh <out prefix> <frames> [scale]
# Same arguments as scripts/stills.mjs. Waits for a free slot (first come first served, up to 2 h), runs, frees it.
# Slots (pipeline, 2026-11-20): 2 stills at a time when no video render runs; ONLY 1 while a video render holds the RAM
# token (scripts/ram_token.sh: C:\Users\utkar\Desktop\RAM_TOKEN.txt, younger than 100 min), because 4 cores thrash with
# a render + 2 stills. A still already running is never stopped; new ones queue. STILLS_SLOTS=<n> overrides the idle limit.
cd "$(dirname "$0")/.."
IDLE_SLOTS=${STILLS_SLOTS:-2}
RAM_TOKEN="/c/Users/utkar/Desktop/RAM_TOKEN.txt"
dir=out/.stills_slots; mkdir -p "$dir"
me="${RAM_ME:-?}"
mine=""
video_render() { # prints the token owner when a (non-stale) video render holds the RAM token
  [ -f "$RAM_TOKEN" ] || return 1
  local age=$(( ( $(date +%s) - $(stat -c %Y "$RAM_TOKEN" 2>/dev/null || echo 0) ) / 60 ))
  [ "$age" -lt 100 ] || return 1
  cut -d' ' -f1 "$RAM_TOKEN" 2>/dev/null
}
busy_list() { local out="" s; for s in "$dir"/slot*; do [ -d "$s" ] || continue; out="$out $(basename "$s")=$(cut -d' ' -f1 "$s/owner" 2>/dev/null || echo '?')"; done; echo "${out:- none}"; }
# FIFO: every waiter holds a ticket out/.stills_slots/q/<time>.<pid>; only the oldest live ticket may take a free slot
q="$dir/q"; mkdir -p "$q"; ticket="$q/$(date +%s%N).$$"; : > "$ticket"
trap 'rm -f "$ticket" 2>/dev/null' EXIT
first_in_line() {
  local f p
  for f in $(ls "$q" 2>/dev/null | sort); do
    p=${f##*.}
    if [ "$q/$f" = "$ticket" ]; then return 0; fi
    if kill -0 "$p" 2>/dev/null; then return 1; fi
    rm -f "${q:?}/${f:?}" 2>/dev/null   # a dead waiter
  done
  return 0
}
last_msg=0
for try in $(seq 1 3600); do
  vr=$(video_render)
  if [ -n "$vr" ]; then SLOTS=1; else SLOTS=$IDLE_SLOTS; fi
  # stale slots: an owned slot whose process is gone (or older than 2 h); an ownerless one (made by the old limiter)
  # older than 20 minutes; claim folders of dead processes
  for s in "$dir"/slot* "$dir"/.claim.*; do
    [ -d "$s" ] || continue
    age=$(( $(date +%s) - $(stat -c %Y "$s" 2>/dev/null || echo 0) ))
    pid=$(cut -d" " -f2 "$s/owner" 2>/dev/null)
    case "$pid" in ""|*[!0-9]*) pid="";; esac
    if [ -n "$pid" ]; then { ! kill -0 "$pid" 2>/dev/null || [ "$age" -gt 7200 ]; } && rm -rf "$s" 2>/dev/null
    elif [ "$age" -gt 1200 ]; then rm -rf "$s" 2>/dev/null; fi
  done
  # count busy slots (any slotN dir, also ones above the current limit) and take slot1..SLOTS if under the limit
  busy=0; for s in "$dir"/slot*; do [ -d "$s" ] && busy=$((busy + 1)); done
  if [ "$busy" -lt "$SLOTS" ] && first_in_line; then
    for k in $(seq 1 "$IDLE_SLOTS"); do
      s="$dir/slot$k"
      # atomic claim WITH its owner file: build the slot under a private name, then rename it into place (mv -T fails
      # when slotN already exists with an owner file in it)
      [ -e "$s" ] && continue
      t="$dir/.claim.$$.$k"; rm -rf "$t"; mkdir -p "$t" && echo "$me $$ $(date '+%H:%M:%S')" > "$t/owner"
      if [ ! -e "$s" ] && mv -T "$t" "$s" 2>/dev/null && [ "$(cut -d' ' -f2 "$s/owner" 2>/dev/null)" = "$$" ]; then
        # re-check the limit after taking (two takers at once): back off if over it
        n=0; for x in "$dir"/slot*; do [ -d "$x" ] && n=$((n + 1)); done
        if [ "$n" -gt "$SLOTS" ] && [ "$k" -gt 1 ]; then rm -rf "$s"; break; fi
        mine="$s"; break
      fi
      rm -rf "$t" 2>/dev/null
    done
  fi
  [ -n "$mine" ] && break
  now=$(date +%s)
  if [ $((now - last_msg)) -ge 30 ]; then
    echo "stills_locked: queued ($(date +%H:%M:%S)): limit $SLOTS slot(s)${vr:+ because a video render by '$vr' holds the RAM token}; busy:$(busy_list); $(ls "$q" 2>/dev/null | wc -l) in line"
    last_msg=$now
  fi
  sleep 2
done
rm -f "$ticket" 2>/dev/null
if [ -z "$mine" ]; then echo "stills_locked: no free slot after 2 h"; exit 1; fi
trap 'rm -rf "$mine" 2>/dev/null' EXIT
node scripts/${STILLS_SCRIPT:-stills.mjs} "$@"
