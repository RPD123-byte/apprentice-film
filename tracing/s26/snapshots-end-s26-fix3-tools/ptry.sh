#!/bin/bash
# ptry.sh TAG F0 F1 'params-json': re-trace the colour owl F0..F1 (ptrace.py), build a harness variant, render, score
cd /Users/computer/rootline/apprentice-film/snapshots/end-s26-fix3-tools
SP=/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s26f3
TAG=$1; F0=$2; F1=$3; PJ=$4
python3 ptrace.py $SP/$TAG.json $F0 $F1 "$PJ" > /dev/null
python3 ../end-s26-fix2-tools/patchrows.py ../../src/shots/s26/owlTraceF.js var/owlTraceF_$TAG.js OWL_F $SP/$TAG.json > /dev/null
python3 mkvar.py $TAG owlTraceF=/snapshots/end-s26-fix3-tools/var/owlTraceF_$TAG.js > /dev/null
FR=$(python3 -c "print(','.join(str(f) for f in range($F0,$F1+1)))")
rm -rf $SP/$TAG; node render.mjs $SP/$TAG $FR "" /snapshots/end-s26-fix3-tools/var/s26_$TAG.js > $SP/$TAG.log 2>&1
python3 sc3.py $F0-$F1 v1=$SP/v1/r{F}.png $TAG=$SP/$TAG/r{F}.png -q --box 1940,50,2125,255 | sed "s/^/$TAG box /"
