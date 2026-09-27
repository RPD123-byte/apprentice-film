#!/bin/sh
# build_d.sh T [offsets] -- rotoscope one key (draw mode), measure its flows, write src/shots/s04/tk/kNNNN.js
T=$1; OFFS=${2:--2,-1,1}
N=$(echo $T | tr -d .)
python3 tr/trace_key.py $T tr/masks_d.json tr/d$T.json 2>/dev/null | tail -1 | cut -c1-100
python3 tr/flow_key.py tr/d$T.json $OFFS 24 | grep -v "offset" 
python3 tr/calib.py tr/d$T.json
python3 tr/tojs_d.py tr/d$T.json ../../src/shots/s04/tk/k$N.js K$N
