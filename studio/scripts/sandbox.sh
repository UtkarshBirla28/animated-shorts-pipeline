#!/usr/bin/env bash
# Owner sandboxes for the CURRENT short (scripts/short.mjs: env SHORT/COMPFILE or ../.short.json).
# sandbox.sh make <name>             : copy src/videos/$SHORT -> src/videos/${SHORT}_<name> + entry src/sandboxes/<name>/index.ts
# sandbox.sh sync <name>             : refresh a sandbox from main (overwrites everything in the sandbox)
# sandbox.sh merge <name> <file...>  : copy the owner's files from the sandbox back to main (backs main up first)
# Owner names used by the workflows: world_ext, world_int, char, post, cam (AUDIO works in sound/$SHORT/audio directly).
set -e
cd "$(dirname "$0")/.."
eval "$(node scripts/short.mjs --sh)"
cmd=$1; n=$2; shift 2 || true
M=src/videos/$SHORT
S=src/videos/${SHORT}_$n
case $cmd in
  make|sync)
    rm -rf "$S"; cp -r "$M" "$S"
    mkdir -p src/sandboxes/$n
    cat > src/sandboxes/$n/index.ts <<EOT
import { registerRoot } from "remotion";
import { Root } from "./Root";
registerRoot(Root);
EOT
    cat > src/sandboxes/$n/Root.tsx <<EOT
import React from "react";
import { Composition } from "remotion";
import { $COMP_ID, $FRAMES_CONST } from "../../videos/${SHORT}_$n/$COMPFILE";
export const Root: React.FC = () => (
  <Composition id="$COMP_ID" component={$COMP_ID} durationInFrames={$FRAMES_CONST} fps={30} width={1080} height={1920} />
);
EOT
    echo "sandbox $n ready: ENTRY=src/sandboxes/$n/index.ts node scripts/stills.mjs out/$SHORT/$n/x_ <frames> 0.5";;
  merge)
    ts=$(date +%Y%m%d_%H%M%S); mkdir -p backup/${SHORT}_$ts; cp -r "$M"/* backup/${SHORT}_$ts/
    for f in "$@"; do cp -f "$S/$f" "$M/$f"; echo "merged $f"; done;;
  *) echo "usage: sandbox.sh make|sync|merge <name> [files...]"; exit 1;;
esac
