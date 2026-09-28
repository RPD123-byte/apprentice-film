#!/bin/sh
# look.sh NAME t1,t2 x0 y0 x1 y1 scale [pose.json]  -> ../s21-fix1b-v/NAME.jpg
N=$1; T=$2; shift 2
OUT=../s21-fix1b-h/tmp-$N
if [ -n "$6" ]; then node run.mjs $OUT $T --pose $6 >/dev/null 2>&1; else node run.mjs $OUT $T >/dev/null 2>&1; fi
python3 sbs.py $OUT ../s21-fix1b-v/$N.jpg $T $1 $2 $3 $4 $5
