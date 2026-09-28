#!/bin/sh
# owlcal.sh N gain : N rounds of owl light matching (raw renders of every owl drawing's frame -> owl.py cal)
cd /Users/computer/rootline/apprentice-film
FR=1143,1144,1145,1147,1148,1149,1150,1151,1152,1153,1154,1155,1156,1157,1158,1159,1160,1161,1162,1163,1175
for i in $(seq 1 $1); do
  node snapshots/s16-fix1-tools/r.mjs snapshots/s16-fix1-rawowl $FR raw /snapshots/s16-fix1-tools/lab.js 2>&1 | grep -v 404 | grep -v willRead | tail -1
  (cd src/shots/s16/trace && python3 owl.py cal /Users/computer/rootline/apprentice-film/snapshots/s16-fix1-rawowl ${2:-0.8} 2>&1 | grep "cal:" | awk '{s+=$6; n++} END {print "owl cal mean", s/n}')
done
