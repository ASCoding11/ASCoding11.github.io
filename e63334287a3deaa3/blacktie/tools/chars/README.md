# People build scripts (Black Tie)

Rebuild the MakeHuman-based characters in `../../assets/` (`agent.glb`, more to come). The game never runs these.

- Needs Python 3.13 with `bpy` (Blender as a module), `numpy`, `pillow` in a venv, and node with
  `@gltf-transform/cli` for meshopt compression.
- Sources (not committed; all CC0): MakeHuman/MPFB2 data (`dl_mpfb/x`, base mesh, targets, rig, weights) and the
  MakeHuman system assets (`dl_mh/x`: skins, eyes, brows, lashes, hair, clothes). Download as in
  `../../../ironveil/tools/chars/fetch.sh` into `$CHARS_WORK`.
- The skeleton comes from the old `hero.glb` (UAL bone names and rest orientations, so every clip in `anims.glb`
  plays): `npx gltf-transform copy <old hero.glb> $CHARS_WORK/hero_plain.glb` (it is in git history,
  commit ce86328).
- `mhlib.py`, `geo.py` are copies of Midnight Ops' helpers; `mhlib.build_human` now also fits clothes and takes
  `V` (pre-morphed vertices), lashes and eye colour.

```
export CHARS_WORK=~/rpwork
KIND=agent bvenv/bin/python build_people.py          # -> $CHARS_WORK/agent.blend (+ tex_agent/)
bvenv/bin/python preview.py $CHARS_WORK/agent.blend out.png torso   # Cycles still: full, back, torso, face
KIND=agent bvenv/bin/python export_people.py $CHARS_WORK/out_agent.glb
npx gltf-transform meshopt $CHARS_WORK/out_agent.glb ../../assets/agent.glb --level high
python3 -I webp_glb.py ../../assets/agent.glb                      # textures to WebP (EXT_texture_webp): about half the file
```

- `outfits_people.py`: `SPECS` (body, face targets, skin, hair, clothes, texture size, atlas layout) and one
  `tex_<item>` function per clothes item that recomputes its textures from the item's UV layout: the agent's
  tuxedo turns MakeHuman's `male_elegantsuit01` black with satin-faced lapels (texture-space polygons), pleated
  shirt front with studs where the long tie was (the tie's vertices are pressed back onto the chest), patent
  `shoes04`, and a modelled bow tie.
- `webp_glb.py`: re-encodes a .glb's images as WebP in place (quality 88, alpha kept) and repacks the binary chunk,
  including the regions EXT_meshopt_compression points at. The seven character files went from 11.8 MB to 5.4 MB.
- `export_people.py`: one cloth atlas per character, skin, a hair/brow/lash/eye atlas, LOD1 (6k tris) and LOD2
  (1.6k tris), meshes named `<Name>`, `<Name>Hair`, `<Name>Eyes`, `<Name>LOD1`, `<Name>LOD2`.
