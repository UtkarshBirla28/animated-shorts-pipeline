# Channel numbers (16 reference shorts, measured 2026-11-10)

Automatic measurements from tools/measure_video.py + voice_pitch.py; `*_verified` = corrected by the breakdown agent after looking at the frames. Shot/transition counts from the detector are approximate (dissolves inside moves, effects and caption swaps fool it); prefer the verified columns and the per-video reports.

| video | dur | shots_auto | shots_verified | median_shot_auto | median_shot_verified | dissolves | hard | dissolve_frames_med | words | wps | first_word | tail | pauses | lufs | lra | tp | bed_vs_voice | f0 | f0_p10 | f0_p90 | L | Lstd | chroma | warm_b | edges | moving_shot_frac |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| an-unstoppable-spear-vs-an-unbreakable-shield | 45.0 | 12 | 8 | 2.42 | 4.54 | 7 | 4 | 8 | 165 | 3.67 | 0.0 | 0.1 | 1 | -15.1 | 2.3 | -3.1 |  | 182.7 | 127.7 | 285.0 | 46.6 | 17.8 | 28.5 | 0.8 | 0.075 | 0.83 |
| every-memory-has-a-price | 77.8 | 13 | 23 | 5.73 | 3.18 | 9 | 3 | 6 | 295 | 3.8 | 0.0 | 0.12 | 3 | -14.1 | 1.9 | -2.0 |  | 188.2 | 131.6 | 264.3 | 35.3 | 21.0 | 31.2 | -15.9 | 0.0753 | 1.0 |
| levels-of-pirate-cannonballs | 63.5 | 18 | 9 | 2.42 | 6.2 | 13 | 4 | 6 | 220 | 3.47 | 0.0 | 0.12 | 0 | -14.0 | 2.1 | -1.9 |  | 198.0 | 131.6 | 297.8 | 50.9 | 17.3 | 27.6 | 6.3 | 0.0818 | 0.83 |
| the-ancient-jar-that-warned-an-empire | 64.8 | 19 | 24 | 2.27 | 2.36 | 15 | 3 | 5 | 235 | 3.62 | 0.0 | -0.03 | 1 | -14.1 | 2.1 | -2.2 |  | 182.2 | 126.6 | 284.2 | 43.8 | 18.6 | 25.2 | -1.3 | 0.1205 | 0.95 |
| the-burglar-who-only-moved-furniture | 58.4 | 15 | 18 | 3.73 | 2.67 | 14 | 0 | 5.0 | 237 | 4.06 | 0.0 | 0.03 | 0 | -14.1 | 1.7 | -2.1 |  | 177.5 | 120.4 | 268.2 | 53.6 | 21.7 | 38.3 | -13.4 | 0.0766 | 0.87 |
| the-job-nobody-wants-in-japan | 60.5 | 26 | 20 | 2.17 | 2.54 | 21 | 4 | 6 | 224 | 3.71 | 0.0 | 0.14 | 2 | -14.1 | 1.8 | -2.1 | -0.5 | 199.0 | 130.4 | 278.8 | 56.1 | 20.3 | 33.2 | -8.7 | 0.0665 | 0.96 |
| the-science-behind-slot-machines | 30.9 | 9 | 7 | 2.73 | 3 | 7 | 1 | 5 | 112 | 3.63 | 0.0 | 0.09 | 2 | -15.1 | 2.5 | -2.7 |  | 193.5 | 133.3 | 300.1 | 45.4 | 25.1 | 35.6 | 23.8 | 0.1321 | 1.0 |
| the-window-that-breaks-japan-s-gambling-law | 45.0 | 14 | 13 | 2.68 | 2.8 | 11 | 2 | 5 | 161 | 3.57 | 0.0 | -0.03 | 2 | -14.3 | 2.4 | -1.3 | -0.0 | 209.7 | 131.0 | 297.5 | 34.2 | 22.4 | 26.6 | -2.4 | 0.0887 | 1.0 |
| this-knight-found-the-ultimate-loophole | 40.6 | 16 | 17 | 2.4 | 1.97 | 15 | 0 | 6 | 158 | 3.9 | 0.0 | 0.07 | 1 | -15.0 | 2.4 | -3.0 |  | 209.8 | 139.3 | 309.1 | 57.6 | 21.3 | 29.8 | 11.8 | 0.0959 | 0.94 |
| this-tree-hates-you | 68.1 | 26 | 20 | 1.67 | 2.78 | 18 | 7 | 7.0 | 235 | 3.48 | 0.0 | 0.5 | 5 | -16.1 | 3.1 | -3.3 |  | 211.4 | 147.7 | 307.3 | 45.7 | 18.2 | 29.2 | -5.2 | 0.0787 | 0.85 |
| what-if-humans-invented-teleportation | 54.1 | 23 | 23 | 1.87 | 1.9 | 22 | 0 | 6.0 | 198 | 3.66 | 0.0 | 0.04 | 3 | -14.1 | 2.5 | -2.7 |  | 183.5 | 70.1 | 292.9 | 50.0 | 21.5 | 19.8 | -6.0 | 0.0596 | 0.87 |
| what-the-grave-bell-really-meant | 59.5 | 9 | 16 | 6.2 | 2.96 | 8 | 0 | 8.0 | 220 | 3.71 | 0.0 | 0.14 | 2 | -14.0 | 2.3 | -1.9 |  | 180.4 | 120.1 | 276.0 | 47.4 | 21.5 | 32.8 | 1.2 | 0.1067 | 1.0 |
| why-humans-can-t-pick-random-numbers | 47.1 | 9 | 10 | 4.07 | 3.84 | 7 | 1 | 6 | 166 | 3.52 | 0.0 | -0.02 | 2 | -15.1 | 2.6 | -2.7 |  | 209.7 | 138.9 | 316.7 | 58.7 | 20.3 | 24.9 | 15.9 | 0.1117 | 1.0 |
| why-sailors-carried-storm-oil | 64.6 | 27 | 16 | 1.33 | 3.73 | 20 | 6 | 4.0 | 246 | 3.82 | 0.0 | 0.09 | 0 | -14.0 | 2.4 | -2.1 |  | 209.5 | 141.7 | 291.8 | 41.8 | 21.0 | 49.0 | -17.4 | 0.0784 | 0.89 |
| why-the-second-draw-always-wins | 56.1 | 16 | 11 | 3.49 | 5.5 | 10 | 5 | 6.0 | 219 | 3.91 | 0.0 | 0.07 | 3 | -14.0 | 1.7 | -2.4 |  | 197.1 | 139.0 | 289.9 | 44.4 | 21.3 | 28.9 | -2.4 | 0.058 | 0.88 |
| would-you-upload-your-brain | 56.9 | 21 | 18 | 1.63 | 2.42 | 15 | 5 | 6 | 215 | 3.79 | 0.0 | 0.21 | 1 | -15.0 | 1.8 | -3.0 |  | 174.3 | 71.3 | 281.0 | 65.0 | 21.1 | 21.9 | 3.8 | 0.0672 | 1.0 |

