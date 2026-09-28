#!/bin/sh
# render the s27 harness (s27 alone through the film's grade) at film times into snapshots/s27-fix1-NAME
P=/Users/computer/rootline/apprentice-film
case "$2" in */*|""|.*) echo "give a bare name"; exit 1;; esac
OUT="$P/snapshots/s27-fix1-$2"
rm -rf "$OUT"
cd "$P" && npx --yes hyperframes@0.8.69 snapshot snapshots/s27d-harness --at "$1" --no-end --describe false --timeout 120000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|warn" | head -20
ls "$OUT" | grep -c png
