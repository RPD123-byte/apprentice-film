#!/bin/sh
# facetry.sh NAME 'faceB-json' 'faceM-json' : render the face test frames with those values, print facecmp
echo "globalThis.__S22DBG = {faceB: $2, faceM: $3};" > flag_$1.js
printf 'import "./flag_%s.js";\nimport "./entry.js";\n' $1 > entry_$1.js
python3 run.py ../s22-fix1-ft-$1 1950,1954,1960,1966,1972 --nopair --entry entry_$1.js 2>&1 | grep -v GL | tail -1
python3 facecmp.py ../s22-fix1-ft-$1
