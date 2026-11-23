#!/bin/bash
# Resumable driver: one Blender process at a time, waits for 5 GB free memory before each.
# usage: run.sh OUT SIZE [sets...]     (BPY = python with bpy; default: python3)
set -u
HERE=$(cd "$(dirname "$0")" && pwd); OUT=$1; SIZE=$2; shift 2
SETS=${*:-rifle smg atlas}; B=${BPY:-python3}
mkdir -p "$OUT"
waitmem() { while [ "$(free -g | awk '/Mem:/{print $7}')" -lt 5 ]; do echo "waiting for memory"; sleep 30; done; }
for S in $SETS; do
  if [ ! -f "$OUT/$S.blend" ]; then waitmem; $B "$HERE/build.py" prep "$S" "$OUT" "$SIZE" || exit 1; fi
  for K in $(python3 -c "import json;print(' '.join(json.load(open('$OUT/$S.json'))))"); do
    n=$(ls "$OUT"/tex/${S}__${K}_{mask,color,metal,rough,normal}.png 2>/dev/null | wc -l)
    if [ "$n" -lt 5 ]; then waitmem; $B "$HERE/build.py" bake "$S" "$OUT" "$SIZE" "$K" || exit 1; fi
  done
  if [ ! -f "$OUT/$S.glb" ]; then waitmem; $B "$HERE/build.py" finish "$S" "$OUT" "$SIZE" || exit 1; fi
done
echo ALLDONE
