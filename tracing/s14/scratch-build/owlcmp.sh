#!/bin/sh
# owlcmp.sh dir out.jpg t:hx:top:s ... -> render (left) vs source (right) unit grids
S=/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad
D=$1; O=$2; shift 2
python3 $S/unitgrid.py $S/_r.jpg "$@" --src $D >/dev/null
python3 $S/unitgrid.py $S/_s.jpg "$@" >/dev/null
python3 - "$S" "$O" $# <<'PY'
import cv2,numpy as np,sys
S,O,n=sys.argv[1],sys.argv[2],int(sys.argv[3])
a=cv2.imread(S+'/_r.jpg'); b=cv2.imread(S+'/_s.jpg'); h,w=680,800
tiles=[]
for i in range(n):
    r,c=divmod(i,2)
    tiles.append(np.hstack([a[r*h:(r+1)*h,c*w:(c+1)*w],b[r*h:(r+1)*h,c*w:(c+1)*w]]))
cv2.imwrite(O,cv2.resize(np.vstack(tiles),None,fx=0.75,fy=0.75))
PY
