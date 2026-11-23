# Character build scripts

These scripts rebuild everything in `../../assets/` except the meshopt decoder in `assets/lib/`: the hero, ally
and enemy models (`hero.glb`, `ally.glb`, `enemy.glb`), every animation clip (`anims.glb` plus `anims.json`) and the
weapons (`weapons.glb`, now maintained on the weapons branch). The game never runs them; they are kept so the files
can be rebuilt or changed later. Nothing downloaded is committed: `fetch.sh` gets the sources, and `../../CREDITS.md`
lists each one with its licence.

## What you need

- Python 3.13 with the `bpy` (Blender as a module), `numpy` and `pillow` packages. `fetch.sh` makes a venv for them.
- Node with `@gltf-transform/cli` for compression (`pack.sh`), and `playwright` plus Chrome or Chromium for the
  screenshots and videos (`capture.js`, `shot.js`). `ffmpeg` for the videos.
- About 3 GB of free space in the working folder.

## Folders

All paths come from `env.sh` and can be overridden:

- `CHARS_WORK`: the working folder for downloads, intermediate `.blend` files and `out/` (default `../work`
  next to this folder; keep it outside the repo).
- `CHARS_ASSETS`: where `pack.sh` writes the compressed files (default `../../assets`).
- `CHARS_OUT`: where videos, sheets and measurements go (default `../evidence`).
- `PORT`: the local web server port for the test page (default 8981).

## Rebuilding

```
CHARS_WORK=~/ironveil-work ./fetch.sh          # sources (the Quaternius pack is a manual download, see the script)
CHARS_WORK=~/ironveil-work ./rebuild_all.sh    # models and clips, then packs them into assets/
```

To rebuild only the clips: `bvenv/bin/python anims_build.py out/anims.glb` from the working folder, then
`./pack.sh anims`. `ONLY=walkF,jogF` limits the build to some clips, and the log ends with a check of every
motion-capture loop (planted-foot speed, leg reach error and the largest per-frame bone rotation).

## What each script does

| Script | Job |
|---|---|
| `mhlib.py`, `geo.py` | Build a MakeHuman body from the CC0 data, re-pose it to the UAL skeleton, fit clothes and proxies, weights |
| `outfits.py`, `wear.py`, `mats.py`, `pipe.py` | Uniforms and gear as geometry, worn node materials, high-to-low bakes, decimation and UVs |
| `build_hero.py` (`KIND=ally` for the squadmate), `build_enemy.py`, `assemble.py` | Build, bake and export each character |
| `weapons.py`, `build_weapons.py`, `export_weapons.py` | The weapons and their grip frames |
| `anim_lib.py` | World-space posing helpers on the skeleton (aims, two-bone IK, finger curls, actions) |
| `anims_build.py` | Every clip of the IVChars API: authored poses, the UAL clips, and the motion-capture loops |
| `amc.py`, `mocap.py`, `mocap_list.py` | CMU ASF/AMC reader, the retarget (cycle cut, phase, foot pinning, IK) and the list of takes |
| `cmu_scan.py` | Prints speed and travel direction over time for CMU trials, to choose loop segments |
| `pack.sh` | meshopt compression (and resampling for clips) into `assets/` |
| `capture.js`, `videos.sh`, `shot.js`, `sheet.sh` | Drive-mode videos with measurements, and screenshot sheets from `chars-test.html` |

## First-person arms (`fp.glb`, `fp.json`)

Built in four steps from `$CHARS_WORK/fp` (`FP_WORK`), one Blender process at a time:

```
bvenv/bin/python fp_arms.py                 # fp_geo.blend: forearms and hands cut from the hero body, sleeves, watch, skeleton
bvenv/bin/python fp_tex.py                  # fp_tex.blend + tex/*.png: UV atlas and the 2048 set (albedo, normal, ORM)
node fp_unpack.mjs ../../assets/weapons.glb $CHARS_WORK/fp/weapons_plain.glb   # the weapons, readable by Blender
bvenv/bin/python fp_clips.py preview        # optional: Cycles stills of chosen frames (KINDS, SHOTS=idle@0,reload@0.7)
bvenv/bin/python fp_clips.py export         # fp.glb + fp.json (clip lengths, events, props, hand-penetration report)
node fp_pack.mjs $CHARS_WORK/fp/fp.glb ../../assets/fp.glb; cp $CHARS_WORK/fp/fp.json ../../assets/
```

