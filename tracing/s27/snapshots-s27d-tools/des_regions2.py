# Measurement aid (designer, 125.0 hold median): part masks = simple colour class AND a hand-drawn rough ROI per part;
# outlines resampled every ~12 px along the contour. Output: s27d-meas/des_parts.json (outlines only) + overlay.
import cv2, numpy as np, json
med=cv2.imread('../s27d-meas/med125.png')
hsv=cv2.cvtColor(med,cv2.COLOR_BGR2HSV).astype(np.int32)
S,V=hsv[...,1],hsv[...,2]
b,g,r=[med[...,k].astype(np.int32) for k in range(3)]
def roi(pts):
    m=np.zeros(V.shape,np.uint8); cv2.fillPoly(m,[np.int32(pts)],1); return m>0
R={
 'beanie':[(600,250),(610,190),(720,70),(880,60),(1110,230),(1110,540),(975,540),(900,390),(700,290),(630,275)],
 'head':[(360,150),(640,140),(760,200),(940,340),(1030,470),(1030,580),(900,700),(600,660),(430,600),(360,420)],
 'body':[(0,190),(700,160),(1080,470),(1090,780),(760,946),(0,946)],
}
green=(g>=r-8)&(g>b+2)&(V>55)&(S<120)
skin=(r>g+10)&(r>b+16)&(V>140)
dark=(V<75)
parts={}
parts['beanie']=green&roi(R['beanie'])
parts['hair']=dark&roi(R['head'])
parts['skin']=skin&roi(R['head']+[])|(skin&roi([(540,560),(1000,560),(1010,760),(700,760),(560,640)]))
parts['jacket']=green&roi(R['body'])&~roi(R['beanie'])
parts['hp']=(V>=40)&(V<120)&(S<70)&~green&roi([(400,250),(560,250),(620,580),(480,600),(400,480)])
parts['under']=dark&roi([(0,600),(420,700),(560,930),(0,946)])
out={}; ov=med.copy()
cols={'beanie':(0,255,0),'hair':(255,0,255),'skin':(0,0,255),'jacket':(0,200,120),'hp':(255,255,0),'under':(255,120,0)}
for k,m in parts.items():
    m=m.astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    polys=[]
    for c in sorted(cs,key=lambda c:-cv2.contourArea(c)):
        a=cv2.contourArea(c)
        if a<2500: continue
        c=c.reshape(-1,2).astype(np.float32)
        d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(c,axis=0),axis=1))]
        n=max(8,int(d[-1]/12)); s=np.linspace(0,d[-1],n,endpoint=False)
        P=np.c_[np.interp(s,d,c[:,0]),np.interp(s,d,c[:,1])]
        polys.append({'area':int(a),'pts':np.round(P).astype(int).tolist()})
        cv2.polylines(ov,[np.int32(P)],True,cols[k],2)
    out[k]=polys
    print(k,[(p['area'],len(p['pts'])) for p in polys[:6]])
json.dump(out,open('../s27d-meas/des_parts.json','w'))
cv2.imwrite('../s27d-study/des_parts.jpg',ov[0:946,0:1150],[cv2.IMWRITE_JPEG_QUALITY,85])
