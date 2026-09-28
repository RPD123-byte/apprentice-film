#!/bin/bash
# full.sh name [frames] : render frames (default all 1331-1432) with the harness, score frame-accurately, summarise
N=$1; FR=${2:-1331-1432}
OUT=/Users/computer/rootline/apprentice-film/snapshots/s18-$N
cd /Users/computer/rootline/apprentice-film/snapshots/s18-h && node render.mjs $OUT $FR 2>&1 | grep -v "^\[page\]" | tail -1 > $OUT.ms.txt
cd /Users/computer/rootline/apprentice-film && S18SRC=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/src/ python3 src/shots/s18/trace2/fa.py $OUT > $OUT/fa.txt
python3 /private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s18r4/py/summ.py $OUT/fa.txt
