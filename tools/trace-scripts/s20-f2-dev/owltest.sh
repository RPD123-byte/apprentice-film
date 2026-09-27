#!/bin/sh
# owltest.sh OUT POSE 'PLACEJSON' T x0 y0 x1 y1 : render one owl pose, pair with source frame crop (render | src | blend)
OUT=$1; P=$2; PL=$3; T=$4; shift 4
cd /Users/computer/rootline/apprentice-film
Q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.urlencode({'p':sys.argv[1],'pl':sys.argv[2]}))" "$P" "$PL")
node snapshots/s20-f2-dev/dev.mjs snapshots/s20-f2-dev/owl.built.html $OUT.png "$Q" 2>&1 | grep -v Noise
python3 - $OUT $T "$@" <<'PY'
import cv2,numpy as np,sys
out=sys.argv[1]; t=float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7])
r=cv2.imread(out+'.png'); s=cv2.imread('snapshots/s20-rev1-src/n%d.png'%round(t*25))
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
m=(a.max(axis=2)>8)[:,:,None]
bl=np.where(m,(a*0.55+b*0.45),b).astype(np.uint8)
def grid(c):
    c=c.copy()
    for x in range((50-x0%50)%50,c.shape[1],50): cv2.line(c,(x,0),(x,c.shape[0]),(0,120,200),1); cv2.putText(c,str(x0+x),(x+2,12),0,0.4,(0,255,255),1)
    for y in range((50-y0%50)%50,c.shape[0],50): cv2.line(c,(0,y),(c.shape[1],y),(0,120,200),1); cv2.putText(c,str(y0+y),(2,y-2),0,0.4,(0,255,255),1)
    return c
im=np.hstack([grid(a),grid(b),grid(bl)])
sc=float(sys.argv[7]) if len(sys.argv)>7 else 1
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out+'-cmp.png',im)
PY
