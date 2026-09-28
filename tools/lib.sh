# shellcheck shell=sh
# Sourced by the tools/*.sh scripts (not run on its own).
# need_source: sets REF to the original film ($REF, else $APPRENTICE_SOURCE) or exits with a hint.
# label_font:  sets FONT to a TTF for ffmpeg's drawtext labels ($FONT, else Arial / DejaVu Sans / the repo's Fraunces).
TOOLS_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$TOOLS_DIR/.." && pwd)

need_source() {
  REF="${REF:-${APPRENTICE_SOURCE:-}}"
  if [ -z "$REF" ]; then
    echo "$(basename "$0"): set APPRENTICE_SOURCE=/path/to/your/copy/of/the/original.mp4 (2206x946, 25 fps, 140.8 s)" >&2
    exit 2
  fi
  if [ ! -f "$REF" ]; then
    echo "$(basename "$0"): source film not found: $REF" >&2
    exit 2
  fi
}

label_font() {
  if [ -n "${FONT:-}" ]; then return; fi
  for f in /System/Library/Fonts/Supplemental/Arial.ttf /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf \
           /usr/share/fonts/TTF/DejaVuSans.ttf "$REPO_ROOT/assets/fonts/Fraunces-Variable.ttf"; do
    if [ -f "$f" ]; then FONT="$f"; return; fi
  done
  echo "$(basename "$0"): no label font found; set FONT=/path/to/a/font.ttf" >&2
  exit 2
}
