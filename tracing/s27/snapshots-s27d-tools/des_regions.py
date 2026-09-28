# Measurement aid for the designer drawing: temporal-median frame of the hold (125.0-125.4), colour classes by simple
# HSV thresholds, and each class's outline resampled every ~12 px along its contour (like F2's band-edge
# cross-sections). Writes outlines as JSON + a check overlay. No pixels are exported.
import cv2, numpy as np, json
from src import frame
fs=[frame(125.0+0.04*i) for i in range(11)]
med=np.median(np.stack(fs),0).astype(np.uint8)
cv2.imwrite('../s27d-meas/med125.png',med)   # scratch, measurement only (never loaded by the film)
hsv=cv2.cvtColor(med,cv2.COLOR_BGR2HSV).astype(np.int32)
H,S,V=hsv[...,0]*2,hsv[...,1],hsv[...,2]
b,g,r=[med[...,k].astype(np.int32) for k in range(3)]
roi=np.zeros(V.shape,np.uint8); cv2.fillPoly(roi,[np.int32([(0,200),(620,150),(760,70),(900,80),(1100,230),(1110,760),(760,946),(0,946)])],1)
cls={}
cls['hair']=(V<70)&(r<80)
cls['skin']=(r>g+12)&(r>b+18)&(V>150)&(S>35)&(S<140)
green=(g>=r-6)&(g>b+4)&(V>60)
cls['green']=green
cls['dark']=(V>=45)&(V<115)&(S<60)&~green
out={}
ov=med.copy()
cols={'hair':(255,0,255),'skin':(0,0,255),'green':(0,255,0),'dark':(255,255,0)}
for k,m in cls.items():
    m=(m&(roi>0)).astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    polys=[]
    for c in cs:
        a=cv2.contourArea(c)
        if a<1500: continue
        c=c.reshape(-1,2).astype(np.float32)
        # resample every 12 px of arc length
        d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(c,axis=0),axis=1))]
        n=max(8,int(d[-1]/12)); s=np.linspace(0,d[-1],n,endpoint=False)
        P=np.c_[np.interp(s,d,c[:,0]),np.interp(s,d,c[:,1])]
        polys.append({'area':int(a),'pts':np.round(P).astype(int).tolist()})
        cv2.polylines(ov,[np.int32(P)],True,cols[k],2)
    out[k]=sorted(polys,key=lambda p:-p['area'])
    print(k,[ (p['area'],len(p['pts'])) for p in out[k][:6]])
json.dump(out,open('../s27d-meas/des_regions.json','w'))
cv2.imwrite('../s27d-study/des_regions.jpg',cv2.resize(ov,(1400,600)),[cv2.IMWRITE_JPEG_QUALITY,85])
