#!/bin/bash
cd /Users/computer/rootline/apprentice-film
T=snapshots/s20-f2-trace
log() { echo "$(date +%H:%M:%S) $*" >> $T/it3.log; }
rm -f $T/it3.log $T/it3_done.txt $T/calib_*.json
log start
python3 src/shots/s20/trace/trace_all.py room > $T/it3_trace0.log 2>&1; log room-uncal
node snapshots/s20-f2-dev/dev.mjs snapshots/s20-f2-dev/rawroom.built.html $T/rawA.png "f=roomA" > /dev/null 2>&1
python3 src/shots/s20/trace/calib.py roomA $T/Afull.npy $T/rawA.png > $T/it3_calib.log 2>&1; log calib
python3 src/shots/s20/trace/trace_all.py room b2 behind grimy hold > $T/it3_trace.log 2>&1; log trace
node snapshots/s20-f2-dev/dev.mjs snapshots/s20-f2-dev/rawroom.built.html $T/rawA.png "f=roomA" > /dev/null 2>&1
python3 src/shots/s20/trace/calib.py roomA-check $T/Afull.npy $T/rawA.png > $T/it3_calib2.log 2>&1
python3 src/shots/s20/trace/owlkeys.py build rear front stare1 stare2 flap0 flap1 flap2 flap3 > $T/it3_keys.log 2>&1; log keys
FR=$(python3 -c "import json;print(' '.join(str(int(round(float(t)*25))) for t in json.load(open('$T/screen_frames.json'))))")
bash snapshots/s20-f2-dev/noowl.sh $FR > $T/it3_noowl.log 2>&1; log noowl
python3 src/shots/s20/trace/owlkeys.py frame $(echo $FR | tr ' ' ',') > $T/it3_frames.log 2>&1; log frames
python3 src/shots/s20/trace/select_frames.py > $T/it3_sel.log 2>&1; log select
echo done > $T/it3_done.txt
