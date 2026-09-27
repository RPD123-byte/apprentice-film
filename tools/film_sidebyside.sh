#!/bin/sh
# Full-film comparison: the code render on top, the source underneath, both labelled, with the code render's audio.
# Usage: tools/film_sidebyside.sh renders/film.mp4 [out.mp4]
REF="${REF:-/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4}"
IN="$1"; OUT="${2:-renders/sidebyside.mp4}"
FONT=/System/Library/Fonts/Supplemental/Arial.ttf
ffmpeg -v error -y -i "$IN" -i "$REF" -filter_complex "\
[0:v]scale=1920:-2,drawtext=fontfile=$FONT:text='CODE':x=24:y=20:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=10[a];\
[1:v]scale=1920:-2,drawtext=fontfile=$FONT:text='ORIGINAL':x=24:y=20:fontsize=34:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=10[b];\
[a][b]vstack=inputs=2,format=yuv420p[v]" \
  -map "[v]" -map 0:a? -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 256k -movflags +faststart "$OUT"
echo "wrote $OUT"
