#!/bin/sh
# end-s27-tfix: trace room key views at source frames (plate -> mask -> room_vec), 4 at a time. Usage: keys.sh "3197 3200 ..."
cd /Users/computer/rootline/apprentice-film/snapshots/end-s27-tfix-work
T=../end-s27-tfix-tools
mkdir -p plates tr
run() {
  F=$1; t=$(python3 -c "print('%.2f'%($F/25))"); n=$(echo $t | tr '.' '_')
  [ -f plates/p$F.png ] || FM_GS=32 python3 $T/plate.py $F 2 plates/p$F.png 4 > /dev/null;
  [ -f tr/km$F.png ] || GCR=8 python3 $T/keymask2.py $F plates/p$F.png tr/km$F.png > /dev/null;
  python3 $T/room_vec.py O$n $t $t $t tr/km$F.png tr/o_$n.js 40 --medimg plates/p$F.png --dil 14 --fillall 400 --inkmin 40 --sato 1.0,2.5 --inpd 5 --premed 5 --prebil 10 --minarea 60 --core 2 --inkpx 12 --inkgrow 1 > tr/log_$F.txt 2>&1
  echo "done $F $(tail -1 tr/log_$F.txt)"
}
i=0
for F in $1; do
  run $F &
  i=$((i+1)); if [ $((i % 4)) -eq 0 ]; then wait; fi
done
wait
