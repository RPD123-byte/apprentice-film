#!/bin/sh
# keys.sh "t1 t2 ..." : trace room key views at those times (mask render -> registered median -> room_vec), 4 in parallel
cd /Users/computer/rootline/apprentice-film
TS="$1"; OPT="${2:-}"
CSV=$(echo $TS | tr ' ' ',')
node snapshots/s27-k-tools/layer.mjs $CSV snapshots/s27-k-mask '{"room":"mask"}' > /dev/null 2>&1
mkdir -p snapshots/s27-k-trace/keys
run() {
  t=$1; n=$(echo $t | tr '.' '_')
  T2=$(printf %.2f $t)
  python3 snapshots/s27-k-tools/keymask.py $t snapshots/s27-k-mask/l-$T2.png snapshots/s27-k-mask/km-$T2.png --gc > /dev/null &&
  python3 snapshots/s27-k-tools/reg_median.py $t snapshots/s27-k-trace/keys/med_$n.png 2 5 &&
  python3 snapshots/s27-k-tools/room_vec.py K$n $t $t $t snapshots/s27-k-mask/km-$T2.png snapshots/s27-k-trace/keys/k_$n.js 40 --medimg snapshots/s27-k-trace/keys/med_$n.png --dil 12 --fillall 400 --inkmin 10 --ink 18 $OPT > snapshots/s27-k-trace/keys/log_$n.txt 2>&1
  echo "done $t $(cat snapshots/s27-k-trace/keys/log_$n.txt | tail -1)"
}
i=0
for t in $TS; do
  run $t &
  i=$((i+1)); if [ $((i % 5)) -eq 0 ]; then wait; fi
done
wait
