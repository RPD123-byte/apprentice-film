#!/bin/sh
# quick check: render a frame subset into $1 and print region errors (and keyline cores if $2 = k)
cd /Users/computer/rootline/apprentice-film
F=764,766,772,780,790,800,808,814
node snapshots/s08-fix2-tools/r.mjs $1 $F 2>&1 | grep -i "error\|pageerr"
python3 snapshots/s08-fix2-tools/regerr.py $1 $F ${3:-ucount,rnub,bottom,tail,colum,date1,ure,lobes,ribbon,cloud,card,sparkle}
[ "$2" = k ] && python3 snapshots/s08-fix2-tools/keycore.py $1 764,766
true
