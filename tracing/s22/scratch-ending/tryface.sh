#!/bin/sh
# tryface.sh NAME 'faceM-json': render margin-side face frames with that override, print stats
H=/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h
SP=/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad
cd $H
echo "globalThis.__S22DBG = {faceM: $2};" > flag_fm$1.js
printf 'import "./flag_fm%s.js";\nimport "./entry.js";\n' $1 > entry_fm$1.js
python3 run.py ../s22-fix1-fm$1 1868,1876,1884,1892,1900,1908,1924,1928,1932,1984,1988,1992 --nopair --entry entry_fm$1.js 2>&1 | grep -v GL | tail -1
for s in 0 1 3; do echo "side $s: $(python3 $SP/facestat.py ../s22-fix1-fm$1 $s | tail -2 | tr '\n' ' ')"; done
