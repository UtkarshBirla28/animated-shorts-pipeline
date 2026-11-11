---
name: remotion-render
description: Export a Remotion video
version: 4.0.542
---

> **Local override (added 2026-11-10 by Claude for this PC; not part of the original skill).** The animated-shorts project
> `<ROOT>\studio` is pinned to Remotion **4.0.290**: never run `npx remotion upgrade`
> or add packages at another version, and check that any flag below exists in 4.0.290 before using it.
> Its three.js scenes need a real GPU WebGL context, so that project deliberately renders with system Chrome
> (`browserExecutable: C:/Program Files/Google/Chrome/Application/chrome.exe`, `gl: "angle"`, see scripts/bridge-stills.mjs
> and remotion.config.ts). Keep that unless the user asks otherwise. Set `REMOTION_TMP`/`TEMP` to a big folder (every bundle
> copies `public/`). Do not open Remotion Studio or play audio unless the user asks (agent runs must stay silent).

## General rendering strategy

Use Remotion's bundled browser for rendering, including compositions using
`<HtmlInCanvas>`. It includes the required browser APIs and Remotion's browser
fixes. Let Remotion download or update it as needed. Do not reuse a recording
browser or set `--browser-executable`, `browserExecutable`, or `chromeMode`
unless the user explicitly requests a different browser.

Render a video using:

```
npx remotion render
```

Full list of options: https://www.remotion.dev/docs/cli/render.md

Render a still using:

```
npx remotion still
```

Full list of options: https://www.remotion.dev/docs/cli/still.md

To render several frames as images in one call, use `render --frames`:

```
npx remotion render [composition-id] out/frames --frames=0,30,90 --image-format=png
```

See https://www.remotion.dev/docs/cli/render.md#--frames for more options.

## Transparent videos

See [Transparent videos](./transparent-videos.md) for rendering out a video with transparency.
