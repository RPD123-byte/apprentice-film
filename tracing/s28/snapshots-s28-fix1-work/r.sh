#!/bin/sh
# s28 fix1 scratch render. Usage: r.sh HARNESSDIR TIMES OUTDIR
cd /Users/computer/rootline/apprentice-film
rm -rf "$3"
npx --yes hyperframes@0.8.69 snapshot "$1" --at "$2" --no-end --describe false --timeout 120000 -o "$3" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn" | head -20
ls "$3" | grep -c png
