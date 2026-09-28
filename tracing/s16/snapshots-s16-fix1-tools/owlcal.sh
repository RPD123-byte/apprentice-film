#!/bin/sh
# owlcal.sh ROUNDS GAIN : light-match the owl drawings' coarse value study (owl3.py cal)
cd "$(dirname "$0")"
FR="1143 1144 1145 1147 1148 1149 1150 1151 1152 1153 1154 1155 1156 1157 1158 1159 1160 1161 1162 1163 1175"
for i in $(seq 1 $1); do
  python3 rawdump.py ../s16-fix1-work/raw $FR 2>&1 | grep -v "GL Driver\|WebGL"
  (cd ../../src/shots/s16/trace && python3 owl3.py cal ../../../../snapshots/s16-fix1-work/raw $2 2>&1 | grep "cal:" | awk '{s+=$6; m+=$8; n++} END {print "round mean|diff|", s/n, "mean", m/n}')
done
