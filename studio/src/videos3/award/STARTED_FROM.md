# The Award That Made Kids Miss School (award): a v3 kit film (PIPELINE_V3.md)
- GENERATED (never hand-edit): shots.ts (from the bible: `tools/v3/new_short_v3.py award --shots`), words.ts (tools/gen_words_ts.py).
- LEAD: briefs/v3/award/bible.json (the source of truth), film.ts, Root.tsx, FilmView.tsx, Captions.tsx (PUNCH words).
- BUILDERS (workflows/v3/build_v3.js, one per set / set group): sets/<set>.ts (blockout -> kit) and sets/<set>.cams.ts (the
  marks + params of the shots on that set), cast staging inside their sets; nothing else (never studio/src/kit/*).
- Typecheck: cd studio && npx tsc --noEmit -p src/videos3/award/tsconfig.json
- Stills: node ../tools/v3/storyboard.mjs --slug award   | Renders: node scripts/kit_render.mjs --entry src/videos3/award/index.ts --comp AwardKit --quality preview --shots all --out out/award/
