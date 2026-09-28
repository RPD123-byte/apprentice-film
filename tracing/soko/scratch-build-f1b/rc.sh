#!/bin/sh
# rc.sh x0 y0 x1 y1 scale [name] [mode]  : render page@50 (graded), side-by-side crop with clean ref
S=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/f1t
cd /Users/computer/rootline/apprentice-film
python3 $S/drive.py "mode=page&t=50" snapshots/f1/r.png 2>&1 | grep -v "GL Driver" | tail -3
N=${6:-crop}
python3 $S/sbs.py snapshots/f1/r.png snapshots/f1/clean_ff.png snapshots/f1/$N.jpg $1 $2 $3 $4 $5 ${7:---h}
python3 $S/onion.py snapshots/f1/r.png snapshots/f1/clean_ff.png snapshots/f1/${N}_on.jpg $1 $2 $3 $4 $5
