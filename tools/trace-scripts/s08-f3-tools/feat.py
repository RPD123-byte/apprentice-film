# feat.py DIR frames : registration of sharp features: card right/top edges and the red line's horizontal run (centroid)
import sys, numpy as np, cv2, re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s08-f3-tools')
from edges import cross
S='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/'
R=sys.argv[1]; frames=[int(x) for x in sys.argv[2].split(',')]
def redc(im, x, y0, y1):
    c=im[y0:y1,x-3:x+4].astype(float); r=c[...,2]-0.5*(c[...,1]+c[...,0]); w=np.clip(r.mean(1)-40,0,None)
    return y0+(w*np.arange(len(w))).sum()/max(w.sum(),1e-6)
def redv(im, y, x0, x1):
    c=im[y-3:y+4,x0:x1].astype(float); r=c[...,2]-0.5*(c[...,1]+c[...,0]); w=np.clip(r.mean(0)-40,0,None)
    return x0+(w*np.arange(len(w))).sum()/max(w.sum(),1e-6)
tot=[]
for k in frames:
    a=cv2.imread(f'{R}/r{k}.png'); b=cv2.imread(S+f'f{k}.png')
    al=a.astype(float).mean(-1); bl=b.astype(float).mean(-1)
    # card right edge: find approx x from source at y=500
    row=bl[500]; xr=int(np.argmax(np.abs(np.diff(row[1500:2200])))+1500)
    ys=range(200,900,40)
    er=[ (xr-10+cross(al[y,xr-10:xr+10]))-(xr-10+cross(bl[y,xr-10:xr+10])) for y in ys if 0<y<946]
    # card top edge near x=1700
    col=bl[:,1700]; yt=int(np.argmax(np.abs(np.diff(col[60:400])))+60)
    et=[(yt-10+cross(al[yt-10:yt+10,x]))-(yt-10+cross(bl[yt-10:yt+10,x])) for x in range(xr-400,xr-60,40)]
    # red horizontal run: locate in source at x=200
    rr=b[:,200].astype(float); score=rr[:,2]-0.5*(rr[:,1]+rr[:,0]); yr=int(np.argmax(score[200:900])+200)
    eh=[redc(a,x,yr-12,yr+12)-redc(b,x,yr-12,yr+12) for x in range(100,900,100)]
    print(k,'card R dx %+.2f  top dy %+.2f  redline dy %+.2f'%(np.median(er),np.median(et),np.median(eh)))
    tot.append([np.median(er),np.median(et),np.median(eh)])
t=np.abs(np.array(tot)); print('mean abs',t.mean(0).round(3))
