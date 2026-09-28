#!/bin/sh
# owlfit.sh T x0 y0 x1 y1 outdir : owl-only render at T, fit overlay + side-by-side crop
T=$1; D=$6
node dev.mjs $D $T dbg=owlonly 2>&1 | grep "t=" ; python3 owlmask.py $T $D | tail -1
python3 sbs.py $D/r_$T.png $T $2 $3 $4 $5 $D/sbs_$T.jpg 1.2
