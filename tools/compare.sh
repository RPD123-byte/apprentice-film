#!/bin/sh
# Render the composition at the given times and pair each frame with the SOURCE frame at the same time.
# Usage: tools/compare.sh 3,8.5,16 [outdir]   -> outdir/pair-NN-at-Ts.jpg (render | reference), frame-*.png, ref-*.png
# Needs APPRENTICE_SOURCE. outdir defaults to snapshots/cmp (relative to the current directory). It must be a new
# folder or one this script made before (it carries a .compare-out marker); only then is it cleared and reused.
# If loading every shot times out, use tools/harness/shoot.mjs (no per-seek timeout).
. "$(dirname "$0")/lib.sh"
need_source
OUT="${2:-snapshots/cmp}"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
if [ -e "$OUT" ]; then
  if [ ! -d "$OUT" ] || [ ! -f "$OUT/.compare-out" ]; then
    echo "compare.sh: $OUT exists and was not made by compare.sh; give a new folder (e.g. snapshots/<name>)" >&2
    exit 2
  fi
  find "$OUT" -mindepth 1 -delete
fi
mkdir -p "$OUT" && touch "$OUT/.compare-out" || exit 1
cd "$REPO_ROOT" || exit 1
npx --yes hyperframes@0.8.69 snapshot --at "$1" --no-end --describe false --timeout 30000 --against "$REF" -o "$OUT" 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E -i "error|fail|saved|warn" | head -20
touch "$OUT/.compare-out"
