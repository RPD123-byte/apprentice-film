import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(float)
t=float(sys.argv[2])
if len(sys.argv)>3: s=cv2.cvtColor(cv2.imread(sys.argv[3]),cv2.COLOR_BGR2GRAY).astype(float)
else:
    c=cv2.VideoCapture(V); c.set(1,int(round(t*25))); ok,f=c.read(); s=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(float)
regs={'guitar case top':(160,20,260,250),'spk front upper':(300,60,540,120),'tweeter':(370,140,450,220),'woofer cone ring':(320,330,370,480),'woofer center':(400,400,460,460),'spk front lower':(300,640,420,700),'side panel':(620,100,720,800),'crate band':(290,560,400,630),'crate lattice':(200,720,420,940),'cable coil':(30,450,330,520),'rack':(740,290,840,400),'behind right dark':(850,150,1000,700),'sign':(900,20,1130,130),'boxes L of card':(1190,150,1290,450),'monitor':(1300,0,1375,170),'lit column':(1400,0,1500,200),'box right':(1510,100,1740,400),'box right low':(1510,430,1740,580),'xstand area':(1750,300,1980,580),'post':(1995,190,2055,620),'synth keys':(1450,700,2000,850),'synth panel':(1450,610,2000,690),'synth right':(2060,650,2206,900),'synth bottom':(1400,860,2000,946),'top right dark':(1900,0,2206,150)}
for k,(x0,y0,x1,y1) in regs.items():
    a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
    print(f'{k:20s} render {a.mean():6.1f}  source {b.mean():6.1f}  diff {a.mean()-b.mean():+6.1f}')
