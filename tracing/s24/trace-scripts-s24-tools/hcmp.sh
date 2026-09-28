#!/bin/sh
# render s24 frames k (comma list) exactly through the harness, then pair with the source frames: hcmp.sh "7,8,23" outdir
cd /Users/computer/rootline/apprentice-film/snapshots/s24-harness || exit 1
OUT="$2"; rm -rf "$OUT"
AT=$(python3 -c "print(','.join('%.2f'%(int(k)+0.5) for k in '$1'.split(',')))")
npx --yes hyperframes@0.8.69 snapshot --at "$AT" --no-end --describe false --timeout 60000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved" | head -5
python3 /Users/computer/rootline/apprentice-film/snapshots/s24-tools/hpair.py "$OUT"
