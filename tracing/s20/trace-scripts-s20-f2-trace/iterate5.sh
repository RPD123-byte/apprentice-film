#!/bin/bash
cd /Users/computer/rootline/apprentice-film
T=snapshots/s20-f2-trace
rm -f $T/it5_done.txt
bash snapshots/s20-f2-dev/noowl_nodust.sh $(seq 1644 1679) > /dev/null 2>&1
THR=0.035 python3 src/shots/s20/trace/owlkeys.py framedust $(python3 -c "print(','.join(str(n) for n in range(1644,1680) if n not in (1645,1650,1660)))") > $T/it5_frames.log 2>&1
python3 src/shots/s20/trace/select_frames.py > $T/it5_sel.log 2>&1
echo done > $T/it5_done.txt
