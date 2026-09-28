#!/bin/sh
# render frames with the s26 headless harness, score and write pairs. Usage: r.sh NAME F1,F2,... [box...]
cd /Users/computer/rootline/apprentice-film
OUT=snapshots/s26-fix1-out/$1
node snapshots/s26c-tools/render.mjs $OUT $2 > $OUT.log 2>&1
grep -i -E "error|pageerror" $OUT.log | head -5
python3 snapshots/s26-fix1-tools/cmp.py $OUT --pairs > $OUT.cmp
cat $OUT.cmp | tail -40
