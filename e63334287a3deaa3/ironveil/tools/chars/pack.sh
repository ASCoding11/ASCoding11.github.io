#!/bin/bash
# pack.sh name... : compress $CHARS_WORK/out/<name>.glb into the game's assets folder with gltf-transform (meshopt).
# Needs node with @gltf-transform/cli available to npx.
. "$(dirname "$0")/env.sh"
T=$(mktemp -d)
# gltf-transform is installed with npm in $CHARS_WORK/../gt (npm i @gltf-transform/cli) or globally
[ -d "$CHARS_WORK/../gt/node_modules" ] && cd "$CHARS_WORK/../gt"
for n in "$@"; do
  src=$CHARS_WORK/out/$n.glb
  if [ "$n" = anims ]; then cp $CHARS_WORK/out/anims.json $CHARS_ASSETS/anims.json; npx gltf-transform resample $src $T/r.glb --tolerance 0.0008 >/dev/null 2>&1; src=$T/r.glb; fi
  npx gltf-transform meshopt $src $CHARS_ASSETS/$n.glb --level high >/dev/null 2>&1 || cp $src $CHARS_ASSETS/$n.glb
  ls -la $CHARS_ASSETS/$n.glb
done
rm -rf $T
