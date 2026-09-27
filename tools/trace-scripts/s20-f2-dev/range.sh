#!/bin/sh
# range.sh PREFIX T0 T1 STEP : render every STEP s (exact frame times), print MAE per frame, contact sheet PREFIX-range.jpg
P=$1; T0=$2; T1=$3; ST=$4
TIMES=$(python3 -c "
t0,t1,st=$T0,$T1,$ST; n=int(round((t1-t0)/st))+1
print(' '.join(f'{round((t0+i*st)*25)/25:.2f}' for i in range(n)))")
ARGS=""; for t in $TIMES; do ARGS="$ARGS $P-$t.png t=$t"; done
node snapshots/s20-f2-dev/dev.mjs snapshots/s20-f2-dev/shot.built.html $ARGS 2>&1 | grep -v Noise | grep -v "^saved" 
python3 - "$P" $TIMES <<'PY'
import cv2,numpy as np,sys
P=sys.argv[1]; ts=sys.argv[2:]; tiles=[]; m=[]
for t in ts:
    r=cv2.imread(f'{P}-{t}.png'); s=cv2.imread('snapshots/s20-rev1-src/n%d.png'%round(float(t)*25))
    if r is None: print(t,'MISSING'); continue
    g1=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6); g2=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
    e=np.abs(g1-g2); m.append(e.mean()); ob=e[200:900,650:1400].mean()
    print(f'{t} MAE {e.mean():.1f} owlband {ob:.1f}')
    a=cv2.resize(r[0:946,500:1500],(420,397)); b=cv2.resize(s[0:946,500:1500],(420,397))
    im=np.hstack([a,b]); cv2.putText(im,t,(4,18),0,0.55,(0,255,255),2); tiles.append(im)
cols=4
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
sheet=np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)])
cv2.imwrite(f'{P}-range.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,80]); print('mean %.2f'%np.mean(m))
PY
