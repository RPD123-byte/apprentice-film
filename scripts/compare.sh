#!/usr/bin/env bash
# Build the stacked comparison video (npm run compare):
#   comparison/renders/opus-5.5-vs-original-seedance.mp4 — the recreation on top, the original underneath, labelled,
#   with the recreation's soundtrack (comparison/index.html, 1920x1656, 140.8 s).
# Needs APPRENTICE_SOURCE (your copy of the original film). Steps:
#   1. renders the film first if renders/film.mp4 is missing (npm run render, about 12.5 min on an M4 Max);
#      set RECREATION=path/to/other.mp4 to stack a different render instead
#   2. links comparison/media/ (scripts/link-media.sh)
#   3. renders comparison/ with HyperFrames
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
[ -n "${APPRENTICE_SOURCE:-}" ] || { echo "compare: set APPRENTICE_SOURCE=/path/to/your/copy/of/the/original.mp4" >&2; exit 1; }
if [ -z "${RECREATION:-}" ] && [ ! -f renders/film.mp4 ]; then
  echo "compare: renders/film.mp4 is missing; rendering the film first"
  npm run render
fi
[ -f "${RECREATION:-renders/film.mp4}" ] || { echo "compare: ${RECREATION:-renders/film.mp4} not found" >&2; exit 1; }
bash scripts/link-media.sh
cd comparison
npm run render
echo "compare: wrote comparison/renders/opus-5.5-vs-original-seedance.mp4"
