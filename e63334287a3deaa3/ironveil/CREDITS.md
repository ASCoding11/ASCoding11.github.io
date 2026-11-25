# Ironveil credits

Every outside asset used by the Ironveil characters, where it came from and its licence. Everything else in
`assets/` (uniforms, webbing, helmets, caps, weapons, textures, the authored animations) was made in code for this
game by the build scripts described in the README section, on top of the sources below.

## Characters

| What | Source | Licence | How it is used |
|---|---|---|---|
| MakeHuman base mesh (hm08), shape targets, `game_engine` rig and skin weights | MPFB 2 data folder, https://files.makehumancommunity.org/plugins/mpfb2-latest.zip (data/3dobjs, data/targets, data/rigs) | CC0 ("All core assets are shared under Creative Commons, CC0", https://static.makehumancommunity.org/about/license.html). Only the data files were used, not the GPL add-on code. | Body shape and proportions of every character, joint positions, skin weights |
| MakeHuman system assets: skins `young_caucasian_male`, `young_caucasian_male2`, `middleage_caucasian_male`; eyes `low-poly` + `brown`/`blue`/`grey`; eyebrows `eyebrow001`/`005`/`009`; eyelashes `eyelashes01`; hair `short02` | https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip (listing: https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html) | CC0 (each asset is marked CC0 on that page; the files carry "explicitly released as CC0 in september 2020") | Face and hand skin baked into the character textures; eyes, brows, lashes and hair in the small hair textures |
| Universal Animation Library (Standard) by Quaternius: `UAL1_Standard.glb`, `UAL2_Standard.glb` | Original: https://quaternius.com/packs/universalanimationlibrary.html and https://quaternius.itch.io/universal-animation-library. The files were fetched from public GitHub mirrors of the same CC0 pack (byte-identical copies in two repositories), because the itch.io download needs a browser session. | CC0 (stated on the Quaternius page: "Free to use in personal, educational and commercial projects. (CC0 License)") | Skeleton layout and bone names (`pelvis`, `spine_01`, `hand_r`, ...), the locomotion clips (idle, walk, run, sprint, crouch idle/walk, sit), the hit reaction and the fall-backwards death; the remaining clips are authored in code on the same skeleton |
| CMU Graphics Lab Motion Capture Database, trials `07_01` (walk), `09_01` (run), `09_12` (walk backwards and back-diagonal), `102_05` (running straight), `143_40` (walk sideways), `143_41` (sneak sideways) | http://mocap.cs.cmu.edu/ (ASF/AMC files, downloaded per trial). The database was created with funding from NSF EIA-0196217. | Free to use: "The motion capture data may be copied, modified, or redistributed without permission." (mocap.cs.cmu.edu FAQ) | Retargeted onto the shared skeleton by `tools/chars/mocap.py` (joint positions, aims and leg IK, feet pinned to the ground) for the walk, jog, sprint, strafe, backward and crouch loops listed in `tools/chars/mocap_list.py`. The crouch loops and the forward-diagonal and jog-strafe loops are edited from these takes (pelvis lowered or hips turned); the files themselves are not shipped, only the baked clips in `assets/anims.glb` |

## Code

| What | Source | Licence |
|---|---|---|
| three.js r187 with `GLTFLoader` and `SkeletonUtils` | the site's own build in `/lib/three/r187/` (see `/lib/three/README.md`) | MIT (three.js authors) |
| `assets/lib/meshopt_decoder.js` | three.js r128 `examples/js` (https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/), an unchanged copy (it does not depend on three's version) | MIT (Arseny Kapoulkine) |

No real people are modelled. No national, political or hate symbols appear anywhere, including inside textures: the
enemy uniforms carry only an invented plain white chevron on the left sleeve.
