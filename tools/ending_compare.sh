#!/bin/sh
# Three-row comparison of a time range: NOW / BEFORE / ORIGINAL, 1280 wide, with NOW's audio.
# Usage: tools/ending_compare.sh NOW.mp4 BEFORE.mp4 START DURATION out.mp4   (needs APPRENTICE_SOURCE)
. "$(dirname "$0")/lib.sh"
need_source
label_font
NOW="$1"; BEF="$2"; S="$3"; D="$4"; OUT="$5"
lab() { printf "scale=1280:-2,drawtext=fontfile=%s:text='%s':x=16:y=12:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=8" "$FONT" "$1"; }
ffmpeg -v error -y -ss "$S" -t "$D" -i "$NOW" -ss "$S" -t "$D" -i "$BEF" -ss "$S" -t "$D" -i "$REF" -filter_complex \
  "[0:v]$(lab NOW)[a];[1:v]$(lab 'BEFORE (last render)')[b];[2:v]$(lab ORIGINAL)[c];[a][b][c]vstack=inputs=3,format=yuv420p[v]" \
  -map "[v]" -map 0:a -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 256k -movflags +faststart "$OUT"
echo "wrote $OUT"
