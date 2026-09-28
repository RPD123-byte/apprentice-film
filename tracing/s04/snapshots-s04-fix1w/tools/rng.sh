#!/bin/sh
# rng.sh OUTDIR F0 F1 : render s04 frames F0..F1 (25 fps indices) in the harness (graded)
cd /Users/computer/rootline/apprentice-film
T=$(python3 -c "print(','.join(f'{i/25:.2f}' for i in range($2,$3+1)))")
node snapshots/s04-fix1w/dev/dev.mjs $1 $T ${MOD:-s04.js} > $1.log 2>&1
grep -h "ms$" $1.log | awk '{gsub("ms","",$2); s+=$2; n++; if($2>m)m=$2} END {print "draw ms mean", s/n, "max", m}'
