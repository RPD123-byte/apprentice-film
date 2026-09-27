#!/bin/sh
# cal.sh N gain : N rounds of room light matching (raw render of 1175 via the lab module -> room.py cal)
cd /Users/computer/rootline/apprentice-film
for i in $(seq 1 $1); do
  VIEW=roomonly node snapshots/s16-fix1-tools/r.mjs snapshots/s16-fix1-raw 1175 raw /snapshots/s16-fix1-tools/lab.js 2>&1 | grep -v 404 | grep -v load
  (cd src/shots/s16/trace && python3 room.py cal /Users/computer/rootline/apprentice-film/snapshots/s16-fix1-raw/r1175.png ${2:-0.8} 2>&1 | grep cal)
done