## Medians across videos

- **dur**: median 57.6, min 30.9, max 77.8 (n=16)
- **shots_auto**: median 16, min 9, max 27 (n=16)
- **shots_verified**: median 16.5, min 7, max 24 (n=16)
- **median_shot_auto**: median 2.42, min 1.33, max 6.2 (n=16)
- **median_shot_verified**: median 2.88, min 1.9, max 6.2 (n=16)
- **dissolves**: median 13.5, min 7, max 22 (n=16)
- **hard**: median 3, min 0, max 7 (n=16)
- **dissolve_frames_med**: median 6, min 4, max 8 (n=16)
- **words**: median 220, min 112, max 295 (n=16)
- **wps**: median 3.69, min 3.47, max 4.06 (n=16)
- **first_word**: median 0, min 0, max 0 (n=16)
- **tail**: median 0.09, min -0.03, max 0.5 (n=16)
- **pauses**: median 2, min 0, max 5 (n=16)
- **lufs**: median -14.1, min -16.1, max -14 (n=16)
- **lra**: median 2.3, min 1.7, max 3.1 (n=16)
- **tp**: median -2.3, min -3.3, max -1.3 (n=16)
- **bed_vs_voice**: median -0.25, min -0.5, max -0 (n=2)
- **f0**: median 195, min 174, max 211 (n=16)
- **f0_p10**: median 131, min 70.1, max 148 (n=16)
- **f0_p90**: median 291, min 264, max 317 (n=16)
- **L**: median 47, min 34.2, max 65 (n=16)
- **Lstd**: median 21.1, min 17.3, max 25.1 (n=16)
- **chroma**: median 29, min 19.8, max 49 (n=16)
- **warm_b**: median -1.85, min -17.4, max 23.8 (n=16)
- **edges**: median 0.0786, min 0.058, max 0.132 (n=16)
- **moving_shot_frac**: median 0.945, min 0.83, max 1 (n=16)
