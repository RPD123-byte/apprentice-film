#!/bin/sh
# build.sh T [offsets] -- trace one key, measure its flows, write src/shots/s04/tk/kNNNN.js
T=$1; OFFS=${2:--2,-1,1}
N=$(echo $T | tr -d .)
python3 tr/trace_key.py $T tr/masks.json tr/k$T.json 2>/dev/null | tail -1
python3 tr/flow_key.py tr/k$T.json $OFFS 24
python3 tr/tojs.py tr/k$T.json ../../src/shots/s04/tk/k$N.js K$N
