#!/usr/bin/env python3
# tex.py RENDER.png K: per-region mean and fine-texture energy (std of the image minus its 4 px blur), render vs source
import sys, cv2, numpy as np
from src import frame
r=cv2.imread(sys.argv[1]).mean(2); s=frame(int(sys.argv[2])).mean(2)
REG={'L1front':(0,120,220,310),'R2front':(340,150,680,200),'Cleft':(740,20,890,150),'Dfront':(870,200,970,460),'spkE':(1160,210,1290,480),'spkL':(80,420,220,800),
'deskL':(100,780,380,940),'deskR':(1050,500,1400,620),'deck':(650,760,780,850),'keys':(600,640,860,720),'lhand':(640,690,840,820),'rhand':(960,630,1150,740),
'forearm':(1200,650,1400,760),'lsleeve':(820,860,1050,940),'beanieL':(1350,60,1500,180),'beanieR':(1650,150,1850,280),'crown':(1500,0,1800,90),
'face':(1310,280,1400,380),'jaw':(1370,440,1450,500),'owlhead':(1520,280,1640,400),'owlbody':(1500,460,1690,600),'back':(1700,650,1900,850),'uarm':(1300,750,1450,900),
'lowback':(1650,850,1850,940),'shelf':(1920,0,1990,460),'Hbox':(2070,420,2200,590),'chair':(1950,820,2150,946)}
hp=lambda c: c-cv2.GaussianBlur(c,(0,0),4)
for n,(x0,y0,x1,y1) in REG.items():
    a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
    ea=np.abs(cv2.GaussianBlur(a,(0,0),2)-cv2.GaussianBlur(b,(0,0),2)).mean()
    print(f'{n:9s} mean r {a.mean():6.1f} s {b.mean():6.1f} | tex r {hp(a).std():5.1f} s {hp(b).std():5.1f} ratio {hp(a).std()/max(0.1,hp(b).std()):4.2f} | e2 {ea:5.1f}')
