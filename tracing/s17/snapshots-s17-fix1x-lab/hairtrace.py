# hairtrace.py: the designer's hair over his face (bangs, side locks against the skin), traced as outlines of the dark
# regions (graded < THR on the σ1 median plate of 48.8–50.4 s) inside the face box, keeping only components that
# reach the hairline under the beanie or the face's sides (not the eyes, brows, nostrils); simplified polygons, page px
# -> src/shots/s17/hair_data.js. Outlines only (coordinates), like the owl's traced silhouettes; no pixels are stored.
import cv2, numpy as np, json
THR=42
s=cv2.cvtColor(cv2.imread('plate.png'),cv2.COLOR_BGR2GRAY).astype(np.float32); sb=cv2.GaussianBlur(s,(0,0),1.0)
x0,y0,x1,y1=1004,242,1138,372
SC=4
crop=cv2.resize(sb[y0:y1,x0:x1],None,fx=SC,fy=SC,interpolation=cv2.INTER_CUBIC)
m=(crop<THR).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(m,connectivity=8)
keep=np.zeros_like(m)
for i in range(1,n):
    x,y,w,h,a=st[i]
    top = y <= (252-y0)*SC
    side = x <= (1024-x0)*SC or x+w >= (1118-x0)*SC
    if (top or side) and a >= 12*SC*SC: keep[lab==i]=255
cs,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
polys=[]
for c in cs:
    c=cv2.approxPolyDP(c,0.5*SC,True).reshape(-1,2)
    if len(c)<3: continue
    p=c/SC+[x0,y0]
    polys.append([round(float(v),1) for v in p.flatten()])
open('../../src/shots/s17/hair_data.js','w').write(
 "// s17 designer's hair over his face (fix pass 1): outlines of the dark regions (graded < %d on the σ1 median plate of the\n"
 "// source, 48.8–50.4 s) inside x %d–%d, y %d–%d that reach the hairline or the face's sides — the bangs and the side locks\n"
 "// against the skin. Traced by snapshots/s17-fix1x-lab/hairtrace.py. Coordinates only (page px, flat [x0, y0, ...]).\n"
 "export const HAIR_OVER = %s;\n" % (THR,x0,x1,y0,y1,json.dumps(polys,separators=(',',':'))))
print(len(polys),'polys', sum(len(p)//2 for p in polys),'pts')
vis=cv2.cvtColor(np.clip(crop,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
for p in polys:
    a=((np.array(p).reshape(-1,2)-[x0,y0])*SC).astype(np.int32); cv2.polylines(vis,[a],True,(0,0,255),1)
cv2.imwrite('v/hairtrace.jpg',vis)
