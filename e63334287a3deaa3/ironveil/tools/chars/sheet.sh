#!/bin/bash
# sheet.sh out.png "query" t1 t2 ... : a row of 600x600 test-page shots at the given clip times (needs the server on $PORT).
. "$(dirname "$0")/env.sh"
out=$1; q=$2; shift 2; files=""; T=$(mktemp -d)
for t in "$@"; do f=$T/s_$t.png; node $HERE/shot.js $f "/e63334287a3deaa3/ironveil/chars-test.html?shot=1&t=$t&$q" 600 600 >/dev/null 2>&1; files="$files $f"; done
python3 -I -c "
import sys
from PIL import Image
fs=sys.argv[2:]; ims=[Image.open(f) for f in fs]
c=Image.new('RGB',(600*len(ims),600));[c.paste(im,(i*600,0)) for i,im in enumerate(ims)];c.save(sys.argv[1])" $out $files
rm -rf $T
