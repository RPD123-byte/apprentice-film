# fit a circle to the crown of the source's traced silhouette (sil_data.js) per dash frame (coordinates only)
import json,numpy as np,cv2
D=json.load(open('hout.json'))
out={}
for t,r in D.items():
    m=np.zeros((946,2206),np.uint8)
    for q in r['sil']: cv2.fillPoly(m,[np.array(q,np.float32).round().astype(np.int32)],1)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    cx,cy=r['c']; P=[]
    for a in np.radians(np.arange(-178,-2,3)):
        d=np.array([np.cos(a),np.sin(a)]); run=0; last=None
        for k in range(10,110):
            x,y=int(round(cx+d[0]*k)),int(round(cy+d[1]*k))
            if m[y,x]: run=0; last=k
            else:
                run+=1
                if run>=4 and last is not None: break
        if last: P.append((a,last))
    A=np.array(P); pts=np.c_[cx+np.cos(A[:,0])*A[:,1], cy+np.sin(A[:,0])*A[:,1]]
    keep=np.ones(len(pts),bool)
    for it in range(6):
        X=pts[keep]; M=np.c_[2*X,np.ones(len(X))]; b=(X**2).sum(1)
        sol=np.linalg.lstsq(M,b,rcond=None)[0]; ox,oy=sol[:2]; R=np.sqrt(sol[2]+ox*ox+oy*oy)
        res=np.hypot(pts[:,0]-ox,pts[:,1]-oy)-R
        keep=res<max(2.5,np.percentile(res[keep],70))
        keep&=res>-8
    out[t]=[round(ox,1),round(oy,1),round(R,1),int(keep.sum()),len(pts)]
    print(t,out[t], 'H centre',[round(v,1) for v in r['c']])
json.dump(out,open('crown.json','w'))
