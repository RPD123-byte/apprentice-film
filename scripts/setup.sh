#!/usr/bin/env bash
# One-time setup after cloning (npm run setup). Safe to run again.
#
#   npm run setup                                         check tools, install dependencies, fetch fonts
#   npm run setup -- --strict-fonts                       ... and fail if Satoshi is not the pinned build
#   APPRENTICE_SOURCE=/path/to/original.mp4 npm run setup  ... and link comparison/media/ for the comparison video
#
# Rendering needs only Node, ffmpeg, Chrome (step 4) and the Satoshi font (step 5). Python is for the tools.
#
# Steps:
#   1. checks Node >= 22.12, npm, ffmpeg + ffprobe, curl, unzip
#   2. Python 3.11 + tools/requirements.txt: made in .venv/ (git-ignored) with python3.11, or installed into the
#      interpreter named by $PYTHON if you set it. Point $PYTHON at a venv or conda interpreter: Homebrew's Python and
#      most system Pythons refuse pip installs (PEP 668). The npm scripts run Python through scripts/py, which picks
#      the same one. If this step fails, setup prints a warning and goes on: the render does not need Python, but
#      npm run score, npm run verify, npm run fidelity and the tools in tools/ will not work until it is set up.
#   3. npm install (puppeteer-core, used by tools/harness/)
#   4. npx hyperframes@0.8.69 browser ensure (downloads chrome-headless-shell if there is none)
#   5. scripts/fetch-fonts.sh (Satoshi, which may not be redistributed; see assets/fonts/LICENSES.md). If the
#      installed or downloaded Satoshi is a different build from the pinned one (Fontshare has shipped an update), it
#      warns and uses it; the end card may then differ slightly from the published video.
#   6. if APPRENTICE_SOURCE is set: scripts/link-media.sh
#
# Options:
#   --no-python      skip step 2
#   --no-browser     skip step 4
#   --strict-fonts   make step 5 fail unless Satoshi matches the pinned SHA-256 (runs fetch-fonts.sh --strict)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
HF="hyperframes@0.8.69"
DO_PY=1
DO_BROWSER=1
FONT_ARGS=()
for a in "$@"; do
  case "$a" in
    --no-python) DO_PY=0 ;;
    --no-browser) DO_BROWSER=0 ;;
    --strict-fonts) FONT_ARGS=(--strict) ;;
    -h|--help) awk 'NR == 1 { next } /^#/ { sub(/^# ?/, ""); print; next } { exit }' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "setup: unknown option $a (try --help)" >&2; exit 2 ;;
  esac
done

step() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok  %s\n' "$*"; }
warn() { printf '   warning: %s\n' "$*" >&2; }
die() { printf 'setup: %s\n' "$*" >&2; exit 1; }

step "1/6 tools"
NODE_NEED="Node.js 22.12 or newer is required (hyperframes@0.8.69 needs Node 22, puppeteer-core 25.12.0 needs 22.12).
  macOS: brew install node@22, then put \$(brew --prefix node@22)/bin on PATH. Debian/Ubuntu: nvm install 22, or
  NodeSource's nodejs 22 package (the distribution's own nodejs is usually older). Other systems: https://nodejs.org"
command -v node >/dev/null 2>&1 || die "$NODE_NEED"
node -e 'const [a, b] = process.versions.node.split(".").map(Number); process.exit(a > 22 || (a === 22 && b >= 12) ? 0 : 1)' \
  || die "found Node.js $(node -v). $NODE_NEED"
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
pyver() { "$1" -c 'import sys; print("%d.%d" % sys.version_info[:2])' 2>/dev/null; }
# Sets PY_WHY and returns 1 on failure. (set -e does not apply inside a function called from `if`.)
setup_python() {
  local PY BASE V NEW
  if [ -n "${PYTHON:-}" ]; then
    PY="$PYTHON"
    command -v "$PY" >/dev/null 2>&1 || { PY_WHY="PYTHON=$PY is not an executable."; return 1; }
    V="$(pyver "$PY")"
    [ "$V" = "3.11" ] || warn "PYTHON is Python $V; the pinned packages were used with 3.11"
  else
    if [ ! -x .venv/bin/python ]; then
      BASE=""
      for c in python3.11 python3; do
        if command -v "$c" >/dev/null 2>&1 && [ "$(pyver "$c")" = "3.11" ]; then BASE="$c"; break; fi
      done
      [ -n "$BASE" ] || { PY_WHY="no Python 3.11 found (looked for python3.11, and python3 at version 3.11, on PATH)."; return 1; }
      NEW=0; [ -e .venv ] || NEW=1
      if ! "$BASE" -m venv .venv; then
        [ "$NEW" = 0 ] || rm -rf .venv
        PY_WHY="could not make .venv with $BASE (on Debian/Ubuntu: apt install python3.11-venv)."
        return 1
      fi
      ok "made .venv with $("$BASE" --version)"
    fi
    PY=.venv/bin/python
  fi
  "$PY" -m pip install --quiet --disable-pip-version-check -r tools/requirements.txt || {
    PY_WHY="pip could not install tools/requirements.txt into $PY. If that is Homebrew's or the system's Python, pip
   installs are blocked there (PEP 668): leave PYTHON unset so setup makes .venv, or point it at a venv or conda interpreter."
    return 1
  }
  "$PY" -c 'import numpy, scipy, numba, soundfile, cv2, librosa, matplotlib' \
    || { PY_WHY="the packages in tools/requirements.txt do not import with $PY."; return 1; }
  ok "$("$PY" --version) with tools/requirements.txt ($PY)"
}
PY_STATE=ok
PY_WHY=""
if [ "$DO_PY" = 0 ]; then
  PY_STATE=skipped
  echo "   skipped (--no-python)"
elif ! setup_python; then
  PY_STATE=failed
  warn "Python is not set up: $PY_WHY
   Rendering does not need Python (npm run render uses Node, ffmpeg and the committed audio/score.wav), so setup
   carries on. Until Python 3.11 is set up, these will not work: npm run score, npm run verify, npm run fidelity,
   and the tools in tools/. To fix: install Python 3.11 (macOS: brew install python@3.11; Debian/Ubuntu: apt install
   python3.11 python3.11-venv) and run npm run setup again, or set PYTHON to a venv or conda interpreter."
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
bash scripts/fetch-fonts.sh ${FONT_ARGS[@]+"${FONT_ARGS[@]}"}

step "6/6 comparison media"
if [ -n "${APPRENTICE_SOURCE:-}" ]; then
  bash scripts/link-media.sh
else
  echo "   skipped: set APPRENTICE_SOURCE=/path/to/original.mp4 to link comparison/media/ (only the comparison video and"
  echo "   the measuring tools need the original film; rendering the recreation does not)"
fi

case "$PY_STATE" in
  ok) printf '\nSetup done. Next: npm run render  (then npm run verify)\n' ;;
  skipped) printf '\nSetup done (Python skipped). Next: npm run render. npm run verify needs Python 3.11 (npm run setup again).\n' ;;
  failed) printf '\nSetup done without Python (see the warning in step 2). Next: npm run render.\nnpm run verify, score and fidelity need Python 3.11.\n' ;;
esac
