# ov.py times out.jpg [scale] [cols] : set wireframe over source frames (faces coloured by type, far faces fade)
import cv2,json,subprocess,sys,numpy as np
times=sys.argv[1]; out=sys.argv[2]; sc=float(sys.argv[3]) if len(sys.argv)>3 else 0.5; cols=int(sys.argv[4]) if len(sys.argv)>4 else 2
js=json.loads(subprocess.check_output(['node','ov.mjs',times]))
tiles=[]
col={0:(60,60,230),1:(220,60,220),2:(60,200,60),3:(40,190,250)}
for t in times.split(','):
    t=float(t); f=cv2.imread('src/f%04d.png'%round(t*25))
    d=js[f'{t:.2f}']
    lay=np.zeros_like(f); edge=np.zeros(f.shape[:2],np.uint8)
    for p in sorted(d['polys'],key=lambda q:-q['z']):
        pts=np.array(p['p'],np.int32)
        if np.abs(pts).max()>30000: continue
        if p['z']>4.0: continue
        k=max(0.12,min(1,1/(1+(max(p['z']-0.25,0)/1.0)**2.6)))*min(1.2,p['a'])
        c=col[p['k']] if not p.get('fl') else (90,90,90)
        c=tuple(int(v*k) for v in c)
        cv2.fillPoly(lay,[pts],c)
        cv2.polylines(lay,[pts],True,(255,255,255) if p['z']<2.2 else (140,140,140),3 if p['z']<1.5 else 2)
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    base=cv2.cvtColor(g,cv2.COLOR_GRAY2BGR)
    m=(lay.sum(2)>0)[...,None]
    f=np.where(m,cv2.addWeighted(base,0.62,lay,0.38,0),base)
    wl=(lay.min(2)>=130)&(lay.max(2)-lay.min(2)<20)
    f[wl]=lay[wl]
    for X in range(0,f.shape[1],100): cv2.line(f,(X,0),(X,8),(0,255,255),2)
    for Y in range(0,f.shape[0],100): cv2.line(f,(0,Y),(8,Y),(0,255,255),2)
    cv2.putText(f,f"{t:.2f} {d['set']}",(10,50),0,1.5,(0,255,255),3)
    tiles.append(cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
