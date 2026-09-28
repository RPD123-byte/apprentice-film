# polar profile of the source's traced silhouette's crown per dash frame (coordinates only): rays from the model head
# centre, first exit (>=4 px of outside), wing tips removed by a running lower envelope, smoothed
import json,numpy as np,cv2,sys
sys.path.insert(0,'.')
from lab import src
D=json.load(open('hout.json'))
out={}; rows=[]
ANG=np.arange(-176,-4,4)
for t,r in D.items():
    m=np.zeros((946,2206),np.uint8)
    for q in r['sil']: cv2.fillPoly(m,[np.array(q,np.float32).round().astype(np.int32)],1)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    cx,cy=r['c']; R=[]
    for a in np.radians(ANG):
        d=np.array([np.cos(a),np.sin(a)]); run=0; last=np.nan
        for k in range(10,110):
            x,y=int(round(cx+d[0]*k)),int(round(cy+d[1]*k))
            if m[y,x]: run=0; last=k
            else:
                run+=1
                if run>=4 and last==last: break
        R.append(last)
    R=np.array(R,float)
    # lower envelope: wing tips / tufts stick out; take a running 5-bin 30th percentile then clamp spikes above it
    env=np.array([np.nanpercentile(R[max(0,i-3):i+4],30) for i in range(len(R))])
    Rc=np.minimum(R,env+3)
    Rs=np.convolve(np.pad(Rc,2,mode='edge'),np.ones(5)/5,'valid')
    out[t]={'c':[round(cx,1),round(cy,1)],'ang':ANG.tolist(),'r':[round(v,1) for v in Rs]}
    s=src(float(t)).copy()
    P=np.array([[cx+np.cos(np.radians(a))*v, cy+np.sin(np.radians(a))*v] for a,v in zip(ANG,Rs)])
    cv2.polylines(s,[P.round().astype(np.int32)],False,(0,0,255),1)
    x0,y0=int(cx-75),int(cy-75); rows.append(s[y0:y0+130,x0:x0+150])
json.dump(out,open('crownprof.json','w'))
half=(len(rows)+1)//2
Lc=np.vstack(rows[:half]); Rr=np.vstack(rows[half:]+[np.zeros_like(rows[0])]*(half-len(rows[half:])))
cv2.imwrite('v_crown.jpg',cv2.resize(np.hstack([Lc,Rr]),None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC))
