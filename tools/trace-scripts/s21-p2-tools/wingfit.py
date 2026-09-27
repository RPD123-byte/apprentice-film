#!/usr/bin/env python3
# wingfit.py T0 T1 : for each source frame, the flight-wing states (uNear, uFar) whose silhouette (with s21's head,
# body, tail, scissors at that time) best matches the source owl mask (IoU). Prints current vs best.
import cv2, sys, json, subprocess, numpy as np, glob
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s21-p2-tools')
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
BG='/Users/computer/rootline/apprentice-film/snapshots/s21-p2-bg'
g=lambda im: cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.2)
bgS=np.median(np.stack([g(cv2.imread(p)) for p in sorted(glob.glob(BG+'/ref-*.png'))]),0)
t0,t1=float(sys.argv[1]),float(sys.argv[2]); step=float(sys.argv[3]) if len(sys.argv)>3 else 0.04
ts=[round(t0+i*step,2) for i in range(int(round((t1-t0)/step))+1)]
U=[-1,-0.7,-0.4,-0.2]+[round(0.1*i,1) for i in range(11)]
js=subprocess.run(['node','--input-type=module','-e','''
const {probeShape}=await import('/Users/computer/rootline/apprentice-film/src/shots/s21.js');
const ts=JSON.parse(process.argv[1]), U=JSON.parse(process.argv[2]); const out={};
for (const t of ts){ out[t]={cur:probeShape(t), grid:{}}; for(const a of U) for(const b of U) out[t].grid[a+','+b]=probeShape(t,a,b).wings; }
console.log(JSON.stringify(out));''',json.dumps(ts),json.dumps(U)],capture_output=True,text=True)
if js.returncode: print(js.stderr); sys.exit(1)
D=json.loads(js.stdout); c=cv2.VideoCapture(V)
def raster(shape,wings,box):
    x0,y0,x1,y1=box; m=np.zeros((y1-y0,x1-x0),np.uint8)
    P=lambda poly: np.array([[p[0]-x0,p[1]-y0] for p in poly],np.int32)
    for poly in [shape['head'],shape['body']]+shape['tail']: cv2.fillPoly(m,[P(poly)],1)
    for w in wings:
        for poly in w['polys']: cv2.fillPoly(m,[P(poly)],1)
    # scissors: blades + handle rings
    px,py=shape['pivot']; a=shape['ang']; L=shape['L']
    tip=(px+np.cos(a)*L,py+np.sin(a)*L); n=(-np.sin(a)*0.08*L,np.cos(a)*0.08*L)
    cv2.fillPoly(m,[P([(px+n[0],py+n[1]),(px-n[0],py-n[1]),tip])],1)
    for rc in shape['rings']: cv2.circle(m,(int(rc[0]-x0),int(rc[1]-y0)),int(0.17*L),1,-1)
    return m
def smask(im,box):
    x0,y0,x1,y1=box; G=g(im)
    df=np.abs(G-bgS)[y0:y1,x0:x1]; Gc=G[y0:y1,x0:x1]
    X=np.arange(x0,x1)[None,:]
    # the room margins (outside the screen) carry the owl's halo: demand a brighter pixel there
    out=(X<146)|(np.arange(y0,y1)[:,None]<131)
    m=((df>28)&(Gc>100)&(~out|(Gc>150))).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n>1: k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]); m=(lab==k).astype(np.uint8)
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); m=np.zeros_like(m); cv2.drawContours(m,cs,-1,1,-1); return m
res={}
for t in ts:
    k=str(int(t)) if t==int(t) else str(t); d=D[k]
    cur=d['cur']; allp=[q for q in cur['head']+cur['body']]
    for w in d['grid']['1,1']+d['grid']['-1,-1']:
        for poly in w['polys']: allp+=poly
    xs=[p[0] for p in allp]; ys=[p[1] for p in allp]
    box=(max(0,int(min(xs))-60),max(0,int(min(ys))-60),min(2206,int(max(xs))+60),min(946,int(max(ys))+60))
    c.set(1,int(round(t*25))); ok,f=c.read(); ms=smask(f,box)
    # keep only the source mask near where any candidate could be (drops the margin-glow blobs)
    zone=np.zeros_like(ms)
    for wg in d['grid'].values(): zone|=raster(cur,wg,box)
    zone=cv2.dilate(zone,np.ones((31,31),np.uint8)); ms=ms&zone
    def iou(w): mr=raster(cur,w,box); return (mr&ms).sum()/max(1,(mr|ms).sum())
    base=iou(cur['wings']); best=max(((iou(wg),k) for k,wg in d['grid'].items()),key=lambda q:q[0])
    res[t]=(base,best)
    print(f'{t:.2f} current IoU {base:.3f}  best {best[0]:.3f} at uNear,uFar = {best[1]}')
# overlay sheet: red = ours at the best state, green = source mask
tiles=[]
for t in ts:
    k=str(int(t)) if t==int(t) else str(t); d=D[k]; cur=d['cur']
    bk=res[t][1][1]
    allp=[q for q in cur['head']+cur['body']]
    for w in d['grid']['1,1']+d['grid']['-1,-1']:
        for poly in w['polys']: allp+=poly
    xs=[p[0] for p in allp]; ys=[p[1] for p in allp]
    box=(max(0,int(min(xs))-60),max(0,int(min(ys))-60),min(2206,int(max(xs))+60),min(946,int(max(ys))+60))
    c.set(1,int(round(t*25))); ok,f=c.read(); ms=smask(f,box); mr=raster(cur,d['grid'][bk],box); mc=raster(cur,cur['wings'],box)
    zone=np.zeros_like(ms)
    for wg in d['grid'].values(): zone|=raster(cur,wg,box)
    zone=cv2.dilate(zone,np.ones((31,31),np.uint8)); ms=ms&zone
    x0,y0,x1,y1=box
    base=cv2.cvtColor(cv2.cvtColor(f[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY),cv2.COLOR_GRAY2BGR)//2
    ov=base.copy(); ov[...,2]=np.maximum(ov[...,2],mr*200); ov[...,1]=np.maximum(ov[...,1],ms*200)
    cv2.putText(ov,f'{t:.2f} best {bk}',(4,16),0,0.5,(255,255,255),1)
    tiles.append(cv2.resize(ov,(380,int(380*ov.shape[0]/ov.shape[1]))))
H=max(q.shape[0] for q in tiles); tiles=[np.pad(q,((0,H-q.shape[0]),(0,0),(0,0))) for q in tiles]
while len(tiles)%4: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite('/Users/computer/rootline/apprentice-film/snapshots/s21-p2-tools/wingfit.jpg',np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,len(tiles),4)]))
