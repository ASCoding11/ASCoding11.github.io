#!/bin/bash
# posesheet.sh out.png : aim, crouch aim, prone aim, jog with the rifle from the player camera, 45 degrees behind
# and the side, on a mid-grey floor (one browser at a time)
. "$(dirname "$0")/env.sh"
out=$1; T=$(mktemp -d); i=0
for pose in "anim=idle&upper=aimIdle" "anim=crouchIdle&upper=crouchAim" "anim=proneAim" "anim=jogF&upper=holdRifle" "anim=crouchF&upper=holdRifle"; do
  for cam in "cam=ots2" "cam=ots45" "cam=side"; do
    i=$((i+1)); timeout 200 node "$HERE/shot.js" $T/p$i.png "/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=hero&$pose&t=0.5&weapon=rifleScoped&grey=1&$cam" 400 300 >/dev/null
  done
done
python3 -I -c "
import sys
from PIL import Image
n=int(sys.argv[3]); ims=[Image.open(sys.argv[2]+'/p%d.png'%i) for i in range(1,n+1)]
c=Image.new('RGB',(1200,300*(n//3))); [c.paste(im,((i%3)*400,(i//3)*300)) for i,im in enumerate(ims)]; c.save(sys.argv[1])" $out $T $i
