# Measurement aid: coarse outlines (resampled every 12 px, lightly smoothed) of the designer's big masses at the
# 125.0 hold median — silhouette, beanie, hair, face skin, arm skin, headphone cup, dark gap/shirt. Positions only;
# these become Catmull-Rom fill shapes, every detail on top is authored by hand.
import cv2, numpy as np, json
med=cv2.imread('../s27d-meas/med125.png'); B=cv2.GaussianBlur(med,(0,0),2.0)
lab=cv2.cvtColor(B,cv2.COLOR_BGR2Lab).astype(np.int32); L,A,Bb=lab[...,0],lab[...,1]-128,lab[...,2]-128
def roi(pts):
    mm=np.zeros(L.shape,np.uint8); cv2.fillPoly(mm,[np.int32(pts)],1); return mm>0
FIGP=[(-5,455),(40,405),(100,350),(180,298),(300,268),(380,272),(470,245),(560,212),(612,196),(640,160),(700,102),(780,80),(875,86),(950,128),(1015,188),(1062,252),(1084,330),(1074,420),(1052,480),(1050,560),(1045,640),(1040,705),(990,738),(900,762),(820,792),(770,850),(700,908),(620,928),(440,918),(300,908),(200,925),(80,946),(-5,946)]
FIG=roi(FIGP)
beanieR=roi([(600,250),(610,190),(720,70),(880,60),(1110,230),(1110,540),(990,540),(960,470),(900,390),(700,290),(630,275)])
headR=roi([(520,190),(990,300),(1010,600),(900,620),(650,620),(560,520),(520,300)])
armR=roi([(620,570),(1040,540),(1040,780),(760,800),(620,660)])
green=(A<-1)&(Bb>1)&(L>60)
dark=(L<55)
skin=(A>7)&(L>140)
masks={
 'beanie': green&beanieR&FIG,
 'hair': dark&headR&~beanieR,
 'face': skin&headR&roi([(600,280),(1000,300),(1000,610),(620,615)]),
 'arm': skin&armR&roi([(600,590),(1040,560),(1040,780),(600,700)]),
 'cup': (L>=40)&(L<120)&(np.abs(A)<9)&(np.abs(Bb)<12)&roi([(455,420),(620,420),(620,610),(455,610)]),
 'band': (L>=40)&(L<120)&(np.abs(A)<9)&(np.abs(Bb)<12)&roi([(410,250),(560,250),(560,440),(410,440)]),
 'gap': dark&roi([(150,640),(420,700),(420,860),(150,900)]),
 'shirt': dark&roi([(540,540),(700,560),(700,660),(540,660)]),
}
def outline(m,step=12,smooth=2,minA=800):
    m=m.astype(np.uint8)*255
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((7,7),np.uint8))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    out=[]
    for c in sorted(cs,key=lambda c:-cv2.contourArea(c)):
        if cv2.contourArea(c)<minA: continue
        c=c.reshape(-1,2).astype(np.float32); d=np.r_[0,np.cumsum(np.linalg.norm(np.diff(c,axis=0),axis=1))]
        n=max(6,int(d[-1]/step)); s=np.linspace(0,d[-1],n,endpoint=False)
        P=np.c_[np.interp(s,d,c[:,0]),np.interp(s,d,c[:,1])]
        for _ in range(smooth): P=(np.roll(P,1,0)+2*P+np.roll(P,-1,0))/4
        out.append(np.round(P).astype(int).tolist())
    return out
O={k:outline(m) for k,m in masks.items()}
O['sil']=[FIGP]
ov=med.copy(); cols=[(0,255,0),(255,0,255),(0,0,255),(0,128,255),(255,255,0),(255,128,0),(0,255,255),(128,0,255),(255,255,255)]
for i,(k,ps) in enumerate(O.items()):
    for P in ps[:3]: cv2.polylines(ov,[np.int32(P)],True,cols[i%len(cols)],2)
    print(k,[len(P) for P in ps[:4]])
json.dump(O,open('../s27d-meas/des_masses.json','w'))
cv2.imwrite('../s27d-study/des_masses.jpg',ov[40:946,0:1120],[cv2.IMWRITE_JPEG_QUALITY,85])
