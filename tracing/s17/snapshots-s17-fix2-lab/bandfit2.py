# dash band centreline, left + top of the crown only (angles -168..-46 deg, page frame, about the model head centre),
# from the crown profile of the source's traced silhouette; robust quadratic in angle, pushed out OFF px
import json,numpy as np,cv2,sys
sys.path.insert(0,'.')
from lab import src
C=json.load(open('crownprof.json')); OFF=float(sys.argv[1]); E0=-168; E1=-46
DF={'52.68':[778,448,20],'52.72':[740,447,20],'52.76':[710,449,21],'52.80':[680,448,19],'52.84':[656,443,19],'52.88':[630,442,19],'52.92':[601,441,18.5],'52.96':[572,442,18.5],'53.00':[549,444,22],'53.08':[518,444,21],'53.12':[493.5,445,22.5],'53.16':[465,451,21.5],'53.20':[438,450,22]}
res={}; rows=[]
for t,r in C.items():
    cx,cy=r['c']; A=np.array(r['ang'],float); R=np.array(r['r'],float)
    sel=(A>=E0-6)&(A<=E1+6)&~np.isnan(R); a=np.radians(A[sel]); rr=R[sel]; keep=np.ones(len(a),bool)
    for it in range(5):
        p=np.polyfit(a[keep],rr[keep],2); d=rr-np.polyval(p,a); keep=np.abs(d)<max(1.5,np.percentile(np.abs(d[keep]),75))
    AA=np.radians(np.arange(E0,E1+1,8)); f=np.polyval(p,AA)+OFF
    P=np.c_[cx+np.cos(AA)*f, cy+np.sin(AA)*f]
    ccx,ccy,cry=DF[t]; rot=-0.29+0.29
    top=[ccx-np.sin(rot)*(-cry*0.95)*0, ccy-cry*0.95]
    res[t]=[[round(x,1),round(y,1)] for x,y in P]
    s=src(float(t)).copy()
    big=cv2.resize(s[int(cy-75):int(cy+55),int(cx-75):int(cx+75)],None,fx=3,fy=3,interpolation=cv2.INTER_CUBIC)
    Q=((np.vstack([P,[top]])-[cx-75,cy-75])*3).round().astype(np.int32)
    cv2.polylines(big,[Q],False,(0,0,255),1)
    cv2.putText(big,t,(4,14),cv2.FONT_HERSHEY_SIMPLEX,0.45,(0,0,255),1)
    rows.append(big)
json.dump(res,open('bandfit2.json','w'))
for i in range(0,len(rows),4):
    grp=rows[i:i+4]+[np.zeros_like(rows[0])]*(4-len(rows[i:i+4]))
    cv2.imwrite(f'v_bf{i//4}.jpg',np.vstack([np.hstack(grp[:2]),np.hstack(grp[2:])]),[cv2.IMWRITE_JPEG_QUALITY,85])
print(json.dumps(res))
