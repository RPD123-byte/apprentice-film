#!/bin/bash
# noowl.sh n1 n2 ... : owl-less raw renders for the given frame numbers -> snapshots/s20-f2-trace/noowl-<t>.png
cd /Users/computer/rootline/apprentice-film
ARGS=()
for n in "$@"; do t=$(python3 -c "print('%.2f'%($n/25))"); ARGS+=("snapshots/s20-f2-trace/noowl-$t.png" "t=$t&raw=1&noowl=1&nodust=1"); done
node snapshots/s20-f2-dev/dev.mjs snapshots/s20-f2-dev/shot.built.html "${ARGS[@]}" 2>&1 | grep -v Noise | grep -v "^saved"
