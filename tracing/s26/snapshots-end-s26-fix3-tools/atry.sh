#!/bin/bash
# atry.sh TAG 'params-json': full-screen 2x trace of the A key -> harness variant -> render -> score (scratch)
cd /Users/computer/rootline/apprentice-film/snapshots/end-s26-fix3-tools
SP=/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26f3
TAG=$1
BOX=143,128,2020,914 MARGIN=0 python3 atrace.py var/pageA2_$TAG.js "$2" > /dev/null
python3 mkvar.py $TAG owlKeyA=/snapshots/end-s26-fix3-tools/var/pageA2_$TAG.js > /dev/null
python3 - <<PY
p='var/s26_$TAG.js'; s=open(p).read()
s=s.replace('    paintTrace(g, PAGEA[0], { col: tone("AE") });\n','').replace('tracedLayer(OWLA, W, H, oa, 4,','tracedLayer(OWLA, W, H, oa, 0,')
open(p,'w').write(s)
PY
rm -rf $SP/$TAG; node render.mjs $SP/$TAG 2763,2770,2775,2781,2788,2789 "" /snapshots/end-s26-fix3-tools/var/s26_$TAG.js > /dev/null 2>&1
echo "$TAG $(ls -la var/pageA2_$TAG.js | awk '{print $5}') $(python3 sc3.py 2763,2770,2775,2781,2788,2789 $TAG=$SP/$TAG/r{F}.png -q)"
