#!/bin/sh
# loop.sh NAME F0 F1 ROUNDS : build roto NAME, render its frames, refine the face values, repeat; prints the mean score per round
N=$1; F0=$2; F1=$3; R=${4:-3}
cd /Users/computer/rootline/apprentice-film; export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1
T0=$(python3 -c "print(f'{$F0/25:.2f}')"); T1=$(python3 -c "print(f'{$F1/25:.2f}')")
python3 snapshots/s15-p4/tools/build.py $N $F0 $F1 >/dev/null
i=0
while [ $i -lt $R ]; do
  (cd snapshots/s15-p4/harness && python3 run.py ../x$N $T0:$T1 2>&1 | grep MEAN)
  python3 snapshots/s15-p4/tools/refine.py $N snapshots/s15-p4/x$N $F0 $F1 0.8 >/dev/null
  python3 snapshots/s15-p4/tools/build.py $N $F0 $F1 >/dev/null
  i=$((i+1))
done
(cd snapshots/s15-p4/harness && python3 run.py ../x$N $T0:$T1 --pairs 2>&1 | grep -v "GL Driver" | tail -30)
