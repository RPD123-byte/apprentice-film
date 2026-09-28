# Measurement aid (designer at the 125.0 hold median): outlines of the main drawn masses, as colour classes inside
# hand-drawn ROIs, cleaned morphologically, resampled every 10 px. Output: s27d-meas/des_parts2.json + check overlay.
import cv2, numpy as np, json
med=cv2.imread('../s27d-meas/med125.png'); B=cv2.GaussianBlur(med,(0,0),1.5)
lab=cv2.cvtColor(B,cv2.COLOR_BGR2Lab).astype(np.int32); L,A,Bb=lab[...,0],lab[...,1]-128,lab[...,2]-128
hsv=cv2.cvtColor(B,cv2.COLOR_BGR2HSV).astype(np.int32); V=hsv[...,2]
def roi(pts):
    m=np.zeros(L.shape,bool); mm=np.zeros(L.shape,np.uint8); cv2.fillPoly(mm,[np.int32(pts)],1); return mm>0
# figure ROI (everything the designer covers), measured by eye on the gridded median
FIG=roi([(-5,455),(40,405),(100,350),(180,298),(300,272),(380,275),(470,245),(560,215),(610,200),(640,160),(700,105),(780,82),(870,88),(950,130),(1015,190),(1060,255),(1082,330),(1072,420),(1050,480),(1048,560),(1045,640),(1040,700),(990,735),(900,760),(820,790),(760,840),(700,905),(620,925),(440,915),(300,905),(200,920),(80,946),(-5,946)])
green=(A<-2)&(Bb>2)&(L>70)&FIG
beanieR=roi([(600,250),(610,190),(720,70),(880,60),(1110,230),(1110,540),(975,540),(960,470),(900,390),(700,290),(630,275)])
skin=(A>8)&(L>150)&FIG
dark=(L<60)&FIG
hp=(L>=55)&(L<125)&(np.abs(A)<8)&(np.abs(Bb)<10)&roi([(400,250),(560,250),(625,600),(480,610),(400,480)])
parts={'beanie':green&beanieR,'jacket':green&~beanieR,'skin':skin,'dark':dark,'hp':hp}
out={}; ov=med.copy(); cols={'beanie':(0,255,0),'jacket':(0,160,90),'skin':(0,0,255),'dark':(255,0,255),'hp':(255,255,0)}
for k,m in parts.items():
    m=m.astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((11,11),np.uint8))
    cs,hier=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    polys=[]
    for ci,c in enumerate(cs):
        a=cv2.contourArea(c)
        if a<1200: continue
        hole=hier[0][ci][3]>=0
        c=c.reshape(-1,2).astype(np.float32); d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(c,axis=0),axis=1))]
        n=max(6,int(d[-1]/10)); s=np.linspace(0,d[-1],n,endpoint=False)
        P=np.c_[np.interp(s,d,c[:,0]),np.interp(s,d,c[:,1])]
        polys.append({'area':int(a),'hole':bool(hole),'pts':np.round(P).astype(int).tolist()})
        cv2.polylines(ov,[np.int32(P)],True,cols[k],1 if hole else 2)
    out[k]=sorted(polys,key=lambda p:-p['area'])
    print(k,[(p['area'],p['hole'],len(p['pts'])) for p in out[k][:8]])
json.dump(out,open('../s27d-meas/des_parts2.json','w'))
cv2.imwrite('../s27d-study/des_parts2.jpg',ov[40:946,0:1120],[cv2.IMWRITE_JPEG_QUALITY,85])
