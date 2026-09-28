#!/bin/sh
# quick.sh OUT "f1,f2,..." : syntax check, exact-frame render of the listed frames + metrics (regions)
cd /Users/computer/rootline/apprentice-film
SP=snapshots/s13-fix1-tools/.chk; mkdir -p $SP
for f in src/shots/s13.js src/shots/s13/*.js; do cp "$f" $SP/chk.mjs; node --check $SP/chk.mjs 2>&1 | head -3 | grep -q . && { echo "SYNTAX ERROR in $f"; node --check $SP/chk.mjs 2>&1 | head -4; exit 1; }; done
sh snapshots/s13-w3-tools/render.sh "$1" 890 890 "$2" 2>&1 | grep -i -E "error|fail" | head -5
python3 snapshots/s13-w3-tools/metrics.py "$1" --regions | grep -v "^group\|^frame"
