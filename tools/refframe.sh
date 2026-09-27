#!/bin/sh
# Extract one full-resolution SOURCE frame. Usage: tools/refframe.sh T out.png
REF="${REF:-/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4}"
ffmpeg -v error -y -ss "$1" -i "$REF" -frames:v 1 "$2"
