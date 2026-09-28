#!/bin/bash
cd /Users/computer/rootline/apprentice-film
T=snapshots/s20-f2-trace
log() { echo "$(date +%H:%M:%S) $*" >> $T/it2.log; }
rm -f $T/it2.log $T/it2_done.txt
log start
python3 src/shots/s20/trace/composite2.py A card full > $T/it2_comp.log 2>&1; log composite
python3 $T/holdmask.py > $T/it2_hold.log 2>&1; log holdmask
python3 src/shots/s20/trace/trace_all.py room b2 > $T/it2_trace.log 2>&1; log trace
python3 src/shots/s20/trace/owlkeys.py build rear front stare1 stare2 flap0 flap1 flap2 flap3 > $T/it2_keys.log 2>&1; log keys
rm -f $T/fits_rear.json $T/fits_front.json $T/fits_stare1.json $T/fits_stare2.json $T/fits_flap?.json
python3 src/shots/s20/trace/owlkeys.py fit rear $(python3 -c "print(','.join(str(n) for n in range(1578,1596)))") > $T/fit_rear.log 2>&1 &
python3 src/shots/s20/trace/owlkeys.py fit front $(python3 -c "print(','.join(str(n) for n in range(1590,1610)))") > $T/fit_front.log 2>&1 &
python3 src/shots/s20/trace/owlkeys.py fit stare1 $(python3 -c "print(','.join(str(n) for n in range(1638,1668)))") > $T/fit_stare1.log 2>&1 &
python3 src/shots/s20/trace/owlkeys.py fit stare2 $(python3 -c "print(','.join(str(n) for n in range(1660,1686)))") > $T/fit_stare2.log 2>&1 &
wait
for k in 0 1 2 3; do python3 src/shots/s20/trace/owlkeys.py fit flap$k $(python3 -c "print(','.join(str(n) for n in range(1608,1644)))") > $T/fit_flap$k.log 2>&1 & done
wait; log fits
python3 src/shots/s20/trace/select_frames.py > $T/it2_sel.log 2>&1
FR=$(python3 -c "import json;print(' '.join(str(int(round(float(t)*25))) for t in json.load(open('$T/screen_frames.json'))))")
bash snapshots/s20-f2-dev/noowl.sh $FR > $T/it2_noowl.log 2>&1; log noowl
python3 src/shots/s20/trace/owlkeys.py frame $(echo $FR | tr ' ' ',') > $T/it2_frames.log 2>&1; log frames
python3 src/shots/s20/trace/select_frames.py > $T/it2_sel.log 2>&1
python3 src/shots/s20/trace/dust.py > $T/it2_dust.log 2>&1; log dust
echo done > $T/it2_done.txt
