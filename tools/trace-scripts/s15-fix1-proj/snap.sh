#!/bin/sh
# snap.sh TIMES outdir  (run from the project root)
REF=/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4
OUT="$2"; rm -rf "$OUT"
cd /Users/computer/rootline/apprentice-film/snapshots/s15-fix1-proj && npx --yes hyperframes@0.8.69 snapshot . --at "$1" --no-end --describe false --timeout 60000 -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
