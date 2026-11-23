#!/bin/bash
# closeups.sh kind out.png : back, back three-quarter, boots, helmet, face, front at 1-2 m, overcast, grey floor
. "$(dirname "$0")/env.sh"
k=$1; out=$2; T=$(mktemp -d); i=0
for q in "cyaw=180&cpitch=8&cdist=1.5&cty=1.25" "cyaw=215&cpitch=8&cdist=2.2&cty=1.0" "cyaw=150&cpitch=12&cdist=0.9&cty=0.25" "cbone=Head&cyaw=200&cpitch=25&cdist=0.55" "cbone=Head&cyaw=20&cpitch=5&cdist=0.5" "cyaw=25&cpitch=6&cdist=2.2&cty=1.0"; do
  i=$((i+1)); timeout 200 node "$HERE/shot.js" $T/p$i.png "/e63334287a3deaa3/ironveil/chars-test.html?shot=1&kind=$k&anim=idle&upper=holdRifle&t=0.5&weapon=rifleScoped&grey=1&light=overcast&$q" 400 500 >/dev/null
done
python3 -I -c "
import sys
from PIL import Image
ims=[Image.open(sys.argv[2]+'/p%d.png'%i) for i in range(1,7)]
c=Image.new('RGB',(1200,1000)); [c.paste(im,((i%3)*400,(i//3)*500)) for i,im in enumerate(ims)]; c.save(sys.argv[1])" $out $T
