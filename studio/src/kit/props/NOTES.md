# kit/props (NATURE owner)
Full notes (API, catalogue, costs, gaps): `../nature/NOTES.md`. Quick API:
`const b = await prop(ctx, "bench_slats", { pos: [2.1, 0, -3.6], rotY: -Math.PI / 2, scale: 1, contact: 0.55 })` (Built),
`props(ctx, [{ name, pos, rotY }, ...])`, `contactShadow(w, d, strength)`, the name list = `PROPS` in `catalog.ts`.
Assets: `public/kit/props/<id>/<id>.glb` (46 Poly Haven CC0 props, packed by `prep/pack_props.py` from the 1k glTF
downloads, `prep/fetch_ph.py`), sizes in `public/kit/props/catalog.json`. Not in the catalogue (no CC0 model found on
Poly Haven): an uncovered car, a bicycle, a mobile phone, books (the book sets have no glTF build), market awnings / tents.
