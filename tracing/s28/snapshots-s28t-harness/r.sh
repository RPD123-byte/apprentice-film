#!/bin/sh
# s28t scratch render through the harness. Usage: r.sh TIMES OUTDIR
cd /Users/computer/rootline/apprentice-film
rm -rf "$2"
npx --yes hyperframes@0.8.69 snapshot snapshots/s28t-harness --at "$1" --no-end --describe false --timeout 180000 -o "$2" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn|console" | head -30
ls "$2" | grep -c png
