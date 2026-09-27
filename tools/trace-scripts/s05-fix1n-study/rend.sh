#!/bin/sh
# rend.sh OUTNAME "k1,k2,..." [u]  -> renders exact source frames k (graded; u = ungraded) into ../s05-fix1n-proj/OUTNAME
cd /Users/computer/rootline/apprentice-film/snapshots/s05-fix1n-proj
OUT="$1"; KS="$2"; MODE="$3"
AT=$(python3 -c "
ks=[int(x) for x in '$KS'.split(',')]; off=10 if '$MODE'=='u' else 0
print(','.join(f'{off+(k-578+0.3)/30:.4f}' for k in ks))")
rm -rf "$OUT"
npx --yes hyperframes@0.8.69 snapshot . --at "$AT" --no-end --describe false --timeout 60000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn" | head -20
ls "$OUT" | grep -c png
