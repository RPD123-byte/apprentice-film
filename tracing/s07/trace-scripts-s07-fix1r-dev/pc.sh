#!/bin/sh
# pc.sh TAG [t] : render t (default 30.0, frame 24) graded, rectify the screen, error map vs source
cd /Users/computer/rootline/apprentice-film
D=snapshots/s07-fix1r-dev; T=${2:-30.0000}; I=${3:-24}
node $D/dev.mjs $D/h.html $D/r_$1.png "t=$T" | grep -v "^saved" 
python3 $D/rect.py $D/r_$1.png $D/rr_$1.png
python3 $D/rect.py snapshots/s07-p2-dev/w/frames/f_$I.png $D/rs_$I.png
python3 $D/errmap.py $D/rr_$1.png $D/rs_$I.png $D/em_$1.jpg
python3 -c "
import cv2,numpy as np
a=cv2.imread('$D/rr_$1.png');b=cv2.imread('$D/rs_$I.png')
cv2.imwrite('$D/pair_$1.jpg',np.vstack([a,b]))
"
