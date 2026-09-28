#!/usr/bin/env bash
# Link the two videos the comparison project (comparison/) stacks:
#   comparison/media/original.mp4   -> $APPRENTICE_SOURCE (your copy of the original film; it is not in this repository)
#   comparison/media/recreation.mp4 -> $RECREATION (default renders/film.mp4, the output of `npm run render`)
# The links are relative, so the checkout can be moved. Existing links are replaced; a regular file in their place is
# left alone. comparison/media/ is git-ignored.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MEDIA="$ROOT/comparison/media"
die() { echo "link-media: $*" >&2; exit 1; }

SRC="${APPRENTICE_SOURCE:-}"
[ -n "$SRC" ] || die "set APPRENTICE_SOURCE=/path/to/your/copy/of/the/original.mp4"
[ -f "$SRC" ] || die "APPRENTICE_SOURCE does not point at a file: $SRC"
REC="${RECREATION:-renders/film.mp4}"
case "$REC" in /*) ;; *) REC="$ROOT/$REC" ;; esac
case "$SRC" in /*) ;; *) SRC="$PWD/$SRC" ;; esac

relpath() { python3 -c 'import os, sys; print(os.path.relpath(os.path.abspath(sys.argv[1]), sys.argv[2]))' "$1" "$2"; }

link() {
  local name="$1" target="$2" p="$MEDIA/$1"
  if [ -e "$p" ] && [ ! -L "$p" ]; then
    echo "link-media: $p is a regular file; leaving it as it is" >&2
    return
  fi
  ln -sfn "$(relpath "$target" "$MEDIA")" "$p"
  echo "link-media: comparison/media/$name -> $(readlink "$p")"
}

mkdir -p "$MEDIA"
link original.mp4 "$SRC"
link recreation.mp4 "$REC"
[ -f "$REC" ] || echo "link-media: note: $REC does not exist yet; run npm run render first" >&2
exit 0