- `fp_arms.py`: the hero's MakeHuman body (same `humans.HERO` build) cut at mid upper arm, the forearms subdivided
  once, rolled sleeves and the cuff roll as ring lofts round the arm, a lathed watch case with lugs and crown on a
  leather strap. The skeleton is the hero's arm chain plus `lowerarm_twist_*` (part of each forearm's weight, so the
  wrist does not candy-wrap), `fp_root` at the eye and the weapon bones `w_root`, `w_bolt`, `w_boltHandle`, `w_mag`,
  `w_trigger`, `w_hammer`, `w_charging`, `w_prop` whose rest frames equal the glTF identity, so `chars.js` can hang the
  normal weapon model and its moving parts on them with identity transforms.
- `fp_tex.py`: Cycles bakes only the rest-pose position, normal, region and occlusion of each texel; everything else
  (skin, hair, veins, tendons, wrinkles, creases, nails, scar, grime, camouflage, weave, seam, strap, dial) is computed
  per texel in numpy from the 3D position, and the heights become a tangent-space normal map from each texel's own
  position derivatives.
- `fp_clips.py` / `fp_lib.py`: hand frames are defined on each weapon's measured shape (`GRIPSPEC`), then fitted: a
  search over the palm offset and a small turn scored by hand vertices inside the weapon (BVH of the real mesh) and
  palm contact, alternating with closing every finger joint on the surface. Arms are two-bone IK with the elbow pole
  chosen per frame to keep the arm out of the weapon; skinning is the same linear blend three.js runs, so the
  penetration numbers in `fp.json` are what the game shows. Clip programs are small keyframe functions per weapon.

### Hands on the guns (Nov 23)

- The firing hand on each gun is a *wrap* grip (`GRIPSPEC[...]['wrap']`, `solve_wrap` in `fp_clips.py`): the palm
  placement is searched in the hand's own axes (palm normal, metacarpals, knuckle line, two small turns) with the
  fingers grasped inside the cost, so it ends where middle, ring and little finger really close round the stock wrist
  or pistol grip; vertices inside the gun, palm contact, unclosed fingers and the wrist's joint cost are scored.
  `pc`, `dir` and `palm` are in the weapon frame (`palm` is made square to `dir`; the old specs had them 35-45 degrees
  apart, which laid the rifle hand flat across the wrist with straight fingers).
- The chosen placements are frozen as `xfix` (checked by eye in close-ups); set `REFIT=1` to search again after a
  weapon changes shape. `fstart` starts a finger part-closed where the grasp would otherwise stop at once on a
  surface it already touches (the rifle's middle finger).
- The trigger finger is authored (`index`: three curls and a fourth value, a sideways swing at the knuckle toward the
  thumb, `set_fingers` in `fp_lib.py`), so it lies forward along the frame instead of pointing at the camera.
- Thumbs: grasped by default (they may start opened out, `tstart`); `thumb_dir` / `thumb_pt` aim a thumb with
  `aim_thumb` (curl, spread and a fifth value, a swing about the palm normal). Aiming the pistol thumbs forward was
  tried and left off: the grid could not get closer than about 40 degrees and the thumbs crossed behind the slide.
- A hand holding a magazine is always closed round it (`solve_part_grip`), and the magazine now stays in the hand
  through the swap (the hand used to be open and empty for the middle of every reload).
- `joint_cost` penalises forearm roll past 95 degrees and the elbow pole search weighs it, which took the reload
  hand's roll from 175-180 to 88-127 degrees (the sleeve no longer wrings at the wrist).
- Checking: `HANDVIEW=1 KINDS=pistol SHOTS=ads@0 fp_clips.py preview` renders the frame plus three close-ups of each
  hand (from the eye, the back of the hand, the palm side); `NORENDER=1` only fits and logs each grip's penetration
  by bone group and finger angles. The sling is hidden in previews, as in the game.
- Penetration and joint numbers per clip are in `assets/fp.json` (`pen_max_verts`, `pen_max_depth_mm`, `joints`).

## Notes for later edits

- Bone names, clip names and the `anims.json` fields (`duration`, `stride`, `speed`, `theta`) are part of the API that
  `chars.js` and the game read; keep them.
- Every locomotion loop has the left foot landing at phase 0 and the right at 0.5. `stride` is metres per cycle.
- Subjects 139, 141 and 143 of the CMU database were captured at 60 Hz, the rest at 120 Hz (`mocap.RATE60`).
- No hate symbols, real people or insignia anywhere, including textures. Enemies wear only the invented white chevron.
