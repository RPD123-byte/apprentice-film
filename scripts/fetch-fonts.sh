#!/usr/bin/env bash
# Download the one font this repo may not redistribute: Satoshi.
#
# Every other face in assets/fonts/ is under the SIL Open Font License and is committed with the repo
# (see assets/fonts/LICENSES.md). Satoshi belongs to the Indian Type Foundry and is licensed under the
# ITF Free Font License (FFL), which forbids redistributing the font files through a repository or a
# public server. So each person who renders the film downloads it themselves from Fontshare, ITF's
# official distribution. By running this script you download Satoshi from Fontshare and accept the FFL:
#   https://www.fontshare.com/terms   (the full text is License/FFL.txt inside the download)
#
# The film uses the web build, Fonts/WEB/fonts/Satoshi-Variable.woff2, exactly as Fontshare ships it.
# The script checks it against the SHA-256 of the copy the film was rendered with.
#
# Usage: scripts/fetch-fonts.sh [--dest DIR] [--force] [--allow-update]
#   --dest DIR      install into DIR instead of assets/fonts/ (for testing)
#   --force         replace an existing Satoshi-Variable.woff2 whose checksum does not match
#   --allow-update  accept a newer Satoshi build from Fontshare whose checksum differs from the pinned one
#                   (the end-card lettering in shot s40 may then differ slightly from the original render)
#
# Safe to run again: if the verified file is already in place it does nothing.
set -euo pipefail

URL="https://api.fontshare.com/v2/fonts/download/satoshi"
MEMBER="Fonts/WEB/fonts/Satoshi-Variable.woff2"   # path inside the zip, under Satoshi_Complete/
NAME="Satoshi-Variable.woff2"
SHA256="e739aff9b4d02c264341d6d4872edcda28e79373aeda936f659566a1cd3eb47f"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/assets/fonts"
FORCE=0
ALLOW_UPDATE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dest) DEST="${2:?--dest needs a directory}"; shift 2 ;;
    --force) FORCE=1; shift ;;
    --allow-update) ALLOW_UPDATE=1; shift ;;
    -h|--help) sed -n '2,21p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "fetch-fonts: unknown option $1 (try --help)" >&2; exit 2 ;;
  esac
done

die() { echo "fetch-fonts: $*" >&2; exit 1; }

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

is_woff2() { [ -s "$1" ] && [ "$(head -c 4 "$1")" = "wOF2" ]; }

for tool in curl unzip; do
  command -v "$tool" >/dev/null 2>&1 || die "needs '$tool' on PATH"
done
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 || die "needs sha256sum or shasum on PATH"

TARGET="$DEST/$NAME"

# Already installed?
if [ -e "$TARGET" ]; then
  have="$(sha256 "$TARGET")"
  if [ "$have" = "$SHA256" ]; then
    echo "fetch-fonts: $TARGET is present and verified (sha256 $SHA256)"
    exit 0
  fi
  if [ "$ALLOW_UPDATE" = 1 ] && is_woff2 "$TARGET"; then
    echo "fetch-fonts: $TARGET is present (a different Satoshi build, sha256 $have; accepted with --allow-update)"
    exit 0
  fi
  [ "$FORCE" = 1 ] || die "$TARGET exists but its sha256 is $have, not $SHA256. Rerun with --force to replace it."
fi

mkdir -p "$DEST"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/fetch-fonts.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

echo "fetch-fonts: downloading Satoshi from Fontshare ($URL)"
echo "fetch-fonts: Satoshi is (c) Indian Type Foundry, licensed to you under the ITF Free Font License (https://www.fontshare.com/terms)"
curl -fsSL --retry 3 --connect-timeout 20 --max-time 300 -o "$TMP/satoshi.zip" "$URL" \
  || die "download failed from $URL. Get Satoshi from https://www.fontshare.com/fonts/satoshi and copy $MEMBER to $TARGET"

# Find the web build inside the zip (it sits under Satoshi_Complete/ today; match on the tail of the path).
member="$(unzip -Z1 "$TMP/satoshi.zip" | grep -E "(^|/)$MEMBER\$" | head -n 1 || true)"
[ -n "$member" ] || die "the Fontshare zip has no $MEMBER; its layout has changed. Contents: $(unzip -Z1 "$TMP/satoshi.zip" | tr '\n' ' ')"
unzip -p "$TMP/satoshi.zip" "$member" > "$TMP/$NAME"

is_woff2 "$TMP/$NAME" || die "$member in the download is not a WOFF2 file"
got="$(sha256 "$TMP/$NAME")"
if [ "$got" != "$SHA256" ]; then
  if [ "$ALLOW_UPDATE" = 1 ]; then
    echo "fetch-fonts: warning: Fontshare now ships a different Satoshi build (sha256 $got, pinned $SHA256); installing it because of --allow-update" >&2
  else
    die "Fontshare's Satoshi-Variable.woff2 has sha256 $got, not the pinned $SHA256 the film was rendered with. Rerun with --allow-update to use it anyway."
  fi
fi

# Install atomically: copy next to the target, then rename over it.
cp "$TMP/$NAME" "$TARGET.part.$$"
mv -f "$TARGET.part.$$" "$TARGET"

[ "$(sha256 "$TARGET")" = "$got" ] || die "verification of $TARGET failed after install"
echo "fetch-fonts: installed $TARGET (sha256 $got)"
