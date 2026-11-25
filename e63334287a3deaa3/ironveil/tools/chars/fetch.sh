#!/bin/bash
# Downloads the CC0 / freely redistributable source data into $CHARS_WORK. Nothing downloaded here is committed;
# the game only ships the baked files in ../../assets. Licences and exact sources are in ../../CREDITS.md.
. "$(dirname "$0")/env.sh"
mkdir -p "$CHARS_WORK" && cd "$CHARS_WORK" || exit 1
# Blender as a Python module (Python 3.13)
[ -d bvenv ] || { python3.13 -m venv bvenv && ./bvenv/bin/pip install -q bpy pillow numpy; }
# MakeHuman / MPFB data (CC0): base mesh, targets, rig weights, skins, proxies
mkdir -p dl_mpfb dl_mh
[ -d dl_mpfb/x ] || (cd dl_mpfb && curl -sSL -o mpfb2.zip https://files.makehumancommunity.org/plugins/mpfb2-latest.zip && unzip -q mpfb2.zip -d x)
[ -d dl_mh/x ] || (cd dl_mh && curl -sSL -o sys.zip https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip && unzip -q sys.zip -d x)
# Quaternius Universal Animation Library, Standard (CC0): download by hand from
# https://quaternius.itch.io/universal-animation-library and put UAL1_Standard.glb and UAL2_Standard.glb in dl_ual/
mkdir -p dl_ual; ls dl_ual/UAL1_Standard.glb dl_ual/UAL2_Standard.glb >/dev/null || echo "missing dl_ual/UAL*_Standard.glb (manual download)"
# CMU Graphics Lab Motion Capture Database (free to copy, modify and redistribute): only the trials anims_build.py uses
mkdir -p cmu/data; cd cmu/data
for t in $(python3 -I "$HERE/mocap_list.py"); do s=${t%_*}
  [ -f $s.asf ] || curl -sS -m 60 -O http://mocap.cs.cmu.edu/subjects/$s/$s.asf
  [ -f $t.amc ] || curl -sS -m 120 -O http://mocap.cs.cmu.edu/subjects/$s/$t.amc
done
echo fetched
