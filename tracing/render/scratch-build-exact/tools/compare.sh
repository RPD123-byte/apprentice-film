#!/bin/sh
# Render the composition at the given times and pair each frame with the SOURCE frame at the same time.
# Usage: tools/compare.sh 3,8.5,16 [outdir]   -> outdir/pair-NN-at-Ts.jpg (render | reference), frame-*.png, ref-*.png
# Use a unique outdir per agent (e.g. snapshots/s05) — several reviews may run at once.
REF="${REF:-/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4}"
OUT="${2:-snapshots/cmp}"
rm -rf "$OUT"
npx --yes hyperframes@0.8.69 snapshot --at "$1" --no-end --describe false --timeout 30000 --against "$REF" -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
