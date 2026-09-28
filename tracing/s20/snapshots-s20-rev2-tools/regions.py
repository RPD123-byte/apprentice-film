import cv2,numpy as np,sys
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32); s=cv2.cvtColor(cv2.imread(sys.argv[2]),cv2.COLOR_BGR2GRAY).astype(np.float32)
R={'woofer':(430,250,620,470),'port':(440,640,640,900),'sidepanel':(560,120,700,850),'rack':(820,290,960,420),'coil':(0,430,360,570),'amp':(0,560,420,946),'guitar':(40,40,200,420),
'plant':(620,0,800,230),'backstack':(1150,100,1350,450),'bigstack':(1350,60,1780,560),'bench':(1790,120,2206,450),'synthkeys':(1400,640,2000,900),'synthpanel':(1900,560,2206,946),
'floor':(1100,850,1900,946),'topwall':(850,0,1300,120),'sign':(880,30,1110,130)}
for k,(x0,y0,x1,y1) in R.items():
    a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]; ab=cv2.GaussianBlur(r,(0,0),6)[y0:y1,x0:x1]; bb=cv2.GaussianBlur(s,(0,0),6)[y0:y1,x0:x1]
    hp=lambda im: np.abs(im-cv2.GaussianBlur(im,(0,0),2)).mean()
    print(f"{k:11s} mean r {a.mean():6.1f} s {b.mean():6.1f}  d {a.mean()-b.mean():+6.1f}  bMAE {np.abs(ab-bb).mean():5.1f}  hp r {hp(a):4.1f} s {hp(b):4.1f}")
