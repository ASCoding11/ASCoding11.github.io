#!/bin/bash
# videos.sh [suffix] [scenario...] : renders the drive-mode scenarios to MP4 and writes their measurements as JSON.
# Needs the repo served on $PORT (python3 -m http.server $PORT from the repo root), node + playwright, ffmpeg.
. "$(dirname "$0")/env.sh"
suf=$1; shift
list=${*:-sprintReversal strafeCircleAim enemyPatrol startJogStop walkJogSprintStop walkJogSprintStopOTS slopeAndSteps stanceChain backOnly sprintBack}
mkdir -p $CHARS_OUT/videos; cd $HERE
for v in $list; do
  k=hero; w=rifleScoped; [ $v = enemyPatrol ] && k=rifleman && w=enemyRifle
  F=$(mktemp -d); node capture.js $v $F $k $w 854 480 > $CHARS_OUT/videos/$v$suf.json 2>&1
  ffmpeg -y -loglevel error -framerate 30 -i $F/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 22 $CHARS_OUT/videos/$v$suf.mp4; rm -rf $F; echo "done $v"
done
node capture.js measure - hero rifleScoped > $CHARS_OUT/videos/measure$suf.json 2>&1
