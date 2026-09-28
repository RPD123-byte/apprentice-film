#!/bin/sh
# Extract one full-resolution SOURCE frame. Usage: tools/refframe.sh T out.png   (needs APPRENTICE_SOURCE)
. "$(dirname "$0")/lib.sh"
need_source
ffmpeg -v error -y -ss "$1" -i "$REF" -frames:v 1 "$2"
