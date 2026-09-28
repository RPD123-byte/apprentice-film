#!/bin/sh
# render harness frames: render.sh "k1,k2,..." outdir  (k = source frame index; harness time = (k-7)/25)
KS="$1"; OUT="$2"
TIMES=$(python3 -c "
ks=[int(v) for v in '$KS'.split(',')]
print(','.join('%.4f'%((k-7)/25+0.0005) for k in ks))")
rm -rf "$OUT"
cd "$(dirname "$0")" && npx --yes hyperframes@0.8.69 snapshot . --at "$TIMES" --no-end --describe false --timeout 60000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn" | head -20
ls "$OUT" | head -3
