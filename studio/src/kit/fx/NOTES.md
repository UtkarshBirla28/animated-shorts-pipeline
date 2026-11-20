# kit/fx (NATURE owner)
Full notes (API, costs, gaps): `../nature/NOTES.md`. Quick API (all pure functions of t, seeded, `{ on, density, seed }`):
`motes(ctx, { box })`, `puffs(ctx, { events: [{ t, pos }] })`, `smoke(ctx, { pos })`, `steam(ctx, { pos })`,
`sparks(ctx, { pos, dir })`, `embers(ctx, { pos })`, `fireflies(ctx, { box })`, `rain(ctx, { box, splashes })` +
`wetHook(material, key)` / `WET.value`, `birds(ctx, { flock: { path, count }, singles: [path] })`,
`debris(ctx, "falling" | "blowing" | "paper", { box })`. Each returns a Built (add `.object`, call `.update(t, cam)`).
Particles read the sun shadow map (`ctx.sun`) so dust / smoke only glow in sunlight.
