# PIPELINE SPEED NOTES (pipeline agent, 2026-11-20)

Goal: faster stills / renders, same pixels, nothing breaks for the 6 agents using the scripts.

## log
- 23:40 done: read scripts. GPU ALREADY NVIDIA: every render_log note says `kit GPU: ANGLE (NVIDIA, GeForce GTX 1660 Ti
  Direct3D11)`; page render (kit-ms) median ~90-110 ms/frame while wall is 2.7-4.6 s/frame -> time is outside the GL work.
- 23:45 done: source hashing. Old = 2 + N_sets esbuild runs (60 s measured under load, the first run alone 30 s).
  New = ONE esbuild run + graph walk of its metafile (12 ms) + a cache of the file lists keyed by the sources' size+mtime.
  `--verify-hash` on all 38 shots: hashes IDENTICAL to the old per-set runs.
- 23:50 done: `scripts/bundle_cache.mjs` (shared bundle, key = size+mtime of studio/src code files + package files; public/
  is a junction, not a 567 MB copy; lock + build-into-temp + rename; users/pid markers; sweep keeps 3 newest / 2 h / live
  users; junction unlinked before any delete; rmSync tested NOT to follow junctions). Copies: `kit_render_fast.mjs`
  (+ `--bundle <dir>`, `--bundle-only`, `--dry-run`, `--verify-hash`, KIT_PROFILE=1), `stills_fast.mjs` (shared
  bundle + one Chrome per call), `stills_locked_fast.sh` (1 slot while a video render holds the RAM token, else 2;
  queue message), `render_fast.mjs`.
- FINDING: agents edit src every 1-3 min, so the bundle key changes often; reuse only hits between edits. A rebuild is
  now webpack only (~20-50 s; no public copy) and only ONE process builds a given key, the others wait for it.
- 00:05 done: byte compare (sources unchanged during the test): shared bundle files IDENTICAL to a normal bundle()
  (bundle.js, maps, index.html); normal 75.8 s vs shared build 22.9 s at that moment.
- 00:10 changed: public/ is now HARD-LINKED file by file (not a junction: PowerShell 5.1 `Remove-Item -Recurse` can follow
  junctions and would wipe studio/public). The key now includes size+mtime of every public file. If a source changes
  WHILE webpack runs, the bundle is used privately by that call and never shared (no mixed bundle under a key);
  waiters re-key after a builder finishes. `--bundle <dir>` refuses to render shot chunks from a stale bundle.
- 00:12 measured OLD stills call (2 stills, lab 60 + steam 1080, under load): 189 s (bundle 82 s, stills 46 + 24 s).
- 00:29 SWAPPED (lead's order): kit_render.mjs, stills.mjs, render.mjs, stills_locked.sh (backups *.bak_0029); brief
  note posted. 01:02 second swap (kit_render: KIT_PROFILE uses the CJS renderer so the per-frame timer works; limiter:
  atomic slot claim WITH owner file via mv -T, owned slot reclaimed when its pid is dead, ownerless legacy after 20 min).
  Chrome profile sweep (puppeteer_dev_chrome_profile-* > 30 min, not locked, renamed away before delete) runs in every
  getBundle: 408 -> 86 folders (the rest young / in use).
- 01:10 PROFILE (frozen bundle 96a4c..., conc 1, draft, laptop under load from other agents):
  lab v02 60-79: steady 2.14 s/frame = seek 313 ms + CAPTURE 1584 ms (+ ~250 ms encode/IPC); kit-ms 118 ms.
  steam v22 1080-1099: steady 1.31 s/frame = seek 197 ms + capture 191 ms (+ rest); kit-ms 23 ms.
  GPU-synced kit profile (props prof:1): lab subframe 15 ms GPU + 29 ms CPU updates; steam 9 + 8 ms. => the GL work is
  tiny. The lab's capture cost = deferred work flushed at screenshot time: ~20 card canvases (900x1500) REDRAWN EVERY
  FRAME (kit/cards/card.ts key = `${t}`), 2 canvas blur filters each, 3 texImage2D uploads each (+ mipmaps, aniso 8).
  conc 2: lab steady 2.88 (no gain), steam 0.80 (vs 1.17); min free RAM 2.2-2.9 GB either way.
  conc1 vs conc2 frames NOT identical (max diff ~50, 3-4 % px > 8) -> still checking whether conc1 vs conc1 differs too.
- 01:20 determinism: lab conc1 run A == run B (bit-identical, 20 frames). steam conc1 A != B (max ~50, 2-5 % px):
  the steam set is NOT deterministic run to run (use lab for identity tests). conc 2 changes lab pixels -> NOT a safe
  drop-in, and it gives no speed in the lab (2.88 vs 2.75 s/frame). Keep --conc 1.
- 01:20 Chrome CPU per process (WMI, during a 20-frame lab render + other agents' stills): EVERY Chrome's gpu-process
  burns ~88 CPU-seconds (7 stills Chromes in 3.5 min: 87-88 s each; their renderers 6-12 s). The render's gpu-process:
  126 CPU-s. => the team-wide CPU hog is the Chrome GPU process: ANGLE/D3D11 HLSL shader compiles (fresh profile = no
  shader cache, the X3595 warnings) + per-frame card-canvas raster/blur/upload work in the lab.
- 01:45 Chrome shader-cache seeding (copy a warm GPUCache/GrShaderCache into each new profile): pixels identical but
  NO gain (lab compile 15.7 s cold vs 12.0 / 18.9 s seeded). Dropped, files removed.
- 01:55 SWAPPED: stills.mjs = one Chrome for all stills of a call (lab 60/300/700 bit-identical to a Chrome per still;
  109 s vs 153 s for 3 stills); stills_locked.sh = FIFO tickets, 2 h wait, guarded rm. Backups *.bak_0154/0155.
  Test scripts, *_fast copies and out/pointing_v4_pipeline removed.
- 02:47 stills page reuse (lead's ask): stills.mjs KIT_STILLS_PAGE=reuse keeps the first still's page + one static
  server and only seeks + captures later stills (renderStill's setup steps patched in the CJS renderer). 10 lab
  stills (60..520, frozen bundle 96a4c...): reuse 30.5 s + 2.3-4.9 s each = 102 s call; page per still 32.9 s + 11-27 s
  each = 223 s call. Frame 60 identical; frames 100-520 DIFFER (max 12-150, 0.02-4 % px > 8): the kit keeps per-page
  state (shot activation: GI probe / card lighting taken at the first frame the page visits in a shot), so a still
  depends on what the page rendered before. Left OPT-IN, default unchanged. Note the same effect means a fresh-page
  still of frame f can differ from the video's frame f unless f is the first frame of its shot.
- OPEN (for the lead / kit owner, needs TS changes): the lab capture cost (~1.6-2 s of a 2.1-2.9 s frame) = card
  canvases redrawn + blurred + uploaded every frame in the GPU process. Idea: redraw a card only when its drawing
  changes (a pose key instead of `${t}`), and/or smaller card canvases at draft. Not done: kit code, changes pictures
  or needs the owner's word. (seek vs capture) on lab 60-79 + steam 1080-1099 (queued on the RAM token behind the director);
  byte-compare the shared bundle against a normal bundle() of the same sources; compare stills old vs new; then swap.
