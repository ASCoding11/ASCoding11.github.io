#!/bin/bash
# aimsheet.sh out.png : player-camera stills (1.7 m back, 0.85 m right) of the aim with SMG and rifle, standing and
# crouched, still and strafing, with a rifle slung on the back; grey floor
. "$(dirname "$0")/env.sh"
out=$1; T=$(mktemp -d); i=0
for w in smg rifleScoped; do
  for pose in "anim=idle&upper=aimIdle" "anim=walkR&upper=aimIdle" "anim=crouchIdle&upper=crouchAim" "anim=jogF&upper=holdRifle"; do
    i=$((i+1)); timeout 200 node "$HERE/shot.js" $T/p$i.png "/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=hero&$pose&t=0.5&weapon=$w&sling=rifleScoped&grey=1&cam=ots2" 400 300 >/dev/null
  done
done
python3 -I -c "
import sys
from PIL import Image
n=int(sys.argv[3]); ims=[Image.open(sys.argv[2]+'/p%d.png'%i) for i in range(1,n+1)]
c=Image.new('RGB',(1600,300*((n+3)//4))); [c.paste(im,((i%4)*400,(i//4)*300)) for i,im in enumerate(ims)]; c.save(sys.argv[1])" $out $T $i
