#!/bin/sh
# kt.sh OUTDIR 'KOPT-json-without-keys' T1,T2,... : graded renders of single keys (at their own frames) via ktest.js
cd /Users/computer/rootline/apprentice-film
OUT=$1; OPT=$2; TS=$3
KEYS=$(python3 -c "print(','.join(str(round(float(t)*100)) for t in '$TS'.split(',')))")
KOPT=$(python3 -c "import json,sys; o=json.loads('''$OPT''' or '{}'); o['keys']='$KEYS'; print(json.dumps(o))") node snapshots/s04-fix1w/dev/dev.mjs $OUT $TS ../../snapshots/s04-fix1w/dev/ktest.js > $OUT.log 2>&1
tail -1 $OUT.log
