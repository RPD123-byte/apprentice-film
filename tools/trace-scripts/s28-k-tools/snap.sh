#!/bin/sh
# render s28 alone (harness) at times $1 into $2 (absolute or relative to apprentice-film)
cd /Users/computer/rootline/apprentice-film/snapshots/s28-harness
OUT="$2"; case "$OUT" in /*) ;; *) OUT="/Users/computer/rootline/apprentice-film/$OUT";; esac
rm -rf "$OUT"
npx --yes hyperframes@0.8.69 snapshot --at "$1" --no-end --describe false --timeout 60000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
