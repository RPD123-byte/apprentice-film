#!/bin/sh
# build_new.sh T OFFS -- trace a NEW key, measure its flows (merge), calibrate, write the JS module
T=$1; OFFS=$2; N=$(echo $T | tr -d .)
[ -f tr/d$T.json ] || python3 tr/trace_key.py $T tr/masks_d.json tr/d$T.json > /dev/null 2>&1
[ -n "$OFFS" ] && python3 tr/add_flows.py tr/d$T.json "$OFFS"
python3 tr/calib.py tr/d$T.json
python3 tr/tojs_d.py tr/d$T.json ../../src/shots/s04/tk/k$N.js K$N
