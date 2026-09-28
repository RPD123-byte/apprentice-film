#!/bin/sh
# pp.sh dir time out x0 y0 x1 y1 [w]
S=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad
D=$S/tmp_$$; mkdir -p $D; cp $1/frame-*-at-$2s.png $1/ref-*-at-$2s.png $D/ 2>/dev/null
python3 $S/pairs.py $D $3 $4 $5 $6 $7 --w ${8:-900} >/dev/null; rm -rf $D
