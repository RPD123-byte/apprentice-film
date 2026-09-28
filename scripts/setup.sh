#!/usr/bin/env bash
# One-time setup after cloning (npm run setup). Safe to run again.
#
#   npm run setup                                         check tools, install dependencies, fetch fonts
#   APPRENTICE_SOURCE=/path/to/original.mp4 npm run setup  ... and link comparison/media/ for the comparison video
#
# Steps:
#   1. checks Node >= 18, npm, ffmpeg + ffprobe, curl, unzip
#   2. Python 3.11 + tools/requirements.txt: made in .venv/ (git-ignored) with python3.11, or installed into the
#      interpreter named by $PYTHON if you set it. The npm scripts run Python through scripts/py, which picks the same one.
#   3. npm install (puppeteer-core, used by tools/harness/)
#   4. npx hyperframes@0.8.69 browser ensure (downloads chrome-headless-shell if there is none)
#   5. scripts/fetch-fonts.sh (Satoshi, which may not be redistributed; see assets/fonts/LICENSES.md)
#   6. if APPRENTICE_SOURCE is set: scripts/link-media.sh
#
# Options: --no-python (skip step 2), --no-browser (skip step 4).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
HF="hyperframes@0.8.69"
DO_PY=1
DO_BROWSER=1
for a in "$@"; do
  case "$a" in
    --no-python) DO_PY=0 ;;
    --no-browser) DO_BROWSER=0 ;;
    -h|--help) sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "setup: unknown option $a (try --help)" >&2; exit 2 ;;
  esac
done

step() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
die() { printf 'setup: %s\n' "$*" >&2; exit 1; }

step "1/6 tools"
command -v node >/dev/null 2>&1 || die "Node.js 18 or newer is required (https://nodejs.org)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 18 ] || die "Node.js 18 or newer is required (found $(node -v))"
ok "node $(node -v)"
command -v npm >/dev/null 2>&1 || die "npm is required"
ok "npm $(npm -v)"
for t in ffmpeg ffprobe; do
  command -v "$t" >/dev/null 2>&1 || die "$t is required (macOS: brew install ffmpeg; Debian/Ubuntu: apt install ffmpeg)"
done
ok "$(ffmpeg -version | head -n 1)"
for t in curl unzip; do
  command -v "$t" >/dev/null 2>&1 || die "$t is required"
done
ok "curl, unzip"

step "2/6 Python 3.11 + tools/requirements.txt"
if [ "$DO_PY" = 0 ]; then
  echo "   skipped (--no-python)"
else
  pyver() { "$1" -c 'import sys; print("%d.%d" % sys.version_info[:2])'; }
  if [ -n "${PYTHON:-}" ]; then
    PY="$PYTHON"
    command -v "$PY" >/dev/null 2>&1 || die "PYTHON=$PY is not an executable"
    V="$(pyver "$PY")"
    [ "$V" = "3.11" ] || echo "   warning: PYTHON is Python $V; the pinned packages were used with 3.11" >&2
  else
    if [ ! -x .venv/bin/python ]; then
      BASE=""
      for c in python3.11 python3; do
        if command -v "$c" >/dev/null 2>&1 && [ "$(pyver "$c")" = "3.11" ]; then BASE="$c"; break; fi
      done
      [ -n "$BASE" ] || die "Python 3.11 is required (install it, or set PYTHON=/path/to/python to use another interpreter)"
      "$BASE" -m venv .venv
      ok "made .venv with $("$BASE" --version)"
    fi
    PY=.venv/bin/python
  fi
  "$PY" -m pip install --quiet --disable-pip-version-check -r tools/requirements.txt
  "$PY" -c 'import numpy, scipy, numba, soundfile, cv2, librosa, matplotlib'
  ok "$("$PY" --version) with tools/requirements.txt ($PY)"
fi

step "3/6 npm install"
npm install --no-audit --no-fund
ok "node_modules (puppeteer-core for tools/harness/)"

step "4/6 Chrome for rendering"
if [ "$DO_BROWSER" = 0 ]; then
  echo "   skipped (--no-browser)"
else
  npx --yes "$HF" browser ensure
fi

step "5/6 fonts"
bash scripts/fetch-fonts.sh

step "6/6 comparison media"
if [ -n "${APPRENTICE_SOURCE:-}" ]; then
  bash scripts/link-media.sh
else
  echo "   skipped: set APPRENTICE_SOURCE=/path/to/original.mp4 to link comparison/media/ (only the comparison video and"
  echo "   the measuring tools need the original film; rendering the recreation does not)"
fi

printf '\nSetup done. Next: npm run render  (then npm run verify)\n'
