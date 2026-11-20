#!/usr/bin/env bash
# side-by-side comparison: compare.sh <out.jpg> <label1> <img1> <label2> <img2> [<label3> <img3>] (each 540x960 + a label)
out=$1; shift
FONT="C\:/Users/utkar/Desktop/animated-shorts-studio/studio/public/fonts/Montserrat.ttf"
args=(); filt=""; i=0
while [ $# -ge 2 ]; do
  args+=(-i "$2")
  filt+="[$i:v]scale=540:960,drawtext=fontfile='$FONT':text='$1':x=14:y=14:fontsize=26:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=8[v$i];"
  i=$((i+1)); shift 2
done
st=""; for k in $(seq 0 $((i-1))); do st+="[v$k]"; done
ffmpeg -loglevel error -y "${args[@]}" -filter_complex "${filt}${st}hstack=inputs=$i" -q:v 3 "$out"
echo "$out"
