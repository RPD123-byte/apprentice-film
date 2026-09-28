# regions.py render.png [plate.png]: mean / p10 / p90 graded values in named designer regions, render vs plate
import sys, cv2, numpy as np
R=cv2.cvtColor(cv2.imread(sys.argv[1]),cv2.COLOR_BGR2GRAY).astype(np.float32)
S=cv2.cvtColor(cv2.imread(sys.argv[2] if len(sys.argv)>2 else 'plate.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
REG={'beanie':(1020,175,1120,235),'hairL':(992,270,1015,340),'hairR':(1125,270,1145,340),'forehead':(1040,250,1100,272),'faceC':(1045,300,1100,340),
 'cheekL':(1020,295,1040,345),'cheekR':(1100,295,1120,345),'chin':(1050,350,1095,375),'neck':(1045,380,1095,410),'shoulderL':(930,395,985,440),'chest':(1040,415,1090,445),
 'cupL':(1000,375,1060,445),'cupR':(1095,360,1140,420),'armR':(1170,420,1230,480),'shirtR':(1130,440,1180,500),'thighL':(935,560,1030,640),'thighR':(1180,570,1270,650),
 'shinL':(945,650,1040,760),'shinR':(1140,650,1260,760),'bootL':(920,790,1060,860),'bootR':(1120,790,1245,860),
 'guitar':(10,390,140,650),'amp':(376,700,576,850),'backpack':(2015,610,2185,820),'leftgear':(0,330,560,900),'rightgear':(1500,330,2206,900)}
for k,(x0,y0,x1,y1) in REG.items():
    a=R[y0:y1,x0:x1]; b=S[y0:y1,x0:x1]
    print(f'{k:10s} ren {a.mean():6.1f} p10 {np.percentile(a,10):5.0f} p50 {np.percentile(a,50):5.0f} p90 {np.percentile(a,90):5.0f} | src {b.mean():6.1f} p10 {np.percentile(b,10):5.0f} p50 {np.percentile(b,50):5.0f} p90 {np.percentile(b,90):5.0f} | d {a.mean()-b.mean():+6.1f}')
