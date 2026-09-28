# the dash band's centreline per frame from the crown profile of the source's traced silhouette (coordinates only):
# a robust quadratic in angle, pushed out by OFF px (the band sits on the white head, outside the tracer's outline)
import json,numpy as np,cv2,sys
sys.path.insert(0,'.')
from lab import src
C=json.load(open('crownprof.json')); OFF=float(sys.argv[1]) if len(sys.argv)>1 else 4.0
END={}  # filled after inspection
res={}; rows=[]
for t,r in C.items():
    cx,cy=r['c']; A=np.radians(np.array(r['ang'],float)); R=np.array(r['r'],float)
    ok=~np.isnan(R)
    keep=ok.copy()
    for it in range(5):
        p=np.polyfit(A[keep],R[keep],3); f=np.polyval(p,A); d=R-f
        keep=ok&(np.abs(d)<max(2.0,np.percentile(np.abs(d[keep]),75)))
    f=np.polyval(p,A)+OFF
    P=np.c_[cx+np.cos(A)*f, cy+np.sin(A)*f]
    res[t]={'c':[cx,cy],'ang':r['ang'],'rb':[round(v,2) for v in f]}
    s=src(float(t)).copy()
    big=cv2.resize(s[int(cy-75):int(cy+55),int(cx-75):int(cx+75)],None,fx=3,fy=3,interpolation=cv2.INTER_CUBIC)
    Q=((P-[cx-75,cy-75])*3).round().astype(np.int32)
    cv2.polylines(big,[Q],False,(0,0,255),1)
    for a in [-150,-160]:
        k=np.argmin(np.abs(np.array(r['ang'])-a)); cv2.circle(big,tuple(Q[k]),3,(0,255,0),-1)
    cv2.putText(big,t,(4,14),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,255),1)
    rows.append(big)
json.dump(res,open('bandfit.json','w'))
for i in range(0,len(rows),4):
    grp=rows[i:i+4]+[np.zeros_like(rows[0])]*(4-len(rows[i:i+4]))
    cv2.imwrite(f'v_bandfit{i//4}.jpg',np.vstack([np.hstack(grp[:2]),np.hstack(grp[2:])]),[cv2.IMWRITE_JPEG_QUALITY,85])
