import sys, cv2, glob, numpy as np
d, idx = sys.argv[1], int(sys.argv[2])
fr=cv2.cvtColor(cv2.imread(sorted(glob.glob(f"{d}/frame-{idx:02d}-*.png"))[0]),cv2.COLOR_BGR2GRAY).astype(float)
rf=cv2.cvtColor(cv2.imread(sorted(glob.glob(f"{d}/ref-{idx:02d}-*.png"))[0]),cv2.COLOR_BGR2GRAY).astype(float)
R={'sleeveL':(780,620,820,700),'sleeveR':(1350,640,1420,700),'hoodL':(900,600,940,700),'hoodR':(1215,600,1260,700),
'crown':(1040,560,1110,600),'headmid':(1020,660,1130,720),'cuff':(1000,770,1150,820),'handR':(1130,480,1180,510),
'keys':(1100,340,1250,400),'trackpad':(1010,455,1070,500),'deck':(1180,300,1280,320),'lid':(870,30,1270,50),
'floorL':(400,850,700,940),'floorR':(1450,850,1750,940),'underdesk':(600,600,740,780),'farleft':(0,0,130,946),'farright':(2080,0,2206,946),
'leftA':(215,120,270,280),'leftB':(330,300,420,520),'lamp':(1440,110,1540,200),'mug':(1445,360,1520,430),'spkL':(570,130,700,330),'spkR':(1520,180,1640,370),
'deskL':(460,400,640,530),'deskR':(1560,380,1740,520),'chair':(840,875,1340,946),'topcarton':(560,0,840,90),'rightmid':(1800,200,2100,700)}
print(f"{'region':10s} render source")
for k,(x0,y0,x1,y1) in R.items(): print(f"{k:10s} {fr[y0:y1,x0:x1].mean():6.1f} {rf[y0:y1,x0:x1].mean():6.1f}")
