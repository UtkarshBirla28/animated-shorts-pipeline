// PLACEHOLDER until the voice is locked: then run (repo root)
//   PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/gen_words_ts.py sound/<slug>/voice studio/src/videos3/<slug>/words.ts
// and re-generate the shot table: tools/v3/new_short_v3.py <slug> --shots
export type Word = { w: string; s: number; e: number; f: number; fe: number; p: number };
export const WORDS: Word[] = [];
