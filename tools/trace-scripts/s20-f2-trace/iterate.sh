#!/bin/sh
# refit keys -> rebuild room composites with the key silhouettes -> retrace room -> rebuild keys -> refit
cd /Users/computer/rootline/apprentice-film
T=snapshots/s20-f2-trace
fit() {
  rm -f $T/fits_rear.json $T/fits_front.json $T/fits_stare1.json $T/fits_stare2.json
  python3 src/shots/s20/trace/owlkeys.py fit rear $(python3 -c "print(','.join(str(n) for n in range(1578,1596)))") > $T/fit_rear.log 2>&1
  python3 src/shots/s20/trace/owlkeys.py fit front $(python3 -c "print(','.join(str(n) for n in range(1590,1610)))") > $T/fit_front.log 2>&1
  python3 src/shots/s20/trace/owlkeys.py fit stare1 $(python3 -c "print(','.join(str(n) for n in range(1638,1668)))") > $T/fit_stare1.log 2>&1
  python3 src/shots/s20/trace/owlkeys.py fit stare2 $(python3 -c "print(','.join(str(n) for n in range(1660,1686)))") > $T/fit_stare2.log 2>&1
}
fit
python3 src/shots/s20/trace/composite2.py A card full > $T/it_comp.log 2>&1
python3 $T/holdmask.py > $T/it_hold.log 2>&1
python3 src/shots/s20/trace/trace_all.py room b2 > $T/it_trace.log 2>&1
python3 src/shots/s20/trace/owlkeys.py build rear front stare1 stare2 > $T/it_keys.log 2>&1
fit
echo ITERATE DONE > $T/it_done.txt
