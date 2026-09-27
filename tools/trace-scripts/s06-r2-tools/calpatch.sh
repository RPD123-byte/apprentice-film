#!/bin/sh
# calpatch.sh OUTDIR N "T1,T2,..": N rounds of render at the times -> calibrate the mouth and blink patches
cd /Users/computer/rootline/apprentice-film
OUT=$1; N=$2; TS=$3
i=0
while [ $i -lt $N ]; do
  python3 src/shots/s06/trace/mouth2js.py >/dev/null; python3 src/shots/s06/trace/blink2js.py >/dev/null
  sh tools/compare.sh $TS $OUT-$i >/dev/null
  python3 snapshots/s06-r2-tools/motion_mae.py $OUT-$i | tail -1
  for F in $OUT-$i/frame-*.png; do
    idx=$(basename $F | sed 's/frame-\([0-9]*\)-.*/\1/'); T=$(basename $F | sed 's/.*at-\([0-9.]*\)s.png/\1/')
    R=$(ls $OUT-$i/ref-$idx-*.png)
    python3 src/shots/s06/trace/calpatch.py $F $R snapshots/s06-r2-src/out/mouth.json $T 0.6 >/dev/null
    python3 -c "import sys; t=float('$T'); sys.exit(0 if 28.03<t<28.53 else 1)" && python3 src/shots/s06/trace/calpatch.py $F $R snapshots/s06-r2-src/out/owl_blink.json $T 0.6 >/dev/null
  done
  i=$((i+1))
done
python3 src/shots/s06/trace/mouth2js.py >/dev/null; python3 src/shots/s06/trace/blink2js.py >/dev/null
