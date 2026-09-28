#!/bin/sh
# sheet.sh OUTPREFIX "x0 y0 x1 y1|full" t1 t2 ... : render each time (exact), pair with extracted source frame, stack
P=$1; CROP=$2; shift 2
ARGS=""; for t in "$@"; do ARGS="$ARGS $P-$t.png t=$t"; done
node snapshots/s20-fix1-dev/dev.mjs snapshots/s20-fix1-dev/shot.built.html $ARGS 2>&1 | grep -v Noise | grep -v "^saved"
python3 - "$P" "$CROP" "$@" <<'PY'
import cv2,numpy as np,sys,os
P=sys.argv[1]; crop=sys.argv[2]; ts=sys.argv[3:]
SRC='/Users/computer/rootline/apprentice-film/snapshots/s20-rev1-src/n%d.png'
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
def src(t):
    n=int(round(float(t)*25)); f=SRC%n
    if os.path.exists(f): return cv2.imread(f)
    c=cv2.VideoCapture(V); c.set(1,n); ok,s=c.read(); return s
rows=[]; maes=[]
for t in ts:
    r=cv2.imread(f'{P}-{t}.png'); s=src(t)
    if crop!='full': x0,y0,x1,y1=map(int,crop.split()); r=r[y0:y1,x0:x1]; s=s[y0:y1,x0:x1]
    g1=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
    g2=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),6)
    m=np.abs(g1-g2).mean(); maes.append(m)
    print(f"{t}: blurred MAE {m:.1f}  mean r {g1.mean():.1f} s {g2.mean():.1f}")
    im=np.hstack([r,s])
    sc=min(1.0, 1900/im.shape[1]); im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(im,t,(8,26),0,0.8,(0,255,255),2); rows.append(im)
sheet=np.vstack(rows)
if sheet.shape[0]>8000: sheet=cv2.resize(sheet,None,fx=8000/sheet.shape[0],fy=8000/sheet.shape[0])
cv2.imwrite(f'{P}-sheet.jpg',sheet,[cv2.IMWRITE_JPEG_QUALITY,85]); print('mean MAE %.2f'%np.mean(maes))
PY
