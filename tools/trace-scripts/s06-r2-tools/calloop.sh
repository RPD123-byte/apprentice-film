#!/bin/sh
# calloop.sh OUTDIR N "set:part:layer ..." [T]: N rounds of export -> render at T -> calibrate the listed items
#   item forms: face:ink  (strokes)   face:mass:wash  (a mass layer)
cd /Users/computer/rootline/apprentice-film
OUT=$1; N=$2; ITEMS=$3; T=${4:-26.8}
SETS=$(for it in $ITEMS; do echo $it | cut -d: -f1; done | sort -u | tr '\n' ' ')
i=0
while [ $i -lt $N ]; do
  python3 src/shots/s06/trace/build.py $SETS --export >/dev/null
  sh tools/compare.sh $T $OUT-$i >/dev/null
  python3 snapshots/s06-study/mae.py $OUT-$i
  F=$(ls $OUT-$i/frame-00-*.png); R=$(ls $OUT-$i/ref-00-*.png)
  for it in $ITEMS; do
    s=$(echo $it | cut -d: -f1); p=$(echo $it | cut -d: -f2); l=$(echo $it | cut -d: -f3)
    J=snapshots/s06-r2-src/out/$s.$p.json
    if [ "$p" = "mass" ]; then python3 src/shots/s06/trace/calibrate.py masses $F $R $J $l 0.7 | tail -3; else python3 src/shots/s06/trace/calibrate.py strokes $F $R $J 0.6; fi
  done
  i=$((i+1))
done
python3 src/shots/s06/trace/build.py $SETS --export >/dev/null
