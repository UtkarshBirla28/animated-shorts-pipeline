# Choosing a different narrator voice (how James was chosen)

1. Shortlist: use the ElevenLabs MCP `search_voice_library` (free), or `tools/el_api.py shared "<query>" 30`. Download
   the preview mp3s into `study/voices/pool/` (this folder is gitignored).
2. Rank the previews against the channel voice profile (F0 ~195 Hz, ~14 st range, warm low-mids):
   `PYTHONNOUSERSITE=1 tools/.venv/Scripts/python.exe -s tools/voice_match.py study/voices/pool study/voices/pool_rank.json`.
3. Keep the top 4-6. Add library voices to My Voices (`el_api.py add <public_owner_id> <voice_id> "AT <name>"`;
   there are 10 slots). Generate the same 2-3 audition lines with each (the hook, a whisper line, a question plus an
   excited result line) on eleven_v4 and eleven_v3. That is about 1k credits in all.
4. Score them: `tools/voice_audit.py <folder>`. It checks Whisper accuracy, pace, pitch range, question rise,
   excitement, whisper drop and firm punch. Edit its script-specific line checks for the new audition text.
5. Give the user the top 2-3 as mp3 paths. **The user picks.** Claude cannot hear.
   The antitheft results are in `study/voices/*.json`. James on v4 scored 8.99: 174 Hz, 14.9 st, question +8.8 st,
   "8%!" +7.1 st, a real whisper.
