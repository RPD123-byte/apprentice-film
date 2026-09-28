#!/bin/sh
# Render the F2 harness (page alone, dev hippie.js) at the given times. Usage: render.sh 117.4,92 outdir [film]
# With a third argument "film", renders the whole film composition using the dev hippie.js instead.
cd /Users/computer/rootline/apprentice-film
DIR=snapshots/f2r-harness
[ "$3" = "film" ] && DIR=snapshots/f2r-film
rm -rf "$2"
npx --yes hyperframes@0.8.69 snapshot "$DIR" --at "$1" --no-end --describe false --timeout 90000 -o "$2" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
