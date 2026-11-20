#!/bin/bash
# turntable.sh kind out.png : the soldier at 2, 5 and 15 m, front three-quarter and back three-quarter, under the
# overcast day and under night_moon with a warm lamp, on the grey floor (one browser at a time per shot)
. "$(dirname "$0")/env.sh"
k=$1; out=$2; T=$(mktemp -d); i=0; W=${W:-rifleScoped}
for light in overcast night; do
  for dist in 2 5 15; do
    for yaw in 35 215; do
      i=$((i+1)); ty=$(python3 -c "print({2:1.0,5:0.95,15:0.9}[$dist])")
      timeout 200 node "$HERE/shot.js" $T/p$i.png "/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=$k&anim=idle&upper=holdRifle&t=0.5&weapon=$W&grey=1&light=$light&cyaw=$yaw&cpitch=6&cdist=$((dist*1))&cty=$ty" 300 400 >/dev/null
    done
  done
done
python3 -I -c "
import sys
from PIL import Image
n=int(sys.argv[3]); ims=[Image.open(sys.argv[2]+'/p%d.png'%i) for i in range(1,n+1)]
c=Image.new('RGB',(300*6,400*2)); [c.paste(im,((i%6)*300,(i//6)*400)) for i,im in enumerate(ims)]; c.save(sys.argv[1])" $out $T $i
