#!/bin/sh
# end-s28-fix1: render source frame indices through this harness (s28w.js working copy). Usage: r.sh OUTDIR n0 n1 [step]  or  r.sh OUTDIR list n1,n2,...
SP=/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad
cd /Users/computer/rootline/apprentice-film/snapshots/end-s28-fix1-harness
if [ "$2" = "list" ]; then T=$(python3 -c "print(','.join(repr(int(n)/25) for n in '$3'.split(',')))");
else T=$(python3 -c "print(','.join(repr(n/25) for n in range($2,$3+1,${4:-1})))"); fi
node shoot.mjs "$1" "$T" snapshots/end-s28-fix1-harness/index.html 2>&1 | grep -v "^1[23][0-9]\." | tail -5
