#!/bin/sh
cd /Users/computer/rootline/apprentice-film
python3 src/shots/s16/trace/desk.py >/dev/null
for i in $(seq 1 ${1:-3}); do
  python3 snapshots/s16-h1-tools/rawdump.py snapshots/s16-h1-work/deskcal 1175 2>&1 | grep -v "GL Driver\|CONTEXT_LOST"
  python3 src/shots/s16/trace/desk.py cal snapshots/s16-h1-work/deskcal/r1175.png ${2:-0.8} | grep cal
done
