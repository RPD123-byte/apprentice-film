#!/bin/bash
# pgtry.sh TAG 'params-json': trace the clean page (pagetrace.py) -> harness variant (no tone lift on the page) -> score
cd /Users/computer/rootline/apprentice-film/snapshots/end-s26-fix3-tools
SP=/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26f3
TAG=$1
python3 pagetrace.py var/page_$TAG.js "$2" > $SP/pg_$TAG.log 2>&1
python3 pvar.py $TAG /snapshots/end-s26-fix3-tools/var/page_$TAG.js > /dev/null
sed -i '' 's/paintTrace(g, PAGE_T, { col: tone("F") })/paintTrace(g, PAGE_T, {})/' var/s26_$TAG.js
rm -rf $SP/$TAG; node render.mjs $SP/$TAG 2830,2856,2875,2900,2912,2925,2937 "" /snapshots/end-s26-fix3-tools/var/s26_$TAG.js > /dev/null 2>&1
echo "$TAG $(ls -la var/page_$TAG.js | awk '{print $5}') $(python3 sc3.py 2830,2856,2875,2900,2912,2925,2937 $TAG=$SP/$TAG/r{F}.png -q)"
