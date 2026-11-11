#!/usr/bin/env bash
# CAM sandbox: contact sheet of chosen frames from a rendered clip.
# usage: scripts/cam_sheet.sh <video> <out.jpg> <firstFrameOfVideo> <cols> <frame> [frame ...]
set -e
vid="$1"; out="$2"; base="$3"; cols="$4"; shift 4
tmpd="$(dirname "$out")/_sheet_tmp_$$"
mkdir -p "$tmpd"
i=0
for f in "$@"; do
  t=$(awk -v f="$f" -v b="$base" 'BEGIN{printf "%.4f", (f-b)/30 + 0.001}')
  ffmpeg -loglevel error -y -ss "$t" -i "$vid" -frames:v 1 -vf "scale=${TILEW:-270}:-2" "$tmpd/$(printf %03d $i).png"
  i=$((i+1))
done
ffmpeg -loglevel error -y -pattern_type sequence -i "$tmpd/%03d.png" -vf "tile=${cols}x$(( (i + cols - 1) / cols )):padding=4:color=black" -frames:v 1 "$out"
rm -rf "$tmpd"
echo "sheet $out ($i frames)"
