#!/usr/bin/env bash
# render_chunks.sh <out_prefix> <scale> <conc> <a-b> [<a-b> ...]
# Renders each frame range to <out_prefix>_<a>-<b>.mp4 in its own process (memory is freed between chunks); a chunk
# whose file already exists (and has a "done" marker) is skipped, so a killed run resumes where it stopped.
# Then concatenates the chunks (stream copy) into <out_prefix>.mp4.
set -e
cd "$(dirname "$0")/.."
pre=$1; scale=$2; conc=$3; shift 3
list="${pre}_chunks.txt"; : > "$list"
for r in "$@"; do
  f="${pre}_${r}.mp4"
  if [ -f "$f.done" ]; then echo "skip $r (done)"; else
    rm -f "$f"; node scripts/render.mjs "$f" "$scale" "$conc" "$r" && touch "$f.done"
  fi
  echo "file '$(basename "$f")'" >> "$list"
done
ffmpeg -v error -y -f concat -safe 0 -i "$list" -c copy "${pre}.mp4"
echo "concat -> ${pre}.mp4"
