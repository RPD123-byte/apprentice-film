#!/bin/sh
# light matching rounds for the owl drawings: raw harness renders -> owl2.py cal DIR gain
cd /Users/computer/rootline/apprentice-film
N=${1:-2}; G=${2:-0.8}
for i in $(seq 1 $N); do
  python3 snapshots/s16-h1-tools/rawdump.py snapshots/s16-h1-work/owlcal 1143,1144,1145,1147,1148,1149,1150,1151,1152,1153,1154,1155,1156,1157,1158,1159,1160,1161,1162,1163,1175 2>&1 | grep -v "GL Driver\|CONTEXT_LOST"
  python3 src/shots/s16/trace/owl2.py cal snapshots/s16-h1-work/owlcal $G 2>&1 | grep "cal:"
done
