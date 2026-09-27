# the designer's hair: outer silhouettes of the dark hair masses on the stare average (sigma 2 < 55), inside a hand-drawn
# hair zone (eyes, brows and sweat left out), outlines simplified to 2.5 px. Outer contours only (no partings).
import numpy as np, cv2, json
A=np.load('stare_pre.npy'); B=cv2.GaussianBlur(A,(0,0),2)
Z=np.zeros(A.shape,np.uint8)
L=[[596,318],[606,290],[624,256],[650,222],[680,192],[714,164],[750,140],[800,117],[850,105],[900,97],[950,92],[1000,87],[1050,84],[1100,87],[1150,94],[1200,104],[1250,117],[1300,131],[1350,150],[1400,175],[1430,196],[1452,218],[1472,248],[1488,282],[1494,310],
   [1540,380],[1580,470],[1590,560],[1560,660],[1480,720],[1400,760],[1320,760],[1300,600],[1250,470],[1100,480],[1000,500],[900,500],[800,470],[790,560],[800,740],[700,760],[610,700],[560,600],[548,470],[565,380]]
cv2.fillPoly(Z,[np.array(L,np.int32)],1)
cv2.fillPoly(Z,[np.array([[1300,600],[1340,640],[1400,760],[1320,760]],np.int32)],1)
for (cx,cy,rx,ry) in [(842,325,98,52),(1232,318,96,50)]: cv2.ellipse(Z,(cx,cy),(rx,ry),0,0,360,0,-1)
cv2.fillPoly(Z,[np.array([[838,182],[880,190],[912,198],[946,208],[946,228],[912,220],[880,212],[838,204]],np.int32),np.array([[1108,222],[1140,202],[1178,190],[1212,184],[1262,183],[1262,205],[1212,207],[1178,212],[1140,222],[1108,242]],np.int32)],0)
B6=cv2.GaussianBlur(A,(0,0),4)
YY=np.mgrid[0:A.shape[0],0:A.shape[1]][0]
m=(((B<55)|((B6<62)&(YY<430)))&(Z>0)).astype(np.uint8)
n,lab,st,cen=cv2.connectedComponentsWithStats(m,8)
keep=np.zeros_like(m)
for i in range(1,n):
    if st[i,4]>=350: keep[lab==i]=1
cs,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
polys=[cv2.approxPolyDP(c,2.5,True)[:,0,:].tolist() for c in cs if cv2.contourArea(c)>300]
print(len(polys), sum(len(p) for p in polys), [len(p) for p in polys])
out=cv2.cvtColor(A.astype(np.uint8),cv2.COLOR_GRAY2BGR)
for p in polys: cv2.polylines(out,[np.array(p,np.int32)],True,(0,0,255),2)
cv2.polylines(out,[np.array(L,np.int32)],True,(0,255,0),1)
cv2.imwrite('hairsil.jpg',out[0:800,500:1650],[cv2.IMWRITE_JPEG_QUALITY,85])
flat=[[v for pt in p for v in pt] for p in polys]
s="// s02 designer: outer silhouettes of the dark hair masses (measured on the stare average, 6.04-6.84 s: sigma 2 < 55/255, or sigma 4 < 62 above y 430\n"
s+="// inside a hand-drawn hair zone with the eyes, brows and sweat left out), outlines simplified to 2.5 px, outer contours\n"
s+="// only (the white partings and loose hairs are drawn by designer.js). Flat [x0,y0,x1,y1,...] world px. Script:\n"
s+="// snapshots/s02-r3-meas/hairsil.py\nexport const HAIR_SIL = ["+",\n".join('['+','.join(str(v) for v in p)+']' for p in flat)+"];\n"
open('/Users/computer/rootline/apprentice-film/src/shots/s02/hand/hairsil.js','w').write(s)
