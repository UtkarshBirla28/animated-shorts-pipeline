// PLACEHOLDER (v4): VOICE alone writes this file when the v4 voice is locked:
//   PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/gen_words_ts.py sound/pointing/voice_v4 studio/src/videos3/pointing/v4/words.ts
// Until then the v4 clock runs on plan_words.ts (the script's planned times). The v3 film keeps ../words.ts.
export type Word = { w: string; s: number; e: number; f: number; fe: number; p: number };
export const WORDS: Word[] = [];
