#!/bin/sh
# rend.sh OUTDIR k0 k1 [step]  -> renders source frames k at t = k/25 into OUTDIR/<k>.png (the live composition)
SP=/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23t
T=$(python3 -c "import sys;a,b=int(sys.argv[1]),int(sys.argv[2]);s=int(sys.argv[3]) if len(sys.argv)>3 else 1;print(','.join('%.5f'%(k/25) for k in range(a,b+1,s)))" $2 $3 $4)
node /Users/computer/rootline/apprentice-film/snapshots/end-s23-tfix-final/tools/shoot.mjs "$1" "$T" 2>&1 | grep -v -E "^[0-9]+\.[0-9]+ [0-9.]+ s$" | grep -v "404 (Not Found)"
