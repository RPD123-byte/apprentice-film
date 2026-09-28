#!/bin/sh
# harness compare: hcmp.sh TIMES OUTDIR
REF=/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4
cd /Users/computer/rootline/apprentice-film/snapshots/f2k-harness
rm -rf "$2"
npx --yes hyperframes@0.8.69 snapshot . --at "$1" --no-end --describe false --timeout 30000 --against "$REF" -o "$2" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
