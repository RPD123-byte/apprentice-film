#!/bin/sh
# full.sh PREFIX T0 T1 STEP [x0 y0 x1 y1]: render the range, write PREFIX-full.jpg (render | source rows, 4 per row)
P=$1; T0=$2; T1=$3; ST=$4; shift 4; CROP="$*"
TIMES=$(python3 -c "
t0,t1,st=$T0,$T1,$ST; n=int(round((t1-t0)/st))+1
print(' '.join(f'{t0+i*st:.2f}' for i in range(n)))")
ARGS=""; for t in $TIMES; do ARGS="$ARGS $P-$t.png t=$t"; done
node dev.mjs snapshots/s20-dev/shot.built.html $ARGS 2>&1 | grep -v Noise | grep -v "^saved"
python3 - "$P" "$CROP" $TIMES <<'PY'
import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
P=sys.argv[1]; crop=[int(v) for v in sys.argv[2].split()] if sys.argv[2].strip() else [0,0,2206,946]; ts=sys.argv[3:]
c=cv2.VideoCapture(V); tiles=[]
x0,y0,x1,y1=crop; tw=480; th=int((y1-y0)*tw/(x1-x0))
for t in ts:
    r=cv2.imread(f'{P}-{t}.png'); c.set(1,int(round(float(t)*25))); ok,s=c.read()
    a=cv2.resize(r[y0:y1,x0:x1],(tw,th)); b=cv2.resize(s[y0:y1,x0:x1],(tw,th))
    cv2.putText(a,t,(4,16),0,0.5,(0,255,255),1)
    tiles.append(np.hstack([a,b,np.zeros((th,6,3),np.uint8)]))
cols=2
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
sheet=np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)])
cv2.imwrite(f'{P}-full.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,82]); print('sheet',sheet.shape)
PY
