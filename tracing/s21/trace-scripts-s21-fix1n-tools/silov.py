#!/usr/bin/env python3
# silov.py out.jpg T1,T2,.. [z] : SOURCE frames with s21's silhouette polygons (probeShape) drawn over them, source
# owl mask outline in green
import cv2, sys, json, subprocess, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s21-fix1n-tools/wingfit_lib.py').read())
out=sys.argv[1]; ts=[float(v) for v in sys.argv[2].split(',')]; z=float(sys.argv[3]) if len(sys.argv)>3 else 2
js=subprocess.run(['node','--input-type=module','-e','''
const {probeShape}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
console.log(JSON.stringify(JSON.parse(process.argv[1]).map((t)=>probeShape(t))));''',json.dumps(ts)],capture_output=True,text=True)
if js.returncode: print(js.stderr); sys.exit(1)
D=json.loads(js.stdout); c=cv2.VideoCapture(V); tiles=[]
for t,sh in zip(ts,D):
    allp=sh['head']+sh['body']+[p for w in sh['wings'] for poly in w['polys'] for p in poly]
    xs=[p[0] for p in allp]; ys=[p[1] for p in allp]
    box=(max(0,int(min(xs))-50),max(0,int(min(ys))-50),min(2206,int(max(xs))+70),min(946,int(max(ys))+50))
    c.set(1,int(round(t*25))); ok,f=c.read(); ms=smask(f,box)
    x0,y0,x1,y1=box; im=cv2.resize(f[y0:y1,x0:x1],None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)
    cs,_=cv2.findContours(cv2.resize(ms,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(im,cs,-1,(0,255,0),1)
    P=lambda poly: np.array([[(p[0]-x0)*z,(p[1]-y0)*z] for p in poly],np.int32)
    for poly,col in [(sh['head'],(0,0,255)),(sh['body'],(255,0,255))]+[(p,(0,160,255)) for p in sh['tail']]: cv2.polylines(im,[P(poly)],True,col,1)
    for w in sh['wings']:
        for poly in w['polys']: cv2.polylines(im,[P(poly)],True,(255,200,0),1)
    for lg in sh['legs']:
        cv2.polylines(im,[P(lg['pts'])],False,(0,255,255),1)
        for a,b in lg['toes']: cv2.line(im,tuple(P([a])[0]),tuple(P([b])[0]),(0,255,255),1)
    cv2.putText(im,f'{t:.2f}',(6,20),0,0.6,(0,255,255),2); tiles.append(im)
H=max(t.shape[0] for t in tiles); W=max(t.shape[1] for t in tiles)
tiles=[np.pad(t,((0,H-t.shape[0]+2),(0,W-t.shape[1]+2),(0,0))) for t in tiles]
cols=max(1,min(len(tiles),2000//W))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
