#!/bin/sh
# sheet.sh OUTPREFIX t1 t2 ... : render each time, pair with source (half scale), stack into OUTPREFIX-sheet.jpg
P=$1; shift
ARGS=""; for t in "$@"; do ARGS="$ARGS $P-$t.png t=$t"; done
node dev.mjs snapshots/s20-dev/shot.built.html $ARGS 2>&1 | grep -v Noise | grep -v "^saved" 
for t in "$@"; do python3 pair.py $P-$t.png $t $P-pair-$t.jpg --scale 0.5 | sed 's/.*blurred/'"$t"' blurred/'; done
python3 -c "
import cv2,numpy as np,sys
ims=[cv2.imread('$P-pair-'+t+'.jpg') for t in sys.argv[1:]]
for im,t in zip(ims,sys.argv[1:]): cv2.putText(im,t,(10,30),0,1,(0,255,255),2)
cv2.imwrite('$P-sheet.jpg',np.vstack(ims),[cv2.IMWRITE_JPEG_QUALITY,80])" "$@"
