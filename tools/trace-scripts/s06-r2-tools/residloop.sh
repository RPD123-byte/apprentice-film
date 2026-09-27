#!/bin/sh
# residloop.sh OUTDIR N [T] [--reset]: N rounds of render at T -> accumulate the tone correction
cd /Users/computer/rootline/apprentice-film
OUT=$1; N=$2; T=${3:-26.96}; RS=$4
i=0
while [ $i -lt $N ]; do
  sh tools/compare.sh $T $OUT-$i >/dev/null
  python3 snapshots/s06-r2-tools/motion_mae.py $OUT-$i | head -1
  F=$(ls $OUT-$i/frame-00-*.png); R=$(ls $OUT-$i/ref-00-*.png)
  python3 src/shots/s06/trace/resid.py $F $R 0.7 $RS; RS=""
  i=$((i+1))
done
