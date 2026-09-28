#!/bin/bash
# tcrop.sh name x0 y0 x1 y1 "k=v k=v ..." : trace a crop of bgA and evaluate
W=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/work
T=/Users/computer/rootline/apprentice-film/src/shots/s18/trace2
PL=${PLATE:-$W/bgA_P.npy}
name=$1; shift; x0=$1; y0=$2; x1=$3; y1=$4; shift 4
args=()
for kv in $1; do args+=(--p "$kv"); done
python3 $T/trace_plate2.py $PL $W/$name.pkl --crop $x0 $y0 $x1 $y1 "${args[@]}" 2>&1 | grep -v Warn | grep -v remove_small
python3 /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/py/evalcrop.py $PL $W/$name.pkl $x0 $y0 $x1 $y1 $W/$name.jpg ${WK:-0.92}
