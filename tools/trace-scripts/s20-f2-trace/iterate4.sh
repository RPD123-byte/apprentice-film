#!/bin/bash
cd /Users/computer/rootline/apprentice-film
T=snapshots/s20-f2-trace
rm -f $T/it4_done.txt
python3 src/shots/s20/trace/owlkeys.py build stare2 > $T/it4_keys.log 2>&1
rm -f $T/fits_stare2.json
python3 src/shots/s20/trace/owlkeys.py fit stare2 $(python3 -c "print(','.join(str(n) for n in range(1660,1686)))") > $T/fit_stare2.log 2>&1
python3 src/shots/s20/trace/select_frames.py > $T/it4_sel.log 2>&1
bash snapshots/s20-f2-dev/noowl.sh $(seq 1679 1687) > /dev/null 2>&1
python3 src/shots/s20/trace/owlkeys.py frame $(python3 -c "print(','.join(str(n) for n in range(1679,1688)))") > $T/it4_frames.log 2>&1
python3 src/shots/s20/trace/select_frames.py > $T/it4_sel.log 2>&1
echo done > $T/it4_done.txt
