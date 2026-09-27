# cup_track.py : the owl's near headphone cup per source frame 22.08-23.08 (measurement only; prints JSON). A Hough
# circle fit (blurred frame, radius 55-85) nearest a prediction interpolated through hand-checked anchors
# (snapshots/s04-fix2-cmp/measure/cups_hough.jpg). 23.08 repeats 23.04.
import cv2, numpy as np, json, sys
SRC='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src'
AN={552:(2136,386),553:(2124,392),555:(2071,409),557:(2028,422),559:(1977,430),562:(1888,448),565:(1776,443),569:(1656,442),573:(1561,437),576:(1536,416)}
ks=sorted(AN); out={}
for f in range(552,577):
    px=np.interp(f,ks,[AN[k][0] for k in ks]); py=np.interp(f,ks,[AN[k][1] for k in ks])
    g=cv2.imread(f'{SRC}/{f}.png',0); x0,y0=int(px-160),int(py-160); x0=max(0,x0); sub=cv2.GaussianBlur(g[y0:y0+320,x0:x0+320],(0,0),2)
    C=cv2.HoughCircles(sub,cv2.HOUGH_GRADIENT,dp=1.2,minDist=20,param1=80,param2=30,minRadius=55,maxRadius=85)
    best=None
    if C is not None:
        for x,y,r in C[0]:
            d=np.hypot(x+x0-px,y+y0-py)
            if d<45 and (best is None or d<best[0]): best=(d,x+x0,y+y0,r)
    if best: out[f'{f/25:.2f}']=[round(float(best[1]),1),round(float(best[2]),1),round(float(best[3]),1)]
    print(f'{f/25:.2f}', 'pred', round(px),round(py), '->', out.get(f'{f/25:.2f}'), file=sys.stderr)
if '23.04' in out: out['23.08']=out['23.04']
print(json.dumps(out))
