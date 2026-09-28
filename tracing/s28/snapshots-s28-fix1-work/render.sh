#!/bin/sh
# s28 fix1 scratch harness render (s27 < 129.3, s28 after). Usage: render.sh 131.6,133.9 outdir
cd /Users/computer/rootline/apprentice-film
rm -rf "$2"
npx --yes hyperframes@0.8.69 snapshot snapshots/s28-fix1-harness --at "$1" --no-end --describe false --timeout 120000 -o "$2" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
