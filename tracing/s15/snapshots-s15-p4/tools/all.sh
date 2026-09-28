#!/bin/sh
# all.sh ROUNDS [TAKES...] : build every roto take, render the whole segment, refine face values; repeat
cd /Users/computer/rootline/apprentice-film; export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1
R=$1; shift
TAKES=${*:-"A:1018:1024 B:1025:1041 C:1043:1047 D:1049:1066 E:1068:1096 H:1098:1111 I:1112:1120 J:1122:1141"}
T="snapshots/s15-p4/tools"
build() { for x in $TAKES; do N=${x%%:*}; r=${x#*:}; F0=${r%%:*}; F1=${r#*:}; [ -f snapshots/s15-p4/roto/$F0.txt ] && python3 $T/build.py $N $F0 $F1 >/dev/null; done; }
build
i=0
while [ $i -lt $R ]; do
  (cd snapshots/s15-p4/harness && python3 run.py ../xall all 2>&1 | grep MEAN | tee -a ../xall-means.txt)
  for x in $TAKES; do N=${x%%:*}; r=${x#*:}; F0=${r%%:*}; F1=${r#*:}; [ -f snapshots/s15-p4/roto/$F0.txt ] && python3 $T/refine.py $N snapshots/s15-p4/xall $F0 $F1 0.8 >/dev/null; done
  build
  i=$((i+1))
done
(cd snapshots/s15-p4/harness && python3 run.py ../xall all --pairs 2>&1 | grep -v "GL Driver" > ../xall/log.txt; tail -1 ../xall/log.txt)
