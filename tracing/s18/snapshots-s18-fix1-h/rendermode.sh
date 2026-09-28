#!/bin/sh
# rendermode.sh MODE OUTDIR : renders 1338-1381 through kmtest.mjs with KM.mode = MODE, graded, renamed to r<f>.png
M=$1; O=$2; L=""
for f in $(seq 1338 1381); do L="$L,$((M*10000+f))"; done
node render.mjs $O.tmp ${L#,} 0 ./kmtest.mjs | tail -1
mkdir -p $O; for f in $(seq 1338 1381); do mv $O.tmp/r$((M*10000+f)).png $O/r$f.png; done; rmdir $O.tmp
