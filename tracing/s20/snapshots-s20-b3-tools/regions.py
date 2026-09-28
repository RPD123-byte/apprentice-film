#!/usr/bin/env python3
# regions.py render.png [ref.png] : per-object region means (graded), source vs render
import cv2,numpy as np,sys
r=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(float)
s=cv2.cvtColor(cv2.imread(sys.argv[2] if len(sys.argv)>2 else '/Users/computer/rootline/apprentice-film/snapshots/s20-b3-study/cleanA.png'),cv2.COLOR_BGR2GRAY).astype(float)
R={'case':(150,0,260,250),'books':(300,0,600,45),'spkfront':(310,60,600,260),'woofer':(300,300,540,520),'side':(615,60,720,850),'crate':(170,560,450,946),'crateL':(0,560,160,946),'coil':(20,440,360,540),'boxR':(1520,90,1780,410),'boxR2':(1520,430,1780,600),'boxM':(1360,100,1500,220),'boxTop':(1400,0,1560,80),'keys':(1400,700,2000,880),'strip':(1450,600,2000,690),'panelR':(2060,650,2206,946),'table':(1800,150,2206,340),'leg':(1990,350,2060,630),'Xst':(1600,250,1990,600),'leftbox':(1190,130,1300,640),'monitor':(1300,0,1390,220),'floor':(460,850,1300,946),'rack':(735,270,860,370),'darkbox':(740,380,870,700),'plant':(640,0,800,250),'sign':(900,0,1140,140)}
for k,(x0,y0,x1,y1) in R.items(): print(f'{k:10s} src {s[y0:y1,x0:x1].mean():6.1f} mine {r[y0:y1,x0:x1].mean():6.1f}  ratio {s[y0:y1,x0:x1].mean()/max(1,r[y0:y1,x0:x1].mean()):.2f}')
a=cv2.GaussianBlur(r,(0,0),6); b=cv2.GaussianBlur(s,(0,0),6); print('mae6 %.2f bias %.2f'%(np.abs(a-b).mean(), (a-b).mean()))
