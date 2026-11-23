#!/bin/bash
# handsheet.sh out.png weapon upper grips-json : three close-ups of each hand
. "$(dirname "$0")/env.sh"
out=$1; w=$2; up=$3; g=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "${4:-{\}}"); T=$(mktemp -d); i=0
for c in "cbone=hand_r&cyaw=-90&cpitch=10" "cbone=hand_r&cyaw=180&cpitch=70" "cbone=hand_r&cyaw=-60&cpitch=-50" "cbone=hand_l&cyaw=-90&cpitch=10" "cbone=hand_l&cyaw=90&cpitch=10" "cbone=hand_l&cyaw=-30&cpitch=-60"; do
  i=$((i+1)); timeout 200 node "$HERE/shot.js" $T/h$i.png "/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=hero&anim=idle&upper=$up&t=0.6&weapon=$w&cdist=0.3&grips=$g&$c" 360 360 >/dev/null
done
python3 -I -c "
import sys
from PIL import Image
ims=[Image.open(sys.argv[2]+'/h%d.png'%i) for i in range(1,7)]
c=Image.new('RGB',(1080,720)); [c.paste(im,((i%3)*360,(i//3)*360)) for i,im in enumerate(ims)]; c.save(sys.argv[1])" $out $T
