# Character build scripts

These scripts rebuild everything in `../../assets/` except the three.js loader copies in `assets/lib/`: the hero, ally
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

## Notes for later edits

- Bone names, clip names and the `anims.json` fields (`duration`, `stride`, `speed`, `theta`) are part of the API that
  `chars.js` and the game read; keep them.
- Every locomotion loop has the left foot landing at phase 0 and the right at 0.5. `stride` is metres per cycle.
- Subjects 139, 141 and 143 of the CMU database were captured at 60 Hz, the rest at 120 Hz (`mocap.RATE60`).
- No hate symbols, real people or insignia anywhere, including textures. Enemies wear only the invented white chevron.
