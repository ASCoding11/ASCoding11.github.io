#!/bin/bash
# Rebuilds every character and clip file from the CC0 sources and packs them into the game's assets folder.
# Weapons are built by build_weapons.py / export_weapons.py (now owned by the weapons branch; run with WEAPONS=1).
. "$(dirname "$0")/env.sh"
cd "$CHARS_WORK" || exit 1
B=./bvenv/bin/python; O=$PWD/out; mkdir -p $O
$B $HERE/build_hero.py bake > hero_build.log 2>&1; $B $HERE/assemble.py hero $O/hero.glb >> hero_build.log 2>&1; $HERE/pack.sh hero
KIND=ally $B $HERE/build_hero.py bake > ally_build.log 2>&1; $B $HERE/assemble.py ally $O/ally.glb >> ally_build.log 2>&1; $HERE/pack.sh ally
$B $HERE/build_enemy.py > enemy_build.log 2>&1; $B $HERE/assemble.py enemy $O/enemy.glb >> enemy_build.log 2>&1; $HERE/pack.sh enemy
$B $HERE/anims_build.py $O/anims.glb > anim.log 2>&1; $HERE/pack.sh anims
if [ -n "$WEAPONS" ]; then
  $B $HERE/build_weapons.py bake > weapons_build.log 2>&1; $B $HERE/export_weapons.py $O/weapons.glb >> weapons_build.log 2>&1; $HERE/pack.sh weapons
fi
echo ALLDONE
grep -hE "rror|Trace" *_build.log anim.log
