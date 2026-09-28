#!/bin/sh
# owltests.sh OUTDIR "name|pose|placejson|T|x0 y0 x1 y1|scale" ... : batch render owl poses in one browser, cmp images
OUT=$1; shift
cd /Users/computer/rootline/apprentice-film
ARGS=""
for spec in "$@"; do
  N=$(echo "$spec" | cut -d'|' -f1); P=$(echo "$spec" | cut -d'|' -f2); PL=$(echo "$spec" | cut -d'|' -f3)
  Q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.urlencode({'p':sys.argv[1],'pl':sys.argv[2]}))" "$P" "$PL")
  ARGS="$ARGS $OUT/$N.png $Q"
done
node snapshots/s20-fix1-dev/dev.mjs snapshots/s20-fix1-dev/owl.built.html $ARGS 2>&1 | grep -v Noise | sed 's/.*saved //'
for spec in "$@"; do
  N=$(echo "$spec" | cut -d'|' -f1); T=$(echo "$spec" | cut -d'|' -f4); B=$(echo "$spec" | cut -d'|' -f5); SC=$(echo "$spec" | cut -d'|' -f6)
  python3 - $OUT/$N $T $B ${SC:-1} <<'PY'
import cv2,numpy as np,sys
out=sys.argv[1]; t=float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7])
r=cv2.imread(out+'.png'); s=cv2.imread('snapshots/s20-rev1-src/n%d.png'%round(t*25))
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
e=cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(a,cv2.COLOR_BGR2GRAY),(0,0),1.2),40,100)
ov=(b*0.8).astype(np.uint8); ov[e>0]=(0,0,255)
def grid(c):
    c=c.copy()
    for x in range((50-x0%50)%50,c.shape[1],50): cv2.line(c,(x,0),(x,c.shape[0]),(0,120,200),1); cv2.putText(c,str(x0+x),(x+2,12),0,0.4,(0,255,255),1)
    for y in range((50-y0%50)%50,c.shape[0],50): cv2.line(c,(0,y),(c.shape[1],y),(0,120,200),1); cv2.putText(c,str(y0+y),(2,y-2),0,0.4,(0,255,255),1)
    return c
im=np.hstack([grid(a),grid(b),grid(ov)])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out+'-cmp.png',im)
PY
done
