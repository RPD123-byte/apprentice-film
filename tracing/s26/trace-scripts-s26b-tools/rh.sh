#!/bin/sh
# frame-exact render of s26 via the harness. Usage: rh.sh "2763,2790,..." outdir   (film frame indices)
FR="$1"; OUT="$2"
AT=$(python3 -c "print(','.join(str(int(f)-2700) for f in '$FR'.split(',')))")
rm -rf "$OUT"; mkdir -p "$OUT"
cd /Users/computer/rootline/apprentice-film/snapshots/s26b-harness
npx --yes hyperframes@0.8.69 snapshot . --at "$AT" --no-end --describe false --timeout 60000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
python3 /Users/computer/rootline/apprentice-film/snapshots/s26b-tools/pair.py "$OUT"
